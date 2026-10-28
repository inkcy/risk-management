import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { hashUnitPassword } from '@/lib/riskUnitAuth';
import { riskUnitDirectory } from '@/lib/riskUnitDirectory';

export async function GET() {
  const auth = await requireRole('admin'); if (!auth.ok) return auth.response;
  const { rows } = await query('SELECT id, name, username, active FROM risk_units ORDER BY name');
  return NextResponse.json({ units: rows });
}
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin'); if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!riskUnitDirectory.some(unit => unit === name) || !/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 12 || password.length > 128) return NextResponse.json({ error: 'กรุณาเลือกหน่วยงาน ชื่อผู้ใช้ต้องเป็น a-z, 0-9 หรือ ._- และรหัสผ่านต้องมี 12–128 ตัวอักษร' }, { status: 400 });
    const { rows } = await query<{ id: number }>('INSERT INTO risk_units (name, username, password_hash) VALUES ($1,$2,$3) RETURNING id', [name, username, await hashUnitPassword(password)]);
    await audit(auth.user, 'risk_unit.create', 'risk_unit', rows[0].id, { name, username });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') return NextResponse.json({ error: 'ชื่อหน่วยงานหรือชื่อผู้ใช้นี้มีอยู่แล้ว' }, { status: 409 });
    console.error('risk unit create failed:', err); return NextResponse.json({ error: 'สร้างบัญชีไม่สำเร็จ' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole('admin'); if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id); const password = typeof body.password === 'string' ? body.password : '';
    if (body.action === 'approve') {
      if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'รหัสหน่วยงานไม่ถูกต้อง' }, { status: 400 });
      const approved = await query('UPDATE risk_units SET active=true, approved_at=now() WHERE id=$1 AND active=false AND requested_by IS NOT NULL', [id]);
      if (!approved.rowCount) return NextResponse.json({ error: 'ไม่พบคำขอที่รออนุมัติ' }, { status: 404 });
      await audit(auth.user, 'risk_unit.approve', 'risk_unit', id);
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'reject') {
      if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'รหัสหน่วยงานไม่ถูกต้อง' }, { status: 400 });
      const rejected = await query('DELETE FROM risk_units WHERE id=$1 AND active=false AND requested_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM unit_risks WHERE unit_id=$1)', [id]);
      if (!rejected.rowCount) return NextResponse.json({ error: 'ไม่พบคำขอที่รออนุมัติ' }, { status: 404 });
      await audit(auth.user, 'risk_unit.reject', 'risk_unit', id);
      return NextResponse.json({ ok: true });
    }
    if (!Number.isInteger(id) || id < 1 || password.length < 12 || password.length > 128) return NextResponse.json({ error: 'รหัสผ่านต้องมี 12–128 ตัวอักษร' }, { status: 400 });
    const result = await query('UPDATE risk_units SET password_hash=$1, failed_attempts=0, locked_until=NULL WHERE id=$2', [await hashUnitPassword(password), id]);
    if (!result.rowCount) return NextResponse.json({ error: 'ไม่พบหน่วยงาน' }, { status: 404 });
    await query('DELETE FROM risk_unit_sessions WHERE unit_id=$1', [id]);
    await audit(auth.user, 'risk_unit.password_reset', 'risk_unit', id);
    return NextResponse.json({ ok: true });
  } catch (err) { console.error('risk unit reset failed:', err); return NextResponse.json({ error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }, { status: 500 }); }
}
