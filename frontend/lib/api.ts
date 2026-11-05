import { loadActions, loadCauti, loadIncidents, loadRcaBundle, loadRcaPage, loadStats } from './queries';

export const getIncidents = loadIncidents;
export const getActions = loadActions;
export const getRcaByCode = loadRcaBundle;
export const getRcaPage = loadRcaPage;
export const getCauti = loadCauti;
export const getStats = loadStats;

export { categoryLabel } from './incident-categories';
