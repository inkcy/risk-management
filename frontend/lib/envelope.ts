import type { Envelope } from './types';
import { dbConfigured } from './db';

/**
 * ห่อผลการ query ให้หน้าเว็บใช้
 *
 * ข้อมูลตัวอย่างจะถูกใช้ก็ต่อเมื่อ "ยังไม่ได้ตั้ง POSTGRES_URL" เท่านั้น
 * ถ้าต่อฐานข้อมูลแล้วแต่ query พัง จะคืนค่าว่างพร้อม error ไม่สลับไปโชว์ข้อมูลตัวอย่าง —
 * ระบบนี้มีข้อมูลผู้ป่วยจริง การเอาข้อมูลปลอมมาแสดงแทนโดยไม่บอกอันตรายกว่าการไม่แสดงอะไรเลย
 */
export async function envelope<T>(
  loader: () => Promise<T>,
  demoData: T,
  emptyData: T,
): Promise<Envelope<T>> {
  if (!dbConfigured()) {
    return { data: demoData, demo: true, error: 'POSTGRES_URL is not set — showing demo data' };
  }
  try {
    const data = await loader();
    return { data, demo: false, error: null };
  } catch (err) {
    console.error('DB query failed:', err);
    return { data: emptyData, demo: false, error: String(err) };
  }
}
