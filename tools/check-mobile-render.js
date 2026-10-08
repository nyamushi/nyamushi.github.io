/* 在手机宽度下渲染首页，检查横向溢出、图片加载与整体观感 */
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib-cdp');

const file = path.resolve(process.argv[2] || 'index.html');
const outDir = path.resolve('_qa');
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: 'iPhone-390', w: 390, h: 844 },
  { name: 'Android-360', w: 360, h: 800 },
];

(async () => {
  for (const vp of VIEWPORTS) {
    const s = await launch(vp.w, vp.h);
    await s.goto('file:///' + file.replace(/\\/g, '/'), 2500);
    await s.waitForImages();

    const info = await s.measure(`(()=>{
      const de = document.documentElement;
      const over = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > de.clientWidth + 2)
        .slice(0, 8)
        .map(el => (el.tagName.toLowerCase() + '.' + String(el.className||'').split(' ')[0])
                   + ' right=' + Math.round(el.getBoundingClientRect().right));
      const hero = document.querySelector('.hero img');
      const hr = hero ? hero.getBoundingClientRect() : null;
      return {
        scrollW: de.scrollWidth, clientW: de.clientWidth,
        hasOverflow: de.scrollWidth > de.clientWidth + 1,
        overflowers: over,
        height: document.body.scrollHeight,
        imgs: document.querySelectorAll('img').length,
        broken: [...document.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0).length,
        heroH: hr ? Math.round(hr.height) : null,
        grids: [...document.querySelectorAll('.projectgrid,.profile,.stats,.contactgrid,.series')]
          .map(g => ({ cls: g.className.split(' ')[0],
                       cols: getComputedStyle(g).gridTemplateColumns.split(' ').length }))
      };
    })()`);

    console.log(`\n=== ${vp.name} (${vp.w}x${vp.h}) ===`);
    console.log(`  页面高 ${info.height}px  图片 ${info.imgs} 张（未加载 ${info.broken}）`);
    console.log(`  横向溢出: ${info.hasOverflow ? '有 !! scrollW=' + info.scrollW + ' clientW=' + info.clientW : '无'}`);
    if (info.hasOverflow) info.overflowers.forEach(o => console.log('     - ' + o));
    console.log(`  Hero 图高: ${info.heroH}px`);
    console.log('  各布局列数:');
    info.grids.forEach(g => console.log(`     ${g.cls.padEnd(14)} ${g.cols} 列`));

    const shot = await s.fullShot(path.join(outDir, `mobile-${vp.name}.png`), vp.w, vp.h);
    console.log(`  截图: mobile-${vp.name}.png  ${shot.width}x${shot.height}`);
    console.log('  控制台问题:', [...s.logs, ...s.failedRequests].length ? [...s.logs, ...s.failedRequests].slice(0, 3) : '无');
    s.close();
  }
  process.exit(0);
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
