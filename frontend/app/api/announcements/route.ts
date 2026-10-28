import { NextRequest, NextResponse } from 'next/server';
import { audit, getSessionUser, requireReadAccess, requireRole } from '@/lib/auth';
import { dbConfigured, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Announcement = {
  id: number;
  title: string | null;
  image_data: string | null;
  description: string | null;
  publish_at: string;
  created_at: string;
  author_name: string | null;
};

const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;
const MAX_IMAGE_LENGTH = 4_200_000; // ประมาณ 3 MB ก่อนเข้ารหัส base64

export async function GET() {
  const denied = await requireReadAccess();
  if (denied) return denied;
  if (!dbConfigured()) return NextResponse.json({ announcements: [] });
  const user = await getSessionUser();

  try {
    const { rows } = await query<Announcement>(`
      SELECT a.id, a.title, a.description, a.image_data, a.created_at, a.publish_at, COALESCE(u.name, u.email) AS author_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.publish_at <= now() OR $1::boolean
      ORDER BY a.publish_at DESC, a.id DESC
      LIMIT 100
    `, [user?.role === 'admin']);
    return NextResponse.json({ announcements: rows });
  } catch (error) {
    console.error('load announcements failed:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดประกาศได้ กรุณาตรวจสอบฐานข้อมูล' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : null;
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const imageData = typeof body.image_data === 'string' ? body.image_data : '';
    const publishAt = typeof body.publish_at === 'string' && body.publish_at ? new Date(body.publish_at) : new Date();

    if (imageData && (imageData.length > MAX_IMAGE_LENGTH || !IMAGE_PATTERN.test(imageData))) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 3 MB' }, { status: 400 });
    }
    if ((!title && !description && !imageData) || description.length > 5000 || Number.isNaN(publishAt.getTime())) {
      return NextResponse.json({ error: 'กรุณาใส่หัวข้อ คำอธิบาย หรือรูป และตรวจสอบเวลาเผยแพร่' }, { status: 400 });
    }

    const { rows } = await query<Announcement>(
      `INSERT INTO announcements (title, description, image_data, created_by, publish_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, image_data, created_at, publish_at, NULL::text AS author_name`,
      [title || null, description || null, imageData || null, auth.user.id, publishAt.toISOString()],
    );
    await audit(auth.user, 'announcement.create', 'announcement', rows[0].id, { title: title || null });
    return NextResponse.json({ announcement: { ...rows[0], author_name: auth.user.name ?? auth.user.email } }, { status: 201 });
  } catch (error) {
    console.error('create announcement failed:', error);
    return NextResponse.json({ error: 'ไม่สามารถเผยแพร่ประกาศได้' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'รหัสประกาศไม่ถูกต้อง' }, { status: 400 });
  }

  const result = await query('DELETE FROM announcements WHERE id = $1', [id]);
  if (result.rowCount === 0) return NextResponse.json({ error: 'ไม่พบประกาศ' }, { status: 404 });
  await audit(auth.user, 'announcement.delete', 'announcement', id);
  return NextResponse.json({ ok: true });
}
