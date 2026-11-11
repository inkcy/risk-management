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
      if(apiError)return {ok:false,json:async()=>({error:'AI unavailable'})};
      const rows = matrix.calculateMatrix(calls.at(-1).items, calls.at(-1).options);
      return { ok: true, json: async () => ({ rows, advice: rows.map(row => ({ id: row.id, analysis: 'draft', actions: 'AI measures', followUp: 'monitor', reviewFrequency: 'monthly', transferPrevention: true, monitorControl: true, mitigation: false })) }) };
    }, AbortSignal, window: {matchMedia:()=>({matches:reducedMotion})},
  });
  return mod.exports;
}
const matrix = load('lib/matrix-analysis.ts');
const treatments = load('lib/matrix-treatment.ts');
let state = [], cursor = 0, calls = [], refs=[], refCursor=0, effects=[], scrolls=[], apiError=false, reducedMotion=false;
const jsx = (type, props) => ({ type, props });
const { MatrixAiAnalysis } = load('components/MatrixAiAnalysis.tsx', {
  react: { useRef: initial => refs[refCursor++] ?? (refs[refCursor-1]={current:initial}), useEffect: effect=>effects.push(effect), useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; } },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  '@/lib/matrix-content': load('lib/matrix-content.ts'), '@/lib/matrix-analysis': matrix, '@/lib/matrix-treatment': treatments,
  '@/lib/thai-date-time': { thaiDateTime: () => ({ occurred_at: '2026-11-06' }) },
});
const render = props => {
 cursor=0;refCursor=0;effects=[];
 const tree=MatrixAiAnalysis(props);
 const actions=find(tree,node=>node.props?.['aria-label']==='ส่งออกผลการวิเคราะห์');
 if(actions)actions.props.ref.current={scrollIntoView:options=>scrolls.push(options)};
 effects.forEach(effect=>effect());
 return tree;
};
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
  await find(tree, n => n.type === 'button' && n.props.children === 'วิเคราะห์ด้วย AI').props.onClick();
  assert.equal(calls.length, 1);assert.equal(calls[0].items[0].title, 'Test');
  assert.equal(scrolls.length,0);
  tree = render({ aiEnabled: true });
  assert.equal(scrolls.length,1);assert.equal(scrolls[0].behavior,'smooth');
  const section=find(tree,n=>n.props?.className==='matrix-treatment');
  const actions=find(section,n=>n.props?.['aria-label']==='ส่งออกผลการวิเคราะห์');
  assert.ok(section.props.children.indexOf(actions)>section.props.children.findIndex(child=>find(child,n=>n.type==='table')));
  render({aiEnabled:true});assert.equal(scrolls.length,1);
  assert.equal(find(tree, n => n.type === 'textarea' && n.props['aria-label'] === 'มาตรการรายการ 1').props.value, 'AI measures');
  apiError=true;
  await find(tree,n=>n.type==='button'&&n.props.children==='วิเคราะห์ด้วย AI').props.onClick();
  tree=render({aiEnabled:true});assert.equal(scrolls.length,1);assert.ok(find(tree,n=>n.type==='textarea'&&n.props['aria-label']==='มาตรการรายการ 1').props.value.includes('มอบหมายผู้รับผิดชอบ'));apiError=false;
  state = [];calls = [];scrolls=[];reducedMotion=true;
  const props = { aiEnabled: true, profileItems: [{ title: 'Filtered', subtopic: '', severity: 'F', frequency: 2 }], profileOptions: { type: 'clinical', basis: 'year', year: 2570, quarter: 2 } };
  tree = render(props);
  await find(tree, n => n.type === 'button' && Array.isArray(n.props.children) && String(n.props.children[0]).startsWith('นำรายการตามตัวกรอง')).props.onClick();
  assert.equal(calls.length, 1);assert.equal(calls[0].items[0].title, 'Filtered');assert.equal(calls[0].options.basis, 'year');
  tree = render(props);
  assert.equal(scrolls.length,1);assert.equal(scrolls[0].behavior,'auto');
  assert.equal(find(tree, n => n.type === 'textarea' && n.props['aria-label'] === 'มาตรการรายการ 1').props.value, 'AI measures');

  state=[];calls=[];scrolls=[];
  tree=render({aiEnabled:true});
  find(tree,n=>n.type==='textarea'&&n.props.maxLength===50000).props.onChange({target:{value:'รหัส: เรื่อง\tเรื่องย่อย\tความรุนแรง\nCPM201:Medication error\tCPM201.1 HAD\tE\nCPL101:re-intubation\t\tE'}});
  tree=render({aiEnabled:true});
  await find(tree,n=>n.type==='button'&&n.props.children==='วิเคราะห์ด้วย AI').props.onClick();
  assert.equal(calls.length,1);assert.equal(calls[0].items[0].frequency,0);assert.equal(calls[0].items[1].frequency,0);
  tree=render({aiEnabled:true});assert.equal(scrolls.length,1);
  assert.equal(find(tree,n=>n.type==='input'&&n.props['aria-label']==='ความถี่รายการ 1').props.value,0);
  state = [];calls = [];scrolls=[];tree = render({ ...props, aiEnabled: false });
  await find(tree, n => n.type === 'button' && Array.isArray(n.props.children) && String(n.props.children[0]).startsWith('นำรายการตามตัวกรอง')).props.onClick();
  assert.equal(calls.length, 0);tree=render({...props,aiEnabled:false});assert.equal(scrolls.length,0);assert.ok(find(tree,n=>n.type==='textarea'&&n.props['aria-label']==='มาตรการรายการ 1').props.value);assert.ok(find(tree,n=>n.type==='input'&&n.props['aria-label']==='ความถี่ทบทวนรายการ 1').props.value);
  console.log('PASS: automatic AI after table import and filtered profile import, fresh request data, populated measures, and disabled AI');
})().catch(error => { console.error(error); process.exitCode = 1; });
