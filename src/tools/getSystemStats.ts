import { server, z } from '../server.js';
import { callSystemStats } from '../api/client.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';

server.registerTool('get_system_stats', {
  title: 'get_system_stats',
  description: `获取系统统计概览。

返回: 标签总数/在线/离线、人员总数/在场/外出、区域数、基站在线/离线、今日告警数

无需参数，适合快速了解系统整体状态`,
  annotations: READ_ONLY_ANNOTATIONS,
  inputSchema: z.object({}).strict(),
}, async () => {
  try {
    const stats = await callSystemStats();
    return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
  } catch (err: any) {
    log('Error in get_system_stats:', err.message);
    return { content: [{ type: 'text', text: `Error: 获取系统统计失败 - ${err.message}。建议：检查Java API是否可用。` }], isError: true };
  }
});