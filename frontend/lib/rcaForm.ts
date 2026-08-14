/**
 * โครงข้อมูลของแบบฟอร์ม FM-QPS-QSH-002/03 : 28/04/64
 * "แบบฟอร์มแสดงการวิเคราะห์สาเหตุที่แท้จริง (RCA)"
 *
 * ใช้ร่วมกันระหว่างหน้ากรอกข้อมูล (app/rca/form) และตัวสร้างไฟล์ Word (lib/rcaFormDocx)
 */

export const FORM_CODE = 'FM-QPS-QSH-002/03 : 28/04/64';
export const FORM_TITLE = 'แบบฟอร์มแสดงการวิเคราะห์สาเหตุที่แท้จริง (RCA)';

export type RiskType = 'clinic' | 'general' | '';

/** แถวของตาราง CARE MANAGEMENT PROBLEM (หัวข้อ 2) */
export interface CmpRow {
  /** คอลัมน์ "ปัญหา" — ชื่อกระบวนการที่เป็นปัญหา */
  area: string;
  /** แนวทางปฏิบัติ/กระบวนการทำงานที่กำหนด */
  standard: string;
  /** สิ่งที่ปฏิบัติจริงที่ไม่ปลอดภัย (Unsafe act) */
  unsafeAct: string;
  /** ข้อจำกัดของผู้ปฏิบัติงานในเวลานั้น / สาเหตุ proximal cause */
  constraint: string;
  /** ช่วงเวลา */
  period: string;
  /** ระบบงานที่เกี่ยวข้อง */
  system: string;
}

/** แถวของตารางลำดับเหตุการณ์ (หัวข้อ 1) */
export interface TimelineRow {
  day: string;
  time: string;
  event: string;
}

/** แถวของตารางสรุป RCA (หัวข้อ 5) */
export interface SolutionRow {
  rootCause: string;
  prevention: string;
  owner: string;
  timeframe: string;
}

/** แถวของตารางการจัดการกระบวนการ (หัวข้อ 6) */
export interface ProcessRow {
  process: string;
  requirement: string;
  indicators: string;
  design: string;
}

export interface RcaFormData {
  // ---- ส่วนหัวของแบบฟอร์ม ----
  subject: string;
  rmNo: string;
  rmYear: string;
  reviewDate: string;
  eventDate: string;
  riskType: RiskType;
  unit: string;
  severity: string;
  members: string;

  // ---- 1. Story and Timeline ----
  story: string;
  /** adverse event / problem statement */
  psWho: string;
  psWhat: string;
  psImpact: string;
  /** COLONOGY OF EVENT — ด้านคลินิก 7 ขั้นตอน (เรียงตาม COLONOGY_CLINICAL) */
  colonogyClinical: string[];
  /** COLONOGY OF EVENT — ด้านทั่วไป 2 ข้อ (เรียงตาม COLONOGY_GENERAL) */
  colonogyGeneral: string[];
  timeline: TimelineRow[];

  // ---- 2. CARE MANAGEMENT PROBLEM ----
  cmpClinical: CmpRow[];
  cmpGeneral: CmpRow[];

  // ---- 3. 5W1H (Proactive fact finding) ----
  w5h1: Record<W5H1Key, string>;

  // ---- 4. 5 Tier Contributory Factor ----
  tiers: Record<TierKey, string>;

  // ---- 5. สรุป RCA (Creative solution) ----
  solutions: SolutionRow[];

  // ---- 6. การจัดการกระบวนการ (Process Management) ----
  processes: ProcessRow[];
}

export const riskTypeLabel: Record<Exclude<RiskType, ''>, string> = {
  clinic: 'คลินิก',
  general: 'ทั่วไป',
};

/** COLONOGY OF EVENT (WORK FLOW) — กระบวนการดูแลผู้ป่วย สำหรับความเสี่ยงด้านคลินิก */
export const COLONOGY_CLINICAL = [
  'Access การเข้าถึงบริการ / Entry การเข้ารับบริการ',
  'Assessment การประเมินผู้ป่วย / Investigation การส่งตรวจหรือตรวจชันสูตร',
  'Diagnosis การวินิจฉัยโรค',
  'Plan of care การวางแผนการดูแลรักษา / Care of patient การดูแลรักษาผู้ป่วย',
  'Reassess การประเมินซ้ำระหว่างการดูแล / Discharge plan การวางแผนการจำหน่าย',
  'Communication การสื่อสารในทีมและผู้ป่วย / Information & Empowerment การให้ข้อมูลเสริมพลังผู้ป่วยและญาติ',
  'Discharge การจำหน่ายผู้ป่วยออกจากโรงพยาบาล / Continuity of care การดูแลต่อเนื่องที่บ้านหรือชุมชน',
] as const;

/** COLONOGY OF EVENT (WORK FLOW) — สำหรับความเสี่ยงทั่วไป */
export const COLONOGY_GENERAL = [
  'ระบบการทำงาน',
  'การสื่อสาร / การติดต่อประสานงานที่เกี่ยวข้อง',
] as const;

export const CMP_CLINICAL_AREAS = [
  'การเข้าถึง',
  'การประเมิน',
  'การวางแผน',
  'การดูแล',
  'การให้ข้อมูลเสริมพลัง',
  'การดูแลต่อเนื่อง',
] as const;

export const CMP_GENERAL_AREAS = [
  'การให้บริการ/การจัดบริการ',
  'การสื่อสาร/ให้ข้อมูล',
  'อุปกรณ์/สิ่งแวดล้อม',
  'การกำกับติดตาม/ประเมินผล',
] as const;

export const CMP_COLUMNS = [
  'ปัญหา',
  'แนวทางปฏิบัติ/กระบวนการทำงานที่กำหนด',
  'สิ่งที่ปฏิบัติจริงที่ไม่ปลอดภัย (Unsafe act)',
  'ข้อจำกัดของผู้ปฏิบัติงานในเวลานั้น / สาเหตุ proximal cause',
  'ช่วงเวลา',
  'ระบบงานที่เกี่ยวข้อง',
] as const;

export type W5H1Key = 'what' | 'how' | 'where' | 'when' | 'why' | 'who';

