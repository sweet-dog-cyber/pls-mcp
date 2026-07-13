import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { callRealtimeLocation } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
server.registerTool('get_personnel_location', {
    title: 'get_personnel_location',
    description: `按人员姓名或ID查询实时位置。先查人员的绑定标签，再查标签的实时位置。

参数:
  - nameOrId: 人员姓名或ID（必填），如 "张三" 或 "1001"

返回: 人员实时位置信息，含姓名、坐标、地图、区域

错误处理:
  - 人员不存在时返回"未找到人员"
  - 人员未绑定时提示未绑定标签`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        nameOrId: z.string().describe('人员姓名或ID，如 "张三" 或 "1001"'),
    }).strict(),
}, async (args) => {
    try {
        const { nameOrId } = args;
        let personnel = [];
        if (/^\d+$/.test(nameOrId)) {
            personnel = await query(`SELECT id, name, tag_code FROM personnel_information WHERE id = ?`, [nameOrId]);
        }
        else {
            personnel = await query(`SELECT id, name, tag_code FROM personnel_information WHERE name LIKE ?`, [`%${nameOrId}%`]);
        }
        if (personnel.length === 0)
            return { content: [{ type: 'text', text: `未找到人员 "${nameOrId}"` }] };
        const results = [];
        for (const p of personnel) {
            if (!p.tag_code) {
                results.push({ name: p.name, tagCode: null, message: '未绑定标签' });
                continue;
            }
            try {
                const location = await callRealtimeLocation(p.tag_code);
                results.push({ name: p.name, tagCode: p.tag_code, x: location.x, y: location.y,
                    mapCode: location.mapCode, mapName: location.mapName, timestamp: location.timestamp, areaName: location.areaName });
            }
            catch (e) {
                results.push({ name: p.name, tagCode: p.tag_code, message: `位置查询失败: ${e.message}` });
            }
        }
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
    catch (err) {
        log('Error in get_personnel_location:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询人员位置失败 - ${err.message}。建议：确认人员姓名/ID是否正确，或该人员是否已绑定标签。` }], isError: true };
    }
});
//# sourceMappingURL=getPersonnelLocation.js.map