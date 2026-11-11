'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MatrixAiAnalysis } from './MatrixAiAnalysis';
import { RiskMatrixAssessment } from './RiskMatrixAssessment';
import { riskFrequency, unitRiskColors, type RiskType } from '@/lib/unitRiskMatrix';

export type SmartRisk = { id: number; unit_id: number; unit_name: string; year: number; quarter: number; category: RiskType; title: string; occurrence_count: number; impact: number };
const levels = { red: 'สูงมาก', orange: 'สูง', yellow: 'ปานกลาง', green: 'ต่ำ' };
const priority = { red: 4, orange: 3, yellow: 2, green: 1 };
const colors = { red: 'var(--red)', orange: 'var(--amber)', yellow: '#a67900', green: 'var(--green)' };

export function SmartRiskProfile({ units, risks, aiEnabled=false }: { aiEnabled?: boolean; units: { id: number; name: string }[]; risks: SmartRisk[] }) {
  const years = [...new Set(risks.map(risk => risk.year))].sort((a, b) => b - a);
  const currentDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const currentFiscalYear = Number(currentDate.find(part => part.type === 'year')!.value) + 543 + (Number(currentDate.find(part => part.type === 'month')!.value) >= 10 ? 1 : 0);
  const [unit, setUnit] = useState(units.length === 1 ? String(units[0].id) : '');
  const [year, setYear] = useState(String(years[0] ?? currentFiscalYear));
  const [quarter, setQuarter] = useState(String(risks.find(risk => String(risk.year) === year)?.quarter ?? 1));
  const [category, setCategory] = useState<RiskType>('clinical');
  const [search, setSearch] = useState('');
  const filtered = risks.filter(risk => (!unit || risk.unit_id === Number(unit)) && String(risk.year) === year && String(risk.quarter) === quarter && risk.category === category);
  const scored = filtered.map(risk => {
    const frequency = riskFrequency(risk.occurrence_count, risk.year, risk.quarter).column;
    const color = unitRiskColors[risk.category][risk.impact - 1][frequency - 1];
    return { ...risk, frequency, color, pair: `${risk.impact},${frequency}` };
  }).sort((a, b) => priority[b.color] - priority[a.color] || b.impact - a.impact || b.frequency - a.frequency || b.occurrence_count - a.occurrence_count || a.id - b.id);
  const shown = scored.filter(risk => `${risk.title} ${risk.unit_name}`.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')));

  return <div className="smart-risk-profile">
    <div className="card" style={{ padding: 22, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 24, marginBottom: 6 }}>Smart Risk Profile</h1><p style={{ color: 'var(--text2)' }}>ภาพรวมและลำดับความสำคัญจากทะเบียนความเสี่ยงของหน่วยงาน</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><a href="#risk-analysis" className="tb-btn tb-btn-ghost">วิเคราะห์และส่งออก Word</a><Link href="/risk-profile" className="tb-btn tb-btn-primary">จัดการ Risk Profile</Link></div>
      </div>
      <div className="smart-risk-filters">
        <label>หน่วยงาน<select value={unit} onChange={event => { setUnit(event.target.value); }}><option value="">ทุกหน่วยงานที่มีสิทธิ์ดู</option>{units.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>ปีงบประมาณ<select value={year} onChange={event => { setYear(event.target.value); }}>{(years.length ? years : [Number(year)]).map(item => <option key={item}>{item}</option>)}</select></label>
        <label>ไตรมาส<select value={quarter} onChange={event => { setQuarter(event.target.value); }}>{[1,2,3,4].map(item => <option key={item} value={item}>ไตรมาส {item}</option>)}</select></label>
        <label>ด้านความเสี่ยง<select value={category} onChange={event => { setCategory(event.target.value as RiskType); }}><option value="clinical">ด้านคลินิก</option><option value="nonclinical">ด้านทั่วไป</option></select></label>
      </div>
    </div>

    <div className="smart-risk-stats">
      <div className="card" style={{ padding: 18 }}><p>ความเสี่ยงทั้งหมด</p><strong style={{ fontSize: 30 }}>{scored.length}</strong><small> รายการ</small></div>
      {(Object.keys(levels) as (keyof typeof levels)[]).map(level => <div className="card" key={level} style={{ padding: 18, borderTop: `3px solid ${colors[level]}` }}><p>ระดับ{levels[level]}</p><strong style={{ fontSize: 30, color: colors[level] }}>{scored.filter(risk => risk.color === level).length}</strong><small> รายการ</small></div>)}
    </div>

    {!filtered.length && <div className="card" role="status" style={{ padding: 24, marginBottom: 16 }}><h2 style={{ fontSize: 18 }}>ยังไม่มีข้อมูลในช่วงที่เลือก</h2><p style={{ marginTop: 8, color: 'var(--text2)' }}>ลองเลือกปี ไตรมาส หรือด้านความเสี่ยงอื่น หรือเพิ่มข้อมูลที่หน้า Risk Profile</p></div>}

    <section className="card" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>รายการความเสี่ยงตามลำดับความสำคัญ</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}><label style={{ flex: '1 1 200px' }}>ค้นหาความเสี่ยงหรือหน่วยงาน<input className="smart-risk-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="พิมพ์คำค้น" /></label></div>
      <p role="status" style={{ marginBottom: 10, color: 'var(--text2)' }}>แสดง {shown.length} จาก {scored.length} รายการ · เรียงตามระดับสี แล้วตามผลกระทบ โอกาสเกิด และจำนวนครั้ง</p>
      <div style={{ overflowX: 'auto' }}><table className="smart-risk-table"><thead><tr><th>ความเสี่ยง / หน่วยงาน</th><th>จำนวนครั้ง</th><th>ผลกระทบ</th><th>ความถี่</th><th>คู่ประเมิน (ผลกระทบ, โอกาสเกิด)</th><th>ระดับ</th></tr></thead><tbody>{shown.map(risk => <tr key={risk.id}><td><strong>{risk.title}</strong><br /><small style={{ color: 'var(--text2)' }}>{risk.unit_name}</small></td><td>{risk.occurrence_count}</td><td>{risk.impact}</td><td>{risk.frequency}</td><td>({risk.pair})</td><td style={{ color: colors[risk.color], fontWeight: 600 }}>{levels[risk.color]}</td></tr>)}{!shown.length && <tr><td colSpan={6}>ไม่พบรายการตามตัวกรองที่เลือก</td></tr>}</tbody></table></div>
    </section>
    <div id="risk-analysis" style={{marginTop:20,scrollMarginTop:90}}><MatrixAiAnalysis aiEnabled={aiEnabled} profileItems={shown.map(risk=>({title:risk.title,subtopic:risk.unit_name,severity:category==='clinical'?['A–B','C–D','E','F','G–I'][risk.impact-1]:String(risk.impact),frequency:risk.occurrence_count}))} profileOptions={{type:category,basis:'quarter',year:Number(year),quarter:Number(quarter)}} profileUnitName={units.find(item=>String(item.id)===unit)?.name??'ทุกหน่วยงานที่มีสิทธิ์ดู'}/></div>
    <details className="card" style={{padding:20,marginTop:16}}><summary style={{cursor:'pointer',fontWeight:600}}>ประเมิน Risk Matrix ด้วยตนเอง</summary><div style={{marginTop:16}}><RiskMatrixAssessment/></div></details>
  </div>;
}
