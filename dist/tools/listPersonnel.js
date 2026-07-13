import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
server.registerTool('list_personnel', {
    title: 'list_personnel',
    description: `获取人员列表，可按部门或关键词筛选。返回人员姓名、部门、电话、绑定标签等信息。

参数:
  - departmentId: 部门ID（可选），不传则返回全部部门
  - keyword: 姓名关键词（可选），模糊搜索
  - pageSize: 每页数量，默认100
  - page: 页码，默认1

返回: 带分页的人员列表，含姓名、部门、电话、绑定标签`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        departmentId: z.number().optional().describe('部门ID，不传则返回全部部门'),
        keyword: z.string().optional().describe('按姓名模糊搜索'),
        pageSize: z.number().min(1).max(500).default(100).describe('每页数量，默认100，最大500'),
        page: z.number().min(1).default(1).describe('页码，默认1'),
    }).strict(),
}, async (args) => {
    try {
        const { departmentId, keyword, pageSize, page } = args;
        let sql = `SELECT id, name, department_id, phone_number, tag_id, tag_code FROM personnel_information WHERE del_flg = 0`;
        const params = [];
        if (departmentId !== undefined) {
            sql += ' AND department_id = ?';
            params.push(departmentId);
        }
        if (keyword !== undefined) {
            sql += " AND name LIKE ?";
            params.push(`%${keyword}%`);
        }
        sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        const personnel = await query(sql, params);
        let countSql = `SELECT COUNT(*) as total FROM personnel_information WHERE del_flg = 0`;
        const countParams = [];
        if (departmentId !== undefined) {
            countSql += ' AND department_id = ?';
            countParams.push(departmentId);
        }
        if (keyword !== undefined) {
            countSql += " AND name LIKE ?";
            countParams.push(`%${keyword}%`);
        }
        const totalRows = await query(countSql, countParams);
        const total = Array.isArray(totalRows) ? totalRows[0]?.total : 0;
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ total, page, pageSize, personnel: personnel.map(p => ({
                            id: p.id, name: p.name, departmentId: p.department_id, phone: p.phone_number,
                            tagId: p.tag_id, tagCode: p.tag_code,
                        })), }, null, 2),
                }],
        };
    }
    catch (err) {
        log('Error in list_personnel:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询人员列表失败 - ${err.message}。建议：检查部门ID是否正确，或减少筛选条件。` }], isError: true };
    }
});
//# sourceMappingURL=listPersonnel.js.map