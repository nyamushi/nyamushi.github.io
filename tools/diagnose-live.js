/* 诊断线上站点：抓取首页与 PDF，打印状态码、Content-Type、大小与内容特征 */
const SITE = 'https://nyamushi.github.io/';

(async () => {
  const targets = [
    ['首页', SITE + '?t=' + Date.now()],
    ['PDF', SITE + 'MaoAn-Portfolio-2026.pdf'],
    ['favicon.ico', SITE + 'favicon.ico'],
  ];

  for (const [name, url] of targets) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const ct = r.headers.get('content-type') || '';
      const len = r.headers.get('content-length') || '?';
      const lm = r.headers.get('last-modified') || '-';
      const etag = (r.headers.get('etag') || '-').slice(0, 30);
      let extra = '';
      if (name === '首页' && r.ok) {
        const t = await r.text();
        extra = `  实际 ${t.length} bytes`;
        if (/<title>([^<]*)<\/title>/.test(t)) extra += `  标题=${t.match(/<title>([^<]*)<\/title>/)[1]}`;
        // 关键内容特征
        const hasOld = /项目作品[\s\S]{0,40}?07/.test(t);
        const hasNew = /把想法做成/.test(t);
        const hasPdf = /MaoAn-Portfolio-2026\.pdf/.test(t);
        extra += `  新版标志=${hasNew}  旧版标志=${hasOld}  PDF链接=${hasPdf}`;
      }
      console.log(`${name.padEnd(12)} ${r.status}  ${ct.padEnd(34)} ${String(len).padStart(10)}  ${extra}`);
      console.log(`${' '.repeat(12)} Last-Modified: ${lm}   ETag: ${etag}`);
    } catch (e) {
      console.log(`${name.padEnd(12)} 请求失败: ${e.message}`);
    }
  }

  /* Pages 构建状态（公开 API） */
  console.log('\n--- GitHub Pages 状态 ---');
  try {
    const r = await fetch('https://api.github.com/repos/nyamushi/nyamushi.github.io/pages');
    if (r.status === 200) {
      const j = await r.json();
      console.log('status:', j.status, '| source:', j.source && j.source.branch, j.source && j.source.path);
      console.log('html_url:', j.html_url, '| cname:', j.cname || '(无)');
    } else {
      console.log('API 返回', r.status, '(403 表示限流，未登录的公开 API 常被限流)');
    }
  } catch (e) { console.log('查询失败:', e.message); }

  /* 最近一次 actions/pages 构建 */
  console.log('\n--- 最近提交 ---');
  try {
    const r = await fetch('https://api.github.com/repos/nyamushi/nyamushi.github.io/commits?per_page=3');
    if (r.status === 200) {
      const j = await r.json();
      j.forEach(c => console.log(`  ${c.sha.slice(0,7)}  ${c.commit.author.date}  ${c.commit.message.split('\n')[0]}`));
    } else {
      console.log('API 返回', r.status);
    }
  } catch (e) { console.log('查询失败:', e.message); }
})();
