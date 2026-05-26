import { Router } from 'express';
import { query } from '../db.js';
import { envelope } from '../envelope.js';
import { demoActions } from '../demo.js';
import type { ActionItem } from '../types.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await envelope<ActionItem[]>(async () => {
    const { rows } = await query<ActionItem>(`
      SELECT a.id, a.incident_id, i.ir_code, a.title, a.description, a.owner,
             a.due_date::text AS due_date, a.status, a.progress
      FROM actions a
      LEFT JOIN incidents i ON i.id = a.incident_id
      ORDER BY a.due_date ASC NULLS LAST
    `);
    return rows;
  }, demoActions);
  res.json(result);
});

export default router;
