import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { callRealtimeLocation } from '../api/client.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('get_personnel_location', {
  title: 'get_personnel_location',
  description: `【📊 查询】按人员姓名或ID查询实时位置。

参数:
  - nameOrId: 人员姓名或ID（必填），如 "张三" 或 "1001"

返回: 人员实时位置信息，含姓名、坐标、地图、区域

提示: 内部使用 Promise.all 并行查询多人位置。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    nameOrId: z.string().describe('人员姓名或ID，如 "张三" 或 "1001"'),
  }).strict(),
}, async (args) => {
  try {
    const { nameOrId } = args;
    let personnel: any[] = [];
    if (/^\d+$/.test(nameOrId)) {
      personnel = await query(`SELECT id, name, tag_code FROM personnel_information WHERE id = ?`, [nameOrId]);
    } else {
      personnel = await query(`SELECT id, name, tag_code FROM personnel_information WHERE name LIKE ?`, [`%${nameOrId}%`]);
    }
    if (personnel.length === 0) return { content: [{ type: 'text', text: `未找到人员 "${nameOrId}"` }] };
    const results = await Promise.all(personnel.map(async (p) => {
      if (!p.tag_code) {
        return { name: p.name, tagCode: null, message: '未绑定标签' };
      }
      try {
        const location = await callRealtimeLocation(p.tag_code);
        return {
          name: p.name, tagCode: p.tag_code, x: location.x, y: location.y,
          mapCode: location.mapCode, mapName: location.mapName,
          timestamp: location.timestamp, areaName: location.areaName,
        };
      } catch (e: any) {
        return { name: p.name, tagCode: p.tag_code, message: `位置查询失败: ${e.message}` };
      }
    }));
    const { text, truncated } = truncateOutput(JSON.stringify(results, null, 2));
    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断]' : text,
      }],
    };
  } catch (err: any) {
    log('Error in get_personnel_location:', err.message);
    return { content: [{ type: 'text', text: `Error: 查询人员位置失败 - ${err.message}。建议：确认人员姓名/ID是否正确，或该人员是否已绑定标签。` }], isError: true };
  }
});