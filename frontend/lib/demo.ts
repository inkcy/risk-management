import type {
  ActionItem,
  CautiPatient,
  Incident,
  RcaBundle,
  RcaCause,
  RiskRegisterItem,
  Stats,
} from './types';

export const demoIncidents: Incident[] = [
  { id: 1, ir_code: 'IR 2503000003', occurred_at: '2025-02-18T10:48:00+07:00', title: 'ให้เลือดผิดคน ผิดหมู่เลือด',
    description: 'Platelet concentrate · ไม่บ่งชี้ตัวผู้ป่วย', unit_id: 1, unit_name: 'MICU / CCU',
    category: 'blood', severity: 'E', rca_status: 'done', reported_by: 'พยาบาลเวร' },
  { id: 2, ir_code: 'IR 2504000021', occurred_at: '2025-04-04T14:30:00+07:00', title: 'ให้ยา Insulin ผิดขนาด',
    description: 'High Alert Drug', unit_id: 4, unit_name: 'ICU',
    category: 'medication', severity: 'D', rca_status: 'in_progress', reported_by: 'พยาบาลเวร' },
  { id: 3, ir_code: 'IR 2505000045', occurred_at: '2025-05-12T02:15:00+07:00', title: 'ผู้ป่วยพลัดตกจากเตียง',
    description: 'ผู้สูงอายุ 78 ปี', unit_id: 2, unit_name: 'Ward ศัลยกรรม',
    category: 'fall', severity: 'C', rca_status: 'done', reported_by: 'พยาบาลเวรดึก' },
  { id: 4, ir_code: 'IR 2505000072', occurred_at: '2025-05-20T09:10:00+07:00', title: 'ไม่ได้ระบุตัวผู้ป่วยก่อนให้ยา (Near miss)',
    description: 'หัวหน้าทีมตรวจพบ', unit_id: 3, unit_name: 'Ward อายุรกรรม',
    category: 'medication', severity: 'B', rca_status: 'done', reported_by: 'พยาบาลเวร' },
  { id: 5, ir_code: 'IR 2502000009', occurred_at: '2025-02-03T18:45:00+07:00', title: 'ผู้ป่วย CAPD มีภาวะ Septic shock',
    description: 'Septic shock with HHS', unit_id: 1, unit_name: 'MICU / CCU',
    category: 'other', severity: 'F', rca_status: 'done', reported_by: 'แพทย์เวร' },
];

export const demoActions: ActionItem[] = [
  { id: 1, incident_id: 1, ir_code: 'IR 2503000003', title: 'แก้ไข SOP HP-COP-QSH-005',
    description: 'ระเบียบรับ-จ่ายเลือด', owner: 'คณะกรรมการ QPS', due_date: '2025-06-30', status: 'done', progress: 100 },
  { id: 2, incident_id: 1, ir_code: 'IR 2503000003', title: 'Double identification บังคับ',
    description: 'พยาบาล 2 คน', owner: 'หัวหน้าฝ่ายการพยาบาล', due_date: '2025-03-31', status: 'done', progress: 100 },
  { id: 3, incident_id: 1, ir_code: 'IR 2503000003', title: 'ปรับ Performance Check List',
    description: 'สอดคล้อง IPSG-1', owner: 'คณะกรรมการ QPS', due_date: '2025-04-30', status: 'done', progress: 100 },
  { id: 4, incident_id: 1, ir_code: 'IR 2503000003', title: 'ระบบสแกนบาร์โค้ดเลือด',
    description: 'ลด human error', owner: 'ฝ่าย IT / BME', due_date: '2025-12-31', status: 'in_progress', progress: 40 },
  { id: 5, incident_id: 1, ir_code: 'IR 2503000003', title: 'นโยบายมอบหมายงานข้ามหน่วย',
    description: 'High Risk activities', owner: 'ผู้อำนวยการพยาบาล', due_date: '2025-04-30', status: 'done', progress: 100 },
  { id: 6, incident_id: 1, ir_code: 'IR 2503000003', title: 'กระติกขนส่งเลือดมาตรฐาน',
    description: 'ice pack + thermometer', owner: 'BME', due_date: '2025-09-30', status: 'planned', progress: 0 },
];

const demoTimeline = [
  { time: '08:10', title: 'Lab รายงาน CBC', detail: 'Hct 26% · PLT 13k · INR 1.5', tag: 'ok' as const },
  { time: '08:48', title: 'แพทย์ order เลือดทั้ง 2 ราย', detail: 'FFP · LPPC · Cryo · LPRC ผู้ป่วย 1 / PLT ผู้ป่วย 2', tag: 'ok' as const },
  { time: '10:19', title: 'รับเลือดทั้ง 2 ราย วางใกล้กัน', detail: 'ผู้ช่วยพยาบาลวางเลือดรวมกันหลังเคาน์เตอร์ ไม่แยกออก', tag: 'warn' as const },
  { time: '10:48', title: '⚠ ตรวจสอบ Blood number เท่านั้น', detail: 'ไม่ตรวจชื่อผู้ป่วยกับป้ายคล้องเลือด ไม่มี double check', tag: 'bad' as const },
  { time: '11:00', title: '⚠ ให้เลือดผิดคน', detail: 'ไม่คล้องป้ายหมู่เลือด ไม่บ่งชี้ตัวผู้ป่วยที่ป้ายข้อมือ', tag: 'bad' as const },
  { time: '11:15', title: 'หัวหน้าทีมตรวจพบ — หยุดทันที', detail: 'รายงานแพทย์ เจาะเลือดตรวจ ส่งถุงคืนธนาคารเลือด', tag: 'ok' as const },
];

