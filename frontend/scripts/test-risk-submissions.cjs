const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let authorized = true;
let staff = false;
let role = 'editor';
let unit = { id: 7, name: 'หน่วยทดสอบ' };
let inserted = false;
let currentRisks = [{ id: 1, title: 'ความเสี่ยงเดิม', category: 'clinical' }, { id: 2, title: 'ความเสี่ยงทั่วไป', category: 'nonclinical' }];
let savedSnapshot;
const json = (body, options = {}) => ({ body, status: options.status ?? 200 });
const mocks = {
  'next/server': { NextResponse: { json } },
  '@/lib/auth': { requireRole: async () => authorized ? { ok: true, user: { id: 1, role } } : { ok: false, response: json({}, { status: 403 }) }, audit: async () => {} },
  '@/lib/riskUnitAuth': { getRiskUnit: async () => unit },
  '@/lib/departmentAccess': { departmentAccess: () => staff ? 'staff' : 'supervisor' },
  '@/lib/riskSubmissions': { ensureRiskSubmissions: async () => {} },
  '@/lib/db': { query: async (sql, params) => {
    if (sql.startsWith('SELECT id, name FROM risk_units')) return { rows: params[0] === 7 ? [{ id: 7, name: '18D' }] : [] };
    assert.equal(params[0], 7);
    if (inserted) return { rowCount: 0, rows: [] };
    assert.match(sql, /INSERT INTO risk_profile_submissions[\s\S]*snapshot/);
    assert.match(sql, /jsonb_agg\(to_jsonb\(r\) ORDER BY r.id\)/);
    assert.match(sql, /r.unit_id=\$1 AND r.year=\$2 AND r.quarter=\$3/);
    assert.match(sql, /ON CONFLICT \(unit_id,year,quarter\) DO NOTHING/);
    savedSnapshot = JSON.parse(JSON.stringify(currentRisks));
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
  authorized = true; staff = true;
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }))).status, 403);
  staff = false; unit = null;
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }))).status, 403);
  unit = { id: 7, name: 'หน่วยทดสอบ' };
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 5 }))).status, 400);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1, unit_id: 99 }))).body.alreadySubmitted, false);
  currentRisks[0].title = 'แก้ไขภายหลัง'; currentRisks.splice(1, 1);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 1 }))).body.alreadySubmitted, true);
  assert.equal(savedSnapshot[0].title, 'ความเสี่ยงเดิม'); assert.equal(savedSnapshot[1].category, 'nonclinical');
  role = 'admin'; unit = null; inserted = false;
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 2 }))).status, 400);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 2, unit_id: 99 }))).status, 403);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 2, unit_id: 7 }))).body.alreadySubmitted, false);
  assert.equal((await mod.exports.POST(req({ year: 2569, quarter: 2, unit_id: 7 }))).body.alreadySubmitted, true);
  console.log('Risk submission authorization, atomic snapshot and duplicate checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
