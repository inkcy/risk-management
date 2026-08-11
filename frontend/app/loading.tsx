/**
 * โครงหน้าจอชั่วคราวระหว่างรอข้อมูล — Next แสดงไฟล์นี้ทันทีที่กดเมนู
 * ทำให้การกดปุ่มรู้สึกตอบสนองทันที แทนที่จะค้างอยู่หน้าเดิมจนกว่าเซิร์ฟเวอร์จะตอบ
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด">
      <div className="stats-row">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="stat-card" style={{ background: 'var(--bg3)' }}>
            <div className="loading-skeleton" style={{ height: 12, width: '55%', marginBottom: 12 }} />
            <div className="loading-skeleton" style={{ height: 26, width: '38%', marginBottom: 10 }} />
            <div className="loading-skeleton" style={{ height: 10, width: '48%' }} />
          </div>
        ))}
      </div>

      <div className="grid-2">
        {[0, 1].map(i => (
          <div key={i} className="card">
            <div className="card-header">
              <div className="loading-skeleton" style={{ height: 13, width: 150 }} />
            </div>
            <div className="card-body">
              {[0, 1, 2, 3, 4].map(r => (
                <div
                  key={r}
                  className="loading-skeleton"
                  style={{ height: 11, width: `${92 - r * 9}%`, marginBottom: 14 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
