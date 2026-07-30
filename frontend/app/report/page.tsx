'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RecentReport {
  ir_code: string;
  title: string;
  category: string;
  severity: string;
  submitted_at: string;
}

const RECENT_KEY = 'esafe_recent_reports';
const MAX_RECENT = 5;

function loadRecent(): RecentReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(r: RecentReport) {
  if (typeof window === 'undefined') return;
  const list = [r, ...loadRecent().filter(x => x.ir_code !== r.ir_code)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

const units = [
  { code: 'MICU', label: 'MICU / CCU' },
  { code: 'MED', label: 'Ward อายุรกรรม' },
  { code: 'SURG', label: 'Ward ศัลยกรรม' },
  { code: 'OR', label: 'ห้องผ่าตัด' },
  { code: 'BB', label: 'ธนาคารเลือด' },
  { code: 'ER', label: 'ห้องฉุกเฉิน' },
];
const categories: { value: string; label: string }[] = [
  { value: 'blood', label: 'การให้เลือด' },
  { value: 'medication', label: 'การให้ยา (High Alert)' },
  { value: 'fall', label: 'การพลัดตกหกล้ม' },
  { value: 'procedure', label: 'การผ่าตัด / หัตถการ' },
  { value: 'communication', label: 'การสื่อสาร / ส่งต่อ' },
  { value: 'other', label: 'อื่นๆ' },
];
const severities = [
  { value: 'A', label: 'Near miss', color: 'var(--green)' },
  { value: 'B', label: 'ถึงผู้ป่วย ไม่เกิดอันตราย', color: 'var(--green)' },
  { value: 'C', label: 'เกิดอันตราย ไม่ต้องรักษา', color: 'var(--accent)' },
  { value: 'D', label: 'ต้องติดตามดูแลเพิ่ม', color: 'var(--amber)' },
  { value: 'E', label: 'ต้องรักษา / ผ่าตัด', color: 'var(--red)' },
  { value: 'I', label: 'เสียชีวิต', color: 'var(--red)' },
];

export default function ReportPage() {
  const [form, setForm] = useState({
    occurred_at: '',
    time: '',
    unit: '',
    category: '',
    severity: '',
    description: '',
    immediate_action: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lastIrCode, setLastIrCode] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentReport[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(s => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.occurred_at || !form.unit || !form.category || !form.severity) {
      setStatus('error');
      setMessage('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setStatus('submitting');
    try {
      const occurred = `${form.occurred_at}T${form.time || '00:00'}:00+07:00`;
      const irCode = `IR ${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Date.now() % 1000000).padStart(6, '0')}`;
      const res = await fetch(`/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ir_code: irCode,
          occurred_at: occurred,
          title: form.description.slice(0, 80) || 'อุบัติการณ์ใหม่',
          description: form.description,
          unit_id: null,
          category: form.category,
          severity: form.severity,
          reported_by: 'demo',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setStatus('success');
      setMessage(`บันทึก ${irCode} เรียบร้อย`);
      setLastIrCode(irCode);
      const newEntry: RecentReport = {
        ir_code: irCode,
        title: form.description.slice(0, 80) || 'อุบัติการณ์ใหม่',
        category: form.category,
        severity: form.severity,
        submitted_at: new Date().toISOString(),
      };
      saveRecent(newEntry);
      setRecent(loadRecent());
    } catch (err) {
      setStatus('error');
      setMessage(String(err));
    }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header"><div className="card-title">รายงานอุบัติการณ์ใหม่</div></div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">วันที่เกิดเหตุ</label>
                <input type="date" value={form.occurred_at} onChange={e => set('occurred_at', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">เวลา</label>
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">หน่วยงาน</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)} required>
                  <option value="">เลือกหน่วยงาน</option>
                  {units.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ประเภทอุบัติการณ์</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} required>
                  <option value="">เลือกประเภท</option>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">ระดับความรุนแรง</label>
              <div className="sev-grid">
                {severities.map(s => (
                  <div key={s.value} className={`sev-card ${form.severity === s.value ? 'selected' : ''}`} onClick={() => set('severity', s.value)}>
                    <div className="sev-letter" style={{ color: s.color }}>{s.value}</div>
                    <div className="sev-name">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">รายละเอียดเหตุการณ์</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="ระบุลำดับเหตุการณ์ที่เกิดขึ้น วันเวลา และผู้เกี่ยวข้อง..."></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">การดำเนินการเบื้องต้น</label>
              <textarea value={form.immediate_action} onChange={e => set('immediate_action', e.target.value)} placeholder="การแก้ไขที่ดำเนินการทันที..." style={{ minHeight: 60 }}></textarea>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="tb-btn tb-btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
              </button>
              <button type="button" className="tb-btn tb-btn-ghost">บันทึกร่าง</button>
            </div>
            {status === 'success' && (
              <div style={{
                marginTop: 14, padding: '14px 16px', borderRadius: 8,
                background: 'var(--green-bg)', border: '1px solid rgba(62,207,142,0.25)',
              }}>
                <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
                  ✓ ระบบรับรายงานเรียบร้อย — {lastIrCode}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.7 }}>
                  ทีมบริหารความเสี่ยงจะติดตามต่อ · คุณสามารถดูสถานะหรือเริ่มทำ RCA ได้เลย
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {lastIrCode && (
                    <Link
                      href={`/rca?ir=${encodeURIComponent(lastIrCode)}`}
                      className="tb-btn tb-btn-primary"
                    >
                      ◎ เริ่มวิเคราะห์ RCA
                    </Link>
                  )}
                  <Link href="/incidents" className="tb-btn tb-btn-ghost">
                    ดูรายการอุบัติการณ์
                  </Link>
                </div>
              </div>
            )}
            {status === 'error' && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 6, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 12 }}>
                ✗ {message}
              </div>
            )}
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {recent.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">รายงานล่าสุดของคุณ</div>
              <span className="badge badge-blue">{recent.length} รายการ</span>
            </div>
            <div className="card-body" style={{ padding: '8px 14px' }}>
              {recent.map(r => {
                const sevCls = ['E','F','G','H','I'].includes(r.severity) ? 'badge-red'
                  : ['C','D'].includes(r.severity) ? 'badge-amber' : 'badge-blue';
                return (
                  <Link
                    key={r.ir_code}
                    href={`/rca?ir=${encodeURIComponent(r.ir_code)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    <span className={`badge ${sevCls}`} style={{ flexShrink: 0 }}>{r.severity}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                        {r.ir_code} · {new Date(r.submitted_at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text3)', fontSize: 14 }}>›</span>
                  </Link>
                );
              })}
              <div style={{ paddingTop: 8, fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>
                บันทึกอยู่ในเบราว์เซอร์ของคุณ (localStorage)
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><div className="card-title">เกณฑ์การรายงาน</div></div>
          <div className="card-body" style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 10 }}><span style={{ color: 'var(--red)', fontWeight: 600 }}>ระดับ E–I</span> — ต้องทำ RCA ภายใน 7 วัน รายงานคณะกรรมการ</div>
            <div style={{ marginBottom: 10 }}><span style={{ color: 'var(--amber)', fontWeight: 600 }}>ระดับ C–D</span> — วิเคราะห์สาเหตุภายใน 30 วัน</div>
            <div><span style={{ color: 'var(--accent)', fontWeight: 600 }}>ระดับ A–B</span> — บันทึกและติดตามรายเดือน</div>
            <div className="divider"></div>
            <div style={{ color: 'var(--text3)' }}>อุบัติการณ์ระดับ C ขึ้นไปที่เกี่ยวกับการให้เลือด ต้องรายงานต่อคณะกรรมการบริหารความเสี่ยงและติดตามอย่างน้อย 6 เดือน</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">High Risk Activities</div></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['การให้เลือดและส่วนประกอบของเลือด', 'ต้อง Double identification ทุกครั้ง'],
                ['ยากลุ่ม High Alert Drug', 'ตรวจสอบ 2 ขั้นตอน ก่อนให้ยาทุกครั้ง'],
                ['หัตถการความเสี่ยงสูง', 'ต้องมีผู้เชี่ยวชาญดูแล'],
              ].map(([title, sub], i, arr) => (
                <div key={title} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined,
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, background: 'var(--red-bg)',
                    color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, flexShrink: 0,
                  }}>!</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
