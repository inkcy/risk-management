'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { riskFrequency, unitRiskColors, type RiskType } from '@/lib/unitRiskMatrix';

type Unit = { id: number; name: string };
type Risk = { id: number; unit_id: number; year: number; quarter: number; category: RiskType; title: string; occurrence_count: number; impact: number };
const impacts = ['Negligible · A–B / 1', 'Minor · C–D / 2', 'Moderate · E / 3', 'Major · F / 4', 'Catastrophic · G–I / 5'];
const frequencies = ['Remote', 'Uncommon', 'Occasional', 'Probable', 'Frequent'];

export function UnitRiskProfiles({ units, risks, canLogout }: { units: Unit[]; risks: Risk[]; canLogout: boolean }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(units[0]?.id ?? 0);
  const [year, setYear] = useState(() => { const now = new Date(); return now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0); });
  const [quarter, setQuarter] = useState(() => Math.floor(((new Date().getMonth() + 3) % 12) / 3) + 1);
  const [category, setCategory] = useState<RiskType>('clinical');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const selected = risks.filter(r => r.unit_id === unitId && r.year === year && r.quarter === quarter && r.category === category);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/unit-risks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unit_id: unitId, year, quarter, category, title: values.get('title'), occurrence_count: Number(values.get('occurrence_count')), impact: Number(values.get('impact')) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'บันทึกไม่สำเร็จ'); form.reset(); router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (!window.confirm('ยืนยันการลบรายการความเสี่ยงนี้?')) return;
    setBusy(true); setError('');
    try { const response = await fetch(`/api/unit-risks?id=${id}`, { method: 'DELETE' }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'ลบไม่สำเร็จ'); router.refresh(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  if (!units.length) return <div className="card" style={{ padding: 18 }}>ยังไม่มีบัญชีหน่วยงาน กรุณาให้แอดมินสร้างบัญชีก่อน</div>;
  return <>
    <section className="card" style={{ marginBottom: 16 }}><div className="card-header"><div className="card-title">Risk Profile ตามหน่วยงาน</div>{canLogout && <button className="tb-btn tb-btn-ghost" type="button" onClick={async () => { const response = await fetch('/api/risk-units/logout', { method: 'POST' }); if (response.ok) router.refresh(); else setError('ออกจากระบบหน่วยงานไม่สำเร็จ'); }}>ออกจากหน่วยงาน</button>}</div><div className="card-body">
      <div className="risk-assessment-fields">
        <label>หน่วยงาน<select value={unitId} onChange={e => setUnitId(Number(e.target.value))}>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label>ปีงบประมาณ พ.ศ.<input type="number" min="2500" max="2700" value={year} onChange={e => setYear(Number(e.target.value))} /></label>
        <label>ไตรมาส<select value={quarter} onChange={e => setQuarter(Number(e.target.value))}>{[1,2,3,4].map(q => <option key={q} value={q}>{q}</option>)}</select></label>
        <label>ประเภท<select value={category} onChange={e => setCategory(e.target.value as RiskType)}><option value="clinical">Clinical</option><option value="nonclinical">Non-Clinical</option></select></label>
      </div>
      <div className="risk-assessment-table-wrap"><table className="risk-assessment-table unit-risk-table"><tbody>
        {[5,4,3,2,1].map(i => <tr key={i}><th>{impacts[i-1]}</th>{[1,2,3,4,5].map(col => {
          const items = selected.filter(r => r.impact === i && riskFrequency(r.occurrence_count, r.year, r.quarter).column === col);
          return <td key={col} className={`risk-color-${unitRiskColors[category][i-1][col-1]}`}><ul>{items.map(r => <li key={r.id}>{r.title}<small>{r.occurrence_count} ครั้ง · {riskFrequency(r.occurrence_count,r.year,r.quarter).annualRate.toFixed(1)} ครั้ง/ปี</small></li>)}</ul></td>;
        })}</tr>)}
      </tbody><tfoot><tr><th>ผลกระทบ / ความถี่</th>{frequencies.map(f => <th key={f} className="risk-frequency-heading">{f}</th>)}</tr></tfoot></table></div>
      <p style={{ color: 'var(--text2)', marginTop: 12, fontSize: 13 }}>คำนวณจำนวนครั้ง ÷ จำนวนวันในไตรมาส × 365.2425 วัน: 0 = Remote, มากกว่า 0 ถึง 1 ครั้ง/ปี = Uncommon, มากกว่า 1 ถึง 36 ครั้ง/ปี = Occasional, มากกว่า 36 ถึง 624 ครั้ง/ปี = Probable, มากกว่า 624 ครั้ง/ปี = Frequent</p>
      <p style={{ color: 'var(--text3)', marginTop: 6, fontSize: 12 }}>ช่วงที่ต้นฉบับไม่ได้ระบุใช้การจัดเข้าช่วงถัดไปที่ครอบคลุม และสมมติอัตราเฉลี่ยคงที่ตลอดปี · โปรดทบทวนผลก่อนนำไปใช้</p>
      {error && <p className="announcement-error" role="alert">{error}</p>}
    </div></section>
    <section className="card"><div className="card-header"><div className="card-title">เพิ่มรายการความเสี่ยง</div></div><div className="card-body">
      <form className="survey-form" onSubmit={add}>
        <label>ชื่อความเสี่ยง<input name="title" required maxLength={300} /></label>
        <div className="survey-form-grid"><label>จำนวนครั้งในไตรมาส<input name="occurrence_count" type="number" min="0" max="10000000" step="1" required /></label><label>ผลกระทบ<select name="impact" required>{impacts.map((text,i) => <option value={i+1} key={text}>{text}</option>)}</select></label></div>
        <button className="tb-btn tb-btn-primary" disabled={busy} type="submit">บันทึกรายการ</button>
      </form>
      {selected.length > 0 && <div style={{ marginTop: 20 }}><h3>รายการในช่วงที่เลือก</h3>{selected.map(r => <div key={r.id} className="unit-risk-list-item"><span>{r.title} · {r.occurrence_count} ครั้ง</span><button className="announcement-delete" type="button" onClick={() => remove(r.id)} disabled={busy}>ลบ</button></div>)}</div>}
    </div></section>
  </>;
}
