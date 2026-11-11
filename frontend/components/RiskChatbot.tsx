'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type Message = { role: 'user' | 'assistant'; text: string };
export function RiskChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, busy]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const pending: Message[] = [...messages.slice(-18), { role: 'user', text }];
    setMessages(pending); setInput(''); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/chatbot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: pending }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'ส่งข้อความไม่สำเร็จ');
      setMessages(previous => [...previous, { role: 'assistant', text: body.reply }]);
    } catch (err) {
      setMessages(previous => previous.slice(0, -1)); setInput(text);
      setError(err instanceof Error ? err.message : 'ส่งข้อความไม่สำเร็จ');
    } finally { setBusy(false); }
  }
  return <section className="card" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
    <h2>Chatbot ผู้ช่วยบริหารความเสี่ยง</h2>
    <p style={{ color: 'var(--text2)', margin: '8px 0' }}>สอบถามเกี่ยวกับการบริหารความเสี่ยงและความปลอดภัยในโรงพยาบาล</p>
    <p style={{ color: 'var(--text2)', fontSize: 13 }}>ข้อความจะถูกส่งไปยังบริการ AI กรุณาไม่ใส่ชื่อ เลขประจำตัว หรือข้อมูลที่ระบุตัวผู้ป่วย และตรวจสอบคำตอบก่อนนำไปใช้</p>
    <div ref={logRef} role="log" aria-live="polite" aria-label="บทสนทนา" style={{ minHeight: 280, maxHeight: '55vh', overflowY: 'auto', padding: 16, margin: '16px 0', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!messages.length && <p style={{ color: 'var(--text2)' }}>สวัสดีครับ มีคำถามเกี่ยวกับการบริหารความเสี่ยงเรื่องใดบ้าง?</p>}
      {messages.map((message, index) => <div key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', padding: '10px 14px', borderRadius: 12, background: message.role === 'user' ? 'var(--green)' : 'var(--bg3, #eef6f8)', color: message.role === 'user' ? '#fff' : 'var(--text)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><strong>{message.role === 'user' ? 'คุณ' : 'ผู้ช่วย AI'}</strong><br />{message.text}</div>)}
      {busy && <p role="status">กำลังตอบ…</p>}
    </div>
    {error && <p className="announcement-error" role="alert">{error}</p>}
    <form onSubmit={send} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <label style={{ flex: '1 1 250px' }}>ข้อความ<textarea value={input} onChange={event => setInput(event.target.value)} maxLength={4000} rows={3} disabled={busy} placeholder="พิมพ์คำถามของคุณ" style={{ display: 'block', width: '100%' }} /></label>
      <button className="tb-btn tb-btn-primary" disabled={busy || !input.trim()} type="submit">{busy ? 'กำลังส่ง…' : 'ส่งข้อความ'}</button>
      <button className="tb-btn tb-btn-ghost" disabled={busy || !messages.length} type="button" onClick={() => { setMessages([]); setError(''); }}>เริ่มบทสนทนาใหม่</button>
    </form>
    <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 10 }}>บทสนทนาจะอยู่ในหน้านี้จนกว่าจะรีเฟรชหรือเริ่มบทสนทนาใหม่</p>
  </section>;
}
