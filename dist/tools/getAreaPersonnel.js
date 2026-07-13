import { server, z } from '../server.js';
import { callAreaPersonnel } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
server.registerTool('get_area_personnel', {
    title: 'get_area_personnel',
    description: `查询某区域内当前的人员。返回区域内所有人员的姓名、标签、位置等信息。

参数:
  - areaId: 区域ID（必填）

返回: 区域内人员列表，含标签编码、绑定名称、坐标、进入时间`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({ areaId: z.number().describe('区域ID') }).strict(),
}, async (args) => {
    try {
        const { areaId } = args;
        const personnel = await callAreaPersonnel(areaId);
        return { content: [{ type: 'text', text: JSON.stringify({ areaId,
                        count: Array.isArray(personnel) ? personnel.length : 0, personnel }, null, 2) }] };
    }
    catch (err) {
        log('Error in get_area_personnel:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询区域人员失败 - ${err.message}。建议：检查areaId是否正确。` }], isError: true };
    }
});
//# sourceMappingURL=getAreaPersonnel.js.map