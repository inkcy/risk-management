import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkUnitPassword, newUnitToken, RISK_UNIT_COOKIE, riskCookieOptions, tokenDigest } from '@/lib/riskUnitAuth';

export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[a-z0-9._-]{3,64}$/.test(username) || !password || password.length > 128) return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    const { rows } = await query<{ id: number; password_hash: string; active: boolean; locked: boolean }>('SELECT id, password_hash, active, COALESCE(locked_until > now(), false) AS locked FROM risk_units WHERE username=$1', [username]);
    const unit = rows[0];
    if (!unit || !unit.active || unit.locked || !await checkUnitPassword(password, unit.password_hash)) {
      if (unit && !unit.locked) await query('UPDATE risk_units SET failed_attempts=failed_attempts+1, locked_until=CASE WHEN failed_attempts+1 >= 5 THEN now()+interval \'15 minutes\' ELSE NULL END WHERE id=$1', [unit.id]);
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกพักชั่วคราว' }, { status: 401 });
    }
    await query('UPDATE risk_units SET failed_attempts=0, locked_until=NULL WHERE id=$1', [unit.id]);
    const token = newUnitToken();
    await query('INSERT INTO risk_unit_sessions (token_hash, unit_id, user_id, expires_at) VALUES ($1,$2,$3,now()+interval \'8 hours\')', [tokenDigest(token), unit.id, auth.user.id]);
    const response = NextResponse.json({ ok: true }); response.cookies.set(RISK_UNIT_COOKIE, token, riskCookieOptions); return response;
  } catch (err) { console.error('risk unit login failed:', err); return NextResponse.json({ error: 'เข้าสู่ระบบหน่วยงานไม่สำเร็จ' }, { status: 500 }); }
}
