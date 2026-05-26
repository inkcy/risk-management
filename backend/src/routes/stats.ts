import { Router } from 'express';
import { query } from '../db.js';
import { envelope } from '../envelope.js';
import { demoStats } from '../demo.js';
import type { RiskRegisterItem, Stats } from '../types.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await envelope<Stats>(async () => {
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
  }, demoStats);
  res.json(result);
});

export default router;
