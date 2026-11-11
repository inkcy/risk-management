process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), React = require('react');
let user, result, calls;
const SnapshotView = () => null;
const mocks = {
  'next/navigation': { redirect: path => { throw new Error('redirect:' + path); } },
  '@/lib/auth': { getSessionUser: async () => user },
  '@/lib/db': { dbConfigured: () => true, query: async (sql, args) => { calls.push({ sql, args }); return { rows: result ? [result] : [] }; } },
  '@/lib/riskSubmissions': { ensureRiskSubmissions: async () => {} },
  '@/components/UnitRiskProfiles': { UnitRiskProfiles: SnapshotView },
};
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/risk-profile/submission/page.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: mod.exports, require: name => mocks[name] || require(name), console, Date });
const render = (unit = '7', year = '2569', quarter = '3') => mod.exports.default({ searchParams: Promise.resolve({ unit, year, quarter }) });
function components(node) { if (!React.isValidElement(node)) return []; return [node, ...React.Children.toArray(node.props.children).flatMap(components)]; }
(async () => {
  calls = []; user = null; await assert.rejects(render(), /redirect:\/login/); assert.equal(calls.length, 0);
  user = { role: 'editor' }; await assert.rejects(render(), /redirect:\/risk-profile/); assert.equal(calls.length, 0);
  user = { role: 'admin' }; result = { submitted_at: '2026-01-01T00:00:00Z', snapshot: { unitName: 'ชื่อ ณ วันที่ส่ง', risks: [{ id: 4, title: 'ข้อมูลที่ส่งจริง' }] } };
  const page = await render(); const view = components(page).find(node => node.type === SnapshotView);
  assert.ok(view); assert.equal(view.props.readOnly, true); assert.equal(view.props.risks[0].title, 'ข้อมูลที่ส่งจริง'); assert.equal(view.props.units[0].name, 'ชื่อ ณ วันที่ส่ง');
  assert.deepEqual(Array.from(calls[0].args), [7, 2569, 3]); assert.match(calls[0].sql, /FROM risk_profile_submissions/); assert.doesNotMatch(calls[0].sql, /FROM unit_risks/);
  result = { submitted_at: '2026-01-01T00:00:00Z', snapshot: null }; assert.ok(!components(await render()).some(node => node.type === SnapshotView));
  const count = calls.length; await render('7', '2569', '5'); assert.equal(calls.length, count);
  console.log('PASS: snapshot page is admin-only, loads the submitted record and never substitutes live risks for old submissions');
})().catch(error => { console.error(error); process.exitCode = 1; });
