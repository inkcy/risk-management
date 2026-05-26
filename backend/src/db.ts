import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function dbConfigured(): boolean {
  return !!process.env.POSTGRES_URL;
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error('POSTGRES_URL is not set');
    const useSsl = /sslmode=require/i.test(url) || !/localhost|127\.0\.0\.1/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as never[]);
}
