'use client';

import { useState, type FormEvent } from 'react';

export function DepartmentLogin({ units, next }: { units: { id: number; name: string }[]; next?: string }) {
  const [search, setSearch] = useState('');
  const [unitId, setUnitId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = units.filter(unit => unit.name.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')));

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/department', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: Number(unitId), password: form.get('password') }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'เข้าสู่ระบบไม่สำเร็จ');
      window.location.assign(next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/');
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return <form className="survey-form" onSubmit={login} style={{ textAlign: 'left' }}>
    <label>ค้นหาชื่อหน่วยงาน<input type="search" value={search} placeholder="พิมพ์ชื่อหน่วยงานของคุณ" onChange={event => { setSearch(event.target.value); setUnitId(''); }} /></label>
    <label>เลือกหน่วยงาน<select required value={unitId} onChange={event => setUnitId(event.target.value)} disabled={busy}>
      <option value="">เลือกหน่วยงานของคุณ</option>
      {filtered.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
    </select></label>
    <p role="status" style={{ color: 'var(--text2)', fontSize: 13 }}>{filtered.length ? `พบ ${filtered.length} หน่วยงาน` : 'ไม่พบหน่วยงาน กรุณาลองคำค้นอื่นหรือติดต่อผู้ดูแลระบบ'}</p>
    <label>รหัสผ่าน<input name="password" type="password" required maxLength={128} autoComplete="current-password" disabled={busy} /></label>
    {error && <p className="announcement-error" role="alert">{error}</p>}
    <button className="tb-btn tb-btn-primary" type="submit" disabled={busy || !unitId}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
  </form>;
}
