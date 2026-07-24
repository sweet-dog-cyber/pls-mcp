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

提示: 适合用于展示实时地图。bindings 有 30 秒缓存。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    mapCode: z.string().describe('地图编码，如 "map_001"'),
  }).strict(),
}, async (args) => {
  try {
    const { mapCode } = args;
    const allLocations = await callListTags();
    const bindings: Record<string, string> = {};
    try {
      const bindData = await callTagBindings();
      bindData.forEach((b: any) => { bindings[b.tagCode] = b.bindName; });
    } catch (e: any) {
      log(`Warning: failed to fetch bindings: ${e.message}`);
    }
    let positions = allLocations;
    if (mapCode) {
      positions = allLocations.filter((p: any) => p.mapCode === mapCode);
    }
    const enriched = positions.map((p: any) => ({
      tagCode: p.tagCode, x: p.x, y: p.y, mapCode: p.mapCode,
      mapName: p.mapName, bindName: bindings[p.tagCode] || '',
      power: p.power, timestamp: p.timestamp,
    }));
    const { text, truncated } = truncateOutput(JSON.stringify({
      count: enriched.length, mapCode, positions: enriched }, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 该地图标签数据量较大。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in list_realtime_map:', err.message);
    return { content: [{ type: 'text', text: `Error: 获取实时地图快照失败 - ${err.message}。建议：确认地图编码是否正确。` }], isError: true };
  }
});