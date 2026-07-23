import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('get_trajectory', {
    title: 'get_trajectory',
    description: `查询标签的历史行为轨迹。返回时间序列坐标点。

参数:
  - tagCode: 标签编码（必填）
  - startTime: 开始时间（可选），格式 "2026-07-09 08:00:00"
  - endTime: 结束时间（可选）
  - mapId: 地图ID（可选）
  - limit: 最多返回点数，默认500，最大5000

返回: 轨迹点列表，含时间、坐标、地图

错误处理:
  - 无数据时返回空列表
  - 使用时间范围和limit控制数据量`,
    annotations: READ_ONLY_ANNOTATIONS,
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
        let sql = `SELECT id, object_id, x, y, map_id, create_time FROM log_behavior_trajectory WHERE object_id = ?`;
        const params = [tagCode];
        if (startTime !== undefined) {
            sql += " AND create_time >= ?";
            params.push(startTime);
        }
        if (endTime !== undefined) {
            sql += " AND create_time <= ?";
            params.push(endTime);
        }
        if (mapId !== undefined) {
            sql += ' AND map_id = ?';
            params.push(mapId);
        }
        sql += ' ORDER BY create_time ASC LIMIT ?';
        params.push(limit);
        const trajectory = await query(sql, params);
        const { text, truncated } = truncateOutput(JSON.stringify({
            tagCode, pointCount: trajectory.length, points: trajectory.map(p => ({
                id: p.id, x: p.x, y: p.y, mapId: p.map_id, time: p.create_time,
            })),
        }, null, 2));
        return {
            content: [{
                    type: 'text',
                    text: truncated ? text + '\n\n⚠️ [输出已截断] 轨迹点过多，请缩小时间范围或减少 limit。' : text,
                }],
        };
    }
    catch (err) {
        log('Error in get_trajectory:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询轨迹失败 - ${err.message}。建议：检查标签编码是否正确，或缩小时间范围。` }], isError: true };
    }
});
//# sourceMappingURL=getTrajectory.js.map