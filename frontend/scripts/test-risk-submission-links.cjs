process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports: mod.exports, require: name => name in mocks ? mocks[name] : require(name), Date, console });
  return mod.exports;
}
const { RiskSubmissionOverview } = load('components/RiskSubmissionOverview.tsx');
const year = new Date().getFullYear() + 543 + (new Date().getMonth() >= 9 ? 1 : 0);
const html = renderToStaticMarkup(React.createElement(RiskSubmissionOverview, { units: [{ id: 4, name: 'หน่วยทดสอบ' }, { id: 9, name: 'หน่วยอื่น' }], risks: [], submissions: [{ unit_id: 4, year, quarter: 3 }] }));
assert.match(html, new RegExp(`unit=4&amp;year=${year}&amp;quarter=3#risk-profile-details`));
assert.equal((html.match(/#risk-profile-details/g) || []).length, 1);
assert.match(html, /ค้นหาหน่วยงาน/);
const { UnitRiskProfiles } = load('components/UnitRiskProfiles.tsx', { 'next/navigation': { useRouter: () => ({ refresh() {} }) }, '@/lib/unitRiskMatrix': { riskFrequency: () => ({ column: 1, annualRate: 0 }), unitRiskColors: { clinical: Array.from({ length: 5 }, () => Array(5).fill('green')) } }, '@/lib/riskTitle': { riskKeyword: value => value } });
const details = renderToStaticMarkup(React.createElement(UnitRiskProfiles, { units: [{ id: 4, name: 'หน่วยทดสอบ' }, { id: 9, name: 'หน่วยอื่น' }], risks: [], canLogout: false, initialPeriod: { unitId: 9, year: 2569, quarter: 3 } }));
assert.match(details, /id="risk-profile-details"/); assert.match(details, /value="9" selected=""/); assert.match(details, /value="2569"/); assert.match(details, /value="3" selected=""/);
console.log('PASS: only submitted quarters link to the correct unit and period; details select that unit, year and quarter');
