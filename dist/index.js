#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server, registerAllTools, registerAllResources, registerAllPrompts } from './server.js';
import { log } from './config/settings.js';
import { getPool, closePool } from './db/connection.js';
try {
    await getPool();
    log('MySQL connected successfully');
}
catch (err) {
    log(`MySQL connection warning: ${err.message}`);
    log('Some tools will not work without MySQL. Starting in partial mode...');
}
await registerAllTools();
log('60 tools registered');
registerAllResources();
registerAllPrompts();
const transport = new StdioServerTransport();
await server.connect(transport);
log('PLS MCP Server started (STDIO mode)');
process.on('SIGINT', async () => {
    log('Shutting down...');
    await closePool();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    log('Shutting down...');
    await closePool();
    process.exit(0);
});
//# sourceMappingURL=index.js.map