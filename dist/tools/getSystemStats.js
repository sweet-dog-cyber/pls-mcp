import { server, z } from '../server.js';
import { callSystemStats } from '../api/client.js';
import { log } from '../config/settings.js';
import { DIAGNOSE_ANNOTATIONS } from '../constants.js';
server.registerTool('get_system_stats', {
    title: 'get_system_stats',
    description: `【🔍 诊断】获取系统统计概览。

参数: 无需参数。

返回: 标签总数/在线/离线、人员总数/在场/外出、区域数、基站在线/离线、今日告警数

提示: 适合快速了解系统整体状态。调用 Java API，有重试保护。`,
    annotations: DIAGNOSE_ANNOTATIONS,
    inputSchema: z.object({}).strict(),
}, async () => {
    try {
        const stats = await callSystemStats();
        return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }
    catch (err) {
        log('Error in get_system_stats:', err.message);
        return { content: [{ type: 'text', text: `Error: 获取系统统计失败 - ${err.message}。建议：检查Java API是否可用。` }], isError: true };
    }
});
//# sourceMappingURL=getSystemStats.js.map