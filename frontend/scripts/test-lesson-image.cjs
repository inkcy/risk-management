const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
let encoded = 0;
let imageSource = '';
class MockImage {
  constructor() { this.naturalWidth = 2752; this.naturalHeight = 1536; }
  set src(value) { imageSource = value; this.onload(); }
}
class MockReader {
  readAsDataURL(blob) { this.result = `data:${blob.type};base64,YQ==`; this.onload(); }
}
const context = {
  exports: mod.exports, Image: MockImage, FileReader: MockReader,
  document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: callback => { encoded++; callback({ type: 'image/webp', size: 1000 }); } }) },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/lessonImage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
(async () => {
  assert.equal(await mod.exports.prepareLessonImage({ type: 'image/png', size: 1024 }), 'data:image/png;base64,YQ==');
  assert.equal(encoded, 0);
  assert.equal(await mod.exports.prepareLessonImage({ type: 'image/png', size: 5413210 }), 'data:image/webp;base64,YQ==');
  assert.equal(encoded, 1); assert.equal(imageSource, 'data:image/png;base64,YQ==');
  await assert.rejects(mod.exports.prepareLessonImage({ type: 'image/png', size: 21 * 1024 * 1024 }));
  await assert.rejects(mod.exports.prepareLessonImage({ type: 'image/svg+xml', size: 100 }));
  console.log('Lesson image size, conversion and validation checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
