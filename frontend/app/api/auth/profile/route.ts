import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} ยาวเกิน ${maxLength} ตัวอักษร`);
  return trimmed || null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as { name?: unknown; picture?: unknown };
    const name = optionalText(body.name, 'ชื่อที่แสดง', 100);
    const picture = optionalText(body.picture, 'ลิงก์รูปโปรไฟล์', 2_048);

    if (picture) {
      let url: URL;
      try { url = new URL(picture); } catch { return NextResponse.json({ error: 'ลิงก์รูปโปรไฟล์ไม่ถูกต้อง' }, { status: 400 }); }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return NextResponse.json({ error: 'ลิงก์รูปโปรไฟล์ต้องขึ้นต้นด้วย http:// หรือ https://' }, { status: 400 });
      }
    }

    const { rows } = await query(
      `UPDATE users SET name = $2, picture = $3 WHERE id = $1
       RETURNING id, email, name, picture, role`,
      [auth.user.id, name, picture],
    );
    await audit(auth.user, 'profile.update', 'user', auth.user.id, { changed_name: name !== null, changed_picture: picture !== null });
    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'บันทึกโปรไฟล์ไม่สำเร็จ' }, { status: 400 });
  }
}
