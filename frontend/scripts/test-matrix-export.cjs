process.chdir(require('node:path').resolve(__dirname, '..'));
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript'),path=require('path'),JSZip=require('jszip');
function load(file,mocks={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,require:name=>name in mocks?mocks[name]:name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts'),mocks):require(name),console,Buffer,process,Uint8Array,Response});return mod.exports;}
const {calculateMatrix}=load('lib/matrix-analysis.ts');const {normalizeTreatments,normalizeExportNotes}=load('lib/matrix-treatment.ts');const {buildMatrixDocx}=load('lib/matrix-docx.ts');
const items=[{title:'CPE405: Delay Diagnosis & Treatment',subtopic:'ผู้ป่วยฉุกเฉิน',severity:'E',frequency:1},{title:'CPP401: ภาวะแทรกซ้อนที่ป้องกันได้',subtopic:'',severity:'F',frequency:1}];
const options={type:'clinical',basis:'quarter',year:2570,quarter:1};const rows=calculateMatrix(items,options);
const treatment=normalizeTreatments([1,2],[]);assert.equal(treatment[0].confirmedCurrent,false);
treatment[0]={...treatment[0],transferPrevention:true,monitorControl:true,mitigation:true,measures:'ร่างมาตรการ: ทบทวนกระบวนการคัดกรอง\nติดตามระยะเวลารอคอย',reviewFrequency:'ทุกเดือน'};
treatment[1]={...treatment[1],monitorControl:true,measures:'มาตรการทบทวนที่ผู้ใช้ยืนยัน',confirmedCurrent:true,reviewFrequency:'ทุกไตรมาส'};
assert.throws(()=>normalizeTreatments([1,2],[treatment[0],treatment[0]]));assert.throws(()=>normalizeTreatments([1],[{...treatment[0],id:9}]));assert.throws(()=>normalizeTreatments([1],[{...treatment[0],confirmedCurrent:'yes'}]));assert.throws(()=>normalizeExportNotes([1],[{id:2,analysis:'x',followUp:'x'}]));
let allowed=false,builds=0;
const json=(body,opts={})=>({body,status:opts.status??200});
const api=load('app/api/matrix/export/route.ts',{'next/server':{NextResponse:{json}},'@/lib/auth':{requireRole:async()=>allowed?{ok:true}:{ok:false,response:json({error:'Unauthorized'},{status:401})}},'@/lib/matrix-analysis':{calculateMatrix},'@/lib/matrix-treatment':{normalizeTreatments,normalizeExportNotes},'@/lib/matrix-docx':{buildMatrixDocx:async(...args)=>{builds++;return buildMatrixDocx(...args);}}});
const payload={items,options,treatments:treatment,unitName:'ห้องฉุกเฉิน',advice:[{id:1,analysis:'ร่างการวิเคราะห์จาก AI',followUp:'ตรวจสอบผลทุกเดือน'}]};
(async()=>{
 assert.equal((await api.POST({text:async()=>JSON.stringify(payload)})).status,401);assert.equal(builds,0);
 allowed=true;const response=await api.POST({text:async()=>JSON.stringify(payload)});assert.equal(response.status,200);assert.ok(response.headers.get('Content-Disposition').endsWith('.docx"'));
 const zip=await JSZip.loadAsync(await response.arrayBuffer());const xml=await zip.file('word/document.xml').async('string');
 for(const text of ['Risk Treatment','Risk Monitoring','Review Frequency','Transfer &amp;','Prevention','Monitor &amp;','Mitigation','ทุกเดือน','ทุกไตรมาส','ร่างข้อเสนอ','ยืนยันว่าเป็นมาตรการ','ร่างการวิเคราะห์จาก AI','CPE405: Delay Diagnosis &amp; Treatment'])assert.ok(xml.includes(text),text);
 assert.ok(xml.includes('w:orient="landscape"'));assert.ok(xml.includes('FFC18C'));assert.ok(xml.includes('FF9EAB'));assert.ok((xml.match(/w:tblHeader/g)||[]).length>=3);
 assert.equal((await api.POST({text:async()=>JSON.stringify({...payload,treatments:[treatment[0],treatment[0]]})})).status,400);assert.equal(builds,1);
 console.log('PASS: authenticated DOCX download, recomputed matrix, treatment flags, draft/current status, review periods, repeated headers, landscape and colored cells');
})().catch(error=>{console.error(error);process.exitCode=1;});
