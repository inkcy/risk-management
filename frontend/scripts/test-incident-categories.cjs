const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const categories={exports:{}};
vm.runInNewContext(compile('lib/incident-categories.ts'),{exports:categories.exports});
const {incidentRiskGroup,incidentCategories,categoryLabel}=categories.exports;
for(const category of ['blood','medication','fall','procedure','communication','other'])assert.equal(incidentRiskGroup(category),'clinical');
for(const category of ['traffic','environment','natural_disaster','corruption'])assert.equal(incidentRiskGroup(category),'nonclinical');
assert.equal(incidentRiskGroup('unknown'),'');
assert.equal(incidentCategories.length,17);
for(const {value} of incidentCategories.filter(c=>c.value.startsWith('complaint_')))assert.equal(incidentRiskGroup(value),'clinical');
const severity={exports:{}};
vm.runInNewContext(compile('lib/incident-severity.ts'),{exports:severity.exports,require:()=>categories.exports});
let inserted=[],role='editor';
const json=(body,options={})=>({body,status:options.status??200});
const mod={exports:{}};
const mocks={
 'next/server':{NextResponse:{json}},
 '@/lib/auth':{requireRole:async()=>role==='editor'?{ok:true,user:{name:'Tester'}}:{ok:false,response:json({error:'Forbidden'},{status:403})},audit:async()=>{}},
 '@/lib/db':{query:async(sql,params)=>{assert.ok(sql.includes('INSERT INTO incidents'));inserted.push(params[5]);return {rows:[{id:1,category:params[5]}]};}},
 '@/lib/incident-categories':categories.exports,
 '@/lib/incident-severity':severity.exports,
 '@/lib/incidentOtherDetail':{ensureIncidentOtherDetail:async()=>{}},
 '@/lib/riskUnitDirectory':{riskUnitDirectory:[]},
 '@/lib/envelope':{},'@/lib/demo':{},
};
vm.runInNewContext(compile('app/api/incidents/route.ts'),{exports:mod.exports,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name];},console});
const post=(category,level=incidentRiskGroup(category)==='clinical'?'A':'1',other_detail=category==='other'?'ทดสอบ':'')=>mod.exports.POST({json:async()=>({ir_code:'TEST',occurred_at:'2026-11-06T12:00:00+07:00',title:'Test',category,severity:level,unit_id:1,other_detail})});
(async()=>{
 for(const {value} of incidentCategories){const response=await post(value);assert.equal(response.status,201);assert.equal(response.body.incident.category,value);assert.ok(categoryLabel[value]);}
 assert.equal(inserted.length,17);
 assert.equal((await post('unknown')).status,400);
 assert.equal((await post('other','A','')).status,400);
 assert.equal(categories.exports.incidentCategoryParts('other','ทดสอบ').subtype,'อื่นๆ · ทดสอบ');
 assert.equal(categories.exports.incidentCategoryParts('other',null).subtype,'อื่นๆ');
 assert.equal(inserted.length,17);
 for(const {value} of incidentCategories.filter(c=>c.value.startsWith('complaint_'))){
  for(const level of ['A','B','C','D','E','F','G','H','I'])assert.equal((await post(value,level)).status,201);
  assert.equal((await post(value,'1')).status,400);
 }
 role='viewer';assert.equal((await post('traffic')).status,403);
 console.log('PASS: clinical and nonclinical categories, complaint A–I severity, invalid categories and permissions');
})().catch(error=>{console.error(error);process.exitCode=1;});
