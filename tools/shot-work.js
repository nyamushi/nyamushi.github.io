/* 抓取首页项目区局部截图：node tools/shot-work.js */
const path = require('path');
const { launch } = require('./lib-cdp');

(async () => {
  const s = await launch(1440, 900);
  await s.goto('http://127.0.0.1:4173/', 1200);
  await s.waitForImages();

  /* 定位项目区，从其上方一点开始截 */
  const y = await s.measure(`Math.round(document.getElementById('work').getBoundingClientRect().top + scrollY)`);
  const h = await s.measure(`Math.round(document.getElementById('work').getBoundingClientRect().height)`);
  console.log(`项目区 y=${y} 高=${h}`);

  const info = await s.fullShot(
    path.join(__dirname, '..', '_qa', 'work-section.png'),
    1440, 900, Math.max(0, y - 20), y - 20 + 2650
  );
  console.log(`输出 work-section.png  ${info.width}x${info.height}  ${(info.bytes / 1024).toFixed(0)} KB`);
  s.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
