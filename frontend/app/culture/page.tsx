const results = [
  { year: '2564', excellent: '13.3', veryGood: '56.8', combined: '70.1' },
  { year: '2565', excellent: '14.5', veryGood: '52.8', combined: '67.3' },
  { year: '2566', excellent: '18.2', veryGood: '54.1', combined: '72.3' },
  { year: '2567', excellent: '18.2', veryGood: '56.8', combined: '75.0' },
];

export default function CulturePage() {
  return <>
    <div className="glow-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>ผลการสำรวจวัฒนธรรมความปลอดภัยของโรงพยาบาลออนไลน์</div>
      <p style={{ marginTop: 6, color: 'var(--text2)', fontSize: 12 }}>Hospital Safety Culture Survey Online · ข้อมูลจากรายงานผลสำรวจปี 2566 และ 2567</p>
    </div>
    <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
      {[results[2], results[3]].map(result => <div className="stat-card blue" key={result.year}>
        <div className="stat-label">ระดับความปลอดภัย ดีเยี่ยม + ดีมาก · ปี {result.year}</div>
        <div className="stat-val">{result.combined}%</div>
      </div>)}
    </div>
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title">ระดับความปลอดภัยของผู้ป่วย ปี 2564–2567</div></div>
      <div className="card-body">
        <p style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 12 }}>ร้อยละความคิดเห็นของผู้ตอบแบบสำรวจ จำแนกระดับดีเยี่ยมและดีมาก</p>
        <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>ปีงบประมาณ</th><th>ดีเยี่ยม</th><th>ดีมาก</th><th>รวมดีเยี่ยมและดีมาก</th></tr></thead>
          <tbody>{results.map(result => <tr key={result.year}><td>{result.year}</td><td>{result.excellent}%</td><td>{result.veryGood}%</td><td><strong>{result.combined}%</strong></td></tr>)}</tbody>
        </table></div>
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 12 }}>ที่มา: สไลด์ผลการสำรวจ HSCS ปี 2567 หน้า 5 · ตัวเลขแสดงตามรายงานต้นฉบับ</p>
      </div>
    </section>
    <section className="card">
      <div className="card-header"><div className="card-title">รายงานผลสำรวจฉบับเต็ม</div></div>
      <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <a className="tb-btn tb-btn-ghost" href="/culture/survey-2566.pptx" download>ดาวน์โหลดรายงานปี 2566</a>
        <a className="tb-btn tb-btn-ghost" href="/culture/survey-2567.pptx" download>ดาวน์โหลดรายงานปี 2567</a>
      </div>
    </section>
  </>;
}
