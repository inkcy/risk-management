import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { hashUnitPassword } from '@/lib/riskUnitAuth';
import { ensureSupervisorCredentials } from '@/lib/supervisorCredentials';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = Number(body.unit_id);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!Number.isSafeInteger(id) || id < 1 || password.length < 7 || password.length > 128 || password.trim() !== password || password === 'QSMH') return NextResponse.json({ error: 'รหัสหัวหน้าต้องมี 7–128 ตัวอักษรและไม่ใช่รหัสกลาง' }, { status: 400 });
    await ensureSupervisorCredentials();
    const passwordHash = await hashUnitPassword(password);
    const client = await getPool().connect();
    try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO risk_unit_supervisors (unit_id,password_hash)
      SELECT id,$2 FROM risk_units WHERE id=$1 AND active AND lower(trim(name)) <> 'admin'
      ON CONFLICT (unit_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,updated_at=now() RETURNING unit_id`, [id, passwordHash]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ไม่พบหน่วยงาน' }, { status: 404 }); }
    await client.query('DELETE FROM risk_unit_sessions WHERE user_id IN (SELECT id FROM users WHERE email=$1)', [`supervisor-${id}@units.invalid`]);
    await client.query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=$1)', [`supervisor-${id}@units.invalid`]);
    await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    await audit(auth.user, 'risk_unit.supervisor_password', 'risk_unit', id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('supervisor setup failed', error);
    return NextResponse.json({ error: 'ตั้งรหัสหัวหน้าไม่สำเร็จ' }, { status: 500 });
  }
}
