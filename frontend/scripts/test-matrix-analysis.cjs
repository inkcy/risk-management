const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const path=require('node:path');
function moduleAt(file,mocks={}){const mod={exports:{}};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{exports:mod.exports,require:name=>name in mocks?mocks[name]:moduleAt(path.resolve(path.dirname(file),name+'.ts'),mocks),console,process:{env:{GEMINI_API_KEY:"test"}},fetch,AbortSignal,Buffer});return mod.exports;}
const matrix=moduleAt('lib/matrix-analysis.ts');
const date=moduleAt('lib/thai-date-time.ts');
assert.equal(JSON.stringify(date.thaiDateTime(new Date('2026-11-05T17:08:00Z'))),JSON.stringify({occurred_at:'2026-11-06',time:'00:08'}));
const input='| | รหัส: เรื่อง | เรื่องย่อย | ความรุนแรง | ความถี่ |\n| - | - | - | - | - |\n| | CPE405: Delay Diagnosis | | E | 1 |\n| | CPP401: Complications | | F | 1 |';
const items=matrix.parseMatrixTable(input);assert.equal(items.length,2);assert.equal(items[0].title,'CPE405: Delay Diagnosis');assert.equal(items[0].subtopic,'');
const options={type:'clinical',basis:'quarter',year:2570,quarter:1};
const rows=matrix.calculateMatrix(items,options);assert.equal(JSON.stringify(rows.map(r=>[r.impact,r.likelihood,r.score,r.color])),JSON.stringify([[3,3,9,'orange'],[4,3,12,'red']]));
assert.equal(matrix.parseMatrixTable('รหัส: เรื่อง\tเรื่องย่อย\tความรุนแรง\tความถี่\nCPE405\tFast Track\tE\t1')[0].subtopic,'Fast Track');
assert.throws(()=>matrix.parseMatrixTable('Unknown\tE\tnot-a-number'));
assert.throws(()=>matrix.parseMatrixTable('CPE405\tE\t1\nUnparsed data'));
for(const [type,severities] of [['clinical',['A','C','E','F','I']],['nonclinical',['1','2','3','4','5']]])for(let i=0;i<5;i++)for(let l=1;l<=5;l++){const result=matrix.calculateMatrix([{title:'Test',subtopic:'',severity:severities[i],frequency:l}],{...options,type,basis:'level'})[0];assert.equal(result.impact,i+1);assert.equal(result.likelihood,l);assert.equal(result.score,(i+1)*l);}
assert.equal(matrix.calculateMatrix(items,{...options,basis:'year'})[0].likelihood,2);
assert.equal(matrix.calculateMatrix([{title:'Test',subtopic:'',severity:'5',frequency:3}],{...options,type:'nonclinical',basis:'level'})[0].color,'orange');
for(const bad of [-1,0.5,NaN,Infinity])assert.throws(()=>matrix.calculateMatrix([{...items[0],frequency:bad}],options));
assert.throws(()=>matrix.calculateMatrix(items,{...options,type:'nonclinical'}));
assert.throws(()=>matrix.calculateMatrix([{...items[0],frequency:0}],{...options,basis:'level'}));
let allowed=false,aiCalls=0,failAi=false;
const json=(body,opts={})=>({body,status:opts.status??200});
const api=moduleAt('app/api/matrix/analyze/route.ts',{
 'next/server':{NextResponse:{json}},
 '@/lib/auth':{requireRole:async()=>allowed?{ok:true,user:{role:'viewer'}}:{ok:false,response:json({error:'Unauthorized'},{status:401})}},
 '@/lib/matrix-analysis':matrix,
 '@/lib/matrix-ai':{analyzeMatrixRisks:async data=>{aiCalls++;if(failAi)throw Error('Unavailable');return data.map(row=>({id:row.id,analysis:'Draft',actions:'Review',followUp:'Monitor'}));}},
});
const request=body=>({text:async()=>JSON.stringify(body)});
(async()=>{
 assert.equal((await api.POST(request({items,options}))).status,401);assert.equal(aiCalls,0);
 allowed=true;const response=await api.POST(request({items,options}));assert.equal(response.status,200);assert.equal(response.body.rows[0].score,9);assert.equal(response.body.advice.length,2);
 assert.equal((await api.POST(request({items:[{...items[0],frequency:-1}],options}))).status,400);assert.equal(aiCalls,1);
 failAi=true;const fallback=await api.POST(request({items,options}));assert.equal(fallback.status,200);assert.equal(fallback.body.rows[1].score,12);assert.equal(fallback.body.advice.length,0);assert.ok(fallback.body.aiError);
 console.log('PASS: Bangkok midnight, Markdown/Excel input, E/F quarterly examples, 50 matrix cells, invalid inputs, auth and AI failure fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
