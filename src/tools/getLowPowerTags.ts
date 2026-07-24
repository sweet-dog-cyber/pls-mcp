import { server, z } from '../server.js';
import { callListTags, callTagBindings } from '../api/client.js';
import { log } from '../config/settings.js';
import { QUERY_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

server.registerTool('get_low_power_tags', {
  title: 'get_low_power_tags',
  description: `【📊 查询】筛选低电量标签，按电量阈值过滤。

参数:
  - threshold: 电量阈值（可选），默认 20，低于此值视为低电
  - mapCode: 地图编码（可选），仅查指定地图

返回: 低电量标签列表，含编码、电量百分比、绑定名称、坐标

提示: threshold 范围 1-99。结合 mapCode 可定位特定区域低电设备。`,
  annotations: QUERY_ANNOTATIONS,
  inputSchema: z.object({
    threshold: z.number().min(1).max(99).default(20).describe('电量阈值（%），默认 20'),
    mapCode: z.string().optional().describe('地图编码，如 "map_001"'),
  }).strict(),
}, async (args) => {
  try {
    const { threshold, mapCode } = args;
    const allTags = await callListTags(mapCode);
    const bindings = await callTagBindings();
    const bindingsMap: Record<string, string> = {};
    bindings.forEach((b: any) => { bindingsMap[b.tagCode] = b.bindName; });

    const lowPower = allTags
      .map((t: any) => ({
        tagCode: t.tagCode,
        power: Number(t.power) || 0,
        bindName: bindingsMap[t.tagCode] || '未绑定',
        x: t.x,
        y: t.y,
        mapCode: t.mapCode,
        mapName: t.mapName,
      }))
      .filter((t: any) => t.power > 0 && t.power <= threshold)
      .sort((a: any, b: any) => a.power - b.power);

    const { text, truncated } = truncateOutput(JSON.stringify({
      total: lowPower.length, threshold, mapCode: mapCode || '全部', lowPowerTags: lowPower,
    }, null, 2));

    return {
      content: [{
        type: 'text',
        text: truncated ? text + '\n\n⚠️ [输出已截断]' : (lowPower.length === 0 ? '✅ 当前无低电量标签（阈值 ≤' + threshold + '%）' : text),
      }],
    };
  } catch (err: any) {
    log('Error in get_low_power_tags:', err.message);
    return { content: [{ type: 'text', text: `Error: 筛选低电量标签失败 - ${err.message}` }], isError: true };
  }
});