'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CMP_COLUMNS,
  COLONOGY_CLINICAL,
  COLONOGY_GENERAL,
  EXAMPLE,
  FORM_CODE,
  FORM_TITLE,
  TIER_ROWS,
  W5H1_ROWS,
  emptyProcessRow,
  emptyRcaForm,
  emptySolutionRow,
  emptyTimelineRow,
  isBlankRcaForm,
  normalizeRcaForm,
  sampleRcaForm,
  type CmpRow,
  type ProcessRow,
  type RcaFormData,
  type SolutionRow,
  type TimelineRow,
} from '@/lib/rcaForm';
import type { ActionItem, Envelope, RcaBundle } from '@/lib/types';

const DRAFT_KEY = 'rca_form_draft_v1';

const thDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};
const thTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
};

/** แปลงข้อมูลเคสในระบบเป็นค่าเริ่มต้นของแบบฟอร์ม */
function fromCase(bundle: RcaBundle, actions: ActionItem[]): Partial<RcaFormData> {
  const inc = bundle.incident;
  if (!inc) return {};
  const causeText = (cat: string) =>
    bundle.causes
      .filter(c => c.category === cat)
      .map(c => c.label)
      .join(' · ');

  const related = actions.filter(a => a.ir_code === inc.ir_code);

  return {
    subject: inc.title,
    rmNo: inc.ir_code.replace(/^IR\s*/i, ''),
    eventDate: thDate(inc.occurred_at),
    reviewDate: thDate(new Date().toISOString()),
    unit: inc.unit_name ?? '',
    severity: inc.severity,
    riskType: inc.category === 'other' ? 'general' : 'clinic',
    story: inc.description ?? '',
    timeline:
      bundle.timeline.length > 0
        ? bundle.timeline.map(t => ({
            day: thDate(t.occurred_at),
            time: thTime(t.occurred_at),
            event: [t.event_title, t.event_detail].filter(Boolean).join(' — '),
          }))
        : [emptyTimelineRow()],
    tiers: {
      tier5: '',
      tier4: causeText('management'),
      tier3: causeText('environment'),
      tier2: causeText('system'),
      tier1: causeText('people'),
      cmp: '',
      flow: '',
    },
    solutions:
      related.length > 0
        ? related.map(a => ({
            rootCause: '',
            prevention: [a.title, a.description].filter(Boolean).join('\n'),
            owner: a.owner ?? '',
            timeframe: a.due_date ?? '',
          }))
        : [emptySolutionRow()],
  };
}

