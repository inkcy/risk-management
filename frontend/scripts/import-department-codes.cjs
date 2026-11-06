// Import private department access codes without putting source credentials in Git.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),ts=require('typescript');
process.chdir(path.resolve(__dirname,'..'));
function load(file){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:mod.exports,require:name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(name),Buffer,console});return mod.exports;}
const args=process.argv.slice(2);const option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const source=option('--source'),envFile=option('--env-file');
const {readDepartmentCodeDocx}=load('lib/departmentCodeImport.ts');const {departmentCodeLookup}=load('lib/departmentLoginCode.ts');
const {loginUnitDirectory}=load('lib/riskUnitDirectory.ts');
function hash(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(password,salt,64).toString('hex');}
function check(password,stored){const [salt,hex]=stored.split(':');return crypto.timingSafeEqual(crypto.scryptSync(password,salt,64),Buffer.from(hex,'hex'));}
(async()=>{
 if(!source)throw Error('Specify --source with the private DOCX file');
 const entries=await readDepartmentCodeDocx(fs.readFileSync(source));
 const summary={codes:entries.length,people:new Set(entries.flatMap(entry=>entry.names)).size,sharedCodes:entries.filter(entry=>entry.names.length>1).length,units:loginUnitDirectory.length};
 if(!args.includes('--apply')){console.log(JSON.stringify({dryRun:true,...summary}));return;}
 if(envFile){for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){const match=line.match(/^([A-Z_]+)=(.*)$/);if(match)process.env[match[1]]=match[2].startsWith('"')?JSON.parse(match[2]):match[2];}}
 const secret=process.env.SESSION_SECRET??'';const url=process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!url||secret.length<32)throw Error('Production database and SESSION_SECRET must be configured');
 const {Pool}=require('pg');const pool=new Pool({connectionString:url,ssl:/localhost|127\.0\.0\.1/.test(url)?undefined:{rejectUnauthorized:false},connectionTimeoutMillis:10000,max:1});
 let client;
 try{
  client=await pool.connect();await client.query('BEGIN');await client.query(fs.readFileSync('../backend/migrations/017_department_login_codes.sql','utf8'));
  const existing=await client.query('SELECT name FROM risk_units WHERE name=ANY($1::text[])',[loginUnitDirectory]);const names=new Set(existing.rows.map(row=>row.name));let createdUnits=0;
  for(const name of loginUnitDirectory){if(names.has(name))continue;const username='roster_unit_'+crypto.createHash('sha256').update(name).digest('hex').slice(0,20);const result=await client.query('INSERT INTO risk_units (name,username,password_hash) VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING RETURNING id',[name,username,hash(crypto.randomBytes(32).toString('base64url'))]);createdUnits+=result.rowCount;}
  for(const entry of entries)await client.query(`INSERT INTO department_login_codes (code_lookup,password_hash,display_name,source_names) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (code_lookup) DO UPDATE SET password_hash=EXCLUDED.password_hash,display_name=EXCLUDED.display_name,source_names=EXCLUDED.source_names,active=true,updated_at=now()`,[departmentCodeLookup(entry.code,secret),hash(entry.code),entry.displayName,JSON.stringify(entry.names)]);
  const imported=await client.query('SELECT code_lookup,password_hash,active FROM department_login_codes WHERE code_lookup=ANY($1::text[])',[entries.map(entry=>departmentCodeLookup(entry.code,secret))]);
  if(imported.rows.length!==entries.length||entries.some(entry=>{const stored=imported.rows.find(row=>row.code_lookup===departmentCodeLookup(entry.code,secret));return !stored?.active||!check(entry.code,stored.password_hash);}))throw Error('Credential verification failed');
  const inactive=await client.query('SELECT count(*)::int AS count FROM risk_units WHERE name=ANY($1::text[]) AND NOT active',[loginUnitDirectory]);
  await client.query('INSERT INTO audit_log (action,entity,detail) VALUES ($1,$2,$3::jsonb)',['department_codes.import','department_login_codes',JSON.stringify({...summary,createdUnits,source:path.basename(source)})]);
  await client.query('COMMIT');console.log(JSON.stringify({applied:true,...summary,createdUnits,inactiveUnits:inactive.rows[0].count,verifiedCredentials:imported.rows.length}));
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client?.release();await pool.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
