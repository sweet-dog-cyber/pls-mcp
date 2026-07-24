import axios from 'axios';
import { appConfig, log } from '../config/settings.js';
let httpClient = null;
const bindingsCache = new Map();
const BINDINGS_CACHE_TTL = 60_000;
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
    if (!res || res.code !== 200) {
        throw new Error(`Failed to get location for ${tagCode}: ${res?.message || 'unknown'}`);
    }
    if (!res.result) {
        throw new Error(`No location data for ${tagCode} (API returned success but no position — tag may have no recent location fix)`);
    }
    return res.result;
}
/**
 * 查询标签绑定关系。统一返回数组格式：{ tagCode, bindName, bindType, bindId }[]
 * A2: 细粒度缓存 — 按 tagCode 存储，60 秒 TTL，写操作只失效关联标签。
 * 兼容 Java 端 object 和 array 两种返回格式。
 */
export async function callTagBindings() {
    const now = Date.now();
    // A2: 清理过期条目
    for (const [tagCode, cached] of bindingsCache) {
        if (cached.expireAt < now)
            bindingsCache.delete(tagCode);
    }
    // A2: 缓存为空则全量拉取
    if (bindingsCache.size === 0) {
        const fresh = await fetchAllBindings();
        for (const entry of fresh) {
            bindingsCache.set(entry.tagCode, { entry, expireAt: now + BINDINGS_CACHE_TTL });
        }
    }
    return Array.from(bindingsCache.values()).map(c => c.entry);
}
/**
 * 拉取全部绑定关系（内部函数）
 * J1 P1: Java 端已改为统一数组格式，无需再兼容 object 格式
 */
async function fetchAllBindings() {
    const res = await getMcpRealtime('bindings');
    if (!res || res.code !== 200) {
        throw new Error(`Failed to get bindings: ${res?.message || 'unknown'}`);
    }
    const raw = res.result;
    if (!Array.isArray(raw)) {
        throw new Error(`Unexpected bindings response format: ${typeof raw} (expected array)`);
    }
    return raw.map((item) => ({
        tagCode: item.tagCode,
        bindName: item.bindName || '',
        bindType: item.bindType || 'personnel',
        bindId: item.bindId || 0,
    })).filter(b => b.bindName);
}
/**
 * A2: 按 tagCode 查询单个绑定关系（优先查缓存）
 */
export async function callTagBindingByCode(tagCode) {
    const cached = bindingsCache.get(tagCode);
    if (cached && cached.expireAt > Date.now())
        return cached.entry;
    // 未命中则全量拉取并更新缓存
    await callTagBindings();
    return bindingsCache.get(tagCode)?.entry ?? null;
}
/**
 * A2: 失效指定 tagCode 的缓存（细粒度）
 */
export function invalidateBindingByTagCode(tagCode) {
    bindingsCache.delete(tagCode);
}
/**
 * A2: 批量失效指定 tagCode 的缓存
 */
export function invalidateBindingsByTagCodes(tagCodes) {
    for (const tagCode of tagCodes) {
        bindingsCache.delete(tagCode);
    }
}
/**
 * A2: 清除全部绑定缓存（向后兼容，降级方案）
 * 建议优先使用 invalidateBindingByTagCode 细粒度失效
 */
export function invalidateBindingsCache() {
    bindingsCache.clear();
}
export async function callAreaPersonnel(areaId, timeout) {
    const res = await getMcpRealtime(`in-area/${areaId}`, undefined, timeout);
    if (!res || res.code !== 200) {
        throw new Error(`Failed to get personnel in area ${areaId}: ${res?.message || 'unknown'}`);
    }
    if (!res.result) {
        throw new Error(`No personnel data for area ${areaId} (API returned success but no data)`);
    }
    return res.result;
}
export async function callSystemStats(timeout) {
    const res = await getMcpRealtime('stats', undefined, timeout);
    if (!res || res.code !== 200) {
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
    if (!res || res.code !== 200) {
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
    // A2: 细粒度缓存失效
    const pathParts = path.split('/');
    const action = pathParts[0]; // bind | unbind | tag | person | ...
    if (action === 'bind' && data?.tagId) {
        invalidateBindingByTagCode(String(data.tagId));
    }
    else if (action === 'unbind' && data?.tagId) {
        invalidateBindingByTagCode(String(data.tagId));
    }
    else if (pathParts[0] === 'tag' && pathParts[1] === 'delete' && Array.isArray(data?.ids)) {
        // 删除标签时失效全部缓存（无法知道哪些标签被删除）
        invalidateBindingsCache();
    }
    else {
        invalidateBindingsCache();
    }
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