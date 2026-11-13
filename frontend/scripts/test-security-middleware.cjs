const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const mod = { exports: {} };
const mocks = { 'next/server': { NextResponse: { json: (_body, options) => ({status: options.status}), next: () => ({status:200}), redirect: () => ({status:307}) } }, '@/lib/session': { SESSION_COOKIE:'rm_session', verifyValue: async () => null } };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('middleware.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText, { exports:mod.exports, require:name=>mocks[name] || require(name), process:{env:{}}, Headers });
const request = (method, origin, pathname='/api/auth/department') => ({ method, headers:new Headers(origin?{origin}:{}), nextUrl:{pathname, origin:'https://hospital.test'}, cookies:{get:()=>undefined} });
(async()=>{
  assert.equal((await mod.exports.middleware(request('POST','https://evil.test'))).status,403);
  assert.equal((await mod.exports.middleware(request('POST',null))).status,403);
  assert.equal((await mod.exports.middleware(request('POST','https://hospital.test'))).status,200);
  assert.equal((await mod.exports.middleware(request('GET',null))).status,200);
  console.log('PASS: API writes reject cross-origin and missing-origin requests');
})().catch(error=>{console.error(error);process.exitCode=1;});
