export default function CompassionPage() {
  const opportunities = [
    { n: 1, color: 'var(--red)', title: 'Event Occurs', desc: 'Activate CANDOR Response team · Preliminary review · Impact scene' },
    { n: 2, color: 'var(--amber)', title: 'In-depth Review', desc: 'Interviews · Chart reviews · Site visit · Develop timeline · Identify core-review team' },
    { n: 3, color: 'var(--accent)', title: 'Confirmation & Consensus', desc: 'Share findings · Obtain consensus on contributing factors กับผู้เกี่ยวข้องทั้งหมด' },
    { n: 4, color: '#a088f8', title: 'Solution Meetings', desc: 'Develop targeted solutions ที่แก้ที่ root cause ไม่ใช่อาการ' },
    { n: 5, color: 'var(--green)', title: 'Follow Up', desc: 'Evaluate & measure solutions · Finalize event review documents' },
  ];
  const spirituality = [
    ['IKIGAI', 'ความหมายของการมีอยู่ — เหตุผลที่ตื่นไปทำงานทุกเช้า'],
    ['Flow', 'การจมดิ่งกับงานจนลืมเวลา'],
    ['Art in Work', 'ความงามและความประณีตในรายละเอียดของการดูแล'],
    ['LiA', 'Listening into Action — ฟัง pain point จากหน้างานแล้วลงมือ'],
    ['Camaraderie', 'มิตรภาพและการสนับสนุนระหว่างทีม'],
    ['A-I-C', 'Appreciate–Influence–Control — กรอบการมองบทบาทในการเปลี่ยนแปลง'],
    ['3rd Alt.', 'Synergy — ทางเลือกที่ดีกว่าทั้งของฉันและของคุณ'],
  ];

  return (
    <>
      <div className="glow-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
          Compassionate Engagement · Trauma-Informed Care
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Compassionate RCA — RCA ด้วยความเมตตา</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 780 }}>
          เหตุการณ์ไม่พึงประสงค์สร้าง Trauma ทั้งต่อผู้ป่วย ครอบครัว และบุคลากร — RCA ที่ดีต้องไม่ทำให้ Trauma ซ้ำเติม แต่เป็นโอกาสให้เกิด Healing และการเรียนรู้ร่วมกัน
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">5 Opportunities of Compassion — CANDOR Response</div>
          <span className="badge badge-purple">Trauma Transformed</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {opportunities.map(o => (
              <div key={o.n} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg3)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: o.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, marginBottom: 10,
                }}>{o.n}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{o.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{o.desc}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'var(--blue-bg)', borderLeft: '3px solid var(--accent)',
            borderRadius: 'var(--r-sm)', fontSize: 11, color: 'var(--text2)', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--accent)' }}>CANDOR</strong> = Communication and Optimal Response — ทุกขั้นทำด้วย Compassion ไม่ใช่หาคนผิด แต่หาโอกาสในการเยียวยาและปรับปรุงระบบไปพร้อมกัน
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Event → Experience → Effect (Trauma)</div></div>
          <div className="card-body" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 6, fontWeight: 600 }}>Event</span>
              <span style={{ color: 'var(--text3)' }}>→</span>
              <span style={{ padding: '6px 12px', background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: 6, fontWeight: 600 }}>Experience</span>
              <span style={{ color: 'var(--text3)' }}>→</span>
              <span style={{ padding: '6px 12px', background: 'var(--purple-bg)', color: '#a088f8', borderRadius: 6, fontWeight: 600 }}>Effect (Trauma)</span>
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 11, lineHeight: 1.7 }}>
              เหตุการณ์เดียวกัน ผู้คนอาจรับรู้ต่างกัน และผลกระทบทางใจอาจกินเวลายาวกว่าผลทางกาย — Trauma-Informed RCA จึงเริ่มจากการสร้าง shared language เพื่อ define, normalize, address trauma ทั้งของผู้ป่วยและบุคลากร
            </div>
            <div className="divider"></div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', lineHeight: 1.7 }}>
              &quot;Openness และการได้มีส่วนร่วมในการหาทางแก้ทำให้กระบวนการสอบสวนไม่ซ้ำเติม trauma จากเหตุการณ์&quot; — Kathryn (ผู้ป่วย CANDOR)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">หลักคิดสนับสนุน — Spirituality &amp; Joy in Work</div></div>
          <div className="card-body" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {spirituality.map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, minWidth: 80 }}>{key}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div className="card-title">Compassionate Care Bundle</div></div>
        <div className="card-body">
          <div className="action-grid">
            <div className="action-card" style={{ borderColor: 'rgba(160,136,248,0.3)' }}>
              <div className="action-icon-wrap" style={{ background: 'var(--purple-bg)', color: '#a088f8' }}>♡</div>
              <div className="action-title">Open Disclosure</div>
              <div className="action-desc">เปิดเผยเหตุการณ์ต่อผู้ป่วย/ครอบครัวอย่างซื่อตรง พร้อมแสดงความเสียใจ ไม่ปิดบัง</div>
            </div>
            <div className="action-card" style={{ borderColor: 'rgba(79,142,247,0.3)' }}>
              <div className="action-icon-wrap icon-wrap-blue">👥</div>
              <div className="action-title">Second Victim Support</div>
              <div className="action-desc">ดูแลบุคลากรที่เกี่ยวข้องในเหตุการณ์ — ผู้ก่อเหตุไม่ได้ตั้งใจ และเป็นเหยื่อของระบบเช่นกัน</div>
            </div>
            <div className="action-card" style={{ borderColor: 'rgba(62,207,142,0.3)' }}>
              <div className="action-icon-wrap icon-wrap-green">⚖</div>
              <div className="action-title">Just Culture Review</div>
              <div className="action-desc">แยก human error / at-risk / reckless — ตอบสนองให้เหมาะกับประเภทของพฤติกรรม</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
