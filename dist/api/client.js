import axios from 'axios';
import { appConfig, log } from '../config/settings.js';
let httpClient = null;
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
export async function getMcpRealtime(path, params) {
    const client = getApiClient();
    const response = await client.get(`/mcp/realtime/${path}`, { params });
    return response.data;
}
export async function callRealtimeLocation(tagCode) {
    const res = await getMcpRealtime(`location/${tagCode}`);
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get location for ${tagCode}: ${res?.message || 'unknown'}`);
    }
    return res.result;
}
export async function callTagBindings() {
    const res = await getMcpRealtime('bindings');
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get bindings: ${res?.message || 'unknown'}`);
    }
    return res.result;
}
export async function callAreaPersonnel(areaId) {
    const res = await getMcpRealtime(`in-area/${areaId}`);
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get personnel in area ${areaId}: ${res?.message || 'unknown'}`);
    }
    return res.result;
}
export async function callSystemStats() {
    const res = await getMcpRealtime('stats');
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get system stats: ${res?.message || 'unknown'}`);
    }
    return res.result;
}
export async function callListTags() {
    const res = await getMcpRealtime('tags');
    if (!res || res.status !== 200) {
        throw new Error(`Failed to get tags: ${res?.message || 'unknown'}`);
    }
    return res.result;
}
export async function callMcpWrite(path, data) {
    const client = getApiClient();
    const headers = {};
    if (appConfig.api.apiKey) {
        headers['X-MCP-Api-Key'] = appConfig.api.apiKey;
    }
    const response = await client.post(`/mcp/write/${path}`, data, { headers });
    return response.data;
}
// ── External call endpoints (no auth, bypass security filter) ──
export async function callExternal(path, method = 'POST', data, params) {
    const client = getApiClient();
    const response = await client.request({ method, url: `/external/call/${path}`, data, params });
    return response.data;
}
//# sourceMappingURL=client.js.map