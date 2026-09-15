/* 深色区块文字对比度回归检查（确认修复浅底文字时没有影响深色区域） */
const { launch } = require('./lib-cdp');

function lum(rgb) {
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const parse = s => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);

const SEL = [
  ['项目区标题', '#work .sec-title'],
  ['项目区说明', '#work .sec-desc'],
  ['卡片标题', '#projectGrid .card__title'],
  ['卡片简介', '#projectGrid .card__sub'],
  ['卡片角色', '#projectGrid .card__role'],
  ['筛选按钮', '#filters .filter'],
  ['能力分组名', '#skills .skill__label'],
  ['技能条目', '#skills .skill__list li'],
  ['时间线正文', '#experience .tl-desc'],
  ['页脚文字', '.footer__inner']
];

(async () => {
  const s = await launch(1440, 900);
  await s.goto('http://127.0.0.1:4173/', 1200);

  const items = await s.measure(`(()=>{
    const bgOf = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)') return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const sels = ${JSON.stringify(SEL)};
    return sels.map(function (pair) {
      const el = document.querySelector(pair[1]);
      if (!el) return { name: pair[0], missing: true };
      const cs = getComputedStyle(el);
      return { name: pair[0], color: cs.color, bg: bgOf(el) };
    });
  })()`);

  console.log('深色区块回归检查（正文需 ≥ 4.5:1）\n');
  let bad = 0;
  for (const it of items) {
    if (it.missing) { console.log(`  ??  ${it.name} 未找到`); continue; }
    const c = contrast(parse(it.color), parse(it.bg));
    if (c < 4.5) bad++;
    console.log(`  ${c >= 4.5 ? 'OK ' : '偏弱'} ${it.name.padEnd(12)} ${it.color.padEnd(20)} ${c.toFixed(2)}:1`);
  }
  console.log(bad ? `\n${bad} 处偏弱` : '\n深色区块全部达标，未受修复影响。');
  s.close();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
