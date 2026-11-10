import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { ensureRiskSubmissions } from '@/lib/riskSubmissions';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const { year, quarter } = body;
    if (!Number.isInteger(year) || year < 2500 || year > 2700 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'ปีหรือไตรมาสไม่ถูกต้อง' }, { status: 400 });
    }
    const unit = await getRiskUnit(auth.user.id);
    if (!unit) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบหน่วยงานก่อนยืนยันส่ง' }, { status: 403 });
    await ensureRiskSubmissions();
    const result = await query(`INSERT INTO risk_profile_submissions (unit_id, year, quarter, submitted_by)
      VALUES ($1,$2,$3,$4) ON CONFLICT (unit_id,year,quarter) DO NOTHING RETURNING submitted_at`, [unit.id, year, quarter, auth.user.id]);
    if (result.rowCount) await audit(auth.user, 'risk_profile.submit', 'risk_unit', unit.id, { year, quarter });
    return NextResponse.json({ ok: true, alreadySubmitted: !result.rowCount });
  } catch (error) {
    console.error('risk profile submission failed', error);
    return NextResponse.json({ error: 'ยืนยันการส่งไม่สำเร็จ' }, { status: 500 });
  }
}
