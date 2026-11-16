/** Resolve visually equivalent Unicode spellings only when the match is unique. */
export function resolveDepartmentName(input: string, units: readonly string[]): string | undefined {
  const name = input.trim();
  if (units.includes(name)) return name;
  const normalized = name.normalize('NFKC');
  const matches = units.filter(unit => unit.trim().normalize('NFKC') === normalized);
  return matches.length === 1 ? matches[0] : undefined;
}

// Keep existing database records intact; only hide these alternate labels when
// the corresponding department from the approved roster is available.
const rosterAliases: readonly (readonly [string, string])[] = [
  ['ฝ่ายวิชาการและวิจัย', 'ฝ่ายวิชาการและงานวิจัย'],
  ['ฝ่ายแพทย์ศาสตรศึกษาชั้นคลินิก', 'ฝ่ายแพทยศาสตรศึกษาชั้นคลินิก'],
  ['ศูนย์ส่งเสริมฟื้นฟูผู้สูงอายุ (ศูนย์ฯ บางพระ)', 'ศูนย์ส่งเสริมฟื้นฟูสุขภาพผู้สูงอายุ (บางพระ)'],
  ['หน่วยอุบัติเหตุและฉุกเฉิน', 'หน่วยอุบัติเหตุและฉุกเฉิน (ER)'],
  ['หอผู้ป่วย ตึกสว่างวัฒนา', 'หอผู้ป่วยสว่างวัฒนา'],
  ['หอผู้ป่วย ศัลยกรรมอุบัติเหตุชาย (20B)', 'หอผู้ป่วยสามัญอุบัติเหตุชาย (20B)'],
  ['หอผู้ป่วย สามัญศัลยกรรม ศัลยกรรมกระดูกและข้อสามัญหญิง (19D)', 'ตึกศัลยกรรม/ศัลยกรรมกระดูกและข้อสามัญหญิง (19D)'],
  ['หอผู้ป่วย สามัญศัลยกรรมกระดูกและข้อชาย (19B)', 'หอผู้ป่วยบท.1 (ศัลยกรรมกระดูกและข้อสามัญชาย) 19B'],
  ['หอผู้ป่วย สามัญอายุรกรรมชาย (22C)', 'หอผู้ป่วยสก.3 สามัญอายุรกรรมชาย (22C)'],
  ['หอผู้ป่วย สามัญอายุรกรรมหญิง (22D)', 'หอผู้ป่วยสก.3 สามัญอายุรกรรมหญิง (22D)'],
  ['หอผู้ป่วย หน่วยจ่ายกลาง/โรงซักฟอก', 'หน่วยจ่ายกลาง/โรงซักฟอก'],
  ['หอผู้ป่วย เคมีบำบัด (21D )', 'หอผู้ป่วยเมธา1 (หน่วยเคมีบำบัด) 21D'],
];

export function hideDuplicateDepartmentNames(units: readonly string[]): string[] {
  const normalize = (value: string) => value.trim().normalize('NFKC');
  const available = new Set(units.map(normalize));
  const hidden = new Set(rosterAliases.filter(([, preferred]) => available.has(normalize(preferred))).map(([alias]) => normalize(alias)));
  return units.filter(unit => !hidden.has(normalize(unit)));
}
