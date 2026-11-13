import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json() as { removed_at?: string; outcome?: string };
    const { removed_at, outcome } = body;
    const { rows } = await query(
      `UPDATE cauti_patients
         SET removed_at = COALESCE($1::date, CURRENT_DATE),
             outcome    = COALESCE($2, outcome),
             updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [removed_at ?? null, outcome ?? 'removed', id],
    );
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await audit(auth.user, 'cauti.remove', 'cauti_patient', id, { removed_at: removed_at ?? null, outcome: outcome ?? 'removed' });
    return NextResponse.json({ patient: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
