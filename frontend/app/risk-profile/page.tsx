import { query, dbConfigured } from '@/lib/db';
import type { RiskRegisterItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function riskLevel(score: number) {
  if (score >= 15) return { label: 'วิกฤต', badge: 'badge-red' };
  if (score >= 10) return { label: 'สูง', badge: 'badge-red' };
  if (score >= 5) return { label: 'ปานกลาง', badge: 'badge-amber' };
  return { label: 'ต่ำ', badge: 'badge-green' };
}

export default async function RiskProfilePage() {
  let risks: RiskRegisterItem[] = [];
  let error = '';
  if (!dbConfigured()) {
    error = 'ยังไม่ได้เชื่อมต่อฐานข้อมูล จึงไม่สามารถแสดงทะเบียนความเสี่ยงได้';
  } else {
    try {
      const result = await query<RiskRegisterItem>(`
        SELECT id, title, likelihood, consequence, category, note,
               likelihood * consequence AS score
        FROM risk_register ORDER BY likelihood * consequence DESC, id DESC
      `);
      risks = result.rows;
    } catch (err) {
      console.error('load risk profile failed:', err);
      error = 'ไม่สามารถโหลดทะเบียนความเสี่ยงได้ กรุณาลองใหม่ภายหลัง';
    }
  }

  return (
    <>
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title">แบบฟอร์มและเอกสารอ้างอิง</div></div>
      <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <a className="tb-btn tb-btn-ghost" href="/risk-profile/risk-profile-form.pdf" target="_blank" rel="noreferrer">เปิดแบบฟอร์มบัญชีความเสี่ยง (PDF)</a>
        <a className="tb-btn tb-btn-ghost" href="/risk-profile/risk-matrix-1.docx" download>ดาวน์โหลด Risk Matrix (1)</a>
        <a className="tb-btn tb-btn-ghost" href="/risk-profile/risk-matrix-2.docx" download>ดาวน์โหลด Risk Matrix (2)</a>
        <a className="tb-btn tb-btn-primary" href="/matrix">ประเมิน Risk Matrix</a>
      </div>
    </section>
    <section className="card">
      <div className="card-header">
        <div><div className="card-title">Risk Profile · ทะเบียนความเสี่ยง</div>
          <div className="announcement-subtitle">เรียงตามคะแนนความเสี่ยงจากสูงไปต่ำ · คะแนน = โอกาสเกิด × ผลกระทบ</div></div>
        <span className="badge badge-blue">{risks.length} รายการ</span>
      </div>
      <div className="card-body">
        {error ? <p className="announcement-error" role="alert">{error}</p> : risks.length === 0 ? (
          <p className="announcement-empty">ยังไม่มีข้อมูลในทะเบียนความเสี่ยง</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ความเสี่ยง</th><th>ประเภท</th><th>โอกาสเกิด</th><th>ผลกระทบ</th><th>คะแนน</th><th>ระดับ</th><th>หมายเหตุ</th></tr></thead>
              <tbody>{risks.map(risk => {
                const level = riskLevel(risk.score);
                return <tr key={risk.id}>
                  <td>{risk.title}</td><td>{risk.category || '—'}</td><td>{risk.likelihood}</td>
                  <td>{risk.consequence}</td><td>{risk.score}</td><td><span className={`badge ${level.badge}`}>{level.label}</span></td><td>{risk.note || '—'}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
    </>
  );
}
