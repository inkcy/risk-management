import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { ensureDepartmentCodeUnits } from '@/lib/departmentCodeUnits';

export const runtime = 'nodejs';
export async function GET() {
  const auth = await requireRole('admin'); if (!auth.ok) return auth.response;
  try {
    await ensureDepartmentCodeUnits();
    const [codes, policy] = await Promise.all([
      query(`SELECT c.id,c.display_name,COALESCE(array_agg(m.unit_id ORDER BY m.unit_id) FILTER (WHERE m.unit_id IS NOT NULL),'{}') AS unit_ids
             FROM department_login_codes c LEFT JOIN department_code_units m ON m.code_id=c.id
             WHERE c.active GROUP BY c.id ORDER BY c.display_name,c.id`),
      query<{ enforced: boolean }>('SELECT enforced FROM department_access_policy WHERE id=true'),
    ]);
    return NextResponse.json({ codes: codes.rows, enforced: policy.rows[0]?.enforced === true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'โหลดสิทธิ์หน่วยงานไม่สำเร็จ' }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin'); if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    await ensureDepartmentCodeUnits();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT enforced FROM department_access_policy WHERE id=true FOR UPDATE');
      if (body.action === 'activate') {
        const status = await client.query<{ total: string; missing: string }>(`SELECT count(*) AS total, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM department_code_units m JOIN risk_units u ON u.id=m.unit_id AND u.active WHERE m.code_id=c.id)) AS missing FROM department_login_codes c WHERE c.active`);
        if (!Number(status.rows[0].total) || Number(status.rows[0].missing)) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ต้องกำหนดหน่วยงานให้ทุกรหัสที่ใช้งานก่อน' }, { status: 400 }); }
        await client.query('UPDATE department_access_policy SET enforced=true WHERE id=true');
        await client.query("DELETE FROM risk_unit_sessions WHERE user_id IN (SELECT id FROM users WHERE email ~ '^(department-[0-9]+@units[.]invalid|roster-[0-9]+@staff[.]invalid)$')");
        await client.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email ~ '^(department-[0-9]+@units[.]invalid|roster-[0-9]+@staff[.]invalid)$')");
      } else if (body.action === 'assign') {
        const codeId = Number(body.code_id);
        const unitIds = body.unit_ids;
        if (!Number.isSafeInteger(codeId) || codeId < 1 || !Array.isArray(unitIds) || unitIds.length > 100 || unitIds.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(unitIds).size !== unitIds.length) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ข้อมูลสิทธิ์ไม่ถูกต้อง' }, { status: 400 }); }
        const code = await client.query('SELECT id,user_id FROM department_login_codes WHERE id=$1 AND active FOR UPDATE', [codeId]);
        if (!code.rows.length) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ไม่พบบัญชีเจ้าหน้าที่' }, { status: 404 }); }
        const units = await client.query("SELECT id FROM risk_units WHERE id=ANY($1::int[]) AND active AND lower(trim(name)) NOT IN ('admin','dev')", [unitIds]);
        if (units.rowCount !== unitIds.length) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'หน่วยงานไม่ถูกต้อง' }, { status: 400 }); }
        await client.query('DELETE FROM department_code_units WHERE code_id=$1', [codeId]);
        if (unitIds.length) await client.query('INSERT INTO department_code_units (code_id,unit_id) SELECT $1, unnest($2::int[])', [codeId,unitIds]);
        if (code.rows[0].user_id) {
          await client.query('DELETE FROM risk_unit_sessions WHERE user_id=$1', [code.rows[0].user_id]);
          await client.query('DELETE FROM sessions WHERE user_id=$1', [code.rows[0].user_id]);
        }
      } else { await client.query('ROLLBACK'); return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 }); }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    await audit(auth.user, body.action === 'activate' ? 'department_access.activate' : 'department_access.assign', 'department_login_codes', body.action === 'assign' ? body.code_id : null);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'บันทึกสิทธิ์หน่วยงานไม่สำเร็จ' }, { status: 500 }); }
}
