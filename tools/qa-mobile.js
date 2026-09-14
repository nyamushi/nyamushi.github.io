/* 移动端（390×844）渲染验证：无横向溢出、关键内容可见、截图 */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const base = process.argv[2] || 'http://127.0.0.1:4173';
const D = new Function(
  fs.readFileSync(path.resolve(__dirname, '..', 'assets/js/projects.js'), 'utf8') +
  '\nreturn { PROJECTS };'
)();

const pages = [
  { url: '/', name: 'm-home', must: ['项目作品', '毛安', '「萌宠吸吸」解压文具套装'] },
  ...D.PROJECTS.map(p => ({ url: `/projects/${p.slug}.html`, name: 'm-' + p.slug.slice(0, 16), must: [p.title] }))
];

(async () => {
  const s = await launch(390, 844);
  let bad = 0;

  for (const pg of pages) {
    s.reset();
    await s.goto(base + pg.url, 1200);
    await s.waitForImages();

    const info = await s.measure(`(()=>{
      const de = document.documentElement;
      const over = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > de.clientWidth + 2)
        .slice(0, 6)
        .map(el => el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]
                  + ' right=' + Math.round(el.getBoundingClientRect().right));
      const b = document.getElementById('burger');
      const hero = document.querySelector('.hero__name');
      const stats = document.querySelector('.hero__stats');
      return {
        scrollW: de.scrollWidth, clientW: de.clientWidth,
        hasHOverflow: de.scrollWidth > de.clientWidth + 1,
        overflowers: over,
        navBurgerVisible: b ? getComputedStyle(b).display !== 'none' : null,
        heroFontPx: hero ? getComputedStyle(hero).fontSize : 'n/a',
        statCols: stats ? getComputedStyle(stats).gridTemplateColumns.split(' ').length : 0
      };
    })()`);

    const text = await s.measure('document.body.innerText');
    const missing = pg.must.filter(m => !text.includes(m));

    const problems = [...s.logs, ...s.failedRequests, ...(missing.length ? ['缺少内容 ' + missing] : [])];
    if (info.hasHOverflow) problems.push(`横向溢出 scrollW=${info.scrollW} clientW=${info.clientW} :: ${info.overflowers.join(' | ')}`);
    if (info.navBurgerVisible === false) problems.push('移动端汉堡菜单未显示');
    if (problems.length) bad++;

    const shot = await s.fullShot(path.join(path.resolve(__dirname, '..'), '_qa', `qa-${pg.name}.png`), 390, 844);
    console.log(`${problems.length ? '✗' : '✓'} ${pg.name.padEnd(12)} 高 ${String(shot.height).padStart(5)}px  hero字号 ${info.heroFontPx}  统计列 ${info.statCols}`);
    problems.forEach(p => console.log('    - ' + p));
  }

  s.close();
  console.log(bad ? `\n${bad} 个页面有问题。` : `\n移动端 ${pages.length} 个页面通过：无横向溢出、无报错、关键内容齐全。`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('QA 失败:', e); process.exit(1); });
