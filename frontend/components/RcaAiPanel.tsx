'use client';

import { useState } from 'react';

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

interface AnalysisResult {
  analysis: string;
  demo: boolean;
  model?: string;
  usage?: Usage;
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let buf: string[] = [];

  const flushBuf = () => {
    if (buf.length === 0) return;
    blocks.push(
      <p key={blocks.length} style={{ margin: '6px 0', fontSize: 15, lineHeight: 1.75 }}>
        {renderInline(buf.join(' '))}
      </p>,
    );
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) {
      flushBuf();
      blocks.push(
        <h3 key={blocks.length} style={{
          fontSize: 17.3, fontWeight: 600, color: 'var(--accent)',
          marginTop: 18, marginBottom: 8, paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}>
          {line.replace(/^##\s+/, '')}
        </h3>,
      );
    } else if (/^###\s+/.test(line)) {
      flushBuf();
      blocks.push(
        <h4 key={blocks.length} style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text)',
          marginTop: 12, marginBottom: 6,
        }}>
          {line.replace(/^###\s+/, '')}
        </h4>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      flushBuf();
      blocks.push(
        <div key={blocks.length} style={{
          paddingLeft: 16, position: 'relative',
          margin: '3px 0', fontSize: 15, lineHeight: 1.7,
        }}>
          <span style={{ position: 'absolute', left: 4, color: 'var(--text3)' }}>•</span>
          {renderInline(line.replace(/^[-*]\s+/, ''))}
        </div>,
      );
    } else if (/^\d+\.\s+/.test(line)) {
      flushBuf();
      const num = line.match(/^(\d+)\./)?.[1] ?? '';
      blocks.push(
        <div key={blocks.length} style={{
          paddingLeft: 22, position: 'relative',
          margin: '3px 0', fontSize: 15, lineHeight: 1.7,
        }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--accent)', fontWeight: 600 }}>{num}.</span>
          {renderInline(line.replace(/^\d+\.\s+/, ''))}
        </div>,
      );
    } else if (/^---+$/.test(line.trim())) {
      flushBuf();
      blocks.push(<div key={blocks.length} className="divider" />);
    } else if (line.trim() === '') {
      flushBuf();
    } else {
      buf.push(line);
    }
  }
  flushBuf();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={i++} style={{ color: 'var(--text)' }}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') void Notification.requestPermission();
}

function sendNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, { body, tag: 'rca-ai-analysis' });
  } catch {
    // การแจ้งเตือนไม่ควรทำให้การวิเคราะห์ล้มเหลว
  }
}

export function RcaAiPanel({ irCode }: { irCode: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    requestNotificationPermission();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rca/${encodeURIComponent(irCode)}/analyze`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setResult(json);
      sendNotification('วิเคราะห์ RCA เสร็จแล้ว', `ผลวิเคราะห์ของเคส ${irCode} พร้อมให้ตรวจสอบแล้ว`);
    } catch (e) {
      const message = String(e);
      setError(message);
      sendNotification('วิเคราะห์ RCA ไม่สำเร็จ', message.replace(/^Error:\s*/, '').slice(0, 140));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div className="card-title">
          🤖 AI สร้างร่าง RCA ตามแบบฟอร์มรายงาน
        </div>
        {!loading && !result && (
          <button
            type="button"
            className="tb-btn tb-btn-primary"
            onClick={analyze}
          >
            ✨ วิเคราะห์ด้วย AI
          </button>
        )}
        {!loading && result && (
          <button
            type="button"
            className="tb-btn tb-btn-ghost"
            onClick={analyze}
          >
            ⟳ วิเคราะห์ใหม่
          </button>
        )}
      </div>
      <div className="card-body">
        {!result && !loading && !error && (
          <div style={{
            padding: '20px 0', textAlign: 'center',
            color: 'var(--text3)', fontSize: 13.8, lineHeight: 1.8,
          }}>
            <div style={{ marginBottom: 8 }}>
              คลิกปุ่ม &quot;วิเคราะห์ด้วย AI&quot; เพื่อให้ Gemini จัดทำร่างตาม RCA_Report (3).doc
            </div>
            <div style={{ fontSize: 12.6 }}>
              ผลลัพธ์ประกอบด้วย Story/Timeline · Potential change · ปัจจัยเกื้อหนุน · RCA/มาตรการ · Process Management
            </div>
          </div>
        )}

        {loading && (
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <div className="loading-skeleton" style={{ height: 12, marginBottom: 10, borderRadius: 4 }} />
            <div className="loading-skeleton" style={{ height: 12, marginBottom: 10, borderRadius: 4, width: '85%', marginInline: 'auto' }} />
            <div className="loading-skeleton" style={{ height: 12, borderRadius: 4, width: '70%', marginInline: 'auto' }} />
            <div style={{ fontSize: 12.6, color: 'var(--text3)', marginTop: 14 }}>
              กำลังให้ AI วิเคราะห์… อาจใช้เวลา 10-30 วินาที
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 12, borderRadius: 6,
            background: 'var(--red-bg)', color: 'var(--red)',
            fontSize: 13.8,
          }}>
            ✗ {error}
          </div>
        )}

        {result && (
          <>
            {result.demo && (
              <div style={{
                marginBottom: 12, padding: '8px 12px',
                background: 'var(--amber-bg)', color: 'var(--amber)',
                borderRadius: 4, fontSize: 12.6, lineHeight: 1.6,
              }}>
                <strong>Demo mode</strong> — ยังไม่ได้ตั้งค่า <code>GEMINI_API_KEY</code> ใน <code>frontend/.env.local</code> · กำลังแสดงผลตัวอย่าง
              </div>
            )}
            <div style={{ color: 'var(--text)' }}>
              {renderMarkdown(result.analysis)}
            </div>
            {result.usage && (
              <div style={{
                marginTop: 18, paddingTop: 12,
                borderTop: '1px solid var(--border)',
                fontSize: 11.5, color: 'var(--text3)',
                display: 'flex', gap: 12, flexWrap: 'wrap',
              }}>
                <span>โมเดล: <code>{result.model ?? '—'}</code></span>
                <span>input: {result.usage.input_tokens}</span>
                <span>output: {result.usage.output_tokens}</span>
                {result.usage.cache_read_input_tokens > 0 && (
                  <span style={{ color: 'var(--green)' }}>
                    ✓ cache hit: {result.usage.cache_read_input_tokens} tokens
                  </span>
                )}
                {result.usage.cache_creation_input_tokens > 0 && (
                  <span style={{ color: 'var(--amber)' }}>
                    cache write: {result.usage.cache_creation_input_tokens}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
