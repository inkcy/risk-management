const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const categories={exports:{}};
vm.runInNewContext(compile('lib/incident-categories.ts'),{exports:categories.exports});
const {incidentRiskGroup,incidentCategories,categoryLabel}=categories.exports;
for(const category of ['blood','medication','fall','procedure','communication','other'])assert.equal(incidentRiskGroup(category),'clinical');
for(const category of ['traffic','environment','natural_disaster','corruption'])assert.equal(incidentRiskGroup(category),'nonclinical');
assert.equal(incidentRiskGroup('unknown'),'');
assert.equal(incidentCategories.length,10);
let inserted=[],role='editor';
const json=(body,options={})=>({body,status:options.status??200});
const mod={exports:{}};
const mocks={
 'next/server':{NextResponse:{json}},
 '@/lib/auth':{requireRole:async()=>role==='editor'?{ok:true,user:{name:'Tester'}}:{ok:false,response:json({error:'Forbidden'},{status:403})},audit:async()=>{}},
 '@/lib/db':{query:async(sql,params)=>{assert.ok(sql.includes('INSERT INTO incidents'));inserted.push(params[5]);return {rows:[{id:1,category:params[5]}]};}},
 '@/lib/incident-categories':categories.exports,
 '@/lib/riskUnitDirectory':{riskUnitDirectory:[]},
 '@/lib/envelope':{},'@/lib/demo':{},
};
vm.runInNewContext(compile('app/api/incidents/route.ts'),{exports:mod.exports,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name];},console});
const post=category=>mod.exports.POST({json:async()=>({ir_code:'TEST',occurred_at:'2026-11-06T12:00:00+07:00',title:'Test',category,severity:'A',unit_id:1})});
(async()=>{
 for(const {value} of incidentCategories){const response=await post(value);assert.equal(response.status,201);assert.equal(response.body.incident.category,value);assert.ok(categoryLabel[value]);}
 assert.equal(inserted.length,10);
 assert.equal((await post('unknown')).status,400);
 assert.equal(inserted.length,10);
 role='viewer';assert.equal((await post('traffic')).status,403);
 console.log('PASS: both risk groups, all 10 category saves, invalid categories and permissions');
})().catch(error=>{console.error(error);process.exitCode=1;});
