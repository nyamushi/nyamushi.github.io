/* ==========================================================================
   生成 A4 打印版作品集（HTML + PDF）
   用法: node tools/build-pdf.js
   内容全部来自 assets/js/projects.js，与网站保持同源，
   改数据层后重跑本脚本即可同步更新 PDF。
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'print');
const D = new Function(
  fs.readFileSync(path.join(root, 'assets/js/projects.js'), 'utf8') +
  '\nreturn { SITE, STATS, FACTS, ADVANTAGES, SKILLS, PROJECTS, TIMELINE };'
)();

const esc = s => String(s == null ? '' : s);
const strip = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '');

/* 选一张实际存在且宽度最合适的图片变体（打印用大图）
   注意：不同项目生成的变体宽度不同（有的没有 1800），
   所以必须查磁盘，不能假定某个宽度存在。 */
const VARIANTS = [1800, 1600, 1400, 1280, 1100, 1000, 900, 700];
function pick(src, want) {
  const m = src.match(/^(.*)-(\d+)\.jpg$/);
  if (!m) return existsRel(src) ? '../' + src : null;
  const base = m[1];
  const avail = VARIANTS.filter(w => fs.existsSync(path.join(root, base + '-' + w + '.jpg')));
  if (!avail.length) return null;
  /* 不超过期望宽度的最大可用变体；若都超过则取最小的 */
  const fit = avail.filter(w => w <= want);
  const chosen = fit.length ? Math.max.apply(null, fit) : Math.min.apply(null, avail);
  return '../' + base + '-' + chosen + '.jpg';
}
function existsRel(src) { return fs.existsSync(path.join(root, src)); }

const PROJECTS = D.PROJECTS;

/* ============================ 页面片段 ============================ */

function coverPage() {
  /* 封面背景用干净的产品渲染图，而不是信息密集的竞赛展板 ——
     展板上的小字会穿透文字层，干扰封面阅读 */
  const bg = imgFor('assets/img/robot/render-side-1800.jpg', 1800);
  return `
<section class="page page--cover">
  <div class="cover__bg"><img src="${bg}" alt=""></div>
  <div class="cover__inner">
    <p class="cover__eyebrow">Portfolio ${new Date().getFullYear()}</p>
    <h1 class="cover__name">${esc(D.SITE.name)}</h1>
    <p class="cover__role">${esc(D.SITE.role)}</p>
    <p class="cover__school">${esc(D.SITE.school)} · ${esc(D.SITE.major)}</p>
    <div class="cover__line"></div>
    <p class="cover__tag">用造型、结构与 CMF，把想法做成能被摸到的东西。</p>
    <div class="cover__contact">
      <span>${esc(D.SITE.phone)}</span><span class="dot">·</span>
      <span>${esc(D.SITE.email)}</span><span class="dot">·</span>
      <span>${esc(D.SITE.city)}</span>
    </div>
    <p class="cover__status">${esc(D.SITE.status)}</p>
  </div>
</section>`;
}

function page(content, opts) {
  const o = opts || {};
  const head = o.head === false ? '' : `
  <header class="ph">
    <span class="ph__mark">M</span>
    <span class="ph__name">${esc(D.SITE.name)} · 工业设计作品集</span>
    <span class="ph__page">${o.tag || ''}</span>
  </header>`;
  return `<section class="page">
  ${head}
  <div class="pb">${content}</div>
  <footer class="pf"><span>${esc(D.SITE.name)} · ${esc(D.SITE.phone)} · ${esc(D.SITE.email)}</span></footer>
</section>`;
}

