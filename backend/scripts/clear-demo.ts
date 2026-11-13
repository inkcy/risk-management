import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

/**
 * ลบข้อมูลตัวอย่างที่มาจาก db:seed ออกให้หมด เพื่อเริ่มกรอกข้อมูลจริง
 *
 * ไม่แตะ users / sessions / audit_log — บัญชีผู้ใช้และร่องรอยการใช้งานต้องอยู่ต่อ
 * ตาราง units (หน่วยงาน) เก็บไว้เป็นค่าเริ่มต้น ลบด้วยได้โดยส่ง --units
 */
async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('POSTGRES_URL is not set.');
    process.exit(1);
  }

  const alsoUnits = process.argv.includes('--units');
  const useSsl = /sslmode=require/i.test(url) || !/localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: true } : undefined });

  // เรียงตามลำดับ foreign key — ลูกก่อนแม่
  const tables = [
    'rca_timeline',
    'rca_causes',
    'rca_cases',
    'actions',
    'incidents',
    'risk_register',
    'cauti_patients',
    ...(alsoUnits ? ['units'] : []),
  ];

  for (const table of tables) {
    const { rowCount } = await pool.query(`DELETE FROM ${table}`);
    console.log(`  ✓ ${table} — ลบ ${rowCount ?? 0} แถว`);
  }

  console.log('\nล้างข้อมูลตัวอย่างเรียบร้อย พร้อมกรอกข้อมูลจริงแล้ว');
  if (!alsoUnits) console.log('(ตาราง units ยังอยู่ — ถ้าจะลบด้วยให้รัน npm run db:clear-demo -- --units)');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
