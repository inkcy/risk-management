import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { NextResponse } from 'next/server';
import { dbConfigured, query } from './db';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  cookieOptions,
  randomToken,
  signValue,
  verifyValue,
} from './session';

export type Role = 'admin' | 'editor' | 'viewer';

export interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  role: Role;
  roster_name?: string | null;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

/** admin ชุดแรกกำหนดผ่าน env เพราะยังไม่มีใครใน DB ที่จะตั้งสิทธิ์ให้ */
function bootstrapAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/** จำกัดโดเมนอีเมล เช่น "hospital.go.th" — เว้นว่าง = รับทุกโดเมน (ไม่แนะนำ) */
export function emailDomainAllowed(email: string): boolean {
  const allowed = (process.env.ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map(d => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  if (allowed.length === 0) return true;
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return allowed.includes(domain);
}

/**
 * ผู้ใช้ใหม่ที่ผ่านการยืนยันจาก Google จะได้ role 'viewer' ก่อนเสมอ
 * ต้องให้ admin เลื่อนสิทธิ์เป็น editor ถึงจะกรอกข้อมูลได้
 */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<SessionUser | null> {
  const email = profile.email.toLowerCase();
  const initialRole: Role = bootstrapAdmins().includes(email) ? 'admin' : 'viewer';

  const { rows } = await query<SessionUser & { active: boolean }>(
    `INSERT INTO users (google_sub, email, name, picture, role, last_login_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (email) DO UPDATE
       SET google_sub    = EXCLUDED.google_sub,
           last_login_at = now(),
           -- อีเมลใน ADMIN_EMAILS ถูกยกเป็น admin เสมอ กันกรณีตั้งสิทธิ์ผิดจนล็อกตัวเองออก
           role          = CASE WHEN $6 THEN 'admin' ELSE users.role END
     RETURNING id, email, name, picture, role, active`,
    [profile.sub, email, profile.name ?? null, profile.picture ?? null, initialRole, initialRole === 'admin'],
  );

  const user = rows[0];
  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role };
}

async function clientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  return {
    ip: forwarded ? forwarded.split(',')[0].trim() : null,
    userAgent: h.get('user-agent'),
  };
}

export interface SessionCookie {
  name: string;
  value: string;
  options: { maxAge: number } & typeof cookieOptions;
}

/**
 * สร้าง session ใน DB แล้วคืนค่า cookie ให้ผู้เรียกเซ็ตลงบน response เอง
 * (route handler ที่ตอบเป็น redirect ต้องเซ็ต cookie บน response ตรง ๆ)
 */
export async function createSession(userId: number): Promise<SessionCookie> {
  const sessionId = randomToken();
  const { ip, userAgent } = await clientMeta();

  await query(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent, ip)
     VALUES ($1, $2, now() + ($3 || ' seconds')::interval, $4, $5)`,
    [sessionId, userId, String(SESSION_MAX_AGE_SEC), userAgent, ip],
  );

  return {
    name: SESSION_COOKIE,
    value: await signValue(sessionId),
    options: { ...cookieOptions, maxAge: SESSION_MAX_AGE_SEC },
  };
}

/** ลบ session ออกจาก DB — ผู้เรียกต้องลบ cookie บน response ด้วย */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const sessionId = await verifyValue(jar.get(SESSION_COOKIE)?.value);
  if (sessionId && dbConfigured()) {
    try {
      await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    } catch {
      // ลบ cookie ให้ได้เสมอแม้ DB ล่ม
    }
  }
}

/**
 * ผู้ใช้ปัจจุบัน — ตรวจทั้งลายเซ็น cookie, วันหมดอายุใน DB และสถานะบัญชี
 * middleware ตรวจแค่ลายเซ็น การเพิกถอนสิทธิ์จริงเกิดขึ้นที่นี่
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!dbConfigured()) return null;
  const jar = await cookies();
  const sessionId = await verifyValue(jar.get(SESSION_COOKIE)?.value);
  if (!sessionId) return null;

  try {
    const { rows } = await query<SessionUser>(
      `SELECT u.id, u.email, COALESCE(ru.name, u.name) AS name, u.picture, u.role, rc.display_name AS roster_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN risk_units ru ON ru.id = u.risk_unit_id
       LEFT JOIN department_login_codes rc ON rc.user_id=u.id AND rc.active
       WHERE s.id = $1 AND s.expires_at > now() AND u.active
         AND (u.risk_unit_id IS NULL OR ru.active)
         AND (u.email !~ '^admin-unit-[0-9]+@units[.]invalid$' OR EXISTS (
           SELECT 1 FROM risk_units admin_unit
           WHERE u.email = 'admin-unit-' || admin_unit.id || '@units.invalid'
             AND admin_unit.active AND lower(trim(admin_unit.name)) = 'admin'
         ))`,
      [sessionId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
});

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/**
 * ป้องกัน API อ่านข้อมูลเมื่อเชื่อมฐานข้อมูลจริง แต่ยังเปิด demo mode ที่ไม่มี DB
 * ให้ทำงานได้ตามเดิม (middleware จะเปิด demo เฉพาะเมื่อไม่มี OAuth ด้วย)
 */
export async function requireReadAccess(): Promise<NextResponse | null> {
  if (!dbConfigured()) return null;
  const auth = await requireRole('viewer');
  return auth.ok ? null : auth.response;
}

/**
 * ใช้ต้นทางของ route handler ที่เขียนข้อมูล:
 *   const auth = await requireRole('editor');
 *   if (!auth.ok) return auth.response;
 */
export async function requireRole(minimum: Role): Promise<AuthResult> {
  if (!dbConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Database not configured — cannot save' }, { status: 503 }),
    };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (RANK[user.role] < RANK[minimum]) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden — ต้องมีสิทธิ์ระดับ ${minimum} ขึ้นไป (สิทธิ์ปัจจุบัน: ${user.role})` },
        { status: 403 },
      ),
    };
  }
  return { ok: true, user };
}

/** บันทึก audit log — ห้ามทำให้ request ล้มถ้าเขียน log ไม่ได้ */
export async function audit(
  user: SessionUser | null,
  action: string,
  entity?: string,
  entityId?: string | number | null,
  detail?: unknown,
): Promise<void> {
  try {
    const { ip } = await clientMeta();
    await query(
      `INSERT INTO audit_log (user_id, user_email, action, entity, entity_id, detail, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user?.id ?? null,
        user?.email ?? null,
        action,
        entity ?? null,
        entityId != null ? String(entityId) : null,
        detail == null ? null : JSON.stringify(detail),
        ip,
      ],
    );
  } catch (err) {
    console.error('audit log failed:', err);
  }
}
