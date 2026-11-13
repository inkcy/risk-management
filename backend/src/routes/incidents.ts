import { Router } from 'express';
import { dbConfigured, query } from '../db.js';
import { envelope } from '../envelope.js';
import { demoIncidents } from '../demo.js';
import type { Incident } from '../types.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await envelope<Incident[]>(async () => {
    const { rows } = await query<Incident>(`
      SELECT i.id, i.ir_code, i.occurred_at, i.title, i.description,
             i.unit_id, u.name_th AS unit_name,
             i.category, i.severity, i.rca_status, i.reported_by
      FROM incidents i
      LEFT JOIN units u ON u.id = i.unit_id
      ORDER BY i.occurred_at DESC
    `);
    return rows;
  }, demoIncidents);
  res.json(result);
});

router.post('/', async (req, res) => {
  if (!dbConfigured()) {
    return res.status(503).json({ error: 'Database not configured — cannot save incident' });
  }
  try {
    const { ir_code, occurred_at, title, description, unit_id, category, severity, reported_by } = req.body ?? {};
    if (!ir_code || !occurred_at || !title || !category || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { rows } = await query<Incident>(
      `INSERT INTO incidents (ir_code, occurred_at, title, description, unit_id, category, severity, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [ir_code, occurred_at, title, description ?? null, unit_id ?? null, category, severity, reported_by ?? null],
    );
    res.status(201).json({ incident: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' });
  }
});

export default router;
