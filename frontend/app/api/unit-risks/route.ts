import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { departmentAccess } from '@/lib/departmentAccess';

export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  if (departmentAccess(auth.user) === 'staff') return NextResponse.json({ error: 'เฉพาะหัวหน้างาน' }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const requested = Number(body.unit_id);
    const unit = auth.user.role === 'admin' ? (await query<{ id: number }>('SELECT id FROM risk_units WHERE id=$1 AND active', [requested])).rows[0] : await getRiskUnit(auth.user.id);
    if (!unit || !Number.isInteger(requested) || unit.id !== requested) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงหน่วยงานนี้' }, { status: 403 });
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const { year, quarter, occurrence_count: count, impact, category } = body;
    if (!title || title.length > 300 || typeof year !== 'number' || !Number.isInteger(year) || year < 2500 || year > 2700 || typeof quarter !== 'number' || !Number.isInteger(quarter) || quarter < 1 || quarter > 4 || typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 10000000 || typeof impact !== 'number' || !Number.isInteger(impact) || impact < 1 || impact > 5 || (category !== 'clinical' && category !== 'nonclinical')) return NextResponse.json({ error: 'กรุณาตรวจสอบข้อมูลความเสี่ยง' }, { status: 400 });
    const result = await query<{ id: number }>('INSERT INTO unit_risks (unit_id,year,quarter,category,title,occurrence_count,impact) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [unit.id, year, quarter, category, title, count, impact]);
    await audit(auth.user, 'unit_risk.create', 'unit_risk', result.rows[0].id, { unit_id: unit.id });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) { console.error('unit risk save failed:', err); return NextResponse.json({ error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  if (departmentAccess(auth.user) === 'staff') return NextResponse.json({ error: 'เฉพาะหัวหน้างาน' }, { status: 403 });
  try {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
    const unit = auth.user.role === 'admin' ? null : await getRiskUnit(auth.user.id);
    if (auth.user.role !== 'admin' && !unit) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });
    const result = await query('DELETE FROM unit_risks WHERE id=$1 AND ($2::boolean OR unit_id=$3)', [id, auth.user.role === 'admin', unit?.id ?? null]);
    if (!result.rowCount) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
    await audit(auth.user, 'unit_risk.delete', 'unit_risk', id);
    return NextResponse.json({ ok: true });
  } catch (err) { console.error('unit risk delete failed:', err); return NextResponse.json({ error: 'ลบข้อมูลไม่สำเร็จ' }, { status: 500 }); }
}
