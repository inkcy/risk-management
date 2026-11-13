'use client';

import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { ChatScopeContext } from './ChatScope';
import { loadChatHistory, saveChatHistory, type ChatMessage, type ChatVisual, type ChatSource } from '@/lib/chatHistory';

type Visual = ChatVisual;
type Message = ChatMessage;
export function RiskChatbot({ compact = false }: { compact?: boolean }) {
  const scope = useContext(ChatScopeContext);
  const [historyScope, setHistoryScope] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { setMessages(scope ? loadChatHistory(window.sessionStorage, scope) : []); } catch { setMessages([]); }
    setHistoryScope(scope);
  }, [scope]);
  useEffect(() => {
    try { if (scope && historyScope === scope && !busy) saveChatHistory(window.sessionStorage, scope, messages); } catch { /* Browser storage may be unavailable. */ }
  }, [scope, historyScope, busy, messages]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, busy]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const pending: Message[] = [...messages.slice(-18), { role: 'user', text }];
    setMessages(pending); setInput(''); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/chatbot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: pending.map(({ role, text }) => ({ role, text })) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'ส่งข้อความไม่สำเร็จ');
      const images = Array.isArray(body.images) ? body.images.filter((image: Visual) => typeof image?.id === 'string' && /^[a-f0-9]{24}$/.test(image.id) && typeof image.label === 'string' && image.label.length <= 1000 && (image.kind === undefined || image.kind === 'images' || image.kind === 'pages')).slice(0, 4) : [];
      const sources = Array.isArray(body.sources) ? body.sources.filter((source: ChatSource) => source && Number.isInteger(source.number) && source.number >= 1 && source.number <= 8 && typeof source.label === 'string' && source.label.length <= 1000 && (source.id === undefined || (typeof source.id === 'string' && /^[a-f0-9]{24}$/.test(source.id))) && (source.kind === undefined || source.kind === 'images' || source.kind === 'pages')).slice(0, 8) : [];
      setMessages(previous => [...previous, { role: 'assistant', text: body.reply, images, sources }]);
    } catch (err) {
      setMessages(previous => previous.slice(0, -1)); setInput(text);
      setError(err instanceof Error ? err.message : 'ส่งข้อความไม่สำเร็จ');
    } finally { setBusy(false); }
  }
  return <section className={`risk-chat ${compact ? 'risk-chat-compact' : ''}`}>
    {!compact && <header className="risk-chat-header"><span className="risk-chat-mark" aria-hidden="true">✦</span><div><h2>ผู้ช่วยบริหารความเสี่ยง</h2><p>ค้นหาคำตอบจากเอกสารอ้างอิงของคุณ</p></div><span className="risk-chat-badge">AI ASSISTANT</span></header>}
    <div ref={logRef} role="log" aria-live="polite" aria-label="บทสนทนา" className="risk-chat-log">
      {!messages.length && <div className="risk-chat-welcome"><span className="risk-chat-welcome-icon" aria-hidden="true">✦</span><h3>สวัสดีครับ มีอะไรให้ช่วยค้นหา?</h3><p>สอบถามเรื่องความเสี่ยงและความปลอดภัย โดยอ้างอิงจากเอกสารที่เตรียมไว้</p><div className="risk-chat-suggestions">{['RCA 5 Tier คืออะไร', 'Risk Register มีองค์ประกอบอะไรบ้าง', 'แนวทาง Patient Safety Goals'].map(question => <button key={question} type="button" onClick={() => setInput(question)}>{question} ↗</button>)}</div></div>}
      {messages.map((message, index) => <div key={index} className={`risk-chat-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}><span className="risk-chat-avatar" aria-hidden="true">{message.role === 'user' ? '●' : '✦'}</span><div><strong>{message.role === 'user' ? 'คุณ' : 'ผู้ช่วย AI'}</strong><p>{message.text.split('\n').map((line, lineIndex, lines) => { const match = message.role === 'assistant' && line.match(/^\[(\d+)\]\s/); const source = match ? message.sources?.find(item => item.number === Number(match[1])) : undefined; return <span key={lineIndex}>{source?.id ? <a href={`/api/chatbot/${source.kind === 'pages' ? 'pages' : 'images'}/${source.id}`} target="_blank" rel="noopener noreferrer">{line}</a> : line}{lineIndex < lines.length - 1 ? '\n' : ''}</span>; })}</p>{message.images?.map(image => <figure key={image.id} className="risk-chat-figure"><a href={`/api/chatbot/${image.kind === 'pages' ? 'pages' : 'images'}/${image.id}`} target="_blank" rel="noopener noreferrer"><img loading="lazy" src={`/api/chatbot/${image.kind === 'pages' ? 'pages' : 'images'}/${image.id}`} alt={`ภาพอ้างอิง ${image.label}`} /></a><figcaption>{image.label} · กดภาพเพื่อขยาย</figcaption></figure>)}</div></div>)}
      {busy && <p role="status" className="risk-chat-status">กำลังค้นหาข้อความจากเอกสาร…</p>}
    </div>
    <div className="risk-chat-bottom">
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <form onSubmit={send} className="risk-chat-compose">
        <label className="risk-chat-input"><span className="risk-chat-sr-only">ข้อความ</span><textarea value={input} onChange={event => setInput(event.target.value)} maxLength={4000} rows={2} disabled={busy} placeholder="พิมพ์คำถามเกี่ยวกับเอกสาร..." /></label>
        <button className="risk-chat-send" disabled={busy || !input.trim()} type="submit" aria-label="ส่งข้อความ">➤</button>
      </form>
      <div className="risk-chat-meta"><span>สรุปโดย AI พร้อมข้อความอ้างอิง · จดจำบทสนทนาในแท็บนี้</span><button disabled={busy || !messages.length} type="button" onClick={() => { setMessages([]); setError(''); }}>เริ่มบทสนทนาใหม่</button></div>
      <p className="risk-chat-privacy">กรุณาไม่ใส่ข้อมูลระบุตัวผู้ป่วย ข้อความ OCR อาจคลาดเคลื่อน โปรดตรวจสอบกับภาพต้นฉบับ</p>
    </div>
  </section>;
}
