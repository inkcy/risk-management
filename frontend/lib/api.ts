import type {
  ActionItem,
  CautiPatient,
  Envelope,
  Incident,
  RcaBundle,
  Stats,
} from './types';

const FALLBACK_INCIDENTS: Incident[] = [];
const FALLBACK_ACTIONS: ActionItem[] = [];
const FALLBACK_RCA: RcaBundle = { incident: null, case: null, timeline: [], causes: [] };
const FALLBACK_STATS: Stats = {
  totals: { incidents: 0, severe: 0, rca_pending: 0, actions_done: 0, actions_in_progress: 0, actions_planned: 0 },
  by_category: [],
  by_month: [],
  risk_top5: [],
};

function backendUrl(): string {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
}

async function fetchEnvelope<T>(path: string, fallback: T): Promise<Envelope<T>> {
  try {
    const res = await fetch(`${backendUrl()}${path}`, { cache: 'no-store' });
    if (!res.ok) {
      return { data: fallback, demo: true, error: `Backend returned ${res.status}` };
    }
    return (await res.json()) as Envelope<T>;
  } catch (err) {
    return { data: fallback, demo: true, error: `Cannot reach backend at ${backendUrl()} — ${String(err)}` };
  }
}

export function getIncidents() {
  return fetchEnvelope<Incident[]>('/api/incidents', FALLBACK_INCIDENTS);
}

export function getActions() {
  return fetchEnvelope<ActionItem[]>('/api/actions', FALLBACK_ACTIONS);
}

export function getRcaByCode(irCode: string) {
  return fetchEnvelope<RcaBundle>(`/api/rca/${encodeURIComponent(irCode)}`, FALLBACK_RCA);
}

export function getStats() {
  return fetchEnvelope<Stats>('/api/stats', FALLBACK_STATS);
}

const FALLBACK_CAUTI: CautiPatient[] = [];
export function getCauti() {
  return fetchEnvelope<CautiPatient[]>('/api/cauti', FALLBACK_CAUTI);
}

export const categoryLabel: Record<string, string> = {
  blood: 'การให้เลือด',
  medication: 'การให้ยา (High Alert)',
  fall: 'การพลัดตกหกล้ม',
  procedure: 'การผ่าตัด / หัตถการ',
  communication: 'การสื่อสาร / ส่งต่อ',
  other: 'อื่นๆ',
};
