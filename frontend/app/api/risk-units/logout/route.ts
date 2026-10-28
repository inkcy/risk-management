import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { RISK_UNIT_COOKIE, riskCookieOptions, tokenDigest } from '@/lib/riskUnitAuth';

export async function POST() {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  const token = (await cookies()).get(RISK_UNIT_COOKIE)?.value;
  if (token && token.length <= 128) await query('DELETE FROM risk_unit_sessions WHERE token_hash=$1 AND user_id=$2', [tokenDigest(token), auth.user.id]);
  const response = NextResponse.json({ ok: true }); response.cookies.set(RISK_UNIT_COOKIE, '', { ...riskCookieOptions, maxAge: 0 }); return response;
}
