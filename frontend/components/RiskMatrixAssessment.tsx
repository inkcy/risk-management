'use client';

import { useState } from 'react';

const frequency = ['Remote · ยากที่จะเกิด (0 ครั้ง)', 'Uncommon · ทุกปี (1 ครั้ง)', 'Occasional · ทุกเดือน (2–3 ครั้ง)', 'Probable · ทุกสัปดาห์ (4–12 ครั้ง)', 'Frequent · ทุกวัน (มากกว่า 12 ครั้ง)'];
const clinical = ['A–B · อันตรายเล็กน้อย', 'C–D · อันตรายเล็กน้อย แก้ไขได้ง่าย', 'E · อันตรายปานกลาง ต้องรักษา', 'F · อันตรายรุนแรง อาจสูญเสียอวัยวะ', 'G–I · เสียชีวิตหรือทุพพลภาพถาวร'];
const nonClinical = ['1 · 0–10,000 บาท', '2 · 10,001–50,000 บาท', '3 · 50,001–250,000 บาท', '4 · 250,001–10,000,000 บาท', '5 · มากกว่า 10 ล้านบาท'];

export function RiskMatrixAssessment() {
  const [type, setType] = useState<'clinical' | 'nonclinical'>('clinical');
  const [likelihood, setLikelihood] = useState(1);
  const [impact, setImpact] = useState(1);
  const score = likelihood * impact;
  const level = score >= 15 ? 'วิกฤต' : score >= 10 ? 'สูง' : score >= 5 ? 'ปานกลาง' : 'ต่ำ';
  const impacts = type === 'clinical' ? clinical : nonClinical;

  return <section className="card" style={{ marginBottom: 16 }}>
    <div className="card-header"><div><div className="card-title">ประเมินความเสี่ยงโดยจับคู่</div><div className="announcement-subtitle">เลือกประเภท ความถี่ และผลกระทบ หรือกดช่องจุดตัดในตาราง</div></div></div>
    <div className="card-body">
      <div className="risk-assessment-fields">
        <label>ประเภทความเสี่ยง<select value={type} onChange={e => setType(e.target.value as 'clinical' | 'nonclinical')}><option value="clinical">Clinical</option><option value="nonclinical">Non-Clinical</option></select></label>
        <label>ความถี่<select value={likelihood} onChange={e => setLikelihood(Number(e.target.value))}>{frequency.map((label, i) => <option key={label} value={i + 1}>{i + 1} · {label}</option>)}</select></label>
        <label>ผลกระทบ<select value={impact} onChange={e => setImpact(Number(e.target.value))}>{impacts.map((label, i) => <option key={label} value={i + 1}>{label}</option>)}</select></label>
      </div>
      <div className="risk-assessment-table-wrap"><table className="risk-assessment-table"><thead><tr><th>ผลกระทบ \ ความถี่</th>{frequency.map((f, i) => <th key={f} title={f}>{i + 1}</th>)}</tr></thead><tbody>
        {[5,4,3,2,1].map(i => <tr key={i}><th>{impacts[i-1]}</th>{[1,2,3,4,5].map(l => { const s = i*l; return <td key={l}><button type="button" aria-label={`ผลกระทบ ${i} ความถี่ ${l} คะแนน ${s}`} aria-pressed={impact === i && likelihood === l} className={`risk-matrix-pick ${s >= 15 ? 'mx-crit' : s >= 10 ? 'mx-high' : s >= 5 ? 'mx-med' : 'mx-low'}`} onClick={() => { setImpact(i); setLikelihood(l); }}>{s}</button></td>; })}</tr>)}
      </tbody></table></div>
      <p className="risk-assessment-result">คะแนน {likelihood} × {impact} = <strong>{score}</strong> · ระดับ {level}</p>
      <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>คะแนนและระดับใช้เกณฑ์เดิมของระบบ (ต่ำ 1–4, ปานกลาง 5–9, สูง 10–14, วิกฤต 15–25) ผลประเมินนี้ยังไม่ได้บันทึกลงทะเบียน</p>
    </div>
  </section>;
}
