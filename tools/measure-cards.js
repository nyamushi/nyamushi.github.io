/* 测量项目卡片的实际尺寸，用于评估版式一致性 */
const { launch } = require('./lib-cdp');

const widths = [1440, 1280, 1100];

(async () => {
  const s = await launch(1440, 900);

  for (const w of widths) {
    await s.send('Emulation.setDeviceMetricsOverride',
      { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await s.goto('http://127.0.0.1:4173/', 900);

    const data = await s.measure(`(()=>{
      const grid = document.getElementById('projectGrid');
      const gr = grid.getBoundingClientRect();
      const cs = getComputedStyle(grid);
      return {
        viewport: innerWidth,
        gridW: Math.round(gr.width),
        gridCols: cs.gridTemplateColumns,
        cards: [...document.querySelectorAll('#projectGrid .card')].map(c => {
          const r = c.getBoundingClientRect();
          const m = c.querySelector('.card__media');
          const b = c.querySelector('.card__body');
          return {
            t: c.querySelector('.card__title').textContent.slice(0, 10),
            w: Math.round(r.width), h: Math.round(r.height),
            mediaH: m ? Math.round(m.getBoundingClientRect().height) : 0,
            bodyH: b ? Math.round(b.getBoundingClientRect().height) : 0,
            wide: c.classList.contains('card--wide')
          };
        })
      };
    })()`);

    console.log(`\n=== 视口 ${data.viewport}px  网格宽 ${data.gridW}px  列: ${data.gridCols} ===`);
    for (const c of data.cards) {
      console.log(`  ${c.wide ? '[跨2列]' : '[1列] '} ${c.t.padEnd(14)} 卡片 ${String(c.w).padStart(4)}x${String(c.h).padStart(4)}  图片高 ${String(c.mediaH).padStart(4)}  文字区 ${String(c.bodyH).padStart(3)}`);
    }
  }

  s.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
