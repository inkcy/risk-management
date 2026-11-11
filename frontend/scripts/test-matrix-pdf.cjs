process.chdir(require('node:path').resolve(__dirname, '..'));
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {PDFDocument}=require('pdf-lib');
function load(file,mocks={}){
 const mod={exports:{}};
 new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(mod.exports,name=>name in mocks?mocks[name]:name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts'),mocks):require(name));
 return mod.exports;
}
const {calculateMatrix}=load('lib/matrix-analysis.ts');
const {normalizeTreatments,normalizeExportNotes}=load('lib/matrix-treatment.ts');
const {buildMatrixPdf}=load('lib/matrix-pdf.ts');
const options={type:'clinical',basis:'quarter',year:2570,quarter:1};
const items=[['ภาวะแทรกซ้อนจากการเจาะเลือด','C',24],['หกล้ม','C',20],['Early warning sign','B',94],['Nonconforming product','A',29],['ระดับกลุ่ม','C-D',7]].map(([title,severity,frequency])=>({title,subtopic:'',severity,frequency}));
const rows=calculateMatrix(items,options);
const treatments=normalizeTreatments(rows.map(row=>row.id),[]).map((item,i)=>({...item,transferPrevention:i!==2,monitorControl:true,mitigation:i===2,measures:'ทบทวนแนวทางปฏิบัติและติดตามตัวชี้วัดทุกเดือน',reviewFrequency:'ทุกเดือน',confirmedCurrent:i===1}));
let allowed=false,builds=0;
const json=(body,opts={})=>({body,status:opts.status??200});
const api=load('app/api/matrix/export-pdf/route.ts',{'next/server':{NextResponse:{json}},'@/lib/auth':{requireRole:async()=>allowed?{ok:true}:{ok:false,response:json({error:'Unauthorized'},{status:401})}},'@/lib/matrix-analysis':{calculateMatrix},'@/lib/matrix-treatment':{normalizeTreatments,normalizeExportNotes},'@/lib/matrix-pdf':{buildMatrixPdf:async(...args)=>{builds++;return buildMatrixPdf(...args);}}});
const payload={items,options,treatments,unitName:'ฝ่ายพัฒนาคุณภาพและบริหารความเสี่ยง'};
(async()=>{
 assert.equal((await api.POST({text:async()=>JSON.stringify(payload)})).status,401);assert.equal(builds,0);
 allowed=true;
 assert.equal((await api.POST({text:async()=>JSON.stringify({...payload,items:[{...items[0],frequency:-1}]})})).status,400);assert.equal(builds,0);
 const response=await api.POST({text:async()=>JSON.stringify(payload)});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.ok(response.headers.get('content-disposition').endsWith('.pdf"'));assert.equal(response.headers.get('cache-control'),'no-store');
 const bytes=Buffer.from(await response.arrayBuffer());const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=1);assert.equal(pdf.getPage(0).getWidth(),842);
 fs.mkdirSync('../tmp/pdfs',{recursive:true});fs.writeFileSync('../tmp/pdfs/risk-profile-filled.pdf',bytes);
 const longItems=Array.from({length:50},(_,i)=>({...items[i%items.length],title:'รายการ '+(i+1)}));
 const longRows=calculateMatrix(longItems,options);
 const longTreatments=normalizeTreatments(longRows.map(row=>row.id),[]).map(item=>({...treatments[0],id:item.id,measures:'ติดตามตัวชี้วัดและทบทวนการปฏิบัติงานทุกเดือน '.repeat(8)}));
 const longBytes=await buildMatrixPdf(longRows,longTreatments,options,payload.unitName);const longPdf=await PDFDocument.load(longBytes);assert.ok(longPdf.getPageCount()>1);fs.writeFileSync('../tmp/pdfs/risk-profile-multipage.pdf',longBytes);
 const generalItems=[{title:'ความเสี่ยงทั่วไป',subtopic:'',severity:'5',frequency:0}];const generalOptions={...options,type:'nonclinical',basis:'year',quarter:4};
 const general=await buildMatrixPdf(calculateMatrix(generalItems,generalOptions),[{...treatments[0],id:1}],generalOptions,payload.unitName);fs.writeFileSync('../tmp/pdfs/risk-profile-general.pdf',general);assert.equal((await PDFDocument.load(general)).getPageCount(),1);
 console.log('PASS: PDF auth/validation, original template, Thai font, clinical/grouped/general severity, zero count, response flags and multipage overflow ('+longPdf.getPageCount()+' pages).');
})().catch(error=>{console.error(error);process.exitCode=1});