/** คำถามนำของแต่ละข้อ — ในแบบฟอร์มกระดาษพิมพ์เป็นตัวอักษรสีแดงและลบออกได้เมื่อกรอกแล้ว */
export const W5H1_ROWS: { key: W5H1Key; label: string; hint: string }[] = [
  {
    key: 'what',
    label: 'What',
    hint: 'เกิดอะไรขึ้น ปัญหาคืออะไร วัตถุประสงค์คืออะไร หรือสิ่งที่เราต้องการจะทำคืออะไร',
  },
  {
    key: 'how',
    label: 'How',
    hint: 'สิ่งนี้เกิดขึ้นได้อย่างไร เราจะทำสิ่งนี้ได้อย่างไร มีขั้นตอนอะไรบ้าง หรือจะแก้ไขปัญหานี้ได้อย่างไร',
  },
  {
    key: 'where',
    label: 'Where',
    hint: 'เหตุการณ์เกิดขึ้นที่ไหน ปัญหาอยู่ที่ส่วนใดของกระบวนการ หรือสิ่งที่เรากำลังจะทำจะเกิดขึ้นที่ไหน',
  },
  {
    key: 'when',
    label: 'When',
    hint: 'เกิดขึ้นเมื่อไหร่ บ่อยแค่ไหน',
  },
  {
    key: 'why',
    label: 'Why',
    hint: 'ทำไมสิ่งนี้ถึงเกิดขึ้น ทำไมต้องทำเช่นนี้ อะไรคือแรงจูงใจ หรืออะไรคือเหตุผลเบื้องหลัง',
  },
  {
    key: 'who',
    label: 'Who',
    hint: 'ใครคือบุคคลหรือกลุ่มคนที่เกี่ยวข้องผู้กระทำ ใครคือผู้รับผลกระทบ ใครคือผู้มีส่วนได้ส่วนเสีย ใครที่ควรรับผิดชอบ หรือใครคือกลุ่มเป้าหมาย',
  },
];

export type TierKey = 'tier5' | 'tier4' | 'tier3' | 'tier2' | 'tier1' | 'cmp' | 'flow';

/** 5 Tier Contributory Factor for Incident Analysis — เรียงจากบนลงล่างเหมือนแบบฟอร์ม */
export const TIER_ROWS: { key: TierKey; label: string; hint: string }[] = [
  {
    key: 'tier5',
    label: 'ปัจจัย 5\nสิ่งแวดล้อมภายนอก\n(Ext. Environment)',
    hint: 'ปัจจัยเชิงระบบและสิ่งแวดล้อมภายนอก · นโยบายระดับประเทศ · ปัจจัยทางสังคม เศรษฐกิจภายนอกที่ควบคุมไม่ได้',
  },
  {
    key: 'tier4',
    label: 'ปัจจัย 4\nการจัดการ\n(Management)',
    hint: 'วัฒนธรรมองค์กร · นโยบายการดูแลรักษา เกณฑ์มาตรฐาน · นโยบายด้านการบริหาร คน เงิน ของ การเตรียมพร้อมอุปกรณ์',
  },
  {
    key: 'tier3',
    label: 'ปัจจัย 3\nสิ่งแวดล้อม\n(Environment)\nHuman-System Interfaces',
    hint: 'Task design / clinical protocol · Supervision / training · การออกแบบสิ่งแวดล้อม · ปัจจัยด้านกายภาพและอุปกรณ์ เครื่องมือ',
  },
  {
    key: 'tier2',
    label: 'ปัจจัย 2\nระบบงาน การสื่อสารและทีม\n(Work & Team)',
    hint: 'ปัจจัยจากกระบวนการการทำงานร่วมกันในทีม · ระบบงานที่ซับซ้อน / Flow งานไม่ชัดเจน · การสื่อสารในทีม / การส่งต่อข้อมูล',
  },
  {
    key: 'tier1',
    label: 'ปัจจัย 1\nบุคลากร/ผู้ป่วย\n(Individuals)',
    hint: 'ความรุนแรงของโรค ทักษะ ความเหนื่อยล้า การตัดสินใจที่ผิดพลาด · ปัจจัยบุคคลที่เกี่ยวข้องกับความไม่ปลอดภัยโดยตรง ผู้ป่วย แพทย์ พยาบาล',
  },
  {
    key: 'cmp',
    label: 'CARE MANAGEMENT PROBLEM\nSubstandard Act',
    hint: 'Potential change · Error & Mistake · Routine · Violation / Exceptional',
  },
  {
    key: 'flow',
    label: 'COLONOGY OF EVENT\nFlow of Steps',
    hint: 'ลำดับขั้นตอนการทำงานที่เกิดเหตุ เช่น Scene → Assess → Activate Fast Track → Consult Team → Management → Admit',
  },
];

export const PROCESS_NOTES = [
  'ข้อกำหนดของกระบวนการ (process requirement) ระบุสิ่งที่คาดหวังจากกระบวนการที่ออกแบบใหม่ ด้วย key word สั้น ๆ โดยพิจารณาจากความต้องการของผู้รับผลงาน มาตรฐานวิชาชีพ และความเสี่ยงที่อาจทำให้ไม่บรรลุเป้าหมาย',
  'ตัวชี้วัดของกระบวนการ (process indicators) ระบุตัวชี้วัดที่สัมพันธ์กับข้อกำหนดของกระบวนการ และเป็นประโยชน์ในการทำให้มั่นใจในคุณภาพของกระบวนการนั้น',
  'การออกแบบกระบวนการ (process design) พิจารณา driver diagram และ process requirement แล้วพิจารณาว่าจะใช้แนวคิดการออกแบบอะไร เช่น simplicity, visual management, human factor engineering, human-centered design, Lean thinking',
];

/**
 * ข้อความตัวอย่างที่แสดงเป็นตัวจาง ๆ (placeholder) ในหน้ากรอกข้อมูล
 * อ้างอิงกรณีผู้ป่วยได้รับ Ertapenem ซ้ำซ้อน จากการคัดลอกสติ๊กเกอร์ยาผิดวัน
 *
 * เป็นแค่ตัวอย่างให้ดูเป็นแนวขณะกรอก — ไม่ถูกบันทึกและไม่ถูกส่งออกไปในไฟล์ Word
 */
