'use client';

import { useEffect, useState } from 'react';
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
  return <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 190 }}>
    <div hidden={!open} id="floating-risk-chat" role="region" aria-label="Chatbot ผู้ช่วยบริหารความเสี่ยง" style={{ width: 'min(410px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 85px)', overflowY: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 12px 36px rgba(0,0,0,.22)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--green)', color: '#fff' }}>
        <strong>Chatbot ผู้ช่วยบริหารความเสี่ยง</strong>
        <button type="button" onClick={() => setOpen(false)} aria-label="ปิดแชท" style={{ border: 0, background: 'transparent', color: 'inherit', fontSize: 22, cursor: 'pointer' }}>×</button>
      </div>
      <RiskChatbot compact />
    </div>
    <button type="button" className="tb-btn tb-btn-primary" aria-expanded={open} aria-controls="floating-risk-chat" onClick={() => setOpen(value => !value)} style={{ display: 'block', marginLeft: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,.2)' }}>{open ? 'ปิด Chatbot' : '✦ Chatbot'}</button>
  </div>;
}
