/* ==========================================================================
   检查线上站点是否已更新到最新提交
   用法: node tools/check-site.js
   ========================================================================== */
const { execSync } = require('child_process');

const REPO = 'nyamushi/nyamushi.github.io';
const SITE = 'https://nyamushi.github.io/';

function localHead() {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
  catch { return null; }
}

(async () => {
  const head = localHead();
  console.log('本地最新提交:', head ? head.slice(0, 7) : '(读取失败)');

  /* 1. 线上首页 */
  let html = '';
  try {
    const r = await fetch(SITE + '?t=' + Date.now(), { redirect: 'follow' });
    html = await r.text();
    console.log('站点响应:', r.status, '| 大小', html.length, 'bytes');
    const st = r.headers.get('last-modified');
    if (st) console.log('Last-Modified:', st);
  } catch (e) {
    console.log('站点无法访问:', e.message);
  }

  /* 2. 判定线上版本 */
  const checks = [
    ['7 个项目', /项目作品[\s\S]{0,60}?07/, '线上标题显示的项目数'],
    ['浅色区块修复', /--text-3:\s*#8b877f|--text-3:#8b877f/, 'CSS 变量已提亮'],
    ['简历按钮已移除', null, '不应再出现 resume.docx']
  ];

  console.log('\n--- 线上内容判定 ---');
  const m = html.match(/项目作品[\s\S]{0,80}?<\/h2>/);
  console.log('标题区域:', m ? m[0].replace(/\s+/g, ' ').slice(0, 90) : '(未匹配)');
  console.log('含 resume.docx 链接:', /resume\.docx/.test(html) ? '是（旧版）' : '否（新版）');
  console.log('含「想留一份带走」:', /想留一份带走/.test(html) ? '是（新版）' : '否');
  console.log('含「想直接看简历」:', /想直接看简历/.test(html) ? '是（旧版）' : '否');

  /* 3. 线上 CSS 是否已更新 */
  try {
    const css = await (await fetch(SITE + 'assets/css/style.css?t=' + Date.now())).text();
    const has = /--text-3:\s*#8b877f/.test(css);
    console.log('线上 CSS 含修复后的 --text-3:', has ? '是（新版）' : '否（旧版，Pages 未重新发布）');
  } catch (e) { console.log('CSS 拉取失败:', e.message); }

  /* 4. 隐私复查 */
  console.log('\n--- 隐私复查 ---');
  for (const u of [
    'https://nyamushi.github.io/resume.docx',
    'https://raw.githubusercontent.com/' + REPO + '/main/resume.docx'
  ]) {
    try {
      const r = await fetch(u, { method: 'GET', redirect: 'follow' });
      console.log((r.status === 200 ? '!! 仍可下载' : 'OK 已不可访问'), r.status, u);
    } catch (e) { console.log('OK 请求失败', u); }
  }

  /* 5. Pages 构建状态（公开 API，无需 token） */
  console.log('\n--- GitHub Pages 构建状态 ---');
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/pages`);
    if (r.status === 200) {
      const j = await r.json();
      console.log('状态:', j.status, '| 源分支:', j.source && j.source.branch,
                  '| 目录:', j.source && j.source.path,
                  '| 自定义域名:', j.cname || '(无)');
      console.log('访问地址:', j.html_url);
    } else if (r.status === 404) {
      console.log('Pages 未开启（API 返回 404）—— 需要去 Settings → Pages 手动开启');
    } else {
      console.log('API 返回', r.status);
    }
  } catch (e) { console.log('查询失败:', e.message); }
})();
