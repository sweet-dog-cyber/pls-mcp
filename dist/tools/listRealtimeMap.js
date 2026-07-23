import { server, z } from '../server.js';
import { callListTags, callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('list_realtime_map', {
    title: 'list_realtime_map',
    description: `获取指定地图上所有标签的实时位置快照。适合用于展示实时地图。

参数:
  - mapCode: 地图编码（必填），如 "map_001"

返回: 地图上所有标签的实时位置，含坐标、绑定名称、电量`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        mapCode: z.string().describe('地图编码，如 "map_001"'),
    }).strict(),
}, async (args) => {
    try {
        const { mapCode } = args;
        // Get all real-time locations from Java API
        const allLocations = await callListTags();
        // callTagBindings now returns unified array with built-in cache
        const bindings = {};
        try {
            const bindData = await callTagBindings();
            bindData.forEach((b) => { bindings[b.tagCode] = b.bindName; });
        }
        catch (e) {
            log(`Warning: failed to fetch bindings: ${e.message}`);
        }
        // Filter by map if specified
        let positions = allLocations;
        if (mapCode) {
            positions = allLocations.filter((p) => p.mapCode === mapCode);
        }
        // Enrich with binding info
        const enriched = positions.map((p) => ({
            tagCode: p.tagCode,
            x: p.x,
            y: p.y,
            mapCode: p.mapCode,
            mapName: p.mapName,
            bindName: bindings[p.tagCode] || '',
            power: p.power,
            timestamp: p.timestamp,
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