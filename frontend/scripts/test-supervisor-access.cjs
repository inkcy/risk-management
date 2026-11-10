const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, require: name => mocks[name], console, process, Buffer });
  return module.exports;
}
const { departmentAccess } = load('lib/departmentAccess.ts', {});
assert.equal(departmentAccess({ email: 'supervisor-12@units.invalid', role: 'editor' }), 'supervisor');
assert.equal(departmentAccess({ email: 'roster-12@staff.invalid', role: 'editor' }), 'staff');
assert.equal(departmentAccess({ email: 'department-12@units.invalid', role: 'editor' }), 'staff');
assert.equal(departmentAccess({ email: 'admin-unit-1@units.invalid', role: 'admin' }), null);
assert.equal(departmentAccess({ email: 'supervisor-12@other.invalid', role: 'editor' }), null);
console.log('Supervisor and staff classification checks passed');
