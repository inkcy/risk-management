import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { ensureRiskSubmissions } from '@/lib/riskSubmissions';
import { departmentAccess } from '@/lib/departmentAccess';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;
  if (auth.user.role !== 'admin' && departmentAccess(auth.user) !== 'supervisor') return NextResponse.json({ error: 'เฉพาะหัวหน้างานหรือผู้ดูแลระบบเท่านั้นที่ยืนยันส่งได้' }, { status: 403 });
  try {
    const body = await request.json();
    const { year, quarter } = body;
    if (!Number.isInteger(year) || year < 2500 || year > 2700 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'ปีหรือไตรมาสไม่ถูกต้อง' }, { status: 400 });
    }
    const unit = auth.user.role === 'admin'
      ? (await query<{ id: number; name: string }>("SELECT id, name FROM risk_units WHERE active AND lower(trim(name))='admin' ORDER BY id LIMIT 1")).rows[0]
      : await getRiskUnit(auth.user.id);
    if (!unit) return NextResponse.json({ error: auth.user.role === 'admin' ? 'ไม่พบหน่วยงาน Admin ที่เปิดใช้งาน' : 'กรุณาเข้าสู่ระบบหน่วยงานก่อนยืนยันส่ง' }, { status: 403 });
    await ensureRiskSubmissions();
    // Capture all rows and the submission record in one statement, using one database snapshot.
    const result = await query(`INSERT INTO risk_profile_submissions (unit_id, year, quarter, submitted_by, snapshot)
      SELECT $1,$2,$3,$4,jsonb_build_object(
        'unitName', u.name,
        'risks', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM unit_risks r
          WHERE r.unit_id=$1 AND r.year=$2 AND r.quarter=$3), '[]'::jsonb))
      FROM risk_units u WHERE u.id=$1
      ON CONFLICT (unit_id,year,quarter) DO NOTHING RETURNING submitted_at`, [unit.id, year, quarter, auth.user.id]);
    if (result.rowCount) await audit(auth.user, 'risk_profile.submit', 'risk_unit', unit.id, { year, quarter });
    return NextResponse.json({ ok: true, alreadySubmitted: !result.rowCount });
  } catch (error) {
    console.error('risk profile submission failed', error);
    return NextResponse.json({ error: 'ยืนยันการส่งไม่สำเร็จ' }, { status: 500 });
  }
}
