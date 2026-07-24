import axios from 'axios';
import { appConfig, log } from '../config/settings.js';
let httpClient = null;
// ── Bindings cache (30s TTL) ──
let bindingsCache = [];
let bindingsCacheTime = 0;
const BINDINGS_CACHE_TTL = 30_000;
export function getApiClient() {
    if (httpClient)
        return httpClient;
    httpClient = axios.create({
        baseURL: appConfig.api.baseUrl,
        timeout: appConfig.api.timeout,
        headers: {
            'Content-Type': 'application/json',
        },
        proxy: false,
    });
    httpClient.interceptors.response.use((response) => response, (error) => {
        log('API error:', error.message);
        return Promise.reject(error);
    });
    return httpClient;
}
/**
 * 带重试的 HTTP 请求。
 * 最多重试 2 次，指数退避（100ms → 200ms → 400ms）
 * 仅对 5xx 和超时错误重试
 */
async function fetchWithRetry(fn, maxRetries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            const isRetryable = err.response?.status >= 500 ||
                err.code === 'ECONNABORTED' ||
                err.code === 'ECONNRESET' ||
                err.code === 'ETIMEDOUT' ||
                err.code === 'ECONNREFUSED';
            if (!isRetryable || attempt >= maxRetries)
                break;
            const delay = 100 * Math.pow(2, attempt);
            log(`Retrying API call (${attempt + 1}/${maxRetries}) after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}
export async function getMcpRealtime(path, params, timeout) {
    const client = getApiClient();
    return fetchWithRetry(() => client.get(`/mcp/realtime/${path}`, { params, timeout }).then(r => r.data));
}
export async function callRealtimeLocation(tagCode, timeout) {
    const res = await getMcpRealtime(`location/${tagCode}`, undefined, timeout);
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
export async function callTagBindings() {
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
    let normalized;
    if (Array.isArray(raw)) {
        normalized = raw.map((item) => ({
            tagCode: item.tagCode || item[0],
            bindName: item.bindName || item[1] || '',
            bindType: item.bindType || 'personnel',
            bindId: item.bindId || 0,
        }));
    }
    else if (typeof raw === 'object') {
        normalized = Object.entries(raw).map(([tagCode, bindName]) => ({
            tagCode,
            bindName: String(bindName),
            bindType: 'personnel',
            bindId: 0,
        }));
    }
    else {
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
export async function callAreaPersonnel(areaId, timeout) {
    const res = await getMcpRealtime(`in-area/${areaId}`, undefined, timeout);
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get personnel in area ${areaId}: ${res?.message || 'unknown'}`);
    }
    if (!res.result) {
        throw new Error(`No personnel data for area ${areaId} (API returned success but no data)`);
    }
    return res.result;
}
export async function callSystemStats(timeout) {
    const res = await getMcpRealtime('stats', undefined, timeout);
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get system stats: ${res?.message || 'unknown'}`);
    }
    if (!res.result) {
        throw new Error(`No system stats data (API returned success but no data)`);
    }
    return res.result;
}
/**
 * 获取标签实时位置。
 * @param mapCode 可选 — 按地图编码服务端过滤，减少数据传输量
 * @param timeout 可选 — 请求超时（ms），不传则使用全局默认值
 */
export async function callListTags(mapCode, timeout) {
    const params = mapCode ? { mapCode } : undefined;
    const res = await getMcpRealtime('tags', params, timeout);
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get tags: ${res?.message || 'unknown'}`);
    }
    if (!res.result) {
        throw new Error(`No tag data (API returned success but no data)`);
    }
    return res.result;
}
export async function callMcpWrite(path, data) {
    const client = getApiClient();
    const headers = {};
    if (appConfig.api.apiKey) {
        headers['X-MCP-Api-Key'] = appConfig.api.apiKey;
    }
    const result = (await client.post(`/mcp/write/${path}`, data, { headers })).data;
    invalidateBindingsCache();
    return result;
}
// ── External call endpoints ──
export async function callExternal(path, method = 'POST', data, params) {
    const client = getApiClient();
    const result = (await client.request({ method, url: `/external/call/${path}`, data, params })).data;
    invalidateBindingsCache();
    return result;
}
//# sourceMappingURL=client.js.map