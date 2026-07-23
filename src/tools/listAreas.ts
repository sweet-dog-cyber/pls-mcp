import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('list_areas', {
  title: 'list_areas',
  description: `获取区域列表，可按地图筛选。返回区域名称、类型、所属地图等信息。

参数:
  - mapId: 地图ID（可选），不传返回全部地图

返回: 区域列表，含名称、类型、地图ID、算法参数`,
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: z.object({ mapId: z.number().optional().describe('地图ID，不传则返回全部地图') }).strict(),
}, async (args) => {
  try {
    const { mapId } = args;
    let sql = `SELECT id, name, map_id, area_type, area_rule_id, is_bind FROM gis_area WHERE del_flg = 0`;
    const params: any[] = [];
    if (mapId !== undefined) { sql += ' AND map_id = ?'; params.push(mapId); }
    sql += ' ORDER BY name ASC LIMIT 2000';
    const areas = await query(sql, params);
    const { text, truncated } = truncateOutput(JSON.stringify({ total: areas.length, areas: areas.map(a => ({
      id: a.id, name: a.name, mapId: a.map_id, areaType: a.area_type,
    })), }, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 返回了前 2000 条记录。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in list_areas:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询区域列表失败 - ${err.message}` }], isError: true };
  }
});