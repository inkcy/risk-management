import { query } from './db.js';
import { envelope } from './envelope.js';
import { demoActions, demoCauti, demoRcaBundle } from './demo.js';
import type { ActionItem, CautiPatient, Incident, RcaBundle, RcaCase, RcaCause, RcaTimelineEvent } from './types.js';

export function loadActions() {
  return envelope<ActionItem[]>(async () => {
    const { rows } = await query<ActionItem>(`
      SELECT a.id, a.incident_id, i.ir_code, a.title, a.description, a.owner,
             a.due_date::text AS due_date, a.status, a.progress
      FROM actions a
      LEFT JOIN incidents i ON i.id = a.incident_id
      ORDER BY a.due_date ASC NULLS LAST
    `);
    return rows;
  }, demoActions);
}

export function loadCauti() {
  return envelope<CautiPatient[]>(async () => {
    const { rows } = await query<{
      id: number; bed: string; patient_name: string; age: number | null;
      hn: string | null; diagnosis: string | null; ward: string | null;
      inserted_at: string; plan_off_date: string | null; removed_at: string | null;
      outcome: string | null; note: string | null;
      days_in: number; is_overdue: boolean;
    }>(`
      SELECT id, bed, patient_name, age, hn, diagnosis, ward,
             inserted_at::text  AS inserted_at,
             plan_off_date::text AS plan_off_date,
             removed_at::text    AS removed_at,
             outcome, note,
             GREATEST(0, (COALESCE(removed_at, CURRENT_DATE) - inserted_at))::int AS days_in,
             (removed_at IS NULL AND (CURRENT_DATE - inserted_at) >= 3)            AS is_overdue
      FROM cauti_patients
      ORDER BY (removed_at IS NULL) DESC, inserted_at DESC
    `);
    return rows;
  }, demoCauti);
}

export function loadRcaBundle(id: string) {
  return envelope<RcaBundle>(async () => {
    const incident = await query<Incident>(`
      SELECT i.id, i.ir_code, i.occurred_at, i.title, i.description,
             i.unit_id, u.name_th AS unit_name,
             i.category, i.severity, i.rca_status, i.reported_by
      FROM incidents i
      LEFT JOIN units u ON u.id = i.unit_id
      WHERE i.ir_code = $1 OR i.id::text = $1
      LIMIT 1
    `, [id]);

    if (incident.rows.length === 0) {
      return { incident: null, case: null, timeline: [], causes: [] };
    }
    const inc = incident.rows[0];

    const rcaCase = await query<RcaCase>(
      `SELECT * FROM rca_cases WHERE incident_id = $1`,
      [inc.id],
    );
    if (rcaCase.rows.length === 0) {
      return { incident: inc, case: null, timeline: [], causes: [] };
    }
    const c = rcaCase.rows[0];

    const [timeline, causes] = await Promise.all([
      query<RcaTimelineEvent>(
        `SELECT * FROM rca_timeline WHERE rca_case_id = $1 ORDER BY sort_order ASC`,
        [c.id],
      ),
      query<RcaCause>(
        `SELECT * FROM rca_causes WHERE rca_case_id = $1`,
        [c.id],
      ),
    ]);

    return { incident: inc, case: c, timeline: timeline.rows, causes: causes.rows };
  }, demoRcaBundle);
}
