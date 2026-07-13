import { server, z } from '../server.js';
import { callExternal } from '../api/client.js';
import { log } from '../config/settings.js';
server.registerTool('pls_send_sos_alarm', {
    title: 'pls_send_sos_alarm',
    description: `发送 SOS 告警。触发指定标签的紧急告警通知。

参数:
  - tagCodes: 标签编码列表（必填），如 ["UWB001", "UWB002"]

返回: 操作是否成功

注意: 此操作会触发真实告警通知`,
    inputSchema: z.object({
        tagCodes: z.array(z.string()).min(1).max(100).describe('标签编码列表，如 ["UWB001"]'),
    }).strict(),
}, async (args) => {
    try {
        const res = await callExternal('sos/alarm', 'POST', undefined, { codeList: args.tagCodes });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, tagCodes: args.tagCodes }, null, 2) }] };
    }
    catch (err) {
        log('Error in pls_send_sos_alarm:', err.message);
        return { content: [{ type: 'text', text: `Error: 发送 SOS 告警失败 - ${err.message}` }], isError: true };
    }
});
server.registerTool('pls_batch_update_anchors', {
    title: 'pls_batch_update_anchors',
    description: `批量更新基站信息，包括状态、IP、型号等。

参数:
  - anchors: 基站更新列表（必填），每项含 code(基站编码), ip(可选), model(可选), mapId(可选), status(可选)

注意: 只更新提供的字段，未提供的字段保持不变`,
    inputSchema: z.object({
        anchors: z.array(z.object({
            code: z.string().describe('基站编码'),
            ip: z.string().optional().describe('基站 IP'),
            model: z.string().optional().describe('基站型号'),
            mapId: z.number().optional().describe('地图ID'),
            status: z.string().optional().describe('状态: 0-在线, 1-离线'),
        })).min(1).max(500).describe('基站列表'),
    }).strict(),
}, async (args) => {
    try {
        const res = await callExternal('update/anchor', 'POST', args.anchors);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, count: args.anchors.length }, null, 2) }] };
    }
    catch (err) {
        log('Error in pls_batch_update_anchors:', err.message);
        return { content: [{ type: 'text', text: `Error: 批量更新基站失败 - ${err.message}` }], isError: true };
    }
});
server.registerTool('pls_batch_update_tags', {
    title: 'pls_batch_update_tags',
    description: `批量更新标签信息，包括电量和状态。

参数:
  - tags: 标签更新列表（必填），每项含 code(标签编码), battery(可选), status(可选)

注意: 只更新提供的字段，未提供的字段保持不变`,
    inputSchema: z.object({
        tags: z.array(z.object({
            code: z.string().describe('标签编码'),
            battery: z.string().optional().describe('电量'),
            status: z.string().optional().describe('状态: 0-在线, 1-离线'),
        })).min(1).max(500).describe('标签列表'),
    }).strict(),
}, async (args) => {
    try {
        const res = await callExternal('update/tag', 'POST', args.tags);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, count: args.tags.length }, null, 2) }] };
    }
    catch (err) {
        log('Error in pls_batch_update_tags:', err.message);
        return { content: [{ type: 'text', text: `Error: 批量更新标签失败 - ${err.message}` }], isError: true };
    }
});
//# sourceMappingURL=external.js.map