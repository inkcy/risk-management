import type { MatrixResult } from './matrix-analysis';
import type { MatrixAdvice } from './matrix-ai';
import type { MatrixExportNote, MatrixTreatment } from './matrix-treatment';

/** A transparent process review when the AI service is unavailable. No invented causes. */
export function baselineMatrixAdvice(rows: MatrixResult[]): MatrixAdvice[] {
  return rows.map(row => ({
    id: row.id,
    analysis: `ประเด็น ${row.title}${row.subtopic ? ` (${row.subtopic})` : ''} มีระดับความเสี่ยง${row.level} จากผลกระทบ ${row.impact} และโอกาสเกิด ${row.likelihood} ต้องตรวจสอบสาเหตุและจุดควบคุมจากรายงานอุบัติการณ์ก่อนสรุป${row.frequency === 0 ? ' โดยความถี่ 0 อาจเป็นค่าเริ่มต้น จึงยังสรุปว่าไม่เคยเกิดเหตุไม่ได้' : ''}`,
    actions: `มอบหมายผู้รับผิดชอบทบทวนขั้นตอนเรื่อง ${row.subtopic || row.title} เทียบแนวทางที่หน่วยงานอนุมัติ จัดทำรายการตรวจสอบจุดเสี่ยงและสื่อสารแก่ผู้ปฏิบัติ บันทึกผลการตรวจและติดตามการแก้ไขจนแล้วเสร็จ`,
    followUp: 'ติดตามจำนวนเหตุซ้ำ สัดส่วนการปฏิบัติตามรายการตรวจสอบ และงานแก้ไขที่ค้าง พร้อมรายงานผู้รับผิดชอบ',
    transferPrevention: true,
    monitorControl: true,
    mitigation: row.color === 'orange' || row.color === 'red',
    reviewFrequency: row.color === 'red' ? 'ทุกสัปดาห์และหลังเกิดเหตุทุกครั้ง' : row.color === 'orange' ? 'ทุกเดือนและหลังเกิดเหตุทุกครั้ง' : 'ทุกไตรมาสและหลังเกิดเหตุทุกครั้ง',
  }));
}

export function matrixReportContent(row: MatrixResult, item: MatrixTreatment, note?: MatrixExportNote) {
  const baseline = baselineMatrixAdvice([row])[0];
  const measures = item.measures.replace(/\[\s*ร่าง\s*\]\s*/gu, '').trim();
  return {
    title: [row.title, row.subtopic, `วิเคราะห์: ${note?.analysis.trim() || baseline.analysis}`].filter(Boolean).join('\n'),
    measures: `${item.confirmedCurrent && measures ? 'มาตรการปัจจุบัน' : 'ข้อเสนอมาตรการ (รอยืนยัน)'}: ${measures || baseline.actions}\nติดตาม: ${note?.followUp.trim() || baseline.followUp}`,
    reviewFrequency: item.reviewFrequency.trim() || baseline.reviewFrequency,
  };
}
