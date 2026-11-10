import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { ensureRcaLessons } from '@/lib/rcaLessons';

const validImage = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export async function POST(request: NextRequest) { return save(request, false); }
export async function PATCH(request: NextRequest) { return save(request, true); }

async function save(request: NextRequest, editing: boolean) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = Number(body.id);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const image = typeof body.image === 'string' ? body.image : '';
    const year = body.year === null ? null : Number(body.year);
    if (!title || title.length > 250 || (year !== null && (!Number.isInteger(year) || year < 2400 || year > 2800)) || (editing && (!Number.isSafeInteger(id) || id < 1)) || (!editing && !image) || (image && (image.length > 2800000 || !validImage.test(image)))) {
      return NextResponse.json({ error: 'กรุณาระบุหัวข้อและเลือกรูป JPG, PNG หรือ WebP ไม่เกิน 2 MB' }, { status: 400 });
    }
    await ensureRcaLessons();
    const client = await getPool().connect();
    let result;
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('rca_lessons_init'))");
      result = editing
        ? await client.query('UPDATE rca_lessons SET title=$1, image=COALESCE($2,image), year=$3 WHERE id=$4 RETURNING id', [title, image || null, year, id])
        : await client.query('INSERT INTO rca_lessons (title,image,year) VALUES ($1,$2,$3) RETURNING id', [title, image, year]);
      if (!result.rowCount) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 }); }
      if (year !== null) await client.query('INSERT INTO rca_lesson_years (year) VALUES ($1) ON CONFLICT DO NOTHING', [year]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    await audit(auth.user, editing ? 'rca_lesson.update' : 'rca_lesson.create', 'rca_lesson', result.rows[0].id, { title });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('save RCA lesson failed', error);
    return NextResponse.json({ error: 'บันทึกบทเรียนไม่สำเร็จ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'รหัสบทเรียนไม่ถูกต้อง' }, { status: 400 });
  try {
    await ensureRcaLessons();
    const result = await query('DELETE FROM rca_lessons WHERE id=$1 RETURNING id', [id]);
    if (!result.rowCount) return NextResponse.json({ error: 'ไม่พบบทเรียน' }, { status: 404 });
    await audit(auth.user, 'rca_lesson.delete', 'rca_lesson', id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('delete RCA lesson failed', error);
    return NextResponse.json({ error: 'ลบบทเรียนไม่สำเร็จ' }, { status: 500 });
  }
}
