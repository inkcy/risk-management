'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { riskUnitDirectory } from '@/lib/riskUnitDirectory';

export function RiskUnitAdmin({ units, pending }: { units: { id: number; name: string; username: string }[]; pending: { id: number; name: string; username: string; requester: string | null }[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/risk-units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data.entries())) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
      form.reset(); setNotice('สร้างบัญชีหน่วยงานแล้ว'); router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/risk-units', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(data.get('id')), password: data.get('password') }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      form.reset(); setNotice('เปลี่ยนรหัสผ่านแล้ว และออกจากระบบหน่วยงานเดิมทุกเครื่อง');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function renameUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/risk-units', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(data.get('id')), name: data.get('name'), action: 'rename' }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'แก้ไขชื่อหน่วยงานไม่สำเร็จ');
      form.reset(); setNotice('แก้ไขชื่อหน่วยงานแล้ว'); router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function approve(id: number) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/risk-units', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'อนุมัติไม่สำเร็จ');
      setNotice('อนุมัติบัญชีแล้ว'); router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function reject(id: number) {
    if (!window.confirm('ยืนยันการปฏิเสธและลบคำขอสมัครนี้?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/risk-units', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'reject' }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'ปฏิเสธคำขอไม่สำเร็จ');
      setNotice('ปฏิเสธคำขอแล้ว'); router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <details className="card" style={{ marginBottom: 16, padding: 16 }}><summary>จัดการบัญชี Risk Profile {pending.length > 0 && `· คำขอรออนุมัติ ${pending.length} รายการ`}</summary>
    {pending.length > 0 && <div style={{ marginTop: 16 }}><strong>คำขอรออนุมัติ ({pending.length})</strong>
      {pending.map(unit => <div key={unit.id} className="unit-risk-list-item"><span>{unit.name} · {unit.username}<br /><small>ผู้ขอ: {unit.requester || 'ไม่ทราบ'}</small></span><div style={{ display: 'flex', gap: 8 }}><button type="button" className="tb-btn tb-btn-primary" disabled={busy} onClick={() => approve(unit.id)}>อนุมัติ</button><button type="button" className="tb-btn tb-btn-ghost" disabled={busy} onClick={() => reject(unit.id)}>ปฏิเสธ</button></div></div>)}
    </div>}
    <form className="survey-form" onSubmit={submit} style={{ marginTop: 12 }}>
      <label>ชื่อหน่วยงาน<select name="name" required defaultValue=""><option value="" disabled>เลือกหน่วยงาน</option>{riskUnitDirectory.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label>ชื่อผู้ใช้<input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9._-]+" autoComplete="off" /></label>
      <label>รหัสผ่าน<input name="password" type="password" required minLength={7} maxLength={128} autoComplete="new-password" /><small>อย่างน้อย 7 ตัวอักษร</small></label>
      {error && <p className="announcement-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <button className="tb-btn tb-btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังสร้าง…' : 'สร้างบัญชี'}</button>
    </form>
    {units.length > 0 && <form className="survey-form" onSubmit={renameUnit} style={{ marginTop: 20 }}>
      <strong>แก้ไขชื่อหน่วยงาน</strong>
      <label>หน่วยงาน<select name="id" required>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      <label>ชื่อหน่วยงานใหม่<input name="name" required maxLength={255} /></label>
      <button className="tb-btn tb-btn-ghost" disabled={busy} type="submit">บันทึกชื่อหน่วยงาน</button>
    </form>}
    {units.length > 0 && <form className="survey-form" onSubmit={resetPassword} style={{ marginTop: 20 }}>
      <strong>เปลี่ยนรหัสผ่านหน่วยงาน</strong>
      <label>หน่วยงาน<select name="id" required>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.username})</option>)}</select></label>
      <label>รหัสผ่านใหม่<input name="password" type="password" required minLength={7} maxLength={128} autoComplete="new-password" /></label>
      <button className="tb-btn tb-btn-ghost" disabled={busy} type="submit">เปลี่ยนรหัสผ่าน</button>
    </form>}
  </details>;
}
