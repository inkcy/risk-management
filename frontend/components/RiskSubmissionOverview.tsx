'use client';

import { useMemo, useState } from 'react';
import type { RiskSubmission } from '@/lib/riskSubmissions';

type Unit = { id: number; name: string };
type RiskPeriod = { unit_id: number; year: number; quarter: number; category: 'clinical' | 'nonclinical' };

export function RiskSubmissionOverview({ units, risks, submissions }: { units: Unit[]; risks: RiskPeriod[]; submissions: RiskSubmission[] }) {
  const [year, setYear] = useState(() => {
    const today = new Date();
    return today.getFullYear() + 543 + (today.getMonth() >= 9 ? 1 : 0);
  });
  const counts = useMemo(() => {
    const result = new Map<string, { clinical: number; nonclinical: number }>();
    for (const risk of risks) {
      if (risk.year !== year) continue;
      const key = `${risk.unit_id}-${risk.quarter}`;
      const count = result.get(key) ?? { clinical: 0, nonclinical: 0 };
      count[risk.category]++;
      result.set(key, count);
    }
    return result;
  }, [risks, year]);

  return <section className="card" style={{ marginBottom: 16 }}>
    <div className="card-header"><h2 className="card-title">ติดตามข้อมูล Risk Profile รายไตรมาส</h2></div>
    <div className="card-body">
      <label>ปีงบประมาณ พ.ศ. <input type="number" min={2500} max={2700} value={year} onChange={event => setYear(Number(event.target.value))} /></label>
      <p style={{ margin: '10px 0', color: 'var(--text2)' }}>สถานะส่งแล้วอ้างอิงจากการยืนยันของหน่วยงาน จำนวนรายการเป็นข้อมูลปัจจุบันแยกตามประเภท</p>
      <div style={{ overflowX: 'auto' }}><table className="data-table">
        <thead><tr><th scope="col">หน่วยงาน</th>{[1, 2, 3, 4].map(quarter => <th scope="col" key={quarter}>ไตรมาส {quarter}</th>)}</tr></thead>
        <tbody>{units.map(unit => <tr key={unit.id}><th scope="row">{unit.name}</th>{[1, 2, 3, 4].map(quarter => {
          const count = counts.get(`${unit.id}-${quarter}`);
          const submission = submissions.find(item => item.unit_id === unit.id && item.year === year && item.quarter === quarter);
          return <td key={quarter}><strong style={{ color: submission ? 'var(--green)' : 'var(--text3)' }}>{submission ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}</strong>{submission && <><br /><small>{new Date(submission.submitted_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</small></>}<br /><small>Clinical {count?.clinical ?? 0} · Non-Clinical {count?.nonclinical ?? 0}</small></td>;
        })}</tr>)}</tbody>
      </table></div>
      {!units.length && <p>ยังไม่มีหน่วยงานที่เปิดใช้งาน</p>}
    </div>
  </section>;
}