export const EXAMPLE = {
  subject: 'ตัวอย่าง: ทบทวนกระบวนการบริหารยาปฏิชีวนะ กรณีผู้ป่วยได้รับ Ertapenem ซ้ำซ้อน (double dose)',
  rmNo: '2505000007',
  rmYear: '69',
  reviewDate: '14 พฤษภาคม 2569',
  eventDate: '7 พฤษภาคม 2569',
  unit: 'หอผู้ป่วยอายุรกรรม 22A / กลุ่มงานเภสัชกรรม',
  severity: 'E',
  members:
    'ผู้อำนวยการโรงพยาบาล, หัวหน้าองค์กรพยาบาล, หัวหน้าหอผู้ป่วย 22A, ' +
    'หัวหน้ากลุ่มงานเภสัชกรรม, แพทย์เจ้าของไข้, ศูนย์คุณภาพและความปลอดภัย',

  story:
    'ตัวอย่าง — ผู้ป่วยหญิงไทย อายุ 44 ปี Dx UTI with Sepsis รับไว้ในโรงพยาบาลวันที่ 4/5/69 ' +
    'U/D HT, DLP, Epilepsy (last seizure 2568) แพ้ยา Penicillin V (ผื่นทั่วตัว)\n' +
    'U/C ขึ้นเชื้อ E.coli >10^5 แพทย์ปรับ ATB จาก Ciprofloxacin → Ceftriaxone (5/5/69) → Ertapenem 1 g IV OD (6/5/69)\n' +
    'วันที่ 7/5/69 พยาบาลเวรเช้าบริหาร Ertapenem ไปแล้วเวลา 15.20 น. พยาบาลเจ้าของเคสคัดลอกสติ๊กเกอร์ยาเป็นรอบ 18.00 น. ' +
    'ของวันเดียวกัน มีพยาบาลตรวจสอบซ้ำแล้วผ่าน และบริหารยาอีกครั้งเวลา 19.00 น. ทำให้ผู้ป่วยได้รับยาซ้ำซ้อน\n' +
    'แพทย์รับทราบ ให้เฝ้าสังเกตอาการต่อ และให้ ATB ตามรอบของแผนการรักษาเดิม',
  psWho: 'ตัวอย่าง: ผู้ป่วยหญิงไทย อายุ 44 ปี Dx UTI with Sepsis มีโรคประจำตัว Epilepsy และแพ้ยากลุ่ม Penicillin',
  psWhat: 'ตัวอย่าง: ได้รับ Ertapenem 1 g IV ซ้ำ 2 ครั้งในวันเดียวกัน จากการคัดลอกคำสั่งลงสติ๊กเกอร์ยาผิดวัน',
  psImpact:
    'ตัวอย่าง: ได้รับยาเกินขนาด แพทย์รับทราบและให้เฝ้าระวังอาการทางระบบประสาท ' +
    'ไม่พบอาการชักหรือความผิดปกติ แต่ต้องติดตามต่อเนื่อง (ระดับ E)',

  colonogyClinical: [
    'ตัวอย่าง: refer จากหน่วยบริการปฐมภูมิมาที่ห้องฉุกเฉินด้วยไข้ 38.5 °C',
    'ตัวอย่าง: ประเมินแรกรับและส่งตรวจ CBC / UA / H/C / U/C / VBG (Lactate 1.5 mmol/L)',
    'ตัวอย่าง: วินิจฉัย UTI with Sepsis จาก UA WBC >100 และ Nitrite positive',
    'ตัวอย่าง: ให้ ATB ตามผลเพาะเชื้อ — เปลี่ยนยา 3 ครั้งใน 3 วัน ผ่านขั้นตอนคัดลอกคำสั่งลงสติ๊กเกอร์ยาและบริหารยาข้างเตียง',
    'ตัวอย่าง: ก่อนบริหารยารอบ 18.00 น. ไม่มีการทวนสอบว่ายารอบวันนี้ถูกให้ไปแล้วหรือยัง',
    'ตัวอย่าง: การส่งเวรระหว่างเวรเช้ากับเวรบ่ายไม่ได้ระบุว่าบริหาร Ertapenem ไปแล้วเมื่อ 15.20 น.',
    'ตัวอย่าง: ยังไม่ถึงขั้นตอนนี้ในเหตุการณ์ (ผู้ป่วยยังนอนโรงพยาบาล)',
  ],
  colonogyGeneral: [
    'ตัวอย่าง: ระบบสั่งใช้ยา → คัดลอกคำสั่ง → จัดยา → บริหารยา ซึ่งยังใช้การเขียนสติ๊กเกอร์ยาด้วยลายมือ',
    'ตัวอย่าง: การสื่อสารเมื่อมีการเปลี่ยนแผนการรักษาระหว่างแพทย์ พยาบาล และเภสัชกร',
  ],
  timeline: {
    day: '7/5/69',
    time: '19.00',
    event: 'ตัวอย่าง: พยาบาลเวรบ่ายบริหาร Ertapenem 1 g IV ซ้ำ ทั้งที่เวรเช้าให้ไปแล้วเมื่อเวลา 15.20 น.',
  },
  cmp: {
    area: 'ตัวอย่าง: การดูแล / การบริหารยา',
    standard: 'ตัวอย่าง: ตรวจสอบยาตามหลัก 7R และทวนสอบกับ MAR หรือคำสั่งแพทย์ก่อนบริหารยาทุกครั้ง โดยพยาบาล 2 คน',
    unsafeAct:
      'ตัวอย่าง:\n' +
      '1. คัดลอกคำสั่งลงสติ๊กเกอร์ยาผิดวัน/ผิดรอบ\n' +
      '2. ตรวจสอบซ้ำโดยดูที่ตัวสติ๊กเกอร์อย่างเดียว ไม่ได้ทวนย้อนกับ MAR หรือคำสั่งแพทย์',
    constraint:
      'ตัวอย่าง: พยาบาลเจ้าของเคสและผู้ตรวจสอบซ้ำเป็นพยาบาลจบใหม่ทั้งคู่ · ' +
      'แผนการรักษาเปลี่ยน ATB 3 ครั้งใน 3 วัน ทำให้ต้องคัดลอกคำสั่งใหม่หลายรอบ',
    period: 'เช่น 15.20 - 19.00 น.',
    system: 'ตัวอย่าง: ระบบบริหารยา / การส่งเวร / MAR',
  },
  w5h1: {
    what: 'ตัวอย่าง: ผู้ป่วยได้รับ Ertapenem 1 g IV ซ้ำ 2 ครั้งในวันเดียว เพราะสติ๊กเกอร์ยาถูกคัดลอกผิดวัน',
    how: 'ตัวอย่าง: แพทย์เปลี่ยน ATB → พยาบาลคัดลอกคำสั่งลงสติ๊กเกอร์ (ผิดวัน) → ตรวจสอบซ้ำที่ตัวสติ๊กเกอร์ → บริหารยารอบ 19.00 น.',
    where: 'ตัวอย่าง: หอผู้ป่วยอายุรกรรม 22A ในขั้นตอนการคัดลอกคำสั่งใช้ยาและการบริหารยาข้างเตียง',
    when: 'ตัวอย่าง: 7 พฤษภาคม 2569 เวลา 19.00 น. โดยยารอบเดียวกันถูกให้ไปแล้วเมื่อ 15.20 น.',
    why: 'ตัวอย่าง: ยังคัดลอกคำสั่งด้วยลายมือ · การตรวจสอบซ้ำไม่ได้ทวนย้อนกับ MAR · ผู้ปฏิบัติเป็นพยาบาลจบใหม่ทั้งสองคน',
    who: 'ตัวอย่าง: ผู้ได้รับผลกระทบ ผู้ป่วย · ผู้เกี่ยวข้อง พยาบาลเจ้าของเคส พยาบาลผู้ตรวจสอบซ้ำ แพทย์เจ้าของไข้ เภสัชกร · ผู้รับผิดชอบแก้ไข หัวหน้าหอผู้ป่วย ศูนย์คุณภาพ',
  },
  tiers: {
    tier5: 'ตัวอย่าง: มาตรฐาน HA และแนวทาง SIMPLE (Safe from Medication Error) กำหนดให้มีการตรวจสอบซ้ำยาความเสี่ยงสูง แต่ยังไม่บังคับให้ใช้ระบบบาร์โค้ดข้างเตียง',
    tier4: 'ตัวอย่าง: ยังไม่มีนโยบายจัดหาระบบพิมพ์สติ๊กเกอร์ยาจาก HIS หรือ BCMA · การกำกับติดตามการบันทึก MAR ยังไม่สม่ำเสมอ',
    tier3: 'ตัวอย่าง: ไม่มีระบบดักจับการให้ยาซ้ำ · สติ๊กเกอร์ยาเขียนด้วยลายมือ ไม่ได้พิมพ์จากระบบ · ไม่มีจุดบันทึกเวลาที่ให้ยาจริงให้เห็นชัดข้างเตียง',
    tier2: 'ตัวอย่าง: การส่งเวรไม่ได้ระบุว่ายารอบนี้บริหารไปแล้ว · การตรวจสอบซ้ำทำโดยพยาบาลจบใหม่ด้วยกัน จึงไม่ใช่ independent double check ที่ทวนกับคำสั่งแพทย์',
    tier1: 'ตัวอย่าง: พยาบาลเจ้าของเคสเป็นพยาบาลจบใหม่ ประสบการณ์น้อย · แผนการรักษาเปลี่ยนบ่อยทำให้สับสน · ผู้ป่วยมีประวัติ Epilepsy จึงเสี่ยงต่อผลข้างเคียงจากยาเกินขนาด',
    cmp: 'ตัวอย่าง: Error & Mistake — คัดลอกคำสั่งผิด (transcription error) ร่วมกับการตรวจสอบซ้ำที่ไม่ทำงานจริง',
    flow: 'ตัวอย่าง: แพทย์เปลี่ยนคำสั่ง ATB → คัดลอกลงสติ๊กเกอร์ยา → จัดยา → ตรวจสอบซ้ำ → บริหารยาข้างเตียง → บันทึกการให้ยา',
  },
  solution: {
    rootCause: 'ตัวอย่าง: การคัดลอกคำสั่งใช้ยาด้วยลายมือ ร่วมกับการตรวจสอบซ้ำที่ไม่ได้ทวนย้อนกับ MAR หรือคำสั่งแพทย์',
    prevention:
      'ตัวอย่าง:\n' +
      'กำหนดให้การตรวจสอบซ้ำต้องทวนกับ MAR และอ่านออกเสียงยืนยัน (read-back) ทุกครั้ง\n' +
      'พิมพ์สติ๊กเกอร์ยาจากระบบแทนการเขียนด้วยลายมือ\n' +
      'ไม่มอบหมายการบริหารยาความเสี่ยงสูงให้พยาบาลจบใหม่ตรวจสอบซ้ำกันเอง',
    owner: 'หัวหน้าหอผู้ป่วย 22A / องค์กรพยาบาล / เภสัชกรรม',
    timeframe: 'เช่น ภายใน 1 เดือน',
  },
  process: {
    process: 'ตัวอย่าง: ขั้นตอนการคัดลอกคำสั่งใช้ยาและการบริหารยาข้างเตียง',
    requirement:
      'ตัวอย่าง: สติ๊กเกอร์ยาพิมพ์จากระบบ · ตรวจสอบ 7R โดยพยาบาล 2 คน ' +
      'โดยผู้ตรวจสอบซ้ำต้องทวนกับ MAR · บันทึกเวลาให้ยาทันทีหลังบริหารยา',
    indicators: 'ตัวอย่าง: อุบัติการณ์การให้ยาซ้ำซ้อน = 0 ครั้ง · อัตราการบันทึก MAR ทันทีหลังให้ยา = 100%',
    design:
      'ตัวอย่าง: human factor engineering ลดขั้นตอนคัดลอกด้วยมือ · ' +
      'visual management ทำช่องเซ็นกำกับเวลาให้ยาที่เห็นชัดใน MAR · read-back ยืนยันร่วมกัน 2 คน',
  },
} as const;

