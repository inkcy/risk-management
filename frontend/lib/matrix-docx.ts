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
  return new TableCell({ width: { size, type: WidthType.DXA }, columnSpan: span, shading: header || fill ? { fill: fill || 'D9D9D9' } : undefined, margins: { top: 90, bottom: 90, left: 90, right: 90 }, children: text.split('\n').map(line => paragraph(line, header, header || centered, header ? 20 : 22)) });
}
const borders = Object.fromEntries(['top','bottom','left','right','insideHorizontal','insideVertical'].map(edge => [edge, { style: BorderStyle.SINGLE, size: 4, color: '606060' }]));
function table(widths: number[], rows: TableRow[]) {
  return new Table({ width: { size: width, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders, rows });
}
export async function buildMatrixDocx(rows: MatrixResult[], treatments: MatrixTreatment[], options: MatrixOptions, unitName: string, notes: MatrixExportNote[] = []) {
  const analysisWidths = [700,5600,1000,1200,1100,1100,1000,1660];
  const treatmentWidths = [3150,1450,1450,1450,6000,1860];
  const analysis = table(analysisWidths, [
    new TableRow({ tableHeader: true, cantSplit: true, children: ['ลำดับ','รหัสและเรื่อง / เรื่องย่อย','ความรุนแรง','ความถี่นำเข้า','ผลกระทบ','โอกาสเกิด','คะแนน','ระดับความเสี่ยง'].map((text,index) => cell(text,analysisWidths[index],true)) }),
    ...rows.map(row => new TableRow({ children: [String(row.id), row.title + (row.subtopic ? '\n'+row.subtopic : ''), row.severity, String(row.frequency), String(row.impact), String(row.likelihood), String(row.score), row.level].map((text,index) => cell(text,analysisWidths[index],false,1,index===7?fills[row.color]:undefined)) })),
  ]);
  const treatment = table(treatmentWidths, [
    new TableRow({ tableHeader: true, cantSplit: true, children: [cell('รหัสและเรื่อง',3150,true),cell('การจัดการความเสี่ยง [Risk Treatment]',10350,true,4),cell('Risk Monitoring & Review',1860,true)] }),
    new TableRow({ tableHeader: true, cantSplit: true, children: ['ความเสี่ยง','Transfer &\nPrevention','Monitor &\nControl','Mitigation','มาตรการป้องกัน/การแก้ไข\nระบุสถานะมาตรการปัจจุบันหรือข้อเสนอ','ความถี่ในการทบทวน\n(Review Frequency)'].map((text,index) => cell(text,treatmentWidths[index],true)) }),
    ...rows.map(row => {
      const item = treatments.find(item => item.id === row.id)!;
      return new TableRow({ children: [row.title + (row.subtopic ? '\n'+row.subtopic : ''),item.transferPrevention?'✓':'—',item.monitorControl?'✓':'—',item.mitigation?'✓':'—',`${item.confirmedCurrent?'ยืนยันว่าเป็นมาตรการที่ใช้อยู่ในปัจจุบัน':'ร่างข้อเสนอ ยังไม่ยืนยันว่าใช้อยู่จริง'}\n${item.measures || 'ยังไม่ระบุมาตรการ'}`,item.reviewFrequency||'ยังไม่ระบุ'].map((text,index) => cell(text,treatmentWidths[index])) });
    }),
  ]);
  const basis = options.basis === 'quarter' ? 'จำนวนครั้งในไตรมาส (แปลงเป็นอัตราต่อปีก่อนจัดระดับโอกาสเกิด)' : options.basis === 'year' ? 'จำนวนครั้งต่อปี' : 'ระดับโอกาสเกิด 1–5';
  const doc = new Document({ creator: 'Hospital Risk Management', title: 'รายงานการประเมินและจัดการความเสี่ยง', styles: { default: { document: { run: { font, size: 28 }, paragraph: { spacing: { after: 80 } } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 650, bottom: 650, left: 739, right: 739 } } }, children: [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'รายงานการประเมินและจัดการความเสี่ยง', font, size: 40, bold: true, color: '000000' })] }),
    paragraph(`หน่วยงาน: ${unitName || 'ยังไม่ระบุ'}    ปีงบประมาณ ${options.year}    ไตรมาส ${options.quarter}    ด้าน${options.type === 'clinical' ? 'คลินิก' : 'ทั่วไป'}`),
    paragraph(`วันที่ส่งออก ${thaiDateTime().occurred_at}    เกณฑ์ความถี่: ${basis}`),
    paragraph('คะแนน = ผลกระทบ × ระดับโอกาสเกิด สีประเมินตามตารางโรงพยาบาล ไม่ได้แบ่งจากช่วงคะแนน'),
    paragraph('การวิเคราะห์ความเสี่ยง',true),analysis,
    new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: 'การจัดการความเสี่ยงและการติดตามทบทวน', bold: true, font, size: 36, color: '000000' })] }),
    paragraph('เครื่องหมาย ✓ แสดงแนวทางตอบสนองที่เลือก ช่องมาตรการระบุสถานะตามการยืนยันบนหน้าจอ โปรดทบทวนข้อเสนอจาก AI ก่อนนำไปใช้'),treatment,
    paragraph('เกณฑ์ความรุนแรงด้านทั่วไปอ้างอิง ระดับความรุนแรงรายงานอุบัติการณ์(1).docx ส่วนรูปแบบ Risk Treatment อ้างอิงภาพตัวอย่างที่ให้มา'),
    ...(notes.length ? [paragraph('ข้อเสนอแนะประกอบจาก AI',true), ...notes.flatMap(note=>[paragraph(rows.find(row=>row.id===note.id)!.title,true),paragraph(note.analysis),paragraph('การติดตามผล: '+note.followUp)])] : []),
  ] }] });
  return Packer.toBuffer(doc);
}
