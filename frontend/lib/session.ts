// เซ็น/ตรวจ cookie ด้วย Web Crypto เท่านั้น — ไฟล์นี้ถูก import จาก middleware (Edge runtime)
// ซึ่งใช้ pg หรือ node:crypto ไม่ได้ จึงห้ามเพิ่ม import ฝั่ง Node เข้ามาในไฟล์นี้

export const SESSION_COOKIE = 'rm_session';
export const OAUTH_STATE_COOKIE = 'rm_oauth_state';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 12; // 12 ชม. — ข้อมูลผู้ป่วยไม่ควรค้าง session ยาว

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET is not set (ต้องยาวอย่างน้อย 32 ตัวอักษร)');
  }
  return value;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** สุ่ม token แบบ URL-safe สำหรับ session id และ OAuth state */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** คืนค่า cookie รูปแบบ `<payload>.<hmac>` */
export async function signValue(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** ตรวจลายเซ็น คืน payload ถ้าถูกต้อง ไม่ถูกต้องคืน null */
export async function verifyValue(cookieValue: string | undefined | null): Promise<string | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = cookieValue.slice(0, dot);
  const signature = cookieValue.slice(dot + 1);
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    return ok ? payload : null;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;
