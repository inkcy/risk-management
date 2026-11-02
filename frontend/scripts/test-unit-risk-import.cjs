const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file) {
  const filename = path.resolve(file);
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

const { parseRiskText, extractUnitRisks } = load('lib/unitRiskImport.ts');
const { riskFrequency, unitRiskColors } = load('lib/unitRiskMatrix.ts');
const row = (title, total, cells) => [title, total, ...cells, ''].join('\t');
const metadata = 'ชื่อหน่วยงาน _ ทดสอบ ไตรมาสที่ 3 ประจำปีงบประมาณ 2569\t\n';
const numeric = parseRiskText(metadata + row('ความเสี่ยง', 4, ['', 1, 2, 1, '', '', '', '', '']));
assert.equal(numeric.items.reduce((sum, item) => sum + item.occurrence_count, 0), 4);
assert.deepEqual(numeric.items.map(item => item.impact), [1, 2]);
assert.equal(numeric.unitName, 'ทดสอบ');
for (const mark of ['(', '✓', '⁄', '∕']) {
  const result = parseRiskText(metadata + row('ผลกระทบ E', 2, ['', '', '', '', mark, '', '', '', '']));
  assert.equal(result.items[0].impact, 3);
  assert.equal(result.items[0].occurrence_count, 2);
  assert.equal(unitRiskColors.clinical[2][riskFrequency(2, 2569, 3).column - 1], 'orange');
}
const partial = parseRiskText(metadata + row('ถูกต้อง', 1, [1, '', '', '', '', '', '', '', '']) + '\n' + row('ยอดไม่ตรง', 9, [1, '', '', '', '', '', '', '', '']));
assert.equal(partial.items.length, 1);
assert.equal(partial.warnings.length, 1);

(async () => {
  for (const file of process.argv.slice(2)) {
    const result = await extractUnitRisks(fs.readFileSync(file), path.extname(file).slice(1));
    console.log(JSON.stringify({ file: path.basename(file), rows: result.sourceRows, total: result.items.reduce((sum, item) => sum + item.occurrence_count, 0), year: result.year, quarter: result.quarter, warnings: result.warnings }));
  }
  console.log('Unit risk import checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
