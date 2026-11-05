import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { ActionItem, RcaBundle } from './types.js';

const FONT = 'TH Sarabun New';

const categoryLabel: Record<string, string> = {
  blood: 'การให้เลือด',
  medication: 'การให้ยา (High Alert)',
  fall: 'การพลัดตกหกล้ม',
  procedure: 'การผ่าตัด / หัตถการ',
  communication: 'การสื่อสาร / ส่งต่อ',
  other: 'อื่นๆ',
  traffic: 'ความเสี่ยงด้านทั่วไป / ด้านจราจร',
  environment: 'ความเสี่ยงด้านทั่วไป / ด้านสิ่งแวดล้อม',
  natural_disaster: 'ความเสี่ยงด้านทั่วไป / ภัยธรรมชาติ',
  corruption: 'ความเสี่ยงด้านทั่วไป / ทุจริตคอร์รัปชัน',
};

const causeGroupLabel: Record<string, string> = {
  people: 'บุคลากร (People)',
  system: 'ระบบงาน (System)',
  environment: 'สิ่งแวดล้อม (Environment)',
  management: 'การจัดการ (Management)',
};

const rcaStatusLabel: Record<string, string> = {
  done: 'วิเคราะห์เสร็จแล้ว',
  in_progress: 'กำลังวิเคราะห์',
  pending: 'รอดำเนินการ',
  not_required: 'ไม่ต้องทำ',
};

const actionStatusLabel: Record<string, string> = {
  done: 'เสร็จแล้ว',
  in_progress: 'กำลังดำเนินการ',
  planned: 'วางแผนแล้ว',
  overdue: 'เกินกำหนด',
};

const hroDimensions: { key: keyof NonNullable<RcaBundle['case']>; label: string }[] = [
  { key: 'hro_sensitivity', label: 'Sensitivity to Operations' },
  { key: 'hro_deference', label: 'Deference to Expertise' },
  { key: 'hro_reluctance', label: 'Reluctance to Simplify' },
  { key: 'hro_preoccupation', label: 'Preoccupation with Failure' },
  { key: 'hro_resilience', label: 'Commitment to Resilience' },
];

function run(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text, font: FONT, bold: opts.bold, size: opts.size ?? 28, color: opts.color });
}

function para(text: string, opts: { bold?: boolean; size?: number; color?: string; spacingAfter?: number } = {}) {
  return new Paragraph({
    children: [run(text, opts)],
    spacing: { after: opts.spacingAfter ?? 80 },
  });
}

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 32, color: '1F4E79' })],
  });
}

function cell(text: string, opts: { bold?: boolean; width?: number; color?: string } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [run(text, { bold: opts.bold, color: opts.color, size: 26 })] })],
  });
}

function infoRow(label: string, value: string) {
  return new TableRow({
    children: [
      cell(label, { bold: true, width: 28, color: '444444' }),
      cell(value, { width: 72 }),
    ],
  });
}

function tableOf(rows: TableRow[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E5E5E5' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E5E5E5' },
    },
  });
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso;
  }
}

