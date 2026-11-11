import { NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { ensureIncidentOtherDetail } from '@/lib/incidentOtherDetail';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    await ensureIncidentOtherDetail();
    const { rows } = await query(`SELECT i.ir_code, i.occurred_at::text, u.name_th AS unit_name,
      i.category, i.other_detail, i.severity, i.title, i.description, i.rca_status, i.reported_by
      FROM incidents i LEFT JOIN units u ON u.id = i.unit_id ORDER BY i.occurred_at DESC, i.id DESC`);
    await audit(auth.user, 'incident.export', 'incidents', null, { count: rows.length });
    return NextResponse.json({ incidents: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('incident export failed', error);
    return NextResponse.json({ error: 'โหลดรายการอุบัติการณ์เพื่อส่งออกไม่สำเร็จ' }, { status: 500 });
  }
}
