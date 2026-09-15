/* 检查「关于我」与「联系」区块的文字颜色与对比度 */
const { launch } = require('./lib-cdp');

/* 相对亮度与对比度（WCAG） */
function lum(rgb) {
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
}
const parse = s => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);

(async () => {
  const s = await launch(1440, 900);
  await s.goto('http://127.0.0.1:4173/', 1500);

  const items = await s.measure(`(()=>{
    const sels = [
      ['关于我 · 大标题', '#about .sec-title'],
      ['关于我 · 导语', '#about .lead'],
      ['关于我 · 导语加粗', '#about .lead strong'],
      ['关于我 · 优势正文', '#about .adv p'],
      ['关于我 · 优势加粗', '#about .adv strong'],
      ['关于我 · 优势序号', '#about .adv__i'],
      ['关于我 · 信息表键', '#about .fact__k'],
      ['关于我 · 信息表值', '#about .fact__v'],
      ['关于我 · 信息表灰字', '#about .fact__v span'],
      ['关于我 · 右侧说明', '#about .sec-desc'],
      ['联系 · 大标题', '#contact .contact__title'],
      ['联系 · 说明文字', '#contact .contact__desc'],
      ['联系 · 标签', '#contact .contact__k'],
      ['联系 · 值', '#contact .contact__v']
    ];
    const bgOf = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return sels.map(([name, sel]) => {
      const el = document.querySelector(sel);
      if (!el) return { name, missing: true };
      const cs = getComputedStyle(el);
      return {
        name, sel,
        color: cs.color, bg: bgOf(el),
        size: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily.split(',')[0]
      };
    });
  })()`);

  console.log('文字色 / 背景色 / 对比度（WCAG 正文需 ≥ 4.5，大字 ≥ 3.0）\n');
  for (const it of items) {
    if (it.missing) { console.log(`  ${it.name.padEnd(20)} 未找到元素`); continue; }
    const c = contrast(parse(it.color), parse(it.bg));
    const flag = c >= 4.5 ? 'OK  ' : (c >= 3 ? '偏弱' : '不合格');
    console.log(
      `  ${flag} ${it.name.padEnd(20)} ${it.color.padEnd(22)} on ${it.bg.padEnd(22)} ` +
      `${c.toFixed(2).padStart(6)}:1   ${it.size} ${it.weight} ${it.family}`
    );
  }
  s.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
