/* 把某个项目块滚动到视口内直接截图，避免整页拼接产生重影 */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const file = path.resolve(process.argv[2]);
const anchor = process.argv[3] || 'p05';
const out = path.resolve(process.argv[4] || '_qa/inview.png');

(async () => {
  const s = await launch(1440, 900);
  await s.goto('file:///' + file.replace(/\\/g, '/'), 2500);
  await s.waitForImages();

  const y = await s.measure(
    `Math.round(document.getElementById(${JSON.stringify(anchor)}).getBoundingClientRect().top + scrollY)`);
  await s.send('Runtime.evaluate',
    { expression: `window.scrollTo(0, ${Math.max(0, y - 30)}); 1`, returnByValue: true });
  await new Promise(r => setTimeout(r, 1000));

  const shot = await s.send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`已截图 ${anchor} -> ${out}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  s.close();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
