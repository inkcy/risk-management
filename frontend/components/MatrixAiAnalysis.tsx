'use client';
import { useState } from 'react';
import { calculateMatrix, parseMatrixTable, type MatrixInput, type MatrixOptions, type MatrixResult } from '@/lib/matrix-analysis';
import type { MatrixAdvice } from '@/lib/matrix-ai';
import { thaiDateTime } from '@/lib/thai-date-time';

const example = 'รหัส: เรื่อง\tเรื่องย่อย\tความรุนแรง\tความถี่\nCPE405: Delay Diagnosis and Delay treatment ในผู้ป่วยฉุกเฉินและผู้ป่วย Fast Track\t\tE\t1\nCPP401: ผู้ป่วยเกิดภาวะแทรกซ้อนจากกระบวนการดูแลรักษาพยาบาลซึ่งป้องกันได้\t\tF\t1';
export function MatrixAiAnalysis({aiEnabled}:{aiEnabled:boolean}) {
  const today = thaiDateTime().occurred_at;
  const month = Number(today.slice(5,7));
  const [options, setOptions] = useState<MatrixOptions>({ type: 'clinical', basis: 'quarter', year: Number(today.slice(0,4)) + 543 + (month >= 10 ? 1 : 0), quarter: Math.floor(((month + 2) % 12) / 3) + 1 });
  const [text,setText] = useState(''), [items,setItems] = useState<MatrixInput[]>([]), [rows,setRows] = useState<MatrixResult[]>([]);
  const [advice,setAdvice] = useState<MatrixAdvice[]>([]), [message,setMessage] = useState(''), [busy,setBusy] = useState(false);
  const invalidate = () => { setRows([]); setAdvice([]); setMessage(''); };
  function prepare() { try { const parsed = parseMatrixTable(text); setItems(parsed); setRows(calculateMatrix(parsed,options)); setAdvice([]); setMessage('อ่านตารางแล้ว กรุณาตรวจสอบก่อนวิเคราะห์ด้วย AI'); } catch(error) { setItems([]);setRows([]);setAdvice([]);setMessage(error instanceof Error ? error.message : 'อ่านตารางไม่สำเร็จ'); } }
  async function analyze() {
    setBusy(true);setMessage('');setAdvice([]);
    try {
      setRows(calculateMatrix(items,options));
      if(!aiEnabled){setMessage('คำนวณ Risk Matrix แล้ว ส่วน AI ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');return;}
      const response = await fetch('/api/matrix/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items,options }), signal: AbortSignal.timeout(60000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'วิเคราะห์ไม่สำเร็จ');
      setRows(result.rows);setAdvice(result.advice);setMessage(result.aiError || 'วิเคราะห์ครบแล้ว โปรดทบทวนข้อเสนอแนะก่อนนำไปใช้');
    } catch(error) { setMessage(error instanceof Error ? error.message : 'วิเคราะห์ไม่สำเร็จ'); }
    finally {setBusy(false);}
  }
  return <section className="card" style={{marginBottom:20}}>
    <div className="card-header"><div><h2 className="card-title">วิเคราะห์ตารางความเสี่ยงด้วย AI</h2><p className="announcement-subtitle">วางตารางจาก Excel หรือข้อความ แล้วตรวจสอบผลคำนวณก่อนให้ AI เสนอแนวทางลดความเสี่ยง</p></div></div>
    <div className="card-body">
      {!aiEnabled&&<p role="status" style={{marginBottom:12,color:'var(--text2)'}}>คำนวณ Risk Matrix ได้ตามปกติ ส่วนการวิเคราะห์ด้วย AI จะใช้งานได้เมื่อผู้ดูแลระบบเปิดบริการ AI</p>}
      <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}>
        <div className="risk-assessment-fields">
          <label>ประเภท<select value={options.type} onChange={e=>{setOptions({...options,type:e.target.value as MatrixOptions['type']});invalidate();}}><option value="clinical">ด้านคลินิก (A–I)</option><option value="nonclinical">ด้านทั่วไป (1–5)</option></select></label>
          <label>ความถี่ในตารางหมายถึง<select value={options.basis} onChange={e=>{setOptions({...options,basis:e.target.value as MatrixOptions['basis']});invalidate();}}><option value="quarter">จำนวนครั้งในไตรมาส</option><option value="year">จำนวนครั้งต่อปี</option><option value="level">ระดับโอกาสเกิด 1–5</option></select></label>
          <label>ปีงบประมาณ พ.ศ.<input type="number" min={2500} max={2700} value={options.year} onChange={e=>{setOptions({...options,year:Number(e.target.value)});invalidate();}}/></label>
          <label>ไตรมาส<select value={options.quarter} onChange={e=>{setOptions({...options,quarter:Number(e.target.value)});invalidate();}}>{[1,2,3,4].map(q=><option key={q} value={q}>ไตรมาส {q}</option>)}</select></label>
        </div>
        <label style={{display:'block',marginTop:16}}>ตารางนำเข้า (เรื่อง · เรื่องย่อย · ความรุนแรง · ความถี่)
          <textarea rows={7} style={{width:'100%',marginTop:8}} value={text} onChange={e=>{setText(e.target.value);setItems([]);invalidate();}} placeholder="วางตารางจาก Excel หรือรูปแบบ | เรื่อง | เรื่องย่อย | ความรุนแรง | ความถี่ |" maxLength={50000}/>
        </label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
          <button type="button" className="tb-btn tb-btn-ghost" onClick={()=>{setText(example);setItems([]);invalidate();}}>ใช้ตัวอย่าง CPE405 / CPP401</button>
          <button type="button" className="tb-btn tb-btn-primary" onClick={prepare} disabled={!text.trim()}>อ่านตารางและคำนวณ</button>
        </div>
        {!!items.length&&<><div style={{overflowX:'auto',marginTop:16}}><table className="data-table"><thead><tr><th>เรื่อง</th><th>เรื่องย่อย</th><th>ความรุนแรง</th><th>ความถี่</th></tr></thead><tbody>{items.map((item,index)=><tr key={index}><td>{item.title}</td><td>{item.subtopic||'—'}</td><td><input aria-label={`ความรุนแรงรายการ ${index+1}`} value={item.severity} maxLength={1} style={{width:70}} onChange={e=>{setItems(items.map((row,i)=>i===index?{...row,severity:e.target.value.toUpperCase()}:row));invalidate();}}/></td><td><input aria-label={`ความถี่รายการ ${index+1}`} type="number" min={options.basis==='level'?1:0} max={options.basis==='level'?5:10000000} value={item.frequency} style={{width:90}} onChange={e=>{setItems(items.map((row,i)=>i===index?{...row,frequency:Number(e.target.value)}:row));invalidate();}}/></td></tr>)}</tbody></table></div>
        <button type="button" className="tb-btn tb-btn-primary" style={{marginTop:12}} onClick={analyze}>{busy?'กำลังวิเคราะห์…':aiEnabled?'วิเคราะห์ด้วย AI':'คำนวณผล Risk Matrix'}</button></>}
      </fieldset>
      {message&&<p role="status" style={{marginTop:12,whiteSpace:'pre-wrap'}}>{message}</p>}
      {!!rows.length&&<><p style={{marginTop:16,color:'var(--text2)'}}>คะแนน = ผลกระทบ × ระดับโอกาสเกิด · สีตามตารางของโรงพยาบาล ไม่ได้แบ่งจากช่วงคะแนน{options.basis==='quarter'?' · จำนวนครั้งในไตรมาสแปลงเป็นอัตราต่อปีก่อนจัดระดับโอกาสเกิด เช่นเดียวกับ Smart Risk Profile':''}</p>
        <div style={{overflowX:'auto',marginTop:12}}><table className="data-table"><thead><tr><th>เรื่อง</th><th>ความรุนแรง</th><th>ผลกระทบ</th><th>โอกาสเกิด</th><th>คะแนน</th><th>ระดับความเสี่ยง</th><th>AI วิเคราะห์และข้อเสนอแนะ</th></tr></thead><tbody>{rows.map(row=>{const note=advice.find(item=>item.id===row.id);return <tr key={row.id}><td>{row.title}{row.subtopic&&<p>{row.subtopic}</p>}</td><td>{row.severity}</td><td>{row.impact}</td><td>{row.likelihood}</td><td>{row.score}</td><td><span className={`risk-color-${row.color}`} style={{display:'inline-block',padding:'6px 10px',borderRadius:8,color:'#172033',background:{green:'#bcead0',yellow:'#fff0a6',orange:'#ffc18c',red:'#ff9eab'}[row.color]}}>{row.level}</span></td><td style={{minWidth:260,whiteSpace:'pre-wrap'}}>{note?<><p>{note.analysis}</p><p><strong>มาตรการ: </strong>{note.actions}</p><p><strong>ติดตาม: </strong>{note.followUp}</p></>:'ยังไม่มีผลวิเคราะห์จาก AI'}</td></tr>;})}</tbody></table></div>
        <p style={{fontSize:13,color:'var(--text2)',marginTop:12}}>ผลนี้เป็นร่างการประเมิน ยังไม่ได้บันทึกลงทะเบียนความเสี่ยง · เกณฑ์ด้านทั่วไปอ้างอิงระดับความรุนแรงรายงานอุบัติการณ์(1).docx</p>
      </>}
    </div>
  </section>;
}
