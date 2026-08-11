import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireRole, type Role } from '@/lib/auth';

export const runtime = 'nodejs';

const ROLES: Role[] = ['admin', 'editor', 'viewer'];

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  const { rows } = await query(
    `SELECT id, email, name, picture, role, active, created_at, last_login_at
     FROM users ORDER BY role, email`,
  );
  return NextResponse.json({ users: rows });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { id?: number; role?: Role; active?: boolean };
  const { id, role, active } = body;

  if (!id) return NextResponse.json({ error: 'ต้องระบุ id' }, { status: 400 });
  if (role !== undefined && !ROLES.includes(role)) {
    return NextResponse.json({ error: 'role ต้องเป็น admin, editor หรือ viewer' }, { status: 400 });
  }
  // กันเผลอถอดสิทธิ์ตัวเองจนไม่มีใครเข้าไปแก้ได้อีก
  if (id === auth.user.id && (role !== undefined || active === false)) {
    return NextResponse.json({ error: 'เปลี่ยนสิทธิ์หรือปิดบัญชีของตัวเองไม่ได้' }, { status: 400 });
  }

  const { rows } = await query(
    `UPDATE users
        SET role   = COALESCE($2, role),
            active = COALESCE($3, active)
      WHERE id = $1
      RETURNING id, email, name, picture, role, active, created_at, last_login_at`,
    [id, role ?? null, active ?? null],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });

  // ปิดบัญชีแล้วต้องเตะ session ที่ค้างอยู่ออกทันที ไม่รอหมดอายุ
  if (active === false) await query('DELETE FROM sessions WHERE user_id = $1', [id]);

  await audit(auth.user, 'user.update', 'user', id, { role: role ?? null, active: active ?? null });
  return NextResponse.json({ user: rows[0] });
}
