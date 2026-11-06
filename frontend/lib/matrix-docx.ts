import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageOrientation, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from 'docx';
import type { MatrixOptions, MatrixResult } from './matrix-analysis';
import type { MatrixExportNote, MatrixTreatment } from './matrix-treatment';
import { thaiDateTime } from './thai-date-time';

const font = 'Tahoma';
const fills = { green: 'BCEAD0', yellow: 'FFF0A6', orange: 'FFC18C', red: 'FF9EAB' };
const width = 15360;
function paragraph(text: string, bold = false, centered = false, size = 22) {
  return new Paragraph({ alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 0, after: 80 }, children: [new TextRun({ text, bold, size, font, color: '000000' })] });
}
function cell(text: string, size: number, header = false, span = 1, fill?: string, centered = false) {
  return new TableCell({ width: { size, type: WidthType.DXA }, columnSpan: span, shading: header || fill ? { fill: fill || 'D9D9D9' } : undefined, margins: { top: 90, bottom: 90, left: 90, right: 90 }, children: text.split('\n').map(line => paragraph(line, header, header || centered, header ? 14 : 20)) });
}
const borders = Object.fromEntries(['top','bottom','left','right','insideHorizontal','insideVertical'].map(edge => [edge, { style: BorderStyle.SINGLE, size: 4, color: '606060' }]));
function table(widths: number[], rows: TableRow[]) {
  return new Table({ width: { size: width, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders, rows });
}
export async function buildMatrixDocx(rows: MatrixResult[], treatments: MatrixTreatment[], options: MatrixOptions, unitName: string, notes: MatrixExportNote[] = []) {
  const severityLabels = options.type === 'clinical' ? ['A','B','C','D','E','F','G','H','I'] : ['1','2','3','4','5'];
  const severityWidth = options.type === 'clinical' ? 300 : 540;
  const widths = [2600, 650, ...severityLabels.map(() => severityWidth), 300, 300, 300, 300, 700, 700, 700, 4510, 1600];
  const sum = (from: number, count: number) => widths.slice(from, from + count).reduce((total, value) => total + value, 0);
  const colorStart = 2 + severityLabels.length;
  const responseStart = colorStart + 4;
  const colors = ['green','yellow','orange','red'] as const;
  const summary = table(widths, [
    new TableRow({ tableHeader: true, cantSplit: true, children: [
      cell('การระบุความเสี่ยง (Risk Identification)',sum(0,colorStart),true,colorStart),
      cell('การวิเคราะห์ความเสี่ยง (Risk Analysis)',sum(colorStart,4),true,4),
      cell('การจัดการความเสี่ยง (Risk Treatment)',sum(responseStart,4),true,4),
      cell('Risk Monitoring & Review',widths.at(-1)!,true),
    ] }),
    new TableRow({ tableHeader: true, cantSplit: true, children: [
      cell('ประเภทความเสี่ยง',widths[0],true),cell('ความถี่',widths[1],true),
      cell('ความรุนแรง (Impact)',sum(2,severityLabels.length),true,severityLabels.length),
      cell('ระดับความเสี่ยง',sum(colorStart,4),true,4),
      cell('การตอบสนองความเสี่ยง',sum(responseStart,3),true,3),
      cell('มาตรการป้องกัน/การแก้ไข',widths[responseStart+3],true),
      cell('ความถี่ในการทบทวน (Review Frequency)',widths.at(-1)!,true),
    ] }),
    new TableRow({ tableHeader: true, cantSplit: true, children: [
      cell('',widths[0],true),cell('',widths[1],true),
      ...severityLabels.map((label,index)=>cell(label,widths[2+index],true)),
      ...colors.map((color,index)=>cell('',widths[colorStart+index],false,1,fills[color],true)),
      ...['Transfer &\nPrevention','Monitor &\nControl','Mitigation'].map((label,index)=>cell(label,widths[responseStart+index],true)),
      cell('',widths[responseStart+3],true),cell('',widths.at(-1)!,true),
    ] }),
    ...rows.map(row => {
      const item = treatments.find(item => item.id === row.id)!;
      const severity = row.severity.replace(/\s/g, '').toUpperCase();
      const selectedSeverity = severityLabels.indexOf(severity);
      const severityText = selectedSeverity < 0 ? severity : '';
      const measure = `${item.confirmedCurrent ? '' : '[ร่าง] '}${item.measures || 'ยังไม่ระบุมาตรการ'}`;
      return new TableRow({ children: [
        cell(row.title + (row.subtopic ? '\n'+row.subtopic : ''),widths[0]),cell(String(row.frequency),widths[1],false,1,undefined,true),
        ...severityLabels.map((label,index)=>cell(index===selectedSeverity?'✓':index===0?severityText:'',widths[2+index],false,1,undefined,true)),
        ...colors.map((color,index)=>cell(row.color===color?'✓':'',widths[colorStart+index],false,1,fills[color],true)),
        ...[item.transferPrevention,item.monitorControl,item.mitigation].map((selected,index)=>cell(selected?'✓':'',widths[responseStart+index],false,1,undefined,true)),
        cell(measure,widths[responseStart+3]),cell(item.reviewFrequency||'ยังไม่ระบุ',widths.at(-1)!),
      ] });
    }),
  ]);
  const basis = options.basis === 'quarter' ? 'จำนวนครั้งในไตรมาส (แปลงเป็นอัตราต่อปีก่อนจัดระดับโอกาสเกิด)' : options.basis === 'year' ? 'จำนวนครั้งต่อปี' : 'ระดับโอกาสเกิด 1–5';
  const doc = new Document({ creator: 'Hospital Risk Management', title: 'รายงานการประเมินและจัดการความเสี่ยง', styles: { default: { document: { run: { font, size: 28 }, paragraph: { spacing: { after: 80 } } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 650, bottom: 650, left: 739, right: 739 } } }, children: [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'รายงานการประเมินและจัดการความเสี่ยง', font, size: 40, bold: true, color: '000000' })] }),
    paragraph(`หน่วยงาน: ${unitName || 'ยังไม่ระบุ'}    ปีงบประมาณ ${options.year}    ไตรมาส ${options.quarter}    ด้าน${options.type === 'clinical' ? 'คลินิก' : 'ทั่วไป'}`),
    paragraph(`วันที่ส่งออก ${thaiDateTime().occurred_at}    เกณฑ์ความถี่: ${basis}`),
    paragraph('คะแนน = ผลกระทบ × ระดับโอกาสเกิด สีประเมินตามตารางโรงพยาบาล ไม่ได้แบ่งจากช่วงคะแนน'),
    summary,
    paragraph('ข้อเสนอจาก AI เป็นร่าง โปรดทบทวนและยืนยันมาตรการก่อนนำไปใช้'),
  ] }] });
  return Packer.toBuffer(doc);
}
