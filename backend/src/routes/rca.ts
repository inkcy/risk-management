import { Router } from 'express';
import { loadActions, loadRcaBundle } from '../queries.js';
import { buildRcaDocx } from '../docx.js';
import { analyzeRca } from '../ai.js';

const router = Router();

router.post('/:id/analyze', async (req, res) => {
  const { id } = req.params;
  try {
    const [bundleEnv, actionsEnv] = await Promise.all([loadRcaBundle(id), loadActions()]);
    if (!bundleEnv.data.incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const result = await analyzeRca(bundleEnv.data, actionsEnv.data);
    res.json(result);
  } catch (err) {
    console.error('AI analyze failed:', err);
    res.status(500).json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' });
  }
});

router.get('/:id/export', async (req, res) => {
  const { id } = req.params;
  try {
    const [bundleEnv, actionsEnv] = await Promise.all([loadRcaBundle(id), loadActions()]);
    if (!bundleEnv.data.incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const buffer = await buildRcaDocx(bundleEnv.data, actionsEnv.data);
    const safeName = (bundleEnv.data.incident.ir_code || 'rca').replace(/[^\w.-]+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="RCA_${safeName}.docx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' });
  }
});

router.get('/:id', async (req, res) => {
  const result = await loadRcaBundle(req.params.id);
  res.json(result);
});

export default router;
