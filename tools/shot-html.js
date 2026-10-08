/* 渲染优化后的 HTML 并整页截图，确认视觉正常 */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const file = path.resolve(process.argv[2] || 'portfolio-2026/index.html');
const out = path.resolve(process.argv[3] || '_qa/html-optimized.png');

(async () => {
  const s = await launch(1440, 900);
  await s.goto('file:///' + file.replace(/\\/g, '/'), 2500);
  await s.waitForImages();

  const info = await s.measure(`(()=>({
    title: document.title,
    imgs: document.querySelectorAll('img').length,
    broken: [...document.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0).length,
    projects: document.querySelectorAll('article.project').length,
    series: document.querySelectorAll('.series figure').length,
    contacts: document.querySelectorAll('.contactgrid > div').length,
    height: document.body.scrollHeight
  }))()`);

  console.log('标题        :', info.title);
  console.log('图片        :', info.imgs, '张，未加载', info.broken, '张');
  console.log('项目块      :', info.projects);
  console.log('文创系列图  :', info.series);
  console.log('联系信息块  :', info.contacts);
  console.log('页面高度    :', info.height, 'px');

  const shot = await s.fullShot(out);
  console.log(`截图        : ${out}  ${shot.width}x${shot.height}  ${(shot.bytes / 1024).toFixed(0)} KB`);
  console.log('控制台问题  :', [...s.logs, ...s.failedRequests].length ? [...s.logs, ...s.failedRequests].slice(0, 5) : '无');

  s.close();
  process.exit(info.broken ? 1 : 0);
})().catch(e => { console.error('渲染失败:', e.message); process.exit(1); });
