'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { riskUnitDirectory } from '@/lib/riskUnitDirectory';

export function RiskUnitLogin() {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login'); const [notice, setNotice] = useState('');
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      const response = await fetch('/api/risk-units/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data.entries())) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
      router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError(''); setNotice('');
    if (data.get('password') !== data.get('confirm_password')) { setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); setBusy(false); return; }
    try {
      const response = await fetch('/api/risk-units/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), username: data.get('username'), password: data.get('password') }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'ส่งคำขอไม่สำเร็จ');
      form.reset(); setNotice('ส่งคำขอแล้ว กรุณารอแอดมินอนุมัติก่อนเข้าสู่ระบบ'); setMode('login');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <section className="card"><div className="card-header"><div className="card-title">Risk Profile ของหน่วยงาน</div></div><div className="card-body">
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button type="button" className={`tb-btn ${mode === 'login' ? 'tb-btn-primary' : 'tb-btn-ghost'}`} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
      <button type="button" className={`tb-btn ${mode === 'signup' ? 'tb-btn-primary' : 'tb-btn-ghost'}`} onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>Sign up</button>
    </div>
    {notice && <p role="status" style={{ marginBottom: 12, color: 'var(--green)' }}>{notice}</p>}
    {mode === 'login' ? <form className="survey-form" onSubmit={login}>
      <p>ใช้ชื่อหน่วยงานและรหัสผ่านที่ผู้ดูแลระบบกำหนด</p>
      <label>ชื่อหน่วยงาน<input name="name" required maxLength={255} autoComplete="username" /></label>
      <label>รหัสผ่านหน่วยงาน<input name="password" type="password" required autoComplete="current-password" /></label>
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <button className="tb-btn tb-btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบหน่วยงาน'}</button>
    </form> : <form className="survey-form" onSubmit={signup}>
      <p>สมัครบัญชีหน่วยงานใหม่และรอแอดมินตรวจสอบ หากหน่วยงานมีบัญชีแล้ว กรุณาติดต่อผู้ดูแลระบบ</p>
      <label>ชื่อหน่วยงาน<select name="name" required defaultValue=""><option value="" disabled>เลือกหน่วยงาน</option>{riskUnitDirectory.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label>ชื่อผู้ใช้หน่วยงาน<input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9._-]+" autoComplete="username" /><small>ภาษาอังกฤษ ตัวเลข และ . _ -</small></label>
      <label>รหัสผ่าน<input name="password" type="password" required minLength={7} maxLength={128} autoComplete="new-password" /><small>อย่างน้อย 7 ตัวอักษร</small></label>
      <label>ยืนยันรหัสผ่าน<input name="confirm_password" type="password" required minLength={7} maxLength={128} autoComplete="new-password" /></label>
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <button className="tb-btn tb-btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังส่งคำขอ…' : 'Sign up · ส่งคำขอ'}</button>
    </form>}
  </div></section>;
}
