import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import {
  CMP_COLUMNS,
  COLONOGY_CLINICAL,
  COLONOGY_GENERAL,
  FORM_CODE,
  FORM_TITLE,
  PROCESS_NOTES,
  TIER_ROWS,
  W5H1_ROWS,
  riskTypeLabel,
  type CmpRow,
  type RcaFormData,
} from './rcaForm';

const FONT = 'TH Sarabun New';
const HINT_COLOR = 'C00000'; // ตัวอักษรสีแดง (คำถามนำ) เหมือนแบบฟอร์มกระดาษ
const HEAD_FILL = 'D9E2F3';
const GROUP_FILL = 'EDEDED';

/** ความกว้างของเนื้อหาในหน้ากระดาษแนวนอน (twips) */
const LAND_W = 15420;

const PORTRAIT_PAGE = {
  size: { width: 11920, height: 16840, orientation: PageOrientation.PORTRAIT },
  margin: { top: 851, right: 567, bottom: 709, left: 851, header: 720, footer: 270 },
};

// docx สลับ width/height ให้เองเมื่อ orientation เป็น landscape จึงส่งขนาดแนวตั้งเข้าไป
const LANDSCAPE_PAGE = {
  size: { width: 11920, height: 16840, orientation: PageOrientation.LANDSCAPE },
  margin: { top: 851, right: 567, bottom: 567, left: 709, header: 720, footer: 270 },
};

interface RunOpts {
  bold?: boolean;
  size?: number;
  color?: string;
  italics?: boolean;
}

function run(text: string, o: RunOpts = {}) {
  const size = o.size ?? 28;
  return new TextRun({
    text,
    font: { ascii: FONT, hAnsi: FONT, cs: FONT, eastAsia: FONT },
    bold: o.bold,
    boldComplexScript: o.bold,
    italics: o.italics,
    italicsComplexScript: o.italics,
    size,
    sizeComplexScript: size,
    color: o.color,
  });
}

function para(text: string, o: RunOpts & { after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; indent?: number } = {}) {
  return new Paragraph({
    alignment: o.align,
    spacing: { after: o.after ?? 60, before: o.before },
    indent: o.indent ? { left: o.indent } : undefined,
    children: [run(text, o)],
  });
}

/** ข้อความหลายบรรทัด -> หลาย Paragraph (ไว้ใช้ในเซลล์ตาราง) */
function lines(text: string, o: RunOpts = {}): Paragraph[] {
  const parts = (text ?? '').split('\n');
  const out = parts
    .map(l => l.trim())
    .filter((l, i, arr) => l !== '' || arr.length === 1)
    .map(l => new Paragraph({ spacing: { after: 20 }, children: [run(l, o)] }));
  return out.length > 0 ? out : [new Paragraph({ children: [run('', o)] })];
}

/** หัวข้อหลักของแบบฟอร์ม เช่น "1. Story and Timeline" */
function sectionHeading(text: string, o: { before?: number } = {}) {
  return new Paragraph({
    spacing: { before: o.before ?? 240, after: 100 },
    children: [run(text, { bold: true, size: 30 })],
  });
}

function cell(
  content: string | Paragraph[],
  o: {
    width?: number;
    bold?: boolean;
    size?: number;
    color?: string;
    fill?: string;
    colSpan?: number;
    rowSpan?: number;
    vAlign?: 'top' | 'center' | 'bottom';
  } = {},
) {
  return new TableCell({
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    columnSpan: o.colSpan,
    rowSpan: o.rowSpan,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: o.vAlign ?? VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children:
      typeof content === 'string'
        ? lines(content, { bold: o.bold, size: o.size ?? 26, color: o.color })
        : content,
  });
}

/** เซลล์แบบจัดกลาง — สร้าง Paragraph เองเพื่อเลี่ยงการ clone */
function centerCell(text: string, o: { width?: number; bold?: boolean; size?: number; fill?: string; colSpan?: number } = {}) {
  const size = o.size ?? 26;
  return new TableCell({
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    columnSpan: o.colSpan,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: text.split('\n').map(
      l =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [run(l, { bold: o.bold, size })],
        }),
    ),
  });
}

function table(columnWidths: number[], rows: TableRow[]) {
  return new Table({
    columnWidths,
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    },
    rows,
  });
}

function footerFor(rightEdge: number) {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: rightEdge }],
        children: [
          run(FORM_CODE, { size: 16, color: '666666' }),
          new TextRun({ children: ['\t'] }),
          run('หน้า ', { size: 16, color: '666666' }),
          new TextRun({
            children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
            font: { ascii: FONT, hAnsi: FONT, cs: FONT },
            size: 16,
            sizeComplexScript: 16,
            color: '666666',
          }),
        ],
      }),
    ],
  });
}

