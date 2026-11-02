import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const {unit_id,year,quarter,category,items} = body;
    const unit = auth.user.role === 'admin' ? (await query('SELECT id FROM risk_units WHERE id=$1 AND active',[unit_id])).rows[0] : await getRiskUnit(auth.user.id);
    if (!unit || unit.id !== unit_id) return NextResponse.json({error:'ไม่มีสิทธิ์เข้าถึงหน่วยงานนี้'},{status:403});
    if (!Number.isInteger(year)||year<2500||year>2700||!Number.isInteger(quarter)||quarter<1||quarter>4||!['clinical','nonclinical'].includes(category)||!Array.isArray(items)||!items.length||items.length>500||items.some(i=>typeof i.title!=='string'||!i.title.trim()||i.title.length>300||!Number.isInteger(i.impact)||i.impact<1||i.impact>5||!Number.isInteger(i.occurrence_count)||i.occurrence_count<0||i.occurrence_count>10000000)) return NextResponse.json({error:'กรุณาตรวจสอบข้อมูลนำเข้า'},{status:400});
    const client = await getPool().connect(); let inserted=0;
    try {
      await client.query('BEGIN');
      // Serialize imports for this unit, including simultaneous submissions.
      await client.query('SELECT id FROM risk_units WHERE id=$1 FOR UPDATE',[unit_id]);
      for (const item of items) {
        const result = await client.query('INSERT INTO unit_risks (unit_id,year,quarter,category,title,occurrence_count,impact) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS (SELECT 1 FROM unit_risks WHERE unit_id=$1 AND year=$2 AND quarter=$3 AND category=$4 AND title=$5 AND occurrence_count=$6 AND impact=$7)',[unit_id,year,quarter,category,item.title.trim(),item.occurrence_count,item.impact]);
        inserted += result.rowCount ?? 0;
      }
      await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    await audit(auth.user,'unit_risk.import','risk_unit',unit_id,{year,quarter,category,inserted});
    return NextResponse.json({inserted,skipped:items.length-inserted});
  } catch(error) { console.error('unit risk import failed',error); return NextResponse.json({error:'บันทึกข้อมูลนำเข้าไม่สำเร็จ'},{status:500}); }
}