function profilePage() {
  const adv = D.ADVANTAGES.map(a =>
    `<li><span class="n">${a.i}</span><span>${a.t}</span></li>`).join('');
  const facts = D.FACTS.map(f =>
    `<tr><th>${f.k}</th><td>${f.v}</td></tr>`).join('');
  const skills = D.SKILLS.map(s => `
    <div class="skill">
      <p class="skill__t">${s.label}</p>
      <ul>${s.items.map(i => `<li>${strip(i)}</li>`).join('')}</ul>
    </div>`).join('');
  const stats = D.STATS.map(s =>
    `<div class="stat"><p class="stat__n">${s.num}<span>${s.unit}</span></p><p class="stat__l">${s.label}</p></div>`).join('');

  return page(`
    <h2 class="h1">关于我<span class="h1__en">Profile</span></h2>
    <p class="lead">我是${esc(D.SITE.name)}，${esc(D.SITE.school)}工业设计专业本科在读。比起单纯追求视觉冲击，我更在意一件事：<strong>这个产品在真实场景里到底怎么被使用、怎么被维护、怎么被生产。</strong></p>

    <div class="stats">${stats}</div>

    <div class="cols cols--2">
      <div>
        <h3 class="h3">个人优势</h3>
        <ul class="adv">${adv}</ul>
      </div>
      <div>
        <h3 class="h3">基本信息</h3>
        <table class="kv">${facts}</table>
      </div>
    </div>

    <h3 class="h3">能力清单</h3>
    <div class="skills">${skills}</div>
  `, { tag: 'Profile' });
}

function indexPage() {
  const rows = PROJECTS.map((p, i) => `
    <tr>
      <td class="idx">${p.index}</td>
      <td class="ttl"><strong>${esc(p.title)}</strong><br><span>${esc(p.subtitle)}</span></td>
      <td class="yr">${esc(p.year)}</td>
      <td class="cat">${esc(p.category)}</td>
    </tr>`).join('');

  const timeline = D.TIMELINE.map(t => `
    <div class="tl">
      <div class="tl__w">${esc(t.when)}</div>
      <div><p class="tl__r">${esc(t.role)}</p><p class="tl__o">${esc(t.org)}</p><p class="tl__d">${esc(t.desc)}</p></div>
    </div>`).join('');

  return page(`
    <h2 class="h1">项目索引<span class="h1__en">Contents</span></h2>
    <table class="idx-table"><tbody>${rows}</tbody></table>

    <h3 class="h3">经历与实践</h3>
    <div class="timeline">${timeline}</div>
  `, { tag: 'Contents' });
}

/* 图注 + 大图 */
function fig(src, cap, cls) {
  return `<figure class="fig ${cls || ''}"><img src="${src}" alt=""><figcaption>${esc(cap)}</figcaption></figure>`;
}

/* 打印版图片引用解析（记录缺失，构建结束统一报告） */
const missing = [];
function imgFor(src, want) {
  const r = pick(src, want);
  if (!r) missing.push(src);
  return r || '';
}

