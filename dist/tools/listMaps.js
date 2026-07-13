import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
server.registerTool('list_maps', {
    title: 'list_maps',
    description: '获取地图列表。返回地图编码、名称、所属楼栋等信息。无需参数。',
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({}).strict(),
}, async () => {
    try {
        const maps = await query(`SELECT id, code, name, building_id FROM gis_map ORDER BY code ASC`, []);
        return { content: [{ type: 'text', text: JSON.stringify({ total: maps.length, maps: maps.map(m => ({
                            id: m.id, code: m.code, name: m.name, buildingId: m.building_id,
                        })), }, null, 2) }] };
    }
    catch (err) {
        log('Error in list_maps:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询地图列表失败 - ${err.message}` }], isError: true };
    }
});
//# sourceMappingURL=listMaps.js.map