'use client';

import { useState, type FormEvent } from 'react';

export function DepartmentLogin({ units, next }: { units: readonly string[]; next?: string }) {
  const [unitName, setUnitName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!units.includes(unitName)) { setError('กรุณาเลือกหน่วยงานจากรายการ'); return; }
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/department', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitName, password: form.get('password') }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
      window.location.assign(next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/');
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return <form className="survey-form department-login" onSubmit={login}>
    <label htmlFor="login-department">หน่วยงาน</label>
    <input id="login-department" list="login-departments" value={unitName} placeholder="พิมพ์เพื่อค้นหาและเลือกหน่วยงาน" onChange={event => { setUnitName(event.target.value); setError(''); }} required disabled={busy} autoComplete="off" aria-describedby="login-department-help" />
    <datalist id="login-departments">{units.map(name => <option key={name} value={name} />)}</datalist>
    <p id="login-department-help" style={{ color: 'var(--text2)', fontSize: 13 }}>ค้นหาและเลือกได้จาก {units.length} หน่วยงาน</p>
    <label>รหัสผ่าน / รหัสตามรายชื่อ<input name="password" type="password" required maxLength={128} autoComplete="current-password" disabled={busy} /></label>
    <p style={{color:'var(--text2)',fontSize:13}}>ใช้รหัสเต็มตามไฟล์รายชื่อที่ได้รับ หรือรหัสผ่านบัญชีหน่วยงาน</p>
    {error && <p className="announcement-error" role="alert">{error}</p>}
    <button className="tb-btn tb-btn-primary" type="submit" disabled={busy || !unitName}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
  </form>;
}
