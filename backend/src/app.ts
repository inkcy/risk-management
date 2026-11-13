import express from 'express';
import cors from 'cors';
import { createHash, timingSafeEqual } from 'node:crypto';

import { dbConfigured } from './db.js';
import incidentsRouter from './routes/incidents.js';
import rcaRouter from './routes/rca.js';
import actionsRouter from './routes/actions.js';
import statsRouter from './routes/stats.js';
import cautiRouter from './routes/cauti.js';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: dbConfigured(), timestamp: new Date().toISOString() });
  });

  // This standalone legacy API has no user sessions. Do not expose its data
  // until an operator explicitly configures a strong service credential.
  app.use('/api', (req, res, next) => {
    const expected = process.env.BACKEND_API_TOKEN;
    if (!expected || expected.length < 32) {
      res.status(503).json({ error: 'Backend authentication is not configured' });
      return;
    }
    const match = /^Bearer ([^\s]+)$/.exec(req.get('authorization') ?? '');
    const hash = (value: string) => createHash('sha256').update(value).digest();
    if (!match || !timingSafeEqual(hash(match[1]), hash(expected))) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });

  app.use('/api/incidents', incidentsRouter);
  app.use('/api/rca', rcaRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/cauti', cautiRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

export default createApp();
