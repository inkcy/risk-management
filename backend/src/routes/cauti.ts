import { Router } from 'express';
import { dbConfigured, query } from '../db.js';
import { loadCauti } from '../queries.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await loadCauti();
  res.json(result);
});

router.post('/', async (req, res) => {
  if (!dbConfigured()) {
    return res.status(503).json({ error: 'Database not configured — cannot save patient' });
  }
  try {
    const { bed, patient_name, age, hn, diagnosis, ward, inserted_at, plan_off_date, note } = req.body ?? {};
    if (!bed || !patient_name || !inserted_at) {
      return res.status(400).json({ error: 'bed, patient_name, inserted_at are required' });
    }
    const { rows } = await query(
      `INSERT INTO cauti_patients (bed, patient_name, age, hn, diagnosis, ward, inserted_at, plan_off_date, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [bed, patient_name, age ?? null, hn ?? null, diagnosis ?? null, ward ?? null,
       inserted_at, plan_off_date ?? null, note ?? null],
    );
    res.status(201).json({ patient: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch('/:id/remove', async (req, res) => {
  if (!dbConfigured()) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const { id } = req.params;
    const { removed_at, outcome } = req.body ?? {};
    const { rows } = await query(
      `UPDATE cauti_patients
         SET removed_at = COALESCE($1::date, CURRENT_DATE),
             outcome    = COALESCE($2, outcome),
             updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [removed_at ?? null, outcome ?? 'removed', id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ patient: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
