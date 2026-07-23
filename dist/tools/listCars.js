import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS, CAR_TYPE_MAP } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('list_cars', {
    title: 'list_cars',
    description: `获取车辆列表，可按车辆类型、车牌号或绑定状态筛选。

参数:
  - carType: 车辆类型（可选）0-夹包车, 1-转运车, 2-正面吊
  - keyword: 搜索关键词（可选），匹配车牌/编号/品牌
  - isBound: 绑定状态（可选），true=已绑定, false=未绑定
  - pageSize, page: 分页

返回: 车辆列表，含类型、品牌、型号、车牌号、绑定标签`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        carType: z.number().optional().describe('车辆类型: 0-夹包车, 1-转运车, 2-正面吊'),
        keyword: z.string().optional().describe('搜索关键词(匹配车牌号/车辆编号/品牌)'),
        isBound: z.boolean().optional().describe('按绑定状态筛选，true=已绑定, false=未绑定'),
        pageSize: z.number().min(1).max(500).default(100).describe('每页数量，默认100'),
        page: z.number().min(1).default(1).describe('页码，默认1'),
    }).strict(),
}, async (args) => {
    try {
        const { carType, keyword, isBound, pageSize, page } = args;
        let sql = `SELECT id, car_type, car_code, car_brand, car_model, machine_code, tag_id, tag_code, has_weight_device FROM car WHERE del_flg = 0`;
        const params = [];
        if (carType !== undefined) {
            sql += ' AND car_type = ?';
            params.push(carType);
        }
        if (keyword !== undefined) {
            sql += " AND (machine_code LIKE ? OR car_code LIKE ? OR car_brand LIKE ?)";
            const kw = `%${keyword}%`;
            params.push(kw, kw, kw);
        }
        if (isBound !== undefined) {
            sql += isBound ? ' AND tag_code IS NOT NULL' : ' AND tag_code IS NULL';
        }
        sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        const cars = await query(sql, params);
        let countSql = `SELECT COUNT(*) as total FROM car WHERE del_flg = 0`;
        const countParams = [];
        if (carType !== undefined) {
            countSql += ' AND car_type = ?';
            countParams.push(carType);
        }
        if (keyword !== undefined) {
            countSql += " AND (machine_code LIKE ? OR car_code LIKE ? OR car_brand LIKE ?)";
            const kw = `%${keyword}%`;
            countParams.push(kw, kw, kw);
        }
        if (isBound !== undefined) {
            countSql += isBound ? ' AND tag_code IS NOT NULL' : ' AND tag_code IS NULL';
        }
        const totalRows = await query(countSql, countParams);
        const total = Array.isArray(totalRows) ? totalRows[0]?.total : 0;
        const { text, truncated } = truncateOutput(JSON.stringify({ total, page, pageSize, cars: cars.map(c => ({
                id: c.id, carType: c.car_type, carTypeName: CAR_TYPE_MAP[c.car_type] || '',
                carCode: c.car_code, carBrand: c.car_brand, carModel: c.car_model,
                plateNumber: c.machine_code, tagId: c.tag_id, tagCode: c.tag_code,
                hasWeightDevice: c.has_weight_device,
            })), }, null, 2));
        return {
            content: [{
                    type: 'text',
                    text: truncated ? text + '\n\n⚠️ [输出已截断] 请缩小筛选范围或调整分页参数。' : text,
                }],
        };
    }
    catch (err) {
        log('Error in list_cars:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询车辆列表失败 - ${err.message}` }], isError: true };
    }
});
//# sourceMappingURL=listCars.js.map