export const emptyCmpRow = (area = ''): CmpRow => ({
  area,
  standard: '',
  unsafeAct: '',
  constraint: '',
  period: '',
  system: '',
});

export const emptyTimelineRow = (): TimelineRow => ({ day: '', time: '', event: '' });
export const emptySolutionRow = (): SolutionRow => ({ rootCause: '', prevention: '', owner: '', timeframe: '' });
export const emptyProcessRow = (): ProcessRow => ({ process: '', requirement: '', indicators: '', design: '' });

export function emptyRcaForm(): RcaFormData {
  return {
    subject: '',
    rmNo: '',
    rmYear: String(new Date().getFullYear() + 543).slice(-2),
    reviewDate: '',
    eventDate: '',
    riskType: '',
    unit: '',
    severity: '',
    members: '',

    story: '',
    psWho: '',
    psWhat: '',
    psImpact: '',
    colonogyClinical: COLONOGY_CLINICAL.map(() => ''),
    colonogyGeneral: COLONOGY_GENERAL.map(() => ''),
    timeline: [emptyTimelineRow()],

    cmpClinical: CMP_CLINICAL_AREAS.map(a => emptyCmpRow(a)),
    cmpGeneral: CMP_GENERAL_AREAS.map(a => emptyCmpRow(a)),

    w5h1: { what: '', how: '', where: '', when: '', why: '', who: '' },
    tiers: { tier5: '', tier4: '', tier3: '', tier2: '', tier1: '', cmp: '', flow: '' },

    solutions: [emptySolutionRow()],
    processes: [emptyProcessRow()],
  };
}

