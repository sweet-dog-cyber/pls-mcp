import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { flushMetrics } from './utils/metrics.js';
export declare const server: McpServer;
export { flushMetrics };
export { z };
export declare function registerAllTools(): Promise<void>;
export declare function registerAllResources(): void;
export declare function registerAllPrompts(): void;
export { collectMetrics } from './utils/metrics.js';
//# sourceMappingURL=server.d.ts.map