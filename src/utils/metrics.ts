// ── M1: Persistent tool call metrics collector ──
// 指标持久化到 data/metrics.json，跨请求/重启累积统计

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const METRICS_FILE = join(DATA_DIR, 'metrics.json');

interface MetricEntry {
  tool: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface MetricsStore {
  entries: MetricEntry[];
  totalCalls: number;
  totalErrors: number;
  startedAt: string;
  lastFlush: string;
}

const MAX_ENTRIES = 10000;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const FLUSH_INTERVAL = 2000; // 2 秒刷盘一次
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 小时

// ── 在内存副本 ──
let store: MetricsStore;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 从文件加载指标（服务启动时调用）
 */
function loadStore(): MetricsStore {
  if (existsSync(METRICS_FILE)) {
    try {
      const raw = readFileSync(METRICS_FILE, 'utf-8');
      if (raw.length > MAX_FILE_SIZE) {
        // 文件过大，只保留最近一半
        const data = JSON.parse(raw);
        const keep = Math.floor(MAX_ENTRIES / 2);
        data.entries = data.entries.slice(-keep);
        data.totalCalls = data.entries.length;
        data.totalErrors = data.entries.filter((e: MetricEntry) => !e.success).length;
        return data;
      }
      return JSON.parse(raw) as MetricsStore;
    } catch {
      // 解析失败，创建新的
    }
  }
  return defaultStore();
}

function defaultStore(): MetricsStore {
  return {
    entries: [],
    totalCalls: 0,
    totalErrors: 0,
    startedAt: new Date().toISOString(),
    lastFlush: '',
  };
}

/**
 * 初始化（服务启动时调用一次）
 */
export function initMetrics() {
  // 确保 data 目录存在
  if (!existsSync(DATA_DIR)) {
    try { mkdirSync(DATA_DIR, { recursive: true }); } catch { /* 忽略 */ }
  }
  store = loadStore();
  // 启动时清理超过 24 小时的旧数据
  cleanupOldEntries();
}

/**
 * 清理超过 24 小时的旧条目
 */
function cleanupOldEntries() {
  const cutoff = Date.now() - CLEANUP_AGE_MS;
  const cutoffTs = new Date(cutoff).toISOString();
  const before = store.entries.length;
  store.entries = store.entries.filter(e => e.timestamp >= cutoffTs);
  if (before !== store.entries.length) {
    store.totalCalls = store.entries.length;
    store.totalErrors = store.entries.filter(e => !e.success).length;
    scheduleFlush();
  }
}

/**
 * 异步刷盘（节流：每 2 秒最多一次）
 */
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushStore();
  }, FLUSH_INTERVAL);
}

function flushStore() {
  try {
    // 确保目录存在（启动时可能不存在）
    if (!existsSync(DATA_DIR)) {
      try { mkdirSync(DATA_DIR, { recursive: true }); } catch { return; }
    }
    const json = JSON.stringify(store, null, 0); // compact
    if (json.length > MAX_FILE_SIZE) {
      // 文件过大时，丢弃最旧的 1/3
      const drop = Math.floor(store.entries.length / 3);
      store.entries = store.entries.slice(drop);
    }
    store.lastFlush = new Date().toISOString();
    writeFileSync(METRICS_FILE, JSON.stringify(store, null, 2));
  } catch {
    // 刷盘失败不影响工具调用，静默忽略
  }
}

/**
 * 强制立即刷盘（服务关闭时调用）
 */
export function flushMetrics() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushStore();
}

/**
 * 收集一个工具调用指标（供 server.ts 的 registerTool patch 使用）
 */
export function collectMetrics(
  toolName: string,
  fn: (...args: any[]) => Promise<any>,
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
      store.entries.push(entry);
      store.totalCalls++;
      if (!success) store.totalErrors++;
      // 滚动窗口：保留最近 MAX_ENTRIES 条
      if (store.entries.length > MAX_ENTRIES) {
        const drop = store.entries.length - MAX_ENTRIES;
        store.entries = store.entries.slice(drop);
        store.totalCalls = store.entries.length;
        store.totalErrors = store.entries.filter(e => !e.success).length;
      }
      scheduleFlush();
    }
  };
}

export interface MetricsSummary {
  totalCalls: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  errorCount: number;
  errorRate: number;
  topTools: { tool: string; calls: number; avgDuration: number }[];
  lastCalls: MetricEntry[];
  persisted: boolean;
  lastFlush: string;
}

/**
 * 获取指标汇总（从持久化数据读取）
 */
export function getMetricsSummary(): MetricsSummary {
  const entries = store.entries;
  const durations = entries.map(e => e.duration);
  const errorEntries = entries.filter(e => !e.success);

  const toolMap = new Map<string, { total: number; count: number }>();
  entries.forEach(e => {
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
    totalCalls: entries.length,
    avgDuration: durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100 : 0,
    maxDuration: durations.length > 0 ? Math.round(Math.max(...durations) * 100) / 100 : 0,
    minDuration: durations.length > 0 ? Math.round(Math.min(...durations) * 100) / 100 : 0,
    errorCount: errorEntries.length,
    errorRate: entries.length > 0 ? Math.round((errorEntries.length / entries.length) * 10000) / 100 : 0,
    topTools,
    lastCalls: entries.slice(-10),
    persisted: true,
    lastFlush: store.lastFlush,
  };
}

/**
 * 重置指标（清空持久化文件）
 */
export function resetMetrics() {
  store = defaultStore();
  try {
    if (existsSync(DATA_DIR)) {
      writeFileSync(METRICS_FILE, JSON.stringify(store, null, 2));
    }
  } catch {
    // 忽略
  }
}