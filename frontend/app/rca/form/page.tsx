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
  cardiacArrestRcaForm,
  isBlankRcaForm,
  normalizeRcaForm,
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

type AnalysisView = 'fishbone' | 'why' | 'swiss' | 'tiers' | 'report';

const ANALYSIS_TABS: { key: AnalysisView; label: string; icon: string }[] = [
  { key: 'fishbone', label: '1. Fishbone', icon: '⌁' },
  { key: 'why', label: '2. 5 Why', icon: '◎' },
  { key: 'swiss', label: '3. 2-axis Swiss cheese', icon: '♢' },
  { key: 'tiers', label: '4. 5 Tiers', icon: '▱' },
  { key: 'report', label: '5. วิเคราะห์ RCA', icon: '▤' },
];

const FISHBONE_GROUPS = [
  {
    key: 'people', title: 'PEOPLE (บุคลากร/ผู้เกี่ยวข้อง)',
    items: [
      'ผู้ป่วยมีภาวะ Anemia และ CA Cervix ซึ่งเพิ่มความเสี่ยงต่อภาวะลิ่มเลือดอุดตัน',
      'ญาติช่วยพาผู้ป่วยเดินโดยอาจไม่ทราบความเสี่ยงของ Orthostatic hypotension หรือ PE',
      'ควรทบทวนความครบถ้วนของการประเมินความพร้อมก่อนเคลื่อนไหว',
    ],
  },
  {
    key: 'process', title: 'PROCESS (กระบวนการ)',
    items: [
      'การประเมิน VTE risk และความพร้อมก่อนลุกเดินอาจไม่เชื่อมเป็นขั้นตอนเดียวกัน',
      'Early Mobilization ควรเริ่มจาก Sitting → Standing → Walking',
      'ระบบเฝ้าระวังผู้ป่วยกลุ่มเสี่ยงสูงระหว่างทำกิจกรรมควรกำหนดให้ชัดเจน',
    ],
  },
  {
    key: 'equipment', title: 'EQUIPMENT (เครื่องมือ)',
    items: [
      'ควรทบทวนการใช้อุปกรณ์ป้องกัน VTE เช่น Sequential Compression Device (SCD)',
      'ควรมีอุปกรณ์ประเมินสัญญาณชีพพร้อมใช้ขณะผู้ป่วยเริ่มลุกเดินครั้งแรก',
    ],
  },
  {
    key: 'environment', title: 'ENVIRONMENT (สิ่งแวดล้อม)',
    items: [
      'สภาพแวดล้อมในหอผู้ป่วยควรส่งเสริมกิจกรรมกระตุ้นการเคลื่อนไหวอย่างปลอดภัย',
      'ระยะทางและลักษณะทางเดินไปห้องน้ำอาจเพิ่มภาระในการลุกเดินครั้งแรก',
    ],
  },
];

const FIVE_WHYS = [
  ['ทำไมผู้ป่วยจึงเกิด Cardiac Arrest?', 'สงสัยภาวะ Pulmonary Embolism (PE) เฉียบพลัน ส่งผลให้เกิด Acute Cor Pulmonale และระบบไหลเวียนล้มเหลว'],
  ['ทำไมจึงสงสัยว่าเกิด Pulmonary Embolism?', 'ผู้ป่วยทรุดลงอย่างเฉียบพลันระหว่างลุกเดินครั้งแรกหลัง Bedrest เป็นเวลานาน ร่วมกับ O₂ saturation ต่ำและคลำชีพจรไม่ได้'],
  ['ทำไมผู้ป่วยรายนี้จึงมีความเสี่ยงต่อ VTE/PE สูง?', 'มีปัจจัยเสี่ยงจากโรคมะเร็งปากมดลูก ภาวะซีด และการไม่ได้เคลื่อนไหวร่างกายเป็นเวลานาน'],
  ['ทำไมความเสี่ยงอาจไม่ได้รับการป้องกันหรือค้นพบก่อนลุกเดิน?', 'ต้องทบทวนความครบถ้วนของ VTE risk reassessment, prophylaxis และ pre-ambulation assessment จากเวชระเบียน'],
  ['ทำไมกระบวนการดังกล่าวอาจไม่ครบถ้วน?', 'ระบบอาจยังไม่มี checklist ที่เชื่อมการประเมิน VTE กับแผน early mobilization และเกณฑ์เฝ้าระวังผู้ป่วยความเสี่ยงสูงอย่างชัดเจน'],
] as const;