/** เติมค่า default ให้ข้อมูลที่รับมาจาก client เพื่อกันฟิลด์หาย/ชนิดไม่ตรง */
export function normalizeRcaForm(input: unknown): RcaFormData {
  const base = emptyRcaForm();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strArray = (v: unknown, len: number) => {
    const src = Array.isArray(v) ? v : [];
    return Array.from({ length: len }, (_, i) => str(src[i]));
  };
  /** ถ้าไม่ได้ส่งฟิลด์นี้มาเลย ให้ใช้แถวตั้งต้นของแบบฟอร์มเปล่า (ไม่ใช่ตารางว่าง) */
  const rows = <T extends object>(v: unknown, template: T, fallback: T[]): T[] => {
    if (!Array.isArray(v)) return fallback;
    return v.map(item => {
      const src = (item ?? {}) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const k of Object.keys(template)) out[k] = str(src[k]);
      return out as T;
    });
  };

  const riskType = str(raw.riskType);

  return {
    subject: str(raw.subject),
    rmNo: str(raw.rmNo),
    rmYear: str(raw.rmYear) || base.rmYear,
    reviewDate: str(raw.reviewDate),
    eventDate: str(raw.eventDate),
    riskType: riskType === 'clinic' || riskType === 'general' ? riskType : '',
    unit: str(raw.unit),
    severity: str(raw.severity),
    members: str(raw.members),

    story: str(raw.story),
    psWho: str(raw.psWho),
    psWhat: str(raw.psWhat),
    psImpact: str(raw.psImpact),
    colonogyClinical: strArray(raw.colonogyClinical, COLONOGY_CLINICAL.length),
    colonogyGeneral: strArray(raw.colonogyGeneral, COLONOGY_GENERAL.length),
    timeline: rows(raw.timeline, emptyTimelineRow(), base.timeline),

    cmpClinical: rows(raw.cmpClinical, emptyCmpRow(), base.cmpClinical),
    cmpGeneral: rows(raw.cmpGeneral, emptyCmpRow(), base.cmpGeneral),

    w5h1: {
      what: str((raw.w5h1 as Record<string, unknown> | undefined)?.what),
      how: str((raw.w5h1 as Record<string, unknown> | undefined)?.how),
      where: str((raw.w5h1 as Record<string, unknown> | undefined)?.where),
      when: str((raw.w5h1 as Record<string, unknown> | undefined)?.when),
      why: str((raw.w5h1 as Record<string, unknown> | undefined)?.why),
      who: str((raw.w5h1 as Record<string, unknown> | undefined)?.who),
    },
    tiers: TIER_ROWS.reduce((acc, t) => {
      acc[t.key] = str((raw.tiers as Record<string, unknown> | undefined)?.[t.key]);
      return acc;
    }, {} as Record<TierKey, string>),

    solutions: rows(raw.solutions, emptySolutionRow(), base.solutions),
    processes: rows(raw.processes, emptyProcessRow(), base.processes),
  };
}

/**
 * แบบฟอร์มยังว่างอยู่หรือไม่ — ใช้ตัดสินว่าร่างที่เก็บไว้มีเนื้อหาจริง
 * (ไม่นับ rmYear และชื่อกระบวนการที่เติมมาให้ตั้งแต่ต้น)
 */
export function isBlankRcaForm(form: RcaFormData): boolean {
  const areas = new Set<string>([...CMP_CLINICAL_AREAS, ...CMP_GENERAL_AREAS]);
  const values: string[] = [
    form.subject, form.rmNo, form.reviewDate, form.eventDate, form.riskType, form.unit, form.severity, form.members,
    form.story, form.psWho, form.psWhat, form.psImpact,
    ...form.colonogyClinical, ...form.colonogyGeneral,
    ...form.timeline.flatMap(t => [t.day, t.time, t.event]),
    ...[...form.cmpClinical, ...form.cmpGeneral].flatMap(r => [
      areas.has(r.area.trim()) ? '' : r.area,
      r.standard, r.unsafeAct, r.constraint, r.period, r.system,
    ]),
    ...Object.values(form.w5h1),
    ...Object.values(form.tiers),
    ...form.solutions.flatMap(s => [s.rootCause, s.prevention, s.owner, s.timeframe]),
    ...form.processes.flatMap(p => [p.process, p.requirement, p.indicators, p.design]),
  ];
  return values.every(v => (v ?? '').trim() === '');
}

