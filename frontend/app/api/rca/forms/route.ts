import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { normalizeRcaForm } from '@/lib/rcaForm';

export const runtime = 'nodejs';

/** รายการร่างที่บันทึกไว้ — ไม่ส่ง data ทั้งก้อนกลับไป ให้ดึงทีละใบตอนเปิด */
export async function GET() {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;

  const { rows } = await query(
    `SELECT f.id, f.rm_no, f.subject, f.unit, f.ir_code, f.updated_at,
            u.name AS updated_by_name, u.email AS updated_by_email
     FROM rca_forms f
     LEFT JOIN users u ON u.id = f.updated_by
     ORDER BY f.updated_at DESC
     LIMIT 100`,
  );
  return NextResponse.json({ forms: rows });
}

/** บันทึกร่าง — ส่ง id มาด้วยคือแก้ใบเดิม ไม่ส่งคือสร้างใบใหม่ */
export async function POST(request: NextRequest) {
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { id?: number; irCode?: string | null; form?: unknown };
    if (!body.form) return NextResponse.json({ error: 'ไม่มีข้อมูลฟอร์ม' }, { status: 400 });

    // irCode ไม่ได้อยู่ในตัวฟอร์ม — หน้าเว็บส่งมาแยกเมื่อเปิดฟอร์มจากเคส (?ir=)
    const form = normalizeRcaForm(body.form);
    const meta = [form.rmNo || null, form.subject || null, form.unit || null, body.irCode || null];

    if (body.id) {
      const { rows } = await query(
        `UPDATE rca_forms
            SET rm_no = $2, subject = $3, unit = $4, ir_code = $5,
                data = $6, updated_by = $7, updated_at = now()
          WHERE id = $1
          RETURNING id, updated_at`,
        [body.id, ...meta, JSON.stringify(form), auth.user.id],
      );
      if (rows.length === 0) return NextResponse.json({ error: 'ไม่พบร่างนี้' }, { status: 404 });

      await audit(auth.user, 'rca_form.update', 'rca_form', body.id, { rm_no: form.rmNo || null });
      return NextResponse.json({ form: rows[0] });
    }

    const { rows } = await query(
      `INSERT INTO rca_forms (rm_no, subject, unit, ir_code, data, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id, updated_at`,
      [...meta, JSON.stringify(form), auth.user.id],
    );

    await audit(auth.user, 'rca_form.create', 'rca_form', rows[0].id, { rm_no: form.rmNo || null });
    return NextResponse.json({ form: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('save rca form failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
