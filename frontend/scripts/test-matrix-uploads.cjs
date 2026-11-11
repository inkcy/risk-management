const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

let authUser = 1;
const uploads = new Map();
const chunks = new Map();
const client = {
  release() {},
  async query(sql, params = []) {
    if (/^(BEGIN|COMMIT|ROLLBACK|SELECT pg_advisory|DELETE FROM matrix_file_uploads WHERE expires_at)/.test(sql)) return { rows: [] };
    if (sql.startsWith('SELECT count(*)')) return { rows: [{ count: String([...uploads.values()].filter(row => row.user_id === params[0]).length) }] };
    if (sql.startsWith('INSERT INTO matrix_file_uploads')) { uploads.set(params[0], { user_id: params[1], filename: params[2], size: params[3], received: 0 }); return { rows: [] }; }
    if (sql.startsWith('SELECT size,received')) { const row = uploads.get(params[0]); return { rows: row && row.user_id === params[1] ? [row] : [] }; }
    if (sql.startsWith('SELECT filename,size,received')) { const row = uploads.get(params[0]); return { rows: row && row.user_id === params[1] ? [row] : [] }; }
    if (sql.startsWith('INSERT INTO matrix_file_chunks')) { const list = chunks.get(params[0]) ?? []; list.push({ offset_bytes: params[1], content: params[2] }); chunks.set(params[0], list); return { rows: [] }; }
    if (sql.startsWith('UPDATE matrix_file_uploads SET received')) { uploads.get(params[1]).received = params[0]; return { rows: [] }; }
    if (sql.startsWith('SELECT content,offset_bytes')) return { rows: (chunks.get(params[0]) ?? []).slice().sort((a,b) => a.offset_bytes-b.offset_bytes) };
    if (sql.startsWith('DELETE FROM matrix_file_uploads WHERE id=')) { uploads.delete(params[0]); chunks.delete(params[0]); return { rows: [] }; }
    throw new Error(`unexpected SQL ${sql}`);
  },
};
const db = { query: async () => ({ rows: [] }), getPool: () => ({ connect: async () => client }) };
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, require: name => mocks[name], Buffer, console, Number });
  return module.exports;
}
const uploadsLib = load('lib/matrixUploads.ts', { '@/lib/db': db });
const json = (body, options = {}) => ({ body, status: options.status ?? 200 });
const route = load('app/api/matrix/uploads/route.ts', {
  'node:crypto': crypto, 'next/server': { NextResponse: { json } },
  '@/lib/db': db, '@/lib/matrixUploads': uploadsLib,
  '@/lib/auth': { requireRole: async () => ({ ok: true, user: { id: authUser } }) },
});
const request = (headers, body) => ({ headers: new Headers({ origin: 'https://example.test', ...headers }), nextUrl: { origin: 'https://example.test', searchParams: new URLSearchParams() }, json: async () => body, arrayBuffer: async () => body });

(async () => {
  const started = await route.POST(request({}, { name: 'risk.docx', size: 6 }));
  assert.equal(started.status, 200);
  const id = started.body.id;
  assert.equal((await route.PUT(request({ 'x-upload-id': id, 'x-upload-offset': '3' }, Uint8Array.from([1,2,3])))).status, 409);
  assert.equal((await route.PUT(request({ 'x-upload-id': id, 'x-upload-offset': '0' }, Uint8Array.from([1,2,3])))).status, 200);
  authUser = 2;
  assert.equal((await route.PUT(request({ 'x-upload-id': id, 'x-upload-offset': '3' }, Uint8Array.from([4,5,6])))).status, 409);
  await assert.rejects(uploadsLib.consumeMatrixUpload(id, 2));
  authUser = 1;
  assert.equal((await route.PUT(request({ 'x-upload-id': id, 'x-upload-offset': '3' }, Uint8Array.from([4,5,6])))).status, 200);
  const result = await uploadsLib.consumeMatrixUpload(id, 1);
  assert.deepEqual([...result.data], [1,2,3,4,5,6]);
  await assert.rejects(uploadsLib.consumeMatrixUpload(id, 1));
  assert.equal((await route.POST(request({}, { name: 'large.xlsx', size: 21 * 1024 * 1024 }))).status, 400);
  console.log('Chunk upload ownership, ordering, size and consumption checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