/** ตัวอย่างข้อมูล — อ้างอิงกรณีให้เลือดผิดคนผิดกรุ๊ป (IR 2503000003) */
export function sampleRcaForm(): RcaFormData {
  const f = emptyRcaForm();
  return {
    ...f,
    subject: 'ทบทวนกระบวนการการจัดเตรียมเลือด ส่วนประกอบของเลือดและการใช้เลือด (ให้เลือดผิดคน ผิดกรุ๊ป)',
    rmNo: '2503000003',
    reviewDate: '14 พฤษภาคม 2568',
    eventDate: '18 กุมภาพันธ์ 2568',
    riskType: 'clinic',
    unit: 'MICU / ธนาคารเลือด / ทีมนำทางคลินิก',
    severity: 'E',
    members: 'ผู้อำนวยการโรงพยาบาล, หัวหน้าองค์กรพยาบาล, หัวหน้าหอผู้ป่วย MICU, หัวหน้าธนาคารเลือด, พยาบาลผู้เกี่ยวข้อง, ศูนย์คุณภาพและความปลอดภัย',
    story:
      'ผู้ป่วยหญิงไทย อายุ 69 ปี Diagnosis septic arthritis underlying T2DM HT ESRD stage 5 on CAPD ' +
      'รับย้ายเข้า MICU วันที่ 18/2/68 on ETT with ventilator แพทย์สั่งให้เลือดและส่วนประกอบของเลือดหลายชนิด\n' +
      'ในวันเดียวกันมีผู้ป่วยอีก 1 รายที่ได้รับ order Platelet concentrate เช่นกัน ผู้ช่วยพยาบาลรับเลือดของผู้ป่วยทั้ง 2 ราย ' +
      'มาวางไว้ใกล้กันที่หลังเคาน์เตอร์พยาบาลโดยไม่แยกให้ชัดเจน พยาบาลจากหน่วยงานอื่นที่มาช่วยให้เลือดตรวจสอบเฉพาะ Blood number ' +
      'ไม่ได้ตรวจสอบชื่อผู้ป่วยกับป้ายคล้องถุงเลือด ไม่มีการ double check และไม่ได้บ่งชี้ตัวผู้ป่วยที่ป้ายข้อมือก่อนให้เลือด ' +
      'พยาบาลหัวหน้าทีมตรวจพบว่า Platelet concentrate ที่กำลังให้เป็นของผู้ป่วยอีกราย จึงหยุดให้ทันทีและดำเนินการตามขั้นตอนปฏิกิริยาหลังการให้เลือด',
    psWho: 'ผู้ป่วยหญิงอายุ 69 ปี ภาวะ septic shock ใส่ท่อช่วยหายใจ อยู่ในหอผู้ป่วยวิกฤต',
    psWhat: 'ได้รับ Platelet concentrate ของผู้ป่วยรายอื่น (ให้เลือดผิดคน ผิดกรุ๊ป)',
    psImpact: 'หยุดให้เลือดได้ภายใน 15 นาที ผู้ป่วยไม่เกิดปฏิกิริยารุนแรง แต่ต้องเจาะเลือดติดตามและเฝ้าระวังต่อเนื่อง (ระดับ E)',
    colonogyClinical: [
      '',
      'แพทย์สั่งตรวจ CBC / PT / INR และสั่งให้ส่วนประกอบของเลือดตามผล lab',
      '',
      'ธนาคารเลือดเตรียมเลือดตาม order — ผู้ช่วยพยาบาลรับเลือดของผู้ป่วย 2 รายพร้อมกัน — พยาบาลให้เลือดที่หอผู้ป่วย',
      'พยาบาลหัวหน้าทีมตรวจสอบการให้เลือดซ้ำและพบความผิดพลาด',
      'ไม่มีการรายงานตัว/รับมอบหมายงานจากพยาบาลหัวหน้าทีมก่อนให้เลือด',
      '',
    ],
    colonogyGeneral: [
      'ระบบรับ-จ่ายเลือด ระบบ HIS (การกดรับเลือด) และการแยกผลิตภัณฑ์เลือดรายบุคคล',
      'การสื่อสารระหว่างธนาคารเลือด ผู้ช่วยพยาบาล และพยาบาลผู้ให้เลือด',
    ],
    timeline: [
      { day: '18/2/68', time: '08.10', event: 'Lab รายงานผล CBC ผู้ป่วยรายที่ 1 : Hct 26% Hb 8.8 PLT 13 x10³ PT/PT control 17.5/12.4 INR 1.5' },
      { day: '18/2/68', time: '08.48', event: 'แพทย์ order ผู้ป่วยรายที่ 1 : FFP 2 U, Platelet concentrate 10 U, Cryoprecipitate 6 U, LPRC 1 U / order ผู้ป่วยรายที่ 2 : Platelet concentrate 10 U' },
      { day: '18/2/68', time: '09.27', event: 'ธนาคารเลือดเตรียมเลือดตาม order' },
      { day: '18/2/68', time: '10.19', event: 'ผู้ช่วยพยาบาลรับเลือดของผู้ป่วยทั้ง 2 ราย นำไปวางใกล้กันที่หลังเคาน์เตอร์พยาบาล ไม่แยกให้ชัดเจน' },
      { day: '18/2/68', time: '10.48', event: 'พยาบาลจากหน่วยงานอื่นมาช่วยให้เลือด ตรวจสอบเฉพาะ Blood number ไม่ตรวจสอบชื่อผู้ป่วยกับป้ายคล้องถุงเลือด ไม่มีผู้ตรวจสอบซ้ำอีก 1 คน' },
      { day: '18/2/68', time: '11.00', event: 'นำเลือดไปให้ผู้ป่วยโดยไม่คล้องป้ายหมู่เลือดและไม่บ่งชี้ตัวผู้ป่วยที่ป้ายข้อมือ' },
      { day: '18/2/68', time: '11.15', event: 'พยาบาลหัวหน้าทีมพบว่า Platelet concentrate เป็นของผู้ป่วยอีกราย หยุดให้ทันที รายงานแพทย์และธนาคารเลือด เจาะเลือดผู้ป่วยและส่งถุงเลือดตรวจสอบ' },
    ],
    cmpClinical: [
      emptyCmpRow('การเข้าถึง'),
      emptyCmpRow('การประเมิน'),
      emptyCmpRow('การวางแผน'),
      {
        area: 'การดูแล',
        standard: 'แบบตรวจสอบการปฏิบัติงาน (Performance Check List) การให้เลือดและส่วนประกอบของเลือด — ตรวจสอบ 2 ขั้นตอน โดยพยาบาล 2 คน และ double identification ที่ข้อมือผู้ป่วย',
        unsafeAct:
          '1. ไม่ตรวจสอบเลือดให้ครบทุกผลิตภัณฑ์ตามกระบวนการ\n' +
          '2. ข้ามขั้นตอนตรวจสอบประวัติการรับเลือดในระบบ HIS และไม่หาผู้ตรวจสอบร่วมทำ double check\n' +
          '3. ไม่บ่งชี้ตัวผู้ป่วยที่ป้ายข้อมือ ไม่คล้องป้ายหมู่เลือด และไม่ทำ double identification ก่อนให้เลือด',
        constraint: 'พยาบาลต่างหน่วยงานที่มาช่วย ไม่ทราบรายละเอียดเคส ภาระงานในหอผู้ป่วยวิกฤตสูง เลือดของผู้ป่วย 2 รายวางใกล้กันโดยไม่แยก',
        period: '10.48 - 11.15 น.',
        system: 'ระบบการให้เลือดและส่วนประกอบของเลือด (HP-COP-QSH-005), ระบบ HIS',
      },
      emptyCmpRow('การให้ข้อมูลเสริมพลัง'),
      emptyCmpRow('การดูแลต่อเนื่อง'),
    ],
    cmpGeneral: [
      {
        area: 'การให้บริการ/การจัดบริการ',
        standard: 'รับเลือดแล้วต้องแยกผลิตภัณฑ์ของผู้ป่วยแต่ละรายให้ชัดเจน และกดรับเลือดในระบบ HIS',
        unsafeAct: 'รับเลือดของผู้ป่วย 2 รายพร้อมกันแล้ววางไว้ใกล้กัน ไม่แยกออกจากกัน ไม่กดรับเลือดในระบบ',
        constraint: 'ไม่มีคอมพิวเตอร์เข้าถึงระบบได้สะดวกทุกจุด และบางหน่วยงานไม่ทราบวิธีกดรับเลือดในระบบ HIS',
        period: '10.19 น.',
        system: 'ขั้นตอนการจ่ายเลือดและรับเลือด',
      },
      {
        area: 'การสื่อสาร/ให้ข้อมูล',
        standard: 'บุคลากรต่างหน่วยงานที่เข้าช่วยต้องรายงานตัวและรับมอบหมายงานจากพยาบาลหัวหน้าทีมก่อนทำกิจกรรมการพยาบาล',
        unsafeAct: 'ไม่รายงานตัวและไม่สอบถามรายละเอียดเคสก่อนการให้เลือด แนวทางการมอบหมายงานไม่ชัดเจน',
        constraint: 'ไม่มีแนวทางการมอบหมายงานกรณีเข้าช่วยเหลือระหว่างหน่วยงาน',
        period: '10.48 น.',
        system: 'ระบบมอบหมายงาน/อัตรากำลัง',
      },
      {
        area: 'อุปกรณ์/สิ่งแวดล้อม',
        standard: 'มีระบบป้องกันการให้เลือดผิดคน และป้ายคล้องถุงเลือดครบทุก unit',
        unsafeAct: 'ยังไม่มีระบบสแกนบาร์โค้ด และ Cryoprecipitate มีป้ายคล้องเลือดเพียงใบเดียว หากชำรุด/สูญหายอาจให้ผิดคนได้',
        constraint: 'ข้อจำกัดด้านงบประมาณและระบบสารสนเทศ',
        period: '-',
        system: 'ระบบเทคโนโลยีสารสนเทศ / เครื่องมือแพทย์',
      },
      emptyCmpRow('การกำกับติดตาม/ประเมินผล'),
    ],
    w5h1: {
      what: 'ผู้ป่วยได้รับ Platelet concentrate ของผู้ป่วยรายอื่น เพราะข้ามขั้นตอนการตรวจสอบและไม่ทำ double identification',
      how: 'รับเลือดของผู้ป่วย 2 รายพร้อมกันแล้ววางไว้ใกล้กันโดยไม่แยก → ตรวจสอบเฉพาะ Blood number → ไม่ตรวจสอบชื่อกับป้ายคล้องถุงเลือด → ไม่บ่งชี้ตัวผู้ป่วยก่อนให้เลือด',
      where: 'หอผู้ป่วยวิกฤต (MICU) ในขั้นตอนการรับเลือดจากธนาคารเลือดและขั้นตอนการให้เลือดข้างเตียง',
      when: '18 กุมภาพันธ์ 2568 เวลา 11.00 น. — พบภายใน 15 นาที เป็นอุบัติการณ์ให้เลือดผิดคนครั้งแรกในรอบปี',
      why: 'ภาระงานสูง บุคลากรต่างหน่วยงานมาช่วยโดยไม่ได้รับมอบหมายงาน ไม่มีระบบบาร์โค้ดช่วยดักจับ และแนวทางปฏิบัติหลังรับเลือดไม่ได้กำหนดการแยกเลือดรายบุคคล',
      who: 'ผู้ได้รับผลกระทบ: ผู้ป่วย 2 ราย · ผู้เกี่ยวข้อง: พยาบาลผู้ให้เลือด ผู้ช่วยพยาบาล ธนาคารเลือด · ผู้รับผิดชอบแก้ไข: หัวหน้าหอผู้ป่วย หัวหน้าธนาคารเลือด ศูนย์คุณภาพ',
    },
    tiers: {
      tier5: 'มาตรฐาน HA / ข้อกำหนดงานบริการโลหิตของสภากาชาดไทยกำหนดให้ต้องมี double identification แต่ยังไม่มีข้อกำหนดบังคับเรื่องระบบบาร์โค้ด',
      tier4: 'นโยบายด้านงบประมาณยังไม่ครอบคลุมการจัดหาระบบสแกนบาร์โค้ดและคอมพิวเตอร์ทุกจุดบริการ · การกำกับติดตามการปฏิบัติตาม PCL ยังไม่สม่ำเสมอ',
      tier3: 'ไม่มีระบบสแกนบาร์โค้ดดักจับความผิดพลาด · ป้ายคล้องถุงเลือด Cryoprecipitate มีใบเดียว · ไม่มีคอมพิวเตอร์เข้าถึงระบบ HIS ทุกจุด · กระติกขนส่งเลือดไม่ได้กำหนดมาตรฐานและการ calibrate',
      tier2: 'แนวทางการมอบหมายงานกรณีบุคลากรต่างหน่วยงานเข้าช่วยไม่ชัดเจน · ไม่มีการส่งต่อข้อมูลเคสก่อนให้เลือด · กระบวนการหลังรับเลือดไม่ได้กำหนดให้แจ้งพยาบาลและแยกเลือดรายบุคคล',
      tier1: 'พยาบาลผู้ให้เลือดไม่คุ้นเคยกับผู้ป่วย ภาระงานสูง ตรวจสอบไม่ครบขั้นตอน · ผู้ป่วยอยู่ในภาวะวิกฤต ใส่ท่อช่วยหายใจ ไม่สามารถยืนยันตัวตนเองได้',
      cmp: 'Violation / Routine violation — ข้ามขั้นตอนการตรวจสอบเลือดและ double identification ที่กำหนดไว้ใน PCL จนกลายเป็นการปฏิบัติที่คุ้นเคย',
      flow: 'แพทย์สั่งเลือด → ธนาคารเลือดจัดเตรียม → ผู้ช่วยพยาบาลรับเลือด (ไม่แยกรายบุคคล) → พยาบาลตรวจสอบเลือด (ข้ามขั้นตอน) → ให้เลือดข้างเตียง (ไม่บ่งชี้ตัวผู้ป่วย) → หัวหน้าทีมตรวจพบและหยุดให้เลือด',
    },
    solutions: [
      {
        rootCause: 'ไม่ปฏิบัติตาม PCL การให้เลือด — ข้ามขั้นตอนตรวจสอบและ double check/double identification',
        prevention:
          'หัวหน้าหอผู้ป่วย/ผู้ที่ได้รับมอบหมาย กำกับติดตามให้บุคลากรปฏิบัติตาม PCL\n' +
          'เน้นหลัก double check ทุกขั้นตอน ตั้งแต่การขอเลือด การรับเลือด และการให้เลือด',
        owner: 'หัวหน้าหอผู้ป่วยทุกหน่วยงาน / องค์กรพยาบาล',
        timeframe: 'เริ่มทันที ติดตามผลทุกเดือน 6 เดือน',
      },
      {
        rootCause: 'กระบวนการหลังรับเลือดไม่ได้กำหนดให้แยกผลิตภัณฑ์เลือดของผู้ป่วยแต่ละราย',
        prevention:
          'แก้ไขกระบวนการหลังตรวจรับเลือด กรณีรับเลือดหลายคนต้องแยกเลือดออกให้ชัดเจน\n' +
          'เมื่อรับเลือดมาแล้วต้องแจ้งพยาบาลทราบทุกครั้ง และเตรียมกระติกรับเลือดแยกรายผู้ป่วย',
        owner: 'หัวหน้าธนาคารเลือด / หัวหน้าหอผู้ป่วย',
        timeframe: 'ภายใน 1 เดือน',
      },
      {
        rootCause: 'แนวทางการมอบหมายงานกรณีบุคลากรต่างหน่วยงานเข้าช่วยไม่ชัดเจน',
        prevention:
          'กำหนดแนวทาง: ต้องได้รับมอบหมายงานจากพยาบาลหัวหน้าทีมก่อนทำกิจกรรมการพยาบาล\n' +
          'หลีกเลี่ยงการมอบหมายงานความเสี่ยงสูงให้บุคลากรต่างหน่วยงาน (High alert drug, การให้เลือด, หัตถการความเสี่ยงสูง)',
        owner: 'องค์กรพยาบาล',
        timeframe: 'ภายใน 1 เดือน',
      },
      {
        rootCause: 'ไม่มีระบบดักจับความผิดพลาดเชิงเทคโนโลยี (บาร์โค้ด) และป้ายคล้องถุงเลือดบางผลิตภัณฑ์มีใบเดียว',
        prevention:
          'แก้ไขกระบวนการเตรียม Cryoprecipitate และแก้ไขในระบบ HIS ให้ใช้งานได้จริง\n' +
          'สำรวจหน่วยงานที่ยังไม่กดรับเลือดในระบบ จัดหาคอมพิวเตอร์และลงนิเทศหน้างาน\n' +
          'เสนอแผนจัดหาระบบสแกนบาร์โค้ดระยะยาว',
        owner: 'ธนาคารเลือด / ศูนย์คอมพิวเตอร์ / ทีมนำคุณภาพ',
        timeframe: 'ภายใน 6 เดือน',
      },
    ],
    processes: [
      {
        process: 'ขั้นตอนการจ่ายเลือดและรับเลือด',
        requirement: 'กระบวนการตรวจสอบ 2 ขั้นตอนของเจ้าหน้าที่ 2 คน และมีระบบป้องกันความผิดพลาดด้วยการจ่ายเลือดด้วยระบบบาร์โค้ด',
        indicators: 'การเกิดอุบัติการณ์การจ่ายเลือดผิด = 0 ครั้ง',
        design:
          'แก้ไขแนวทางปฏิบัติ HP-COP-QSH-005 ข้อ 6.3.2 ขั้นตอนการจ่ายเลือดและรับเลือด\n' +
          'ข้อ 6.3.4 เจ้าหน้าที่ประจำหอผู้ป่วยตรวจสอบความถูกต้องอีกครั้งก่อนรับเลือดกลับหอผู้ป่วย และเตรียมกระติกแยกรายผู้ป่วยให้ชัดเจน\n' +
          'ป้องกันการชำรุด/สูญหายของใบคล้องเลือดกรณี FFP, LDFFP, Cryoprecipitate โดยธนาคารเลือดจัดเตรียมให้พร้อมใช้ก่อนจ่าย',
      },
      {
        process: 'ขั้นตอนการให้เลือด',
        requirement:
          'กระบวนการตรวจสอบ 2 ขั้นตอนของพยาบาล 2 คน\n' +
          '1. ประวัติการตรวจหมู่เลือดและการรับเลือดจากระบบสารสนเทศ ตรงกับสายรัดข้อมือระบุหมู่เลือด\n' +
          '2. ตรวจสอบ ชื่อ สกุล HN ชนิดของเลือด หมู่เลือดผู้ป่วย หมู่เลือด Donor Unit Number และวันหมดอายุ ให้ตรงกับใบสำคัญรับเลือด ใบจ่ายเลือด ใบคล้องถุงเลือด และป้ายติดถุงเลือด\n' +
          '3. การบ่งชี้ตัวผู้ป่วยข้างเตียง',
        indicators: 'การเกิดอุบัติการณ์การให้เลือดผิดคน/ผิดกรุ๊ป = 0 ครั้ง · อัตราการปฏิบัติตาม PCL การให้เลือด = 100%',
        design:
          'ใช้ human factor engineering: แยกกระติก/ตะกร้าเลือดรายผู้ป่วย ติดป้ายสีต่างกัน\n' +
          'Visual management: checklist ข้างเตียงและการอ่านออกเสียงยืนยันร่วมกัน 2 คน (read-back)',
      },
    ],
  };
}
