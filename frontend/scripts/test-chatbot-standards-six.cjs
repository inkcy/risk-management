process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chatbotKnowledge.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { exports: mod.exports, require, process, console, Intl });
(async () => {
  const cases = [
    ['มาตรฐานโรงพยาบาลฉบับที่ 6 การป้องกันและควบคุมการติดเชื้อ', 'ป้องกันและควบคุมการติดเชื้อ'],
    ['มาตรฐานโรงพยาบาลฉบับที่ 6 ระบบการจัดการด้านยา', 'การจัดการด้านยา'],
    ['มาตรฐานโรงพยาบาลฉบับที่ 6 ระบบเวชระเบียน', 'ระบบเวชระเบียน'],
  ];
  for (const [question, topic] of cases) {
    const found = await mod.exports.findKnowledge(question);
    assert.equal(found[0]?.source, 'มาตรฐาน รพ.ฉบับ6.pdf', question);
    assert.ok(Number(found[0].location.match(/\d+/)?.[0]) > 25, `${question}: first result is front matter`);
    assert.ok(found[0].text.slice(0, 500).includes(topic), `${question}: first result does not cover the topic`);
  }
  const tier = await mod.exports.findKnowledge('ตัวอย่าง 5 tier ปัจจัยสภาพแวดล้อมทางกายภาพ');
  assert.ok(tier.some(item => item.source === 'ตัวอย่าง 5tier.docx' && item.location.startsWith('3rd Tier')));
  console.log('PASS: edition 6 detailed pages rank first and the 5 Tier example is retrievable');
})().catch(error => { console.error(error); process.exitCode = 1; });
