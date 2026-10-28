'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CultureSurveyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  async function extract() {
    const form = formRef.current;
    if (!form) return;
    const year = (form.elements.namedItem('year') as HTMLInputElement).value;
    const file = (form.elements.namedItem('report') as HTMLInputElement).files?.[0];
    if (!year || !file) { setError('กรุณากรอกปี พ.ศ. และเลือกไฟล์ก่อนอ่านข้อมูล'); return; }
    setReading(true); setError(''); setMessage('');
    try {
      const data = new FormData(); data.append('year', year); data.append('report', file);
      const response = await fetch('/api/culture-surveys/extract', { method: 'POST', body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'อ่านไฟล์ไม่สำเร็จ');
      let filled = 0;
      for (const [key, value] of Object.entries(body.fields as Record<string, number>)) {
        const input = form.elements.namedItem(key) as HTMLInputElement | null;
        if (input && !input.value) { input.value = String(value); filled++; }
      }
      setMessage(filled ? `เติมข้อมูลได้ ${filled} ช่อง กรุณาตรวจสอบกับไฟล์ และกรอกช่องที่ยังว่างก่อนบันทึก` : 'ไม่พบตัวเลขที่ระบุปีได้ชัดเจน หรือช่องมีข้อมูลอยู่แล้ว กรุณาตรวจสอบและกรอกด้วยตนเอง');
    } catch (err) { setError((err as Error).message); } finally { setReading(false); }
  }
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
    {open && <div className="card-body"><form ref={formRef} className="survey-form" onSubmit={submit}>
      <p>กรอกปี เลือกไฟล์ แล้วกดอ่านข้อมูลอัตโนมัติ จากนั้นตรวจสอบตัวเลขก่อนบันทึก</p>
      <label>ปี พ.ศ.<input name="year" type="number" min="2568" max="2700" required /></label>
      <div className="survey-form-grid">{[['excellent', 'ดีเยี่ยม'], ['very_good', 'ดีมาก'], ['acceptable', 'ยอมรับได้'], ['poor', 'ไม่ดี'], ['falling', 'ตก']].map(([key, label]) => <label key={key}>จำนวน {label} (คน)<input name={key} type="number" min="0" max="10000000" step="1" required /></label>)}</div>
      <div className="survey-form-grid"><label>ดีเยี่ยม (%)<input name="excellent_pct" type="number" min="0" max="100" step="0.01" required /></label><label>ดีมาก (%)<input name="very_good_pct" type="number" min="0" max="100" step="0.01" required /></label></div>
      <label>แนบรายงานฉบับเต็ม (ไม่บังคับ)<input type="file" name="report" accept=".pptx,.pdf,.docx" onChange={() => setMessage('')} /><small>ไฟล์ PPTX, PDF หรือ DOCX ขนาดไม่เกิน 3 MB · ไฟล์สแกนที่ไม่มีข้อความอาจอ่านตัวเลขไม่ได้</small></label>
      <button className="tb-btn tb-btn-ghost" type="button" disabled={reading || busy} onClick={extract}>{reading ? 'กำลังอ่านไฟล์…' : 'อ่านข้อมูลจากไฟล์'}</button>
      {message && <p role="status">{message}</p>}
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <button className="tb-btn tb-btn-primary" disabled={busy} type="submit">{busy ? 'กำลังบันทึก…' : 'บันทึกผลสำรวจ'}</button>
    </form></div>}
  </section>;
}
