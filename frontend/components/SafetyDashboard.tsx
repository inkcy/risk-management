'use client';
import { useEffect, useState } from 'react';
import type { SafetyData, SafetyIndicator } from '@/lib/safety';
import { periodLabel, periodSeries, updateMeasurement, type PeriodMode } from '@/lib/safety-periods';
import { formatSafetyText } from '@/lib/safety-text';
import safetySeed from '@/lib/data/safety.json';
import { passesSafetyTarget } from '@/lib/safetyComparison';

function wrapChartText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = new Intl.Segmenter('th', { granularity: 'word' }).segment(text);
  const lines: string[] = [];
  let line = '';
  for (const { segment } of words) {
    if (line && context.measureText(line + segment).width > maxWidth) {
      lines.push(line.trimEnd());
      line = segment.trimStart();
    } else {
      line += segment;
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

function Trend({ item, periods, periodCaption }: { item: SafetyIndicator; periods: string[]; periodCaption: string }) {
  const max = Math.max(...item.values.filter((v): v is number => v !== null), item.comparison === 'none' ? 0 : item.target, 0.01) * 1.2;
  const wide = periods.length > 6;
  const width = wide ? Math.max(660, periods.length * 42 + 80) : 550;
  const height = wide ? 250 : 210;
  const axisLeft = 64;
  const firstPoint = axisLeft + 40;
  const lastPoint = width - 45;
  const x = (i: number) => firstPoint + i * (lastPoint - firstPoint) / Math.max(periods.length - 1, 1);
  const y = (v: number) => 155 - v / max * 115;
  const count = item.unit === 'ครั้ง';
  const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const grid = [0, 0.5, 1].map(step => {
    const tick = max * step;
    return `<line x1="${axisLeft}" x2="${width - 25}" y1="${y(tick)}" y2="${y(tick)}" stroke="#d3e1e7"/><text x="${axisLeft - 8}" y="${y(tick) + 4}" text-anchor="end" fill="#627f8d">${Number(tick.toPrecision(3))}</text>`;
  }).join('');
  const target = item.comparison === 'none' ? '' :
    `<line x1="${axisLeft}" x2="${width - 25}" y1="${y(item.target)}" y2="${y(item.target)}" stroke="#d98211" stroke-width="2" stroke-dasharray="6 5"/>`;
  const points = item.values.map((value, i) => {
    const previous = item.values[i - 1];
    const label = `<text x="${x(i)}" y="181" ${wide ? `text-anchor="end" transform="rotate(-45 ${x(i)} 181)"` : 'text-anchor="middle"'} fill="#466777">${escapeText(periods[i])}</text>`;
    if (value === null) return `<text x="${x(i)}" y="145" text-anchor="middle">—</text>${label}`;

    const passed = passesSafetyTarget(value, item.target, item.comparison);
    const color = item.comparison === 'none' ? '#148579' : passed ? '#12a06a' : '#e0407c';
    const line = !count && previous != null ? `<line x1="${x(i - 1)}" y1="${y(previous)}" x2="${x(i)}" y2="${y(value)}" stroke="#148579" stroke-width="3"/>` : '';
    const mark = count
      ? `<rect x="${x(i) - 13}" y="${y(value)}" width="26" height="${Math.max(2, 155 - y(value))}" rx="4" fill="${color}"/>`
      : `<circle cx="${x(i)}" cy="${y(value)}" r="5" fill="${color}"/>`;
    return `${line}${mark}<text x="${x(i)}" y="${y(value) - 10}" text-anchor="middle" font-size="13">${value}</text>${label}`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Tahoma, sans-serif" font-size="11" fill="#193c4b"><rect width="100%" height="100%" fill="white" rx="8"/>${grid}${target}${points}</svg>`;
  const metadata = `หน่วย: ${item.unit} · เป้าหมาย: ${item.targetText}`;
  const alt = `${item.name} · ${metadata} · ${periodCaption} · ${item.values.map((value, i) => `${periods[i]} ${value ?? 'ไม่มีข้อมูล'}`).join(', ')}`;
  const imageKey = JSON.stringify([svg, item.name, metadata, periodCaption]);

  const [image, setImage] = useState<{ key: string; png: string | null }>();
  useEffect(() => {
    let active = true;
    const source = new Image();
    source.onerror = () => {
      if (active) setImage({ key: imageKey, png: null });
    };
    source.onload = () => {
      if (!active) return;
      const canvas = document.createElement('canvas');
      const scale = Math.min(2, 8192 / width);
      const context = canvas.getContext('2d');
      let png: string | null = null;
      try {
        if (context) {
          context.font = 'bold 22px Tahoma, sans-serif';
          const titleLines = wrapChartText(context, item.name, 510);
          context.font = '16px Tahoma, sans-serif';
          const details = [...wrapChartText(context, metadata, 510), periodCaption];
          const headerHeight = 28 + titleLines.length * 29 + details.length * 22;
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round((height + headerHeight) * scale);
          context.scale(scale, scale);
          context.fillStyle = '#fff';
          context.fillRect(0, 0, width, height + headerHeight);
          context.textBaseline = 'top';
          context.fillStyle = '#193c4b';
          context.font = 'bold 22px Tahoma, sans-serif';
          titleLines.forEach((line, i) => context.fillText(line, 20, 18 + i * 29, 510));
          context.font = '16px Tahoma, sans-serif';
          details.forEach((line, i) => context.fillText(line, 20, 22 + titleLines.length * 29 + i * 22, 510));
          context.drawImage(source, 0, headerHeight, width, height);
          const url = canvas.toDataURL('image/png');
          if (url.startsWith('data:image/png;base64,')) png = url;
        }
      } catch {
        // Some browsers restrict reading canvas pixels.
      }
      setImage({ key: imageKey, png });
    };
    source.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    return () => { active = false; };
  }, [svg, width, height, imageKey, item.name, metadata, periodCaption]);

  const current = image?.key === imageKey ? image : undefined;
  const style = { width: '100%', minWidth: wide ? width : undefined };
  return current?.png
    ? <>
        <img src={current.png} alt={alt} style={{ ...style, height: 'auto', display: 'block' }} />
        <a className="tb-btn tb-btn-ghost" href={current.png} download={`safety-${item.id}.png`}>บันทึกรูป PNG</a>
      </>
    : <div style={{ ...style, aspectRatio: `${width} / ${height}`, display: 'grid', placeItems: 'center' }}>
        <span role="status">{current ? 'สร้างรูปกราฟไม่สำเร็จ' : 'กำลังสร้างรูปกราฟ…'}</span>
      </div>;
}

export function SafetyDashboard({initial,initialRevision,canEdit,loadError}:{initial:SafetyData;initialRevision:number;canEdit:boolean;loadError?:string}) {
  const [data,setData]=useState(initial),[draft,setDraft]=useState(initial),[revision,setRevision]=useState(initialRevision);
  const [mode,setMode]=useState<PeriodMode>('year'),[year,setYear]=useState(Math.max(2568,...(initial.years??[])));
  const [group,setGroup]=useState(initial.indicators[0].group),[editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const [syncError,setSyncError]=useState(''),[newerRevision,setNewerRevision]=useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [newIndicatorName, setNewIndicatorName] = useState('');
  useEffect(()=>{
    let active=true;
    let inFlight=false;
    const controller=new AbortController();
    async function sync(){
      if(document.visibilityState==='hidden'||inFlight)return;
      inFlight=true;
      try{
        const response=await fetch('/api/safety',{cache:'no-store',signal:controller.signal});
        const latest=await response.json();
        if (response.status === 401) { if (active) setSessionExpired(true); throw new Error('เซสชันหมดอายุหรือไม่สามารถยืนยันตัวตนได้'); }
        if(!response.ok)throw new Error(latest.error||'โหลดข้อมูลกลางไม่สำเร็จ');
        if(!active)return;
        setSessionExpired(false);
        setSyncError('');
        if(editing){setNewerRevision(latest.revision!==revision);return;}
        setData(latest.data);setDraft(latest.data);setRevision(latest.revision);setNewerRevision(false);
      }catch(error){if(active)setSyncError(error instanceof Error?error.message:'โหลดข้อมูลกลางไม่สำเร็จ');}
      finally{inFlight=false;}
    }
    void sync();
    const timer=window.setInterval(sync,15000);
    window.addEventListener('focus',sync);
    document.addEventListener('visibilitychange',sync);
    return ()=>{active=false;controller.abort();window.clearInterval(timer);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
  },[editing,revision]);
  const groups=Array.from(new Set(data.indicators.map(i=>i.group)));
  const patch=(id:string,update:Partial<SafetyIndicator>)=>setDraft(d=>({...d,indicators:d.indicators.map(i=>i.id===id?{...i,...update}:i)}));
  const visible=(editing?draft:data).indicators.filter(i=>i.group===group);
  const currentData = editing ? draft : data;
  const storedIds = new Set([...currentData.indicators, ...(currentData.deletedIndicators ?? [])].map(item => item.id));
  const originalDeleted = (safetySeed.indicators as SafetyIndicator[]).filter(item => !storedIds.has(item.id)).map(item => ({ ...item, periods: item.periods ?? safetySeed.periods }));
  const recoverable = [...(currentData.deletedIndicators ?? []).map(item => ({ item, original: false })), ...originalDeleted.map(item => ({ item, original: true }))];
  async function exportTable(indicator: SafetyIndicator) {
    try {
      const { default: JSZip } = await import('jszip');
      const rows: (string | number | null)[][] = [['ตัวชี้วัด', 'หน่วย', 'เป้าหมาย', 'ช่วงเวลา', 'ค่า']];
      for (const item of [indicator]) {
        for (const row of periodSeries(item, data.periods, mode, year, (editing ? draft : data).years)) {
          rows.push([item.name, item.unit, item.targetText, periodLabel(row.label, mode, mode === 'quarter' ? year : row.year, row.period), row.value]);
        }
      }
      const xml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const sheetRows = rows.map((row, index) => `<row r="${index + 1}">${row.map((value, column) => {
        const ref = `${String.fromCharCode(65 + column)}${index + 1}`;
        if (value === null) return `<c r="${ref}"/>`;
        if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
      }).join('')}</row>`).join('');
      const zip = new JSZip();
      zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
      zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
      zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="ตัวชี้วัด" sheetId="1" r:id="rId1"/></sheets></workbook>');
      zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
      zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="55" customWidth="1"/><col min="2" max="5" width="22" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`);
      const url = URL.createObjectURL(await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const link = document.createElement('a');
      link.href = url; link.download = `safety-${indicator.id}-${year}-${mode}.xlsx`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setMessage('ส่งออกไฟล์ Excel ไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }
  const startEditing=()=>{setDraft({...data,notes:data.notes.map(n=>({...n,text:formatSafetyText(n.text)}))});setEditing(true);setMessage('');};
  const addIndicator = () => {
    const name = newIndicatorName.trim();
    if (!name) { setMessage('กรุณาระบุชื่อตัวชี้วัดใหม่'); return; }
    const base = editing ? draft : data;
    if (base.indicators.length >= 200) { setMessage('เพิ่มตัวชี้วัดได้ไม่เกิน 200 รายการ'); return; }
    const indicator: SafetyIndicator = {
      id: `custom-${crypto.randomUUID()}`, group, name, unit: 'ครั้ง', targetText: 'ยังไม่กำหนด', target: 0,
      comparison: 'none', values: base.periods.map(() => null), raw: base.periods.map(() => ''),
      benchmark: '', slide: 0, note: '', measurements: [],
    };
    setDraft({ ...base, indicators: [...base.indicators, indicator] });
    setNewIndicatorName(''); setEditing(true); setMessage('เพิ่มตัวชี้วัดแล้ว กรุณากรอกข้อมูลและกดบันทึกทั้งหมด');
  };
  const removeIndicator = (item: SafetyIndicator) => {
    if (!window.confirm(`ลบตัวชี้วัด “${item.name}” หรือไม่? การลบจะมีผลเมื่อกดบันทึกทั้งหมด`)) return;
    if (draft.indicators.length <= 1) { setMessage('ต้องมีตัวชี้วัดอย่างน้อย 1 รายการ'); return; }
    setDraft(current => ({ ...current, indicators: current.indicators.filter(indicator => indicator.id !== item.id), deletedIndicators: [...(current.deletedIndicators ?? []).filter(indicator => indicator.id !== item.id), item] }));
    setMessage('ลบตัวชี้วัดออกจากฉบับแก้ไขแล้ว กรุณากดบันทึกทั้งหมด');
  };
  const restoreIndicator = (item: SafetyIndicator) => {
    const base = editing ? draft : data;
    if (base.indicators.length >= 200) { setMessage('เพิ่มตัวชี้วัดได้ไม่เกิน 200 รายการ'); return; }
    if (base.indicators.some(indicator => indicator.id === item.id)) return;
    setDraft({ ...base, indicators: [...base.indicators, item], deletedIndicators: (base.deletedIndicators ?? []).filter(indicator => indicator.id !== item.id) });
    setGroup(item.group); setEditing(true); setMessage('กู้คืนตัวชี้วัดในฉบับแก้ไขแล้ว กรุณากดบันทึกทั้งหมด');
  };
  const addNextYear=()=>{
    if(year>=2800)return;
    const nextYear=year+1;
    const base=editing?draft:{...data,notes:data.notes.map(n=>({...n,text:formatSafetyText(n.text)}))};
    setDraft({...base,years:Array.from(new Set([...(base.years??[]),year,nextYear])).sort((a,b)=>a-b)});
    setYear(nextYear);setEditing(true);setMessage(`เพิ่มปี ${nextYear} แล้ว กรอกข้อมูลและกดบันทึกทั้งหมดเพื่อเก็บปีใหม่`);
  };
  async function save(){
    setSaving(true);setMessage('');
    try {
      const response=await fetch('/api/safety',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:draft,revision})});
      const result=await response.json();
      if(response.status===401){setSessionExpired(true);throw new Error('เซสชันหมดอายุหรือไม่สามารถยืนยันตัวตนได้');}
      if(response.status===409)setNewerRevision(true);
      if(!response.ok) throw new Error(result.error||'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
      setData(draft);setRevision(result.revision);setEditing(false);
      if (!draft.indicators.some(indicator => indicator.group === group)) setGroup(draft.indicators[0].group);
      setMessage('บันทึกลงข้อมูลกลางแล้ว แอดมินทุกคนจะได้รับข้อมูลล่าสุดอัตโนมัติภายใน 15 วินาที');
    }catch(error){setMessage(error instanceof Error?error.message:'บันทึกไม่สำเร็จ');}finally{setSaving(false);}
  }
  return <section className="card" style={{marginBottom:24}}>
    <div className="card-header" style={{flexWrap:'wrap',gap:12}}><div><div className="card-title">มาตรฐานสำคัญต่อความปลอดภัย 9 ด้านและความเสี่ยงสำคัญ</div><p style={{fontSize:13,color:'var(--text2)'}}>ติดตามตัวชี้วัดรายเดือน ไตรมาส และรายปี</p></div>{canEdit&&!editing&&<button className="tb-btn tb-btn-primary" onClick={startEditing}>แก้ไขข้อมูลตัวชี้วัดและข้อความ</button>}{editing&&<div style={{display:'flex',gap:8}}><button className="tb-btn tb-btn-primary" disabled={saving} onClick={save}>{saving?'กำลังบันทึก…':'บันทึกทั้งหมด'}</button><button className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>setEditing(false)}>ยกเลิก</button></div>}</div>
    <div className="card-body">
      {loadError&&<p role="alert">{loadError}</p>}{message&&<p role="status" style={{marginBottom:16}}>{message}</p>}
      <p style={{fontSize:12,color:'var(--text2)',marginBottom:12}}>ข้อมูลชุดกลางร่วมกันสำหรับแอดมินทุกคน · อัปเดตอัตโนมัติทุก 15 วินาที · การแก้ไขจะเผยแพร่เมื่อกดบันทึกทั้งหมด</p>
      {syncError&&<p role="alert">ยังยืนยันข้อมูลล่าสุดไม่ได้: {syncError}</p>}
      {sessionExpired&&<p role="alert">กรุณาเข้าสู่ระบบอีกครั้ง{editing?' โปรดคัดลอกข้อมูลที่กำลังแก้ไขไว้ก่อน':''} <a href="/login?next=%2Fdashboard">เข้าสู่ระบบ</a></p>}
      {newerRevision&&editing&&<p role="alert">มีแอดมินคนอื่นบันทึกข้อมูลใหม่แล้ว ระบบเก็บสิ่งที่คุณกำลังแก้ไขไว้และจะไม่บันทึกทับข้อมูลใหม่ กรุณาคัดลอกสิ่งที่ต้องการเก็บก่อน <button type="button" className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>{setEditing(false);setMessage('กำลังโหลดข้อมูลกลางล่าสุด');}}>ยกเลิกการแก้ไขและโหลดข้อมูลล่าสุด</button></p>}
      {canEdit && <details style={{marginBottom:16}}><summary>กู้คืนตัวชี้วัดที่ลบ ({recoverable.length})</summary>
        {!recoverable.length && <p>ไม่มีตัวชี้วัดที่กู้คืนได้</p>}
        {recoverable.map(({item,original})=><div key={item.id} style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',padding:'8px 0'}}>
          <span>{item.name} · {item.group}{original && <small> (ข้อมูลต้นฉบับก่อนเปิดใช้ถังพัก)</small>}</span>
          <button type="button" className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>restoreIndicator(item)}>กู้คืน</button>
        </div>)}
        {originalDeleted.length > 0 && <p style={{fontSize:12,color:'var(--text2)'}}>รายการต้นฉบับที่ลบก่อนเปิดใช้ถังพักจะกู้คืนค่าตั้งต้น ข้อมูลที่เคยแก้ไขก่อนลบอาจไม่ครบ</p>}
      </details>}
      {editing?<label className="safety-note-label">คำอธิบายและหมายเหตุข้อมูล<textarea className="safety-note-input" rows={4} maxLength={10000} disabled={saving} value={draft.sourceNote} onChange={e=>setDraft(d=>({...d,sourceNote:e.target.value}))}/></label>:<p style={{fontSize:13,color:'var(--text2)',marginBottom:16,whiteSpace:'pre-wrap'}}>{data.sourceNote}</p>}
      <label style={{display:'block',marginBottom:20}}>หมวดตัวชี้วัด <select value={group} onChange={e=>setGroup(e.target.value)} style={{padding:10,maxWidth:'100%',background:'var(--bg2)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:8}}>{groups.map(g=><option key={g}>{g}</option>)}</select></label>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
        <div role="group" aria-label="รูปแบบช่วงเวลา" style={{display:'flex',gap:6}}>{([['month','รายเดือน'],['quarter','รายไตรมาส'],['year','รายปี']] as const).map(([value,label])=><button key={value} className={`tb-btn ${mode===value?'tb-btn-primary':'tb-btn-ghost'}`} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}</div>
        <button className="tb-btn tb-btn-ghost" disabled={saving||year<=2400} onClick={()=>setYear(y=>y-1)}>ปีก่อนหน้า</button>
        <label>ปี พ.ศ. <input aria-label="ปี พ.ศ." list="safety-calendar-years" type="number" min="2400" max="2800" value={year} onChange={e=>{const value=Number(e.target.value);if(Number.isInteger(value)&&value>=2400&&value<=2800)setYear(value);}} style={{width:100,padding:8,background:'var(--bg2)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:8}}/></label>
        <datalist id="safety-calendar-years">{Array.from(new Set([2564,2565,2566,2567,2568,...((editing?draft:data).years??[])])).sort((a,b)=>a-b).map(y=><option key={y} value={y}/>)}</datalist>
        <button className="tb-btn tb-btn-ghost" disabled={saving||year>=2800} onClick={()=>setYear(y=>y+1)}>ปีถัดไป</button>
        {canEdit&&<button className="tb-btn tb-btn-primary" disabled={saving||year>=2800} onClick={addNextYear}>เพิ่มปีถัดไป</button>}
      </div>
      <p style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>รายไตรมาสใช้ปีงบประมาณ: Q1 ต.ค.–ธ.ค. ของปีก่อน · Q2 ม.ค.–มี.ค. · Q3 เม.ย.–มิ.ย. · Q4 ก.ค.–ก.ย.<br/>รายเดือนและรายปีใช้ปีปฏิทิน มกราคม–ธันวาคม ข้อมูลรายปีงบประมาณเดิมอยู่ในข้อมูลอ้างอิง ไม่มีการเฉลี่ยหรือรวมอัตราอัตโนมัติ</p>
      <p style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>เส้นประสีส้ม = เป้าหมาย · สีเขียว = ผ่าน · สีแดง = ไม่ผ่าน · — = ไม่มีข้อมูล</p>
      <div className="safety-grid">{visible.map(item=>{
        const series=periodSeries(item,data.periods,mode,year,(editing?draft:data).years);
        return <article key={item.id} style={{padding:18,border:'1px solid var(--border2)',borderRadius:14,background:'var(--bg2)',minWidth:0}}>
        <div style={{overflowX:'auto'}}><Trend item={{...item,values:series.map(r=>r.value)}} periods={series.map(r=>r.label)} periodCaption={mode==='year'?'รายปีปฏิทิน (มกราคม–ธันวาคม)':mode==='quarter'?`รายไตรมาส ปีงบประมาณ พ.ศ. ${year}`:`รายเดือน ปี พ.ศ. ${year}`}/></div>
        {series.every(r=>r.value===null)&&<p style={{fontSize:13,color:'var(--text2)',marginBottom:12}}>ยังไม่มีข้อมูลในช่วงเวลานี้{canEdit?' แอดมินสามารถกดแก้ไขเพื่อกรอกข้อมูลได้':''}</p>}
        {item.benchmark&&<p style={{fontSize:12}}>Benchmark: {item.benchmark} (ตามต้นฉบับ)</p>}{item.note&&<p style={{fontSize:12,color:'var(--amber)'}}>{item.note}</p>}
        {canEdit&&!editing&&<button className="tb-btn tb-btn-ghost" style={{margin:'12px 0'}} aria-label={`แก้ไขข้อมูล ${item.name}`} onClick={startEditing}>แก้ไขข้อมูล</button>}
        {editing?<fieldset disabled={saving} style={{border:0,display:'grid',gap:10}}>
          <label>ชื่อตัวชี้วัด<input value={item.name} onChange={e=>patch(item.id,{name:e.target.value})}/></label>
          <p style={{fontSize:12}}>กรอกค่า{mode==='month'?'รายเดือน':mode==='quarter'?'รายไตรมาส':'รายปีเต็ม'} ช่องว่าง = ไม่มีข้อมูล</p>
          <div className="safety-inputs">{series.map(row=><label key={`${row.year}-${row.period}`}>{periodLabel(row.label,mode,mode==='quarter'?year:row.year,row.period)}<input type="number" min="0" step="any" value={row.value??''} placeholder="ไม่มีข้อมูล" onChange={e=>patch(item.id,{measurements:updateMeasurement(item,mode,row.year,row.period,e.target.value===''?null:Number(e.target.value))})}/></label>)}</div>
          {mode==='year'&&<p style={{fontSize:12,color:'var(--text2)'}}>กรอกผลทั้งปี มกราคม–ธันวาคม ข้อมูลปีงบประมาณอ้างอิงยังเก็บแยกไว้ด้านล่าง</p>}
          <div className="safety-inputs"><label>เกณฑ์<select value={item.comparison} onChange={e=>{const comparison=e.target.value; const symbol: Record<string,string>={eq:'=',lt:'<',gt:'>',lte:'≤',gte:'≥'}; patch(item.id,{comparison,...(symbol[comparison]?{targetText:`${symbol[comparison]} ${item.target}`}:{})});}}><option value="eq">=</option><option value="lt">&lt;</option><option value="lte">≤</option><option value="gt">&gt;</option><option value="gte">≥</option><option value="none">ไม่ประเมิน</option></select></label><label>ค่าเป้าหมาย<input type="number" min="0" step="any" value={item.target} onChange={e=>{const target=Number(e.target.value);const symbol: Record<string,string>={lt:'<',gt:'>',lte:'≤',gte:'≥',eq:'='};patch(item.id,{target,targetText:`${symbol[item.comparison] ? `${symbol[item.comparison]} ` : ''}${target}`});}}/></label></div>
          <label>ข้อความเป้าหมาย<input value={item.targetText} onChange={e=>patch(item.id,{targetText:e.target.value})}/></label><label>หน่วย<input value={item.unit} onChange={e=>patch(item.id,{unit:e.target.value})}/></label><label>Benchmark<input value={item.benchmark} onChange={e=>patch(item.id,{benchmark:e.target.value})}/></label><label>หมายเหตุ<textarea value={item.note} onChange={e=>patch(item.id,{note:e.target.value})}/></label>
        </fieldset>:<details style={{fontSize:12}}><summary>ดูค่าช่วงเวลาที่เลือก</summary><table style={{width:'100%',marginTop:10}}><thead><tr><th>ช่วงเวลา</th><th>ค่าที่แสดง</th></tr></thead><tbody>{series.map(r=><tr key={`${r.year}-${r.period}`}><td>{periodLabel(r.label,mode,mode==='quarter'?year:r.year,r.period)}</td><td>{r.value??'ไม่มีข้อมูล'}</td></tr>)}</tbody></table><button type="button" className="tb-btn tb-btn-ghost" style={{marginTop:10}} onClick={() => exportTable(item)}>ส่งออกข้อมูลตาราง Excel (.xlsx)</button></details>}
        <details style={{fontSize:12,marginTop:8}} open={editing?true:undefined}><summary>ข้อมูลอ้างอิงเดิม{editing?' (แก้ไขได้)':''}</summary>
          {item.measurements?.filter(r=>r.mode==='year'&&r.basis!=='calendar').map(r=><p key={`legacy-year-${r.year}`}>ปีงบประมาณ {r.year} (ค่าที่บันทึกก่อนเปลี่ยนระบบปี): {r.value??'ไม่มีข้อมูล'}</p>)}
          {editing?<fieldset disabled={saving} style={{border:0,display:'grid',gap:12,marginTop:12}}>
            <p>แก้ไขข้อมูลอ้างอิงแยกจากค่ารายเดือน/ไตรมาส/ปีที่กรอกด้านบน</p>
            {(item.periods??data.periods).map((p,i)=><div key={`${p}-${i}`} style={{display:'grid',gap:6}}>
              <label>ค่าตัวเลขอ้างอิง {p}<input type="number" min="0" step="any" value={item.values[i]??''} placeholder="ไม่มีข้อมูล" onChange={e=>patch(item.id,{values:item.values.map((v,j)=>j===i?(e.target.value===''?null:Number(e.target.value)):v)})}/></label>
              <label>ข้อความอ้างอิง {p}<textarea maxLength={5000} rows={2} value={item.raw[i]??''} onChange={e=>patch(item.id,{raw:item.values.map((_,j)=>j===i?e.target.value:item.raw[j]??'')})}/></label>
            </div>)}
          </fieldset>:(item.periods??data.periods).map((p,i)=><p key={`${p}-${i}`} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{p}: {item.raw[i]||'ไม่มีข้อมูล'}</p>)}
        </details>
        {editing&&<div style={{marginTop:16}}><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="tb-btn tb-btn-primary" disabled={saving} onClick={save}>{saving?'กำลังบันทึก…':'บันทึกทั้งหมด'}</button><button className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>setEditing(false)}>ยกเลิก</button><button type="button" className="tb-btn tb-btn-ghost" disabled={saving} onClick={()=>removeIndicator(item)}>ลบตัวชี้วัด</button></div>{message&&<p role="status" style={{fontSize:13,marginTop:8}}>{message}</p>}</div>}
      </article>;})}{canEdit && <div className="card" style={{padding:18,border:'1px solid var(--border2)',borderRadius:14}}>
        <h3>เพิ่มตัวชี้วัดใหม่</h3>
        <p style={{fontSize:13,color:'var(--text2)',margin:'8px 0'}}>เพิ่มในหมวด {group}</p>
        <label>ชื่อตัวชี้วัด<input value={newIndicatorName} maxLength={300} disabled={saving} onChange={event=>setNewIndicatorName(event.target.value)} /></label>
        <button type="button" className="tb-btn tb-btn-primary" style={{marginTop:12}} disabled={saving} onClick={addIndicator}>เพิ่มตัวชี้วัด</button>
      </div>}</div>
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
