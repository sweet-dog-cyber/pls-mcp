import * as dotenv from 'dotenv';
dotenv.config();
export const appConfig = {
    mysql: {
        host: process.env.PLS_MYSQL_HOST || '192.168.10.221',
        port: parseInt(process.env.PLS_MYSQL_PORT || '3306'),
        user: process.env.PLS_MYSQL_USER || '',
        password: process.env.PLS_MYSQL_PASSWORD || '',
        database: process.env.PLS_MYSQL_DATABASE || '',
        charset: 'utf8mb4',
        connectionLimit: 10,
        connectTimeout: 10000,
    },
    api: {
        baseUrl: process.env.PLS_API_BASE_URL || 'http://127.0.0.1:8180/pls',
        timeout: 10000,
        apiKey: process.env.PLS_MCP_API_KEY || '',
    },
    mcp: {
        logLevel: process.env.MCP_LOG_LEVEL || 'info',
    },
};
// Validate required config
function validateConfig() {
    const missing = [];
    if (!appConfig.mysql.user)
        missing.push('PLS_MYSQL_USER');
    if (!appConfig.mysql.password)
        missing.push('PLS_MYSQL_PASSWORD');
    if (!appConfig.mysql.database)
        missing.push('PLS_MYSQL_DATABASE');
    if (missing.length > 0) {
        console.error('[PLS-MCP] Missing required environment variables: ' + missing.join(', '));
        console.error('[PLS-MCP] Please configure them in .env file or export them.');
        console.error('[PLS-MCP] See .env.example for reference.');
        throw new Error('Missing required environment variables: ' + missing.join(', '));
    }
}
validateConfig();
export function log(...args) {
    if (appConfig.mcp.logLevel === 'debug' || appConfig.mcp.logLevel === 'info') {
        console.error('[PLS-MCP]', ...args);
    }
}
//# sourceMappingURL=settings.js.map