'use client';
import { useEffect, useState } from 'react';

type Code = { id: number; display_name: string; unit_ids: number[] };
export function DepartmentCodeAccess({ units }: { units: { id: number; name: string }[] }) {
  const [codes, setCodes] = useState<Code[]>([]), [selected, setSelected] = useState(''), [unitIds, setUnitIds] = useState<number[]>([]);
  const [enforced, setEnforced] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/risk-units/code-access', { cache: 'no-store' });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'โหลดสิทธิ์ไม่สำเร็จ');
    setCodes(data.codes); setEnforced(data.enforced);
    return data.codes as Code[];
  }
  useEffect(() => { load().catch(error => setMessage(error.message)); }, []);
  async function save(action: 'assign' | 'activate') {
    if (action === 'activate' && !window.confirm('เปิดตรวจสิทธิ์หน่วยงานและยกเลิกรหัสร่วมเดิม เจ้าหน้าที่ต้องเข้าสู่ระบบใหม่ ยืนยันหรือไม่?')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/risk-units/code-access', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,code_id:Number(selected),unit_ids:unitIds}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      await load(); setMessage(action === 'activate' ? 'เปิดตรวจสิทธิ์หน่วยงานแล้ว' : 'บันทึกหน่วยงานที่อนุญาตแล้ว เจ้าหน้าที่ต้องเข้าสู่ระบบใหม่');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); }
  }
  const missing = codes.filter(code => !code.unit_ids.length).length;
  return <details className="card" style={{ marginBottom:16,padding:16 }}><summary>กำหนดหน่วยงานให้รหัสเจ้าหน้าที่</summary>
    <div className="survey-form" style={{marginTop:12}}>
      <p>เลือกเจ้าหน้าที่และหน่วยงานที่ได้รับสิทธิ์ บันทึกให้ครบทุกรหัสก่อนเปิดการตรวจสิทธิ์ ระบบไม่แสดงรหัสผ่าน</p>
      <p>สถานะ: {enforced ? 'เปิดตรวจสิทธิ์แล้ว' : 'ยังไม่เปิดตรวจสิทธิ์'} · {codes.length} รหัส · ยังไม่กำหนด {missing} รหัส</p>
      <label>เจ้าหน้าที่<select value={selected} onChange={event => { const id=event.target.value; setSelected(id); setUnitIds(codes.find(code=>String(code.id)===id)?.unit_ids ?? []); }}><option value="">เลือกเจ้าหน้าที่</option>{codes.map(code=><option key={code.id} value={code.id}>{code.display_name}{!code.unit_ids.length ? ' · ยังไม่กำหนด' : ''}</option>)}</select></label>
      {selected && <fieldset><legend>หน่วยงานที่อนุญาต</legend><div style={{maxHeight:220,overflowY:'auto'}}>{units.filter(unit=>!['admin','dev'].includes(unit.name.trim().toLowerCase())).map(unit=><label key={unit.id} style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={unitIds.includes(unit.id)} onChange={event=>setUnitIds(current=>event.target.checked?[...current,unit.id]:current.filter(id=>id!==unit.id))} />{unit.name}</label>)}</div></fieldset>}
      <button type="button" className="tb-btn tb-btn-primary" disabled={busy || !selected} onClick={()=>save('assign')}>บันทึกสิทธิ์</button>
      {!enforced && <button type="button" className="tb-btn tb-btn-ghost" disabled={busy || !codes.length || missing>0} onClick={()=>save('activate')}>เปิดตรวจสิทธิ์หน่วยงาน</button>}
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
