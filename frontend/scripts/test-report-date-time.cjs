const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('app/report/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
for(const draft of [null,{occurred_at:'2025-01-02',time:'03:04',category:'blood',severity:'E'}]){
 const state=[],effects=[];let cursor=0;const module={exports:{}};
 vm.runInNewContext(compiled,{exports:module.exports,require:name=>{
  if(name==='react')return {useState:initial=>{const index=cursor++;state[index]=initial;return [initial,next=>state[index]=typeof next==='function'?next(state[index]):next]},useEffect:fn=>effects.push(fn)};
  if(name==='react/jsx-runtime')return require('react/jsx-runtime');
  if(name==='next/link')return {default:()=>null};
  if(name==='@/lib/riskUnitDirectory')return {riskUnitDirectory:[]};
  if(name==='@/lib/incident-categories')return {incidentRiskGroup:()=> 'clinical',incidentCategoryGroups:[]};
  if(name==='@/lib/incident-severity')return {generalSeverities:[],validIncidentSeverity:()=>true};
  if(name==='@/lib/thai-date-time')return {thaiDateTime:()=>({occurred_at:'2026-11-06',time:'14:15'})};
  throw Error(name);
 },window:{},localStorage:{getItem:key=>key==='esafe_report_draft_v1'&&draft?JSON.stringify(draft):null},console});
 module.exports.default();effects.forEach(fn=>fn());
 assert.equal(state[0].occurred_at,draft?.occurred_at??'2026-11-06');assert.equal(state[0].time,draft?.time??'14:15');
}
console.log('PASS: report opens with current Thai date/time and preserves historical draft date/time');
