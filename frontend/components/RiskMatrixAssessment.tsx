'use client';

import { useState } from 'react';
import { unitRiskColors as matrixColors } from '@/lib/unitRiskMatrix';
import { generalSeverities } from '@/lib/incident-severity';

const frequency = ['Remote · 0 ครั้ง', 'Uncommon · ไม่เกิน 1 ครั้ง/ปี', 'Occasional · มากกว่า 1–36 ครั้ง/ปี', 'Probable · มากกว่า 36–624 ครั้ง/ปี', 'Frequent · มากกว่า 624 ครั้ง/ปี'];
const clinical = ['A–B · อันตรายเล็กน้อย', 'C–D · อันตรายเล็กน้อย แก้ไขได้ง่าย', 'E · อันตรายปานกลาง ต้องรักษา', 'F · อันตรายรุนแรง อาจสูญเสียอวัยวะ', 'G–I · เสียชีวิตหรือทุพพลภาพถาวร'];
const nonClinical = ['1 · ไม่เกิน 10,000 บาท', '2 · 10,001–100,000 บาท', '3 · 100,001–500,000 บาท', '4 · 500,001–10,000,000 บาท', '5 · มากกว่า 10 ล้านบาท'];
const colorLabels = { green: 'เขียว', yellow: 'เหลือง', orange: 'ส้ม', red: 'แดง' };

export function RiskMatrixAssessment() {
  const [type, setType] = useState<'clinical' | 'nonclinical'>('clinical');
  const [likelihood, setLikelihood] = useState(1);
  const [impact, setImpact] = useState(1);
  const impacts = type === 'clinical' ? clinical : nonClinical;
  const selectedColor = matrixColors[type][impact - 1][likelihood - 1];

  return <section className="card" style={{ marginBottom: 16 }}>
    <div className="card-header"><div><div className="card-title">ประเมินความเสี่ยงโดยจับคู่</div><div className="announcement-subtitle">เลือกประเภท ความถี่ และผลกระทบ หรือกดช่องจุดตัดในตาราง</div></div></div>
    <div className="card-body">
      <div className="risk-assessment-fields">
        <label>ประเภทความเสี่ยง<select value={type} onChange={e => setType(e.target.value as 'clinical' | 'nonclinical')}><option value="clinical">Clinical</option><option value="nonclinical">Non-Clinical</option></select></label>
        <label>ความถี่<select value={likelihood} onChange={e => setLikelihood(Number(e.target.value))}>{frequency.map((label, i) => <option key={label} value={i + 1}>{i + 1} · {label}</option>)}</select></label>
        <label>ผลกระทบ<select value={impact} onChange={e => setImpact(Number(e.target.value))}>{impacts.map((label, i) => <option key={label} value={i + 1}>{label}</option>)}</select></label>
      </div>
      <div className="risk-assessment-table-wrap"><table className="risk-assessment-table"><tbody>
        {[5,4,3,2,1].map(i => <tr key={i}><th>{impacts[i-1]}</th>{[1,2,3,4,5].map(l => { const color = matrixColors[type][i-1][l-1]; return <td key={l}><button type="button" aria-label={`${impacts[i-1]}, ${frequency[l-1]}, สี${colorLabels[color]}`} aria-pressed={impact === i && likelihood === l} className={`risk-matrix-pick risk-color-${color}`} onClick={() => { setImpact(i); setLikelihood(l); }}>{colorLabels[color]}</button></td>; })}</tr>)}
      </tbody><tfoot><tr><th>ผลกระทบ / ความถี่</th>{frequency.map((f, i) => <th key={f} className="risk-frequency-heading"><strong>{i + 1}</strong><br />{f}</th>)}</tr></tfoot></table></div>
      <p className="risk-assessment-result">ผลการจับคู่: <strong>สี{colorLabels[selectedColor]}</strong> · {impacts[impact - 1]} · {frequency[likelihood - 1]}</p>
      {type === 'nonclinical' && <p style={{marginTop:12,lineHeight:1.8}}>{generalSeverities[impact-1].description}</p>}
      <p style={{ color: 'var(--text3)', fontSize: 12.6, marginTop: 8 }}>สีตามแบบฟอร์ม FM-QPS-QSMH-007/04 ซึ่งไม่ได้ระบุคะแนนตัวเลขในแต่ละช่อง · ผลประเมินนี้ยังไม่ได้บันทึกลงทะเบียน</p>
    </div>
  </section>;
}
