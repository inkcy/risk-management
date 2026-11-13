import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | undefined;

/** Neon ผ่าน Vercel Marketplace ฉีดตัวแปรมาในชื่อ DATABASE_URL — รับทั้งสองชื่อ */
export function databaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

export function dbConfigured(): boolean {
  return !!databaseUrl();
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url = databaseUrl();
    if (!url) throw new Error('POSTGRES_URL (หรือ DATABASE_URL) is not set');
    const useSsl = /sslmode=require/i.test(url) || !/localhost|127\.0\.0\.1/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: useSsl ? { rejectUnauthorized: true } : undefined,
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      query_timeout: 20_000,
    });

    // pg จะ emit error จาก idle client นอก promise ของ query ถ้าเครือข่าย/Neon ตัดการเชื่อมต่อ
    // ต้องมี listener เสมอ ไม่เช่นนั้น Node มองเป็น uncaught exception และกระทบทุกหน้า
    pool.on('error', err => {
      console.error('idle database connection failed:', err);
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
