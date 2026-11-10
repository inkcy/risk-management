import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { DepartmentLogin } from '@/components/DepartmentLogin';
import { dbConfigured, query } from '@/lib/db';

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
  if (user) redirect(next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/');

  const ready = dbConfigured() && (process.env.SESSION_SECRET?.length ?? 0) >= 32;
  const missing = ready ? [] : missingConfig();
  const units = ready ? (await query<{ name: string }>('SELECT name FROM risk_units WHERE active ORDER BY name')).rows.map(unit => unit.name) : [];

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      backgroundImage: "linear-gradient(var(--page-bg-overlay), var(--page-bg-overlay)), url('/hospital-watercolor-background.png')",
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
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
          <img
            src="/safety-chart-logo.png"
            alt="โลโก้โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา สภากาชาดไทย"
            width={256}
            height={100}
            style={{ display: 'block', width: 256, maxWidth: '100%', height: 'auto', margin: '0 auto 20px' }}
          />

          <h1 style={{ fontSize: 24.2, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 7px' }}>
            ระบบบริหารความเสี่ยง
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text2)', margin: '0 0 26px', lineHeight: 1.6 }}>
            Hospital Risk Management
            <br />
            ค้นหาหน่วยงานและกรอกรหัสผ่านเพื่อเข้าสู่ระบบ
          </p>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              background: 'var(--red-bg)',
              color: 'var(--red)',
              borderRadius: 12, padding: '11px 13px',
              fontSize: 14.4, lineHeight: 1.6, textAlign: 'left',
              marginBottom: 18,
            }}>
              <span aria-hidden="true" style={{ lineHeight: 1.45 }}>⚠</span>
              <span>{ERRORS[error] ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}</span>
            </div>
          )}

          {ready ? (
            <DepartmentLogin units={units} next={next} />
          ) : (
            <div style={{
              background: 'var(--bg3)', borderRadius: 14,
              padding: '15px 16px', textAlign: 'left',
            }}>
              <div style={{ fontSize: 14.4, fontWeight: 600, marginBottom: 4 }}>
                ยังเปิดใช้งานการเข้าสู่ระบบไม่ได้
              </div>
              <div style={{ fontSize: 13.8, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 11 }}>
                กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบการตั้งค่าและบัญชีหน่วยงาน
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {missing.map(name => (
                  <code
                    key={name}
                    style={{
                      fontSize: 12.6, padding: '4px 9px', borderRadius: 999,
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
          fontSize: 13.2, color: 'var(--text3)',
          margin: '18px auto 0', maxWidth: 360,
          lineHeight: 1.75, textAlign: 'center',
        }}>
          ระบบนี้มีข้อมูลสุขภาพส่วนบุคคล การเข้าใช้งานทุกครั้งถูกบันทึกไว้เพื่อการตรวจสอบ
          <br />
          เลือกหน่วยงานของคุณและใช้รหัสผ่านที่ได้รับจากผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
}
