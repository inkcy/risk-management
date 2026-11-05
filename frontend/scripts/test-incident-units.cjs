const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, mocks = {}) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports: mod.exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; }, console });
  return mod.exports;
}
const directory = load('lib/riskUnitDirectory.ts');
let queries = [], authorized = true;
const json = (body, options = {}) => ({ body, status: options.status || 200 });
const route = load('app/api/incidents/route.ts', {
  'next/server': { NextResponse: { json } },
  '@/lib/db': { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [{ id: 71 }] }; } },
  '@/lib/auth': { requireRole: async () => authorized ? { ok: true, user: { name: 'Reporter' } } : { ok: false, response: json({}, { status: 401 }) }, audit: async () => {} },
  '@/lib/envelope': {}, '@/lib/demo': {}, '@/lib/riskUnitDirectory': directory,
});
const submit = code => route.POST({ json: async () => ({ ir_code: 'IR test', occurred_at: '2026-11-05T12:00:00+07:00', title: 'Test incident', category: 'other', severity: 'A', unit_code: code }) });
(async () => {
  for (const name of directory.riskUnitDirectory) {
    queries = [];
    assert.equal((await submit(`RP:${name}`)).status, 201);
    assert.equal(queries[0].params[0], `RP:${name}`);
    assert.equal(queries[0].params[1], name);
    assert.ok(queries[0].sql.includes('ON CONFLICT'));
    assert.equal(queries[1].params[4], 71);
  }
  queries = []; assert.equal((await submit('RP:unknown')).status, 400); assert.equal(queries.length, 0);
  queries = []; assert.equal((await submit('ER')).status, 201); assert.ok(queries[0].sql.startsWith('SELECT')); assert.equal(queries[0].params[0], 'ER');
  authorized = false; queries = []; assert.equal((await submit(`RP:${directory.riskUnitDirectory[0]}`)).status, 401); assert.equal(queries.length, 0);
  console.log(`Passed: all ${directory.riskUnitDirectory.length} Risk Profile units, legacy codes, unknown units and access control.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
