export type Severity = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | '1' | '2' | '3' | '4' | '5';
export type { IncidentCategory as Category } from './incident-categories';
import type { IncidentCategory as Category } from './incident-categories';
export type RcaStatus = 'pending' | 'in_progress' | 'done' | 'not_required';
export type ActionStatus = 'planned' | 'in_progress' | 'done' | 'overdue';

export interface Incident {
  id: number;
  ir_code: string;
  occurred_at: string;
  title: string;
  description: string | null;
  unit_id: number | null;
  unit_name?: string;
  category: Category;
  severity: Severity;
  rca_status: RcaStatus;
  reported_by: string | null;
}

export interface RcaCase {
  id: number;
  incident_id: number;
  summary: string | null;
  hro_sensitivity: number | null;
  hro_deference: number | null;
  hro_reluctance: number | null;
  hro_preoccupation: number | null;
  hro_resilience: number | null;
  completed_at: string | null;
}

export interface RcaTimelineEvent {
  id: number;
  rca_case_id: number;
  occurred_at: string;
  event_title: string;
  event_detail: string | null;
  severity_tag: 'ok' | 'warn' | 'bad';
  sort_order: number;
}

export interface RcaCause {
  id: number;
  rca_case_id: number;
  category: 'people' | 'system' | 'environment' | 'management';
  label: string;
  is_hot: boolean;
}

export interface ActionItem {
  id: number;
  incident_id: number | null;
  ir_code?: string;
  title: string;
  description: string | null;
  owner: string | null;
  due_date: string | null;
  status: ActionStatus;
  progress: number;
}

export interface RiskRegisterItem {
  id: number;
  title: string;
  likelihood: number;
  consequence: number;
  category: string | null;
  note: string | null;
  score: number;
}

export interface RcaBundle {
  incident: Incident | null;
  case: RcaCase | null;
  timeline: RcaTimelineEvent[];
  causes: RcaCause[];
}

export interface Stats {
  totals: {
    incidents: number;
    severe: number;
    rca_pending: number;
    actions_done: number;
    actions_in_progress: number;
    actions_planned: number;
  };
  by_category: { category: string; count: number }[];
  by_month: { ym: string; count: number }[];
  risk_top5: RiskRegisterItem[];
}

export interface Envelope<T> {
  data: T;
  demo: boolean;
  error: string | null;
}

export interface CautiPatient {
  id: number;
  bed: string;
  patient_name: string;
  age: number | null;
  hn: string | null;
  diagnosis: string | null;
  ward: string | null;
  inserted_at: string;
  plan_off_date: string | null;
  removed_at: string | null;
  outcome: string | null;
  note: string | null;
  days_in: number;
  is_overdue: boolean;
}
