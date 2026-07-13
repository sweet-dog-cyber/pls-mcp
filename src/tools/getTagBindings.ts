import { server, z } from '../server.js';
import { callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';

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
    const raw = await callTagBindings();
    const entries = typeof raw === 'object' && !Array.isArray(raw) ? Object.entries(raw) : raw;
    const results = entries
      .filter((b: any) => { const code = Array.isArray(b) ? b[0] : b.tagCode; return !tagCode || code === tagCode; })
      .map((b: any) => ({
        tagCode: Array.isArray(b) ? b[0] : b.tagCode,
        bindName: Array.isArray(b) ? b[1] : b.bindName,
        bindType: Array.isArray(b) ? '' : (b.bindType || ''),
        bindId: Array.isArray(b) ? '' : (b.bindId || ''),
      }));
    return { content: [{ type: 'text', text: JSON.stringify({ total: results.length, bindings: results }, null, 2) }] };
  } catch (err: any) {
    log('Error in get_tag_bindings:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询绑定关系失败 - ${err.message}。建议：检查Java API是否可用。` }], isError: true };
  }
});