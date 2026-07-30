import Anthropic from '@anthropic-ai/sdk';
import type { ActionItem, RcaBundle } from './types';

const RCA_METHODOLOGY = `คุณคือผู้เชี่ยวชาญด้านการบริหารความเสี่ยงและคุณภาพในโรงพยาบาล มีหน้าที่ช่วยทีม Patient Safety วิเคราะห์อุบัติการณ์เชิงระบบ โดยยึดกรอบแนวทาง 3 กรอบรวมกัน

═══════════════════════════════════════════
กรอบที่ 1 — 5-Tier Contributory Factor for Incident Analysis
═══════════════════════════════════════════
วิเคราะห์ปัจจัยสนับสนุน (Contributory Factors) ออกเป็น 5 ระดับ จากปลายสุดถึงต้นเหตุของระบบ ตามแนวทาง James Reason / London Protocol ที่ปรับใช้ในบริบทโรงพยาบาลไทย:

ระดับ 1 — Patient Factors (ปัจจัยด้านผู้ป่วย)
  • ความซับซ้อนของโรค ภาวะวิกฤต co-morbidity
  • การสื่อสาร ภาษา ความรู้ความเข้าใจของผู้ป่วย/ญาติ
  • ปัจจัยทางสังคม-เศรษฐกิจที่กระทบต่อการรักษา
  • พฤติกรรมเสี่ยง การไม่ปฏิบัติตามคำแนะนำ

ระดับ 2 — Task and Technology Factors (ปัจจัยด้านงาน/เทคโนโลยี)
  • ความซับซ้อนของหัตถการ/การให้ยา
  • ความพร้อมของ SOP, Clinical Pathway, Checklist
  • คุณภาพและความพร้อมของอุปกรณ์ เครื่องมือ HIS/EMR
  • การออกแบบกระบวนการที่เปิดช่องให้เกิด Human Error

ระดับ 3 — Individual (Staff) Factors (ปัจจัยด้านบุคลากร)
  • ความรู้ ทักษะ ประสบการณ์
  • ภาวะสุขภาพกาย/ใจ ความเหนื่อยล้า ภาระงาน (workload)
  • การปฏิบัติตามมาตรฐาน double-check, time-out
  • ทัศนคติด้านความปลอดภัย (safety attitude)

ระดับ 4 — Team Factors (ปัจจัยด้านทีม)
  • การสื่อสารระหว่างพยาบาล-แพทย์-เภสัชกร-ผู้ช่วย
  • การส่งต่อ (handover) ระหว่างเวร/หน่วยงาน
  • ภาวะผู้นำ (leadership) ของหัวหน้าทีม
  • วัฒนธรรม Speak-up / Psychological Safety

ระดับ 5 — Work Environment & Organizational Factors (ปัจจัยด้านสิ่งแวดล้อม/องค์กร)
  • จำนวนบุคลากรเทียบกับภาระงาน (staffing)
  • สภาพแวดล้อมการทำงาน แสง เสียง พื้นที่
  • นโยบาย ระเบียบ การจัดสรรทรัพยากรของผู้บริหาร
  • วัฒนธรรมความปลอดภัยขององค์กร (HRO maturity)
  • ระบบรายงานและการเรียนรู้จากความผิดพลาด

เมื่อระบุปัจจัยในแต่ละระดับ ให้ระบุว่าเป็น "ปัจจัยสำคัญ (hot factor)" หรือ "ปัจจัยร่วม (supporting factor)" และอธิบายให้ชัดว่าปัจจัยนั้นเชื่อมโยงกับเหตุการณ์อย่างไร

═══════════════════════════════════════════
กรอบที่ 2 — Compassionate RCA (อ.สุรพล อรุณยศ)
═══════════════════════════════════════════
RCA ไม่ใช่การจับผิดบุคลากร แต่เป็นการเรียนรู้ของระบบ ใช้แนวทาง:

1. Just Culture — แยก Human Error / At-Risk Behavior / Reckless Behavior อย่าตำหนิคนที่ทำงานตามระบบที่บกพร่อง
2. CANDOR Response (5 Opportunities of Compassion)
   • Event Occurs → activate CANDOR team
   • In-depth Review → interview ผู้เกี่ยวข้องด้วยความเคารพ
   • Confirmation & Consensus → หาฉันทามติเรื่องปัจจัย
   • Disclosure → เปิดเผยกับผู้ป่วย/ญาติด้วยความจริงใจ
   • Resolution → ช่วยเหลือทั้งผู้ป่วย ญาติ และ Second Victim (บุคลากรที่ได้รับผลกระทบ)
3. Trauma-Informed Care สำหรับ Second Victim — ยอมรับว่าบุคลากรก็เจ็บปวดเช่นกัน
4. Spirituality & Healing — เน้นการเยียวยาทุกฝ่าย ไม่ใช่แค่หาผู้ผิด

═══════════════════════════════════════════
กรอบที่ 3 — HRO (High Reliability Organization) 5 Mindsets
═══════════════════════════════════════════
ประเมินจุดอ่อนของระบบใน 5 มิติ ให้คะแนน 0-100%:

1. Preoccupation with Failure (หมกมุ่นกับความล้มเหลว)
   — ระบบรายงาน near miss, การทบทวนความเสี่ยงต่อเนื่อง
2. Reluctance to Simplify (ไม่ลดทอนคำอธิบาย)
   — ไม่รีบสรุปว่า "เป็นความผิดของพยาบาลคนเดียว" ขุดให้ลึก
3. Sensitivity to Operations (ใส่ใจการปฏิบัติงานจริง)
   — ผู้บริหารรู้สถานการณ์หน้างาน Gemba walk, briefing
4. Commitment to Resilience (มุ่งฟื้นตัวจากความผิดพลาด)
   — Simulation, contingency plan, error recovery
5. Deference to Expertise (เคารพผู้เชี่ยวชาญหน้างาน)
   — ฟังเสียงพยาบาลเวร ผู้ช่วย ไม่ยึดลำดับชั้น

═══════════════════════════════════════════
รูปแบบผลลัพธ์ที่ต้องการ (ภาษาไทย — Markdown)
═══════════════════════════════════════════
ตอบเป็น Markdown ภาษาไทยตามโครงสร้างนี้ทุกครั้ง:

## สรุปเหตุการณ์
2-3 ประโยคที่บอกว่าเกิดอะไรขึ้น ที่ไหน เมื่อไหร่ ผลคืออะไร

## วิเคราะห์ Timeline (Critical Decision Points)
ระบุจุดที่เป็น "critical decision point" หรือ "defense breach" จาก timeline ที่ได้รับ พร้อมอธิบายว่าทำไมจุดนั้นจึงสำคัญ

## ปัจจัยสนับสนุน 5 ระดับ (5-Tier Contributory Factors)
ตอบเป็น 5 หัวข้อย่อย ระดับ 1 ถึง 5 ใต้แต่ละระดับใส่ bullet 2-4 จุด ทำเครื่องหมาย **(สำคัญ)** หลังจุดที่เป็น hot factor
- ระดับ 1: Patient Factors
- ระดับ 2: Task/Technology Factors
- ระดับ 3: Individual Factors
- ระดับ 4: Team Factors
- ระดับ 5: Environment/Organizational Factors

## Root Causes (สรุปสาเหตุรากที่แท้จริง)
สรุป 3-5 root causes ที่กลั่นออกมาจากปัจจัยข้างบน เรียงตามความสำคัญ

## ข้อเสนอมาตรการแก้ไข (Corrective Actions)
ข้อเสนอ 4-6 ข้อ จัดลำดับตามแบบ Hierarchy of Controls:
1. **Strong (System-level)** — เปลี่ยน technology/forcing function (ex: barcode scan, EHR alert, hardstop)
2. **Intermediate** — checklist, double-check, standard work
3. **Weak (Person-level)** — training, awareness, reminder
ระบุผู้รับผิดชอบที่เหมาะสม + ระยะเวลาที่ควรทำเสร็จ

## ประเมิน HRO 5 มิติ
ให้คะแนน 0-100% แต่ละมิติ พร้อมเหตุผลสั้นๆ 1 ประโยค

## ข้อเสนอเชิง Compassionate
- การดูแล Second Victim (บุคลากรที่เกี่ยวข้องในเหตุการณ์)
- ข้อเสนอเรื่อง disclosure ต่อผู้ป่วย/ญาติ
- ข้อเสนอเรื่องการเรียนรู้องค์กร (organizational learning) จาก case นี้

ข้อกำหนดสำคัญ:
- ตอบเป็นภาษาไทยทั้งหมด (ใช้คำศัพท์อังกฤษได้ถ้าจำเป็นทางเทคนิค)
- กระชับ ตรงประเด็น ไม่เยิ่นเย้อ ไม่ใส่คำขึ้นต้นว่า "ตามที่ท่านได้ให้ข้อมูลมา..."
- หลีกเลี่ยงการตำหนิบุคคล ใช้ภาษาที่เคารพต่อทุกฝ่าย (just culture)
- ถ้าข้อมูลไม่พอจะวิเคราะห์ ให้ระบุชัดว่าต้องการข้อมูลเพิ่มอะไรบ้าง
- อ้างกรอบ 5-Tier และ HRO ตรงๆ ในเนื้อหา ไม่ใช่แค่หัวข้อ`;