/** "ป้ายชื่อ : ค่า" ในบรรทัดเดียว — ค่าจะถูกขีดเส้นใต้แบบจุดเหมือนแบบฟอร์ม */
function labelValue(label: string, value: string, o: { size?: number; bold?: boolean } = {}) {
  const size = o.size ?? 26;
  return new Paragraph({
    spacing: { after: 20 },
    children: [
      run(label, { size, bold: o.bold ?? true }),
      run(value ? `  ${value}` : '  ..............................', { size }),
    ],
  });
}

const hasContent = (r: CmpRow) =>
  [r.standard, r.unsafeAct, r.constraint, r.period, r.system].some(v => (v ?? '').trim() !== '');

const filled = (v: string | undefined) => (v ?? '').trim() !== '';

export async function buildRcaFormDocx(form: RcaFormData): Promise<Buffer> {
  // ============ หน้าที่ 1 (แนวตั้ง) ============
  const portrait: (Paragraph | Table)[] = [];

  portrait.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [run(FORM_TITLE, { bold: true, size: 36 })],
    }),
  );

  // ตารางหัวแบบฟอร์ม (3 คอลัมน์ ตามต้นฉบับ)
  portrait.push(
    table([3119, 3402, 3685], [
      new TableRow({
        children: [
          cell([labelValue('เรื่อง', form.subject)], { colSpan: 2 }),
          cell([labelValue('RM No.', form.rmNo ? `${form.rmNo} / ${form.rmYear}` : `.................... / ${form.rmYear}`)]),
        ],
      }),
      new TableRow({
        children: [
          cell([labelValue('วันที่ทบทวน', form.reviewDate)]),
          cell([labelValue('วันที่เกิดเหตุการณ์', form.eventDate)]),
          cell([labelValue('ประเภทความเสี่ยง :', form.riskType ? riskTypeLabel[form.riskType] : '(คลินิก / ทั่วไป)')]),
        ],
      }),
      new TableRow({
        children: [
          cell([labelValue('หน่วยงาน/ทีม', form.unit)], { colSpan: 2 }),
          cell([labelValue('ระดับความรุนแรง ( A-I / 1-5 )', form.severity)]),
        ],
      }),
    ]),
  );

  portrait.push(para('สมาชิกผู้ร่วมทบทวน', { bold: true, before: 200, after: 40 }));
  for (const p of lines(form.members || '—', { size: 28 })) portrait.push(p);

  portrait.push(sectionHeading('ขั้นตอนการวิเคราะห์'));

  portrait.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        run('1. Story and Timeline : ', { bold: true, size: 30 }),
        run('(บรรยายเหตุการณ์ที่สำคัญสั้น ๆ บุคคลที่เกี่ยวข้องโดยไม่ระบุชื่อ)', { size: 26 }),
      ],
    }),
  );
  for (const p of lines(form.story || '—', { size: 28 })) portrait.push(p);

  portrait.push(para('adverse event / problem statement', { bold: true, before: 160, after: 40 }));
  portrait.push(labelValue('1 อุบัติการณ์เกิดกับใคร', form.psWho, { size: 28 }));
  portrait.push(labelValue('2 เหตุการณ์ที่เกิดขึ้นคืออะไร', form.psWhat, { size: 28 }));
  portrait.push(labelValue('3 ผลกระทบ/ความรุนแรงที่เกิดขึ้น', form.psImpact, { size: 28 }));

  portrait.push(
    para('COLONOGY OF EVENT ( WORK FLOW) กระบวนการทำงานที่เกี่ยวข้องกับเหตุการณ์', {
      bold: true,
      before: 200,
      after: 60,
    }),
  );
  portrait.push(para('ด้านกระบวนการดูแลผู้ป่วย (สำหรับความเสี่ยงด้านคลินิก)', { bold: true, size: 26, after: 40 }));
  COLONOGY_CLINICAL.forEach((label, i) => {
    portrait.push(labelValue(`${i + 1} ${label}`, form.colonogyClinical[i] ?? '', { size: 26, bold: false }));
  });
  portrait.push(para('ด้านทั่วไป (สำหรับความเสี่ยงทั่วไป)', { bold: true, size: 26, before: 120, after: 40 }));
  COLONOGY_GENERAL.forEach((label, i) => {
    portrait.push(labelValue(`${i + 1} ${label}`, form.colonogyGeneral[i] ?? '', { size: 26, bold: false }));
  });

  // ============ หน้าถัดไป (แนวนอน) ============
  const landscape: (Paragraph | Table)[] = [];

  // ---- ลำดับเหตุการณ์ ----
  landscape.push(para('ลำดับเหตุการณ์', { bold: true, size: 30, after: 100 }));
  const tlRows = form.timeline.filter(t => filled(t.day) || filled(t.time) || filled(t.event));
  const tlBody = tlRows.length > 0 ? tlRows : [{ day: '', time: '', event: '' }];
  landscape.push(
    table([1560, 1300, 12560], [
      new TableRow({
        tableHeader: true,
        children: [
          centerCell('Day', { width: 1560, bold: true, fill: HEAD_FILL }),
          centerCell('Time', { width: 1300, bold: true, fill: HEAD_FILL }),
          centerCell('Event', { width: 12560, bold: true, fill: HEAD_FILL }),
        ],
      }),
      ...tlBody.map(
        t =>
          new TableRow({
            children: [
              centerCell(t.day, { width: 1560 }),
              centerCell(t.time, { width: 1300 }),
              cell(t.event, { width: 12560 }),
            ],
          }),
      ),
    ]),
  );

  // ---- 2. CARE MANAGEMENT PROBLEM ----
  landscape.push(
    sectionHeading(
      '2. ค้นหาสาเหตุของปัญหา หาจุดเปลี่ยน Potential change & Unsafe act (ระบุเฉพาะกระบวนการ/ขั้นตอนที่เกิดความคลาดเคลื่อนจาก COLONOGY OF EVENT)',
    ),
  );
  landscape.push(para('CARE MANAGEMENT PROBLEM (ใส่เฉพาะกระบวนการที่เป็นปัญหา)', { bold: true, size: 26, after: 80 }));

  const cmpWidths = [2551, 2551, 2551, 2945, 2268, 2551];
  const anyCmp = [...form.cmpClinical, ...form.cmpGeneral].some(hasContent);
  const cmpRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: CMP_COLUMNS.map((c, i) => centerCell(c, { width: cmpWidths[i], bold: true, fill: HEAD_FILL, size: 24 })),
    }),
  ];

  const pushCmpGroup = (title: string, rows: CmpRow[]) => {
    const use = anyCmp ? rows.filter(hasContent) : rows;
    if (use.length === 0) return;
    cmpRows.push(
      new TableRow({
        children: [cell(title, { colSpan: 6, bold: true, fill: GROUP_FILL, size: 26 })],
      }),
    );
    for (const r of use) {
      cmpRows.push(
        new TableRow({
          children: [
            cell(r.area, { width: cmpWidths[0], bold: true }),
            cell(r.standard, { width: cmpWidths[1] }),
            cell(r.unsafeAct, { width: cmpWidths[2] }),
            cell(r.constraint, { width: cmpWidths[3] }),
            cell(r.period, { width: cmpWidths[4] }),
            cell(r.system, { width: cmpWidths[5] }),
          ],
        }),
      );
    }
  };
  pushCmpGroup('ด้านกระบวนการดูแลผู้ป่วย (สำหรับความเสี่ยงด้านคลินิก)', form.cmpClinical);
  pushCmpGroup('ด้านทั่วไป (สำหรับความเสี่ยงทั่วไป)', form.cmpGeneral);
  landscape.push(table(cmpWidths, cmpRows));

  // ---- 3. 5W1H ----
  landscape.push(sectionHeading('3. สรุปปัจจัยเกื้อหนุนทำให้เกิดความเสี่ยง Proactive fact finding — Listen to voice of staff'));
  landscape.push(
    table([3823, 11597], [
      new TableRow({
        tableHeader: true,
        children: [
          centerCell('คำถามกระบวนการที่เกี่ยวข้อง', { width: 3823, bold: true, fill: HEAD_FILL }),
          centerCell('ข้อมูลที่ต้องการ', { width: 11597, bold: true, fill: HEAD_FILL }),
        ],
      }),
      ...W5H1_ROWS.map((r, i) => {
        const answer = form.w5h1[r.key];
        return new TableRow({
          children: [
            cell(`${i + 1} ${r.label}`, { width: 3823, bold: true, vAlign: VerticalAlign.CENTER }),
            filled(answer)
              ? cell(answer, { width: 11597 })
              : cell(r.hint, { width: 11597, color: HINT_COLOR }),
          ],
        });
      }),
    ]),
  );
  landscape.push(
    para('หมายเหตุ เมื่อบันทึกแบบฟอร์มสามารถลบตัวอักษรสีแดง (ตัวอย่างคำถามที่ใช้ประเมินปัจจัยที่เกี่ยวข้อง)', {
      size: 24,
      color: '666666',
      after: 40,
    }),
  );

  // ---- 4. 5 Tier Contributory Factor ----
  landscape.push(
    sectionHeading(
      '4. การวิเคราะห์ปัจจัย Workplace Factor / Organization Factor และหาสาเหตุเชิงระบบ — 5 Tier Contributory Factor for Incident Analysis',
    ),
  );
  landscape.push(
    table([3000, 12420],
      TIER_ROWS.map(t => {
        const value = form.tiers[t.key];
        return new TableRow({
          children: [
            centerCell(t.label, { width: 3000, bold: true, fill: GROUP_FILL, size: 24 }),
            filled(value) ? cell(value, { width: 12420 }) : cell(t.hint, { width: 12420, color: HINT_COLOR, size: 24 }),
          ],
        });
      }),
    ),
  );

  // ---- 5. สรุป RCA ----
  landscape.push(sectionHeading('5. สรุป RCA แนวทางการป้องกัน/แก้ปัญหา (Creative solution)'));
  const solWidths = [3685, 6207, 2268, 3260];
  const solRows = form.solutions.filter(s => [s.rootCause, s.prevention, s.owner, s.timeframe].some(filled));
  landscape.push(
    table(solWidths, [
      new TableRow({
        tableHeader: true,
        children: [
          centerCell('สาเหตุที่แท้จริง\n(Root cause)', { width: solWidths[0], bold: true, fill: HEAD_FILL }),
          centerCell('มาตรการการป้องกัน', { width: solWidths[1], bold: true, fill: HEAD_FILL }),
          centerCell('ผู้รับผิดชอบ', { width: solWidths[2], bold: true, fill: HEAD_FILL }),
          centerCell('ระยะเวลาดำเนินการ', { width: solWidths[3], bold: true, fill: HEAD_FILL }),
        ],
      }),
      ...(solRows.length > 0 ? solRows : [{ rootCause: '', prevention: '', owner: '', timeframe: '' }]).map(
        s =>
          new TableRow({
            children: [
              cell(s.rootCause, { width: solWidths[0] }),
              cell(s.prevention, { width: solWidths[1] }),
              cell(s.owner, { width: solWidths[2] }),
              cell(s.timeframe, { width: solWidths[3] }),
            ],
          }),
      ),
    ]),
  );

  // ---- 6. Process Management ----
  landscape.push(sectionHeading('6. การจัดการกระบวนการ (Process Management) สำหรับการแก้ไข Tier 4 ขึ้นไป'));
  const prWidths = [2977, 3969, 3260, 5214];
  const prRows = form.processes.filter(p => [p.process, p.requirement, p.indicators, p.design].some(filled));
  landscape.push(
    table(prWidths, [
      new TableRow({
        tableHeader: true,
        children: [
          centerCell('กระบวนการ', { width: prWidths[0], bold: true, fill: HEAD_FILL }),
          centerCell('ข้อกำหนดของกระบวนการ\n(process requirement)', { width: prWidths[1], bold: true, fill: HEAD_FILL }),
          centerCell('ตัวชี้วัดของกระบวนการ\n(process indicators)', { width: prWidths[2], bold: true, fill: HEAD_FILL }),
          centerCell('การออกแบบกระบวนการ (process design)', { width: prWidths[3], bold: true, fill: HEAD_FILL }),
        ],
      }),
      ...(prRows.length > 0 ? prRows : [{ process: '', requirement: '', indicators: '', design: '' }]).map(
        p =>
          new TableRow({
            children: [
              cell(p.process, { width: prWidths[0] }),
              cell(p.requirement, { width: prWidths[1] }),
              cell(p.indicators, { width: prWidths[2] }),
              cell(p.design, { width: prWidths[3] }),
            ],
          }),
      ),
    ]),
  );

  landscape.push(para('หมายเหตุ', { bold: true, before: 200, after: 40, size: 26 }));
  for (const note of PROCESS_NOTES) {
    landscape.push(para(note, { size: 24, color: '444444', after: 40 }));
  }

  const doc = new Document({
    title: FORM_TITLE,
    description: FORM_CODE,
    styles: {
      default: {
        document: {
          run: { font: { ascii: FONT, hAnsi: FONT, cs: FONT }, size: 28 },
          paragraph: { spacing: { after: 60, line: 264 } },
        },
      },
    },
    sections: [
      {
        properties: { page: PORTRAIT_PAGE },
        footers: { default: footerFor(10502) },
        children: portrait,
      },
      {
        properties: { page: LANDSCAPE_PAGE },
        footers: { default: footerFor(LAND_W) },
        children: landscape,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
