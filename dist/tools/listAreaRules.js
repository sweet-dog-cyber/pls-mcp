import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS, FITTING_METHOD_MAP } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('list_area_rules', {
    title: 'list_area_rules',
    description: `获取区域规则（算法规则）列表，可按名称或拟合方式筛选。

参数:
  - keyword: 规则名称关键词（可选），模糊搜索
  - fittingMethod: 拟合方式（可选），0-无, 1-重心, 2-散点, 3-环绕, 4-直线

返回: 区域规则列表，含名称、进出基准点数、拟合方式`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        keyword: z.string().optional().describe('规则名称关键词，模糊搜索'),
        fittingMethod: z.number().min(0).max(4).optional().describe('拟合方式: 0-无, 1-重心, 2-散点, 3-环绕, 4-直线'),
    }).strict(),
}, async (args) => {
    try {
        const { keyword, fittingMethod } = args;
        let sql = `SELECT id, name, inside, outside, fitting_method, fitting_method_param FROM gis_area_rule WHERE del_flg = 0`;
        const params = [];
        if (keyword !== undefined) {
            sql += " AND name LIKE ?";
            params.push(`%${keyword}%`);
        }
        if (fittingMethod !== undefined) {
            sql += ' AND fitting_method = ?';
            params.push(fittingMethod);
        }
        sql += ' ORDER BY create_time DESC LIMIT 2000';
        const rules = await query(sql, params);
        const { text, truncated } = truncateOutput(JSON.stringify({
            total: rules.length,
            areaRules: rules.map((r) => ({
                id: r.id,
                name: r.name,
                inside: r.inside,
                outside: r.outside,
                fittingMethod: r.fitting_method,
                fittingMethodName: FITTING_METHOD_MAP[r.fitting_method] || '',
                fittingMethodParam: r.fitting_method_param,
            })),
        }, null, 2));
        return {
            content: [{
                    type: 'text',
                    text: truncated ? text + '\n\n⚠️ [输出已截断] 返回了前 2000 条记录。' : text,
                }],
        };
    }
    catch (err) {
        log('Error in list_area_rules:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询区域规则失败 - ${err.message}` }], isError: true };
    }
});
//# sourceMappingURL=listAreaRules.js.map