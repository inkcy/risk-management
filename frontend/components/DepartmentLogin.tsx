'use client';

import { useState, type FormEvent } from 'react';

export function DepartmentLogin({ units, next }: { units: readonly string[]; next?: string }) {
  const [search, setSearch] = useState('');
  const [unitName, setUnitName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = units.filter(name => name.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')));

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return <form className="survey-form" onSubmit={login} style={{ textAlign: 'left' }}>
    <label>ค้นหาชื่อหน่วยงาน<input type="search" value={search} placeholder="พิมพ์ชื่อหน่วยงานของคุณ" onChange={event => { setSearch(event.target.value); setUnitName(''); }} /></label>
    <label>เลือกหน่วยงาน<select required value={unitName} onChange={event => setUnitName(event.target.value)} disabled={busy}>
      <option value="">เลือกหน่วยงานของคุณ</option>
      {filtered.map(name => <option key={name} value={name}>{name}</option>)}
    </select></label>
    <p role="status" style={{ color: 'var(--text2)', fontSize: 13 }}>{filtered.length ? `พบ ${filtered.length} หน่วยงาน` : 'ไม่พบหน่วยงาน กรุณาลองคำค้นอื่นหรือติดต่อผู้ดูแลระบบ'}</p>
    <label>รหัสผ่าน<input name="password" type="password" required maxLength={128} autoComplete="current-password" disabled={busy} /></label>
    {error && <p className="announcement-error" role="alert">{error}</p>}
    <button className="tb-btn tb-btn-primary" type="submit" disabled={busy || !unitName}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
  </form>;
}
