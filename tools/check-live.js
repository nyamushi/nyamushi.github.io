/* 检查线上 JS 是否为最新版，并在浏览器里渲染线上站点确认最终内容 */
const { launch } = require('./lib-cdp');

const SITE = 'https://nyamushi.github.io/';

(async () => {
  console.log('--- 线上静态资源版本 ---');
  for (const [name, url, pat] of [
    ['main.js', SITE + 'assets/js/main.js', /想留一份带走|PORTFOLIO · CONTACT/],
    ['projects.js', SITE + 'assets/js/projects.js', /cute-pet-stationery|air-massage-app/],
    ['style.css', SITE + 'assets/css/style.css', /--text-3:\s*#8b877f/]
  ]) {
    try {
      const r = await fetch(url + '?t=' + Date.now());
      const t = await r.text();
      console.log(`  ${r.status}  ${name.padEnd(13)} ${(t.length + ' bytes').padEnd(10)} 最新版标志: ${pat.test(t) ? '有 ✓' : '无'}`);
    } catch (e) { console.log('  ERR', name, e.message); }
  }

  console.log('\n--- 用浏览器渲染线上站点 ---');
  const s = await launch(1440, 900);
  await s.goto(SITE, 2500);
  await s.waitForImages();

  const info = await s.measure(`(()=>({
    title: document.title,
    workCount: (document.getElementById('workCount')||{}).textContent,
    cards: document.querySelectorAll('#projectGrid .card').length,
    cta: !!document.querySelector('.card--cta'),
    ctaTitle: (document.querySelector('.card--cta .card__title')||{}).textContent,
    advCount: document.querySelectorAll('.adv').length,
    advBoldColor: (()=>{const e=document.querySelector('#about .adv strong');return e?getComputedStyle(e).color:null})(),
    factValueColor: (()=>{const e=document.querySelector('#about .fact__v');return e?getComputedStyle(e).color:null})(),
    hasResumeLink: !!document.querySelector('a[href*="resume"]')
  }))()`);

  console.log('  页面标题:', info.title);
  console.log('  项目数(标题):', info.workCount, '| 卡片数:', info.cards);
  console.log('  收尾卡存在:', info.cta, '| 标题:', info.ctaTitle);
  console.log('  优势条目数:', info.advCount);
  console.log('  优势加粗颜色:', info.advBoldColor, '(应为深色 rgb(23, 23, 15))');
  console.log('  信息表值颜色:', info.factValueColor, '(应为深色 rgb(23, 23, 15))');
  console.log('  是否残留简历链接:', info.hasResumeLink);
  console.log('  控制台问题:', [...s.logs, ...s.failedRequests].length ? [...s.logs, ...s.failedRequests] : '无');

  s.close();
  process.exit(0);
})().catch(e => { console.error('检查失败:', e.message); process.exit(1); });
