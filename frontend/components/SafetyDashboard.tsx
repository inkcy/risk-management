'use client';
import { useState } from 'react';
import type { SafetyData, SafetyIndicator } from '@/lib/safety';
import { periodLabel, periodSeries, updateMeasurement, type PeriodMode } from '@/lib/safety-periods';
import { formatSafetyText } from '@/lib/safety-text';

function Trend({item,periods}:{item:SafetyIndicator;periods:string[]}) {
  const max=Math.max(...item.values.filter((v):v is number=>v!==null),item.comparison==='none'?0:item.target,0.01)*1.2;
  const x=(i:number)=>50+i*450/Math.max(periods.length-1,1);
  const y=(v:number)=>155-v/max*115;
  const count=item.unit==='ครั้ง';
  return <svg viewBox="0 0 550 210" role="img" aria-label={`${item.name}: ${item.values.map((v,i)=>`${periods[i]} ${v??'ไม่มีข้อมูล'}`).join(', ')}`} style={{width:'100%',minWidth:periods.length>6?660:undefined,display:'block'}}>
    {[0,0.5,1].map(p=><g key={p}><line x1="45" x2="520" y1={y(max*p)} y2={y(max*p)} stroke="var(--border2)"/><text x="40" y={y(max*p)+4} textAnchor="end" fill="var(--text3)" fontSize="11">{Number((max*p).toPrecision(3))}</text></g>)}
    {item.comparison!=='none'&&<line x1="45" x2="520" y1={y(item.target)} y2={y(item.target)} stroke="var(--amber)" strokeWidth="2" strokeDasharray="6 5"/>}
    {!count&&item.values.map((v,i)=>v!==null&&i>0&&item.values[i-1]!==null?<line key={i} x1={x(i-1)} y1={y(item.values[i-1]!)} x2={x(i)} y2={y(v)} stroke="var(--accent)" strokeWidth="3"/>:null)}
    {item.values.map((v,i)=>{
      const ok=v!==null&&(item.comparison==='lt'?v<item.target:item.comparison==='gt'?v>item.target:v===item.target);
      const color=item.comparison==='none'?'var(--accent)':ok?'var(--green)':'var(--red)';
      return <g key={i}>{v!==null&&(count?<rect x={x(i)-13} y={y(v)} width="26" height={Math.max(2,155-y(v))} rx="4" fill={color}/>:<circle cx={x(i)} cy={y(v)} r="5" fill={color}/>)}<text x={x(i)} y={v===null?145:y(v)-10} textAnchor="middle" fill="var(--text)" fontSize="13">{v??'—'}</text><text x={x(i)} y="181" textAnchor="middle" fill="var(--text2)" fontSize="11">{periods[i]}</text></g>;
    })}
  </svg>;
}

