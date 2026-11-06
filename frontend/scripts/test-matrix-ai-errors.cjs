process.chdir(require('node:path').resolve(__dirname, '..'));
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
let calls=0, recover=false, urls=[];
let status=400,providerMessage='API key not valid. Please pass a valid API key.';
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/matrix-ai.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:mod.exports,require:()=>({generalSeverities:[]}),process:{env:{GEMINI_API_KEY:'test-secret'}},AbortSignal,setTimeout:fn=>fn(),
  fetch:async(url)=>{urls.push(url);calls++;if(recover&&calls===2)return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:'[]'}]}}]})};return {ok:false,status,json:async()=>({error:{message:providerMessage}})};},
});
const {analyzeMatrixRisks,MatrixAiError}=mod.exports;
(async()=>{
  for(const [code,message,expected] of [[400,providerMessage,'GEMINI_API_KEY'],[403,'forbidden test-secret','ปฏิเสธสิทธิ์'],[429,'quota test-secret','โควตา'],[404,'model test-secret','GEMINI_MODEL'],[503,'unavailable test-secret','503']]){
    status=code;providerMessage=message;
    await assert.rejects(()=>analyzeMatrixRisks([]),error=>error instanceof MatrixAiError&&error.message.includes(expected)&&!error.message.includes('test-secret'));
  }
  for(const code of [503,429,404]){status=code;calls=0;urls=[];recover=true;assert.equal((await analyzeMatrixRisks([])).length,0);assert.equal(calls,2);assert.ok(urls[0].includes('gemini-3.1-flash-lite'));assert.ok(urls[1].includes('gemini-3.6-flash'));}
  status=400;calls=0;recover=false;await assert.rejects(()=>analyzeMatrixRisks([]));assert.equal(calls,1);
  console.log('PASS: invalid key, access denied, quota, model and provider failures return safe actionable messages');
})().catch(error=>{console.error(error);process.exitCode=1;});
