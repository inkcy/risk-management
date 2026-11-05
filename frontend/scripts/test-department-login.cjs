const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const directoryModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/riskUnitDirectory.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: directoryModule.exports });
const directory = directoryModule.exports.riskUnitDirectory;
let unit, user, statements, cookies, sessionCount;
const json = (body, options = {}) => ({ body, status: options.status || 200, cookies: { set: (...args) => cookies.push(args) } });
const client = {
  release() {},
  async query(sql) {
    statements.push(sql);
    if (sql.startsWith('SELECT')) return { rows: unit ? [unit] : [] };
    if (sql.startsWith('INSERT INTO users')) return { rows: [user] };
    return { rows: [] };
  },
};
const mod = { exports: {} };
const mocks = {
  '@/lib/riskUnitDirectory': { riskUnitDirectory: directory },
  'next/server': { NextResponse: { json } },
  '@/lib/auth': { audit: async () => {}, createSession: async () => { sessionCount++; return { name: 'rm_session', value: 'signed', options: { httpOnly: true } }; } },
  '@/lib/db': { dbConfigured: () => true, getPool: () => ({ connect: async () => client }) },
  '@/lib/riskUnitAuth': { checkUnitPassword: async password => password === 'correct', newUnitToken: () => 'token', tokenDigest: () => 'digest', RISK_UNIT_COOKIE: 'risk_unit_session', riskCookieOptions: { httpOnly: true } },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/auth/department/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: mod.exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
const post = (body, origin = 'https://hospital.test') => mod.exports.POST({ headers: new Headers({ origin }), nextUrl: { origin: 'https://hospital.test' }, json: async () => body });
function reset() {
  unit = { id: 1, name: 'หน่วยทดสอบ', active: true, locked: false, password_hash: 'hash' };
  user = { id: 2, active: true, role: 'editor' };
  statements = []; cookies = []; sessionCount = 0;
}
(async () => {
  reset(); assert.equal((await post({ unitId: 1, password: 'correct' }, 'https://other.test')).status, 403); assert.equal(statements.length, 0);
  reset(); assert.equal((await post(null)).status, 401);
  reset(); assert.equal((await post({ unitId: '1', password: 'correct' })).status, 401);
  reset(); assert.equal((await post({ unitName: 'inkcy', password: 'correct' })).status, 401); assert.equal(statements.length, 0);
  for (const name of directory) {
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
  console.log('Department login checks passed: origin, validation, incorrect password, locked/disabled/missing accounts, session cookies.');
})().catch(error => { console.error(error); process.exitCode = 1; });