function projectPages(p) {
  const pages = [];

  /* ---- 汇总型项目（无独立图纸，只有条目清单）：单页专用排版 ---- */
  if (p.items) {
    const cards = p.items.map(it => `
      <div class="mi">
        <div class="mi__top"><strong>${esc(it.title)}</strong><span>${esc(it.tag)}</span></div>
        <p class="mi__en">${esc(it.en)}</p>
        <p class="mi__d">${esc(it.desc)}</p>
      </div>`).join('');
    pages.push(page(`
      <div class="pj-head">
        <span class="pj-index">${p.index}</span>
        <div>
          <h2 class="pj-title">${esc(p.title)}</h2>
          <p class="pj-sub">${esc(p.subtitle)}</p>
          <p class="pj-en">${esc(p.titleEn)}</p>
        </div>
      </div>
      <div class="prose">${(p.overview || []).map(t => `<p>${t}</p>`).join('')}</div>
      <h3 class="h3 h3--gap">项目清单</h3>
      <div class="mini-grid">${cards}</div>
      ${p.specs ? `<h3 class="h3 h3--gap">整体说明</h3><table class="kv">${p.specs.map(s => `<tr><th>${s.k}</th><td>${s.v}</td></tr>`).join('')}</table>` : ''}
    `, { tag: p.index + ' · ' + p.titleEn }));
    return pages.join('');
  }

  /* 图文分工：每个项目一页，上半图、下半要点与参数 */
  const points = (p.bullets || p.requirements || []).slice(0, 6).map(b =>
    `<li><span class="n">${b.i}</span><span>${b.t}</span></li>`).join('');

  const specs = (p.specs || []).map(s =>
    `<tr><th>${s.k}</th><td>${s.v}</td></tr>`).join('');

  const swatches = (p.cmf && p.cmf.swatches)
    ? `<div class="sw">${p.cmf.swatches.map(s =>
        `<span class="sw__i"><i style="background:${s.hex}"></i>${s.name}</span>`).join('')}</div>`
    : '';

  const hero = (p.figures && p.figures[0]) || null;
  const heroSrc = hero ? imgFor(hero.src, 1800) : (p.cover ? imgFor(p.cover, 1800) : '');
  const heroCap = hero ? hero.cap : (p.coverAlt || p.title);

  /* ---- 主视觉页：大图 + 概述 ---- */
  pages.push(page(`
    <div class="pj-head">
      <span class="pj-index">${p.index}</span>
      <div>
        <h2 class="pj-title">${esc(p.title)}</h2>
        <p class="pj-sub">${esc(p.subtitle)}</p>
        <p class="pj-en">${esc(p.titleEn)}</p>
      </div>
    </div>
    <div class="pj-meta">
      <span><b>分类</b>${esc(p.category)}</span>
      <span><b>时间</b>${esc(p.year)}</span>
      <span><b>角色</b>${esc(p.role)}</span>
      ${p.award ? `<span><b>性质</b>${esc(p.award)}</span>` : ''}
      ${p.team ? `<span><b>团队</b>${esc(p.team)}</span>` : ''}
    </div>
    ${heroSrc ? fig(heroSrc, heroCap, 'fig--hero') : ''}
    <div class="prose">${(p.overview || []).map(t => `<p>${t}</p>`).join('')}</div>
  `, { tag: p.index + ' · ' + p.titleEn }));

  /* ---- 要点页：设计要点 / 参数 / CMF ---- */
  if (points || specs || swatches) {
    pages.push(page(`
      <div class="pj-head pj-head--slim">
        <span class="pj-index">${p.index}</span>
        <div><h2 class="pj-title pj-title--s">${esc(p.title)}</h2></div>
      </div>
      <div class="cols cols--2">
        <div>
          <h3 class="h3">${p.bullets ? '设计要点' : '需求与目标'}</h3>
          <ul class="adv">${points}</ul>
        </div>
        <div>
          ${specs ? `<h3 class="h3">规格与参数</h3><table class="kv">${specs}</table>` : ''}
          ${swatches ? `<h3 class="h3 h3--gap">CMF 色彩</h3>${swatches}` : ''}
        </div>
      </div>
      ${p.workflow ? `<h3 class="h3 h3--gap">工作流程</h3>
        <ol class="flow">${p.workflow.map((w, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${esc(w)}</li>`).join('')}</ol>` : ''}
    `, { tag: p.index + ' · 设计说明' }));
  }

  /* ---- 补充图页 ---- */
  const extra = [];
  if (p.figures && p.figures.length > 1) extra.push(...p.figures.slice(1));
  if (p.series) extra.push(...p.series.map(s => ({ src: s.image, cap: s.name + ' · ' + s.slogan })));
  if (extra.length) {
    pages.push(page(`
      <div class="pj-head pj-head--slim">
        <span class="pj-index">${p.index}</span>
        <div><h2 class="pj-title pj-title--s">${esc(p.title)}<span class="pj-title__more">更多图纸</span></h2></div>
      </div>
      ${extra.slice(0, 3).map(f => fig(imgFor(f.src, 1800), f.cap || f.alt || '', extra.length > 1 ? 'fig--half' : 'fig--hero')).join('')}
    `, { tag: p.index + ' · 图纸' }));
  }

  /* ---- App 界面（按摩仪） ---- */
  if (p.uiScreens) {
    pages.push(page(`
      <div class="pj-head pj-head--slim">
        <span class="pj-index">${p.index}</span>
        <div><h2 class="pj-title pj-title--s">界面方案<span class="pj-title__more">App Screens</span></h2></div>
      </div>
      <div class="ui">${p.uiScreens.map(u =>
        `<figure class="ui__i"><img src="${imgFor(u.src, 900)}" alt=""><figcaption><b>${esc(u.name)}</b><span>${esc(u.desc)}</span></figcaption></figure>`).join('')}
      </div>
    `, { tag: p.index + ' · 界面' }));
  }

  return pages.join('');
}

function contactPage() {
  return `
<section class="page page--end">
  <div class="end__inner">
    <p class="end__eyebrow">Get in Touch</p>
    <h2 class="end__title">正在寻找<br>工业设计 / 产品设计<br>方向的机会。</h2>
    <p class="end__desc">${esc(D.SITE.status)}。欢迎就岗位、项目或作品细节与我联系，也随时可以安排面试与作品讲解。</p>
    <table class="kv kv--end">
      <tr><th>电话</th><td>${esc(D.SITE.phone)}</td></tr>
      <tr><th>邮箱</th><td>${esc(D.SITE.email)}</td></tr>
      <tr><th>城市</th><td>${esc(D.SITE.city)}</td></tr>
      <tr><th>院校</th><td>${esc(D.SITE.school)} · ${esc(D.SITE.major)}</td></tr>
      <tr><th>B 站</th><td>@${esc(D.SITE.bilibili)}</td></tr>
    </table>
    <p class="end__foot">本作品集在线版：https://nyamushi.github.io/</p>
  </div>
</section>`;
}

/* ============================ 组装 ============================ */

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${esc(D.SITE.name)} · 工业设计作品集</title>
<style>
/* ---------- 页面设置：A4，四周 14mm ---------- */
@page { size: A4; margin: 14mm 14mm 12mm; }

:root {
  --ink:   #16161a;
  --ink-2: #46464e;
  --ink-3: #787882;
  --line:  #dcdcd8;
  --line-2:#b9b9b4;
  --paper: #ffffff;
  --acc:   #c2450f;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: #8a8a8a;
  color: var(--ink);
  font-family: "Inter", -apple-system, "Segoe UI", "Noto Sans SC", "PingFang SC",
               "Microsoft YaHei", sans-serif;
  font-size: 10pt;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
img { display: block; max-width: 100%; }

/* 屏幕预览时把 A4 页居中显示；
   注意：页面内边距必须留在 .page 自身（而不是 @page margin），
   因为页眉页脚是绝对定位到页面盒的，padding 归零会让它们压到内容上。 */
.page {
  position: relative;
  width: 210mm;
  height: 297mm;
  padding: 14mm 14mm 12mm;
  margin: 0 auto 8mm;
  background: var(--paper);
  overflow: hidden;
}
/* 打印：@page margin 归零，由 .page 的 padding 负责留白。
   高度改为 auto —— 固定 297mm 会在内容不足时留大片空白。 */
@page { size: A4; margin: 0; }
@media print {
  body { background: #fff; }
  .page {
    height: auto;
    min-height: 0;
    margin: 0;
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  /* 封面内容全是绝对定位，无法撑开高度 —— 必须显式给回 A4 高度 */
  .page--cover { height: 297mm; }
  .page:last-child { page-break-after: auto; break-after: auto; }
}

/* ---------- 页眉页脚 ---------- */
.ph {
  position: absolute; top: 14mm; left: 14mm; right: 14mm;
  display: flex; align-items: center; gap: 5mm;
  padding-bottom: 2.4mm; border-bottom: 0.5pt solid var(--line);
  font-size: 7.4pt; color: var(--ink-3);
}
.ph__mark {
  width: 5.2mm; height: 5.2mm; border-radius: 1.3mm;
  background: var(--acc); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 7pt;
}
.ph__name { font-weight: 600; color: var(--ink-2); }
.ph__page { margin-left: auto; font-family: ui-monospace, Consolas, monospace; letter-spacing: .04em; }
/* 页脚不使用：它靠绝对定位贴底，会与末页时间线内容重叠，
   而联系方式在封面与末页都已给出。保留选择器以便日后启用。 */
.pf { display: none; }
.pb { padding-top: 9mm; }

/* 封面：图片铺满整页并压暗，文字置于其上 */
.page--cover { padding: 0; background: #0b0b0c; }
.cover__bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.cover__bg img {
  width: 100%; height: 100%; object-fit: cover; object-position: 62% 46%;
  /* 适度模糊 + 压暗，让背景只作为氛围，不干扰前景文字 */
  filter: blur(2.5px) saturate(.85) brightness(.62);
  transform: scale(1.04);
}
.cover__bg::after {
  content: ""; position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(10,10,12,.72) 0%, rgba(10,10,12,.42) 30%, rgba(10,10,12,.86) 62%, rgba(10,10,12,.985) 100%),
    linear-gradient(90deg, rgba(10,10,12,.86) 0%, rgba(10,10,12,.4) 52%, rgba(10,10,12,.2) 100%);
}
.cover__inner {
  position: absolute; z-index: 1; left: 20mm; right: 20mm; bottom: 30mm;
  color: #fff;
}
.cover__eyebrow {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 8pt; letter-spacing: .3em; text-transform: uppercase;
  color: rgba(255,255,255,.78); margin: 0 0 6mm;
}
.cover__name { font-size: 46pt; line-height: .95; letter-spacing: -.04em; margin: 0 0 3mm; font-weight: 700; text-shadow: 0 1px 8px rgba(0,0,0,.5); }
.cover__role { font-size: 15pt; margin: 0 0 1.5mm; color: #fff; font-weight: 500; }
.cover__school { font-size: 10pt; margin: 0; color: rgba(255,255,255,.82); }
.cover__line { width: 26mm; height: 1.4mm; background: #ff5a1f; margin: 7mm 0; }
.cover__tag { font-size: 11.5pt; color: rgba(255,255,255,.9); margin: 0 0 8mm; max-width: 108mm; line-height: 1.5; }
.cover__contact { font-size: 9.5pt; color: rgba(255,255,255,.86); display: flex; gap: 2.5mm; flex-wrap: wrap; }
.cover__contact .dot { color: rgba(255,255,255,.45); }
.cover__status { font-size: 8.6pt; color: #ffb020; margin: 3mm 0 0; }

/* ---------- 通用标题 ---------- */
.h1 {
  font-size: 22pt; letter-spacing: -.03em; line-height: 1.1;
  margin: 0 0 6mm; font-weight: 700;
  display: flex; align-items: baseline; gap: 4mm; flex-wrap: wrap;
}
.h1__en {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 9pt; letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink-3); font-weight: 400;
}
.h1::after { content: ""; }

.h3 {
  font-size: 8.4pt; font-family: ui-monospace, Consolas, monospace;
  letter-spacing: .16em; text-transform: uppercase;
  color: var(--acc); font-weight: 600;
  margin: 0 0 3.4mm; padding-bottom: 1.8mm;
  border-bottom: 0.5pt solid var(--line);
}
.h3--gap { margin-top: 7mm; }
.h3:first-child { margin-top: 0; }

.lead { font-size: 11pt; line-height: 1.7; color: var(--ink-2); margin: 0 0 7mm; }
.lead strong { color: var(--ink); }

/* ---------- 布局 ---------- */
.cols { display: grid; gap: 9mm; }
.cols--2 { grid-template-columns: 1fr 1fr; }

/* 数据条 */
.stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0; margin-bottom: 8mm;
  border: 0.5pt solid var(--line); border-radius: 2mm; overflow: hidden;
}
.stat { padding: 3.4mm 4mm; border-right: 0.5pt solid var(--line); }
.stat:last-child { border-right: 0; }
.stat__n { font-family: ui-monospace, Consolas, monospace; font-size: 15pt; font-weight: 600; margin: 0; line-height: 1.1; }
.stat__n span { font-size: 8pt; color: var(--acc); margin-left: .6mm; }
.stat__l { font-size: 7.6pt; color: var(--ink-3); margin: .8mm 0 0; line-height: 1.4; }

/* 要点列表 */
.adv { list-style: none; margin: 0; padding: 0; display: grid; gap: 3mm; }
.adv li { display: grid; grid-template-columns: 6mm 1fr; gap: 2.4mm; font-size: 9pt; color: var(--ink-2); line-height: 1.6; }
.adv .n { font-family: ui-monospace, Consolas, monospace; font-size: 7pt; color: var(--acc); padding-top: .7mm; }
.adv strong { color: var(--ink); font-weight: 600; }

/* 键值表 */
.kv { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
.kv th, .kv td { text-align: left; padding: 2mm 0; border-bottom: 0.5pt solid var(--line); vertical-align: top; }
.kv th {
  width: 26%; font-family: ui-monospace, Consolas, monospace;
  font-size: 7.4pt; color: var(--ink-3); font-weight: 400; letter-spacing: .04em;
}
.kv td { color: var(--ink); }

/* 能力 */
.skills { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
.skill__t {
  font-size: 8pt; font-family: ui-monospace, Consolas, monospace;
  letter-spacing: .12em; text-transform: uppercase; color: var(--acc);
  margin: 0 0 2.4mm; padding-bottom: 1.6mm; border-bottom: 0.5pt solid var(--line);
}
.skill ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.6mm; }
.skill li { font-size: 8.6pt; color: var(--ink-2); }

/* 索引表 */
.idx-table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; }
.idx-table td { padding: 3mm 3mm 3mm 0; border-bottom: 0.5pt solid var(--line); vertical-align: top; }
.idx-table .idx { font-family: ui-monospace, Consolas, monospace; font-size: 9pt; color: var(--acc); width: 10mm; }
.idx-table .ttl strong { font-size: 10.5pt; }
.idx-table .ttl span { font-size: 8.4pt; color: var(--ink-3); }
.idx-table .yr { font-family: ui-monospace, Consolas, monospace; font-size: 8pt; color: var(--ink-3); width: 18mm; white-space: nowrap; }
.idx-table .cat { font-size: 8.4pt; color: var(--ink-2); width: 24mm; }

/* 时间线 */
.timeline { display: grid; gap: 4mm; }
.tl { display: grid; grid-template-columns: 30mm 1fr; gap: 5mm; }
.tl__w { font-family: ui-monospace, Consolas, monospace; font-size: 7.8pt; color: var(--ink-3); padding-top: .6mm; }
.tl__r { font-size: 10pt; font-weight: 600; margin: 0; }
.tl__o { font-size: 8.4pt; color: var(--acc); margin: .4mm 0 1mm; }
.tl__d { font-size: 8.6pt; color: var(--ink-2); margin: 0; line-height: 1.6; }

/* ---------- 项目页 ---------- */
.pj-head { display: flex; gap: 5mm; align-items: flex-start; margin-bottom: 4mm; }
.pj-head--slim { margin-bottom: 5mm; }
.pj-index {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 20pt; line-height: .9; color: var(--acc); font-weight: 600;
  flex: none; letter-spacing: -.02em;
}
.pj-title { font-size: 19pt; letter-spacing: -.03em; line-height: 1.12; margin: 0 0 2mm; }
.pj-title--s { font-size: 14pt; }
.pj-title__more {
  font-family: ui-monospace, Consolas, monospace; font-size: 8pt;
  letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3);
  font-weight: 400; margin-left: 4mm;
}
.pj-sub { font-size: 9.6pt; color: var(--ink-2); margin: 0 0 1.5mm; line-height: 1.55; max-width: 150mm; }
.pj-en {
  font-family: ui-monospace, Consolas, monospace; font-size: 7.6pt;
  letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); margin: 0;
}
.pj-meta {
  display: flex; flex-wrap: wrap; gap: 2mm 7mm;
  padding: 2.6mm 3.4mm; margin-bottom: 5mm;
  background: #f6f5f2; border-radius: 1.6mm;
  font-size: 8.4pt; color: var(--ink);
}
.pj-meta b {
  font-family: ui-monospace, Consolas, monospace; font-size: 7pt;
  color: var(--ink-3); font-weight: 400; letter-spacing: .1em;
  text-transform: uppercase; margin-right: 1.6mm;
}

/* 图 */
.fig { margin: 0 0 4mm; }
.fig img {
  width: 100%; border: 0.5pt solid var(--line); border-radius: 1.6mm;
  background: #fff;
}
/* 单页可容纳高度有限（A4 内容高约 271mm），主图压到 96mm 以内，
   保证标题 + 元信息 + 概述文字不会溢到下页 */
.fig--hero img { max-height: 96mm; object-fit: contain; }
.fig--half img { max-height: 62mm; object-fit: contain; }
.fig figcaption {
  font-size: 7.2pt; color: var(--ink-3); margin-top: 1.4mm;
  font-family: ui-monospace, Consolas, monospace;
}
.fig figcaption::before { content: "— "; }

.prose p { font-size: 9pt; color: var(--ink-2); line-height: 1.66; margin: 0 0 2.4mm; }
.prose strong { color: var(--ink); }
.prose p:last-child { margin-bottom: 0; }

/* CMF 色板 */
.sw { display: flex; flex-wrap: wrap; gap: 2mm 4mm; }
.sw__i { display: flex; align-items: center; gap: 1.8mm; font-size: 8pt; color: var(--ink-2); }
.sw__i i { width: 5mm; height: 5mm; border-radius: 1mm; border: 0.5pt solid var(--line-2); display: block; }

/* 流程 */
.flow { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.8mm; }
.flow li { display: grid; grid-template-columns: 8mm 1fr; gap: 2mm; font-size: 8.6pt; color: var(--ink-2); }
.flow li span { font-family: ui-monospace, Consolas, monospace; font-size: 7pt; color: var(--acc); padding-top: .5mm; }

/* App 界面 */
.ui { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.ui__i { margin: 0; }
.ui__i img { width: 100%; border: 0.5pt solid var(--line); border-radius: 2mm; }
.ui__i figcaption { margin-top: 2mm; display: grid; gap: .6mm; }
.ui__i figcaption b { font-size: 8.4pt; }
.ui__i figcaption span { font-size: 7.2pt; color: var(--ink-3); line-height: 1.45; }

/* 汇总型项目的条目卡片 */
.mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3.4mm 6mm; }
.mi { padding: 3mm 3.6mm; background: #f6f5f2; border-radius: 1.6mm; }
.mi__top { display: flex; align-items: baseline; justify-content: space-between; gap: 3mm; }
.mi__top strong { font-size: 10pt; }
.mi__top span {
  font-family: ui-monospace, Consolas, monospace; font-size: 7pt;
  color: var(--acc); letter-spacing: .06em; flex: none;
}
.mi__en {
  font-family: ui-monospace, Consolas, monospace; font-size: 6.8pt;
  letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3);
  margin: .8mm 0 1.4mm;
}
.mi__d { font-size: 8.6pt; color: var(--ink-2); margin: 0; line-height: 1.5; }

/* ---------- 末页 ---------- */
.page--end { display: flex; align-items: center; }
.end__inner { padding: 0 6mm; }
.end__eyebrow {
  font-family: ui-monospace, Consolas, monospace; font-size: 8pt;
  letter-spacing: .3em; text-transform: uppercase; color: var(--acc); margin: 0 0 6mm;
}
.end__title { font-size: 28pt; line-height: 1.12; letter-spacing: -.035em; margin: 0 0 6mm; font-weight: 700; }
.end__desc { font-size: 10.4pt; color: var(--ink-2); line-height: 1.7; margin: 0 0 9mm; max-width: 130mm; }
.kv--end th { width: 22mm; }
.kv--end td { font-size: 10.4pt; padding: 2.6mm 0; }
.end__foot { font-size: 8.4pt; color: var(--ink-3); margin: 9mm 0 0; font-family: ui-monospace, Consolas, monospace; }
</style>
</head>
<body>
${coverPage()}
${profilePage()}
${indexPage()}
${PROJECTS.map(projectPages).join('')}
${contactPage()}
</body>
</html>`;

/* ============================ 输出 ============================ */

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'portfolio.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const pages = (html.match(/class="page/g) || []).length;
  console.log(`HTML 已生成: print/portfolio.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB  共 ${pages} 页`);
  if (missing.length) {
    console.log(`\n缺失图片 ${missing.length} 处（这些位置会留空）：`);
    Array.from(new Set(missing)).forEach(m => console.log('  - ' + m));
  } else {
    console.log('图片引用全部解析成功');
  }

  const s = await launch(1240, 1754);
  await s.goto('file:///' + htmlPath.replace(/\\/g, '/'), 2500);
  await s.waitForImages();

  /* 页面溢出检测：.page 是 overflow:hidden 的固定 A4 盒，
     内容超出会被静默裁掉，所以必须量出来。 */
  const report = await s.measure(`(()=>{
    const pages = [...document.querySelectorAll('.page')];
    return pages.map((pg, i) => {
      const last = pg.querySelector('.pf') || pg.lastElementChild;
      const pr = pg.getBoundingClientRect();
      let contentBottom = 0;
      pg.querySelectorAll('.pb > *, .pb > * > *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0) contentBottom = Math.max(contentBottom, r.bottom - pr.top);
      });
      const cs = getComputedStyle(pg);
      const limit = pg.clientHeight - parseFloat(cs.paddingBottom);
      return { n: i + 1, content: Math.round(contentBottom), limit: Math.round(limit) };
    });
  })()`);

  const overflow = report.filter(r => r.content > r.limit + 2);
  console.log(`\n页面溢出检测（共 ${report.length} 页，内容高度 / 可用高度）`);
  if (overflow.length) {
    overflow.forEach(r => console.log(`  !! 第 ${r.n} 页溢出 ${r.content - r.limit}px  (${r.content} / ${r.limit})`));
  } else {
    const tight = report.filter(r => r.content > r.limit - 20);
    console.log('  全部页面内容均在范围内');
    if (tight.length) console.log('  接近边界的页: ' + tight.map(r => `第${r.n}页(${r.content}/${r.limit})`).join(' '));
  }

  /* 检查页面内是否还有加载失败的图片 */
  const broken = await s.measure(`[...document.querySelectorAll('img')]
    .filter(i => !i.complete || i.naturalWidth === 0)
    .map(i => i.getAttribute('src'))`);
  if (broken.length) {
    console.log(`\n浏览器端仍有 ${broken.length} 张图未加载：`);
    Array.from(new Set(broken)).slice(0, 10).forEach(b => console.log('  - ' + b));
  } else {
    console.log('浏览器端确认：所有图片均已加载');
  }

  const pdf = await s.send('Page.printToPDF', {
    printBackground: true,
    paperWidth: 8.27, paperHeight: 11.69,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    preferCSSPageSize: true
  });
  const buf = Buffer.from(pdf.data, 'base64');
  const pdfPath = path.join(outDir, '毛安-工业设计作品集.pdf');
  fs.writeFileSync(pdfPath, buf);
  console.log(`\nPDF 已生成: print/毛安-工业设计作品集.pdf  ${(buf.length / 1024 / 1024).toFixed(2)} MB`);

  s.close();
  process.exit(missing.length || broken.length || overflow.length ? 1 : 0);
})().catch(e => { console.error('生成失败:', e.message); process.exit(1); });
