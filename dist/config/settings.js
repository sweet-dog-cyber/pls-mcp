import * as dotenv from 'dotenv';
dotenv.config();
export const appConfig = {
    mysql: {
        host: process.env.PLS_MYSQL_HOST || '192.168.10.221',
        port: parseInt(process.env.PLS_MYSQL_PORT || '3306'),
        user: process.env.PLS_MYSQL_USER || 'root',
        password: process.env.PLS_MYSQL_PASSWORD || 'root',
        database: process.env.PLS_MYSQL_DATABASE || 'ishz_pls_six_zhongchechangjiang',
        charset: 'utf8mb4',
        connectionLimit: 10,
        connectTimeout: 10000,
    },
    api: {
        baseUrl: process.env.PLS_API_BASE_URL || 'http://192.168.10.231:8180/pls',
        timeout: 10000,
        apiKey: process.env.PLS_MCP_API_KEY || '',
    },
    mcp: {
        logLevel: process.env.MCP_LOG_LEVEL || 'info',
    },
};
export function log(...args) {
    if (appConfig.mcp.logLevel === 'debug' || appConfig.mcp.logLevel === 'info') {
        console.error('[PLS-MCP]', ...args);
    }
}
//# sourceMappingURL=settings.js.map