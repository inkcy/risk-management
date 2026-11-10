import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

const scrypt = promisify(scryptCallback);
export const RISK_UNIT_COOKIE = 'risk_unit_session';
export const riskCookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 };

export async function hashUnitPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function checkUnitPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
export function tokenDigest(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function newUnitToken(): string { return randomBytes(32).toString('base64url'); }
export async function getRiskUnit(userId: number): Promise<{ id: number; name: string } | null> {
  const token = (await cookies()).get(RISK_UNIT_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const { rows } = await query<{ id: number; name: string }>(
    `SELECT u.id, u.name FROM risk_unit_sessions s JOIN risk_units u ON u.id=s.unit_id
     JOIN users account ON account.id=s.user_id
     WHERE s.token_hash=$1 AND s.user_id=$2 AND s.expires_at > now() AND u.active
       AND (account.email !~ '^supervisor-[0-9]+@units[.]invalid$'
         OR account.email = 'supervisor-' || u.id || '@units.invalid')`, [tokenDigest(token), userId],
  );
  return rows[0] ?? null;
}