export function SafetyDashboard({initial,initialRevision,canEdit,loadError}:{initial:SafetyData;initialRevision:number;canEdit:boolean;loadError?:string}) {
  const [data,setData]=useState(initial),[draft,setDraft]=useState(initial),[revision,setRevision]=useState(initialRevision);
  const [mode,setMode]=useState<PeriodMode>('year'),[year,setYear]=useState(2568);
  const [group,setGroup]=useState(initial.indicators[0].group),[editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const groups=Array.from(new Set(data.indicators.map(i=>i.group)));
  const patch=(id:string,update:Partial<SafetyIndicator>)=>setDraft(d=>({...d,indicators:d.indicators.map(i=>i.id===id?{...i,...update}:i)}));
  const visible=(editing?draft:data).indicators.filter(i=>i.group===group);
  const startEditing=()=>{setDraft({...data,notes:data.notes.map(n=>({...n,text:formatSafetyText(n.text)}))});setEditing(true);setMessage('');};
  async function save(){
    setSaving(true);setMessage('');
    try {
      const response=await fetch('/api/safety',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:draft,revision})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error);
      setData(draft);setRevision(result.revision);setEditing(false);setMessage('บันทึกแล้ว ผู้ดูจะเห็นข้อมูลล่าสุดเมื่อเปิดหรือรีเฟรชแดชบอร์ด');
    }catch(error){setMessage(error instanceof Error?error.message:'บันทึกไม่สำเร็จ');}finally{setSaving(false);}
  }
  return <section className="card" style={{marginBottom:24}}>
    <div className="card-header" style={{flexWrap:'wrap',gap:12}}><div><div className="card-title">มาตรฐานสำคัญต่อความปลอดภัย 9 ด้าน</div><p style={{fontSize:13,color:'var(--text2)'}}>แนวโน้มตัวชี้วัดจากปีงบประมาณ 2564–2568</p></div>{canEdit&&!editing&&<button className="tb-btn tb-btn-primary" onClick={startEditing}>แก้ไขข้อมูลตัวชี้วัดและข้อความ</button>}{editing&&<div style={{display:'flex',gap:8}}><button className="tb-btn tb-btn-primary" disabled={saving} onClick={save}>{saving?'กำลังบันทึก…':'บันทึกทั้งหมด'}</button><button className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>setEditing(false)}>ยกเลิก</button></div>}</div>
    <div className="card-body">
      {loadError&&<p role="alert">{loadError}</p>}{message&&<p role="status" style={{marginBottom:16}}>{message}</p>}
      {editing?<label className="safety-note-label">คำอธิบายและหมายเหตุข้อมูล<textarea className="safety-note-input" rows={4} maxLength={10000} disabled={saving} value={draft.sourceNote} onChange={e=>setDraft(d=>({...d,sourceNote:e.target.value}))}/></label>:<p style={{fontSize:13,color:'var(--text2)',marginBottom:16,whiteSpace:'pre-wrap'}}>{data.sourceNote}</p>}
      <label style={{display:'block',marginBottom:20}}>หมวดตัวชี้วัด <select value={group} onChange={e=>setGroup(e.target.value)} style={{padding:10,maxWidth:'100%',background:'var(--bg2)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:8}}>{groups.map(g=><option key={g}>{g}</option>)}</select></label>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
        <div role="group" aria-label="รูปแบบช่วงเวลา" style={{display:'flex',gap:6}}>{([['month','รายเดือน'],['quarter','รายไตรมาส'],['year','รายปี']] as const).map(([value,label])=><button key={value} className={`tb-btn ${mode===value?'tb-btn-primary':'tb-btn-ghost'}`} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</div>
        <label>ปีงบประมาณ <input aria-label="ปีงบประมาณ" type="number" min="2400" max="2800" value={year} onChange={e=>{const value=Number(e.target.value);if(Number.isInteger(value)&&value>=2400&&value<=2800)setYear(value);}} style={{width:100,padding:8,background:'var(--bg2)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:8}}/></label>
      </div>
      <p style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>ปีงบประมาณเริ่ม ต.ค. ของปีก่อน ถึง ก.ย. ของปีที่เลือก · Q1 ต.ค.–ธ.ค. · Q2 ม.ค.–มี.ค. · Q3 เม.ย.–มิ.ย. · Q4 ก.ค.–ก.ย.<br/>ข้อมูลรายเดือน ไตรมาส และปีบันทึกแยกกัน ไม่มีการเฉลี่ยหรือรวมอัตราอัตโนมัติ ข้อมูลรายปีที่ระบุ Q1–Q3 เป็นผลระหว่างปีตามต้นฉบับ</p>
      <p style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>เส้นประสีส้ม = เป้าหมาย · สีเขียว = ผ่าน · สีแดง = ไม่ผ่าน · — = ไม่มีข้อมูล</p>
      <div className="safety-grid">{visible.map(item=>{
        const series=periodSeries(item,data.periods,mode,year);
        return <article key={item.id} style={{padding:18,border:'1px solid var(--border2)',borderRadius:14,background:'var(--bg2)',minWidth:0}}>
        <h3 style={{fontSize:16,lineHeight:1.6}}>{item.name}</h3><p style={{fontSize:12,color:'var(--text2)',marginTop:6}}>หน่วย: {item.unit} · เป้าหมาย: {item.targetText} · สไลด์ {item.slide}</p>
        <p style={{fontSize:12,color:'var(--text2)',marginTop:6}}>{mode==='year'?'รายปี (รวมผลระหว่างปีที่ต้นฉบับระบุ)':`${mode==='month'?'รายเดือน':'รายไตรมาส'} ปีงบประมาณ ${year}`}</p>
        <div style={{overflowX:'auto'}}><Trend item={{...item,values:series.map(r=>r.value)}} periods={series.map(r=>r.label)}/></div>
        {series.every(r=>r.value===null)&&<p style={{fontSize:13,color:'var(--text2)',marginBottom:12}}>ยังไม่มีข้อมูลในช่วงเวลานี้{canEdit?' แอดมินสามารถกดแก้ไขเพื่อกรอกข้อมูลได้':''}</p>}
        {item.benchmark&&<p style={{fontSize:12}}>Benchmark: {item.benchmark} (ตามต้นฉบับ)</p>}{item.note&&<p style={{fontSize:12,color:'var(--amber)'}}>{item.note}</p>}
        {canEdit&&!editing&&<button className="tb-btn tb-btn-ghost" style={{margin:'12px 0'}} aria-label={`แก้ไขข้อมูล ${item.name}`} onClick={startEditing}>แก้ไขข้อมูล</button>}
        {editing?<fieldset disabled={saving} style={{border:0,display:'grid',gap:10}}>
          <label>ชื่อตัวชี้วัด<input value={item.name} onChange={e=>patch(item.id,{name:e.target.value})}/></label>
          <p style={{fontSize:12}}>กรอกค่า{mode==='month'?'รายเดือน':mode==='quarter'?'รายไตรมาส':'รายปีเต็ม'} ช่องว่าง = ไม่มีข้อมูล</p>
          <div className="safety-inputs">{series.map(row=><label key={`${row.year}-${row.period}`}>{periodLabel(row.label,mode,row.year,row.period)}<input type="number" min="0" step="any" value={row.value??''} placeholder="ไม่มีข้อมูล" onChange={e=>patch(item.id,{measurements:updateMeasurement(item,mode,row.year,row.period,e.target.value===''?null:Number(e.target.value))})}/></label>)}</div>
          {mode==='year'&&<p style={{fontSize:12,color:'var(--amber)'}}>การกรอกค่าในช่องปีที่มีผล Q1–Q3 จะใช้ค่าที่กรอกเป็นผลรายปีเต็ม ข้อความต้นฉบับยังอยู่ในรายละเอียดอ้างอิง</p>}
          <div className="safety-inputs"><label>เกณฑ์<select value={item.comparison} onChange={e=>patch(item.id,{comparison:e.target.value})}><option value="eq">เท่ากับ</option><option value="lt">น้อยกว่า</option><option value="gt">มากกว่า</option><option value="none">ไม่ประเมิน</option></select></label><label>ค่าเป้าหมาย<input type="number" min="0" step="any" value={item.target} onChange={e=>{const target=Number(e.target.value);patch(item.id,{target,targetText:`${item.comparison==='lt'?'< ':item.comparison==='gt'?'> ':''}${target}`});}}/></label></div>
          <label>ข้อความเป้าหมาย<input value={item.targetText} onChange={e=>patch(item.id,{targetText:e.target.value})}/></label><label>หน่วย<input value={item.unit} onChange={e=>patch(item.id,{unit:e.target.value})}/></label><label>Benchmark<input value={item.benchmark} onChange={e=>patch(item.id,{benchmark:e.target.value})}/></label><label>หมายเหตุ<textarea value={item.note} onChange={e=>patch(item.id,{note:e.target.value})}/></label>
        </fieldset>:<details style={{fontSize:12}}><summary>ดูค่าช่วงเวลาที่เลือก</summary><table style={{width:'100%',marginTop:10}}><thead><tr><th>ช่วงเวลา</th><th>ค่าที่แสดง</th></tr></thead><tbody>{series.map(r=><tr key={`${r.year}-${r.period}`}><td>{periodLabel(r.label,mode,r.year,r.period)}</td><td>{r.value??'ไม่มีข้อมูล'}</td></tr>)}</tbody></table></details>}
        <details style={{fontSize:12,marginTop:8}} open={editing?true:undefined}><summary>ข้อมูลอ้างอิงเดิม{editing?' (แก้ไขได้)':''}</summary>
          {editing?<fieldset disabled={saving} style={{border:0,display:'grid',gap:12,marginTop:12}}>
            <p>แก้ไขข้อมูลอ้างอิงแยกจากค่ารายเดือน/ไตรมาส/ปีที่กรอกด้านบน</p>
            {(item.periods??data.periods).map((p,i)=><div key={`${p}-${i}`} style={{display:'grid',gap:6}}>
              <label>ค่าตัวเลขอ้างอิง {p}<input type="number" min="0" step="any" value={item.values[i]??''} placeholder="ไม่มีข้อมูล" onChange={e=>patch(item.id,{values:item.values.map((v,j)=>j===i?(e.target.value===''?null:Number(e.target.value)):v)})}/></label>
              <label>ข้อความอ้างอิง {p}<textarea maxLength={5000} rows={2} value={item.raw[i]??''} onChange={e=>patch(item.id,{raw:item.values.map((_,j)=>j===i?e.target.value:item.raw[j]??'')})}/></label>
            </div>)}
          </fieldset>:(item.periods??data.periods).map((p,i)=><p key={`${p}-${i}`} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{p}: {item.raw[i]||'ไม่มีข้อมูล'}</p>)}
        </details>
        {editing&&<div style={{marginTop:16}}><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="tb-btn tb-btn-primary" disabled={saving} onClick={save}>{saving?'กำลังบันทึก…':'บันทึกทั้งหมด'}</button><button className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>setEditing(false)}>ยกเลิก</button></div>{message&&<p role="status" style={{fontSize:13,marginTop:8}}>{message}</p>}</div>}
      </article>;})}</div>
      <details style={{marginTop:20}}><summary>ข้อมูลประกอบและรายละเอียด</summary>
        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginTop:16}}><p style={{fontSize:13}}>แหล่งข้อมูล: {data.source}</p>{canEdit&&!editing&&<button className="tb-btn tb-btn-ghost" onClick={startEditing}>แก้ไขข้อความประกอบ</button>}</div>
        <img src="/safety-source-slide6.png" alt="สไลด์ 6: กระบวนการป้องกันและแนวโน้มการแพ้ยาซ้ำ" style={{width:'100%',height:'auto',marginTop:12}}/>
        {(editing?draft:data).notes.map((n,index)=><article key={n.slide} className="safety-note">
          {editing?<fieldset disabled={saving} style={{border:0,display:'grid',gap:12}}>
            <label className="safety-note-label">หัวข้อสไลด์ {n.slide}<input className="safety-note-input" maxLength={300} value={n.title??`สไลด์ ${n.slide}`} onChange={e=>setDraft(d=>({...d,notes:d.notes.map((note,i)=>i===index?{...note,title:e.target.value}:note)}))}/></label>
            <label className="safety-note-label">ข้อความประกอบ (กด Enter เพื่อขึ้นบรรทัดใหม่)<textarea className="safety-note-input" rows={20} maxLength={50000} value={n.text} onChange={e=>setDraft(d=>({...d,notes:d.notes.map((note,i)=>i===index?{...note,text:e.target.value}:note)}))}/></label>
          </fieldset>:<><h4>{n.title??`สไลด์ ${n.slide}`}</h4><div className="safety-note-text">{formatSafetyText(n.text)}</div></>}
        </article>)}
        {editing&&<div style={{display:'flex',gap:8,marginTop:16}}><button className="tb-btn tb-btn-primary" disabled={saving} onClick={save}>{saving?'กำลังบันทึก…':'บันทึกทั้งหมด'}</button><button className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>setEditing(false)}>ยกเลิก</button></div>}
      </details>
    </div>
  </section>;
}
