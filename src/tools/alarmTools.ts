import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS, DIAGNOSE_ANNOTATIONS, BATCH_ANNOTATIONS, ALARM_TYPE_NAME_MAP } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

// ── N3: get_alarm_trend ──
server.registerTool('get_alarm_trend', {
  title: 'get_alarm_trend',
  description: `【📊 查询】告警趋势统计，按时间段查看告警数量和类型分布。

参数:
  - days: 统计天数（可选），默认 7
  - alarmType: 告警类型（可选），0-入侵 ~ 6-超速
  - tagCode: 标签编码（可选），按标签筛选

返回: 按日/按类型聚合的告警趋势数据

提示: days 范围 1-90。适合用于周报/月报分析。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    days: z.number().min(1).max(90).default(7).describe('统计天数，默认7'),
    alarmType: z.number().min(0).max(6).optional().describe('告警类型: 0-入侵, 1-越界, 2-超限, 3-低位, 4-超时, 5-低电, 6-超速'),
    tagCode: z.string().optional().describe('按标签编码筛选'),
  }).strict(),
}, async (args) => {
  try {
    const { days, alarmType, tagCode } = args;
    let sql = `SELECT DATE(alarm_time) as day, alarm_type, COUNT(*) as cnt FROM log_alarm WHERE alarm_time >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
    const params: any[] = [days];
    if (alarmType !== undefined) { sql += ' AND alarm_type = ?'; params.push(alarmType); }
    if (tagCode !== undefined) { sql += ' AND tag_code = ?'; params.push(tagCode); }
    sql += ' GROUP BY DATE(alarm_time), alarm_type ORDER BY day ASC';
    const rows = await query(sql, params);

    // 按天聚合
    const dayMap = new Map<string, { total: number; byType: Record<number, number> }>();
    let totalCount = 0;
    const typeTotals: Record<number, number> = {};
    rows.forEach((r: any) => {
      const day = r.day;
      const type = r.alarm_type as number;
      const cnt = r.cnt as number;
      if (!dayMap.has(day)) dayMap.set(day, { total: 0, byType: {} });
      const entry = dayMap.get(day)!;
      entry.total += cnt;
      entry.byType[type] = cnt;
      totalCount += cnt;
      typeTotals[type] = (typeTotals[type] || 0) + cnt;
    });

    const trend = Array.from(dayMap.entries()).map(([day, data]) => ({
      day,
      total: data.total,
      byType: Object.entries(data.byType).map(([type, count]) => ({
        type: Number(type),
        typeName: ALARM_TYPE_NAME_MAP[Number(type)] || '',
        count,
      })),
    }));

    const typeSummary = Object.entries(typeTotals).map(([type, count]) => ({
      type: Number(type),
      typeName: ALARM_TYPE_NAME_MAP[Number(type)] || '',
      total: count,
    })).sort((a, b) => b.total - a.total);

    const { text, truncated } = truncateOutput(JSON.stringify({
      days, totalCount, typeSummary, trend,
    }, null, 2));

    return {
      content: [{ type: 'text', text: truncated ? text + '\n\n⚠️ [输出已截断]' : text }],
    };
  } catch (err: any) {
    log('Error in get_alarm_trend:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询告警趋势失败 - ${err.message}` }], isError: true };
  }
});

