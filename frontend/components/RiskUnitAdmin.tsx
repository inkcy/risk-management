'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RiskUnitAdmin({ units }: { units: { id: number; name: string; username: string }[] }) {
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
  return <details className="card" style={{ marginBottom: 16, padding: 16 }}><summary>สร้างบัญชี Risk Profile สำหรับหน่วยงาน</summary>
    <form className="survey-form" onSubmit={submit} style={{ marginTop: 12 }}>
      <label>ชื่อหน่วยงาน<input name="name" required maxLength={160} /></label>
      <label>ชื่อผู้ใช้<input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9._-]+" autoComplete="off" /></label>
      <label>รหัสผ่าน<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /><small>อย่างน้อย 12 ตัวอักษร</small></label>
      {error && <p className="announcement-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <button className="tb-btn tb-btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังสร้าง…' : 'สร้างบัญชี'}</button>
    </form>
    {units.length > 0 && <form className="survey-form" onSubmit={resetPassword} style={{ marginTop: 20 }}>
      <strong>เปลี่ยนรหัสผ่านหน่วยงาน</strong>
      <label>หน่วยงาน<select name="id" required>{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} ({unit.username})</option>)}</select></label>
      <label>รหัสผ่านใหม่<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
      <button className="tb-btn tb-btn-ghost" disabled={busy} type="submit">เปลี่ยนรหัสผ่าน</button>
    </form>}
  </details>;
}
