import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { audit, destroySession, getSessionUser } from '@/lib/auth';
import { RISK_UNIT_COOKIE, tokenDigest } from '@/lib/riskUnitAuth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user) await audit(user, 'logout', 'user', user.id);
  await destroySession();
  const token = request.cookies.get(RISK_UNIT_COOKIE)?.value;
  if (token) await query('DELETE FROM risk_unit_sessions WHERE token_hash=$1', [tokenDigest(token)]).catch(() => {});

  const response = NextResponse.redirect(new URL('/login', request.nextUrl.origin), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(RISK_UNIT_COOKIE);
  return response;
}
