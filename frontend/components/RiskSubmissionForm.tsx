'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RiskSubmission } from '@/lib/riskSubmissions';

export function RiskSubmissionForm({ unit, submissions }: { unit: { id: number; name: string }; submissions: RiskSubmission[] }) {
  const router = useRouter();
  const [year, setYear] = useState(() => { const now = new Date(); return now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0); });
  const [quarter, setQuarter] = useState(() => Math.floor(((new Date().getMonth() + 3) % 12) / 3) + 1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submitted = submissions.find(item => item.unit_id === unit.id && item.year === year && item.quarter === quarter);

  async function submit() {
    if (!window.confirm(`ยืนยันส่ง Risk Profile ของ ${unit.name} ปี ${year} ไตรมาส ${quarter} หรือไม่?`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/unit-risks/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, quarter }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'ยืนยันการส่งไม่สำเร็จ');
      setMessage(body.alreadySubmitted ? 'ไตรมาสนี้ยืนยันส่งแล้ว' : 'ยืนยันการส่งแล้ว');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ยืนยันการส่งไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  return <section className="card" style={{ marginBottom: 16 }}>
    <div className="card-header"><h2 className="card-title">ยืนยันส่ง Risk Profile รายไตรมาส</h2></div>
    <div className="card-body">
      <p>หน่วยงาน {unit.name}</p>
      <div className="risk-assessment-fields">
        <label>ปีงบประมาณ พ.ศ.<input type="number" min={2500} max={2700} value={year} onChange={event => { setYear(Number(event.target.value)); setMessage(''); }} /></label>
        <label>ไตรมาส<select value={quarter} onChange={event => { setQuarter(Number(event.target.value)); setMessage(''); }}>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <p style={{ margin: '10px 0' }}>{submitted ? `ส่งแล้ว เมื่อ ${new Date(submitted.submitted_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` : 'ยังไม่ยืนยันส่ง'}</p>
      <p style={{ color: 'var(--text2)', fontSize: 13 }}>การยืนยันจะเก็บสำเนา Clinical และ Non-Clinical ของหน่วยงานในไตรมาสที่เลือก การแก้ไขภายหลังจะไม่เปลี่ยนสำเนาที่ส่งแล้ว โปรดตรวจสอบข้อมูลก่อนส่ง</p>
      <button type="button" className="tb-btn tb-btn-primary" disabled={busy || !!submitted || year < 2500 || year > 2700} onClick={submit}>ยืนยันส่งไตรมาสนี้</button>
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
