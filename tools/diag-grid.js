/* 打印每张卡片所在的网格位置与跨度，定位排版问题 */
const { launch } = require('./lib-cdp');

(async () => {
  const s = await launch(1440, 900);
  await s.goto('http://127.0.0.1:4173/', 1200);

  const data = await s.measure(`(()=>{
    const grid = document.getElementById('projectGrid');
    const tail = document.getElementById('tailGrid');
    const all = [...document.querySelectorAll('#projectGrid .card, #tailGrid .card')];
    return {
      gridCols: getComputedStyle(grid).gridTemplateColumns,
      gridW: Math.round(grid.getBoundingClientRect().width),
      tailCols: tail ? getComputedStyle(tail).gridTemplateColumns : '(无 tailGrid)',
      tailMarginTop: tail ? getComputedStyle(tail).marginTop : '-',
      cards: all.map(c => {
        const cs = getComputedStyle(c);
        const r = c.getBoundingClientRect();
        const ti = c.querySelector('.card__title');
        return {
          t: ti ? ti.textContent : '(无标题)',
          col: cs.gridColumnStart + ' / ' + cs.gridColumnEnd,
          x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height),
          parent: c.parentElement.id
        };
      })
    };
  })()`);

  console.log('grid-template-columns:', data.gridCols);
  console.log('tail columns      :', data.tailCols);
  console.log('grid width:', data.gridW, ' tailGrid margin-top:', data.tailMarginTop);
  for (const c of data.cards) {
    console.log(`  ${String(c.parent).padEnd(11)} x=${String(c.x).padStart(4)} w=${String(c.w).padStart(4)} h=${String(c.h).padStart(3)}  col=${c.col}  ${c.t}`);
  }
  s.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
