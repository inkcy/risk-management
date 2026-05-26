export default function SettingsPage() {
  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header"><div className="card-title">ข้อมูลองค์กร</div></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">ชื่อโรงพยาบาล</label>
            <input type="text" defaultValue="โรงพยาบาลตัวอย่าง" />
          </div>
          <div className="form-group">
            <label className="form-label">รหัสสถานพยาบาล</label>
            <input type="text" defaultValue="00000" />
          </div>
          <div className="form-group">
            <label className="form-label">ปีงบประมาณปัจจุบัน</label>
            <input type="text" defaultValue="2568" />
          </div>
          <button className="tb-btn tb-btn-primary">บันทึกการเปลี่ยนแปลง</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">การแจ้งเตือน</div></div>
        <div className="card-body" style={{ fontSize: 13, color: 'var(--text2)' }}>
          {[
            ['แจ้งเตือนอุบัติการณ์ระดับ E ขึ้นไป', true],
            ['แจ้งเตือนเมื่อ RCA ครบกำหนด', true],
            ['รายงานสรุปรายสัปดาห์', false],
          ].map(([label, on], i, arr) => (
            <div key={label as string} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined,
            }}>
              <span>{label}</span>
              <div style={{
                width: 36, height: 20,
                background: on ? 'var(--accent)' : 'var(--bg4)',
                borderRadius: 10, position: 'relative', cursor: 'pointer',
              }}>
                <div style={{
                  width: 16, height: 16,
                  background: on ? 'white' : 'var(--text3)',
                  borderRadius: '50%', position: 'absolute',
                  ...(on ? { right: 2 } : { left: 2 }), top: 2,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
