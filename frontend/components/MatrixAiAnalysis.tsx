'use client';
import { useEffect, useRef, useState } from 'react';
import { calculateMatrix, parseMatrixTable, type MatrixInput, type MatrixOptions, type MatrixResult } from '@/lib/matrix-analysis';
import { baselineMatrixAdvice } from '@/lib/matrix-content';
import type { MatrixAdvice } from '@/lib/matrix-ai';
import { thaiDateTime } from '@/lib/thai-date-time';
import { applyMatrixAdvice, normalizeTreatments, type MatrixTreatment } from '@/lib/matrix-treatment';

const example = 'รหัส: เรื่อง\tเรื่องย่อย\tความรุนแรง\tความถี่\nCPE405: Delay Diagnosis and Delay treatment ในผู้ป่วยฉุกเฉินและผู้ป่วย Fast Track\t\tE\t1\nCPP401: ผู้ป่วยเกิดภาวะแทรกซ้อนจากกระบวนการดูแลรักษาพยาบาลซึ่งป้องกันได้\t\tF\t1';
export function MatrixAiAnalysis({aiEnabled,profileItems=[],profileOptions,profileUnitName=''}:{aiEnabled:boolean;profileItems?:MatrixInput[];profileOptions?:MatrixOptions;profileUnitName?:string}) {
  const today = thaiDateTime().occurred_at;
  const month = Number(today.slice(5,7));
  const [options, setOptions] = useState<MatrixOptions>({ type: 'clinical', basis: 'quarter', year: Number(today.slice(0,4)) + 543 + (month >= 10 ? 1 : 0), quarter: Math.floor(((month + 2) % 12) / 3) + 1 });
  const [text,setText] = useState(''), [items,setItems] = useState<MatrixInput[]>([]), [rows,setRows] = useState<MatrixResult[]>([]);
  const [advice,setAdvice] = useState<MatrixAdvice[]>([]), [message,setMessage] = useState(''), [busy,setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const [treatments,setTreatments] = useState<MatrixTreatment[]>([]), [unitName,setUnitName] = useState(profileUnitName === 'ทุกหน่วยงานที่มีสิทธิ์ดู' ? '' : profileUnitName), [exporting,setExporting] = useState(false);
  const exportActionsRef = useRef<HTMLDivElement>(null);
  const [scrollToExport, setScrollToExport] = useState(false);
  useEffect(() => {
    if (!scrollToExport || busy || !exportActionsRef.current) return;
    exportActionsRef.current.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    setScrollToExport(false);
  }, [scrollToExport, busy]);
  const patchTreatment = (id:number, patch:Partial<MatrixTreatment>) => setTreatments(previous => previous.map(item => item.id === id ? {...item,...patch} : item));
  const invalidate = () => { setRows([]); setAdvice([]); setTreatments([]); setMessage(''); };
  async function readRiskFile(file: File) {
    setFileBusy(true); setFileWarnings([]); setItems([]); setRows([]); setAdvice([]); setTreatments([]); setMessage('กำลังอ่านไฟล์…');
    try {
      const wordFile = /\.docx?$/i.test(file.name);
      if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('กรุณาเลือกไฟล์ขนาดไม่เกิน 20 MB');
      let uploadFile = file;
      if (!wordFile && !/\.xlsx$/i.test(file.name) && file.size > 3 * 1024 * 1024) {
        const { prepareLessonImage } = await import('@/lib/lessonImage');
        const encoded = await prepareLessonImage(file);
        const [header, base64] = encoded.split(',');
        const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
        const type = /^data:([^;]+);base64$/.exec(header)?.[1] ?? 'image/webp';
        uploadFile = new File([bytes], file.name, { type });
      }
      let response: Response;
      if (uploadFile.size > 3 * 1024 * 1024) {
        const start = await fetch('/api/matrix/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: uploadFile.name, size: uploadFile.size }) });
        const init = await start.json();
        if (!start.ok) throw new Error(init.error || 'เริ่มอัปโหลดไม่สำเร็จ');
        const uploadId = String(init.id);
        try {
          const chunkSize = Number(init.chunkSize);
          if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 512 * 1024) throw new Error('ขนาดส่วนไฟล์ไม่ถูกต้อง');
          for (let offset = 0; offset < uploadFile.size; offset += chunkSize) {
            setMessage(`กำลังอัปโหลด ${Math.min(100, Math.round(offset / uploadFile.size * 100))}%`);
            const chunk = await fetch('/api/matrix/uploads', { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-Upload-Id': uploadId, 'X-Upload-Offset': String(offset) }, body: uploadFile.slice(offset, offset + chunkSize) });
            if (!chunk.ok) { const failure = await chunk.json(); throw new Error(failure.error || 'อัปโหลดไฟล์ไม่สำเร็จ'); }
          }
          setMessage('กำลังอ่านไฟล์…');
          response = await fetch('/api/matrix/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId, options }) });
        } finally {
          await fetch(`/api/matrix/uploads?id=${encodeURIComponent(uploadId)}`, { method: 'DELETE' }).catch(() => {});
        }
      } else {
        const form = new FormData(); form.set('file', uploadFile); form.set('options', JSON.stringify(options));
        response = await fetch(wordFile ? '/api/unit-risks/extract' : '/api/matrix/extract', { method: 'POST', body: form });
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'อ่านไฟล์ไม่สำเร็จ');
      const parsed: MatrixInput[] = [];
      if (wordFile) {
        for (const item of result.items as { title: string; levels: string }[]) {
          for (const level of item.levels.split(', ')) {
            const match = /^([A-I])\s+(\d+)$/.exec(level.trim());
            if (!match) throw new Error('ไม่สามารถอ่านระดับความรุนแรงจากไฟล์ กรุณาตรวจสอบ');
            parsed.push({ title: item.title, subtopic: '', severity: match[1], frequency: Number(match[2]) });
          }
        }
      } else parsed.push(...result.items);
      if (!parsed.length || parsed.length > 50) throw new Error('รองรับครั้งละ 1–50 รายการหลังแยกระดับความรุนแรง');
      const nextOptions: MatrixOptions = wordFile ? { ...options, type: 'clinical', basis: 'quarter', year: result.year ?? options.year, quarter: result.quarter ?? options.quarter } : options;
      const matrix = calculateMatrix(parsed, nextOptions);
      setOptions(nextOptions); setUnitName(result.unitName ?? unitName); setItems(parsed);
      setText('รหัส: เรื่อง\tเรื่องย่อย\tความรุนแรง\tความถี่\n' + parsed.map(item => [item.title.replace(/\s+/g, ' '), item.subtopic, item.severity, item.frequency].join('\t')).join('\n'));
      setRows(matrix); setTreatments(normalizeTreatments(matrix.map(row => row.id), [])); setAdvice([]);
      setFileWarnings(Array.isArray(result.warnings) ? result.warnings : []);
      await analyze(parsed, nextOptions);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'อ่านไฟล์ไม่สำเร็จ'); }
    finally { setFileBusy(false); }
  }
  async function prepare() {
    try {
      const parsed = (items.length ? items : parseMatrixTable(text)).map(item=>({...item,frequency:Number.isNaN(item.frequency)?0:item.frequency}));
      const result = calculateMatrix(parsed, options);
      setItems(parsed);setRows(result);setTreatments(normalizeTreatments(result.map(row=>row.id),[]));setAdvice([]);
      await analyze(parsed, options);
    } catch(error) {
      setItems([]);setRows([]);setAdvice([]);setTreatments([]);
      setMessage(error instanceof Error ? error.message : 'อ่านตารางไม่สำเร็จ');
    }
  }
  async function analyze(sourceItems: MatrixInput[] = items, sourceOptions: MatrixOptions = options) {
    setScrollToExport(false);setBusy(true);setMessage('AI กำลังประเมินและเติมมาตรการอัตโนมัติ…');setAdvice([]);
    try {
      const computed=calculateMatrix(sourceItems,sourceOptions);setRows(computed);setTreatments(previous=>normalizeTreatments(computed.map(row=>row.id),previous));
      const baseline = baselineMatrixAdvice(computed);
      setAdvice(baseline);
      if(!aiEnabled){setTreatments(previous=>applyMatrixAdvice(computed.map(row=>row.id),previous,baseline));setMessage('เติมบทวิเคราะห์ตามเกณฑ์และข้อเสนอมาตรการเบื้องต้นแล้ว บริการ AI ยังไม่พร้อมใช้งาน โปรดตรวจสอบและปรับให้ตรงกับหน่วยงาน');return;}
      const response = await fetch('/api/matrix/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: sourceItems, options: sourceOptions }), signal: AbortSignal.timeout(60000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'วิเคราะห์ไม่สำเร็จ');
      const completeAdvice = result.advice.length === result.rows.length ? result.advice : baseline;
      setRows(result.rows);setAdvice(completeAdvice);
      if (!result.aiError) setScrollToExport(true);
      setTreatments(previous=>applyMatrixAdvice(result.rows.map((row:MatrixResult)=>row.id),previous,completeAdvice));setMessage(result.aiError ? `${result.aiError} เติมข้อเสนอเบื้องต้นตามเกณฑ์แล้ว โปรดตรวจสอบ` : 'AI ประเมินและเติมมาตรการ แนวทางตอบสนอง และรอบทบทวนในตารางแล้ว โดยคงข้อมูลที่กรอกไว้ โปรดตรวจสอบก่อนยืนยัน');
    } catch(error) { const computed=calculateMatrix(sourceItems,sourceOptions);setTreatments(previous=>applyMatrixAdvice(computed.map(row=>row.id),previous,baselineMatrixAdvice(computed)));setMessage(error instanceof Error ? `${error.message} เติมข้อเสนอเบื้องต้นตามเกณฑ์แล้ว โปรดตรวจสอบ` : 'วิเคราะห์ไม่สำเร็จ เติมข้อเสนอเบื้องต้นตามเกณฑ์แล้ว โปรดตรวจสอบ'); }
    finally {setBusy(false);}
  }
  async function exportReport(format: 'docx' | 'pdf') {
    setExporting(true);setMessage('');
    try {
      const response=await fetch(format === 'pdf' ? '/api/matrix/export-pdf' : '/api/matrix/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,options,treatments,unitName,advice})});
      if(!response.ok){const error=await response.json();throw new Error(error.error||'ส่งออกไม่สำเร็จ');}
      const url=URL.createObjectURL(await response.blob());
      const link=document.createElement('a');link.href=url;link.download=`Risk_Profile_${options.year}_Q${options.quarter}.${format}`;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage(format === 'pdf' ? 'ส่งออก PDF ตามแบบฟอร์ม FM-QPS-QSH-001/04 แล้ว' : 'ส่งออกไฟล์ Word แล้ว');
    }catch(error){setMessage(error instanceof Error?error.message:'ส่งออกไม่สำเร็จ');}finally{setExporting(false);}
  }
  async function useProfileRows() {
    if(!profileOptions||!profileItems.length||profileItems.length>50)return;
    setOptions(profileOptions);setUnitName(profileUnitName);setItems(profileItems);
    setText('รหัส: เรื่อง\tเรื่องย่อย\tความรุนแรง\tความถี่\n'+profileItems.map(item=>[item.title.replace(/\s+/g,' '),item.subtopic.replace(/\s+/g,' '),item.severity,item.frequency].join('\t')).join('\n'));
    const result=calculateMatrix(profileItems,profileOptions);setRows(result);setTreatments(normalizeTreatments(result.map(row=>row.id),[]));setAdvice([]);await analyze(profileItems, profileOptions);
  }
  return <section className="card" style={{marginBottom:20}}>
    <div className="card-header"><div><h2 className="card-title">วิเคราะห์ตารางความเสี่ยงด้วย AI</h2><p className="announcement-subtitle">วางตารางจาก Excel หรือข้อความ เมื่ออ่านตารางแล้ว AI จะประเมินและเติมมาตรการให้อัตโนมัติ</p></div></div>
    <div className="card-body">
      {!aiEnabled&&<p role="status" style={{marginBottom:12,color:'var(--text2)'}}>คำนวณ Risk Matrix ได้ตามปกติ ส่วนการวิเคราะห์ด้วย AI จะใช้งานได้เมื่อผู้ดูแลระบบเปิดบริการ AI</p>}
      <fieldset disabled={busy||exporting||fileBusy} style={{border:0,padding:0,minWidth:0}}>
        {profileOptions&&<div style={{marginBottom:16}}><button type="button" className="tb-btn tb-btn-primary" disabled={!profileItems.length||profileItems.length>50} onClick={useProfileRows}>นำรายการตามตัวกรองด้านบนมาใช้ ({profileItems.length} รายการ)</button>{profileItems.length>50&&<p>กรุณากรองให้เหลือไม่เกิน 50 รายการต่อการวิเคราะห์หนึ่งครั้ง</p>}</div>}
        <div className="risk-assessment-fields">
          <label>ประเภท<select value={options.type} onChange={e=>{setOptions({...options,type:e.target.value as MatrixOptions['type']});invalidate();}}><option value="clinical">ด้านคลินิก (A–I)</option><option value="nonclinical">ด้านทั่วไป (1–5)</option></select></label>
          <label>ความถี่ในตารางหมายถึง<select value={options.basis} onChange={e=>{setOptions({...options,basis:e.target.value as MatrixOptions['basis']});invalidate();}}><option value="quarter">จำนวนครั้งในไตรมาส</option><option value="year">จำนวนครั้งต่อปี</option><option value="level">ระดับโอกาสเกิด 1–5</option></select></label>
          <label>ปีงบประมาณ พ.ศ.<input type="number" min={2500} max={2700} value={options.year} onChange={e=>{setOptions({...options,year:Number(e.target.value)});invalidate();}}/></label>
          <label>ไตรมาส<select value={options.quarter} onChange={e=>{setOptions({...options,quarter:Number(e.target.value)});invalidate();}}>{[1,2,3,4].map(q=><option key={q} value={q}>ไตรมาส {q}</option>)}</select></label>
        </div>
        <label style={{display:'block',marginTop:12}}>หน่วยงาน / ชื่อรายงานสำหรับไฟล์ Word<input value={unitName} maxLength={200} onChange={e=>setUnitName(e.target.value)} placeholder="ระบุหน่วยงาน"/></label>
        <label style={{display:'block',marginTop:16}}>ตารางนำเข้า (เรื่อง · เรื่องย่อย · ความรุนแรง · ความถี่)
          <textarea rows={7} style={{width:'100%',marginTop:8}} value={text} onChange={e=>{setText(e.target.value);setItems([]);invalidate();}} placeholder="วางตารางจาก Excel หรือรูปแบบ | เรื่อง | เรื่องย่อย | ความรุนแรง | ความถี่ |" maxLength={50000}/>
        </label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginTop:12}}>
          <label className="tb-btn tb-btn-ghost" style={{cursor:'pointer',position:'relative'}}>＋ เพิ่มไฟล์
            <input aria-label="เพิ่มไฟล์ Risk Profile" type="file" accept=".doc,.docx,.xlsx,image/jpeg,image/png,image/webp" style={{position:'absolute',width:1,height:1,opacity:0,overflow:'hidden'}} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void readRiskFile(file);}} />
          </label>
          <button type="button" className="tb-btn tb-btn-ghost" onClick={()=>{setText(example);setItems([]);invalidate();}}>ใช้ตัวอย่าง CPE405 / CPP401</button>
          <button type="button" className="tb-btn tb-btn-primary" style={{marginLeft:'auto'}} onClick={prepare} disabled={!text.trim()}>{busy?'AI กำลังวิเคราะห์…':aiEnabled?'วิเคราะห์ด้วย AI':'อ่านตารางและคำนวณ'}</button>
        </div>
        <p style={{fontSize:13,color:'var(--text2)',marginTop:10}}>รองรับ Word, Excel (.xlsx) และรูป JPG, PNG, WebP ขนาดไม่เกิน 20 MB รูปภาพขนาดใหญ่จะปรับขนาดก่อนส่ง ระบบส่งข้อมูลไปยังบริการ AI เพื่ออ่านและวิเคราะห์ กรุณาตรวจทานผล</p>
        {fileBusy && <p role="status">กำลังอ่านและวิเคราะห์ไฟล์…</p>}
        {fileWarnings.map((warning,index)=><p key={index} role="alert">{warning}</p>)}
        {!!items.length&&<><div style={{overflowX:'auto',marginTop:16}}><table className="data-table"><thead><tr><th>เรื่อง</th><th>เรื่องย่อย</th><th>ความรุนแรง</th><th>ความถี่</th></tr></thead><tbody>{items.map((item,index)=><tr key={index}><td>{item.title}</td><td>{item.subtopic||'—'}</td><td><input aria-label={`ความรุนแรงรายการ ${index+1}`} value={item.severity} maxLength={3} style={{width:70}} onChange={e=>{setItems(items.map((row,i)=>i===index?{...row,severity:e.target.value.toUpperCase()}:row));invalidate();}}/></td><td><input aria-label={`ความถี่รายการ ${index+1}`} type="number" min={0} max={options.basis==='level'?5:10000000} value={Number.isFinite(item.frequency)?item.frequency:''} placeholder="จำนวนครั้ง" required style={{width:90}} onChange={e=>{setItems(items.map((row,i)=>i===index?{...row,frequency:e.target.value===''?Number.NaN:Number(e.target.value)}:row));invalidate();}}/></td></tr>)}</tbody></table></div>
        </>}
      </fieldset>
      {message&&(!rows.length||busy)&&<p role="status" style={{marginTop:12,whiteSpace:'pre-wrap'}}>{message}</p>}
      {!!rows.length&&<><p style={{marginTop:16,color:'var(--text2)'}}>จับคู่ผลกระทบกับระดับโอกาสเกิดเพื่อเลือกระดับสีจากตารางโรงพยาบาล · หากไม่ระบุความถี่ ใช้ 0 อัตโนมัติ{options.basis==='quarter'?' · จำนวนครั้งในไตรมาสแปลงเป็นอัตราต่อปีก่อนจัดระดับโอกาสเกิด เช่นเดียวกับ Smart Risk Profile':''}</p>
        <div style={{overflowX:'auto',marginTop:12}}><table className="data-table"><thead><tr><th>เรื่อง</th><th>ความรุนแรง</th><th>ผลกระทบ</th><th>โอกาสเกิด</th><th>คู่ประเมิน (ผลกระทบ, โอกาสเกิด)</th><th>ระดับความเสี่ยง</th><th>AI วิเคราะห์และข้อเสนอแนะ</th></tr></thead><tbody>{rows.map(row=>{const note=advice.find(item=>item.id===row.id);return <tr key={row.id}><td>{row.title}{row.subtopic&&<p>{row.subtopic}</p>}</td><td>{row.severity}</td><td>{row.impact}</td><td>{row.likelihood}</td><td>({row.pair})</td><td><span className={`risk-color-${row.color}`} style={{display:'inline-block',padding:'6px 10px',borderRadius:8,color:'#172033',background:{green:'#bcead0',yellow:'#fff0a6',orange:'#ffc18c',red:'#ff9eab'}[row.color]}}>{row.level}</span></td><td style={{minWidth:260,whiteSpace:'pre-wrap'}}>{note?<><p>{note.analysis}</p><p><strong>มาตรการ: </strong>{note.actions}</p><p><strong>ติดตาม: </strong>{note.followUp}</p></>:'ยังไม่มีผลวิเคราะห์จาก AI'}</td></tr>;})}</tbody></table></div>
        <section className="matrix-treatment" aria-busy={busy} style={{marginTop:24}}>
          <h3>การจัดการความเสี่ยงและการติดตามทบทวน</h3>
          <p style={{color:'var(--text2)',margin:'10px 0'}}>AI จะเสนอแนวทางตอบสนอง มาตรการป้องกัน/แก้ไข และความถี่ทบทวน กรุณาตรวจสอบและยืนยันก่อนนำไปใช้</p>
          <div style={{overflowX:'auto'}}><table className="data-table"><thead><tr><th>เรื่อง</th><th>Transfer &amp; Prevention</th><th>Monitor &amp; Control</th><th>Mitigation</th><th>มาตรการป้องกัน/การแก้ไข</th><th>ความถี่ในการทบทวน</th></tr></thead><tbody>{rows.map(row=>{const item=treatments.find(item=>item.id===row.id);if(!item)return null;return <tr key={row.id}><td style={{minWidth:180}}>{row.title}</td>{(['transferPrevention','monitorControl','mitigation'] as const).map((key,index)=><td key={key}><input type="checkbox" style={{width:'auto'}} disabled={busy||exporting} aria-label={`${['Transfer & Prevention','Monitor & Control','Mitigation'][index]} รายการ ${row.id}`} checked={item[key]} onChange={e=>patchTreatment(row.id,{[key]:e.target.checked})}/></td>)}<td style={{minWidth:340}}><textarea aria-label={`มาตรการรายการ ${row.id}`} rows={6} maxLength={5000} disabled={busy||exporting} value={item.measures} onChange={e=>patchTreatment(row.id,{measures:e.target.value})} placeholder="กรอกมาตรการป้องกัน/แก้ไข หรือแก้ไขข้อเสนอจาก AI"/><label style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:8}}><input type="checkbox" style={{width:'auto',marginTop:5}} disabled={busy||exporting} checked={item.confirmedCurrent} onChange={e=>patchTreatment(row.id,{confirmedCurrent:e.target.checked})}/>ยืนยันว่าเป็นมาตรการที่ใช้อยู่ในปัจจุบัน</label></td><td style={{minWidth:170}}><input aria-label={`ความถี่ทบทวนรายการ ${row.id}`} list="matrix-review-periods" disabled={busy||exporting} maxLength={300} value={item.reviewFrequency} onChange={e=>patchTreatment(row.id,{reviewFrequency:e.target.value})} placeholder="เช่น ทุกเดือน"/></td></tr>;})}</tbody></table></div>
          <div ref={exportActionsRef} role="group" aria-label="ส่งออกผลการวิเคราะห์" style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:20,scrollMarginTop:90}}><button type="button" className="tb-btn tb-btn-primary" disabled={busy||exporting} onClick={()=>exportReport('docx')}>{exporting?'กำลังสร้างไฟล์…':'ส่งออก Word ตามแบบฟอร์ม'}</button><button type="button" className="tb-btn tb-btn-ghost" disabled={busy||exporting} onClick={()=>exportReport('pdf')}>{exporting?'กำลังสร้างไฟล์…':'ส่งออก PDF ตามแบบฟอร์ม'}</button></div>
          {message&&<p role="status" style={{marginTop:12,whiteSpace:'pre-wrap'}}>{message}</p>}
          <datalist id="matrix-review-periods">{['ทุกสัปดาห์','ทุกเดือน','ทุกไตรมาส','ทุก 6 เดือน','ทุกปี','หลังเกิดเหตุทุกครั้ง'].map(period=><option key={period} value={period}/>)}</datalist>
        </section>
        <p style={{fontSize:13,color:'var(--text2)',marginTop:12}}>ผลนี้เป็นร่างการประเมิน ยังไม่ได้บันทึกลงทะเบียนความเสี่ยง · เกณฑ์ด้านทั่วไปอ้างอิงระดับความรุนแรงรายงานอุบัติการณ์(1).docx</p>
      </>}
    </div>
  </section>;
}
