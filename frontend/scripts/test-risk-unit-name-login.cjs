process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let allowed = true, unit, queried = [];
const json = (body, options = {}) => ({ body, status: options.status ?? 200, cookies: { set() {} } });
const mocks = {
  'next/server': { NextResponse: { json } },
  '@/lib/auth': { requireRole: async () => allowed ? { ok: true, user: { id: 2 } } : { ok: false, response: json({}, { status: 401 }) }, audit: async () => {} },
  '@/lib/db': { query: async (sql, args) => {
    queried.push({ sql, args });
    if (sql.startsWith('INSERT INTO risk_units ')) { unit = { id: 7, name: args[0], username: args[1], password_hash: args[2], active: true, locked: false }; return { rows: [unit], rowCount: 1 }; }
    if (sql.startsWith('SELECT id, password_hash')) return { rows: unit && (sql.endsWith('WHERE name=$1') ? unit.name === args[0] : unit.username === args[0]) ? [unit] : [] };
    return { rows: [], rowCount: 1 };
  } },
  '@/lib/riskUnitAuth': { hashUnitPassword: async password => 'hash:' + password, checkUnitPassword: async (password, hash) => hash === 'hash:' + password, newUnitToken: () => 'token', tokenDigest: () => 'digest', RISK_UNIT_COOKIE: 'cookie', riskCookieOptions: {} },
  'node:crypto': require('node:crypto'),
};
function load(file) { const mod = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: mod.exports, require: name => mocks[name], console }); return mod.exports; }
const admin = load('app/api/risk-units/route.ts'), login = load('app/api/risk-units/login/route.ts');
const request = body => ({ json: async () => body });
(async () => {
  allowed = false; assert.equal((await admin.POST(request({ name: 'หน่วยทดสอบ', password: '1234567' }))).status, 401); assert.equal(queried.length, 0);
  allowed = true; assert.equal((await admin.POST(request({ name: 'หน่วยทดสอบ', password: '1234567' }))).status, 201);
  assert.match(unit.username, /^unit-[0-9a-f-]+$/); assert.equal((await login.POST(request({ name: 'หน่วยทดสอบ', password: '1234567' }))).status, 200);
  assert.equal((await login.POST(request({ name: 'หน่วยทดสอบ', password: 'wrong' }))).status, 401);
  assert.equal((await login.POST(request({ username: unit.username, password: '1234567' }))).status, 200);
  assert.equal((await login.POST(request({ name: unit.username, password: '1234567' }))).status, 401);
  console.log('PASS: admin creates a unit without username; login by exact unit name and legacy username, password and role checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
