import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export declare const appConfig: {
    mysql: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        charset: string;
        connectionLimit: number;
        connectTimeout: number;
    };
    api: {
        baseUrl: string;
        timeout: number;
        apiKey: string;
    };
    mcp: {
        logLevel: string;
    };
};
export declare function log(...args: any[]): void;
//# sourceMappingURL=settings.d.ts.map