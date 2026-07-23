import axios, { AxiosInstance } from 'axios';
import { appConfig, log } from '../config/settings.js';

let httpClient: AxiosInstance | null = null;

// ── Bindings cache (30s TTL) ──
let bindingsCache: any[] = [];
let bindingsCacheTime = 0;
const BINDINGS_CACHE_TTL = 30_000;

export interface TagBindingEntry {
  tagCode: string;
  bindName: string;
  bindType: 'personnel' | 'car' | 'goods';
  bindId: number;
}

export function getApiClient(): AxiosInstance {
  if (httpClient) return httpClient;

  httpClient = axios.create({
    baseURL: appConfig.api.baseUrl,
    timeout: appConfig.api.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    proxy: false,
  });

  httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
      log('API error:', error.message);
      return Promise.reject(error);
    }
  );

  return httpClient;
}

/**
 * 带重试的 HTTP 请求。
 * 最多重试 2 次，指数退避（100ms → 200ms → 400ms）
 * 仅对 5xx 和超时错误重试
 */
async function fetchWithRetry(fn: () => Promise<any>, maxRetries = 2): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.response?.status >= 500 ||
        err.code === 'ECONNABORTED' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNREFUSED';
      if (!isRetryable || attempt >= maxRetries) break;
      const delay = 100 * Math.pow(2, attempt);
      log(`Retrying API call (${attempt + 1}/${maxRetries}) after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export async function getMcpRealtime(path: string, params?: Record<string, any>) {
  const client = getApiClient();
  return fetchWithRetry(() =>
    client.get(`/mcp/realtime/${path}`, { params }).then(r => r.data)
  );
}

export async function callRealtimeLocation(tagCode: string) {
  const res = await getMcpRealtime(`location/${tagCode}`);
  if (!res || res.status !== 200) {
    throw new Error(`Failed to get location for ${tagCode}: ${res?.message || 'unknown'}`);
  }
  if (!res.result) {
    throw new Error(`No location data for ${tagCode} (API returned success but no position — tag may have no recent location fix)`);
  }
  return res.result;
}

/**
 * 查询标签绑定关系。统一返回数组格式：{ tagCode, bindName, bindType, bindId }[]
 * 带 30 秒缓存，兼容 Java 端 object 和 array 两种返回格式。
 */
export async function callTagBindings(): Promise<TagBindingEntry[]> {
  // Check cache first
  const now = Date.now();
  if (bindingsCacheTime > 0 && (now - bindingsCacheTime) < BINDINGS_CACHE_TTL) {
    return bindingsCache;
  }

  const res = await getMcpRealtime('bindings');
  if (!res || res.status !== 200) {
    throw new Error(`Failed to get bindings: ${res?.message || 'unknown'}`);
  }

  const raw = res.result;
  let normalized: TagBindingEntry[];

  if (Array.isArray(raw)) {
    normalized = raw.map((item: any) => ({
      tagCode: item.tagCode || item[0],
      bindName: item.bindName || item[1] || '',
      bindType: (item.bindType as 'personnel' | 'car' | 'goods') || ('personnel' as const),
      bindId: item.bindId || 0,
    }));
  } else if (typeof raw === 'object') {
    normalized = Object.entries(raw).map(([tagCode, bindName]) => ({
      tagCode,
      bindName: String(bindName),
      bindType: 'personnel' as const,
      bindId: 0,
    }));
  } else {
    throw new Error(`Unexpected bindings response format: ${typeof raw}`);
  }

  normalized = normalized.filter(b => b.bindName);
  bindingsCache = normalized;
  bindingsCacheTime = now;

  return normalized;
}

/**
 * 清除绑定缓存（在写操作后调用）
 */
export function invalidateBindingsCache() {
  bindingsCache = [];
  bindingsCacheTime = 0;
}

export async function callAreaPersonnel(areaId: number) {
  const res = await getMcpRealtime(`in-area/${areaId}`);
  if (!res || res.status !== 200) {
    throw new Error(`Failed to get personnel in area ${areaId}: ${res?.message || 'unknown'}`);
  }
  if (!res.result) {
    throw new Error(`No personnel data for area ${areaId} (API returned success but no data)`);
  }
  return res.result;
}

export async function callSystemStats() {
  const res = await getMcpRealtime('stats');
  if (!res || res.status !== 200) {
    throw new Error(`Failed to get system stats: ${res?.message || 'unknown'}`);
  }
  if (!res.result) {
    throw new Error(`No system stats data (API returned success but no data)`);
  }
  return res.result;
}

export async function callListTags() {
  const res = await getMcpRealtime('tags');
  if (!res || res.status !== 200) {
    throw new Error(`Failed to get tags: ${res?.message || 'unknown'}`);
  }
  if (!res.result) {
    throw new Error(`No tag data (API returned success but no data)`);
  }
  return res.result;
}

// ── Write operations via McpController /mcp/write/* ──

export interface McpWriteResponse {
  code: number;
  message: string;
  result: any;
}

export async function callMcpWrite(path: string, data?: any): Promise<McpWriteResponse> {
  const client = getApiClient();
  const headers: Record<string, string> = {};
  if (appConfig.api.apiKey) {
    headers['X-MCP-Api-Key'] = appConfig.api.apiKey;
  }
  const result = (await client.post(`/mcp/write/${path}`, data, { headers })).data as McpWriteResponse;
  invalidateBindingsCache();
  return result;
}

// ── External call endpoints ──

export async function callExternal(path: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST', data?: any, params?: any) {
  const client = getApiClient();
  const result = (await client.request({ method, url: `/external/call/${path}`, data, params })).data;
  invalidateBindingsCache();
  return result;
}