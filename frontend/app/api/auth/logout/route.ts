import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { audit, destroySession, getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user) await audit(user, 'logout', 'user', user.id);
  await destroySession();

  const response = NextResponse.redirect(new URL('/login', request.nextUrl.origin), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
