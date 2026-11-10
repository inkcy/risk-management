import { createHmac } from 'node:crypto';

function digest(kind: string, value: string, secret: string) {
  if (secret.length < 32) throw new Error('ระบบเข้าสู่ระบบยังตั้งค่าไม่ครบ');
  return createHmac('sha256', secret).update(`${kind}:v1:${value}`).digest('hex');
}
export function departmentCodeLookup(code: string, secret: string) {
  if (!code || code.length > 128) throw new Error('รูปแบบรหัสไม่ถูกต้อง');
  return digest('department-login-code', code, secret);
}
export function departmentAttemptKey(ip: string, secret: string) {
  return digest('department-login-attempt', ip, secret);
}
