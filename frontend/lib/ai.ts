import type { ActionItem, RcaBundle } from './types';

const RCA_METHODOLOGY = `คุณคือผู้เชี่ยวชาญด้านการบริหารความเสี่ยงและคุณภาพในโรงพยาบาล ช่วยทีม Patient Safety จัดทำ “ร่างผลการวิเคราะห์ RCA” จากข้อมูลเหตุการณ์ที่ได้รับ

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
รูปแบบผลลัพธ์ที่ต้องการ — ต้องตรงกับ RCA_Report (3).doc
═══════════════════════════════════════════
ตอบเป็น Markdown ภาษาไทย โดยใช้หัวข้อและลำดับต่อไปนี้เท่านั้น:

## 1. Story and Timeline
- **เรื่อง:** ระบุชื่อเหตุการณ์แบบกระชับ
- **Story:** เล่าเหตุการณ์ตามข้อเท็จจริงที่ได้รับโดยไม่ระบุชื่อบุคคล
- **ลำดับเหตุการณ์:** เรียงเป็นรายการ วัน | เวลา | เหตุการณ์ และใช้ “ไม่ระบุเวลา” เมื่อไม่มีเวลา

## 2. ค้นหาสาเหตุของปัญหา Potential change
ระบุเฉพาะจุดเปลี่ยนหรือกระบวนการที่มีหลักฐานสนับสนุน แต่ละรายการต้องมี:
- **ขั้นตอน/กระบวนการ**
- **ปัญหาหรือช่องโหว่**
- **มาตรฐาน/แนวปฏิบัติที่ต้องตรวจสอบ**
- **สิ่งที่ปฏิบัติจริง (Unsafe act) หรือ “ยังไม่ยืนยัน”**
- **ข้อจำกัดของผู้ปฏิบัติงาน (ถ้ามีข้อมูล)**
- **ช่วงเวลา/ระบบงานที่เกี่ยวข้อง**

## 3. สรุปปัจจัยเกื้อหนุนทำให้เกิดความเสี่ยง
สรุปตามหมวดของเอกสาร: ผู้ป่วย, เจ้าหน้าที่, กระบวนการ, การสื่อสาร, สิ่งแวดล้อมและเครื่องมือ, และทีมนำและองค์กร โดยแยกแต่ละข้อเป็น
- **Local workplace factors:** ข้อเท็จจริงหรือปัจจัยหน้างาน
- **Organizational factors:** ประเด็นระดับระบบที่ควรตรวจสอบ

## 4. สรุป RCA แนวทางการป้องกัน/แก้ปัญหา
สรุปเป็นรายการ โดยทุกข้อมี **สาเหตุที่แท้จริง (Root cause)**, **มาตรการการป้องกัน**, **ผู้รับผิดชอบที่เสนอ**, และ **ระยะเวลาดำเนินการที่เสนอ**

## 5. การจัดการกระบวนการ (Process Management)
ระบุเฉพาะกระบวนการสำคัญ และทุกข้อมี **ข้อกำหนดของกระบวนการ**, **ตัวชี้วัดของกระบวนการ**, และ **การออกแบบกระบวนการ**

ข้อกำหนดด้านความถูกต้อง:
- ใช้ข้อมูลที่ให้มาเป็นข้อเท็จจริงเท่านั้น ห้ามสร้างวันที่ เวลา คำสั่งรักษา ผลตรวจ นโยบายโรงพยาบาล การประเมินความเสี่ยง หรือการกระทำของบุคลากรที่ไม่ได้ระบุ
- แยกคำว่า **ข้อเท็จจริง**, **ประเด็นที่ต้องทบทวน**, และ **ข้อเสนอ** ให้ชัดเจน โดยใช้ “ต้องตรวจสอบจากเวชระเบียน/การสัมภาษณ์” สำหรับข้อมูลที่ยังไม่ยืนยัน
- หากระบุ pulmonary embolism หรือสาเหตุทางการแพทย์ที่ยังไม่ยืนยัน ให้ใช้คำว่า “สงสัย” เสมอ
- ใช้ Just Culture: ไม่ตำหนิบุคคล และไม่สรุปว่าเป็น unsafe act หรือ root cause จนกว่าจะมีหลักฐาน
- ตอบเป็นภาษาไทย กระชับ และไม่เพิ่มหัวข้อ 5-Tier, HRO หรือ Compassionate เป็นหัวข้อแยก`;

const DEMO_ANALYSIS = `## 1. Story and Timeline
**สถานะ:** Demo mode — ยังไม่ได้ตั้งค่า GEMINI_API_KEY จึงยังไม่สามารถสร้างร่างวิเคราะห์จากข้อมูลเคสจริงได้

## 2. ค้นหาสาเหตุของปัญหา Potential change
- **ประเด็นที่ต้องทบทวน:** โปรดตั้งค่า Gemini API แล้วกดวิเคราะห์อีกครั้ง ระบบจะจัดผลตามแม่แบบ RCA_Report (3).doc

## 3. สรุปปัจจัยเกื้อหนุนทำให้เกิดความเสี่ยง
- **Local workplace factors:** รอข้อมูลจากเหตุการณ์จริง
- **Organizational factors:** รอการทบทวนโดยทีม RCA

## 4. สรุป RCA แนวทางการป้องกัน/แก้ปัญหา
- **ข้อเสนอ:** รอผลการวิเคราะห์จากข้อมูลเหตุการณ์จริง

## 5. การจัดการกระบวนการ (Process Management)
- **กระบวนการ:** รอผลการวิเคราะห์จากข้อมูลเหตุการณ์จริง`;

export function aiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
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
  parts.push('โปรดจัดทำร่างผล RCA ตามหัวข้อ 1-5 ของ RCA_Report (3).doc ใน system prompt โดยแยกข้อเท็จจริง ประเด็นที่ต้องทบทวน และข้อเสนอให้ชัดเจน');

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

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  error?: { message?: string };
}

async function geminiError(response: Response): Promise<Error> {
  let message = `Gemini API ตอบกลับด้วยสถานะ ${response.status}`;
  try {
    const body = await response.json() as GeminiGenerateContentResponse;
    if (body.error?.message) message = `Gemini API: ${body.error.message}`;
  } catch {
    // Keep the status-only message when the response is not JSON.
  }
  return new Error(message);
}

export async function analyzeRca(bundle: RcaBundle, actions: ActionItem[]): Promise<AiAnalysisResult> {
  if (!aiConfigured()) {
    return { analysis: DEMO_ANALYSIS, demo: true };
  }

  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = (process.env.GEMINI_MODEL ?? 'gemini-3.6-flash').trim().replace(/^models\//, '');
  const userText = formatRcaForAi(bundle, actions);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RCA_METHODOLOGY }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!response.ok) throw await geminiError(response);

  const msg = await response.json() as GeminiGenerateContentResponse;
  const text = (msg.candidates ?? [])
    .flatMap(candidate => candidate.content?.parts ?? [])
    .map(part => part.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini API ไม่ได้ส่งข้อความวิเคราะห์กลับมา');
  }

  const usage = msg.usageMetadata;

  return {
    analysis: text,
    demo: false,
    model: msg.modelVersion ?? model,
    usage: {
      input_tokens: usage?.promptTokenCount ?? 0,
      output_tokens: usage?.candidatesTokenCount ?? 0,
      cache_read_input_tokens: usage?.cachedContentTokenCount ?? 0,
      cache_creation_input_tokens: 0,
    },
  };
}
