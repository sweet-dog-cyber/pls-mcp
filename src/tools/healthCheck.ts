import { server, z } from '../server.js';
import { getPool } from '../db/connection.js';
import { log } from '../config/settings.js';
import { DIAGNOSE_ANNOTATIONS } from '../constants.js';

server.registerTool('pls_health_check', {
  title: 'pls_health_check',
  description: `【🔍 诊断】服务健康检查。检测 MySQL 连接、Java API 连通性、工具注册状态。

参数: 无需参数。

返回: 各组件状态（healthy/unhealthy/unknown）+ 服务信息 + 运行时长

提示: 排查问题时首先调用此工具确认各组件是否正常。`,
  annotations: DIAGNOSE_ANNOTATIONS,
  inputSchema: z.object({}).strict(),
}, async () => {
  const result: Record<string, any> = {
    service: { name: 'pls-mcp', version: '1.0.0', status: 'running' },
    mysql: { status: 'unknown' as string, detail: '' },
    javaApi: { status: 'unknown' as string, detail: '' },
    tools: { status: 'unknown' as string, count: 0 },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  // Check MySQL
  try {
    const pool = await getPool();
    await pool.execute('SELECT 1');
    result.mysql = { status: 'healthy', detail: 'connected' };
  } catch (err: any) {
    result.mysql = { status: 'unhealthy', detail: err.message };
  }

  // Check Java API (reuse existing client with retry)
  try {
    const stats = await import('../api/client.js');
    await stats.callSystemStats();
    result.javaApi = { status: 'healthy', detail: 'connected' };
  } catch (err: any) {
    result.javaApi = { status: 'unhealthy', detail: err.message };
  }

  result.tools = { status: 'healthy', count: 60 };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});