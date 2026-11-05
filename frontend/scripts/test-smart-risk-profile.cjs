const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let user, unit, calls, broken;
const moduleMock = { exports: {} };
const mocks = {
  'react/jsx-runtime': require('react/jsx-runtime'),
  'next/navigation': { redirect: url => { throw Error(`redirect:${url}`); } },
  'next/link': { default: () => null },
  '@/lib/auth': { getSessionUser: async () => user },
  '@/lib/riskUnitAuth': { getRiskUnit: async () => unit },
  '@/lib/db': { dbConfigured: () => true, query: async (sql, params) => { calls.push({ sql, params }); if (broken) throw Error('DB unavailable'); return { rows: [] }; } },
  '@/components/SmartRiskProfile': { SmartRiskProfile: () => null },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/smart-risk-profile/page.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports: moduleMock.exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
const page = moduleMock.exports.default;
const matrixModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/unitRiskMatrix.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: matrixModule.exports });
const clientModule = { exports: {} };
let stateValues = [];
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/SmartRiskProfile.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports: clientModule.exports, require: name => {
    if (name === 'react') return { useState: initial => [stateValues.length ? stateValues.shift() : initial, () => {}] };
    if (name === '@/lib/unitRiskMatrix') return matrixModule.exports;
    return mocks[name];
  } });
(async () => {
  calls = []; user = null;
  await assert.rejects(page(), /redirect:\/login/); assert.equal(calls.length, 0);
  user = { id: 1, role: 'editor' }; unit = null;
  await page(); assert.equal(calls.length, 0);
  unit = { id: 7, name: 'Unit 7' };
  const member = await page();
  assert.equal(member.props.units[0].id, 7); assert.equal(calls.length, 1);
  assert.equal(calls[0].params[0], false); assert.equal(calls[0].params[1], 7);
  assert.ok(calls[0].sql.includes('r.unit_id=$2'));
  calls = []; user = { id: 2, role: 'admin' };
  await page(); assert.equal(calls.length, 2); assert.equal(calls[1].params[0], true);
  broken = true; const unavailable = await page(); assert.equal(unavailable.props.role, 'alert');
  const rows = [
    { id: 1, unit_id: 7, unit_name: 'Unit 7', year: 2570, quarter: 1, category: 'clinical', title: 'Low risk', occurrence_count: 0, impact: 1 },
    { id: 2, unit_id: 7, unit_name: 'Unit 7', year: 2570, quarter: 1, category: 'clinical', title: 'Highest risk', occurrence_count: 200, impact: 5 },
    { id: 3, unit_id: 7, unit_name: 'Unit 7', year: 2570, quarter: 2, category: 'clinical', title: 'Other quarter', occurrence_count: 10, impact: 4 },
  ];
  const render = () => require('react-dom/server').renderToStaticMarkup(clientModule.exports.SmartRiskProfile({ units: [{ id: 7, name: 'Unit 7' }], risks: rows }));
  let html = render();
  assert.ok(html.indexOf('<strong>Highest risk') < html.indexOf('<strong>Low risk'));
  assert.ok(!html.includes('Other quarter'));
  stateValues = ['', '2570', '1', 'clinical', '', { impact: 1, frequency: 1 }];
  html = render(); assert.ok(html.includes('<strong>Low risk')); assert.ok(!html.includes('<strong>Highest risk'));
  stateValues = ['', '2570', '1', 'clinical', 'Highest', null];
  html = render(); assert.ok(html.includes('<strong>Highest risk')); assert.ok(!html.includes('<strong>Low risk'));
  console.log('Smart Risk Profile access checks passed: login required, department required, scoped member queries, admin queries and database error.');
})().catch(error => { console.error(error); process.exitCode = 1; });
