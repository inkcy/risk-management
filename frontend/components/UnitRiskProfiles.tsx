'use client';
import { FormEvent, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { riskFrequency, unitRiskColors, type RiskType } from '@/lib/unitRiskMatrix';
import type { ImportedRisk } from '@/lib/unitRiskImport';
import { riskKeyword } from '@/lib/riskTitle';

type Unit = { id: number; name: string };
type Risk = { id: number; unit_id: number; year: number; quarter: number; category: RiskType; title: string; occurrence_count: number; impact: number; source_title?: string | null; source_analysis_level?: 'green' | 'yellow' | 'orange' | 'red' | null };
const impacts = ['Negligible · A–B / 1', 'Minor · C–D / 2', 'Moderate · E / 3', 'Major · F / 4', 'Catastrophic · G–I / 5'];
const frequencies = ['Remote', 'Uncommon', 'Occasional', 'Probable', 'Frequent'];
function CompactRiskTitle({ title }: { title: string }) {
  const keyword = riskKeyword(title);
  if (keyword === title) return <span>{title}</span>;
  return <details className="compact-risk-title"><summary title={title}>{keyword}</summary><p>{title}</p></details>;
}
const analysisLevels = [
  { color: 'green', label: 'ต่ำ' },
  { color: 'yellow', label: 'ปานกลาง' },
  { color: 'orange', label: 'สูง' },
  { color: 'red', label: 'สูงมาก' },
] as const;

export function UnitRiskProfiles({ units, risks, canLogout, initialPeriod, defaultUnitId, readOnly = false }: { units: Unit[]; risks: Risk[]; canLogout: boolean; initialPeriod?: { unitId: number; year: number; quarter: number }; defaultUnitId?: number; readOnly?: boolean }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(initialPeriod?.unitId ?? defaultUnitId ?? units[0]?.id ?? 0);
  const [unitSearch, setUnitSearch] = useState<string | null>(null);
  const unitListId = useId();
  const [year, setYear] = useState(() => { const now = new Date(); return initialPeriod?.year ?? now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0); });
  const [quarter, setQuarter] = useState(() => initialPeriod?.quarter ?? Math.floor(((new Date().getMonth() + 3) % 12) / 3) + 1);
  const [category, setCategory] = useState<RiskType>('clinical');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportedRisk[]>([]);
  const [importInfo,setImportInfo] = useState('');
  const [importWarnings,setImportWarnings] = useState<string[]>([]);
  const [importMessage,setImportMessage] = useState('');
  function clearPreview() { setPreview([]); setImportInfo(''); setImportWarnings([]); setImportMessage(''); }
  async function readFile(file: File) {
    setBusy(true); setError(''); setPreview([]); setImportMessage('');
    try {
      const form = new FormData(); form.set('file',file);
      const response = await fetch('/api/unit-risks/extract',{method:'POST',body:form});
      const body = await response.json(); if(!response.ok) throw new Error(body.error);
      setPreview(body.items); setImportWarnings(body.warnings);
      setImportInfo(`${file.name} · ${body.unitName ?? ''} · ${body.sourceRows} รายการความเสี่ยง`);
      if(body.year) setYear(body.year); if(body.quarter) setQuarter(body.quarter);
      setCategory('clinical');
      const match=units.find(u=>u.name===body.unitName); if(match) setUnitId(match.id);
    } catch(err) { setError((err as Error).message); } finally {setBusy(false);}
  }
  async function saveImport() {
    setBusy(true); setError('');
    try {
      const response=await fetch('/api/unit-risks/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({unit_id:unitId,year,quarter,category,items:preview.map(i=>({...i,title:`${i.title} [${i.levels}]`}))})});
      const body=await response.json(); if(!response.ok) throw new Error(body.error);
      setImportMessage(`บันทึก ${body.inserted} รายการแยกตามผลกระทบ · ปรับข้อมูลต้นฉบับ ${body.updated ?? 0} รายการ · ข้ามรายการซ้ำ ${body.skipped} รายการ`);setPreview([]);router.refresh();
    } catch(err) {setError((err as Error).message);} finally {setBusy(false);}
  }
  const selected = risks.filter(r => r.unit_id === unitId && r.year === year && r.quarter === quarter && r.category === category);
  const matrixItems = preview.length ? preview.map((r,index)=>({...r,id:-index-1,year,quarter})) : selected;
  const assessedItems = matrixItems.map(r => ({
    ...r,
    color: r.source_analysis_level ?? unitRiskColors[category][r.impact - 1][riskFrequency(r.occurrence_count, r.year, r.quarter).column - 1],
  }));
  const analysisItems = [...assessedItems.reduce((groups, risk) => {
    const key = risk.source_title && risk.source_analysis_level ? `${risk.source_title}\u0000${risk.color}` : `id:${risk.id}`;
    const existing = groups.get(key);
    if (existing) { existing.occurrence_count += risk.occurrence_count; existing.impact = Math.max(existing.impact, risk.impact); }
    else groups.set(key, { ...risk, title: risk.source_title ?? risk.title });
    return groups;
  }, new Map<string, typeof assessedItems[number]>()).values()];
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
    <section id="risk-profile-details" className="card" style={{ marginBottom: 16, scrollMarginTop: 90 }}><div className="card-header"><div className="card-title">Risk Profile ตามหน่วยงาน</div>{canLogout && <button className="tb-btn tb-btn-ghost" type="button" onClick={async () => { const response = await fetch('/api/risk-units/logout', { method: 'POST' }); if (response.ok) router.refresh(); else setError('ออกจากระบบหน่วยงานไม่สำเร็จ'); }}>ออกจากหน่วยงาน</button>}</div><div className="card-body">
      <div className="risk-assessment-fields">
        <label>หน่วยงาน
          <input type="text" list={unitListId} disabled={readOnly} autoComplete="off" placeholder="พิมพ์ค้นหาและเลือกหน่วยงาน" value={unitSearch ?? units.find(u => u.id === unitId)?.name ?? ''} onFocus={e => e.currentTarget.select()} onChange={e => {
            const value = e.target.value;
            const match = units.find(u => u.name === value);
            if (match) { if (match.id !== unitId) { clearPreview(); setUnitId(match.id); } setUnitSearch(null); }
            else setUnitSearch(value);
          }} onBlur={() => setUnitSearch(null)} />
          <datalist id={unitListId}>{units.map(u => <option key={u.id} value={u.name} />)}</datalist>
        </label>
        <label>ปีงบประมาณ พ.ศ.<input disabled={readOnly} type="number" min="2500" max="2700" value={year} onChange={e => { clearPreview(); setYear(Number(e.target.value)); }} /></label>
        <label>ไตรมาส<select disabled={readOnly} value={quarter} onChange={e => { clearPreview(); setQuarter(Number(e.target.value)); }}>{[1,2,3,4].map(q => <option key={q} value={q}>{q}</option>)}</select></label>
        <label>ประเภท<select value={category} onChange={e => { clearPreview(); setCategory(e.target.value as RiskType); }}><option value="clinical">Clinical</option><option value="nonclinical">Non-Clinical</option></select></label>
      </div>
      <h3 style={{ marginTop: 16, marginBottom: 10 }}>ตาราง 5×5 · สีคำนวณตามจำนวนครั้งและผลกระทบ</h3>
      <div className="risk-assessment-table-wrap"><table className="risk-assessment-table unit-risk-table"><tbody>
        {[5,4,3,2,1].map(i => <tr key={i}><th>{impacts[i-1]}</th>{[1,2,3,4,5].map(col => {
          const items = matrixItems.filter(r => r.impact === i && riskFrequency(r.occurrence_count, r.year, r.quarter).column === col);
          return <td key={col} className={`risk-color-${unitRiskColors[category][i-1][col-1]}`}><ul className="risk-analysis-cards">{items.map(r => <li key={r.id}><CompactRiskTitle title={r.title} /><small>{r.occurrence_count} ครั้ง · {riskFrequency(r.occurrence_count,r.year,r.quarter).annualRate.toFixed(1)} ครั้ง/ปี</small></li>)}</ul></td>;
        })}</tr>)}
      </tbody><tfoot><tr><th>ผลกระทบ / ความถี่</th>{frequencies.map(f => <th key={f} className="risk-frequency-heading">{f}</th>)}</tr></tfoot></table></div>
      <h3 style={{ marginTop: 20 }}>การวิเคราะห์ความเสี่ยง (Risk Analysis)</h3>
      <p style={{ color: 'var(--text2)', margin: '8px 0', fontSize: 13 }}>รายการที่นำเข้าจะแสดงระดับตามเครื่องหมายในต้นฉบับและรวมผลกระทบเป็นหนึ่งรายการต่อความเสี่ยง · รายการที่ไม่มีระดับจากต้นฉบับใช้สีคำนวณและระบุไว้แยกกัน</p>
      <div className="risk-assessment-table-wrap"><table className="risk-assessment-table unit-risk-table">
        <thead><tr>{analysisLevels.map(level => <th key={level.color} scope="col">{level.label} {analysisItems.filter(r => r.color === level.color).length} เรื่อง</th>)}</tr></thead>
        <tbody><tr>{analysisLevels.map(level => <td key={level.color} className={`risk-color-${level.color}`}>
          <ul className="risk-analysis-cards">{analysisItems.filter(r => r.color === level.color).map(r => <li key={r.id}><CompactRiskTitle title={r.title} /><small>{r.occurrence_count} ครั้ง · {r.source_analysis_level ? 'ตามต้นฉบับ' : `สีคำนวณ · ผลกระทบ ${r.impact}`}</small></li>)}</ul>
        </td>)}</tr></tbody>
      </table></div>
      <p style={{ color: 'var(--text2)', marginTop: 12, fontSize: 13 }}>คำนวณจำนวนครั้ง ÷ จำนวนวันในไตรมาส × 365.2425 วัน: 0 = Remote, มากกว่า 0 ถึง 1 ครั้ง/ปี = Uncommon, มากกว่า 1 ถึง 36 ครั้ง/ปี = Occasional, มากกว่า 36 ถึง 624 ครั้ง/ปี = Probable, มากกว่า 624 ครั้ง/ปี = Frequent</p>
      <p style={{ color: 'var(--text3)', marginTop: 6, fontSize: 12 }}>ช่วงที่ต้นฉบับไม่ได้ระบุใช้การจัดเข้าช่วงถัดไปที่ครอบคลุม และสมมติอัตราเฉลี่ยคงที่ตลอดปี · โปรดทบทวนผลก่อนนำไปใช้</p>
      {error && <p className="announcement-error" role="alert">{error}</p>}
      {!readOnly && <div style={{marginTop:20}}>
        <h3>นำเข้าตารางความเสี่ยงจาก Word</h3>
        <p>เลือกไฟล์ .doc หรือ .docx ที่มีตารางจำนวนครั้งและระดับ A–I รองรับทั้งจำนวนและเครื่องหมายเลือกผลกระทบ (ไม่เกิน 5 MB) ระบบจะคำนวณสีตามเกณฑ์หน้า Risk Matrix และแสดงตัวอย่างด้านบน</p>
        <input aria-label="เลือกไฟล์ความเสี่ยง Word" type="file" accept=".doc,.docx" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void readFile(file);e.target.value='';}} />
        {busy&&<p role="status">กำลังดำเนินการ…</p>}
        {importMessage&&<p role="status">{importMessage}</p>}
        {preview.length>0&&<>
          <p>{importInfo}</p><p>ตัวอย่างก่อนบันทึก: {units.find(u=>u.id===unitId)?.name} · ปีงบประมาณ {year} · ไตรมาส {quarter} · รวม {preview.reduce((s,i)=>s+i.occurrence_count,0)} ครั้ง</p>
          <p>ตรวจสอบหน่วยงานด้านบนก่อนบันทึก ระดับ A–B = 1, C–D = 2, E = 3, F = 4, G–I = 5</p>
          {importWarnings.map((w,i)=><p role="alert" key={i}>{w}</p>)}
          <div style={{overflowX:'auto'}}><table style={{width:'100%'}}><thead><tr><th>ความเสี่ยง</th><th>ระดับจากไฟล์</th><th>จำนวนครั้ง</th><th>ผลกระทบ</th></tr></thead><tbody>{preview.map((r,i)=><tr key={i}><td>{r.title}</td><td>{r.levels}</td><td>{r.occurrence_count}</td><td>{impacts[r.impact-1]}</td></tr>)}</tbody></table></div>
          <button className="tb-btn tb-btn-primary" disabled={busy} onClick={saveImport}>บันทึกข้อมูลนำเข้า</button>{' '}
          <button className="tb-btn tb-btn-ghost" disabled={busy} onClick={()=>setPreview([])}>ยกเลิกตัวอย่าง</button>
        </>}
      </div>}
    </div></section>
    {!readOnly && <section className="card"><div className="card-header"><div className="card-title">เพิ่มรายการความเสี่ยง</div></div><div className="card-body">
      <form className="survey-form" onSubmit={add}>
        <label>ชื่อความเสี่ยง<input name="title" required maxLength={300} /></label>
        <div className="survey-form-grid"><label>จำนวนครั้งในไตรมาส<input name="occurrence_count" type="number" min="0" max="10000000" step="1" required /></label><label>ผลกระทบ<select name="impact" required>{impacts.map((text,i) => <option value={i+1} key={text}>{text}</option>)}</select></label></div>
        <button className="tb-btn tb-btn-primary" disabled={busy} type="submit">บันทึกรายการ</button>
      </form>
      {selected.length > 0 && <div style={{ marginTop: 20 }}><h3>รายการในช่วงที่เลือก</h3>{selected.map(r => <div key={r.id} className="unit-risk-list-item"><span>{r.title} · {r.occurrence_count} ครั้ง</span><button className="announcement-delete" type="button" onClick={() => remove(r.id)} disabled={busy}>ลบ</button></div>)}</div>}
    </div></section>}
  </>;
}
