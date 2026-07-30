import { loadActions, loadCauti, loadIncidents, loadRcaBundle, loadStats } from './queries';

export const getIncidents = loadIncidents;
export const getActions = loadActions;
export const getRcaByCode = loadRcaBundle;
export const getCauti = loadCauti;
export const getStats = loadStats;

export const categoryLabel: Record<string, string> = {
  blood: 'การให้เลือด',
  medication: 'การให้ยา (High Alert)',
  fall: 'การพลัดตกหกล้ม',
  procedure: 'การผ่าตัด / หัตถการ',
  communication: 'การสื่อสาร / ส่งต่อ',
  other: 'อื่นๆ',
};
