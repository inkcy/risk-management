const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
process.chdir(path.resolve(__dirname, '..'));
function load(file, mocks = {}) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: mod.exports,
    require: name => name in mocks ? mocks[name] : load(path.resolve(path.dirname(file), name + '.ts'), mocks),
    fetch: async (url, request) => {
      calls.push(JSON.parse(request.body));
      const rows = matrix.calculateMatrix(calls.at(-1).items, calls.at(-1).options);
      return { ok: true, json: async () => ({ rows, advice: rows.map(row => ({ id: row.id, analysis: 'draft', actions: 'AI measures', followUp: 'monitor', reviewFrequency: 'monthly', transferPrevention: true, monitorControl: true, mitigation: false })) }) };
    }, AbortSignal,
  });
  return mod.exports;
}
const matrix = load('lib/matrix-analysis.ts');
const treatments = load('lib/matrix-treatment.ts');
let state = [], cursor = 0, calls = [];
const jsx = (type, props) => ({ type, props });
const { MatrixAiAnalysis } = load('components/MatrixAiAnalysis.tsx', {
  react: { useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; } },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  '@/lib/matrix-analysis': matrix, '@/lib/matrix-treatment': treatments,
  '@/lib/thai-date-time': { thaiDateTime: () => ({ occurred_at: '2026-11-06' }) },
});
const render = props => { cursor = 0; return MatrixAiAnalysis(props); };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return; }
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
(async () => {
  let tree = render({ aiEnabled: true });
  find(tree, n => n.type === 'textarea' && n.props.maxLength === 50000).props.onChange({ target: { value: 'Test\t\tE\t1' } });
  tree = render({ aiEnabled: true });
  await find(tree, n => n.type === 'button' && n.props.children === 'วิเคราะห์และเติมมาตรการด้วย AI').props.onClick();
  assert.equal(calls.length, 1);assert.equal(calls[0].items[0].title, 'Test');
  tree = render({ aiEnabled: true });
  assert.equal(find(tree, n => n.type === 'textarea' && n.props['aria-label'] === 'มาตรการรายการ 1').props.value, 'AI measures');
  state = [];calls = [];
  const props = { aiEnabled: true, profileItems: [{ title: 'Filtered', subtopic: '', severity: 'F', frequency: 2 }], profileOptions: { type: 'clinical', basis: 'year', year: 2570, quarter: 2 } };
  tree = render(props);
  await find(tree, n => n.type === 'button' && Array.isArray(n.props.children) && String(n.props.children[0]).startsWith('นำรายการตามตัวกรอง')).props.onClick();
  assert.equal(calls.length, 1);assert.equal(calls[0].items[0].title, 'Filtered');assert.equal(calls[0].options.basis, 'year');
  tree = render(props);
  assert.equal(find(tree, n => n.type === 'textarea' && n.props['aria-label'] === 'มาตรการรายการ 1').props.value, 'AI measures');
  state = [];calls = [];tree = render({ ...props, aiEnabled: false });
  await find(tree, n => n.type === 'button' && Array.isArray(n.props.children) && String(n.props.children[0]).startsWith('นำรายการตามตัวกรอง')).props.onClick();
  assert.equal(calls.length, 0);
  console.log('PASS: automatic AI after table import and filtered profile import, fresh request data, populated measures, and disabled AI');
})().catch(error => { console.error(error); process.exitCode = 1; });
