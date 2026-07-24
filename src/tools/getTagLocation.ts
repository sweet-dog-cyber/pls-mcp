import { server, z } from '../server.js';
import { callRealtimeLocation, callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('get_tag_location', {
  title: 'get_tag_location',
  description: `【📊 查询】按标签编码查询实时位置。

参数:
  - tagCode: 标签编码（必填），如 UWB001

返回: 实时位置信息，含坐标(x/y)、地图编码/名称、时间戳、电量、绑定人员、所在区域

提示: 标签不在线或无位置数据时会返回清晰错误。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    tagCode: z.string().describe('标签编码，如 UWB001'),
  }).strict(),
}, async (args) => {
  try {
    const { tagCode } = args;
    const location = await callRealtimeLocation(tagCode);
    let bindName = '';
    try {
      const bindings = await callTagBindings();
      const match = bindings.find((b: any) => b.tagCode === tagCode);
      if (match) bindName = match.bindName;
    } catch (e: any) {
      log(`Warning: failed to fetch bindings for ${tagCode}: ${e.message}`);
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ tagCode, x: location.x, y: location.y, mapCode: location.mapCode,
          mapName: location.mapName, timestamp: location.timestamp, power: location.power, bindName, areaName: location.areaName }, null, 2),
      }],
    };
  } catch (err: any) {
    log('Error in get_tag_location:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询实时位置失败 - ${err.message}。建议：检查标签编码是否正确，或确认标签是否在线。` }], isError: true };
  }
});