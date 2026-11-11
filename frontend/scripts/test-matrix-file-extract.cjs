const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const JSZip = require('jszip');

function load(file, mocks, extra = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, require: name => mocks[name], Buffer, console, process, File, AbortSignal, ...extra });
  return module.exports;
}

(async () => {
  const { extractSpreadsheetText } = load('lib/matrixSpreadsheet.ts', { jszip: JSZip });
  const zip = new JSZip();
  zip.file('xl/sharedStrings.xml', '<sst><si><t>ความเสี่ยง &amp; งาน</t></si><si><t>E</t></si></sst>');
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c><c r="D1"><v>2</v></c></row></sheetData></worksheet>');
  const workbook = await zip.generateAsync({ type: 'nodebuffer' });
  const extracted = await extractSpreadsheetText(workbook);
  assert.ok(extracted.includes('ความเสี่ยง & งาน\t\tE\t2'));

  let role = 'viewer';
  let modelPart;
  const json = (body, options = {}) => ({ body, status: options.status ?? 200 });
  const module = load('app/api/matrix/extract/route.ts', {
    'next/server': { NextResponse: { json } },
    '@/lib/auth': { requireRole: async () => role ? { ok: true, user: { id: 1 } } : { ok: false, response: json({}, { status: 401 }) } },
    '@/lib/matrixSpreadsheet': { extractSpreadsheetText },
    '@/lib/matrix-analysis': { calculateMatrix: items => { if (!Array.isArray(items) || items.some(item => !Number.isInteger(item.frequency))) throw new Error('invalid'); } },
  }, { fetch: async (_url, options) => { modelPart = JSON.parse(options.body).contents[0].parts[1]; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: [{ title: 'ความเสี่ยง', subtopic: '', severity: 'E', frequency: 2 }], warnings: [] }) }] } }] }) }; } });
  process.env.GEMINI_API_KEY = 'test-only';
  const options = { type: 'clinical', basis: 'quarter', year: 2569, quarter: 1 };
  const request = file => ({ headers: new Headers({ origin: 'https://example.test' }), nextUrl: { origin: 'https://example.test' }, formData: async () => ({ get: name => name === 'file' ? file : JSON.stringify(options) }) });
  role = null;
  assert.equal((await module.POST(request(new File([workbook], 'risk.xlsx')))).status, 401);
  role = 'viewer';
  assert.equal((await module.POST(request(new File([workbook], 'risk.xlsx')))).status, 200);
  assert.ok(modelPart.text.includes('ความเสี่ยง & งาน'));
  const image = new File([Buffer.from([137,80,78,71,13,10,26,10,1,2])], 'risk.png', { type: 'image/png' });
  assert.equal((await module.POST(request(image))).status, 200);
  assert.equal(modelPart.inlineData.mimeType, 'image/png');
  assert.equal((await module.POST(request(new File(['bad'], 'fake.png')))).status, 400);
  console.log('Matrix spreadsheet and image extraction checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
