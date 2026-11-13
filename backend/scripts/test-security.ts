import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const server = createApp().listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No test port');
const base = `http://127.0.0.1:${address.port}`;
try {
  delete process.env.BACKEND_API_TOKEN;
  assert.equal((await fetch(`${base}/api/incidents`)).status, 503);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  process.env.BACKEND_API_TOKEN = 'a'.repeat(32);
  assert.equal((await fetch(`${base}/api/incidents`)).status, 401);
  assert.equal((await fetch(`${base}/api/incidents`, { headers: { authorization: `Bearer ${'b'.repeat(32)}` } })).status, 401);
  assert.notEqual((await fetch(`${base}/api/incidents`, { headers: { authorization: `Bearer ${'a'.repeat(32)}` } })).status, 401);
  console.log('PASS: standalone backend fails closed and checks service credentials');
} finally { server.close(); }
