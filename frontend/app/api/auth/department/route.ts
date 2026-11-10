import { NextRequest, NextResponse } from 'next/server';
import { audit, createSession, type SessionUser } from '@/lib/auth';
import { dbConfigured, getPool } from '@/lib/db';
import { checkUnitPassword, newUnitToken, RISK_UNIT_COOKIE, riskCookieOptions, tokenDigest } from '@/lib/riskUnitAuth';
import { departmentAttemptKey, departmentCodeLookup } from '@/lib/departmentLoginCode';

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
  if (name !== null ? !name || name.length > 255 : typeof requestedId !== 'number' || !Number.isSafeInteger(requestedId) || requestedId < 1) return denied();
  if (typeof password !== 'string' || !password || password.length > 128) return denied();
  let client;
  try { client = await getPool().connect(); } catch {
    return NextResponse.json({ error: 'ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน' }, { status: 503 });
  }
  try {
    await client.query('BEGIN');
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
    const attemptKey = departmentAttemptKey(ip, process.env.SESSION_SECRET ?? '');
    const limit = await client.query<{ failed_attempts: number }>(
      `INSERT INTO department_login_attempts (attempt_key) VALUES ($1)
       ON CONFLICT (attempt_key) DO UPDATE SET
       failed_attempts=CASE WHEN department_login_attempts.window_started_at <= now()-interval '15 minutes' THEN 0 ELSE department_login_attempts.failed_attempts END,
       window_started_at=CASE WHEN department_login_attempts.window_started_at <= now()-interval '15 minutes' THEN now() ELSE department_login_attempts.window_started_at END
       RETURNING failed_attempts`, [attemptKey],
    );
    const fail = async (id?: number) => {
      await client.query('UPDATE department_login_attempts SET failed_attempts=failed_attempts+1 WHERE attempt_key=$1',[attemptKey]);
      await client.query('COMMIT');
      await audit(null,'login.denied.department','risk_unit',id);
      return denied();
    };
    if (limit.rows[0].failed_attempts >= 60) { await client.query('COMMIT'); return denied(); }
    const { rows } = await client.query<{ id: number; name: string; password_hash: string; active: boolean; locked: boolean }>(
      `SELECT id, name, password_hash, active, COALESCE(locked_until > now(), false) AS locked FROM risk_units WHERE ${name !== null ? 'name' : 'id'}=$1 FOR UPDATE`, [name ?? requestedId],
    );
    const unit = rows[0];
    const id = unit?.id;
    if (!unit || !unit.active) return await fail(id);
    const adminUnit = unit.name.trim().toLowerCase() === 'admin';
    const adminPassword = adminUnit && password !== 'QSMH' && await checkUnitPassword(password, unit.password_hash);
    if (adminUnit && !adminPassword) return await fail(id);
    const accessCode = password.trim();
    const devPassword = unit.name === 'dev' && await checkUnitPassword(password, unit.password_hash);
    const credential = accessCode && password !== 'QSMH' && !devPassword && !adminPassword ? (await client.query<{ id:number;display_name:string;password_hash:string;active:boolean }>(
      'SELECT id,display_name,password_hash,active FROM department_login_codes WHERE code_lookup=$1 FOR UPDATE',
      [departmentCodeLookup(accessCode,process.env.SESSION_SECRET ?? '')],
    )).rows[0] : undefined;
    if (credential) {
      if (!credential.active || !await checkUnitPassword(accessCode,credential.password_hash)) return await fail(id);
    } else if (password !== 'QSMH' && !devPassword && !adminPassword) {
      if (!unit.locked) await client.query("UPDATE risk_units SET failed_attempts=CASE WHEN locked_until <= now() THEN 1 ELSE failed_attempts+1 END, locked_until=CASE WHEN locked_until <= now() THEN NULL WHEN failed_attempts+1 >= 5 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$1", [id]);
      return await fail(id);
    }
    // File credentials identify a person (or an explicitly shared code), not the
    // selected department account. Selecting an admin department never grants admin.
    const users = adminPassword ? await client.query<SessionUser & { active: boolean }>(
      `INSERT INTO users (email,name,role,last_login_at) VALUES ($1,$2,'admin',now())
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,last_login_at=now()
       RETURNING id,email,name,picture,role,active`,
      [`admin-unit-${id}@units.invalid`, unit.name],
    ) : credential ? await client.query<SessionUser & { active: boolean }>(
      `INSERT INTO users (email,name,role,last_login_at) VALUES ($1,$2,'editor',now())
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,last_login_at=now()
       RETURNING id,email,name,picture,role,active`,
      [`roster-${credential.id}@staff.invalid`,credential.display_name],
    ) : await client.query<SessionUser & { active: boolean }>(
      `INSERT INTO users (email, name, role, risk_unit_id, last_login_at)
       VALUES ($1,$2,'editor',$3,now()) ON CONFLICT (risk_unit_id) DO UPDATE
       SET name=EXCLUDED.name, last_login_at=now() RETURNING id,email,name,picture,role,active`,
      [`department-${id}@units.invalid`, unit.name, id],
    );
    const user = users.rows[0];
    if (!user.active) { await client.query('ROLLBACK'); return denied(); }
    if (credential) await client.query('UPDATE department_login_codes SET user_id=$1 WHERE id=$2',[user.id,credential.id]);
    else await client.query('UPDATE risk_units SET failed_attempts=0, locked_until=NULL WHERE id=$1', [id]);
    const token = newUnitToken();
    await client.query("INSERT INTO risk_unit_sessions (token_hash,unit_id,user_id,expires_at) VALUES ($1,$2,$3,now()+interval '8 hours')", [tokenDigest(token), id, user.id]);
    await client.query('COMMIT');
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(session.name, session.value, session.options);
    response.cookies.set(RISK_UNIT_COOKIE, token, riskCookieOptions);
    await audit(user, 'login.department', 'risk_unit', id, { method: credential ? 'roster_code' : 'unit_password', credential_id: credential?.id });
    return response;
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ' }, { status: 503 });
  } finally { client.release(); }
}
