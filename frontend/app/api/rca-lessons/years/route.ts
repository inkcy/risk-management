import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ensureRcaLessons } from '@/lib/rcaLessons';

export async function POST(request: NextRequest) { return change(request, 'add'); }
export async function PATCH(request: NextRequest) { return change(request, 'rename'); }
export async function DELETE(request: NextRequest) { return change(request, 'delete'); }

async function change(request: NextRequest, action: 'add' | 'rename' | 'delete') {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const year = Number(body.year);
    const nextYear = Number(body.nextYear);
    const valid = (value: number) => Number.isInteger(value) && value >= 2400 && value <= 2800;
    if (!valid(year) || (action === 'rename' && (!valid(nextYear) || nextYear === year))) return NextResponse.json({ error: 'กรุณาระบุปี พ.ศ. ระหว่าง 2400–2800' }, { status: 400 });
    await ensureRcaLessons();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('rca_lessons_init'))");
      if (action === 'add') {
        await client.query('INSERT INTO rca_lesson_years (year) VALUES ($1)', [year]);
      } else {
        const existing = await client.query('SELECT year FROM rca_lesson_years WHERE year=$1 FOR UPDATE', [year]);
        if (!existing.rowCount) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ไม่พบปีที่เลือก' }, { status: 404 }); }
        if (action === 'rename') {
          await client.query('INSERT INTO rca_lesson_years (year) VALUES ($1)', [nextYear]);
          await client.query('UPDATE rca_lessons SET year=$1 WHERE year=$2', [nextYear, year]);
        } else {
          await client.query('UPDATE rca_lessons SET year=NULL WHERE year=$1', [year]);
        }
        await client.query('DELETE FROM rca_lesson_years WHERE year=$1', [year]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    await audit(auth.user, `rca_lesson_year.${action}`, 'rca_lesson_year', year, { nextYear: action === 'rename' ? nextYear : null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return NextResponse.json({ error: 'ปีนี้มีอยู่แล้ว' }, { status: 409 });
    console.error('RCA lesson year update failed', error);
    return NextResponse.json({ error: 'จัดการปีไม่สำเร็จ' }, { status: 500 });
  }
}
