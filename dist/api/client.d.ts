import { AxiosInstance } from 'axios';
export interface TagBindingEntry {
    tagCode: string;
    bindName: string;
    bindType: 'personnel' | 'car' | 'goods';
    bindId: number;
}
export declare function getApiClient(): AxiosInstance;
export declare function getMcpRealtime(path: string, params?: Record<string, any>, timeout?: number): Promise<any>;
export declare function callRealtimeLocation(tagCode: string, timeout?: number): Promise<any>;
/**
 * 查询标签绑定关系。统一返回数组格式：{ tagCode, bindName, bindType, bindId }[]
 * A2: 细粒度缓存 — 按 tagCode 存储，60 秒 TTL，写操作只失效关联标签。
 * 兼容 Java 端 object 和 array 两种返回格式。
 */
export declare function callTagBindings(): Promise<TagBindingEntry[]>;
/**
 * A2: 按 tagCode 查询单个绑定关系（优先查缓存）
 */
export declare function callTagBindingByCode(tagCode: string): Promise<TagBindingEntry | null>;
/**
 * A2: 失效指定 tagCode 的缓存（细粒度）
 */
export declare function invalidateBindingByTagCode(tagCode: string): void;
/**
 * A2: 批量失效指定 tagCode 的缓存
 */
export declare function invalidateBindingsByTagCodes(tagCodes: string[]): void;
/**
 * A2: 清除全部绑定缓存（向后兼容，降级方案）
 * 建议优先使用 invalidateBindingByTagCode 细粒度失效
 */
export declare function invalidateBindingsCache(): void;
export declare function callAreaPersonnel(areaId: number, timeout?: number): Promise<any>;
export declare function callSystemStats(timeout?: number): Promise<any>;
/**
 * 获取标签实时位置。
 * @param mapCode 可选 — 按地图编码服务端过滤，减少数据传输量
 * @param timeout 可选 — 请求超时（ms），不传则使用全局默认值
 */
export declare function callListTags(mapCode?: string, timeout?: number): Promise<any>;
export interface McpWriteResponse {
    code: number;
    message: string;
    result: any;
}
export declare function callMcpWrite(path: string, data?: any): Promise<McpWriteResponse>;
export declare function callExternal(path: string, method?: 'POST' | 'PUT' | 'DELETE', data?: any, params?: any): Promise<any>;
//# sourceMappingURL=client.d.ts.map