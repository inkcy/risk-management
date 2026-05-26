export default function CulturePage() {
  return (
    <>
      <div className="glow-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
          System &amp; Spirituality for Safety
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>วัฒนธรรมความปลอดภัย — High Reliability Organization</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 780 }}>
          รากฐานของ Patient Safety ไม่ใช่เพียง SOP หรือ Checklist แต่คือวิธีคิดเชิงระบบ (Systems Thinking) และวัฒนธรรมที่บุคลากรทุกระดับรู้สึกปลอดภัยที่จะรายงานข้อผิดพลาด เรียนรู้ และปรับปรุงร่วมกัน
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">HRO 5 มิติ — High Reliability Organization</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { name: 'Preoccupation with Failure', pct: 70, badge: 'badge-green', desc: 'หมกมุ่นกับความล้มเหลว — มองทุกความสำเร็จเป็นโอกาสที่ความล้มเหลวจะเกิด ใส่ใจ near miss, small failure ก่อนกลายเป็นเหตุใหญ่ ใช้เครื่องมือเช่น FMEA' },
              { name: 'Reluctance to Simplify', pct: 35, badge: 'badge-amber', desc: 'ไม่ลดทอนความซับซ้อน — ไม่ด่วนสรุปสาเหตุง่ายๆ ไม่ติด status quo หาคำอธิบายที่ลึกและรอบด้านกว่า' },
              { name: 'Sensitivity to Operation', pct: 25, badge: 'badge-red', desc: 'ตื่นรู้ในหน้างาน — โฟกัสที่ Work-As-Done (ของจริง) ไม่ใช่ Work-As-Imagine (ตามตำรา) ฟัง qualitative knowledge จากผู้ปฏิบัติ' },
              { name: 'Commitment to Resilience', pct: 80, badge: 'badge-green', desc: 'ยืดหยุ่นและฟื้นคืน — Elasticity (รับแรงกระแทกแล้วยังทำงานได้) + Recovery (ฟื้นจากวิกฤตได้)' },
              { name: 'Deference to Expertise', pct: 20, badge: 'badge-red', desc: 'ยอมรับผู้เชี่ยวชาญในหน้างาน — Expertise = Knowledge + Credibility + Trust ไม่ใช่ตำแหน่ง; การตัดสินใจไหลไปหาคนที่รู้สถานการณ์จริง' },
            ].map(d => (
              <div key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span>
                  <span className={`badge ${d.badge}`}>{d.pct}%</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55 }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">5 องค์ประกอบของ Safety Culture (James Reason)</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              {[
                { abbr: 'IN', name: 'Informed Culture', desc: 'รู้สิ่งที่กำลังเกิดและสิ่งที่อาจเกิด — evidence-based', bg: 'var(--blue-bg)', color: 'var(--accent)' },
                { abbr: 'RE', name: 'Reporting Culture', desc: 'กล้ารายงานเหตุการณ์และ near miss โดยไม่กลัวถูกลงโทษ', bg: 'var(--green-bg)', color: 'var(--green)' },
                { abbr: 'FL', name: 'Flexible Culture', desc: 'ปรับโครงสร้างได้เมื่อสถานการณ์เปลี่ยน อำนาจไหลไปหาผู้เชี่ยวชาญ', bg: 'var(--amber-bg)', color: 'var(--amber)' },
                { abbr: 'JU', name: 'Just Culture', desc: 'แยก human error ออกจาก reckless behavior — ลงโทษเฉพาะที่ตั้งใจ ไม่โทษคนที่พลาดจากระบบ', bg: 'var(--purple-bg)', color: '#a088f8' },
                { abbr: 'LE', name: 'Learning Culture', desc: 'เรียนรู้และเปลี่ยนแปลงจากบทเรียน ไม่ทำ RCA แล้วเก็บใส่แฟ้ม', bg: 'var(--red-bg)', color: 'var(--red)' },
            ].map(c => (
              <div key={c.abbr} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 8, background: c.bg, color: c.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, flexShrink: 0,
                }}>{c.abbr}</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 11, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              </div>
            ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Psychological Safety — Mayo Clinic Model</div></div>
            <div className="card-body" style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text2)' }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>นิยาม:</span> การรับรู้ของคนในทีมว่าสามารถพูดความเห็น ตั้งคำถาม หรือยอมรับความผิดพลาดได้โดยไม่ถูกลงโทษหรืออับอาย
              </div>
              <ul style={{ margin: '8px 0 0 16px', padding: 0, color: 'var(--text3)', fontSize: 11, lineHeight: 1.7 }}>
                <li>Mutual respect — Professional tone of communication</li>
                <li>Flattened hierarchy ระหว่างวิชาชีพ</li>
                <li>Management of disruptive behavior</li>
                <li>Encourage concerns และ feedback อย่างจริงจัง</li>
                <li>Celebrate &amp; praise new ideas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div className="card-title">System Thinking — เปลี่ยนกระบวนทัศน์การมองปัญหา</div></div>
        <div className="card-body">
          <div className="grid-3">
            {[
              ['The Parts', 'The Whole'],
              ['Objects', 'Relationship'],
              ['Hierarchy', 'Multileveled Network'],
              ['Structure', 'Process'],
              ['Analysis', 'Context'],
            ].map(([from, to]) => (
              <div key={from} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--bg3)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>เดิม</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>{from}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>→</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>ใหม่</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{to}</div>
              </div>
            ))}
            <div style={{ padding: 14, border: '1px solid rgba(79,142,247,0.3)', borderRadius: 'var(--r-sm)', background: 'var(--blue-bg)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4 }}>หัวใจ</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--accent)' }}>เห็นทั้งระบบ</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>เห็นความสัมพันธ์ ไม่หาคนผิด — หา process ที่ปล่อยให้ผิดได้</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
