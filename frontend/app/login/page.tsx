import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { oauthConfigured } from '@/lib/googleOauth';
import { dbConfigured } from '@/lib/db';

const ERRORS: Record<string, string> = {
  config: 'ระบบยังตั้งค่าไม่ครบ — ดูรายการที่ขาดด้านล่าง',
  cancelled: 'คุณยกเลิกการเข้าสู่ระบบที่หน้าของ Google',
  invalid: 'คำขอไม่ถูกต้อง กรุณาลองเข้าสู่ระบบใหม่',
  expired: 'คำขอหมดอายุ (เกิน 10 นาที) กรุณาลองใหม่',
  domain: 'อีเมลนี้ไม่อยู่ในโดเมนที่โรงพยาบาลอนุญาต',
  disabled: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
  failed: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
};

/** ชื่อ env ที่ยังขาด — แสดงแค่ชื่อตัวแปร ไม่มีค่าใด ๆ หลุดออกไป */
function missingConfig(): string[] {
  return [
    !process.env.GOOGLE_CLIENT_ID && 'GOOGLE_CLIENT_ID',
    !process.env.GOOGLE_CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
    (process.env.SESSION_SECRET?.length ?? 0) < 32 && 'SESSION_SECRET',
    !dbConfigured() && 'POSTGRES_URL',
  ].filter((v): v is string => typeof v === 'string');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith('/') ? next : '/');

  const ready = oauthConfigured() && dbConfigured();
  const missing = ready ? [] : missingConfig();
  const signInHref = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      background: `
        radial-gradient(760px 420px at 12% -8%, var(--purple-bg), transparent 60%),
        radial-gradient(640px 380px at 92% 108%, var(--tile-blue), transparent 62%),
        var(--bg)
      `,
    }}>
      <div style={{ width: '100%', maxWidth: 412 }}>
        <div style={{
          background: 'var(--bg2)',
          borderRadius: 22,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          padding: '38px 34px 30px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 58, height: 58, margin: '0 auto 18px',
            borderRadius: 18,
            background: 'linear-gradient(140deg, var(--accent), var(--accent2))',
            boxShadow: '0 10px 26px rgba(123,97,255,0.34)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldMark />
          </div>

          <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 7px' }}>
            ระบบบริหารความเสี่ยง
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 26px', lineHeight: 1.6 }}>
            Hospital Risk Management
            <br />
            เข้าสู่ระบบด้วยบัญชีของโรงพยาบาล
          </p>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              background: 'var(--red-bg)',
              color: 'var(--red)',
              borderRadius: 12, padding: '11px 13px',
              fontSize: 12.5, lineHeight: 1.6, textAlign: 'left',
              marginBottom: 18,
            }}>
              <span aria-hidden="true" style={{ lineHeight: 1.45 }}>⚠</span>
              <span>{ERRORS[error] ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}</span>
            </div>
          )}

          {ready ? (
            <a href={signInHref} className="google-btn">
              <GoogleMark />
              เข้าสู่ระบบด้วย Google
            </a>
          ) : (
            <div style={{
              background: 'var(--bg3)', borderRadius: 14,
              padding: '15px 16px', textAlign: 'left',
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                ยังเปิดใช้งานการเข้าสู่ระบบไม่ได้
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 11 }}>
                ผู้ดูแลระบบต้องตั้งค่าตัวแปรต่อไปนี้ก่อน (ขั้นตอนอยู่ใน README)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {missing.map(name => (
                  <code
                    key={name}
                    style={{
                      fontSize: 11, padding: '4px 9px', borderRadius: 999,
                      background: 'var(--red-bg)', color: 'var(--red)',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  >
                    {name}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        <p style={{
          fontSize: 11.5, color: 'var(--text3)',
          margin: '18px auto 0', maxWidth: 360,
          lineHeight: 1.75, textAlign: 'center',
        }}>
          ระบบนี้มีข้อมูลสุขภาพส่วนบุคคล การเข้าใช้งานทุกครั้งถูกบันทึกไว้เพื่อการตรวจสอบ
          <br />
          ผู้ใช้ใหม่จะได้สิทธิ์ <strong style={{ color: 'var(--text2)' }}>ผู้ดูอย่างเดียว</strong> จนกว่าผู้ดูแลระบบจะเลื่อนสิทธิ์ให้
        </p>
      </div>
    </div>
  );
}

function ShieldMark() {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.6 5 5.4v5.5c0 4.4 2.9 8.4 7 9.5 4.1-1.1 7-5.1 7-9.5V5.4l-7-2.8Z"
        stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"
      />
      <path d="M12 8.4v6M9 11.4h6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
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
