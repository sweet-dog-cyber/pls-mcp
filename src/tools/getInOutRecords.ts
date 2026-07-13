import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';

server.registerTool('get_in_and_out_records', {
  title: 'get_in_and_out_records',
  description: `查询进出区域记录。返回标签、区域、进入/离开时间等信息。可按区域或时间范围筛选。

参数:
  - areaId: 区域ID（可选）
  - timeRange: 时间范围（可选），单日或范围
  - pageSize: 每页数量
  - page: 页码

返回: 进出记录列表，含状态（在场/已离开）

错误处理:
  - 无记录时返回空列表`,
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: z.object({
    areaId: z.number().optional().describe('区域ID，不传则返回全部区域'),
    timeRange: z.string().optional().describe('时间范围，格式 "YYYY-MM-DD"'),
    pageSize: z.number().min(1).max(500).default(100).describe('每页数量，默认100，最大500'),
    page: z.number().min(1).default(1).describe('页码，默认1'),
  }).strict(),
}, async (args) => {
  try {
    const { areaId, timeRange, pageSize, page } = args;
    let sql = `SELECT id, tag_code, area_id, area_rule_id, in_date_time, out_date_time FROM logs_area_in_and_out WHERE 1=1`;
    const params: any[] = [];
    if (areaId !== undefined) { sql += ' AND area_id = ?'; params.push(areaId); }
    if (timeRange !== undefined) {
      if (timeRange.includes(',')) {
        const [start, end] = timeRange.split(',');
        sql += ' AND in_date_time >= ? AND in_date_time < DATE_ADD(?, INTERVAL 1 DAY)';
        params.push(start.trim(), end.trim());
      } else {
        sql += ' AND in_date_time >= ? AND in_date_time < DATE_ADD(?, INTERVAL 1 DAY)';
        params.push(timeRange.trim(), timeRange.trim());
      }
    }
    sql += ' ORDER BY in_date_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    const records = await query(sql, params);
    return { content: [{ type: 'text', text: JSON.stringify({ page, pageSize, records: records.map(r => ({
      id: r.id, tagCode: r.tag_code, areaId: r.area_id, areaRuleId: r.area_rule_id,
      inDateTime: r.in_date_time, outDateTime: r.out_date_time,
      status: r.out_date_time ? '已离开' : '在场',
    })), }, null, 2) }] };
  } catch (err: any) {
    log('Error in get_in_and_out_records:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询进出记录失败 - ${err.message}` }], isError: true };
  }
});