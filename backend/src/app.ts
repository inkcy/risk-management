import express from 'express';
import cors from 'cors';

import { dbConfigured } from './db.js';
import incidentsRouter from './routes/incidents.js';
import rcaRouter from './routes/rca.js';
import actionsRouter from './routes/actions.js';
import statsRouter from './routes/stats.js';

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

  app.use('/api/incidents', incidentsRouter);
  app.use('/api/rca', rcaRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/stats', statsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

export default createApp();
