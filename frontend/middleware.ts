import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifyValue } from '@/lib/session';

/**
 * ด่านแรก — ตรวจแค่ลายเซ็น cookie เพราะ middleware รันบน Edge ต่อ Postgres ไม่ได้
 * การตรวจว่า session ยังไม่หมดอายุ/บัญชียังใช้งานได้/สิทธิ์พอไหม อยู่ใน getSessionUser() กับ requireRole()
 */
const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/api/health'];

/**
 * เครื่อง dev ที่ยังไม่ได้ตั้งทั้ง DB และ OAuth = demo mode ล้วน ไม่มีข้อมูลจริงให้ปกป้อง จึงเปิดให้ดูได้
 * แต่ถ้ามี POSTGRES_URL แล้ว (มีข้อมูลจริง) จะบังคับล็อกอินเสมอ แม้ตั้ง OAuth ไม่ครบ — ต้อง fail closed
 */
function demoModeOpen(): boolean {
  // อ่าน env ตรง ๆ เพราะ middleware รันบน Edge จะ import lib/db (ที่ใช้ pg) ไม่ได้
  const hasDb = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  return !hasDb && !process.env.GOOGLE_CLIENT_ID;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ส่ง path ปัจจุบันให้ root layout เพื่อยืนยัน session กับฐานข้อมูลอีกชั้น
  // (middleware บน Edge ตรวจได้เพียงลายเซ็น cookie)
  const nextWithPath = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-risk-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  if (demoModeOpen()) return nextWithPath();

  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) {
    return nextWithPath();
  }

  const sessionId = await verifyValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (sessionId) return nextWithPath();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized — กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
