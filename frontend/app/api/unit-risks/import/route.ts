import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { departmentAccess } from '@/lib/departmentAccess';
export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  if (departmentAccess(auth.user) === 'staff') return NextResponse.json({ error: 'เฉพาะหัวหน้างาน' }, { status: 403 });
  try {
    const body = await request.json();
    const {unit_id,year,quarter,category,items} = body;
    const unit = auth.user.role === 'admin' ? (await query('SELECT id FROM risk_units WHERE id=$1 AND active',[unit_id])).rows[0] : await getRiskUnit(auth.user.id);
    if (!unit || unit.id !== unit_id) return NextResponse.json({error:'ไม่มีสิทธิ์เข้าถึงหน่วยงานนี้'},{status:403});
    if (!Number.isInteger(year)||year<2500||year>2700||!Number.isInteger(quarter)||quarter<1||quarter>4||!['clinical','nonclinical'].includes(category)||!Array.isArray(items)||!items.length||items.length>500||items.some(i=>typeof i.title!=='string'||!i.title.trim()||i.title.length>300||!Number.isInteger(i.impact)||i.impact<1||i.impact>5||!Number.isInteger(i.occurrence_count)||i.occurrence_count<0||i.occurrence_count>10000000)) return NextResponse.json({error:'กรุณาตรวจสอบข้อมูลนำเข้า'},{status:400});
    if (items.some(i => (i.source_analysis_level != null && !['green','yellow','orange','red'].includes(i.source_analysis_level)) || (i.source_title != null && (typeof i.source_title !== 'string' || !i.source_title.trim() || i.source_title.length > 240)) || (!!i.source_analysis_level !== !!i.source_title))) return NextResponse.json({error:'ระดับการวิเคราะห์ต้นฉบับไม่ถูกต้อง'},{status:400});
    const client = await getPool().connect(); let inserted=0, updated=0;
    try {
      await client.query('BEGIN');
      // Serialize imports for this unit, including simultaneous submissions.
      await client.query('SELECT id FROM risk_units WHERE id=$1 FOR UPDATE',[unit_id]);
      for (const item of items) {
        const params = [unit_id,year,quarter,category,item.title.trim(),item.occurrence_count,item.impact,item.source_title ?? null,item.source_analysis_level ?? null];
        if (item.source_analysis_level) {
          const change = await client.query('UPDATE unit_risks SET source_title=$8,source_analysis_level=$9 WHERE unit_id=$1 AND year=$2 AND quarter=$3 AND category=$4 AND title=$5 AND occurrence_count=$6 AND impact=$7 AND (source_title IS DISTINCT FROM $8 OR source_analysis_level IS DISTINCT FROM $9)', params);
          updated += change.rowCount ?? 0;
        }
        const result = await client.query('INSERT INTO unit_risks (unit_id,year,quarter,category,title,occurrence_count,impact,source_title,source_analysis_level) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9 WHERE NOT EXISTS (SELECT 1 FROM unit_risks WHERE unit_id=$1 AND year=$2 AND quarter=$3 AND category=$4 AND title=$5 AND occurrence_count=$6 AND impact=$7)',params);
        inserted += result.rowCount ?? 0;
      }
      await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    await audit(auth.user,'unit_risk.import','risk_unit',unit_id,{year,quarter,category,inserted,updated});
    return NextResponse.json({inserted,updated,skipped:Math.max(0,items.length-inserted-updated)});
  } catch(error) { console.error('unit risk import failed',error); return NextResponse.json({error:'บันทึกข้อมูลนำเข้าไม่สำเร็จ'},{status:500}); }
}
