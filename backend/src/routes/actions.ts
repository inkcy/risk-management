import { Router } from 'express';
import { loadActions } from '../queries.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await loadActions();
  res.json(result);
});

export default router;
