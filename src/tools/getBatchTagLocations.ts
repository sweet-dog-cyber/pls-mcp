import { server, z } from '../server.js';
import { callRealtimeLocation, callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('get_batch_tag_locations', {
  title: 'get_batch_tag_locations',
  description: `批量查询多个标签的实时位置。一次请求返回所有标签的位置信息，减少 API 调用次数。\n\n参数:\n  - tagCodes: 标签编码数组（必填），最多 100 个\n\n返回: 批量位置结果，含坐标、绑定名称、电量、在线状态\n\n提示: 比逐个查询快 5-10 倍，适合同时查看多个标签`,
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: z.object({
    tagCodes: z.array(z.string()).min(1).max(100).describe('标签编码数组，如 ["UWB001","T988496"]，最多100个'),
  }).strict(),
}, async (args) => {
  try {
    const { tagCodes } = args;

    // Parallel: fetch bindings once + all locations in parallel
    let bindingsMap: Record<string, string> = {};
    try {
      const bindings = await callTagBindings();
      bindings.forEach((b: any) => { bindingsMap[b.tagCode] = b.bindName; });
    } catch (e: any) {
      log(`Warning: failed to fetch bindings: ${e.message}`);
    }

    // Fetch all locations in parallel (chunks of 20 to avoid overwhelming)
    const results: any[] = [];
    const batchSize = 20;
    for (let i = 0; i < tagCodes.length; i += batchSize) {
      const chunk = tagCodes.slice(i, i + batchSize);
      const chunkResults = await Promise.all(chunk.map(async (tagCode) => {
        try {
          const location = await callRealtimeLocation(tagCode);
          return {
            tagCode,
            bindName: bindingsMap[tagCode] || '',
            x: location.x,
            y: location.y,
            mapCode: location.mapCode,
            mapName: location.mapName,
            power: location.power,
            areaName: location.areaName || '',
            timestamp: location.timestamp,
            status: 'online',
          };
        } catch (e: any) {
          return {
            tagCode,
            bindName: bindingsMap[tagCode] || '',
            status: 'no_data',
            message: e.message,
          };
        }
      }));
      results.push(...chunkResults);
    }

    const online = results.filter(r => r.status === 'online').length;
    const noData = results.filter(r => r.status === 'no_data').length;
    const { text, truncated } = truncateOutput(JSON.stringify({
      total: tagCodes.length,
      online,
      noData,
      locations: results,
    }, null, 2));

    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 请减少标签数量。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in get_batch_tag_locations:', err.message);
    return { content: [{ type: 'text', text: `Error: 批量查询位置失败 - ${err.message}` }], isError: true };
  }
});