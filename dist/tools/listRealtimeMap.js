import { server, z } from '../server.js';
import { callListTags, callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('list_realtime_map', {
    title: 'list_realtime_map',
    description: `【📊 查询】获取指定地图上所有标签的实时位置快照。

参数:
  - mapCode: 地图编码（必填），如 "map_001"

返回: 地图上所有标签的实时位置，含坐标、绑定名称、电量

提示: mapCode 会传至 Java API 端过滤，仅返回该地图数据。bindings 有 30 秒缓存。`,
    annotations: QUERY_ANNOTATIONS,
    inputSchema: z.object({
        mapCode: z.string().describe('地图编码，如 "map_001"'),
    }).strict(),
}, async (args) => {
    try {
        const { mapCode } = args;
        // P3: 传 mapCode 至服务端过滤，仅拉取该地图标签，减少网络传输 + 本地过滤开销
        const positions = await callListTags(mapCode);
        // P3: 使用缓存 bindings（30s TTL），无需额外 API 调用
        const bindings = await callTagBindings();
        const bindingsMap = {};
        bindings.forEach((b) => { bindingsMap[b.tagCode] = b.bindName; });
        const enriched = positions.map((p) => ({
            tagCode: p.tagCode, x: p.x, y: p.y, mapCode: p.mapCode,
            mapName: p.mapName, bindName: bindingsMap[p.tagCode] || '',
            power: p.power, timestamp: p.timestamp,
        }));
        const { text, truncated } = truncateOutput(JSON.stringify({
            count: enriched.length, mapCode, positions: enriched
        }, null, 2));
        return {
            content: [{
                    type: 'text',
                    text: truncated ? text + '\n\n⚠️ [输出已截断] 该地图标签数据量较大。' : text,
                }],
        };
    }
    catch (err) {
        log('Error in list_realtime_map:', err.message);
        return { content: [{ type: 'text', text: `Error: 获取实时地图快照失败 - ${err.message}。建议：确认地图编码是否正确。` }], isError: true };
    }
});
//# sourceMappingURL=listRealtimeMap.js.map