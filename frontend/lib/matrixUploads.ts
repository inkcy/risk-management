import { getPool, query } from '@/lib/db';

export const MAX_MATRIX_UPLOAD = 20 * 1024 * 1024;
export const MATRIX_CHUNK_SIZE = 512 * 1024;

export async function ensureMatrixUploads() {
  await query(`CREATE TABLE IF NOT EXISTS matrix_file_uploads (
    id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL, size INTEGER NOT NULL, received INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes'
  )`);
  await query(`CREATE TABLE IF NOT EXISTS matrix_file_chunks (
    upload_id UUID NOT NULL REFERENCES matrix_file_uploads(id) ON DELETE CASCADE,
    offset_bytes INTEGER NOT NULL, content BYTEA NOT NULL, PRIMARY KEY (upload_id, offset_bytes)
  )`);
}

export async function consumeMatrixUpload(id: string, userId: number): Promise<{ filename: string; data: Buffer }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('รหัสไฟล์ไม่ถูกต้อง');
  await ensureMatrixUploads();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{ filename: string; size: number; received: number }>('SELECT filename,size,received FROM matrix_file_uploads WHERE id=$1 AND user_id=$2 AND expires_at>now() FOR UPDATE', [id, userId]);
    const file = result.rows[0];
    if (!file || file.received !== file.size) throw new Error('ไฟล์หมดอายุหรือส่งมาไม่ครบ กรุณาเลือกไฟล์ใหม่');
    const chunks = await client.query<{ content: Buffer; offset_bytes: number }>('SELECT content,offset_bytes FROM matrix_file_chunks WHERE upload_id=$1 ORDER BY offset_bytes', [id]);
    let offset = 0;
    for (const chunk of chunks.rows) { if (chunk.offset_bytes !== offset) throw new Error('ข้อมูลไฟล์ไม่ครบ กรุณาเลือกไฟล์ใหม่'); offset += chunk.content.length; }
    if (offset !== file.size) throw new Error('ข้อมูลไฟล์ไม่ครบ กรุณาเลือกไฟล์ใหม่');
    await client.query('DELETE FROM matrix_file_uploads WHERE id=$1', [id]);
    await client.query('COMMIT');
    return { filename: file.filename, data: Buffer.concat(chunks.rows.map(chunk => chunk.content)) };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
