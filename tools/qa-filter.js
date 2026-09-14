/* 校验分类筛选：切换每个分类后统计可见卡片数，并检查是否有图未加载 */
const { launch } = require('./lib-cdp');

(async () => {
  const s = await launch(1440, 900);
  await s.goto('http://127.0.0.1:4173/', 1500);
  await s.waitForImages();

  const cats = await s.measure(`[...document.querySelectorAll('.filter')].map(b => ({
    label: b.textContent.replace(/\\s+/g,' ').trim(), f: b.dataset.f
  }))`);
  console.log('分类按钮:', cats.map(c => c.label).join(' | '));

  for (const c of cats) {
    await s.send('Runtime.evaluate', {
      expression: `document.querySelector('.filter[data-f="${c.f}"]').click(); 1`, returnByValue: true
    });
    await new Promise(r => setTimeout(r, 400));

    const r = await s.measure(`(()=>{
      const vis = [...document.querySelectorAll('#projectGrid .card')]
        .filter(el => !el.classList.contains('is-hidden'));
      const broken = vis.filter(el => {
        const im = el.querySelector('img');
        return im && (!im.complete || im.naturalWidth === 0);
      }).length;
      const rows = {};
      vis.forEach(el => { const y = Math.round(el.getBoundingClientRect().top); (rows[y] = rows[y] || []).push(el); });
      const rowSizes = Object.values(rows).map(g => g.map(el => Math.round(el.getBoundingClientRect().width)));
      return { n: vis.length, broken, rowSizes,
               titles: vis.map(el => el.querySelector('.card__title').textContent.slice(0,8)) };
    })()`);

    console.log(`  [${c.label}] 可见 ${r.n} 张 · 破图 ${r.broken} · 每行宽度 ${JSON.stringify(r.rowSizes)}`);
    if (r.broken) console.log('    !! 有图片未加载');
  }
  s.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
