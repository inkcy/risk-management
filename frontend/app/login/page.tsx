import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { oauthConfigured } from '@/lib/googleOauth';
import { dbConfigured } from '@/lib/db';

const ERRORS: Record<string, string> = {
  config: 'ระบบยังตั้งค่าไม่ครบ — ต้องมี GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET และ POSTGRES_URL',
  cancelled: 'คุณยกเลิกการเข้าสู่ระบบที่หน้าของ Google',
  invalid: 'คำขอไม่ถูกต้อง กรุณาลองเข้าสู่ระบบใหม่',
  expired: 'คำขอหมดอายุ (เกิน 10 นาที) กรุณาลองใหม่',
  domain: 'อีเมลนี้ไม่อยู่ในโดเมนที่โรงพยาบาลอนุญาต',
  disabled: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
  failed: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith('/') ? next : '/');

  const ready = oauthConfigured() && dbConfigured();
  const signInHref = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'var(--bg1, #0a0d14)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🏥</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>
            ระบบบริหารความเสี่ยง
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 24px' }}>
            Hospital Risk Management · เข้าสู่ระบบด้วยบัญชีของโรงพยาบาล
          </p>

          {error && (
            <div style={{
              background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.35)',
              color: '#ff8f8f', borderRadius: 8, padding: '10px 12px',
              fontSize: 13, textAlign: 'left', marginBottom: 18,
            }}>
              {ERRORS[error] ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}
            </div>
          )}

          {ready ? (
            <a
              href={signInHref}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '11px 16px', borderRadius: 8,
                background: '#fff', color: '#3c4043', fontSize: 14, fontWeight: 500,
                textDecoration: 'none', border: '1px solid #dadce0',
              }}
            >
              <GoogleMark />
              เข้าสู่ระบบด้วย Google
            </a>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, textAlign: 'left' }}>
              ยังเปิดใช้งานการเข้าสู่ระบบไม่ได้ — ผู้ดูแลระบบต้องตั้งค่า
              <code> GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>,
              <code> SESSION_SECRET</code> และ <code>POSTGRES_URL</code> ก่อน
              (ดูขั้นตอนใน README)
            </div>
          )}

          <p style={{ fontSize: 11.5, color: 'var(--text3)', margin: '22px 0 0', lineHeight: 1.7 }}>
            ระบบนี้มีข้อมูลสุขภาพส่วนบุคคล การเข้าใช้งานทุกครั้งถูกบันทึกไว้เพื่อการตรวจสอบ
            ผู้ใช้ใหม่จะได้สิทธิ์ <strong>ผู้ดูอย่างเดียว</strong> จนกว่าผู้ดูแลระบบจะเลื่อนสิทธิ์ให้
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
