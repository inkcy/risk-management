import { query } from './db';
import { envelope } from './envelope';
import { demoActions, demoCauti, demoIncidents, demoRcaBundle, demoStats } from './demo';
import type { ActionItem, CautiPatient, Incident, RcaBundle, RcaCase, RcaCause, RcaTimelineEvent, RiskRegisterItem, Stats } from './types';

/** ค่าที่คืนเมื่อ query พัง — ว่างเปล่าจริง ๆ ไม่ใช่ข้อมูลตัวอย่าง */
const EMPTY_RCA_BUNDLE: RcaBundle = { incident: null, case: null, timeline: [], causes: [] };
const EMPTY_STATS: Stats = {
  totals: { incidents: 0, severe: 0, rca_pending: 0, actions_done: 0, actions_in_progress: 0, actions_planned: 0 },
  by_category: [],
  by_month: [],
  risk_top5: [],
};

export function loadIncidents() {
  return envelope<Incident[]>(async () => {
    const { rows } = await query<Incident>(`
      SELECT i.id, i.ir_code, i.occurred_at, i.title, i.description,
             i.unit_id, u.name_th AS unit_name,
             i.category, i.severity, i.rca_status, i.reported_by
      FROM incidents i
      LEFT JOIN units u ON u.id = i.unit_id
      ORDER BY i.occurred_at DESC
    `);
    return rows;
  }, demoIncidents, []);
}

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
  }, demoActions, []);
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
  }, demoCauti, []);
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
  }, demoRcaBundle, EMPTY_RCA_BUNDLE);
}

export function loadStats() {
  return envelope<Stats>(async () => {
    const [total, severe, rcaPending, actions, byCat, byMonth, risk] = await Promise.all([
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM incidents`),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM incidents WHERE severity IN ('E','F','G','H','I')`),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM incidents WHERE rca_status IN ('pending','in_progress')`),
      query<{ done: string; in_progress: string; planned: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE status='done')::text AS done,
          COUNT(*) FILTER (WHERE status='in_progress')::text AS in_progress,
          COUNT(*) FILTER (WHERE status='planned')::text AS planned
        FROM actions
      `),
      query<{ category: string; n: string }>(`
        SELECT category, COUNT(*)::text AS n FROM incidents GROUP BY category ORDER BY n DESC
      `),
      query<{ ym: string; n: string }>(`
        SELECT to_char(occurred_at, 'YYYY-MM') AS ym, COUNT(*)::text AS n
        FROM incidents
        WHERE occurred_at >= NOW() - INTERVAL '12 months'
        GROUP BY ym ORDER BY ym
      `),
      query<RiskRegisterItem>(`
        SELECT id, title, likelihood, consequence, (likelihood * consequence) AS score, category, note
        FROM risk_register
        ORDER BY score DESC LIMIT 5
      `),
    ]);

    return {
      totals: {
        incidents: Number(total.rows[0]?.n ?? 0),
        severe: Number(severe.rows[0]?.n ?? 0),
        rca_pending: Number(rcaPending.rows[0]?.n ?? 0),
        actions_done: Number(actions.rows[0]?.done ?? 0),
        actions_in_progress: Number(actions.rows[0]?.in_progress ?? 0),
        actions_planned: Number(actions.rows[0]?.planned ?? 0),
      },
      by_category: byCat.rows.map(r => ({ category: r.category, count: Number(r.n) })),
      by_month: byMonth.rows.map(r => ({ ym: r.ym, count: Number(r.n) })),
      risk_top5: risk.rows,
    };
  }, demoStats, EMPTY_STATS);
}
