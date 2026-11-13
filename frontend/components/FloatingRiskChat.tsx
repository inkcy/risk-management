'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiskChatbot } from './RiskChatbot';

export function FloatingRiskChat() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  if (pathname === '/chatbot') return null;
  return <div className="floating-risk-chat">
    <div hidden={!open} id="floating-risk-chat" role="region" aria-label="Chatbot ผู้ช่วยบริหารความเสี่ยง" className="floating-risk-chat-panel">
      <div className="floating-risk-chat-header">
        <strong>ผู้ช่วยบริหารความเสี่ยง</strong>
        <div className="floating-risk-chat-controls">
          <Link href="/chatbot" aria-label="เปิดหน้าแชทเต็มหน้าจอ" title="เปิดหน้าแชทเต็มหน้าจอ">↗</Link>
          <button type="button" onClick={() => setOpen(false)} aria-label="ย่อแชท" title="ย่อแชท">−</button>
        </div>
      </div>
      <RiskChatbot compact />
    </div>
    <button type="button" className="floating-risk-chat-launcher" aria-label={open ? 'ย่อแชทผู้ช่วยบริหารความเสี่ยง' : 'เปิดแชทผู้ช่วยบริหารความเสี่ยง'} aria-expanded={open} aria-controls="floating-risk-chat" title={open ? 'ย่อแชท' : 'เปิดแชท'} onClick={() => setOpen(value => !value)}>
      {open ? <span aria-hidden="true">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3C6.48 3 2 6.82 2 11.54c0 2.62 1.38 4.97 3.56 6.54V21l3.13-1.72c1.03.32 2.15.49 3.31.49 5.52 0 10-3.82 10-8.54S17.52 3 12 3Z" fill="currentColor"/><path d="m6.8 13.7 3.36-3.56 2.03 1.82 3.23-1.82-3.52 3.7-2-1.82-3.1 1.68Z" fill="#108c7c"/></svg>}
    </button>
  </div>;
}
