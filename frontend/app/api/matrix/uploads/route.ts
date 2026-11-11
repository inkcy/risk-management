import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getPool, query } from '@/lib/db';
import { ensureMatrixUploads, MATRIX_CHUNK_SIZE, MAX_MATRIX_UPLOAD } from '@/lib/matrixUploads';

export const runtime = 'nodejs';
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
async function authorize(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return { ok: false as const, response: NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 }) };
  return requireRole('viewer');
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  try {
    const { name, size } = await request.json();
    if (typeof name !== 'string' || name.length > 255 || !/\.(?:doc|docx|xlsx|jpe?g|png|webp)$/i.test(name) || !Number.isInteger(size) || size < 1 || size > MAX_MATRIX_UPLOAD) return NextResponse.json({ error: 'ไฟล์ไม่ถูกต้องหรือมีขนาดเกิน 20 MB' }, { status: 400 });
    await ensureMatrixUploads();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [auth.user.id]);
      await client.query('DELETE FROM matrix_file_uploads WHERE expires_at <= now()');
      const active = await client.query<{ count: string }>('SELECT count(*) AS count FROM matrix_file_uploads WHERE user_id=$1', [auth.user.id]);
      if (Number(active.rows[0].count) >= 3) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'มีไฟล์ที่ยังอัปโหลดไม่เสร็จ กรุณาลองอีกครั้งภายหลัง' }, { status: 429 }); }
      const id = randomUUID();
      await client.query('INSERT INTO matrix_file_uploads (id,user_id,filename,size) VALUES ($1,$2,$3,$4)', [id, auth.user.id, name, size]);
      await client.query('COMMIT');
      return NextResponse.json({ id, chunkSize: MATRIX_CHUNK_SIZE });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { console.error('matrix upload start failed', error instanceof Error ? error.name : 'unknown'); return NextResponse.json({ error: 'เริ่มอัปโหลดไม่สำเร็จ' }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  const id = request.headers.get('x-upload-id') ?? '';
  const offset = Number(request.headers.get('x-upload-offset'));
  if (!validId(id) || !Number.isSafeInteger(offset) || offset < 0 || Number(request.headers.get('content-length') ?? 0) > MATRIX_CHUNK_SIZE) return NextResponse.json({ error: 'ข้อมูลส่วนไฟล์ไม่ถูกต้อง' }, { status: 400 });
  try {
    const data = Buffer.from(await request.arrayBuffer());
    if (!data.length || data.length > MATRIX_CHUNK_SIZE) return NextResponse.json({ error: 'ส่วนไฟล์มีขนาดไม่ถูกต้อง' }, { status: 400 });
    await ensureMatrixUploads();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ size: number; received: number }>('SELECT size,received FROM matrix_file_uploads WHERE id=$1 AND user_id=$2 AND expires_at>now() FOR UPDATE', [id, auth.user.id]);
      const file = result.rows[0];
      if (!file || file.received !== offset || offset + data.length > file.size) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ไฟล์หมดอายุหรือส่วนไฟล์ไม่ต่อเนื่อง' }, { status: 409 }); }
      await client.query('INSERT INTO matrix_file_chunks (upload_id,offset_bytes,content) VALUES ($1,$2,$3)', [id, offset, data]);
      await client.query('UPDATE matrix_file_uploads SET received=$1 WHERE id=$2', [offset + data.length, id]);
      await client.query('COMMIT');
      return NextResponse.json({ received: offset + data.length });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { console.error('matrix upload chunk failed', error instanceof Error ? error.name : 'unknown'); return NextResponse.json({ error: 'อัปโหลดส่วนไฟล์ไม่สำเร็จ' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request); if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!validId(id)) return NextResponse.json({ error: 'รหัสไฟล์ไม่ถูกต้อง' }, { status: 400 });
  try { await ensureMatrixUploads(); await query('DELETE FROM matrix_file_uploads WHERE id=$1 AND user_id=$2', [id, auth.user.id]); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'ลบไฟล์ชั่วคราวไม่สำเร็จ' }, { status: 500 }); }
}
