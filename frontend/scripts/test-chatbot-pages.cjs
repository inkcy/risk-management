process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let allowed = true;
const mocks = { 'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200 }) } }, '@/lib/auth': { requireRole: async () => allowed ? { ok: true } : { ok: false, response: { status: 401 } } } };
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/chatbot/pages/[id]/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { exports: mod.exports, require: name => mocks[name] || require(name), process, console, Response, Uint8Array });
(async () => {
  const index = JSON.parse(fs.readFileSync('data/chatbot-page-visuals.json', 'utf8'));
  const pair = Object.entries(index).find(([, item]) => item.source.includes('HA Forum 260311') && item.location === 'หน้า 3');
  assert.ok(pair, 'RCA reference page is indexed');
  const [id] = pair;
  const call = value => mod.exports.GET({}, { params: Promise.resolve({ id: value }) });
  allowed = false; assert.equal((await call(id)).status, 401); allowed = true;
  assert.equal((await call('../secret')).status, 404); assert.equal((await call('000000000000000000000000')).status, 404);
  const page = await call(id); assert.equal(page.status, 200); assert.equal(page.headers.get('content-type'), 'image/jpeg'); assert.equal(page.headers.get('cache-control'), 'private, no-store'); assert.ok((await page.arrayBuffer()).byteLength > 100);
  console.log('PASS: cited PDF page opens privately; invalid and unauthorized requests are blocked');
})().catch(error => { console.error(error); process.exitCode = 1; });
