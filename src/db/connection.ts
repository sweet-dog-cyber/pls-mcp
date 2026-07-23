import mysql from 'mysql2/promise';
import { appConfig } from '../config/settings.js';

let pool: mysql.Pool | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (pool) return pool;

  pool = mysql.createPool(appConfig.mysql);

  try {
    const conn = await pool.getConnection();
    conn.release();
    if (appConfig.mcp.logLevel === 'debug' || appConfig.mcp.logLevel === 'info') {
      console.error('[PLS-MCP] MySQL connected successfully');
    }
  } catch (err: any) {
    console.error('[PLS-MCP] MySQL connection failed:', err.message);
    pool = null;
    throw err;
  }

  return pool;
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const pool = await getPool();
  const [rows] = await pool.query(sql, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}