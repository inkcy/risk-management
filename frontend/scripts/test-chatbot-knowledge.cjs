process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chatbotKnowledge.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { exports: mod.exports, require, process, console, Intl });
(async () => {
  const corpus = JSON.parse(fs.readFileSync('data/chatbot-knowledge.json', 'utf8'));
  assert.ok(corpus.length > 1000); assert.ok(corpus.some(item => item.source.endsWith('.xlsx'))); assert.ok(corpus.some(item => item.source.endsWith('.pptx'))); assert.ok(corpus.some(item => item.source.endsWith('.png')));
  const rca = await mod.exports.findKnowledge('RCA 5 Tier สืบสอบปัจจัยร่วม'); assert.ok(rca.length > 0); assert.ok(rca.some(item => /RCA|Tier|สืบสอบ/i.test(item.source + item.text)));
  const safety = await mod.exports.findKnowledge('Patient Safety Goals'); assert.ok(safety.some(item => /safety/i.test(item.source + item.text)));
  const coso = await mod.exports.findKnowledge('COSO ERM 2017'); assert.ok(coso.some(item => item.source.includes('สปสช.')));
  assert.equal((await mod.exports.findKnowledge('zqxwivnonsenseterm')).length, 0);
  console.log('PASS: supplied source corpus, Thai/English retrieval and no-match handling');
})().catch(error => { console.error(error); process.exitCode = 1; });
