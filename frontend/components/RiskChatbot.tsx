'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type Message = { role: 'user' | 'assistant'; text: string };
export function RiskChatbot({ compact = false }: { compact?: boolean }) {
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
  return <section className={`risk-chat ${compact ? 'risk-chat-compact' : ''}`}>
    {!compact && <header className="risk-chat-header"><span className="risk-chat-mark" aria-hidden="true">✦</span><div><h2>ผู้ช่วยบริหารความเสี่ยง</h2><p>ค้นหาคำตอบจากเอกสารอ้างอิงของคุณ</p></div><span className="risk-chat-badge">AI ASSISTANT</span></header>}
    <div ref={logRef} role="log" aria-live="polite" aria-label="บทสนทนา" className="risk-chat-log">
      {!messages.length && <div className="risk-chat-welcome"><span className="risk-chat-welcome-icon" aria-hidden="true">✦</span><h3>สวัสดีครับ มีอะไรให้ช่วยค้นหา?</h3><p>สอบถามเรื่องความเสี่ยงและความปลอดภัย โดยอ้างอิงจากเอกสารที่เตรียมไว้</p><div className="risk-chat-suggestions">{['RCA 5 Tier คืออะไร', 'Risk Register มีองค์ประกอบอะไรบ้าง', 'แนวทาง Patient Safety Goals'].map(question => <button key={question} type="button" onClick={() => setInput(question)}>{question} ↗</button>)}</div></div>}
      {messages.map((message, index) => <div key={index} className={`risk-chat-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}><span className="risk-chat-avatar" aria-hidden="true">{message.role === 'user' ? '●' : '✦'}</span><div><strong>{message.role === 'user' ? 'คุณ' : 'ผู้ช่วย AI'}</strong><p>{message.text}</p></div></div>)}
      {busy && <p role="status" className="risk-chat-status">กำลังค้นหาข้อความจากเอกสาร…</p>}
    </div>
    <div className="risk-chat-bottom">
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <form onSubmit={send} className="risk-chat-compose">
        <label className="risk-chat-input"><span className="risk-chat-sr-only">ข้อความ</span><textarea value={input} onChange={event => setInput(event.target.value)} maxLength={4000} rows={compact ? 2 : 3} disabled={busy} placeholder="พิมพ์คำถามเกี่ยวกับเอกสาร..." /></label>
        <button className="risk-chat-send" disabled={busy || !input.trim()} type="submit" aria-label="ส่งข้อความ">➤</button>
      </form>
      <div className="risk-chat-meta"><span>คำตอบคัดจากเอกสาร · ข้อความส่งไปยังบริการ AI</span><button disabled={busy || !messages.length} type="button" onClick={() => { setMessages([]); setError(''); }}>เริ่มบทสนทนาใหม่</button></div>
      <p className="risk-chat-privacy">กรุณาไม่ใส่ข้อมูลระบุตัวผู้ป่วย และตรวจสอบคำตอบกับเอกสารต้นฉบับ</p>
    </div>
  </section>;
}
