/* ==========================================================================
   用无头 Chrome 解码图源（含 webp）并按指定宽度输出 JPEG。
   绕开 Windows PowerShell 5.1 的 GDI+ 无法解码 webp 的限制。
   用法: node tools/decode-webp.js <源文件> <输出.jpg> <宽度>
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { launch, sleep } = require('./lib-cdp');

const src = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const targetW = Number(process.argv[4] || 1800);

(async () => {
  if (!fs.existsSync(src)) throw new Error('源文件不存在: ' + src);

  /* 把源图复制成 .html 的临时文件，直接用 file:// 打开：
     Chrome 会把该图作为独立文档渲染，避免 data-url 的体积与同源限制 */
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-img-'));
  const page = path.join(tmpDir, 'src.html');
  fs.copyFileSync(src, path.join(tmpDir, 'src' + path.extname(src).toLowerCase()));
  fs.writeFileSync(page, `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#000}
img{display:block;width:${targetW}px;height:auto}</style></head>
<body><img id="src" src="src${path.extname(src).toLowerCase()}"></body></html>`, 'utf8');

  const s = await launch(1440, 900);
  await s.goto('file:///' + page.replace(/\\/g, '/'), 900);

  /* 等待图片解码并量出尺寸（goto 已等 load 事件，这里直接读即可） */
  const info = await s.measure(`(()=>{
    const im = document.getElementById('src');
    if (!im) return { ok: false, nat: '-', w: 0, h: 0, why: '未找到 img 元素' };
    try { im.decode(); } catch (e) {}
    const r = im.getBoundingClientRect();
    return { ok: im.naturalWidth > 0, nat: im.naturalWidth + 'x' + im.naturalHeight,
             w: Math.round(r.width), h: Math.round(r.height),
             why: im.complete ? '' : '图片尚未加载完成' };
  })()`);

  if (!info.ok) throw new Error('Chrome 无法解码该图片: ' + (info.why || '未知原因'));
  console.log(`源图解码成功: 原始 ${info.nat} -> 输出 ${info.w}x${info.h}`);

  /* 精确设定视口为该图尺寸后截图 */
  await s.send('Emulation.setDeviceMetricsOverride',
    { width: info.w, height: info.h, deviceScaleFactor: 1, mobile: false });
  await sleep(400);

  const shot = await s.send('Page.captureScreenshot', {
    format: 'jpeg', quality: 90,
    clip: { x: 0, y: 0, width: info.w, height: info.h, scale: 1 }
  });

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`已输出: ${out}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  s.close();
  process.exit(0);
})().catch(e => { console.error('转换失败:', e.message); process.exit(1); });
