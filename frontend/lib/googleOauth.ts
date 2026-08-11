import type { NextRequest } from 'next/server';
import type { GoogleProfile } from './auth';

export function oauthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    (process.env.SESSION_SECRET?.length ?? 0) >= 32
  );
}

/**
 * ต้องตรงกับ "Authorized redirect URI" ที่ลงทะเบียนไว้ใน Google Cloud Console เป๊ะ ๆ
 * ตั้ง APP_URL บน Vercel เพื่อล็อกโดเมนให้แน่นอน (ไม่งั้นจะอิงตามโดเมนที่ผู้ใช้เปิดเข้ามา)
 */
export function redirectUri(request: NextRequest): string {
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin;
  return `${base}/api/auth/callback/google`;
}

interface TokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface IdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
}

function decodeIdToken(idToken: string): IdTokenClaims {
  const payload = idToken.split('.')[1];
  if (!payload) throw new Error('id_token รูปแบบไม่ถูกต้อง');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  // ชื่อภาษาไทยใน claim เป็น UTF-8 — atob คืน byte string จึงต้องถอดอีกชั้น
  const decoded = new TextDecoder().decode(Uint8Array.from(json, c => c.charCodeAt(0)));
  return JSON.parse(decoded) as IdTokenClaims;
}

/**
 * แลก authorization code เป็นโปรไฟล์ผู้ใช้
 *
 * id_token รับมาจาก endpoint ของ Google โดยตรงผ่าน TLS (ไม่ได้ผ่านเบราว์เซอร์)
 * จึงไม่ต้องตรวจลายเซ็นซ้ำตามที่ Google ระบุไว้ แต่ยังต้องตรวจ aud/iss/exp กัน token ผิดที่
 */
export async function exchangeCodeForProfile(code: string, redirect: string): Promise<GoogleProfile> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
  });

  const token = (await response.json()) as TokenResponse;
  if (!response.ok || !token.id_token) {
    throw new Error(`แลก token ไม่สำเร็จ: ${token.error_description ?? token.error ?? response.status}`);
  }

  const claims = decodeIdToken(token.id_token);

  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('id_token ออกให้แอปอื่น');
  if (!/^(https:\/\/)?accounts\.google\.com$/.test(claims.iss ?? '')) throw new Error('ผู้ออก id_token ไม่ถูกต้อง');
  if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error('id_token หมดอายุ');
  if (claims.email_verified !== true && claims.email_verified !== 'true') throw new Error('อีเมลยังไม่ได้ยืนยันกับ Google');
  if (!claims.sub || !claims.email) throw new Error('id_token ไม่มี sub หรือ email');

  return { sub: claims.sub, email: claims.email, name: claims.name, picture: claims.picture };
}
