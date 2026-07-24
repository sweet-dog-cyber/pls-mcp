import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { collectMetrics, initMetrics, flushMetrics } from './utils/metrics.js';

export const server = new McpServer({ name: 'pls-mcp', version: '1.0.0' });

// ── M1: 初始化持久化指标 ──
initMetrics();

export { flushMetrics };

// ── O3: Patch registerTool to collect performance metrics ──
{ 
  const _orig = server.registerTool.bind(server) as (...args: any[]) => any;
  (server as any).registerTool = (name: string, ...rest: any[]) => {
    if (rest.length === 2) {
      rest[1] = collectMetrics(name, rest[1]);
    }
    return _orig(name, ...rest);
  };
}
export { z };

export async function registerAllTools() {
  await import('./tools/listTags.js');
  await import('./tools/getTagLocation.js');
  await import('./tools/listPersonnel.js');
  await import('./tools/getPersonnelLocation.js');
  await import('./tools/getTagBindings.js');
  await import('./tools/listAreas.js');
  await import('./tools/getAreaPersonnel.js');
  await import('./tools/listAlarms.js');
  await import('./tools/getSystemStats.js');
  await import('./tools/getInOutRecords.js');
  await import('./tools/listAnchors.js');
  await import('./tools/listMaps.js');
  await import('./tools/listRealtimeMap.js');
  await import('./tools/getTrajectory.js');
  await import('./tools/listCars.js');
  await import('./tools/listGoods.js');
  await import('./tools/listAlarmRules.js');
  await import('./tools/listAreaRules.js');
  await import('./tools/listDepartments.js');
  await import('./tools/external.js');
  await import('./tools/write.js');
  await import('./tools/crud.js');
  await import('./tools/healthCheck.js');
  await import('./tools/getBatchTagLocations.js');
  // Phase 4: 新增工具
  await import('./tools/getLowPowerTags.js');
  await import('./tools/searchPersonnel.js');
  await import('./tools/alarmTools.js');
}

export function registerAllResources() {
  registerResources(server);
}

export function registerAllPrompts() {
  registerPrompts(server);
}

export { collectMetrics } from './utils/metrics.js';