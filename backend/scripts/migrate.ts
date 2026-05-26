import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('POSTGRES_URL is not set. Copy .env.example to .env and fill in the credentials.');
    process.exit(1);
  }

  const useSsl = /sslmode=require/i.test(url) || !/localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : undefined });

  const here = dirname(fileURLToPath(import.meta.url));
  const dir = resolve(here, '..', 'migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql') && !f.includes('seed')).sort();

  for (const file of files) {
    console.log(`Running ${file}...`);
    const sqlText = readFileSync(join(dir, file), 'utf8');
    await pool.query(sqlText);
    console.log(`  ✓ ${file} done`);
  }

  console.log('\nAll migrations completed.');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
