import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { hashUnitPassword } from '@/lib/riskUnitAuth';
import { riskUnitDirectory } from '@/lib/riskUnitDirectory';

export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!riskUnitDirectory.some(unit => unit === name) || !/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 12 || password.length > 128) {
      return NextResponse.json({ error: 'กรุณากรอกหน่วยงาน ชื่อผู้ใช้ (a-z, 0-9 หรือ ._-) และรหัสผ่านอย่างน้อย 12 ตัวอักษร' }, { status: 400 });
    }
    const { rows } = await query<{ id: number }>(
      'INSERT INTO risk_units (name, username, password_hash, active, requested_by) VALUES ($1,$2,$3,false,$4) RETURNING id',
      [name, username, await hashUnitPassword(password), auth.user.id],
    );
    await audit(auth.user, 'risk_unit.signup', 'risk_unit', rows[0].id, { name, username });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') return NextResponse.json({ error: 'หน่วยงานหรือชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาติดต่อผู้ดูแลระบบ' }, { status: 409 });
    console.error('risk unit signup failed:', err);
    return NextResponse.json({ error: 'ส่งคำขอสมัครไม่สำเร็จ' }, { status: 500 });
  }
}
