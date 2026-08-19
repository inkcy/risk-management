import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';

export const runtime = 'nodejs';

/** เปิดร่างที่บันทึกไว้ */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { rows } = await query(
    `SELECT id, rm_no, subject, unit, ir_code, data, updated_at,
            (created_by = $2 OR $3 = 'admin') AS can_edit,
            ($3 = 'admin') AS can_delete
       FROM rca_forms
      WHERE id = $1`,
    [id, auth.user.id, auth.user.role],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'ไม่พบร่างนี้' }, { status: 404 });
  return NextResponse.json({ form: rows[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { rowCount } = await query('DELETE FROM rca_forms WHERE id = $1', [id]);
  if (!rowCount) return NextResponse.json({ error: 'ไม่พบร่างนี้' }, { status: 404 });

  await audit(auth.user, 'rca_form.delete', 'rca_form', id);
  return NextResponse.json({ ok: true });
}
