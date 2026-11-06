process.chdir(require('node:path').resolve(__dirname, '..'));
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
let status=400,providerMessage='API key not valid. Please pass a valid API key.';
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/matrix-ai.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:mod.exports,require:()=>({generalSeverities:[]}),process:{env:{GEMINI_API_KEY:'test-secret'}},AbortSignal,
  fetch:async()=>({ok:false,status,json:async()=>({error:{message:providerMessage}})}),
});
const {analyzeMatrixRisks,MatrixAiError}=mod.exports;
(async()=>{
  for(const [code,message,expected] of [[400,providerMessage,'GEMINI_API_KEY'],[403,'forbidden test-secret','ปฏิเสธสิทธิ์'],[429,'quota test-secret','โควตา'],[404,'model test-secret','GEMINI_MODEL'],[503,'unavailable test-secret','503']]){
    status=code;providerMessage=message;
    await assert.rejects(()=>analyzeMatrixRisks([]),error=>error instanceof MatrixAiError&&error.message.includes(expected)&&!error.message.includes('test-secret'));
  }
  console.log('PASS: invalid key, access denied, quota, model and provider failures return safe actionable messages');
})().catch(error=>{console.error(error);process.exitCode=1;});
