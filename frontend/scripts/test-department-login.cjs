const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const directoryModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/riskUnitDirectory.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: directoryModule.exports });
const directory = directoryModule.exports.loginUnitDirectory;
let unit, user, statements, cookies, sessionCount, credential, rateFailures, parameters, policyEnforced, grantAllowed;
const json = (body, options = {}) => ({ body, status: options.status || 200, cookies: { set: (...args) => cookies.push(args) } });
const client = {
  release() {},
  async query(sql,params) {
    statements.push(sql);parameters.push({sql,params});
    if(sql.startsWith('INSERT INTO department_login_attempts'))return {rows:[{failed_attempts:rateFailures}]};
    if(sql.includes('FROM department_access_policy'))return {rows:[{enforced:policyEnforced}]};
    if(sql.includes('FROM department_code_units'))return {rows:grantAllowed?[{allowed:1}]:[]};
    if(sql.includes('FROM department_login_codes'))return {rows:credential?[credential]:[]};
    if(sql.includes('FROM risk_unit_supervisors'))return {rows:[]};
    if (sql.startsWith('SELECT')) return { rows: unit && (!sql.includes('WHERE name=$1') || params[0] === unit.name) ? [unit] : [] };
    if (sql.startsWith('INSERT INTO users')) return { rows: [user] };
    return { rows: [] };
  },
};
const mod = { exports: {} };
const mocks = {
  '@/lib/supervisorCredentials': { ensureSupervisorCredentials: async () => {} },
  '@/lib/departmentCodeUnits': { ensureDepartmentCodeUnits: async () => {} },
  '@/lib/riskUnitDirectory': { loginUnitDirectory: directory },
  '@/lib/departmentLoginCode': { departmentAttemptKey:()=> 'ip-digest',departmentCodeLookup:()=> 'code-digest' },
  'next/server': { NextResponse: { json } },
  '@/lib/auth': { audit: async () => {}, createSession: async () => { sessionCount++; return { name: 'rm_session', value: 'signed', options: { httpOnly: true } }; } },
  '@/lib/db': { dbConfigured: () => true, getPool: () => ({ connect: async () => client }) },
  '@/lib/riskUnitAuth': { checkUnitPassword: async (password,hash) => password === 'correct' && hash === 'hash' || ['1234567','1234567b','1234567A'].includes(password) && hash === 'staff-hash', newUnitToken: () => 'token', tokenDigest: () => 'digest', RISK_UNIT_COOKIE: 'risk_unit_session', riskCookieOptions: { httpOnly: true } },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/auth/department/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: mod.exports, process:{env:{SESSION_SECRET:'x'.repeat(32)}}, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
const post = (body, origin = 'https://hospital.test') => mod.exports.POST({ headers: new Headers({ origin }), nextUrl: { origin: 'https://hospital.test' }, json: async () => body?.password === 'correct' ? { ...body, password: 'QSMH' } : body });
function reset() {
  unit = { id: 1, name: directory[0], active: true, locked: false, password_hash: 'hash' };
  user = { id: 2, active: true, role: 'editor' };
  statements = []; cookies = []; sessionCount = 0;credential=null;rateFailures=0;parameters=[];policyEnforced=false;grantAllowed=false;
}
(async () => {
  reset(); assert.equal((await post({ unitId: 1, password: 'correct' }, 'https://other.test')).status, 403); assert.equal(statements.length, 0);
  for (const unitName of ['', 'x'.repeat(256)]) { reset(); assert.equal((await post({unitName, password:'correct'})).status,401); assert.equal(statements.length,0); }
  reset(); assert.equal((await post(null)).status, 401);
  reset(); assert.equal((await post({ unitId: '1', password: 'correct' })).status, 401);
  reset(); assert.equal((await post({ unitName: 'inkcy', password: 'correct' })).status, 401); assert.equal(sessionCount, 0);
  for (const name of [...directory, 'หน่วยงานใหม่สำหรับทดสอบ']) {
    reset(); unit.name = name;
    assert.equal((await post({ unitName: name, password: 'correct' })).status, 200);
    assert.ok(statements.some(sql => sql.includes('WHERE name=$1 FOR UPDATE')));
  }
  reset(); unit = null; assert.equal((await post({ unitName: directory[0], password: 'correct' })).status, 401); assert.equal(sessionCount, 0); assert.equal(cookies.length, 0);
  reset(); assert.equal((await post({ unitId: 1, password: 'wrong' })).status, 401); assert.ok(statements.some(sql => sql.includes('failed_attempts='))); assert.equal(sessionCount, 0);
  reset(); unit.locked = true; assert.equal((await post({ unitId: 1, password: 'correct' })).status, 401); assert.equal(cookies.length, 0);
  reset(); unit.active = false; assert.equal((await post({ unitId: 1, password: 'correct' })).status, 401); assert.equal(sessionCount, 0);
  reset(); unit = null; assert.equal((await post({ unitId: 1, password: 'correct' })).status, 401);
  reset(); user.active = false; assert.equal((await post({ unitId: 1, password: 'correct' })).status, 401); assert.ok(statements.includes('ROLLBACK')); assert.equal(sessionCount, 0);
  reset(); assert.equal((await post({ unitId: 1, password: 'correct' })).status, 200); assert.equal(sessionCount, 1); assert.deepEqual(cookies.map(c => c[0]), ['rm_session', 'risk_unit_session']); assert.ok(statements.some(sql => sql.includes('FOR UPDATE'))); assert.ok(statements.includes('COMMIT'));
  for(const name of [directory[0],directory[1],'dev']){
    reset();unit.name=name;credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};
    assert.equal((await post({unitName:name,password:'1234567'})).status,200);
    const created=parameters.find(item=>item.sql.startsWith('INSERT INTO users'));
    assert.equal(created.params[0],'roster-9@staff.invalid');assert.ok(created.sql.includes("'editor'"));assert.ok(!created.sql.includes('risk_unit_id'));
    assert.ok(parameters.some(item=>item.sql.startsWith('INSERT INTO risk_unit_sessions')&&item.params[1]===unit.id&&item.params[2]===user.id));
    assert.ok(!statements.some(sql=>sql.startsWith('UPDATE risk_units SET failed_attempts=0')));
  }
  for(const password of ['1234567b','1234567A',' 1234567 ']){reset();credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};assert.equal((await post({unitName:directory[0],password})).status,200);}
  reset();credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};unit.locked=true;
  assert.equal((await post({unitName:directory[0],password:'1234567'})).status,401); // A locked unit must reject all credentials.
  reset();credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:false};unit.password_hash='staff-hash';
  assert.equal((await post({unitId:1,password:'1234567'})).status,401);assert.equal(sessionCount,0);
  reset();credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};unit.active=false;
  assert.equal((await post({unitName:directory[0],password:'1234567'})).status,401);
  reset();credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};unit.name='Unlisted department';
  assert.equal((await post({unitId:1,password:'1234567'})).status,200);
  reset();rateFailures=60;assert.equal((await post({unitId:1,password:'correct'})).status,401);assert.equal(sessionCount,0);assert.ok(!statements.some(sql=>sql.includes('FROM risk_units')));
  reset();policyEnforced=true;assert.equal((await post({unitId:1,password:'QSMH'})).status,401);
  reset();policyEnforced=true;credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};assert.equal((await post({unitId:1,password:'1234567'})).status,401);
  reset();policyEnforced=true;grantAllowed=true;credential={id:9,display_name:'Staff fixture',password_hash:'staff-hash',active:true};assert.equal((await post({unitId:1,password:'1234567'})).status,200);
  console.log('Department login checks passed: origin, validation, incorrect password, locked/disabled/missing accounts, session cookies, roster identity, multi-unit access, no inherited admin rights and IP attempt limits.');
})().catch(error => { console.error(error); process.exitCode = 1; });
