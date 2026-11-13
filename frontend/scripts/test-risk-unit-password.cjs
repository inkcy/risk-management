process.chdir(require('node:path').resolve(__dirname,'..'));
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let allowed=true,calls=0,hashes=0;
const json=(body,opts={})=>({body,status:opts.status??200});
function load(file){const mod={exports:{}};const mocks={'next/server':{NextResponse:{json}},'@/lib/auth':{requireRole:async()=>allowed?{ok:true,user:{id:1}}:{ok:false,response:json({error:'Unauthorized'},{status:401})},audit:async()=>{}},'@/lib/db':{query:async()=>{calls++;return {rows:[{id:1}],rowCount:1}}},'@/lib/riskUnitAuth':{hashUnitPassword:async()=>{hashes++;return 'test-hash'}},'@/lib/riskUnitDirectory':{riskUnitDirectory:['Test Unit']}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,require:name=>name==='node:crypto'?require(name):mocks[name],console});return mod.exports;}
const admin=load('app/api/risk-units/route.ts'),signup=load('app/api/risk-units/signup/route.ts');
const request=(password)=>({json:async()=>({name:'Test Unit',username:'testuser',id:1,password})});
(async()=>{
 for(const endpoint of [admin.POST,admin.PATCH,signup.POST]){
  for(const length of [0,6,129]){const previous=calls;assert.equal((await endpoint(request('a'.repeat(length)))).status,400);assert.equal(calls,previous);}
  for(const length of [7,12,128])assert.ok([200,201].includes((await endpoint(request('a'.repeat(length)))).status));
  allowed=false;const previous=calls;assert.equal((await endpoint(request('a'.repeat(7)))).status,401);assert.equal(calls,previous);allowed=true;
 }
 assert.equal(hashes,9);
 console.log('PASS: create, signup and reset accept 7–128 characters; shorter/longer passwords rejected before DB access; auth retained');
})().catch(error=>{console.error(error);process.exitCode=1});
