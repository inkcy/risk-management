export const incidentCategoryGroups = [
  { value: 'clinical', label: 'ความเสี่ยงด้านคลินิก', categories: [
    { value: 'blood', label: 'การให้เลือด' },
    { value: 'medication', label: 'การให้ยา (High Alert)' },
    { value: 'fall', label: 'การพลัดตกหกล้ม' },
    { value: 'procedure', label: 'การผ่าตัด / หัตถการ' },
    { value: 'communication', label: 'การสื่อสาร / ส่งต่อ' },
    { value: 'complaint_distress', label: 'ร้องเรียน · เพื่อให้โรงพยาบาลได้รับทราบความเดือดร้อนและคับแค้นใจ' },
    { value: 'complaint_prevention', label: 'ร้องเรียน · เพื่อให้โรงพยาบาลแก้ไขข้อบกพร่องอย่าให้เกิดเหตุการณ์ซ้ำกับคนอื่น' },
    { value: 'complaint_treatment', label: 'ร้องเรียน · เพื่อช่วยเหลือผู้ป่วยด้านการรักษา' },
    { value: 'complaint_clarification', label: 'ร้องเรียน · เพื่อตรวจสอบเหตุการณ์และชี้แจงข้อขัดข้องใจ' },
    { value: 'complaint_discipline', label: 'ร้องเรียน · เพื่อหาผู้กระทำผิด ว่ากล่าวตักเตือน และลงโทษ' },
    { value: 'complaint_compensation', label: 'ร้องเรียน · เพื่อชดเชยความเสียหาย' },
    { value: 'complaint_social_support', label: 'ร้องเรียน · เพื่อช่วยเหลือผู้ป่วยหรือญาติทางสังคม' },
    { value: 'other', label: 'อื่นๆ' },
  ] },
  { value: 'nonclinical', label: 'ความเสี่ยงด้านทั่วไป (Non-clinical)', categories: [
    { value: 'traffic', label: 'ด้านจราจร' },
    { value: 'environment', label: 'ด้านสิ่งแวดล้อม' },
    { value: 'natural_disaster', label: 'ภัยธรรมชาติ' },
    { value: 'corruption', label: 'ทุจริตคอร์รัปชัน' },
  ] },
] as const;

export type IncidentRiskGroup = typeof incidentCategoryGroups[number]['value'];
export type IncidentCategory = typeof incidentCategoryGroups[number]['categories'][number]['value'];
export const incidentCategories = incidentCategoryGroups.flatMap(group => [...group.categories]);
export const categoryLabel: Record<string, string> = Object.fromEntries(
  incidentCategoryGroups.flatMap(group => group.categories.map(category => [category.value, `${group.label} / ${category.label}`])),
);
export function incidentRiskGroup(category: string): IncidentRiskGroup | '' {
  return incidentCategoryGroups.find(group => group.categories.some(item => item.value === category))?.value ?? '';
}

export function incidentCategoryParts(category: string, otherDetail?: string | null): { group: string; subtype: string } {
  const group = incidentCategoryGroups.find(item => item.categories.some(entry => entry.value === category));
  const subtype = group?.categories.find(item => item.value === category)?.label ?? category;
  return { group: group?.label ?? 'ไม่ระบุ', subtype: category === 'other' && otherDetail?.trim() ? `อื่นๆ · ${otherDetail.trim()}` : subtype };
}
