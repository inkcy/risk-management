import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('POSTGRES_URL is not set.');
    process.exit(1);
  }

  const useSsl = /sslmode=require/i.test(url) || !/localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: true } : undefined });

  const here = dirname(fileURLToPath(import.meta.url));
  const sqlText = readFileSync(resolve(here, '..', 'migrations', '002_seed.sql'), 'utf8');
  await pool.query(sqlText);
  console.log('Seed data inserted.');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
