// Optional remote integration check: Vercel supplies the sensitive key at build time.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports: mod.exports, require: name => load(path.resolve(path.dirname(file), name + '.ts')), process, fetch, AbortSignal, console });
  return mod.exports;
}
const { calculateMatrix } = load('lib/matrix-analysis.ts');
const { analyzeMatrixRisks } = load('lib/matrix-ai.ts');
const rows = calculateMatrix([
  { title: 'CPE405: Delay Diagnosis and Delay treatment ในผู้ป่วยฉุกเฉินและผู้ป่วย Fast Track', subtopic: '', severity: 'E', frequency: 1 },
  { title: 'CPP401: ผู้ป่วยเกิดภาวะแทรกซ้อนจากกระบวนการดูแลรักษาพยาบาลซึ่งป้องกันได้', subtopic: '', severity: 'F', frequency: 1 },
], { type: 'clinical', basis: 'quarter', year: 2570, quarter: 1 });
analyzeMatrixRisks(rows).then(advice => {
  console.log(JSON.stringify({ matrixAiVerified: true, rows: advice.length, results: rows.map(row => ({ severity: row.severity, score: row.score, color: row.color })) }));
}).catch(error => { console.error('Matrix AI integration check failed:', error.message); process.exitCode = 1; });
