/* ==========================================================================
   单页截图：node tools/qa-shot.js <url> <out.png> [full|viewport]
   依赖 lib-cdp（复用滚动拼接逻辑）
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.argv[3] || path.join(__dirname, '..', '_qa', 'shot.png');
const full = (process.argv[4] || 'full') === 'full';

(async () => {
  const s = await launch(1440, 900);
  await s.goto(url, 1500);
  await s.waitForImages();

  let info;
  if (full) {
    info = await s.fullShot(out);
    console.log(`整页高 ${info.height}px · ${info.slices} 屏拼接 · ${(info.bytes / 1024).toFixed(0)} KB`);
  } else {
    const shot = await s.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    info = { bytes: fs.statSync(out).size };
    console.log(`视口截图 1440x900 · ${(info.bytes / 1024).toFixed(0)} KB`);
  }
  console.log('输出: ' + out);
  console.log(s.logs.length || s.failedRequests.length
    ? '\n问题:\n' + [...s.logs, ...s.failedRequests].join('\n')
    : '\n无控制台报错、无失败请求。');

  s.close();
  process.exit(0);
})().catch(e => { console.error('截图失败:', e.message); process.exit(1); });
