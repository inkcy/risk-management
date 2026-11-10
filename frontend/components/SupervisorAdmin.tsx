'use client';

import { useState, type FormEvent } from 'react';

export function SupervisorAdmin({ units }: { units: { id: number; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/risk-units/supervisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unit_id: Number(data.get('unit_id')), password: data.get('password') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Session หมดอายุ กรุณาเข้าสู่ระบบแอดมินใหม่' : result.error || 'บันทึกไม่สำเร็จ');
      form.reset(); setMessage('บันทึกรหัสหัวหน้าแล้ว กรุณาแจ้งรหัสให้หัวหน้าหน่วยงานอย่างปลอดภัย');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  return <details className="card" style={{ marginBottom: 16, padding: 16 }}>
    <summary>กำหนดรหัสหัวหน้าหน่วยงาน</summary>
    <form className="survey-form" onSubmit={submit} style={{ marginTop: 12 }}>
      <label>หน่วยงาน<select name="unit_id" required defaultValue=""><option value="" disabled>เลือกหน่วยงาน</option>{units.filter(unit => unit.name.trim().toLowerCase() !== 'admin').map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      <label>รหัสหัวหน้า<input name="password" type="password" required minLength={7} maxLength={128} autoComplete="new-password" /></label>
      <p>ตั้งรหัสเฉพาะของแต่ละหน่วยงาน การตั้งรหัสใหม่จะออกจากระบบหัวหน้าเดิม</p>
      <button className="tb-btn tb-btn-primary" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสหัวหน้า'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
