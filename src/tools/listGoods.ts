import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('list_goods', {
  title: 'list_goods',
  description: `获取物品/货物列表，可按名称或绑定状态筛选。

参数:
  - keyword: 搜索关键词（可选），匹配名称或编号
  - isBound: 绑定状态（可选），true=已绑定, false=未绑定
  - pageSize, page: 分页

返回: 物品列表，含编号、名称、绑定标签`,
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: z.object({
    keyword: z.string().optional().describe('搜索关键词(匹配物品名称或编号)'),
    isBound: z.boolean().optional().describe('按绑定状态筛选，true=已绑定, false=未绑定'),
    pageSize: z.number().min(1).max(500).default(100).describe('每页数量，默认100'),
    page: z.number().min(1).default(1).describe('页码，默认1'),
  }).strict(),
}, async (args) => {
  try {
    const { keyword, isBound, pageSize, page } = args;
    let sql = `SELECT id, code, name, tag_id, tag_code FROM goods WHERE del_flg = 0`;
    const params: any[] = [];
    if (keyword !== undefined) { sql += " AND (name LIKE ? OR code LIKE ?)"; const kw = `%${keyword}%`; params.push(kw, kw); }
    if (isBound !== undefined) { sql += isBound ? ' AND tag_code IS NOT NULL' : ' AND tag_code IS NULL'; }
    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    const goods = await query(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM goods WHERE del_flg = 0`;
    const countParams: any[] = [];
    if (keyword !== undefined) { countSql += " AND (name LIKE ? OR code LIKE ?)"; const kw = `%${keyword}%`; countParams.push(kw, kw); }
    if (isBound !== undefined) { countSql += isBound ? ' AND tag_code IS NOT NULL' : ' AND tag_code IS NULL'; }
    const totalRows = await query(countSql, countParams);
    const total = Array.isArray(totalRows) ? totalRows[0]?.total : 0;

    const { text, truncated } = truncateOutput(JSON.stringify({ total, page, pageSize, goods: goods.map(g => ({
      id: g.id, code: g.code, name: g.name, tagId: g.tag_id, tagCode: g.tag_code,
    })), }, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 请缩小筛选范围或调整分页参数。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in list_goods:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询物品列表失败 - ${err.message}` }], isError: true };
  }
});