import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('list_departments', {
    title: 'list_departments',
    description: `【📊 查询】获取部门树状组织结构。

参数:
  - keyword: 部门名称关键词（可选）

返回: 部门树结构，含名称、编码、负责人、电话、子部门

提示: 最多返回 2000 条。返回为嵌套树结构。`,
    annotations: QUERY_ANNOTATIONS,
    inputSchema: z.object({
        keyword: z.string().optional().describe('按部门名称搜索'),
    }).strict(),
}, async (args) => {
    try {
        const { keyword } = args;
        let sql = `SELECT id, name, code, pid, head, phone, description FROM department WHERE del_flg = 0`;
        const params = [];
        if (keyword !== undefined) {
            sql += " AND name LIKE ?";
            params.push(`%${keyword}%`);
        }
        sql += ' ORDER BY pid ASC, id ASC LIMIT 2000';
        const rows = await query(sql, params);
        const allDepts = rows.map((d) => ({
            id: d.id, name: d.name, code: d.code, pid: d.pid,
            head: d.head, phone: d.phone, description: d.description,
        }));
        const tree = buildDeptTree(allDepts);
        const { text, truncated } = truncateOutput(JSON.stringify({ total: allDepts.length, departments: tree }, null, 2));
        return {
            content: [{
                    type: 'text',
                    text: truncated ? text + '\n\n⚠️ [输出已截断] 返回了前 2000 条记录。' : text,
                }],
        };
    }
    catch (err) {
        log('Error in list_departments:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询部门列表失败 - ${err.message}` }], isError: true };
    }
});
function buildDeptTree(depts) {
    const map = new Map();
    const roots = [];
    depts.forEach(d => map.set(d.id, { ...d, children: [] }));
    depts.forEach(d => {
        const node = map.get(d.id);
        if (d.pid && map.has(d.pid)) {
            map.get(d.pid).children.push(node);
        }
        else {
            roots.push(node);
        }
    });
    return roots;
}
//# sourceMappingURL=listDepartments.js.map