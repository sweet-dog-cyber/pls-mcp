import { server, z } from '../server.js';
import { callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';
server.registerTool('get_tag_bindings', {
    title: 'get_tag_bindings',
    description: `查询标签与人员/车辆/货物的绑定关系。返回所有已绑定的标签及其对应的对象名称和类型。

参数:
  - tagCode: 标签编码（可选），不传则返回全部绑定关系

返回: 绑定关系列表，含tagCode、bindName、bindType、bindId

错误处理:
  - Java API 连接失败时返回详细错误`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        tagCode: z.string().optional().describe('如指定标签编码，只查该标签的绑定关系'),
    }).strict(),
}, async (args) => {
    try {
        const { tagCode } = args;
        // callTagBindings now returns a unified array format: { tagCode, bindName, bindType, bindId }[]
        const bindings = await callTagBindings();
        const results = tagCode
            ? bindings.filter((b) => b.tagCode === tagCode)
            : bindings;
        const { text, truncated } = truncateOutput(JSON.stringify({ total: results.length, bindings: results }, null, 2));
        return {
            content: [{
                    type: 'text',
                    text: truncated ? text + '\n\n⚠️ [输出已截断] 绑定数据量较大，请指定 tagCode 缩小范围。' : text,
                }],
        };
    }
    catch (err) {
        log('Error in get_tag_bindings:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询绑定关系失败 - ${err.message}。建议：检查Java API是否可用。` }], isError: true };
    }
});
//# sourceMappingURL=getTagBindings.js.map