const DEMO_ANALYSIS = `## สรุปเหตุการณ์
[Demo mode — ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY] นี่คือผลตัวอย่างเพื่อแสดง layout ของฟีเจอร์ AI วิเคราะห์ RCA เมื่อเชื่อม Claude API จริง ระบบจะส่งข้อมูลเคสนี้ไปวิเคราะห์ตามกรอบ 5-Tier Contributory Factor + Compassionate RCA + HRO 5 มิติ

## วิเคราะห์ Timeline (Critical Decision Points)
- **10:19** — รับเลือดทั้ง 2 รายวางใกล้กัน เป็นจุด "system vulnerability" แรกที่เปิดโอกาสให้เกิดความสับสน
- **10:48** — ตรวจสอบ Blood number เท่านั้น โดยไม่ตรวจชื่อผู้ป่วยกับป้ายข้อมือ เป็น "defense breach" ที่สำคัญที่สุด

## ปัจจัยสนับสนุน 5 ระดับ
### ระดับ 1 — Patient Factors
- ผู้ป่วย 2 รายอยู่ใน MICU พร้อมกัน มี order รับเลือดในช่วงเวลาใกล้กัน

### ระดับ 2 — Task/Technology Factors
- ไม่มีระบบ barcode scan สำหรับเช็คเลือดกับ wristband **(สำคัญ)**
- SOP ไม่ระบุชัดเรื่องการแยกเก็บถุงเลือดของผู้ป่วยต่างราย **(สำคัญ)**

### ระดับ 3 — Individual Factors
- พยาบาลที่ดำเนินการเป็นพยาบาลต่างหน่วย ไม่คุ้นเคยกับ workflow ของ MICU **(สำคัญ)**
- ภาระงานสูง ตรวจสอบไม่ครบขั้นตอน

### ระดับ 4 — Team Factors
- ไม่มีการ double-check ก่อนให้เลือด **(สำคัญ)**
- การสื่อสารระหว่างเวรเกี่ยวกับการรับเลือด 2 ราย ไม่ชัดเจน

### ระดับ 5 — Environment/Organizational Factors
- นโยบายมอบหมายงานข้ามหน่วยใน high-risk activity ยังไม่มี **(สำคัญ)**
- ขาด forcing function ที่บังคับ double-check

## Root Causes
1. ขาด barcode/RFID verification ก่อนให้ผลิตภัณฑ์เลือด (system-level)
2. ไม่มีนโยบายชัดเรื่องการให้พยาบาลต่างหน่วยทำหัตถการความเสี่ยงสูง
3. กระบวนการเก็บถุงเลือดไม่แยกชัดระหว่างผู้ป่วย

## ข้อเสนอมาตรการแก้ไข
1. **Strong** — ติดตั้งระบบ barcode scan เลือด + wristband ทั้ง รพ. (IT/BME, 12 เดือน)
2. **Strong** — Hardstop ใน HIS ก่อน document ให้เลือด (IT, 6 เดือน)
3. **Intermediate** — บังคับ Double identification ทุกครั้ง (Nursing director, ทันที)
4. **Intermediate** — ปรับ SOP HP-COP-QSH-005 แยกที่เก็บถุงเลือดต่อราย (QPS, 3 เดือน)
5. **Weak** — Training ทุก ward เรื่อง IPSG-1 (Education, ต่อเนื่อง)

## ประเมิน HRO 5 มิติ
- Preoccupation with Failure: 70% — มีระบบรายงานดี
- Reluctance to Simplify: 35% — ยังมีแนวโน้มสรุปว่าเป็น human error
- Sensitivity to Operations: 25% — ผู้บริหารไม่เห็น workflow จริง **(จุดอ่อน)**
- Commitment to Resilience: 80% — แก้ไขเร็ว สื่อสารทัน
- Deference to Expertise: 20% — ขาดการฟังเสียงพยาบาลหน้างาน **(จุดอ่อน)**

## ข้อเสนอเชิง Compassionate
- **Second Victim** — พยาบาลที่ให้เลือดต้องได้รับ debrief และ psychological support โดยทีม HR + จิตเวช ภายใน 24 ชม.
- **Disclosure** — เปิดเผยกับผู้ป่วย/ญาติด้วยความจริงใจ ขอโทษ และอธิบายมาตรการป้องกัน
- **Organizational learning** — นำ case เข้า monthly M&M conference เป็น learning case ของ รพ.`;

