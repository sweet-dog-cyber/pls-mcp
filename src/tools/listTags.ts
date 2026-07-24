import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS, TAG_TYPE_MAP, TAG_TYPE_NAME_MAP } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('list_tags', {
  title: 'list_tags',
  description: `【📊 查询】获取定位标签列表，可按地图或类型筛选。

参数:
  - mapId: 地图ID（可选），不传则返回全部地图
  - tagType: 标签类型（可选），UWB/Bluetooth/GPS/UWB+GPS/惯性导航
  - pageSize: 每页数量，默认100
  - page: 页码，默认1

返回: 带分页的标签列表，包含编码、类型、状态、电量、绑定状态

提示: 使用 tagType 和 mapId 缩小范围。适合巡检和批量查看。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    mapId: z.number().optional().describe('地图ID，不传则返回全部地图'),
    tagType: z.enum(['UWB', 'Bluetooth', 'GPS', 'UWB+GPS', '惯性导航']).optional().describe('标签类型'),
    pageSize: z.number().min(1).max(500).default(100).describe('每页数量，默认100，最大500'),
    page: z.number().min(1).default(1).describe('页码，默认1'),
  }).strict(),
}, async (args) => {
  try {
    const { mapId, tagType, pageSize, page } = args;
    let sql = `SELECT id, tag_code, model, tag_type, status, power, is_bind, marker_file, slice FROM gis_tag WHERE del_flg = 0`;
    const params: any[] = [];
    if (mapId !== undefined) { sql += ' AND map_id = ?'; params.push(mapId); }
    if (tagType !== undefined) { sql += ' AND tag_type = ?'; params.push(TAG_TYPE_MAP[tagType] ?? tagType); }
    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    const tags = await query(sql, params);
    let countSql = `SELECT COUNT(*) as total FROM gis_tag WHERE del_flg = 0`;
    const countParams: any[] = [];
    if (mapId !== undefined) { countSql += ' AND map_id = ?'; countParams.push(mapId); }
    if (tagType !== undefined) { countSql += ' AND tag_type = ?'; countParams.push(TAG_TYPE_MAP[tagType] ?? tagType); }
    const totalRows = await query(countSql, countParams);
    const total = Array.isArray(totalRows) ? totalRows[0]?.total : 0;
    const { text, truncated } = truncateOutput(JSON.stringify({
      total, page, pageSize,
      tags: tags.map(t => ({
        id: t.id, tagCode: t.tag_code, model: t.model,
        tagType: TAG_TYPE_NAME_MAP[t.tag_type] ?? t.tag_type,
        status: t.status, power: t.power, isBind: t.is_bind ? '1' : '0',
        markerFile: t.marker_file, slice: t.slice,
      })),
    }, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 请缩小筛选范围或调整分页参数。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in list_tags:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询标签列表失败 - ${err.message}。建议：检查数据库连接或减少筛选条件。` }], isError: true };
  }
});