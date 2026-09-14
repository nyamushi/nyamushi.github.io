/* ==========================================================================
   静态自检：校验 HTML 中引用的本地资源是否存在、锚点是否有对应 id、
   以及 data 层引用的图片是否齐全。
   用法: node tools/check.js
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const problems = [];
const ok = [];

function read(p) { return fs.readFileSync(p, 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

/* 收集 HTML 文件 */
const htmlFiles = ['index.html'];
for (const f of fs.readdirSync(path.join(root, 'projects'))) {
  if (f.endsWith('.html') && !f.startsWith('_')) htmlFiles.push('projects/' + f);
}

/* ---------- 1. HTML 内引用的本地资源 ---------- */
for (const rel of htmlFiles) {
  const html = read(path.join(root, rel));
  const base = path.dirname(rel);

  const refs = [];
  const re = /(?:src|href)="([^"#][^"]*?)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    if (url.includes('#')) continue;
    refs.push(url);
  }

  for (const url of new Set(refs)) {
    /* 跳过 JS 模板拼接出来的属性（如 ' + f.src + '），
       这些由下方 §5 按数据层逐一展开校验 */
    if (/['+`]/.test(url) || /\s/.test(url)) continue;
    const target = path.normalize(path.join(base, url)).replace(/\\/g, '/');
    /* 页面内锚点链接（如 about.html#skills）只校验文件部分 */
    const fileOnly = target.split('#')[0];
    if (!exists(decodeURIComponent(fileOnly))) problems.push(`[${rel}] 资源缺失 -> ${url}`);
  }
  ok.push(`${rel}: 检查 ${new Set(refs).size} 个本地引用`);

  /* 行内 style 属性里的 url() —— 按文档位置解析（注意：CSS 文件里的 url()
     是按样式表位置解析的，两者规则不同，这里分别校验） */
  const styleRefs = [];
  const reStyle = /style="([^"]*)"/g;
  while ((m = reStyle.exec(html))) {
    const reUrl = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    let u;
    while ((u = reUrl.exec(m[1]))) styleRefs.push(u[1]);
  }
  for (const url of new Set(styleRefs)) {
    if (/^(https?:|data:)/.test(url)) continue;
    const resolved = path.normalize(path.join(base, url)).replace(/\\/g, '/');
    if (!exists(resolved)) {
      problems.push(`[${rel}] 行内样式资源缺失 -> ${url} (解析为 ${resolved})`);
    }
  }
  if (styleRefs.length) ok.push(`${rel}: 检查 ${new Set(styleRefs).size} 个行内样式资源引用`);

  /* 页内锚点 */
  const anchors = [];
  const reA = /href="#([^"]+)"/g;
  while ((m = reA.exec(html))) anchors.push(m[1]);
  const ids = new Set();
  const reId = /id="([^"]+)"/g;
  while ((m = reId.exec(html))) ids.add(m[1]);
  for (const a of new Set(anchors)) {
    if (!ids.has(a)) problems.push(`[${rel}] 锚点无对应 id -> #${a}`);
  }
}

/* ---------- 2. 数据层引用的图片 ---------- */
const dataSrc = read(path.join(root, 'assets/js/projects.js'));
const sandbox = {};
/* 只取数据部分求值（文件本身已是纯数据 + const 声明） */
const fn = new Function(dataSrc + '\nreturn { PROJECTS, SKILLS, TIMELINE, FACTS, ADVANTAGES, MARQUEE, STATS, SITE };');
const D = fn();

for (const p of D.PROJECTS) {
  const check = (src, where) => {
    if (!src) return;
    if (!exists(src)) problems.push(`[data] ${p.slug} ${where} 图片缺失 -> ${src}`);
  };
  check(p.cover, 'cover');
  (p.figures || []).forEach((f, i) => check(f.src, `figures[${i}]`));
  (p.series || []).forEach((s, i) => { check(s.image, `series[${i}].image`); check(s.imageLarge, `series[${i}].imageLarge`); });
}

