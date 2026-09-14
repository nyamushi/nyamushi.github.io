/* 打印数据层项目清单，便于核对顺序与图片引用 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets/js/projects.js'), 'utf8');
const D = new Function(src + '\nreturn { PROJECTS, SITE };')();

console.log('项目总数:', D.PROJECTS.length);
console.log('');
for (const p of D.PROJECTS) {
  const figs = (p.figures || []).length;
  const ui = (p.uiScreens || []).length;
  console.log(
    `  ${p.index}  ${p.slug.padEnd(24)} ${p.category.padEnd(12)} ` +
    `cover=${p.cover || '(无图)'}  figures=${figs}${ui ? '  uiScreens=' + ui : ''}`
  );
}

/* 检查 index 是否连续 */
const idx = D.PROJECTS.map(p => p.index);
console.log('\n编号序列:', idx.join(', '));
const expect = D.PROJECTS.map((_, i) => String(i + 1).padStart(2, '0'));
const okIdx = idx.join() === expect.join();
console.log('编号连续且从 01 开始:', okIdx ? '是' : '否 -> 期望 ' + expect.join(', '));

/* 检查 slug 唯一 */
const dup = D.PROJECTS.map(p => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
console.log('slug 唯一:', dup.length ? '否 -> 重复 ' + dup.join(', ') : '是');
