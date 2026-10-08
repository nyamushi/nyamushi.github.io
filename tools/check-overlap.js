/* 检查项目块中左栏文字与右栏图片是否重叠 */
const { launch } = require('./lib-cdp');
const path = require('path');

const files = process.argv.slice(2);
if (!files.length) {
  files.push('portfolio-2026/index.html',
             'D:/ai工作区/项目分组/新建文件夹/毛安_工业设计作品集_2026.html');
}

(async () => {
  const s = await launch(1440, 1000);
  for (const f of files) {
    const file = path.resolve(f);
    await s.goto('file:///' + file.replace(/\\/g, '/'), 2500);
    await s.waitForImages();

    const rows = await s.measure(`[...document.querySelectorAll('article.project')].map(a => {
      const h3 = a.querySelector('h3');
      const right = a.querySelector('.projectgrid > div:nth-child(2)');
      if (!h3 || !right) return null;
      const t = h3.getBoundingClientRect(), r = right.getBoundingClientRect();
      const overlapX = Math.min(t.right, r.right) - Math.max(t.left, r.left);
      const overlapY = Math.min(t.bottom, r.bottom) - Math.max(t.top, r.top);
      return {
        id: a.id,
        title: h3.textContent.slice(0, 14),
        titleRight: Math.round(t.right),
        imgLeft: Math.round(r.left),
        overlapX: Math.round(overlapX),
        overlapY: Math.round(overlapY),
        overlap: overlapX > 2 && overlapY > 2,
        gridCols: getComputedStyle(a.querySelector('.projectgrid')).gridTemplateColumns
      };
    }).filter(Boolean)`);

    console.log(`\n=== ${path.basename(file)} ===`);
    let bad = 0;
    for (const r of rows) {
      const flag = r.overlap ? '重叠!' : 'OK  ';
      if (r.overlap) bad++;
      console.log(`  ${flag} ${r.id} ${r.title.padEnd(16)} 标题右边界 ${String(r.titleRight).padStart(4)}  图片左边界 ${String(r.imgLeft).padStart(4)}  水平重叠 ${String(r.overlapX).padStart(4)}px`);
    }
    console.log(`  网格列: ${rows[0] ? rows[0].gridCols : '?'}`);
    console.log(bad ? `  => ${bad} 处重叠` : '  => 无重叠');
  }
  s.close();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
