import { Router } from 'express';
import { query } from '../db.js';
import { envelope } from '../envelope.js';
import { demoRcaBundle } from '../demo.js';
import type { Incident, RcaCase, RcaTimelineEvent, RcaCause, RcaBundle } from '../types.js';

const router = Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await envelope<RcaBundle>(async () => {
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
  res.json(result);
});

export default router;
