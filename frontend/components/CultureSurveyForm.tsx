'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CultureSurveyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/culture-surveys', { method: 'POST', body: new FormData(event.currentTarget) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
      setOpen(false); router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <section className="card" style={{ marginBottom: 16 }}>
    <div className="card-header"><div className="card-title">จัดการผลสำรวจ</div><button type="button" className="tb-btn tb-btn-primary" onClick={() => { setOpen(!open); setError(''); }}>{open ? 'ปิด' : '+ เพิ่มผลสำรวจปีใหม่'}</button></div>
    {open && <div className="card-body"><form className="survey-form" onSubmit={submit}>
      <p>กรอกตัวเลขจากรายงานด้วยตนเอง ระบบยังไม่อ่านตัวเลขจากไฟล์อัตโนมัติ</p>
      <label>ปี พ.ศ.<input name="year" type="number" min="2568" max="2700" required /></label>
      <div className="survey-form-grid">{[['excellent', 'ดีเยี่ยม'], ['very_good', 'ดีมาก'], ['acceptable', 'ยอมรับได้'], ['poor', 'ไม่ดี'], ['falling', 'ตก']].map(([key, label]) => <label key={key}>จำนวน {label} (คน)<input name={key} type="number" min="0" max="10000000" step="1" required /></label>)}</div>
      <div className="survey-form-grid"><label>ดีเยี่ยม (%)<input name="excellent_pct" type="number" min="0" max="100" step="0.01" required /></label><label>ดีมาก (%)<input name="very_good_pct" type="number" min="0" max="100" step="0.01" required /></label></div>
      <label>แนบรายงานฉบับเต็ม (ไม่บังคับ)<input type="file" name="report" accept=".pptx,.pdf" /><small>ไฟล์ PowerPoint (.pptx) หรือ PDF ขนาดไม่เกิน 3 MB</small></label>
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <button className="tb-btn tb-btn-primary" disabled={busy} type="submit">{busy ? 'กำลังบันทึก…' : 'บันทึกผลสำรวจ'}</button>
    </form></div>}
  </section>;
}
