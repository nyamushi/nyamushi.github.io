/* ==========================================================================
   从 projects/_template.html 生成各项目详情页
   用法: node tools/build-pages.js
   slug 列表直接来自数据层 assets/js/projects.js，
   因此在 projects.js 里新增项目后重跑本脚本即可自动产出页面。
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tplPath = path.join(root, 'projects', '_template.html');

/* 从数据层读取项目清单，避免两处维护 */
const dataSrc = fs.readFileSync(path.join(root, 'assets/js/projects.js'), 'utf8');
const SLUGS = new Function(dataSrc + '\nreturn PROJECTS.map(p => p.slug);')();

const tpl = fs.readFileSync(tplPath, 'utf8');
if (!tpl.includes('<!-- PROJECT_ID -->')) {
  console.error('[build-pages] 模板缺少 <!-- PROJECT_ID --> 标记');
  process.exit(1);
}

/* 清理已不存在于数据层的旧页面（保留 _template.html） */
const stale = fs.readdirSync(path.join(root, 'projects'))
  .filter(f => f.endsWith('.html') && !f.startsWith('_'))
  .map(f => path.basename(f, '.html'))
  .filter(s => !SLUGS.includes(s));
for (const s of stale) {
  fs.unlinkSync(path.join(root, 'projects', `${s}.html`));
  console.log(`  已删除多余页面 projects/${s}.html`);
}

let n = 0;
for (const slug of SLUGS) {
  const html = tpl.replace('<!-- PROJECT_ID -->', `<meta name="project-id" content="${slug}">`);
  const out = path.join(root, 'projects', `${slug}.html`);
  fs.writeFileSync(out, html, 'utf8');
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`  projects/${slug}.html  ${kb} KB`);
  n++;
}
console.log(`\n完成: 生成 ${n} 个详情页`);
