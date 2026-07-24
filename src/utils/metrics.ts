// ── Tool call performance metrics collector ──

interface MetricEntry {
  tool: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

const recentCalls: MetricEntry[] = [];
const MAX_HISTORY = 1000;

export interface MetricsSummary {
  totalCalls: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  errorCount: number;
  errorRate: number;
  topTools: { tool: string; calls: number; avgDuration: number }[];
  lastCalls: MetricEntry[];
}

export function collectMetrics(
  toolName: string,
  fn: (...args: any[]) => Promise<any>
): (...args: any[]) => Promise<any> {
  return async (...args: any[]) => {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;
    try {
      const result = await fn(...args);
      return result;
    } catch (err: any) {
      success = false;
      error = err.message;
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      const entry: MetricEntry = {
        tool: toolName,
        duration: Math.round(duration * 100) / 100,
        success,
        error,
        timestamp: new Date().toISOString(),
      };
      recentCalls.push(entry);
      if (recentCalls.length > MAX_HISTORY) {
        recentCalls.shift();
      }
    }
  };
}

export function getMetricsSummary(): MetricsSummary {
  const durations = recentCalls.map(e => e.duration);
  const errorEntries = recentCalls.filter(e => !e.success);

  // Top tools by call count
  const toolMap = new Map<string, { total: number; count: number }>();
  recentCalls.forEach(e => {
    const existing = toolMap.get(e.tool);
    if (existing) {
      existing.total += e.duration;
      existing.count++;
    } else {
      toolMap.set(e.tool, { total: e.duration, count: 1 });
    }
  });
  const topTools = Array.from(toolMap.entries())
    .map(([tool, { total, count }]) => ({
      tool,
      calls: count,
      avgDuration: Math.round((total / count) * 100) / 100,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);

  return {
    totalCalls: recentCalls.length,
    avgDuration: durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100 : 0,
    maxDuration: durations.length > 0 ? Math.round(Math.max(...durations) * 100) / 100 : 0,
    minDuration: durations.length > 0 ? Math.round(Math.min(...durations) * 100) / 100 : 0,
    errorCount: errorEntries.length,
    errorRate: recentCalls.length > 0 ? Math.round((errorEntries.length / recentCalls.length) * 10000) / 100 : 0,
    topTools,
    lastCalls: recentCalls.slice(-10),
  };
}

export function resetMetrics() {
  recentCalls.length = 0;
}