export const incidentCategoryGroups = [
  { value: 'clinical', label: 'ความเสี่ยงด้านคลินิก', categories: [
    { value: 'blood', label: 'การให้เลือด' },
    { value: 'medication', label: 'การให้ยา (High Alert)' },
    { value: 'fall', label: 'การพลัดตกหกล้ม' },
    { value: 'procedure', label: 'การผ่าตัด / หัตถการ' },
    { value: 'communication', label: 'การสื่อสาร / ส่งต่อ' },
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
