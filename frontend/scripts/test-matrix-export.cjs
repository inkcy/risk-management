process.chdir(require('node:path').resolve(__dirname, '..'));
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript'),path=require('path'),JSZip=require('jszip');
function load(file,mocks={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:mod.exports,require:name=>name in mocks?mocks[name]:name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts'),mocks):require(name),console,Buffer,process,Uint8Array,Response,Intl});return mod.exports;}
const {calculateMatrix}=load('lib/matrix-analysis.ts');const {normalizeTreatments,normalizeExportNotes,applyMatrixAdvice}=load('lib/matrix-treatment.ts');const {buildMatrixDocx}=load('lib/matrix-docx.ts');
const items=[{title:'CPE405: Delay Diagnosis & Treatment',subtopic:'ผู้ป่วยฉุกเฉิน',severity:'E',frequency:1},{title:'CPP401: ภาวะแทรกซ้อนที่ป้องกันได้',subtopic:'',severity:'F',frequency:1}];
const options={type:'clinical',basis:'quarter',year:2570,quarter:1};const rows=calculateMatrix(items,options);
const treatment=normalizeTreatments([1,2],[]);assert.equal(treatment[0].confirmedCurrent,false);
treatment[0]={...treatment[0],confirmedCurrent:false,transferPrevention:true,monitorControl:true,mitigation:true,measures:'ร่างมาตรการ: ทบทวนกระบวนการคัดกรอง\nติดตามระยะเวลารอคอย',reviewFrequency:'ทุกเดือน'};
treatment[1]={...treatment[1],monitorControl:true,measures:'มาตรการทบทวนที่ผู้ใช้ยืนยัน',confirmedCurrent:true,reviewFrequency:'ทุกไตรมาส'};
assert.throws(()=>normalizeTreatments([1,2],[treatment[0],treatment[0]]));assert.throws(()=>normalizeTreatments([1],[{...treatment[0],id:9}]));assert.throws(()=>normalizeTreatments([1],[{...treatment[0],confirmedCurrent:'yes'}]));assert.throws(()=>normalizeExportNotes([1],[{id:2,analysis:'x',followUp:'x'}]));
const aiNotes=[1,2].map(id=>({id,analysis:'วิเคราะห์',actions:'ทบทวนกระบวนการและติดตามตัวชี้วัด',followUp:'ติดตามผล',transferPrevention:true,monitorControl:true,mitigation:false,reviewFrequency:'ทุกเดือน'}));
const generated=applyMatrixAdvice([1,2],[],aiNotes);
assert.equal(generated[0].measures,aiNotes[0].actions);assert.equal(generated[0].reviewFrequency,'ทุกเดือน');assert.equal(generated[0].monitorControl,true);assert.equal(generated[0].confirmedCurrent,false);
const partial=normalizeTreatments([1,2],[]);partial[0].confirmedCurrent=false;partial[0].mitigation=true;partial[0].measures='ข้อความที่ผู้ใช้กรอก';partial[1]={...treatment[1]};
const merged=applyMatrixAdvice([1,2],partial,aiNotes);
assert.equal(merged[0].measures,'ข้อความที่ผู้ใช้กรอก');assert.equal(merged[0].reviewFrequency,'ทุกเดือน');assert.equal(merged[0].mitigation,true);assert.equal(merged[0].monitorControl,false);
assert.equal(JSON.stringify(merged[1]),JSON.stringify(partial[1]));
assert.equal(JSON.stringify(applyMatrixAdvice([1,2],partial,[])),JSON.stringify(partial));
let allowed=false,builds=0;
const json=(body,opts={})=>({body,status:opts.status??200});
const api=load('app/api/matrix/export/route.ts',{'next/server':{NextResponse:{json}},'@/lib/auth':{requireRole:async()=>allowed?{ok:true}:{ok:false,response:json({error:'Unauthorized'},{status:401})}},'@/lib/matrix-analysis':{calculateMatrix},'@/lib/matrix-treatment':{normalizeTreatments,normalizeExportNotes},'@/lib/matrix-docx':{buildMatrixDocx:async(...args)=>{builds++;return buildMatrixDocx(...args);}}});
const payload={items,options,treatments:treatment,unitName:'ห้องฉุกเฉิน',advice:[{id:1,analysis:'ร่างการวิเคราะห์จาก AI',followUp:'ตรวจสอบผลทุกเดือน'}]};
(async()=>{
 assert.equal((await api.POST({text:async()=>JSON.stringify(payload)})).status,401);assert.equal(builds,0);
 allowed=true;const response=await api.POST({text:async()=>JSON.stringify(payload)});assert.equal(response.status,200);assert.ok(response.headers.get('Content-Disposition').endsWith('.docx"'));
 const zip=await JSZip.loadAsync(await response.arrayBuffer());const xml=await zip.file('word/document.xml').async('string');
 fs.mkdirSync('../tmp/word-template',{recursive:true});fs.writeFileSync('../tmp/word-template/filled.docx',Buffer.from(await buildMatrixDocx(rows,treatment,options,'ฝ่ายพัฒนาคุณภาพและบริหารความเสี่ยง')));
 for(const text of ['Risk Treatment','Risk Monitoring','Review Frequency','Transfer &amp;','Prevention','Monitor &amp;','Mitigation','ทุกเดือน','ทุกไตรมาส','มาตรการทบทวนที่ผู้ใช้ยืนยัน','CPE405: Delay Diagnosis &amp; Treatment'])assert.ok(xml.replace(/<[^>]*>/g,'').includes(text),text);
 assert.ok(!xml.includes('[ร่าง]'));
 assert.ok(xml.includes('ร่างการวิเคราะห์จาก AI'));assert.ok(xml.includes('ตรวจสอบผลทุกเดือน'));assert.ok(xml.includes('ข้อเสนอมาตรการ (รอยืนยัน)'));
 const emptyArchive=await JSZip.loadAsync(await buildMatrixDocx(rows,normalizeTreatments([1,2],[]),options,'ทดสอบ'));
 const emptyXml=await emptyArchive.file('word/document.xml').async('string');
 assert.ok(!emptyXml.includes('ยังไม่ระบุมาตรการ'));
 assert.ok(emptyXml.includes('วิเคราะห์:'));
 assert.ok(emptyXml.includes('ติดตาม:'));
 assert.ok(emptyXml.includes('ข้อเสนอมาตรการ (รอยืนยัน)'));
 assert.ok(!emptyXml.includes('มาตรการปัจจุบัน:'));
 const recordRows=[...emptyXml.matchAll(/<w:tr(?: [^>]*)?>([\s\S]*?)<\/w:tr>/g)].slice(5,7);
 assert.equal(recordRows.length,2);
 for(const record of recordRows)assert.ok(record[1].includes('<w:cantSplit'), 'ordinary records stay on one page');
 assert.ok(emptyXml.includes('w:line="240" w:lineRule="auto"'));
 assert.ok(emptyXml.includes('w:vAlign w:val="top"'));
 const oversizedArchive=await JSZip.loadAsync(await buildMatrixDocx([rows[0]],[{...treatment[0],measures:'ข้อความยาวสำหรับตรวจการแบ่งหน้าที่ปลอดภัย '.repeat(100)}],options,'ทดสอบ'));
 const oversizedXml=await oversizedArchive.file('word/document.xml').async('string');
 const oversizedRecord=[...oversizedXml.matchAll(/<w:tr(?: [^>]*)?>([\s\S]*?)<\/w:tr>/g)][5][1];
 assert.ok(!oversizedRecord.includes('<w:cantSplit'), 'oversized records can flow without clipping');
 assert.ok(xml.includes('w:orient="landscape"'));assert.ok(xml.includes('00B050'));assert.ok(xml.includes('FF0000'));assert.ok((xml.match(/w:tblHeader/g)||[]).length>=3);assert.equal((xml.match(/<w:tbl>/g)||[]).length,2);
 assert.equal((await api.POST({text:async()=>JSON.stringify({...payload,treatments:[treatment[0],treatment[0]]})})).status,400);assert.equal(builds,1);
 // Frequency is repeated as a count in its severity column; only color and response cells use ticks.
 const cellTexts=row=>[...row.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map(match=>[...match[1].matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map(text=>text[1]).join(''));
 async function verifyCounts(type,fixtures){
  const opts={...options,type};const results=calculateMatrix(fixtures,opts);
  const flags=normalizeTreatments(results.map(row=>row.id),[]).map((item,index)=>({...item,transferPrevention:index%2===0,monitorControl:true,mitigation:index%2===1}));
  const archive=await JSZip.loadAsync(await buildMatrixDocx(results,flags,opts,'Test unit'));
  const document=await archive.file('word/document.xml').async('string');
  const mainTable=document.match(/<w:tbl>([\s\S]*?)<\/w:tbl>/)[1];
  const data=[...mainTable.matchAll(/<w:tr(?: [^>]*)?>([\s\S]*?)<\/w:tr>/g)].slice(5,5+fixtures.length);
  assert.equal(data.length,fixtures.length);
  data.forEach((match,index)=>{
   const texts=cellTexts(match[1]);const result=results[index];
   const severityColumns=type==='clinical'?9:5;
   const grouped=result.severity.split(/[–-]/).length===2;
   const range=result.severity.split(/[–-]/);const span=grouped?range[1].charCodeAt(0)-range[0].charCodeAt(0)+1:1;
   const severityCells=severityColumns-span+1;
   assert.equal(texts[1],String(result.frequency));
   const severityTexts=texts.slice(2,2+severityCells);
   assert.equal(severityTexts.filter(value=>value===String(result.frequency)).length,1);
   assert.ok(!severityTexts.includes('✓'));
   const selected=type==='clinical'?range[0].charCodeAt(0)-65:Number(result.severity)-1;
   assert.equal(severityTexts[selected],texts[1]);
   const colorCells=texts.slice(2+severityCells,6+severityCells);
   assert.deepEqual(colorCells,['green','yellow','orange','red'].map(color=>color===result.color?'✓':''));
   assert.deepEqual(texts.slice(6+severityCells,9+severityCells),[flags[index].transferPrevention,flags[index].monitorControl,flags[index].mitigation].map(selected=>selected?'✓':''));
  });
 }
 await verifyCounts('clinical',[['C',24],['C',20],['B',94],['A',29],['I',0],['A-B',5],['C–D',7],['G-I',9]].map(([severity,frequency],index)=>({title:'Risk '+index,subtopic:'',severity,frequency})));
 await verifyCounts('nonclinical',[1,2,3,4,5].map((severity,index)=>({title:'General '+index,subtopic:'',severity:String(severity),frequency:index*12})));


 const originalZip=await JSZip.loadAsync(fs.readFileSync('templates/risk-profile-form.docx'));
 for(const [name,entry] of Object.entries(originalZip.files)){
  if(!entry.dir && name!=='word/document.xml')assert.deepEqual(await zip.file(name).async('nodebuffer'),await entry.async('nodebuffer'),name);
 }
 const fixtureItems=[['ภาวะแทรกซ้อนจากการเจาะเลือด','C',24],['หกล้ม','C',20],['Early warning sign','B',94],['Nonconforming product','A',29]].map(([title,severity,frequency])=>({title,subtopic:'',severity,frequency}));
 const fixtureRows=calculateMatrix(fixtureItems,options);
 const fixtureTreatments=normalizeTreatments(fixtureRows.map(row=>row.id),[]).map(item=>({...item,transferPrevention:true,monitorControl:true,measures:'ทบทวนแนวทางปฏิบัติและติดตามตัวชี้วัดทุกเดือน',reviewFrequency:'ทุกเดือน'}));
 fs.writeFileSync('../tmp/word-template/counts.docx',await buildMatrixDocx(fixtureRows,fixtureTreatments,options,'ฝ่ายพัฒนาคุณภาพและบริหารความเสี่ยง'));
 const manyItems=Array.from({length:50},(_,i)=>({...fixtureItems[i%4],title:'รายการ '+(i+1)+' '+fixtureItems[i%4].title}));
 const manyRows=calculateMatrix(manyItems,options);
 const manyTreatments=normalizeTreatments(manyRows.map(row=>row.id),[]).map(item=>({...fixtureTreatments[0],id:item.id}));
 fs.writeFileSync('../tmp/word-template/multipage.docx',await buildMatrixDocx(manyRows,manyTreatments,options,'หน่วยงานทดสอบหลายหน้า'));
 fs.writeFileSync('../tmp/word-template/general.docx',await buildMatrixDocx(calculateMatrix([{title:'ความเสี่ยงทั่วไป',subtopic:'',severity:'5',frequency:29}],{...options,type:'nonclinical'}),[fixtureTreatments[0]],{...options,type:'nonclinical'},'หน่วยงานทดสอบทั่วไป'));
 console.log('PASS: authenticated DOCX download, recomputed matrix, treatment flags, draft/current status, review periods, repeated headers, landscape and colored cells');
})().catch(error=>{console.error(error);process.exitCode=1;});
