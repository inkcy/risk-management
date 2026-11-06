process.chdir(require('node:path').resolve(__dirname,'..'));
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports:mod.exports,require:name=>name in mocks?mocks[name]:require(name),console,process});return mod.exports;}
const user={id:7,email:'fixture@staff.invalid',name:'Edited profile alias',roster_name:'ผู้ใช้งานตัวอย่าง ตามรายชื่อ',picture:null,role:'editor'};
let queryCount=0;
const auth=load('lib/auth.ts',{'next/headers':{cookies:async()=>({get:()=>({value:'signed'})})},'next/server':{},'./db':{dbConfigured:()=>true,query:async(sql,params)=>{queryCount++;assert.equal(params[0],'valid-session');assert.ok(sql.includes('rc.user_id=u.id AND rc.active'));assert.ok(sql.includes('s.expires_at > now() AND u.active'));return {rows:[user]};}},'./session':{verifyValue:async()=> 'valid-session',SESSION_COOKIE:'rm_session'}});
const mocks={'react':{...React,useState:initial=>[initial,()=>{}],useEffect:()=>{}},'next/navigation':{usePathname:()=>'/home'},'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}};
const {Topbar}=load('components/Topbar.tsx',mocks);
const render=(unit,current=user)=>renderToStaticMarkup(Topbar({user:current,selectedUnitName:unit}));
(async()=>{
 assert.equal((await auth.getSessionUser()).roster_name,user.roster_name);assert.equal(queryCount,1);
 const first=render('หน่วยงานตัวอย่าง ก');assert.ok(first.includes(user.roster_name));assert.ok(!first.includes('Edited profile alias'));assert.ok(first.includes('หน่วยงาน: หน่วยงานตัวอย่าง ก'));
 const second=render('หน่วยงานตัวอย่าง ข');assert.ok(second.includes('หน่วยงานตัวอย่าง ข'));assert.ok(!second.includes('หน่วยงานตัวอย่าง ก'));
 assert.ok(render(null).includes('หน่วยงาน: ยังไม่ได้เลือก'));
 assert.ok(render(null,{...user,roster_name:null}).includes('Edited profile alias'));
 assert.ok(!render('หน่วยงานตัวอย่าง ก',null).includes(user.roster_name));
 const css=fs.readFileSync('app/globals.css','utf8');
 if(process.argv.includes('--write-fixture')){const path=require('node:path');const output='D:/Temp/risk-header-qa';fs.mkdirSync(output,{recursive:true});const markup=render('หอผู้ป่วย อาคารฯ 150 ปี OPD 2 ศัลยกรรม ศัลยกรรมกระดูกและข้อ EENT และ OPD Premium');fs.writeFileSync(path.join(output,'header.html'),'<!DOCTYPE html><html class="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main class="main">'+markup+'</main></body></html>');}
 console.log('PASS: authenticated roster identity, selected-department display, department changes, fallback and signed-out privacy');
})().catch(error=>{console.error(error);process.exitCode=1});
