import type { MatrixAdvice } from './matrix-ai';

export type MatrixTreatment = {
  id: number;
  transferPrevention: boolean;
  monitorControl: boolean;
  mitigation: boolean;
  measures: string;
  confirmedCurrent: boolean;
  reviewFrequency: string;
};
export function applyMatrixAdvice(ids: number[], previous: MatrixTreatment[], advice: MatrixAdvice[]): MatrixTreatment[] {
  return normalizeTreatments(ids, previous).map(item => {
    const note = advice.find(note => note.id === item.id);
    if (!note || (item.confirmedCurrent && item.measures.trim())) return item;
    const hasResponse = item.transferPrevention || item.monitorControl || item.mitigation;
    return {
      ...item,
      transferPrevention: hasResponse ? item.transferPrevention : note.transferPrevention,
      monitorControl: hasResponse ? item.monitorControl : note.monitorControl,
      mitigation: hasResponse ? item.mitigation : note.mitigation,
      measures: item.measures.trim() ? item.measures : note.actions.slice(0, 5000),
      reviewFrequency: item.reviewFrequency.trim() ? item.reviewFrequency : note.reviewFrequency.slice(0, 300),
    };
  });
}
export type MatrixExportNote = { id: number; analysis: string; followUp: string };
export function normalizeExportNotes(ids: number[], input: unknown): MatrixExportNote[] {
  if (!Array.isArray(input) || input.length > ids.length || new Set(input.map(item=>item?.id)).size !== input.length || input.some(item=>!item || !ids.includes(item.id) || !['analysis','followUp'].every(key=>typeof item[key]==='string' && item[key].length<=3000))) throw new Error('ผลวิเคราะห์ประกอบไม่ถูกต้อง');
  return input.map(item=>({id:item.id,analysis:item.analysis,followUp:item.followUp}));
}
export function normalizeTreatments(ids: number[], input: unknown): MatrixTreatment[] {
  if (!Array.isArray(input) || input.length > ids.length || new Set(input.map(item => item?.id)).size !== input.length) throw new Error('ข้อมูลการจัดการความเสี่ยงไม่ถูกต้อง');
  for (const item of input) {
    if (!item || !ids.includes(item.id) || !['transferPrevention','monitorControl','mitigation','confirmedCurrent'].every(key => typeof item[key] === 'boolean') || typeof item.measures !== 'string' || item.measures.length > 5000 || typeof item.reviewFrequency !== 'string' || item.reviewFrequency.length > 300) throw new Error('กรุณาตรวจสอบมาตรการและความถี่ในการทบทวน');
  }
  return ids.map(id => input.find(item => item.id === id) ?? { id, transferPrevention: false, monitorControl: false, mitigation: false, measures: '', confirmedCurrent: false, reviewFrequency: '' });
}
