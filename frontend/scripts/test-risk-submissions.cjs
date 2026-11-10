const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let authorized = true;
let unit = { id: 7, name: 'หน่วยทดสอบ' };
let inserted = false;
const json = (body, options = {}) => ({ body, status: options.status ?? 200 });
const mocks = {
  'next/server': { NextResponse: { json } },
  '@/lib/auth': { requireRole: async () => authorized ? { ok: true, user: { id: 1 } } : { ok: false, response: json({}, { status: 403 }) }, audit: async () => {} },
  '@/lib/riskUnitAuth': { getRiskUnit: async () => unit },
  '@/lib/riskSubmissions': { ensureRiskSubmissions: async () => {} },
  '@/lib/db': { query: async (_sql, params) => {
    assert.equal(params[0], 7);
    if (inserted) return { rowCount: 0, rows: [] };
    inserted = true; return { rowCount: 1, rows: [{ submitted_at: '2026-01-01' }] };
  } },
};
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('app/api/unit-risks/submissions/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports: mod.exports, require: name => mocks[name], console });
const req = (body, origin = 'https://example.test') => ({ json: async () => body, headers: new Headers({ origin }), nextUrl: { origin: 'https://example.test' } });

(async () => {
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }, 'https://other.test'))).status, 403);
  authorized = false;
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }))).status, 403);
  authorized = true; unit = null;
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }))).status, 403);
  unit = { id: 7, name: 'หน่วยทดสอบ' };
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 5 }))).status, 400);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1, unit_id: 99 }))).body.alreadySubmitted, false);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }))).body.alreadySubmitted, true);
  console.log('Risk submission authorization and duplicate checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