function FishboneView({ effect }: { effect: string }) {
  return (
    <section className="rca-method rca-fishbone">
      <div className="rca-method-heading"><span>⌁</span> 1. Fishbone</div>
      <p className="rca-method-subtitle">รายละเอียดการวิเคราะห์ปัจจัยเกื้อหนุน (Data Details)</p>
      <div className="fishbone-board">
        <div className="fishbone-causes">
          {FISHBONE_GROUPS.map(group => (
            <article className={`fishbone-card ${group.key}`} key={group.key}>
              <h3><i />{group.title}</h3>
              <ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
        <div className="fishbone-spine" aria-hidden="true"><span /></div>
        <aside className="fishbone-effect">
          <small>ปัญหาหลัก (EFFECT)</small>
          <strong>{effect || 'Cardiac Arrest ระหว่างการลุกเดินครั้งแรก'}</strong>
        </aside>
      </div>
    </section>
  );
}

function FiveWhyView() {
  return (
    <section className="rca-method rca-fivewhy">
      <div className="rca-method-heading"><span>◎</span> 2. 5 Why</div>
      <div className="fivewhy-list">
        {FIVE_WHYS.map(([question, answer], index) => (
          <article className="fivewhy-item" key={question}>
            <div className="fivewhy-number">{index + 1}</div>
            <div className="fivewhy-card">
              <h3>ถาม: {question}</h3>
              <p><span>›</span>{answer}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SwissCheeseView({ form }: { form: RcaFormData }) {
  const rows = [
    ['Tier 5: Ext. Environment', form.tiers.tier5],
    ['Tier 4: Management', form.tiers.tier4],
    ['Tier 3: Environment', form.tiers.tier3],
    ['Tier 2: Work & Team', form.tiers.tier2],
    ['Tier 1: Patient & Staff', form.tiers.tier1],
  ];
  return (
    <section className="rca-method rca-swiss">
      <div className="rca-method-heading"><span>♢</span> 3. 2-axis Swiss cheese</div>
      <p className="rca-method-caption">Mapping the Anatomy of an Error — มองช่องโหว่ตั้งแต่ระดับผู้ป่วยจนถึงระบบภายนอก</p>
      <div className="swiss-stack">
        {rows.map(([label, value], index) => (
          <div className={`swiss-row swiss-${5 - index}`} key={label}>
            <strong>{label}</strong>
            <p>{value || 'ประเด็นที่ต้องทบทวนและยืนยันจากเวชระเบียน/การสัมภาษณ์'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FiveTiersView({ form }: { form: RcaFormData }) {
  return (
    <section className="rca-method rca-tiers-view">
      <div className="rca-method-heading"><span>▱</span> 4. 5 Tiers</div>
      <p className="rca-method-caption">5-Tier Contributory Factor for Incident Analysis</p>
      <div className="tier-cards">
        {(['tier5', 'tier4', 'tier3', 'tier2', 'tier1'] as const).map((key, index) => (
          <article key={key}>
            <span>{5 - index}</span>
            <div><h3>{TIER_ROWS.find(row => row.key === key)?.label.replace(/\n/g, ' · ')}</h3><p>{form.tiers[key] || 'รอการทบทวน'}</p></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function RcaFormPage() {
  const [form, setForm] = useState<RcaFormData>(emptyRcaForm);
  const [activeView, setActiveView] = useState<AnalysisView>('fishbone');
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
      setForm(cardiacArrestRcaForm());
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
    if (!confirm('แทนที่ข้อมูลปัจจุบันด้วยตัวอย่าง Cardiac Arrest จากภาวะสงสัย PE?')) return;
    setForm(cardiacArrestRcaForm());
    setActiveView('fishbone');
    setMsg({ kind: 'info', text: 'ใส่ข้อมูลตัวอย่างแล้ว — สามารถแก้ไขรายละเอียดในแท็บ วิเคราะห์ RCA' });
  };

  const startAnalysis = () => {
    if (!form.story.trim()) {
      setMsg({ kind: 'err', text: 'กรุณาบรรยายเหตุการณ์ที่ต้องการวิเคราะห์ก่อน' });
      return;
    }
    setActiveView('fishbone');
    setMsg({ kind: 'ok', text: 'จัดเตรียมผลวิเคราะห์ทั้ง 5 มุมมองแล้ว กรุณาทบทวนข้อเท็จจริงก่อนนำไปใช้' });
    requestAnimationFrame(() => document.getElementById('rca-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
      <header className="rca-ai-banner">
        <div className="rca-pulse-mark" aria-hidden="true">⌁</div>
        <div>
          <h1>AI-driven Root Cause Analysis (RCA)</h1>
          <p>ระบบช่วยวิเคราะห์สาเหตุรากสำหรับงานคุณภาพและความปลอดภัยผู้ป่วย</p>
        </div>
      </header>

      <section className="rca-story-card">
        <label htmlFor="rca-story"><span className="story-target">◎</span> บรรยายเหตุการณ์ความเสี่ยงที่ต้องการทำ RCA <strong>(ระบุเหตุการณ์โดยละเอียด)</strong></label>
        <textarea
          id="rca-story"
          rows={6}
          value={form.story}
          placeholder="ระบุลำดับเหตุการณ์ อาการสำคัญ การประเมิน การช่วยเหลือ และผลกระทบที่เกิดขึ้น"
          onChange={event => set('story', event.target.value)}
        />
        <div className="rca-story-actions">
          <span>ข้อมูลทางการแพทย์จาก AI เป็นร่างเพื่อการทบทวน ไม่ใช่ข้อสรุปทางคลินิก</span>
          <button type="button" className="rca-analyze-button" onClick={startAnalysis}><b>⌁</b> คลิกเพื่อเริ่มวิเคราะห์ (AI RCA)</button>
        </div>
      </section>

      <div className="rca-workbar">
        <div>
          <button type="button" className="tb-btn tb-btn-ghost" onClick={toggleCloud}>{showCloud ? 'ปิดรายการ' : '☁ ร่างที่บันทึกไว้'}</button>
          <button type="button" className="tb-btn tb-btn-ghost" onClick={loadSample}>ใส่กรณีตัวอย่าง</button>
          <button type="button" className="tb-btn tb-btn-ghost" onClick={clearForm}>ล้างฟอร์ม</button>
          <button type="button" className="tb-btn tb-btn-primary" onClick={saveToCloud} disabled={busy || (!!formId && !canEditCurrent)}>
            {busy ? 'กำลังทำงาน...' : formId && !canEditCurrent ? 'ดูอย่างเดียว' : '💾 บันทึก'}
          </button>
        </div>
        {savedAt && <span>บันทึกร่างอัตโนมัติ {savedAt}</span>}
        {msg && (
          <div className={`rca-work-message ${msg.kind}`}>{msg.text}</div>
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

      <section className="rca-results" id="rca-results">
        <nav className="rca-analysis-tabs" aria-label="รูปแบบการวิเคราะห์ RCA">
          {ANALYSIS_TABS.map(tab => (
            <button
              type="button"
              key={tab.key}
              className={`${tab.key} ${activeView === tab.key ? 'active' : ''}`}
              onClick={() => setActiveView(tab.key)}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </nav>
        <div className="rca-results-toolbar">
          <span>ⓘ ระบบจะบันทึกข้อมูลอัตโนมัติเมื่อแก้ไขแบบฟอร์มในส่วนที่ 5</span>
          <button type="button" onClick={exportWord} disabled={busy}>⇩ ดาวน์โหลดเอกสารการวิเคราะห์ความเสี่ยง</button>
        </div>
        {activeView === 'fishbone' && <FishboneView effect={form.subject} />}
        {activeView === 'why' && <FiveWhyView />}
        {activeView === 'swiss' && <SwissCheeseView form={form} />}
        {activeView === 'tiers' && <FiveTiersView form={form} />}
        {activeView === 'report' && (
          <div className="rca-report-cover">
            <div className="report-cross">✚</div>
            <h2>โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา</h2>
            <p>สภากาชาดไทย</p>
            <strong>{FORM_TITLE}</strong>
            <small>{FORM_CODE}</small>
          </div>
        )}
      </section>

      <fieldset className={`rf-edit-area ${activeView === 'report' ? '' : 'rf-hidden'}`} disabled={!!formId && !canEditCurrent}>
      {/* ---- ส่วนหัวแบบฟอร์ม ---- */}
      <Section title="ข้อมูลทั่วไป">
        <Area label="เรื่อง" rows={2} value={form.subject} placeholder={EXAMPLE.subject} onChange={v => set('subject', v)} />
        <div className="rf-grid">
          <Field label="RM No." value={form.rmNo} placeholder={EXAMPLE.rmNo} onChange={v => set('rmNo', v)} />
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
