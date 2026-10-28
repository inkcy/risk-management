'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RiskUnitLogin() {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      const response = await fetch('/api/risk-units/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data.entries())) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
      router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <section className="card"><div className="card-header"><div className="card-title">เข้าสู่ Risk Profile ของหน่วยงาน</div></div><div className="card-body">
    <form className="survey-form" onSubmit={login}>
      <p>ใช้ชื่อผู้ใช้และรหัสผ่านหน่วยงานที่ผู้ดูแลระบบกำหนด</p>
      <label>ชื่อผู้ใช้หน่วยงาน<input name="username" required autoComplete="username" /></label>
      <label>รหัสผ่านหน่วยงาน<input name="password" type="password" required autoComplete="current-password" /></label>
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <button className="tb-btn tb-btn-primary" type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบหน่วยงาน'}</button>
    </form>
  </div></section>;
}
