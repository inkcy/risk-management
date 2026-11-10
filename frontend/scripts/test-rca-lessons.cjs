const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let role = 'admin';
let writes = 0;
const json = (body, options = {}) => ({ body, status: options.status ?? 200 });
const modules = {
  'next/server': { NextResponse: { json } },
  '@/lib/auth': { requireRole: async () => role === 'admin' ? { ok: true, user: { id: 1 } } : { ok: false, response: json({}, { status: 403 }) }, audit: async () => {} },
  '@/lib/db': { query: async () => { writes++; return { rowCount: 1, rows: [{ id: 1 }] }; } },
  '@/lib/rcaLessons': { ensureRcaLessons: async () => {} },
};
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('app/api/rca-lessons/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(source, { exports: mod.exports, require: name => modules[name], console });
const request = body => ({ json: async () => body, nextUrl: new URL('https://example.test/?id=1') });

(async () => {
  role = 'viewer';
  assert.equal((await mod.exports.POST(request({ year: 2569, title: 'x', image: 'data:image/png;base64,YQ==' }))).status, 403);
  assert.equal((await mod.exports.DELETE(request({}))).status, 403);
  assert.equal(writes, 0);
  role = 'admin';
  assert.equal((await mod.exports.POST(request({ year: 2569, title: 'x', image: 'data:image/svg+xml;base64,YQ==' }))).status, 400);
  assert.equal((await mod.exports.POST(request({ year: 2569, title: 'x', image: 'data:image/png;base64,YQ==' }))).status, 200);
  assert.equal((await mod.exports.PATCH(request({ id: 1, year: null, title: 'updated' }))).status, 200);
  assert.equal((await mod.exports.DELETE(request({}))).status, 200);
  assert.equal(writes, 3);
  console.log('RCA lesson permission and CRUD checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

