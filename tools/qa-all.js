/* ==========================================================================
   全站自检：逐页真实渲染，检查 JS 报错、4xx/5xx 请求、关键内容与截图
   用法: node tools/qa-all.js [baseUrl]
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const root = path.resolve(__dirname, '..');
const base = process.argv[2] || 'http://127.0.0.1:4173';
const outDir = path.join(root, '_qa');

/* 读取数据层，拿到 slug 列表 */
const D = new Function(
  fs.readFileSync(path.join(root, 'assets/js/projects.js'), 'utf8') +
  '\nreturn { PROJECTS, SITE };'
)();

const pages = [
  { url: '/', name: 'home', must: ['项目作品', '毛安', '15924124508', '其他课程项目'] },
  ...D.PROJECTS.map((p, i) => ({
    url: `/projects/${p.slug}.html`,
    name: p.slug,
    must: [p.title]
  }))
];

(async () => {
  const s = await launch(1440, 900);
  let bad = 0;

  for (const pg of pages) {
    s.reset();
    await s.goto(base + pg.url);
    const imgWait = await s.waitForImages();
    const shot = await s.fullShot(path.join(outDir, `qa-${pg.name}.png`));

    /* 取渲染后的正文，校验关键内容确实出现在 DOM 里 */
    const { result } = await s.send('Runtime.evaluate', {
      expression: 'document.body.innerText', returnByValue: true
    });
    const text = result.value || '';
    const missing = pg.must.filter(m => !text.includes(m));
    const hasUndef = /\bundefined\b/.test(text);

    const problems = [];
    if (s.logs.length) problems.push(...s.logs);
    if (s.failedRequests.length) problems.push(...s.failedRequests.map(r => '资源 ' + r));
    if (missing.length) problems.push('缺少关键内容: ' + missing.join(', '));
    if (hasUndef) problems.push('页面上出现 "undefined" 字样');
    if (imgWait.pending.length) problems.push('图片未加载完成: ' + imgWait.pending.join(', '));

    /* 校验所有图片真实渲染出来了（自然尺寸 > 0） */
    const broken = await s.measure(`[...document.querySelectorAll('img')]
      .filter(i => i.getBoundingClientRect().width > 0 && (!i.complete || i.naturalWidth === 0))
      .map(i => i.getAttribute('src'))`);
    if (broken.length) problems.push('图片未成功渲染: ' + broken.join(', '));

    const okFlag = problems.length === 0;
    if (!okFlag) bad++;
    console.log(`${okFlag ? '✓' : '✗'} ${pg.name.padEnd(26)} 高 ${String(shot.height).padStart(5)}px  截图 ${(shot.bytes / 1024).toFixed(0)} KB`);
    problems.forEach(p => console.log('    - ' + p));
  }

  s.close();
  console.log(bad ? `\n${bad}/${pages.length} 个页面存在问题。` : `\n全部 ${pages.length} 个页面通过：无 JS 报错、无失败请求、关键内容齐全。`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('QA 失败:', e); process.exit(1); });
