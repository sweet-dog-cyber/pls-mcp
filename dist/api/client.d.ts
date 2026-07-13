import { AxiosInstance } from 'axios';
export declare function getApiClient(): AxiosInstance;
export declare function getMcpRealtime(path: string, params?: Record<string, any>): Promise<any>;
export declare function callRealtimeLocation(tagCode: string): Promise<any>;
export declare function callTagBindings(): Promise<any>;
export declare function callAreaPersonnel(areaId: number): Promise<any>;
export declare function callSystemStats(): Promise<any>;
export declare function callListTags(): Promise<any>;
export interface McpWriteResponse {
    code: number;
    message: string;
    result: boolean;
}
export declare function callMcpWrite(path: string, data?: any): Promise<McpWriteResponse>;
export declare function callExternal(path: string, method?: 'POST' | 'PUT' | 'DELETE', data?: any, params?: any): Promise<any>;
//# sourceMappingURL=client.d.ts.map