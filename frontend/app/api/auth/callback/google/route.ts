import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, verifyValue } from '@/lib/session';
import { exchangeCodeForProfile, oauthConfigured, redirectUri } from '@/lib/googleOauth';
import { audit, createSession, emailDomainAllowed, upsertGoogleUser } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';

export const runtime = 'nodejs';

function loginError(request: NextRequest, code: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, request.nextUrl.origin));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  if (!oauthConfigured() || !dbConfigured()) return loginError(request, 'config');

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return loginError(request, 'cancelled');

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return loginError(request, 'invalid');

  // state ที่ส่งกลับมาต้องตรงกับที่เซ็นไว้ใน cookie — กัน CSRF บนขั้นตอน OAuth
  const stored = await verifyValue(request.cookies.get(OAUTH_STATE_COOKIE)?.value);
  if (!stored) return loginError(request, 'expired');

  const separator = stored.indexOf(':');
  const expectedState = stored.slice(0, separator);
  const next = stored.slice(separator + 1) || '/';
  if (expectedState !== state) return loginError(request, 'invalid');

  try {
    const profile = await exchangeCodeForProfile(code, redirectUri(request));

    if (!emailDomainAllowed(profile.email)) {
      await audit(null, 'login.denied.domain', 'user', null, { email: profile.email });
      return loginError(request, 'domain');
    }

    const user = await upsertGoogleUser(profile);
    if (!user) {
      await audit(null, 'login.denied.disabled', 'user', null, { email: profile.email });
      return loginError(request, 'disabled');
    }

    const cookie = await createSession(user.id);
    await audit(user, 'login', 'user', user.id);

    const response = NextResponse.redirect(new URL(next, request.nextUrl.origin));
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    return loginError(request, 'failed');
  }
}