const demoCausesByCategory: Record<RcaCause['category'], { label: string; hot: boolean }[]> = {
  people: [{ label: 'ภาระงานมาก', hot: true }, { label: 'พยาบาลต่างหน่วย', hot: true }, { label: 'ไม่รายงานตัว', hot: true }],
  system: [{ label: 'ไม่มี barcode scan', hot: true }, { label: 'ขั้นตอนไม่ชัดเจน', hot: true }, { label: 'ไม่กด HIS รับเลือด', hot: false }],
  environment: [{ label: 'วางเลือด 2 รายรวมกัน', hot: true }, { label: 'ขาดป้ายแยก', hot: false }],
  management: [{ label: 'ไม่กำหนดนโยบายชัด', hot: true }, { label: 'มอบหมายงานไม่ชัด', hot: true }],
};

export const demoRiskTop5: RiskRegisterItem[] = [
  { id: 1, title: 'การให้เลือดผิดคน / ผิดหมู่', likelihood: 3, consequence: 5, score: 15, category: 'blood', note: null },
  { id: 2, title: 'ยา High Alert ผิดขนาด', likelihood: 4, consequence: 4, score: 16, category: 'medication', note: null },
  { id: 3, title: 'การสื่อสารส่งต่อผิดพลาด', likelihood: 5, consequence: 4, score: 20, category: 'communication', note: null },
  { id: 4, title: 'ติดเชื้อจากหัตถการ', likelihood: 3, consequence: 3, score: 9, category: 'procedure', note: null },
  { id: 5, title: 'ผู้ป่วยพลัดตกจากเตียง', likelihood: 4, consequence: 2, score: 8, category: 'fall', note: null },
];

export const demoRcaBundle: RcaBundle = {
  incident: demoIncidents[0],
  case: {
    id: 1, incident_id: 1, summary: null,
    hro_sensitivity: 25, hro_deference: 20, hro_reluctance: 35, hro_preoccupation: 70, hro_resilience: 80,
    completed_at: '2025-03-15',
  },
  timeline: demoTimeline.map((t, i) => ({
    id: i + 1, rca_case_id: 1,
    occurred_at: `2025-02-18T${t.time}:00+07:00`,
    event_title: t.title, event_detail: t.detail, severity_tag: t.tag, sort_order: i + 1,
  })),
  causes: (Object.entries(demoCausesByCategory) as [RcaCause['category'], { label: string; hot: boolean }[]][])
    .flatMap(([cat, items], gi) =>
      items.map((c, i) => ({
        id: gi * 10 + i, rca_case_id: 1,
        category: cat, label: c.label, is_hot: c.hot,
      } satisfies RcaCause)),
    ),
};

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

const baseCauti: Omit<CautiPatient, 'days_in' | 'is_overdue'>[] = [
  { id: 1, bed: '19A-1', patient_name: 'สมชาย กิมนรากร',   age: 49, hn: 'HN001234', diagnosis: 'SBP with AKI',           ward: '19A', inserted_at: '2025-06-01', plan_off_date: '2025-06-04', removed_at: null,         outcome: 'death',   note: 'ผู้ป่วยเสียชีวิตก่อน off F/C' },
  { id: 2, bed: '19A-2', patient_name: 'ประจิตร พรหมสรัย', age: 44, hn: 'HN001235', diagnosis: 'Alcoholic ketoacidosis', ward: '19A', inserted_at: '2025-06-01', plan_off_date: '2025-06-04', removed_at: '2025-06-03', outcome: 'removed', note: 'off ตามแผน' },
  { id: 3, bed: '19A-3', patient_name: 'วิเชียร ธรรมสุ',    age: 60, hn: 'HN001236', diagnosis: 'Rt.MCA infarction',      ward: '19A', inserted_at: '2025-06-02', plan_off_date: '2025-06-05', removed_at: null,         outcome: 'death',   note: '' },
  { id: 4, bed: '19A-4', patient_name: 'สุนิสา แก้วใส',     age: 71, hn: 'HN001237', diagnosis: 'CAUTI prevention obs',   ward: '19A', inserted_at: '2025-05-29', plan_off_date: '2025-06-01', removed_at: null,         outcome: '',        note: 'ใส่เกิน 3 วัน — ทบทวนแผน off' },
];

export const demoCauti: CautiPatient[] = baseCauti.map(p => {
  const reference = p.removed_at ?? new Date().toISOString().slice(0, 10);
  const days = daysBetween(p.inserted_at, reference);
  return { ...p, days_in: days, is_overdue: !p.removed_at && days >= 3 };
});

export const demoStats: Stats = {
  totals: { incidents: 247, severe: 8, rca_pending: 2, actions_done: 28, actions_in_progress: 4, actions_planned: 2 },
  by_category: [
    { category: 'medication', count: 78 }, { category: 'communication', count: 72 },
    { category: 'fall', count: 44 }, { category: 'blood', count: 32 }, { category: 'procedure', count: 21 },
  ],
  by_month: [
    { ym: '2024-10', count: 18 }, { ym: '2024-11', count: 22 }, { ym: '2024-12', count: 19 },
    { ym: '2025-01', count: 24 }, { ym: '2025-02', count: 31 }, { ym: '2025-03', count: 27 },
    { ym: '2025-04', count: 29 }, { ym: '2025-05', count: 35 },
  ],
  risk_top5: demoRiskTop5,
};
