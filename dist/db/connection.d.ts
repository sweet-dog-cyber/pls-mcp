import mysql from 'mysql2/promise';
export declare function getPool(): Promise<mysql.Pool>;
export declare function query(sql: string, params?: any[]): Promise<any[]>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map