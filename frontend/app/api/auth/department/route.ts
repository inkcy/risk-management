import { NextRequest, NextResponse } from 'next/server';
import { audit, createSession, type SessionUser } from '@/lib/auth';
import { dbConfigured, getPool } from '@/lib/db';
import { checkUnitPassword, newUnitToken, RISK_UNIT_COOKIE, riskCookieOptions, tokenDigest } from '@/lib/riskUnitAuth';
import { loginUnitDirectory as riskUnitDirectory } from '@/lib/riskUnitDirectory';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  if (!dbConfigured()) return NextResponse.json({ error: 'ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 400 }); }
  const requestedId = body?.unitId;
  const name = typeof body?.unitName === 'string' ? body.unitName.trim() : null;
  const password = body?.password;
  const denied = () => NextResponse.json({ error: 'หน่วยงานหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกพักชั่วคราว' }, { status: 401 });
  if (name !== null ? !riskUnitDirectory.some(unit => unit === name) : typeof requestedId !== 'number' || !Number.isSafeInteger(requestedId) || requestedId < 1) return denied();
  if (typeof password !== 'string' || !password || password.length > 128) return denied();
  let client;
  try { client = await getPool().connect(); } catch {
    return NextResponse.json({ error: 'ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน' }, { status: 503 });
  }
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: number; name: string; password_hash: string; active: boolean; locked: boolean }>(
      `SELECT id, name, password_hash, active, COALESCE(locked_until > now(), false) AS locked FROM risk_units WHERE ${name !== null ? 'name' : 'id'}=$1 FOR UPDATE`, [name ?? requestedId],
    );
    const unit = rows[0];
    const id = unit?.id;
    if (!unit || !unit.active || unit.locked || !await checkUnitPassword(password, unit.password_hash)) {
      if (unit?.active && !unit.locked) await client.query("UPDATE risk_units SET failed_attempts=CASE WHEN locked_until <= now() THEN 1 ELSE failed_attempts+1 END, locked_until=CASE WHEN locked_until <= now() THEN NULL WHEN failed_attempts+1 >= 5 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$1", [id]);
      await client.query('COMMIT');
      await audit(null, 'login.denied.department', 'risk_unit', id);
      return denied();
    }
    const users = await client.query<SessionUser & { active: boolean }>(
      `INSERT INTO users (email, name, role, risk_unit_id, last_login_at)
       VALUES ($1,$2,'editor',$3,now()) ON CONFLICT (risk_unit_id) DO UPDATE
       SET name=EXCLUDED.name, last_login_at=now() RETURNING id,email,name,picture,role,active`,
      [`department-${id}@units.invalid`, unit.name, id],
    );
    const user = users.rows[0];
    if (!user.active) { await client.query('ROLLBACK'); return denied(); }
    await client.query('UPDATE risk_units SET failed_attempts=0, locked_until=NULL WHERE id=$1', [id]);
    const token = newUnitToken();
    await client.query("INSERT INTO risk_unit_sessions (token_hash,unit_id,user_id,expires_at) VALUES ($1,$2,$3,now()+interval '8 hours')", [tokenDigest(token), id, user.id]);
    await client.query('COMMIT');
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(session.name, session.value, session.options);
    response.cookies.set(RISK_UNIT_COOKIE, token, riskCookieOptions);
    await audit(user, 'login.department', 'risk_unit', id);
    return response;
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ' }, { status: 503 });
  } finally { client.release(); }
}
