import { server, z } from '../server.js';
import { callExternal } from '../api/client.js';
import { log } from '../config/settings.js';
import { MANAGE_ANNOTATIONS, checkConfirm } from '../constants.js';
server.registerTool('pls_send_sos_alarm', {
    title: 'pls_send_sos_alarm',
    description: `【🔧 管理】发送 SOS 紧急告警。触发指定标签的紧急告警通知。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - tagCodes: 标签编码列表（必填），如 ["UWB001", "UWB002"]

返回: 操作是否成功

提示: 会触发真实告警通知，请谨慎使用！仅紧急情况调用。最多 100 个标签。`,
    annotations: MANAGE_ANNOTATIONS,
    inputSchema: z.object({
        confirm: z.literal('确认').describe('⚠️ 危险操作需二次确认，必须传 "确认"'),
        tagCodes: z.array(z.string()).min(1).max(100).describe('标签编码列表，如 ["UWB001"]'),
    }).strict(),
}, async (args) => {
    try {
        checkConfirm(args.confirm, 'SOS 告警操作');
        await callExternal('sos/alarm', 'POST', undefined, { codeList: args.tagCodes });
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, tagCodes: args.tagCodes }, null, 2) }] };
    }
    catch (err) {
        if (err.message.includes('需二次确认')) {
            return { content: [{ type: 'text', text: err.message }], isError: true };
        }
        log('Error in pls_send_sos_alarm:', err.message);
        return { content: [{ type: 'text', text: `Error: 发送 SOS 告警失败 - ${err.message}` }], isError: true };
    }
});
server.registerTool('pls_batch_update_anchors', {
    title: 'pls_batch_update_anchors',
    description: `【🔧 管理】批量更新基站信息，包括状态、IP、型号等。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - anchors: 基站更新列表（必填），每项含:
    - code: 基站编码（必填）
    - ip: 基站 IP（可选）
    - model: 基站型号（可选）
    - mapId: 地图ID（可选）
    - status: 状态（可选）0-在线, 1-离线

返回: 成功更新的基站数量

提示: 只更新提供的字段，未提供的字段保持不变。最多支持 500 条。`,
    annotations: MANAGE_ANNOTATIONS,
    inputSchema: z.object({
        confirm: z.literal('确认').describe('⚠️ 写操作需二次确认，必须传 "确认"'),
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
        checkConfirm(args.confirm, '批量更新基站操作');
        await callExternal('update/anchor', 'POST', args.anchors);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, count: args.anchors.length }, null, 2) }] };
    }
    catch (err) {
        if (err.message.includes('需二次确认')) {
            return { content: [{ type: 'text', text: err.message }], isError: true };
        }
        log('Error in pls_batch_update_anchors:', err.message);
        return { content: [{ type: 'text', text: `Error: 批量更新基站失败 - ${err.message}` }], isError: true };
    }
});
server.registerTool('pls_batch_update_tags', {
    title: 'pls_batch_update_tags',
    description: `【🔧 管理】批量更新标签信息，包括电量和状态。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - tags: 标签更新列表（必填），每项含:
    - code: 标签编码（必填）
    - battery: 电量（可选）
    - status: 状态（可选）0-在线, 1-离线

返回: 成功更新的标签数量

提示: 只更新提供的字段，未提供的字段保持不变。最多支持 500 条。`,
    annotations: MANAGE_ANNOTATIONS,
    inputSchema: z.object({
        confirm: z.literal('确认').describe('⚠️ 写操作需二次确认，必须传 "确认"'),
        tags: z.array(z.object({
            code: z.string().describe('标签编码'),
            battery: z.string().optional().describe('电量'),
            status: z.string().optional().describe('状态: 0-在线, 1-离线'),
        })).min(1).max(500).describe('标签列表'),
    }).strict(),
}, async (args) => {
    try {
        checkConfirm(args.confirm, '批量更新标签操作');
        await callExternal('update/tag', 'POST', args.tags);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, count: args.tags.length }, null, 2) }] };
    }
    catch (err) {
        if (err.message.includes('需二次确认')) {
            return { content: [{ type: 'text', text: err.message }], isError: true };
        }
        log('Error in pls_batch_update_tags:', err.message);
        return { content: [{ type: 'text', text: `Error: 批量更新标签失败 - ${err.message}` }], isError: true };
    }
});
//# sourceMappingURL=external.js.map