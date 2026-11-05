import { riskFrequency, unitRiskColors, type RiskType } from './unitRiskMatrix';

export type MatrixInput = { title: string; subtopic: string; severity: string; frequency: number };
export type FrequencyBasis = 'quarter' | 'year' | 'level';
export type MatrixOptions = { type: RiskType; basis: FrequencyBasis; year: number; quarter: number };
export const matrixLevelLabels = { green: 'ต่ำ', yellow: 'ปานกลาง', orange: 'สูง', red: 'สูงมาก' };

/** Read the supplied severity and frequency without inferring either from the title. */
export function parseMatrixTable(text: string): MatrixInput[] {
  const rows: MatrixInput[] = [];
  const invalid: number[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const cells = line.trim().split(line.includes('\t') ? '\t' : '|').map(cell => cell.trim());
    if (line.includes('|')) { if (cells[0] === '') cells.shift(); if (cells.at(-1) === '') cells.pop(); }
    while (cells[0] === '') cells.shift();
    if (cells.some(cell => /^(?:รหัส.*เรื่อง|เรื่องย่อย|ความรุนแรง|ความถี่)$/.test(cell)) || cells.every(cell => /^[\s:\-]*$/.test(cell))) return;
    const count = cells.at(-1) ?? '';
    const severity = cells.at(-2)?.toUpperCase() ?? '';
    if (cells.length < 3 || !/^[A-I1-5]$/.test(severity) || !/^\d+$/.test(count)) { invalid.push(index + 1); return; }
    const fields = cells.slice(0, -2);
    const title = fields[0];
    if (!title) { invalid.push(index + 1); return; }
    rows.push({ title, subtopic: fields.slice(1).join(' / '), severity, frequency: Number(count) });
  });
  if (invalid.length) throw new Error(`อ่านแถว ${invalid.join(', ')} ไม่สำเร็จ กรุณาใช้คอลัมน์ เรื่อง | เรื่องย่อย | ความรุนแรง | ความถี่`);
  if (!rows.length || rows.length > 50) throw new Error('กรุณาใส่ตาราง 1–50 รายการ');
  return rows;
}

export function calculateMatrix(items: MatrixInput[], options: MatrixOptions) {
  if (!['clinical', 'nonclinical'].includes(options.type) || !['quarter', 'year', 'level'].includes(options.basis) || !Number.isInteger(options.year) || options.year < 2500 || options.year > 2700 || !Number.isInteger(options.quarter) || options.quarter < 1 || options.quarter > 4) throw new Error('กรุณาตรวจสอบประเภท ปี และไตรมาส');
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('รองรับครั้งละ 1–50 รายการ');
  return items.map((item, index) => {
    if (!item || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300 || typeof item.subtopic !== 'string' || item.subtopic.length > 1000 || typeof item.severity !== 'string' || !Number.isInteger(item.frequency) || item.frequency < 0 || item.frequency > 10000000) throw new Error(`ข้อมูลรายการ ${index + 1} ไม่ถูกต้อง`);
    const severity = item.severity.toUpperCase();
    if (!(options.type === 'clinical' ? /^[A-I]$/ : /^[1-5]$/).test(severity)) throw new Error(`รายการ ${index + 1}: ด้านคลินิกใช้ A–I ด้านทั่วไปใช้ 1–5`);
    const impact = options.type === 'clinical' ? (severity <= 'B' ? 1 : severity <= 'D' ? 2 : severity === 'E' ? 3 : severity === 'F' ? 4 : 5) : Number(severity);
    let likelihood: number;
    if (options.basis === 'level') {
      if (item.frequency < 1 || item.frequency > 5) throw new Error(`รายการ ${index + 1}: ระดับโอกาสเกิดต้องเป็น 1–5`);
      likelihood = item.frequency;
    } else if (options.basis === 'quarter') likelihood = riskFrequency(item.frequency, options.year, options.quarter).column;
    else likelihood = item.frequency === 0 ? 1 : item.frequency <= 1 ? 2 : item.frequency <= 36 ? 3 : item.frequency <= 624 ? 4 : 5;
    const color = unitRiskColors[options.type][impact - 1][likelihood - 1];
    return { title: item.title.trim(), subtopic: item.subtopic.trim(), frequency: item.frequency, severity, id: index + 1, impact, likelihood, score: impact * likelihood, color, level: matrixLevelLabels[color] };
  });
}
export type MatrixResult = ReturnType<typeof calculateMatrix>[number];
