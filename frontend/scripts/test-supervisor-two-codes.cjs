process.chdir(require('node:path').resolve(__dirname, '..'));
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let record = {}, statements = [], backup, userEmail;
const json = (body, opts = {}) => ({ body, status: opts.status ?? 200, cookies: { set() {} } });
const client = { release() {}, async query(sql, params = []) {
  statements.push({ sql, params });
  if (sql === 'BEGIN') { backup = { ...record }; return { rows: [] }; }
  if (sql === 'ROLLBACK') { record = backup; return { rows: [] }; }
  if (sql.startsWith('INSERT INTO risk_unit_supervisors')) { const col = sql.includes('(unit_id,reviewer_password_hash)') ? 'reviewer_password_hash' : 'password_hash'; record[col] = params[1]; return { rows: [{ unit_id: 1 }], rowCount: 1 }; }
  if (sql.startsWith('SELECT password_hash AS') || sql.startsWith('SELECT reviewer_password_hash AS')) { const col = sql.includes('reviewer_password_hash') ? 'reviewer_password_hash' : 'password_hash'; return { rows: [{ password_hash: record[col] }] }; }
  if (sql.startsWith('INSERT INTO department_login_attempts')) return { rows: [{ failed_attempts: 0 }] };
  if (sql.includes('FROM risk_unit_supervisors')) return { rows: [record] };
  if (sql.includes('FROM risk_units WHERE')) return { rows: [{ id: 1, name: 'Unit', active: true, locked: false, password_hash: 'unit-hash' }] };
  if (sql.includes('FROM department_login_codes')) return { rows: [] };
  if (sql.startsWith('INSERT INTO users')) { userEmail = params[0]; return { rows: [{ id: 2, email: userEmail, name: 'Unit', role: 'editor', active: true }] }; }
  return { rows: [], rowCount: 1 };
} };
const mocks = { 'next/server': { NextResponse: { json } }, '@/lib/db': { getPool: () => ({ connect: async () => client }), dbConfigured: () => true }, '@/lib/auth': { requireRole: async () => ({ ok: true, user: { id: 9 } }), audit: async () => {}, createSession: async () => ({ name: 'session', value: 'token', options: {} }) }, '@/lib/supervisorCredentials': { ensureSupervisorCredentials: async () => {} }, '@/lib/riskUnitAuth': { hashUnitPassword: async p => `hash:${p}`, checkUnitPassword: async (p, hash) => hash === `hash:${p}`, newUnitToken: () => 'token', tokenDigest: () => 'digest', RISK_UNIT_COOKIE: 'unit', riskCookieOptions: {} }, '@/lib/departmentLoginCode': { departmentAttemptKey: () => 'attempt', departmentCodeLookup: () => 'lookup' } };
function load(file) { const mod = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: mod.exports, require: name => mocks[name], process: { env: { SESSION_SECRET: 'secret' } }, console }); return mod.exports; }
const setup = load('app/api/risk-units/supervisor/route.ts'), auth = load('app/api/auth/department/route.ts');
const request = body => ({ headers: { get: name => name === 'origin' ? 'https://example.test' : null }, nextUrl: { origin: 'https://example.test' }, json: async () => body });
(async () => {
  assert.equal((await setup.POST(request({ unit_id: 1, slot: 'reviewer', password: 'reviewer1' }))).status, 200);
  assert.equal((await setup.POST(request({ unit_id: 1, slot: 'supervisor', password: 'head123' }))).status, 200);
  assert.equal(record.reviewer_password_hash, 'hash:reviewer1'); assert.equal(record.password_hash, 'hash:head123');
  statements = []; assert.equal((await setup.POST(request({ unit_id: 1, slot: 'reviewer', password: 'head123' }))).status, 400); assert.equal(record.reviewer_password_hash, 'hash:reviewer1'); assert.ok(!statements.some(s => s.sql.startsWith('DELETE FROM sessions')));
  statements = []; assert.equal((await setup.POST(request({ unit_id: 1, slot: 'reviewer', password: 'reviewer2' }))).status, 200); assert.ok(statements.some(s => s.sql.startsWith('DELETE FROM sessions') && s.params[0] === 'supervisor-reviewer-1@units.invalid')); assert.ok(!statements.some(s => s.params[0] === 'supervisor-1@units.invalid'));
  for (const [password, email] of [['head123', 'supervisor-1@units.invalid'], ['reviewer2', 'supervisor-reviewer-1@units.invalid']]) { userEmail = ''; assert.equal((await auth.POST(request({ unitId: 1, password }))).status, 200); assert.equal(userEmail, email); }
  assert.equal((await auth.POST(request({ unitId: 1, password: 'reviewer1' }))).status, 401);
  assert.equal((await setup.POST(request({ unit_id: 1, slot: 'unexpected', password: 'head123' }))).status, 400);
  const { departmentAccess } = load('lib/departmentAccess.ts');
  assert.equal(departmentAccess({ email: 'supervisor-1@units.invalid', role: 'editor' }), 'supervisor');
  assert.equal(departmentAccess({ email: 'supervisor-reviewer-1@units.invalid', role: 'editor' }), 'supervisor');
  assert.equal(departmentAccess({ email: 'department-1@units.invalid', role: 'editor' }), 'staff');
  console.log('PASS: separate supervisor and reviewer passwords, login identity, duplicate rejection and selective session revocation');
})().catch(error => { console.error(error); process.exitCode = 1; });
