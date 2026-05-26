interface Props {
  error: string | null;
}

export function DemoBanner({ error }: Props) {
  if (!error) return null;
  return (
    <div style={{
      marginBottom: 16,
      padding: '10px 14px',
      borderRadius: 'var(--r-sm)',
      border: '1px solid rgba(245,165,36,0.35)',
      background: 'rgba(245,165,36,0.08)',
      color: 'var(--amber)',
      fontSize: 12,
      lineHeight: 1.55,
    }}>
      <strong>Demo mode</strong> — ไม่ได้เชื่อมฐานข้อมูล กำลังแสดงข้อมูลตัวอย่าง · ตั้งค่า{' '}
      <code style={{ background: 'rgba(0,0,0,0.18)', padding: '1px 5px', borderRadius: 3 }}>POSTGRES_URL</code>{' '}
      ใน <code style={{ background: 'rgba(0,0,0,0.18)', padding: '1px 5px', borderRadius: 3 }}>.env.local</code>{' '}
      และรัน <code style={{ background: 'rgba(0,0,0,0.18)', padding: '1px 5px', borderRadius: 3 }}>npm run db:migrate &amp;&amp; npm run db:seed</code> เพื่อใช้ข้อมูลจริง
    </div>
  );
}
