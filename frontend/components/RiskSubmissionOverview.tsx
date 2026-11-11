'use client';

import { useState } from 'react';
import type { RiskSubmission } from '@/lib/riskSubmissions';

type Unit = { id: number; name: string };
type RiskPeriod = { unit_id: number; year: number; quarter: number; category: 'clinical' | 'nonclinical' };

export function RiskSubmissionOverview({ units, submissions }: { units: Unit[]; risks: RiskPeriod[]; submissions: RiskSubmission[] }) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(() => {
    const today = new Date();
    return today.getFullYear() + 543 + (today.getMonth() >= 9 ? 1 : 0);
  });
  const matchingUnits = units.filter(unit => unit.name.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')));

  return <section className="card" style={{ marginBottom: 16 }}>
    <div className="card-header"><h2 className="card-title">ติดตามข้อมูล Risk Profile รายไตรมาส</h2></div>
    <div className="card-body">
      <label>ปีงบประมาณ พ.ศ. <input type="number" min={2500} max={2700} value={year} onChange={event => setYear(Number(event.target.value))} /></label>
      <label style={{ display: 'block', marginTop: 12 }}>ค้นหาหน่วยงาน <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="พิมพ์ชื่อหน่วยงาน" /></label>
      <p style={{ margin: '10px 0', color: 'var(--text2)' }}>กด ✓ เพื่อดูข้อมูลปัจจุบันของหน่วยงานในไตรมาสที่ยืนยันส่งแล้ว</p>
      <div style={{ overflowX: 'auto' }}><table className="data-table">
        <thead><tr><th scope="col">หน่วยงาน</th>{[1, 2, 3, 4].map(quarter => <th scope="col" key={quarter} style={{ borderLeft: '1px solid var(--border, #dbe5e9)' }}>ไตรมาส {quarter}</th>)}</tr></thead>
        <tbody>{matchingUnits.map(unit => <tr key={unit.id}><th scope="row">{unit.name}</th>{[1, 2, 3, 4].map(quarter => {
          const submission = submissions.find(item => item.unit_id === unit.id && item.year === year && item.quarter === quarter);
          return <td key={quarter} style={{ borderLeft: '1px solid var(--border, #dbe5e9)' }}>{submission && <a href={`/risk-profile?unit=${unit.id}&year=${year}&quarter=${quarter}#risk-profile-details`} aria-label={`ดู Risk Profile ${unit.name} ปี ${year} ไตรมาส ${quarter}`} title="ดู Risk Profile" style={{ color: 'var(--green)', fontSize: 20, fontWeight: 'bold', display: 'inline-block', padding: '4px 8px' }}>✓</a>}</td>;
        })}</tr>)}</tbody>
      </table></div>
      {!units.length && <p>ยังไม่มีหน่วยงานที่เปิดใช้งาน</p>}
      {!!units.length && !matchingUnits.length && <p>ไม่พบหน่วยงานที่ค้นหา</p>}
    </div>
  </section>;
}
