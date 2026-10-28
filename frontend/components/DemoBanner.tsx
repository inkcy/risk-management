interface Props {
  error: string | null;
}

export function DemoBanner({ error }: Props) {
  if (!error) return null;
  const isDemo = error.includes('POSTGRES_URL is not set');
  return (
    <div style={{
      marginBottom: 16,
      padding: '10px 14px',
      borderRadius: 'var(--r-sm)',
      border: isDemo ? '1px solid rgba(245,165,36,0.35)' : '1px solid rgba(226,81,74,0.35)',
      background: isDemo ? 'rgba(245,165,36,0.08)' : 'var(--red-bg)',
      color: isDemo ? 'var(--amber)' : 'var(--red)',
      fontSize: 13.8,
      lineHeight: 1.55,
    }}>
      {isDemo ? (
        <><strong>Demo mode</strong> — ยังไม่ได้เชื่อมฐานข้อมูล กำลังแสดงข้อมูลตัวอย่าง</>
      ) : (
        <><strong>โหลดข้อมูลไม่สำเร็จ</strong> — กรุณาลองรีเฟรชหน้า หรือติดต่อผู้ดูแลระบบหากยังพบปัญหา</>
      )}
    </div>
  );
}
