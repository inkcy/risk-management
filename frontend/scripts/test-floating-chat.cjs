process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
let pathname = '/dashboard';
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/FloatingRiskChat.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod.exports, require: name => name === 'next/navigation' ? { usePathname: () => pathname } : name === './RiskChatbot' ? { RiskChatbot: () => React.createElement('p', null, 'chat content') } : require(name), console });
const view = () => renderToStaticMarkup(React.createElement(mod.exports.FloatingRiskChat));
assert.match(view(), /aria-expanded="false"/); assert.match(view(), /aria-label="Chatbot ผู้ช่วยบริหารความเสี่ยง"/); assert.match(view(), /hidden=""/);
pathname = '/report'; assert.match(view(), /✦ Chatbot/); pathname = '/chatbot'; assert.equal(view(), '');
console.log('PASS: floating chat launcher renders on app pages and avoids duplicating the full chatbot page');
