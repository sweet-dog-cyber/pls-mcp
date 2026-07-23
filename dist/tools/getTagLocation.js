import { server, z } from '../server.js';
import { callRealtimeLocation, callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
server.registerTool('get_tag_location', {
    title: 'get_tag_location',
    description: `按标签编码查询实时位置。返回坐标、所在区域、电量、绑定人员等信息。

参数:
  - tagCode: 标签编码（必填），如 UWB001

返回: 实时位置信息，含坐标(x/y)、地图编码/名称、时间戳、电量、绑定人员、所在区域

错误处理:
  - 标签不存在时返回提示信息
  - 绑定信息获取失败不影响位置返回`,
    annotations: READ_ONLY_ANNOTATIONS,
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
            const match = bindings.find((b) => b.tagCode === tagCode);
            if (match)
                bindName = match.bindName;
        }
        catch (e) {
            log(`Warning: failed to fetch bindings for ${tagCode}: ${e.message}`);
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ tagCode, x: location.x, y: location.y, mapCode: location.mapCode,
                        mapName: location.mapName, timestamp: location.timestamp, power: location.power, bindName, areaName: location.areaName }, null, 2),
                }],
        };
    }
    catch (err) {
        log('Error in get_tag_location:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询实时位置失败 - ${err.message}。建议：检查标签编码是否正确，或确认标签是否在线。` }], isError: true };
    }
});
//# sourceMappingURL=getTagLocation.js.map