/** Display labels only. Original titles remain unchanged for review and storage. */
export function riskKeyword(title: string): string {
  const text = title.replace(/\s+/g, ' ').trim();
  const rules: [RegExp, string][] = [
    [/revisit.*48/i, 'Revisit ≤48 ชม.'],
    [/คัดกรอง.*ไม่เหมาะสม/, 'คัดกรองไม่เหมาะสม'],
    [/ห้องฉุกเฉิน.*นานเกิน|ตรวจรักษา.*เกินเกณฑ์/, 'รักษาใน ER เกินเกณฑ์'],
    [/สิ่งส่งตรวจ.*ไม่ถูกต้อง|สิ่งส่งตรวจ.*ไม่เหมาะสม|ไม่มีสิ่งส่งตรวจ/, 'ปัญหาสิ่งส่งตรวจ'],
    [/medication\s*error/i, 'Medication error'],
    [/ระบุตัวตน.*ผู้ป่วย/, 'ระบุตัวผู้ป่วยผิด/ไม่ระบุ'],
    [/สื่อสาร.*รังสีวิทยา/, 'สื่อสารงานรังสีผิดพลาด'],
    [/delay\s*diagnosis.*delay\s*treatment/i, 'วินิจฉัย/รักษาล่าช้า'],
    [/เวชระเบียน.*ไม่ครบถ้วน|เวชระเบียน.*ไม่ถูกต้อง/, 'เวชระเบียนไม่ครบ/ผิด'],
    [/สื่อสาร.*ส่งต่อข้อมูล|ส่งต่อข้อมูล.*ผิดพลาด/, 'ส่งต่อข้อมูลผิดพลาด'],
  ];
  const match = rules.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  const plain = text.replace(/\s*\([^)]*(?:เรื่อง|ครั้ง)[^)]*\)/g, '').replace(/\s*\[[A-I] \d+(?:, [A-I] \d+)*\]$/, '').trim();
  const words = [...new Intl.Segmenter('th', { granularity: 'word' }).segment(plain)];
  let keyword = '';
  for (const word of words) {
    if (keyword.length + word.segment.length > 28) break;
    keyword += word.segment;
  }
  return keyword.trim() && keyword.trim() !== plain ? `${keyword.trim()}…` : plain.length <= 28 ? plain : `${Array.from(plain).slice(0, 28).join('')}…`;
}
