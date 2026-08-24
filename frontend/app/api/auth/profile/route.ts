import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

function optionalText(body: Record<string, unknown>, key: string, field: string, maxLength: number): string | null | undefined {
  if (!Object.hasOwn(body, key)) return undefined;
  const value = body[key];
  if (typeof value !== 'string') throw new Error(`${field} ต้องเป็นข้อความ`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} ยาวเกิน ${maxLength} ตัวอักษร`);
  return trimmed || null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'ข้อมูลโปรไฟล์ไม่ถูกต้อง' }, { status: 400 });
    }
    const fields = body as Record<string, unknown>;
    const name = optionalText(fields, 'name', 'ชื่อที่แสดง', 100);
    const picture = optionalText(fields, 'picture', 'ลิงก์รูปโปรไฟล์', 2_048);
    if (name === undefined && picture === undefined) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องการบันทึก' }, { status: 400 });
    }

    if (picture) {
      let url: URL;
      try { url = new URL(picture); } catch { return NextResponse.json({ error: 'ลิงก์รูปโปรไฟล์ไม่ถูกต้อง' }, { status: 400 }); }
      if (url.protocol !== 'https:') {
        return NextResponse.json({ error: 'ลิงก์รูปโปรไฟล์ต้องขึ้นต้นด้วย https://' }, { status: 400 });
      }
    }

    const { rows } = await query(
      `UPDATE users
          SET name = CASE WHEN $2 THEN $3 ELSE name END,
              picture = CASE WHEN $4 THEN $5 ELSE picture END
        WHERE id = $1
       RETURNING id, email, name, picture, role`,
      [auth.user.id, name !== undefined, name, picture !== undefined, picture],
    );
    await audit(auth.user, 'profile.update', 'user', auth.user.id, { changed_name: name !== undefined, changed_picture: picture !== undefined });
    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'บันทึกโปรไฟล์ไม่สำเร็จ' }, { status: 400 });
  }
}
