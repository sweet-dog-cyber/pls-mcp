import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('list_anchors', {
  title: 'list_anchors',
  description: `获取基站列表，可按状态或地图筛选。返回基站编码、位置、状态等信息。

参数:
  - status: 基站状态（可选），如"在线"、"离线"
  - mapId: 地图ID（可选）

返回: 基站列表，含编码、坐标、状态、类型`,
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: z.object({
    status: z.string().optional().describe('基站状态，如 "在线", "离线"'),
    mapId: z.number().optional().describe('地图ID，不传则返回全部地图'),
  }).strict(),
}, async (args) => {
  try {
    const { status, mapId } = args;
    let sql = `SELECT id, code, coordinates, map_id, status, anchor_location FROM gis_anchor WHERE del_flg = 0`;
    const params: any[] = [];
    if (status !== undefined) { sql += ' AND status = ?'; params.push(status); }
    if (mapId !== undefined) { sql += ' AND map_id = ?'; params.push(mapId); }
    sql += ' ORDER BY code ASC LIMIT 2000';
    const anchors = await query(sql, params);
    const { text, truncated } = truncateOutput(JSON.stringify({ total: anchors.length, anchors: anchors.map(a => ({
      id: a.id, anchorCode: a.code, mapId: a.map_id, coordinates: a.coordinates, status: a.status, anchorLocation: a.anchor_location,
    })), }, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 返回了前 2000 条记录。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in list_anchors:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询基站列表失败 - ${err.message}` }], isError: true };
  }
});