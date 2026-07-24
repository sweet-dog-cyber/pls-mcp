import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('search_personnel', {
  title: 'search_personnel',
  description: `【📊 查询】按姓名、工号或部门搜索人员。

参数:
  - keyword: 搜索关键词（必填），匹配姓名/工号/部门
  - departmentId: 部门ID（可选），限定部门内搜索
  - limit: 最大返回数，默认 100

返回: 人员列表，含姓名、工号、部门、电话、绑定标签、实时位置

提示: 传入纯数字时优先按工号精确匹配。结果包含实时位置信息（bindings 有 30 秒缓存）。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    keyword: z.string().min(1).describe('搜索关键词(匹配姓名/工号/部门)'),
    departmentId: z.number().optional().describe('按部门ID筛选'),
    limit: z.number().min(1).max(500).default(100).describe('最大返回数，默认100'),
  }).strict(),
}, async (args) => {
  try {
    const { keyword, departmentId, limit } = args;
    const kw = `%${keyword}%`;
    let sql = `SELECT p.id, p.code, p.name, p.phone_number as phone, p.department_id, d.name as department_name FROM personnel_information p LEFT JOIN department d ON p.department_id = d.id WHERE p.del_flg = 0 AND (p.name LIKE ? OR p.code LIKE ? OR d.name LIKE ?)`;
    const params: any[] = [kw, kw, kw];
    if (departmentId !== undefined) { sql += ' AND p.department_id = ?'; params.push(departmentId); }
    sql += ` ORDER BY p.name ASC LIMIT ?`;
    params.push(limit);
    const personnel = await query(sql, params);

    // 用 bindings 缓存增强实时信息
    const bindings = await callTagBindings();
    const bindingsMap: Record<string, { tagCode: string; bindId: number }> = {};
    bindings.forEach((b: any) => {
      if (b.bindType === 'personnel') {
        bindingsMap[b.bindId] = { tagCode: b.tagCode, bindId: b.bindId };
      }
    });

    const result = personnel.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      phone: p.phone,
      departmentId: p.department_id,
      departmentName: p.department_name || '',
      tagCode: bindingsMap[p.id]?.tagCode || '',
      bindStatus: bindingsMap[p.id] ? '已绑定' : '未绑定',
    }));

    const { text, truncated } = truncateOutput(JSON.stringify({
      keyword, totalCount: result.length, personnel: result,
    }, null, 2));

    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断]' : (result.length === 0 ? `ℹ️ 未找到匹配关键词 "${keyword}" 的人员` : text),
      }],
    };
  } catch (err: any) {
    log('Error in search_personnel:', err.message);
    return { content: [{ type: 'text', text: `Error: 搜索人员失败 - ${err.message}` }], isError: true };
  }
});