export async function buildRcaDocx(bundle: RcaBundle, actions: ActionItem[]): Promise<Buffer> {
  const { incident, case: rca, timeline, causes } = bundle;
  const children: (Paragraph | Table)[] = [];

  // ── Title ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: 'รายงานการวิเคราะห์สาเหตุราก', font: FONT, bold: true, size: 40, color: '1F4E79' })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: 'Root Cause Analysis (RCA) Report', font: FONT, size: 26, color: '888888' })],
  }));

  if (!incident) {
    children.push(para('ไม่พบข้อมูลอุบัติการณ์'));
  } else {
    // ── Incident info ──
    children.push(heading('ข้อมูลอุบัติการณ์'));
    children.push(tableOf([
      infoRow('รหัสอุบัติการณ์', incident.ir_code),
      infoRow('เหตุการณ์', incident.title),
      infoRow('วันเวลาที่เกิด', fmtDate(incident.occurred_at)),
      infoRow('หน่วยงาน', incident.unit_name ?? '—'),
      infoRow('ประเภท', categoryLabel[incident.category] ?? incident.category),
      infoRow('ระดับความรุนแรง', `ระดับ ${incident.severity}`),
      infoRow('สถานะ RCA', rcaStatusLabel[incident.rca_status] ?? incident.rca_status),
      infoRow('ผู้รายงาน', incident.reported_by ?? '—'),
      infoRow('รายละเอียด', incident.description ?? '—'),
    ]));

    // ── Timeline ──
    if (timeline.length > 0) {
      children.push(heading('ลำดับเหตุการณ์ (Timeline)'));
      const tlRows = [
        new TableRow({
          tableHeader: true,
          children: [
            cell('เวลา', { bold: true, width: 14, color: 'FFFFFF' }),
            cell('เหตุการณ์', { bold: true, width: 36, color: 'FFFFFF' }),
            cell('รายละเอียด', { bold: true, width: 50, color: 'FFFFFF' }),
          ],
        }),
        ...timeline.map(t => new TableRow({
          children: [
            cell(fmtTime(t.occurred_at), { width: 14 }),
            cell(t.event_title, { width: 36, bold: t.severity_tag === 'bad' }),
            cell(t.event_detail ?? '—', { width: 50 }),
          ],
        })),
      ];
      children.push(tableOf(tlRows));
    }

    // ── Contributory factors ──
    if (causes.length > 0) {
      children.push(heading('ปัจจัยสนับสนุน (Contributory Factors)'));
      for (const group of ['people', 'system', 'environment', 'management'] as const) {
        const items = causes.filter(c => c.category === group);
        if (items.length === 0) continue;
        children.push(para(causeGroupLabel[group], { bold: true, size: 28, spacingAfter: 40 }));
        for (const c of items) {
          children.push(new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 30 },
            children: [run(c.label + (c.is_hot ? '  ⚠ (ปัจจัยสำคัญ)' : ''), { color: c.is_hot ? 'C0392B' : undefined, size: 26 })],
          }));
        }
      }
    }

    // ── HRO ──
    if (rca) {
      children.push(heading('การประเมิน HRO 5 มิติ'));
      const hroRows = [
        new TableRow({
          tableHeader: true,
          children: [cell('มิติ', { bold: true, width: 70 }), cell('คะแนน', { bold: true, width: 30 })],
        }),
        ...hroDimensions.map(d => {
          const v = (rca[d.key] as number | null) ?? 0;
          return new TableRow({ children: [cell(d.label, { width: 70 }), cell(`${v}%`, { width: 30 })] });
        }),
      ];
      children.push(tableOf(hroRows));
    }

    // ── Actions ──
    const related = actions.filter(a => a.ir_code === incident.ir_code);
    if (related.length > 0) {
      children.push(heading('มาตรการแก้ไข (Corrective Actions)'));
      const aRows = [
        new TableRow({
          tableHeader: true,
          children: [
            cell('มาตรการ', { bold: true, width: 34 }),
            cell('ผู้รับผิดชอบ', { bold: true, width: 24 }),
            cell('กำหนดเสร็จ', { bold: true, width: 16 }),
            cell('สถานะ', { bold: true, width: 16 }),
            cell('%', { bold: true, width: 10 }),
          ],
        }),
        ...related.map(a => new TableRow({
          children: [
            cell(a.title, { width: 34 }),
            cell(a.owner ?? '—', { width: 24 }),
            cell(a.due_date ?? '—', { width: 16 }),
            cell(actionStatusLabel[a.status] ?? a.status, { width: 16 }),
            cell(`${a.progress}%`, { width: 10 }),
          ],
        })),
      ];
      children.push(tableOf(aRows));
    }
  }

  // ── Footer note ──
  children.push(new Paragraph({
    spacing: { before: 360 },
    children: [new TextRun({
      text: `ออกรายงานจากระบบบริหารความเสี่ยง — ${fmtDate(new Date().toISOString())}`,
      font: FONT, size: 22, color: 'AAAAAA', italics: true,
    })],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 28 } } } },
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