let client: Anthropic | undefined;

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatRcaForAi(bundle: RcaBundle, actions: ActionItem[]): string {
  const { incident, case: rca, timeline, causes } = bundle;
  if (!incident) return 'ไม่พบข้อมูลอุบัติการณ์';

  const related = actions.filter(a => a.ir_code === incident.ir_code);

  const parts: string[] = [];
  parts.push(`# เคสที่ต้องวิเคราะห์: ${incident.ir_code}`);
  parts.push(`**เหตุการณ์:** ${incident.title}`);
  parts.push(`**วันเวลาที่เกิด:** ${fmtDate(incident.occurred_at)}`);
  parts.push(`**หน่วยงาน:** ${incident.unit_name ?? '—'}`);
  parts.push(`**ประเภท:** ${incident.category}`);
  parts.push(`**ระดับความรุนแรง:** ${incident.severity}`);
  parts.push(`**สถานะ RCA ปัจจุบัน:** ${incident.rca_status}`);
  parts.push(`**ผู้รายงาน:** ${incident.reported_by ?? '—'}`);
  if (incident.description) parts.push(`**รายละเอียด:** ${incident.description}`);

  if (timeline.length > 0) {
    parts.push('\n## Timeline ที่บันทึกไว้');
    for (const t of timeline) {
      const tag = t.severity_tag === 'bad' ? '⚠ ' : t.severity_tag === 'warn' ? '⚡ ' : '';
      const time = new Date(t.occurred_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
      parts.push(`- **${time}** ${tag}${t.event_title} — ${t.event_detail ?? ''}`);
    }
  }

  if (causes.length > 0) {
    parts.push('\n## ปัจจัยที่ทีมวิเคราะห์ไว้แล้ว (สำหรับอ้างอิง)');
    const grouped: Record<string, string[]> = { people: [], system: [], environment: [], management: [] };
    for (const c of causes) {
      grouped[c.category]?.push(`${c.label}${c.is_hot ? ' (สำคัญ)' : ''}`);
    }
    for (const [g, items] of Object.entries(grouped)) {
      if (items.length > 0) parts.push(`- **${g}:** ${items.join(', ')}`);
    }
  }

  if (rca) {
    parts.push('\n## คะแนน HRO ที่ทีมประเมินไว้');
    parts.push(`- Sensitivity to operations: ${rca.hro_sensitivity ?? '—'}%`);
    parts.push(`- Deference to expertise: ${rca.hro_deference ?? '—'}%`);
    parts.push(`- Reluctance to simplify: ${rca.hro_reluctance ?? '—'}%`);
    parts.push(`- Preoccupation with failure: ${rca.hro_preoccupation ?? '—'}%`);
    parts.push(`- Commitment to resilience: ${rca.hro_resilience ?? '—'}%`);
  }

  if (related.length > 0) {
    parts.push('\n## มาตรการแก้ไขที่ทีมวางไว้แล้ว (เพื่อให้คุณต่อยอด)');
    for (const a of related) {
      parts.push(`- [${a.status}] ${a.title} — ${a.owner ?? '—'} (กำหนด ${a.due_date ?? '—'})`);
    }
  }

  parts.push('\n---');
  parts.push('โปรดวิเคราะห์เคสนี้ตามกรอบ 5-Tier Contributory Factor + Compassionate RCA + HRO 5 มิติ ที่ระบุไว้ใน system prompt และตอบตามรูปแบบ Markdown ที่กำหนด');

  return parts.join('\n');
}

export interface AiAnalysisResult {
  analysis: string;
  demo: boolean;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}

export async function analyzeRca(bundle: RcaBundle, actions: ActionItem[]): Promise<AiAnalysisResult> {
  if (!aiConfigured()) {
    return { analysis: DEMO_ANALYSIS, demo: true };
  }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const userText = formatRcaForAi(bundle, actions);

  const msg = await getClient().messages.create({
    model,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: RCA_METHODOLOGY,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userText }],
  });

  const text = msg.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map(c => c.text)
    .join('\n');

  return {
    analysis: text,
    demo: false,
    model: msg.model,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
      cache_read_input_tokens: msg.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: msg.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