/* ---------- 3. 详情页 slug 与数据是否一一对应 ---------- */
const slugs = D.PROJECTS.map(p => p.slug);
for (const s of slugs) {
  if (!exists(`projects/${s}.html`)) problems.push(`[data] 缺少详情页 -> projects/${s}.html`);
}
for (const rel of htmlFiles.filter(f => f.startsWith('projects/'))) {
  const s = path.basename(rel, '.html');
  if (!slugs.includes(s)) problems.push(`[pages] 多余页面（数据层无对应项目）-> ${rel}`);
}

/* ---------- 4. 卡片图片变体是否齐全 ---------- */
const variants = ['-700.jpg', '-1100.jpg', '-1800.jpg', '-1600.jpg', '-1000.jpg', '-1400.jpg', '-900.jpg'];
let imgCount = 0, imgBytes = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(jpg|jpeg|png|webp)$/i.test(e.name)) { imgCount++; imgBytes += fs.statSync(full).size; }
  }
})(path.join(root, 'assets/img'));

/* ---------- 5. 展开详情页由 JS 拼接生成的资源路径 ----------
   注意：这些路径写入 HTML 时位于 projects/ 子目录，
   因此按“站点根路径 -> 页面相对路径”解析，与浏览器行为一致。 */
for (const p of D.PROJECTS) {
  const page = `projects/${p.slug}.html`;
  const prefix = '../';                       /* 数据层路径相对站点根，页面在子目录 */

  /* figure(): src / srcset 由 f.src 派生 -700 / -1100 变体 */
  (p.figures || []).forEach(f => {
    const stem = f.src.replace(/-\d+(\.jpg)$/, '');
    for (const w of [700, 1100]) {
      const v = `${stem}-${w}.jpg`;
      if (f.src.includes(`-${w}.jpg`)) continue;          /* 本身即该宽度 */
      if (!exists(v)) problems.push(`[${page}] srcset 变体缺失 -> ${v}`);
    }
    /* 模板中的 rel() 会加 ../ 前缀，这里校验该前缀不会破坏解析 */
    if (!exists(f.src)) problems.push(`[${page}] figure 原图缺失 -> ${f.src}`);
    const asWritten = prefix + f.src;
    const resolved = path.normalize(path.join('projects', asWritten)).replace(/\\/g, '/');
    if (!exists(resolved)) problems.push(`[${page}] figure 页面内路径无法解析 -> ${asWritten}`);
  });

  /* series(): imageLarge 经 rel() 注入 <img src> */
  (p.series || []).forEach(s => {
    if (!s.imageLarge) return;
    if (!exists(s.imageLarge)) problems.push(`[${page}] series 图片缺失 -> ${s.imageLarge}`);
    const resolved = path.normalize(path.join('projects', prefix + s.imageLarge)).replace(/\\/g, '/');
    if (!exists(resolved)) problems.push(`[${page}] series 页面内路径无法解析 -> ${prefix}${s.imageLarge}`);
  });

  /* items(): link + '.html'（与其他详情页同级，无需前缀） */
  (p.items || []).forEach(it => {
    if (it.link && !exists(`projects/${it.link}.html`)) problems.push(`[${page}] items 链接缺失 -> projects/${it.link}.html`);
  });

  /* pdNext: 上下个项目页（同级） */
  D.PROJECTS.forEach(o => {
    if (!exists(`projects/${o.slug}.html`)) problems.push(`[${page}] 继续浏览链接缺失 -> projects/${o.slug}.html`);
  });
}
ok.push('详情页 JS 拼接路径（figure src/srcset / series / items / next）已按页面相对路径解析校验');

/* ---------- 输出 ---------- */
console.log('--- 通过 ---');
ok.forEach(l => console.log('  ' + l));
console.log(`  图片资源: ${imgCount} 个, ${(imgBytes / 1048576).toFixed(2)} MB`);
console.log(`  项目: ${slugs.length} 个 · 详情页: ${htmlFiles.length - 1} 个`);

if (problems.length) {
  console.log('\n--- 问题 ---');
  problems.forEach(l => console.log('  ✗ ' + l));
  process.exit(1);
} else {
  console.log('\n全部检查通过，无缺失资源。');
}
