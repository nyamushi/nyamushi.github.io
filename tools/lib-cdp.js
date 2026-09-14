/* ==========================================================================
   共享 CDP 客户端：启动无头 Chrome、连接、截图、收集失败请求
   ========================================================================== */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));

class CdpSession {
  constructor(ws, sessionId) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.id = 0;
    this.pending = new Map();
    this.logs = [];
    this.failedRequests = [];

    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
        return;
      }
      if (msg.method === 'Runtime.consoleAPICalled' && /error|warning/.test(msg.params.type)) {
        this.logs.push(`[console.${msg.params.type}] ` +
          msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        this.logs.push('[exception] ' + (d.exception?.description || d.text));
      }
      if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
        this.failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
      }
      if (msg.method === 'Network.loadingFailed') {
        this.failedRequests.push(`FAILED ${msg.params.errorText}`);
      }
    };
  }

  send(method, params) {
    return new Promise((res, rej) => {
      const mid = ++this.id;
      this.pending.set(mid, { res, rej });
      this.ws.send(JSON.stringify({ id: mid, method, params: params || {}, sessionId: this.sessionId }));
    });
  }

  reset() { this.logs = []; this.failedRequests = []; }
}

async function launch(width = 1440, height = 900) {
  const PORT = 9333 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-cdp-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PORT}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      wsUrl = j.webSocketDebuggerUrl;
    } catch (_) { await sleep(250); }
  }
  if (!wsUrl) { chrome.kill(); throw new Error('Chrome 调试端口未就绪'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  /* 用原始 send 建 target（此时还没有 session） */
  let id = 0;
  const raw = (method, params) => new Promise((res, rej) => {
    const mid = ++id;
    const onMsg = ev => {
      const m = JSON.parse(ev.data);
      if (m.id !== mid) return;
      ws.removeEventListener('message', onMsg);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });

  const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });

  const s = new CdpSession(ws, sessionId);
  await s.send('Page.enable');
  await s.send('Runtime.enable');
  await s.send('Network.enable');
  await s.send('Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: false });

  s.goto = async (url, settle = 1500) => {
    const loaded = new Promise(res => {
      const onMsg = ev => {
        const m = JSON.parse(ev.data);
        if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', onMsg); res(); }
      };
      ws.addEventListener('message', onMsg);
    });
    await s.send('Page.navigate', { url });
    await loaded;
    await sleep(settle);
    /* 强制触发所有滚动显现动画，保证截图完整 */
    await s.send('Runtime.evaluate', {
      expression: `(async()=>{
        document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-in'));
        const h=document.body.scrollHeight;
        for(let y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}
        window.scrollTo(0,0);
        await new Promise(r=>setTimeout(r,250));
      })()`, awaitPromise: true
    });
  };

  s.measure = async expr => {
    const res = await s.send('Runtime.evaluate',
      { expression: `JSON.stringify(${expr})`, returnByValue: true });
    if (res.exceptionDetails) {
      const d = res.exceptionDetails;
      throw new Error('页面内脚本异常: ' + (d.exception?.description || d.text));
    }
    if (res.result.value === undefined) {
      throw new Error('measure 表达式未返回值: ' + String(expr).slice(0, 120));
    }
    return JSON.parse(res.result.value);
  };

  /* 等待所有图片解码完成；懒加载图在合成截图前可能尚未完成，
     这里主动触发加载 + 解码，避免截图出现空白块 */
  s.waitForImages = async (timeout = 25000) => {
    const started = Date.now();
    let pending = [];
    do {
      pending = await s.measure(`[...document.querySelectorAll('img')]
        .filter(i => !i.complete)
        .map(i => { i.loading = 'eager'; return i.getAttribute('src'); })`);
      if (pending.length) await sleep(250);
    } while (pending.length && Date.now() - started < timeout);

    /* 关键：captureBeyondViewport 前必须显式 decode()，
       否则视口外的图片可能被绘制为空白 */
    await s.send('Runtime.evaluate', {
      expression: `(async()=>{
        await Promise.all([...document.querySelectorAll('img')].map(i =>
          i.decode ? i.decode().catch(()=>{}) : Promise.resolve()));
        document.querySelectorAll('img[style*="opacity"]').forEach(i => { i.style.opacity='1'; });
        return true;
      })()`, awaitPromise: true
    });
    await sleep(400);
    return { pending, ms: Date.now() - started };
  };

  /* 整页截图：逐屏滚动 + 视口内截图拼接。
     不用 captureBeyondViewport —— Chrome 在该模式下对视口外图片的
     绘制并不可靠（会输出白块），而真实滚动视口内截图像素级可靠。 */
  s.fullShot = async (out, vw = width, vh = 900, startY = 0, endY = null) => {
    const m = await s.send('Page.getLayoutMetrics');
    const totalDoc = Math.min(Math.ceil((m.cssContentSize || m.contentSize).height), 30000);
    const from = Math.max(0, Math.round(startY));
    const until = endY == null ? totalDoc : Math.min(Math.round(endY), totalDoc);
    const total = Math.min(until - from, 30000);

    /* 保证图片全部解码完成 */
    await s.send('Runtime.evaluate', {
      expression: `(async()=>{await Promise.all([...document.querySelectorAll('img')]
        .map(i=>i.decode?i.decode().catch(()=>{}):Promise.resolve()));return 1;})()`,
      awaitPromise: true
    });

    /* 拼接时隐藏 position:fixed 元素，否则每屏都会重复出现导航栏 */
    await s.send('Runtime.evaluate', {
      expression: `(()=>{
        if(!document.getElementById('qa-hide-fixed')){
          const st=document.createElement('style');
          st.id='qa-hide-fixed';
          st.textContent='.nav,.hero__scroll,.hero__progress{display:none !important}';
          document.head.appendChild(st);
        }
        return 1;
      })()`, returnByValue: true
    });

    await s.send('Runtime.evaluate', { expression: 'window.scrollTo(0,0); 1', returnByValue: true });
    await sleep(350);

    const slices = [];
    for (let y = 0; y < total; y += vh) {
      await s.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${from + y}); 1`, returnByValue: true });
      await sleep(260);
      const top = await s.measure('Math.round(window.scrollY)');
      const shot = await s.send('Page.captureScreenshot', { format: 'png' });
      slices.push({ y: top - from, buf: Buffer.from(shot.data, 'base64') });
      if (top + vh >= until) break;
    }

    /* 拼接（逐片解码，按行拷贝到整页 RGBA 缓冲） */
    const first = decodePngRows(slices[0].buf);
    const W = first.width;
    const H = first.height;
    const height = total;
    const raw = Buffer.alloc(height * (W * 4 + 1));

    for (const sl of slices) {
      const img = decodePngRows(sl.buf);
      const rows = Math.min(img.height, height - sl.y);
      const stride = img.width * img.bpp;
      for (let r = 0; r < rows; r++) {
        const srcRow = r * stride;
        const dstRow = (sl.y + r) * (W * 4 + 1);
        raw[dstRow] = 0;                             /* filter: none */
        for (let x = 0; x < W; x++) {
          const s = srcRow + x * img.bpp;
          const d = dstRow + 1 + x * 4;
          raw[d] = img.rows[s];
          raw[d + 1] = img.rows[s + 1];
          raw[d + 2] = img.rows[s + 2];
          raw[d + 3] = img.bpp === 4 ? img.rows[s + 3] : 255;
        }
      }
    }

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, encodePng(W, height, raw));
    return { height, width: W, bytes: fs.statSync(out).size, slices: slices.length };
  };

  s.close = () => { try { ws.close(); } catch (_) {} try { chrome.kill(); } catch (_) {} };

  return s;
}

/* ---------- 极简 PNG 解码：支持 Chromium 输出的 8bit RGB/RGBA，无隔行 ---------- */
/* 返回 { width, height, bpp, rows }，rows 为 FilterType=None 的原始行缓冲 */
function decodePngRows(buf) {
  let off = 8;
  const idat = [];
  let width = 0, height = 0, depth = 0, color = 0, interlace = 0;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; color = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error(`仅支持 8bit PNG, depth=${depth}`);
  if (interlace !== 0) throw new Error('不支持隔行 PNG');
  const bpp = color === 6 ? 4 : color === 2 ? 3 : 0;
  if (!bpp) throw new Error(`不支持的 PNG 颜色类型 color=${color}`);

  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const rows = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const ft = inflated[y * (stride + 1)];
    const line = inflated.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = rows.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? rows.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prior ? prior[x] : 0;
      const c = (prior && x >= bpp) ? prior[x - bpp] : 0;
      let v = line[x];
      switch (ft) {
        case 0: break;                                   /* None */
        case 1: v = (v + a) & 0xff; break;               /* Sub  */
        case 2: v = (v + b) & 0xff; break;               /* Up   */
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;  /* Avg  */
        case 4: {                                        /* Paeth */
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          v = (v + pr) & 0xff; break;
        }
        default: throw new Error('未知 PNG 滤波类型 ' + ft);
      }
      cur[x] = v;
    }
  }
  return { width, height, bpp, rows };
}

function encodePng(width, height, raw) {
  const chunks = [];
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    chunks.push(len, body, crc);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  chunk('IHDR', ihdr);
  chunk('IDAT', zlib.deflateSync(raw, { level: 6 }));
  chunk('IEND', Buffer.alloc(0));
  return Buffer.concat(chunks);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

module.exports = { launch, sleep };
