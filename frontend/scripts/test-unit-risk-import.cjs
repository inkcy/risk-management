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
for (const [column, color] of ['green','yellow','orange','red'].entries()) {
  const analysis = Array(4).fill(''); analysis[column] = '√';
  const result = parseRiskText('Risk Analysis\t\n' + metadata + row('แยกผลกระทบ', 4, ['', 1, 2, 1, '', '', '', '', '']) + analysis.join('\t') + '\t');
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every(item => item.source_analysis_level === color && item.source_title === 'แยกผลกระทบ'));
}

(async () => {
  for (const file of process.argv.slice(2)) {
    const result = await extractUnitRisks(fs.readFileSync(file), path.extname(file).slice(1));
    if (path.basename(file) === 'clinical risk ER ไตรมาส4 ปี 69 051069.doc') {
      const sourceRows = [...new Map(result.items.map(item => [item.source_title, item.source_analysis_level])).values()];
      assert.equal(result.sourceRows, 10); assert.equal(result.quarter, 4); assert.equal(result.year, 2569);
      assert.deepEqual(['green','yellow','orange','red'].map(color => sourceRows.filter(level => level === color).length), [1,5,4,0]);
      assert.equal(result.items.reduce((sum, item) => sum + item.occurrence_count, 0), 173);
      console.log('ER source Risk Analysis verified: low 1, moderate 5, high 4, very high 0; total 173 occurrences.');
    }
    console.log(JSON.stringify({ file: path.basename(file), rows: result.sourceRows, total: result.items.reduce((sum, item) => sum + item.occurrence_count, 0), year: result.year, quarter: result.quarter, warnings: result.warnings }));
  }
  console.log('Unit risk import checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
