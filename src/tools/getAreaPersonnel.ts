import { server, z } from '../server.js';
import { callAreaPersonnel } from '../api/client.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('get_area_personnel', {
  title: 'get_area_personnel',
  description: `【📊 查询】查询某区域内当前的人员。

参数:
  - areaId: 区域ID（必填）

返回: 区域内人员列表，含标签编码、绑定名称、坐标、进入时间

提示: 数据来自 Java 实时 API。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({ areaId: z.number().describe('区域ID') }).strict(),
}, async (args) => {
  try {
    const { areaId } = args;
    const personnel = await callAreaPersonnel(areaId);
    const { text, truncated } = truncateOutput(JSON.stringify({ areaId,
      count: Array.isArray(personnel) ? personnel.length : 0, personnel }, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断] 该区域人员数据量较大。' : text,
      }],
    };
  } catch (err: any) {
    log('Error in get_area_personnel:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询区域人员失败 - ${err.message}。建议：检查areaId是否正确。` }], isError: true };
  }
});