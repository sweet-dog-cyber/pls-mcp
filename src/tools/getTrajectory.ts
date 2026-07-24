import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('get_trajectory', {
  title: 'get_trajectory',
  description: `【📊 查询】查询标签的历史行为轨迹。

参数:
  - tagCode: 标签编码（必填）
  - startTime: 开始时间（可选），格式 "2026-07-09 08:00:00"
  - endTime: 结束时间（可选）
  - mapId: 地图ID（可选）
  - limit: 最多返回点数，默认500，最大5000

返回: totalCount(匹配总数) + pointCount(实际返回) + 轨迹点列表

提示: 先COUNT再LIMIT。若 totalCount > limit，说明有数据未返回，请缩小时间范围或调大 limit。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    tagCode: z.string().describe('标签编码，如 UWB001'),
    startTime: z.string().optional().describe('开始时间，格式 "2026-07-09 08:00:00"'),
    endTime: z.string().optional().describe('结束时间，格式 "2026-07-09 18:00:00"'),
    mapId: z.number().optional().describe('地图ID，不传则返回全部地图'),
    limit: z.number().min(1).max(5000).default(500).describe('最多返回点数，默认500，最大5000'),
  }).strict(),
}, async (args) => {
  try {
    const { tagCode, startTime, endTime, mapId, limit } = args;
    // 构建 WHERE 条件（COUNT 和 SELECT 共用）
    let whereSql = `object_id = ?`;
    const params: any[] = [tagCode];
    if (startTime !== undefined) { whereSql += " AND create_time >= ?"; params.push(startTime); }
    if (endTime !== undefined) { whereSql += " AND create_time <= ?"; params.push(endTime); }
    if (mapId !== undefined) { whereSql += ' AND map_id = ?'; params.push(mapId); }

    // P4: COUNT 和 SELECT 并行执行，只增加一次网络往返
    const [countResult, trajectory] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM log_behavior_trajectory WHERE ${whereSql}`, params),
      query(`SELECT id, object_id, x, y, map_id, create_time FROM log_behavior_trajectory WHERE ${whereSql} ORDER BY create_time ASC LIMIT ?`, [...params, limit]),
    ]);

    const totalCount = Array.isArray(countResult) ? countResult[0]?.total : 0;

    const { text, truncated } = truncateOutput(JSON.stringify({
      tagCode,
      totalCount,
      pointCount: trajectory.length,
      limit,
      points: trajectory.map(p => ({
        id: p.id, x: p.x, y: p.y, mapId: p.map_id, time: p.create_time,
      })),
    }, null, 2));

    let extraHint = '';
    if (totalCount > limit) {
      extraHint = `\n\nℹ️ 该标签在筛选范围内共有 ${totalCount} 条轨迹记录，本次返回了前 ${limit} 条。可扩大 limit 或缩小时间范围查看更多。`;
    }
    if (totalCount === 0) {
      extraHint = '\n\nℹ️ 该标签在筛选范围内没有轨迹记录。建议：确认 tagCode 或放宽时间范围。';
    }

    return {
      content: [{
        type: 'text',
        text: (truncated ? text + '\n\n⚠️ [输出已截断] 轨迹点过多，请缩小时间范围或减少 limit。' : text) + extraHint,
      }],
    };
  } catch (err: any) {
    log('Error in get_trajectory:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询轨迹失败 - ${err.message}。建议：检查标签编码是否正确，或缩小时间范围。` }], isError: true };
  }
});