// ---------- ชิ้นส่วน UI เล็ก ๆ ----------

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="rf-field">
      <span className="rf-label">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="rf-field">
      {label && <span className="rf-label">{label}</span>}
      {hint && <span className="rf-hint">{hint}</span>}
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function Section({
  no,
  title,
  sub,
  children,
}: {
  no?: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <div className="card-title">
          {no && <span style={{ color: 'var(--accent)', marginRight: 6 }}>{no}</span>}
          {title}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>{sub}</div>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function RowActions({ onRemove, canRemove }: { onRemove: () => void; canRemove: boolean }) {
  return (
    <button
      type="button"
      className="rf-remove"
      onClick={onRemove}
      disabled={!canRemove}
      title="ลบแถวนี้"
      aria-label="ลบแถวนี้"
    >
      ✕
    </button>
  );
}

// ---------- หน้าหลัก ----------

interface CloudFormRow {
  id: number;
  rm_no: string | null;
  subject: string | null;
  unit: string | null;
  updated_at: string;
  updated_by_name: string | null;
  updated_by_email: string | null;
  can_edit: boolean;
  can_delete: boolean;
}

export default function RcaFormPage() {
  const [form, setForm] = useState<RcaFormData>(emptyRcaForm);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /** id ของร่างบนเซิร์ฟเวอร์ — null คือยังไม่เคยบันทึกลงระบบ */
  const [formId, setFormId] = useState<number | null>(null);
  const [canEditCurrent, setCanEditCurrent] = useState(true);
  const [cloudForms, setCloudForms] = useState<CloudFormRow[]>([]);
  const [showCloud, setShowCloud] = useState(false);
  const irRef = useRef<string | null>(null);

  // โหลดร่างจากเบราว์เซอร์ หรือดึงข้อมูลจากเคสเมื่อเปิดด้วย ?ir=
  useEffect(() => {
    const ir = new URLSearchParams(window.location.search).get('ir');
    irRef.current = ir;

    // ใช้ร่างที่บันทึกไว้เฉพาะเมื่อมีเนื้อหาจริง ไม่เช่นนั้นปล่อยให้ดึงข้อมูลจากเคสได้
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = normalizeRcaForm(JSON.parse(draft));
        if (!isBlankRcaForm(parsed)) {
          setForm(parsed);
          setMsg({ kind: 'info', text: 'เปิดร่างที่บันทึกไว้ในเบราว์เซอร์นี้ — กด “ล้างฟอร์ม” หากต้องการเริ่มใหม่' });
          setLoaded(true);
          return;
        }
      } catch {
        /* ร่างเสียหาย — ข้ามไปใช้ค่าว่าง */
      }
    }

    if (!ir) {
      setLoaded(true);
      return;
    }

    (async () => {
      try {
        const [bRes, aRes] = await Promise.all([
          fetch(`/api/rca/${encodeURIComponent(ir)}`),
          fetch('/api/actions'),
        ]);
        const bundle: Envelope<RcaBundle> = await bRes.json();
        const actions: Envelope<ActionItem[]> = await aRes.json();
        if (bundle.data?.incident) {
          setForm(f => normalizeRcaForm({ ...f, ...fromCase(bundle.data, actions.data ?? []) }));
          setMsg({ kind: 'info', text: `ดึงข้อมูลตั้งต้นจากเคส ${ir} แล้ว — ตรวจสอบและกรอกส่วนที่เหลือ` });
        }
      } catch {
        setMsg({ kind: 'err', text: 'ดึงข้อมูลจากเคสไม่สำเร็จ — กรอกด้วยตนเองได้เลย' });
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // บันทึกร่างอัตโนมัติ
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      if (isBlankRcaForm(form)) {
        localStorage.removeItem(DRAFT_KEY);
        setSavedAt(null);
        return;
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setSavedAt(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
    return () => clearTimeout(t);
  }, [form, loaded]);

  const set = useCallback(<K extends keyof RcaFormData>(k: K, v: RcaFormData[K]) => {
    setForm(s => ({ ...s, [k]: v }));
  }, []);

  const setArrayItem = <T,>(key: 'timeline' | 'solutions' | 'processes' | 'cmpClinical' | 'cmpGeneral', i: number, patch: Partial<T>) => {
    setForm(s => {
      const list = [...(s[key] as unknown as T[])];
      list[i] = { ...list[i], ...patch };
      return { ...s, [key]: list };
    });
  };

  const exportWord = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/rca/export-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(detail.error ?? res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCA_${(form.rmNo || form.subject || 'form').slice(0, 40).replace(/[\\/:*?"<>|]+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ kind: 'ok', text: 'สร้างไฟล์ Word เรียบร้อย — ตรวจสอบในโฟลเดอร์ดาวน์โหลด' });
    } catch (err) {
      setMsg({ kind: 'err', text: `ส่งออกไม่สำเร็จ: ${String(err)}` });
    } finally {
      setBusy(false);
    }
  };

  /** บันทึกลงฐานข้อมูล — ส่ง id ไปด้วยคือเขียนทับใบเดิม */
  const save = async (id: number | null) => {
    if (id && !canEditCurrent) {
      setMsg({ kind: 'err', text: 'RCA ใบนี้เปิดแบบดูอย่างเดียว — แก้ไขได้เฉพาะเจ้าของร่างหรือผู้ดูแลระบบ' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/rca/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id ?? undefined, irCode: irRef.current, form }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);

      setFormId(body.form.id);
      setCanEditCurrent(true);
      setMsg({
        kind: 'ok',
        text: id ? `บันทึกทับใบที่ ${body.form.id} แล้ว` : `บันทึกลงระบบแล้ว (ใบที่ ${body.form.id})`,
      });
      if (showCloud) void loadCloudList();
    } catch (err) {
      setMsg({ kind: 'err', text: `บันทึกไม่สำเร็จ: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const saveToCloud = () => save(formId);
  const saveAsNew = () => save(null);

  const loadCloudList = useCallback(async () => {
    try {
      const res = await fetch('/api/rca/forms');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setCloudForms(body.forms);
    } catch (err) {
      setMsg({ kind: 'err', text: `โหลดรายการไม่สำเร็จ: ${(err as Error).message}` });
    }
  }, []);

  const toggleCloud = () => {
    const next = !showCloud;
    setShowCloud(next);
    if (next) void loadCloudList();
  };

  const openCloudForm = async (id: number) => {
    if (!isBlankRcaForm(form) && !confirm('เปิดร่างนี้จะแทนที่ข้อมูลที่กรอกค้างไว้ ดำเนินการต่อ?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rca/forms/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setForm(normalizeRcaForm(body.form.data));
      setFormId(body.form.id);
      setCanEditCurrent(body.form.can_edit === true);
      irRef.current = body.form.ir_code ?? null;
      setShowCloud(false);
      setMsg({
        kind: body.form.can_edit ? 'ok' : 'info',
        text: body.form.can_edit
          ? `เปิดใบที่ ${id} แล้ว — แก้ไขแล้วกดบันทึกทับได้`
          : `เปิดใบที่ ${id} แบบดูอย่างเดียว — ผู้ดูแลระบบหรือเจ้าของร่างเท่านั้นที่แก้ไขได้`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMsg({ kind: 'err', text: `เปิดร่างไม่สำเร็จ: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const deleteCloudForm = async (id: number) => {
    if (!confirm(`ลบใบที่ ${id} ออกจากระบบถาวร?`)) return;
    try {
      const res = await fetch(`/api/rca/forms/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      if (formId === id) setFormId(null);
      void loadCloudList();
      setMsg({ kind: 'info', text: `ลบใบที่ ${id} แล้ว` });
    } catch (err) {
      setMsg({ kind: 'err', text: `ลบไม่สำเร็จ: ${(err as Error).message}` });
    }
  };

  const clearForm = () => {
    if (!confirm('ล้างข้อมูลทั้งหมดในแบบฟอร์ม? ร่างที่บันทึกไว้จะถูกลบ')) return;
    localStorage.removeItem(DRAFT_KEY);
    setForm(emptyRcaForm());
    setFormId(null);
    setCanEditCurrent(true);
    setMsg({ kind: 'info', text: 'ล้างแบบฟอร์มแล้ว (ใบที่บันทึกไว้บนระบบยังอยู่)' });
  };

  const loadSample = () => {
    if (!confirm('แทนที่ข้อมูลปัจจุบันด้วยตัวอย่าง (กรณีให้เลือดผิดคน)?')) return;
    setForm(sampleRcaForm());
    setMsg({ kind: 'info', text: 'ใส่ข้อมูลตัวอย่างแล้ว — แก้ไขได้ตามต้องการ' });
  };

  const cmpBlock = (which: 'cmpClinical' | 'cmpGeneral', title: string) => (
    <div style={{ marginBottom: 8 }}>
      <div className="sub-label" style={{ marginBottom: 8 }}>{title}</div>
      {form[which].map((r: CmpRow, i) => (
        <div key={`${which}-${i}`} className="rf-rowcard">
          <div className="rf-rowcard-head">
            <input
              className="rf-rowcard-title"
              value={r.area}
              placeholder={EXAMPLE.cmp.area}
              onChange={e => setArrayItem<CmpRow>(which, i, { area: e.target.value })}
            />
            <RowActions
              canRemove={form[which].length > 1}
              onRemove={() => set(which, form[which].filter((_, j) => j !== i))}
            />
          </div>
          <div className="rf-grid">
            <Area label={CMP_COLUMNS[1]} rows={3} value={r.standard} placeholder={EXAMPLE.cmp.standard} onChange={v => setArrayItem<CmpRow>(which, i, { standard: v })} />
            <Area label={CMP_COLUMNS[2]} rows={3} value={r.unsafeAct} placeholder={EXAMPLE.cmp.unsafeAct} onChange={v => setArrayItem<CmpRow>(which, i, { unsafeAct: v })} />
            <Area label={CMP_COLUMNS[3]} rows={3} value={r.constraint} placeholder={EXAMPLE.cmp.constraint} onChange={v => setArrayItem<CmpRow>(which, i, { constraint: v })} />
          </div>
          <div className="rf-grid">
            <Field label={CMP_COLUMNS[4]} value={r.period} placeholder={EXAMPLE.cmp.period} onChange={v => setArrayItem<CmpRow>(which, i, { period: v })} />
            <Field label={CMP_COLUMNS[5]} value={r.system} placeholder={EXAMPLE.cmp.system} onChange={v => setArrayItem<CmpRow>(which, i, { system: v })} />
          </div>
        </div>
      ))}
      <button type="button" className="tb-btn tb-btn-ghost" onClick={() => set(which, [...form[which], { area: '', standard: '', unsafeAct: '', constraint: '', period: '', system: '' }])}>
        + เพิ่มกระบวนการ
      </button>
    </div>
  );

  return (
    <div className="rf">
      <div className="glow-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              {FORM_CODE}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{FORM_TITLE}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              กรอกข้อมูลในหน้านี้ แล้วกด “ส่งออก Word” เพื่อได้ไฟล์ .docx ตามรูปแบบแบบฟอร์มต้นฉบับ
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 6, lineHeight: 1.6 }}>
              ข้อความจาง ๆ ในช่องกรอกคือ<strong>ตัวอย่าง</strong>จากกรณีผู้ป่วยได้รับยาซ้ำซ้อน (double dose)
              — พิมพ์ทับได้เลย ไม่ถูกบันทึกและไม่ติดไปกับไฟล์ Word
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="tb-btn tb-btn-ghost" onClick={toggleCloud}>
                {showCloud ? 'ปิดรายการ' : '☁ ร่างที่บันทึกไว้'}
              </button>
              <button type="button" className="tb-btn tb-btn-ghost" onClick={loadSample}>ใส่ตัวอย่าง</button>
              <button type="button" className="tb-btn tb-btn-ghost" onClick={clearForm}>ล้างฟอร์ม</button>
              <button
                type="button"
                className="tb-btn tb-btn-primary"
                onClick={saveToCloud}
                disabled={busy || (!!formId && !canEditCurrent)}
              >
                {busy ? 'กำลังทำงาน...' : formId && !canEditCurrent ? 'ดูอย่างเดียว' : '💾 บันทึก'}
              </button>
            </div>
            {savedAt && (
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>บันทึกร่างอัตโนมัติ {savedAt}</div>
            )}
          </div>
        </div>
        {msg && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              background: msg.kind === 'ok' ? 'var(--green-bg)' : msg.kind === 'err' ? 'var(--red-bg)' : 'var(--blue-bg)',
              color: msg.kind === 'ok' ? 'var(--green)' : msg.kind === 'err' ? 'var(--red)' : 'var(--accent)',
            }}
          >
            {msg.text}
          </div>
        )}
      </div>

      {showCloud && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">☁ ร่างที่บันทึกไว้บนระบบ</div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>เปิดต่อได้จากทุกเครื่อง</span>
          </div>
          <div className="card-body">
            {cloudForms.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>
                ยังไม่มีร่างที่บันทึกไว้ — กรอกฟอร์มแล้วกดปุ่ม <strong>บันทึก</strong> ได้เลย
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>เรื่อง</th>
                      <th>เลขที่ RM</th>
                      <th>หน่วยงาน</th>
                      <th>แก้ไขล่าสุด</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {cloudForms.map(f => (
                      <tr key={f.id}>
                        <td>{f.subject || <span style={{ color: 'var(--text3)' }}>(ไม่มีชื่อเรื่อง)</span>}</td>
                        <td>{f.rm_no || '—'}</td>
                        <td>{f.unit || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(f.updated_at).toLocaleString('th-TH', {
                            day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
                          })}
                          <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
                            {f.updated_by_name ?? f.updated_by_email ?? '—'}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button type="button" className="tb-btn tb-btn-ghost" onClick={() => openCloudForm(f.id)} disabled={busy}>
                            เปิด
                          </button>
                          {f.can_delete && <>{' '}
                            <button
                              type="button"
                              className="tb-btn tb-btn-ghost"
                              onClick={() => deleteCloudForm(f.id)}
                              style={{ color: 'var(--red)' }}
                            >
                              ลบ
                            </button>
                          </>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <fieldset className="rf-edit-area" disabled={!!formId && !canEditCurrent}>
      {/* ---- ส่วนหัวแบบฟอร์ม ---- */}
      <Section title="ข้อมูลทั่วไป">
        <Area label="เรื่อง" rows={2} value={form.subject} placeholder={EXAMPLE.subject} onChange={v => set('subject', v)} />
        <div className="rf-grid">
          <Field label="RM No." value={form.rmNo} placeholder={EXAMPLE.rmNo} onChange={v => set('rmNo', v)} />
          <Field label="ปี (พ.ศ. 2 หลัก)" value={form.rmYear} placeholder={EXAMPLE.rmYear} onChange={v => set('rmYear', v)} />
          <Field label="วันที่ทบทวน" value={form.reviewDate} placeholder={EXAMPLE.reviewDate} onChange={v => set('reviewDate', v)} />
          <Field label="วันที่เกิดเหตุการณ์" value={form.eventDate} placeholder={EXAMPLE.eventDate} onChange={v => set('eventDate', v)} />
        </div>
        <div className="rf-grid">
          <label className="rf-field">
            <span className="rf-label">ประเภทความเสี่ยง</span>
            <select value={form.riskType} onChange={e => set('riskType', e.target.value as RcaFormData['riskType'])}>
              <option value="">— เลือก —</option>
              <option value="clinic">คลินิก</option>
              <option value="general">ทั่วไป</option>
            </select>
          </label>
          <Field label="หน่วยงาน / ทีม" value={form.unit} placeholder={EXAMPLE.unit} onChange={v => set('unit', v)} />
          <Field label="ระดับความรุนแรง ( A-I / 1-5 )" value={form.severity} placeholder={EXAMPLE.severity} onChange={v => set('severity', v)} />
        </div>
        <Area label="สมาชิกผู้ร่วมทบทวน" rows={3} value={form.members} placeholder={EXAMPLE.members} onChange={v => set('members', v)} />
      </Section>

      {/* ---- 1. Story and Timeline ---- */}
      <Section no="1." title="Story and Timeline" sub="บรรยายเหตุการณ์ที่สำคัญสั้น ๆ บุคคลที่เกี่ยวข้องโดยไม่ระบุชื่อ">
        <Area label="เรื่องเล่าเหตุการณ์" rows={8} value={form.story} placeholder={EXAMPLE.story} onChange={v => set('story', v)} />

        <div className="sub-label" style={{ marginTop: 18 }}>adverse event / problem statement</div>
        <div className="rf-grid">
          <Area label="1 อุบัติการณ์เกิดกับใคร" rows={3} value={form.psWho} placeholder={EXAMPLE.psWho} onChange={v => set('psWho', v)} />
          <Area label="2 เหตุการณ์ที่เกิดขึ้นคืออะไร" rows={3} value={form.psWhat} placeholder={EXAMPLE.psWhat} onChange={v => set('psWhat', v)} />
          <Area label="3 ผลกระทบ/ความรุนแรงที่เกิดขึ้น" rows={3} value={form.psImpact} placeholder={EXAMPLE.psImpact} onChange={v => set('psImpact', v)} />
        </div>

        <div className="sub-label" style={{ marginTop: 18 }}>
          COLONOGY OF EVENT (WORK FLOW) — กระบวนการทำงานที่เกี่ยวข้องกับเหตุการณ์
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>ด้านกระบวนการดูแลผู้ป่วย (สำหรับความเสี่ยงด้านคลินิก) — กรอกเฉพาะขั้นตอนที่เกี่ยวข้อง</div>
        {COLONOGY_CLINICAL.map((label, i) => (
          <Area
            key={label}
            label={`${i + 1} ${label}`}
            rows={2}
            value={form.colonogyClinical[i] ?? ''}
            placeholder={EXAMPLE.colonogyClinical[i]}
            onChange={v => set('colonogyClinical', form.colonogyClinical.map((x, j) => (j === i ? v : x)))}
          />
        ))}
        <div style={{ fontSize: 11, color: 'var(--text3)', margin: '14px 0 10px' }}>ด้านทั่วไป (สำหรับความเสี่ยงทั่วไป)</div>
        {COLONOGY_GENERAL.map((label, i) => (
          <Area
            key={label}
            label={`${i + 1} ${label}`}
            rows={2}
            value={form.colonogyGeneral[i] ?? ''}
            placeholder={EXAMPLE.colonogyGeneral[i]}
            onChange={v => set('colonogyGeneral', form.colonogyGeneral.map((x, j) => (j === i ? v : x)))}
          />
        ))}

        <div className="sub-label" style={{ marginTop: 18 }}>ลำดับเหตุการณ์ (Day / Time / Event)</div>
        {form.timeline.map((t: TimelineRow, i) => (
          <div key={`tl-${i}`} className="rf-rowcard">
            <div className="rf-rowcard-head">
              <span className="rf-rowcard-no">#{i + 1}</span>
              <RowActions canRemove={form.timeline.length > 1} onRemove={() => set('timeline', form.timeline.filter((_, j) => j !== i))} />
            </div>
            <div className="rf-grid rf-grid-tl">
              <Field label="Day" value={t.day} placeholder={EXAMPLE.timeline.day} onChange={v => setArrayItem<TimelineRow>('timeline', i, { day: v })} />
              <Field label="Time" value={t.time} placeholder={EXAMPLE.timeline.time} onChange={v => setArrayItem<TimelineRow>('timeline', i, { time: v })} />
              <Area label="Event" rows={2} value={t.event} placeholder={EXAMPLE.timeline.event} onChange={v => setArrayItem<TimelineRow>('timeline', i, { event: v })} />
            </div>
          </div>
        ))}
        <button type="button" className="tb-btn tb-btn-ghost" onClick={() => set('timeline', [...form.timeline, emptyTimelineRow()])}>
          + เพิ่มลำดับเหตุการณ์
        </button>
      </Section>

      {/* ---- 2. CMP ---- */}
      <Section
        no="2."
        title="ค้นหาสาเหตุของปัญหา หาจุดเปลี่ยน Potential change & Unsafe act"
        sub="ระบุเฉพาะกระบวนการ/ขั้นตอนที่เกิดความคลาดเคลื่อนจาก COLONOGY OF EVENT · CARE MANAGEMENT PROBLEM (ใส่เฉพาะกระบวนการที่เป็นปัญหา)"
      >
        {cmpBlock('cmpClinical', 'ด้านกระบวนการดูแลผู้ป่วย (สำหรับความเสี่ยงด้านคลินิก)')}
        <div className="divider" />
        {cmpBlock('cmpGeneral', 'ด้านทั่วไป (สำหรับความเสี่ยงทั่วไป)')}
      </Section>

      {/* ---- 3. 5W1H ---- */}
      <Section
        no="3."
        title="สรุปปัจจัยเกื้อหนุนทำให้เกิดความเสี่ยง"
        sub="Proactive fact finding — Listen to voice of staff · ช่องที่ไม่กรอก จะพิมพ์คำถามนำเป็นตัวอักษรสีแดงในไฟล์ Word"
      >
        {W5H1_ROWS.map((r, i) => (
          <Area
            key={r.key}
            label={`${i + 1} ${r.label}`}
            hint={r.hint}
            rows={3}
            value={form.w5h1[r.key]}
            placeholder={EXAMPLE.w5h1[r.key]}
            onChange={v => set('w5h1', { ...form.w5h1, [r.key]: v })}
          />
        ))}
      </Section>

      {/* ---- 4. 5 Tier ---- */}
      <Section
        no="4."
        title="การวิเคราะห์ปัจจัย Workplace / Organization Factor"
        sub="5 Tier Contributory Factor for Incident Analysis — เรียงจากปัจจัยภายนอกลงมาถึงตัวบุคคล"
      >
        {TIER_ROWS.map(t => (
          <Area
            key={t.key}
            label={t.label.replace(/\n/g, ' · ')}
            hint={t.hint}
            rows={3}
            value={form.tiers[t.key]}
            placeholder={EXAMPLE.tiers[t.key]}
            onChange={v => set('tiers', { ...form.tiers, [t.key]: v })}
          />
        ))}
      </Section>

      {/* ---- 5. สรุป RCA ---- */}
      <Section no="5." title="สรุป RCA แนวทางการป้องกัน/แก้ปัญหา (Creative solution)">
        {form.solutions.map((s: SolutionRow, i) => (
          <div key={`sol-${i}`} className="rf-rowcard">
            <div className="rf-rowcard-head">
              <span className="rf-rowcard-no">สาเหตุที่ {i + 1}</span>
              <RowActions canRemove={form.solutions.length > 1} onRemove={() => set('solutions', form.solutions.filter((_, j) => j !== i))} />
            </div>
            <Area label="สาเหตุที่แท้จริง (Root cause)" rows={2} value={s.rootCause} placeholder={EXAMPLE.solution.rootCause} onChange={v => setArrayItem<SolutionRow>('solutions', i, { rootCause: v })} />
            <Area label="มาตรการการป้องกัน" rows={4} value={s.prevention} placeholder={EXAMPLE.solution.prevention} onChange={v => setArrayItem<SolutionRow>('solutions', i, { prevention: v })} />
            <div className="rf-grid">
              <Field label="ผู้รับผิดชอบ" value={s.owner} placeholder={EXAMPLE.solution.owner} onChange={v => setArrayItem<SolutionRow>('solutions', i, { owner: v })} />
              <Field label="ระยะเวลาดำเนินการ" value={s.timeframe} placeholder={EXAMPLE.solution.timeframe} onChange={v => setArrayItem<SolutionRow>('solutions', i, { timeframe: v })} />
            </div>
          </div>
        ))}
        <button type="button" className="tb-btn tb-btn-ghost" onClick={() => set('solutions', [...form.solutions, emptySolutionRow()])}>
          + เพิ่มสาเหตุ/มาตรการ
        </button>
      </Section>

      {/* ---- 6. Process Management ---- */}
      <Section no="6." title="การจัดการกระบวนการ (Process Management)" sub="สำหรับการแก้ไข Tier 4 ขึ้นไป">
        {form.processes.map((p: ProcessRow, i) => (
          <div key={`pr-${i}`} className="rf-rowcard">
            <div className="rf-rowcard-head">
              <span className="rf-rowcard-no">กระบวนการที่ {i + 1}</span>
              <RowActions canRemove={form.processes.length > 1} onRemove={() => set('processes', form.processes.filter((_, j) => j !== i))} />
            </div>
            <Area label="กระบวนการ" rows={2} value={p.process} placeholder={EXAMPLE.process.process} onChange={v => setArrayItem<ProcessRow>('processes', i, { process: v })} />
            <div className="rf-grid">
              <Area label="ข้อกำหนดของกระบวนการ (process requirement)" rows={4} value={p.requirement} placeholder={EXAMPLE.process.requirement} onChange={v => setArrayItem<ProcessRow>('processes', i, { requirement: v })} />
              <Area label="ตัวชี้วัดของกระบวนการ (process indicators)" rows={4} value={p.indicators} placeholder={EXAMPLE.process.indicators} onChange={v => setArrayItem<ProcessRow>('processes', i, { indicators: v })} />
              <Area label="การออกแบบกระบวนการ (process design)" rows={4} value={p.design} placeholder={EXAMPLE.process.design} onChange={v => setArrayItem<ProcessRow>('processes', i, { design: v })} />
            </div>
          </div>
        ))}
        <button type="button" className="tb-btn tb-btn-ghost" onClick={() => set('processes', [...form.processes, emptyProcessRow()])}>
          + เพิ่มกระบวนการ
        </button>
      </Section>

      </fieldset>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="tb-btn tb-btn-primary" onClick={saveToCloud} disabled={busy || (!!formId && !canEditCurrent)}>
            {busy ? 'กำลังทำงาน...' : formId && !canEditCurrent ? 'ดูอย่างเดียว' : formId ? '💾 บันทึกทับใบเดิม' : '💾 บันทึกลงระบบ'}
          </button>
          {formId && canEditCurrent && (
            <button type="button" className="tb-btn tb-btn-ghost" onClick={saveAsNew} disabled={busy}>
              บันทึกเป็นใบใหม่
            </button>
          )}
          <button type="button" className="tb-btn tb-btn-ghost" onClick={exportWord} disabled={busy}>
            ⤓ ส่งออก Word (.docx)
          </button>
          <Link href="/rca" className="tb-btn tb-btn-ghost">← กลับหน้า RCA</Link>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {formId
              ? `บันทึกบนระบบแล้ว (ใบที่ ${formId}) — เปิดต่อจากเครื่องไหนก็ได้`
              : 'ยังไม่ได้บันทึกลงระบบ — ตอนนี้ร่างอยู่ในเบราว์เซอร์นี้เท่านั้น'}
          </span>
        </div>
      </div>
    </div>
  );
}
