import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, cookieOptions, randomToken, signValue } from '@/lib/session';
import { oauthConfigured, redirectUri } from '@/lib/googleOauth';

export const runtime = 'nodejs';

/** เริ่ม Google OAuth — พาไปหน้าเลือกบัญชีของ Google */
export async function GET(request: NextRequest) {
  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL('/login?error=config', request.nextUrl.origin));
  }

  const next = request.nextUrl.searchParams.get('next') ?? '/';
  // รับเฉพาะ path ภายในเว็บ กัน open redirect
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const state = randomToken(24);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', redirectUri(request));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, await signValue(`${state}:${safeNext}`), {
    ...cookieOptions,
    maxAge: 600, // 10 นาทีพอสำหรับล็อกอินหนึ่งครั้ง
  });
  return response;
}
