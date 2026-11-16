process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const state = [], listeners = {}, scrolls = []; let cursor = 0, reduce = false;
const jsx = (type, props) => ({ type, props });
const mocks = {
  react: { useState: initial => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = value; }]; }, useEffect: effect => effect() },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/navigation': { useRouter: () => ({ refresh() {} }) },
};
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/RiskSubmissionForm.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: mod.exports, require: name => mocks[name],
  window: { addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {}, matchMedia: () => ({ matches: reduce }) },
  document: { getElementById: id => id === 'risk-profile-confirmation' ? { scrollIntoView: value => scrolls.push(value) } : null },
});
const render = props => { cursor = 0; return mod.exports.RiskSubmissionForm(props); };
const props = { unit: { id: 1, name: 'Admin' }, selectableUnits: [{ id: 1, name: 'Admin' }, { id: 2, name: 'หน่วยทดสอบ' }], submissions: [] };
render(props);
listeners['risk-profile-import-saved']({ detail: { unitId: 2, year: 2569, quarter: 3 } });
assert.equal(state[0], 2); assert.equal(state[1], 2569); assert.equal(state[2], 3); assert.equal(scrolls.length, 1); assert.equal(scrolls[0].behavior, 'smooth');
listeners['risk-profile-import-saved']({ detail: { unitId: 99, year: 2569, quarter: 3 } });
assert.equal(state[0], 2); assert.equal(scrolls.length, 1);
reduce = true; listeners['risk-profile-import-saved']({ detail: { unitId: 1, year: 2570, quarter: 4 } });
assert.equal(scrolls[1].behavior, 'auto');
cursor = 0; state.length = 0; render({ unit: { id: 2, name: 'หน่วยทดสอบ' }, submissions: [] });
listeners['risk-profile-import-saved']({ detail: { unitId: 1, year: 2569, quarter: 1 } });
assert.equal(state[0], 2); assert.equal(scrolls.length, 2);
console.log('PASS: saved imports select the correct unit and period, respect reduced motion and reject other units');