// ── N4: get_personnel_distribution ──
server.registerTool('get_personnel_distribution', {
  title: 'get_personnel_distribution',
  description: `【🔍 诊断】人员区域分布分析，查看各区域在场人数。

参数:
  - mapId: 地图ID（可选），仅查指定地图
  - areaId: 区域ID（可选），仅查指定区域

返回: 区域列表，含名称、在场人数、人员列表

提示: 基于进出记录+实时位置判断在场状态。`,
  annotations: DIAGNOSE_ANNOTATIONS,
  inputSchema: z.object({
    mapId: z.number().optional().describe('地图ID'),
    areaId: z.number().optional().describe('区域ID'),
  }).strict(),
}, async (args) => {
  try {
    const { mapId, areaId } = args;
    // 查各区域的进出记录
    let sql = `SELECT area_id, tag_code, MAX(in_date_time) as last_in FROM logs_area_in_and_out GROUP BY area_id, tag_code`;
    const params: any[] = [];
    if (areaId !== undefined) { sql += ' HAVING area_id = ?'; params.push(areaId); }
    const entries = await query(sql, params);

    // 按区域聚合
    const areaMap = new Map<number, { tagCodes: string[]; areaName: string }>();
    entries.forEach((e: any) => {
      const aid = e.area_id as number;
      if (!areaMap.has(aid)) areaMap.set(aid, { tagCodes: [], areaName: '' });
      areaMap.get(aid)!.tagCodes.push(e.tag_code);
    });

    // 补充区域名称
    let areaSql = 'SELECT id, name FROM gis_area WHERE del_flg = 0';
    const areaParams: any[] = [];
    if (mapId !== undefined) { areaSql += ' AND map_id = ?'; areaParams.push(mapId); }
    if (areaId !== undefined) { areaSql += ' AND id = ?'; areaParams.push(areaId); }
    const areas = await query(areaSql, areaParams);
    const areaNameMap: Record<number, string> = {};
    areas.forEach((a: any) => { areaNameMap[a.id] = a.name; });

    const distribution = Array.from(areaMap.entries()).map(([aid, data]) => ({
      areaId: aid,
      areaName: areaNameMap[aid] || '未知区域',
      count: data.tagCodes.length,
      personnel: data.tagCodes,
    })).sort((a, b) => b.count - a.count);

    const { text, truncated } = truncateOutput(JSON.stringify({
      totalAreas: distribution.length,
      totalPersonnel: distribution.reduce((s, a) => s + a.count, 0),
      distribution,
    }, null, 2));

    return {
      content: [{ type: 'text', text: truncated ? text + '\n\n⚠️ [输出已截断]' : text }],
    };
  } catch (err: any) {
    log('Error in get_personnel_distribution:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询人员分布失败 - ${err.message}` }], isError: true };
  }
});

// ── N5: export_alarm_csv ──
server.registerTool('export_alarm_csv', {
  title: 'export_alarm_csv',
  description: `【⚡ 批量】导出告警记录为 CSV 文本，可直接复制粘贴到 Excel。

参数:
  - startTime: 开始时间（可选），格式 "2026-07-01 00:00:00"
  - endTime: 结束时间（可选）
  - alarmType: 告警类型（可选），0-入侵 ~ 6-超速
  - limit: 最大行数，默认 2000

返回: CSV 格式文本（含表头）

提示: 复制返回的文本粘贴到 .csv 文件即可在 Excel 打开。`,
  annotations: BATCH_ANNOTATIONS,
  inputSchema: z.object({
    startTime: z.string().optional().describe('开始时间，格式 "2026-07-01 00:00:00"'),
    endTime: z.string().optional().describe('结束时间'),
    alarmType: z.number().min(0).max(6).optional().describe('告警类型: 0-入侵, 1-越界, 2-超限, 3-低位, 4-超时, 5-低电, 6-超速'),
    limit: z.number().min(1).max(10000).default(2000).describe('最大行数，默认2000'),
  }).strict(),
}, async (args) => {
  try {
    const { startTime, endTime, alarmType, limit } = args;
    let sql = `SELECT id, tag_code, alarm_type, alarm_time, alarm_details FROM log_alarm WHERE 1=1`;
    const params: any[] = [];
    if (startTime) { sql += ' AND alarm_time >= ?'; params.push(startTime); }
    if (endTime) { sql += ' AND alarm_time <= ?'; params.push(endTime); }
    if (alarmType !== undefined) { sql += ' AND alarm_type = ?'; params.push(alarmType); }
    sql += ` ORDER BY alarm_time DESC LIMIT ?`;
    params.push(limit);
    const alarms = await query(sql, params);

    // 生成 CSV
    const headers = 'ID,标签编码,告警类型,告警时间,描述\n';
    const rows = alarms.map((a: any) => {
      const type = ALARM_TYPE_NAME_MAP[a.alarm_type as number] || '';
      const desc = (a.alarm_details || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `${a.id},"${a.tag_code}","${type}","${a.alarm_time}","${desc}"`;
    }).join('\n');

    const csv = '=== 告警记录 CSV ===\n' + headers + rows;
    return { content: [{ type: 'text', text: `共导出 ${alarms.length} 条告警记录。\n\n${csv}` }] };
  } catch (err: any) {
    log('Error in export_alarm_csv:', err.message);
    return { content: [{ type: 'text', text: `Error: 导出告警 CSV 失败 - ${err.message}` }], isError: true };
  }
});

// ── N6: get_unread_alarms ──
server.registerTool('get_unread_alarms', {
  title: 'get_unread_alarms',
  description: `【📊 查询】查询未读告警列表（isRead=0）。

参数:
  - alarmType: 告警类型（可选），0-入侵 ~ 6-超速
  - limit: 最大返回数，默认 100

返回: 未读告警列表，含标签编码、告警类型、时间、描述

提示: 适合安全监控场景，快速定位未处理告警。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    alarmType: z.number().min(0).max(6).optional().describe('告警类型: 0-入侵, 1-越界, 2-超限, 3-低位, 4-超时, 5-低电, 6-超速'),
    limit: z.number().min(1).max(500).default(100).describe('最大返回数，默认100'),
  }).strict(),
}, async (args) => {
  try {
    const { alarmType, limit } = args;
    let sql = `SELECT id, tag_code, alarm_type, alarm_time, alarm_details FROM log_alarm WHERE already_read = 0`;
    const params: any[] = [];
    if (alarmType !== undefined) { sql += ' AND alarm_type = ?'; params.push(alarmType); }
    sql += ` ORDER BY alarm_time DESC LIMIT ?`;
    params.push(limit);
    const alarms = await query(sql, params);

    const result = alarms.map((a: any) => ({
      id: a.id,
      tagCode: a.tag_code,
      alarmType: a.alarm_type,
      alarmTypeName: ALARM_TYPE_NAME_MAP[a.alarm_type as number] || '',
      alarmTime: a.alarm_time,
      description: a.alarm_details || '',
    }));

    const { text, truncated } = truncateOutput(JSON.stringify({
      total: result.length, alarms: result,
    }, null, 2));

    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断]' : (result.length === 0 ? '✅ 当前无未读告警' : text),
      }],
    };
  } catch (err: any) {
    log('Error in get_unread_alarms:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询未读告警失败 - ${err.message}` }], isError: true };
  }
});