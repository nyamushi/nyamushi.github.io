"""把作品集 2026 的单文件 HTML 更新到站点根目录，并补两个小改动：
   1) 联系区加 PDF 下载入口（PDF 已放在仓库里）
   2) 内联一个 SVG favicon，避免访问时请求 favicon.ico 报 404

用法: python tools/prepare-site-update.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'portfolio-2026' / 'index.html'
DST = ROOT / 'index.html'
PDF_NAME = 'MaoAn-Portfolio-2026.pdf'

s = SRC.read_text(encoding='utf-8')
before = len(s)

# ---------- 1) 补 favicon（内联 SVG，不产生额外请求） ----------
if 'rel="icon"' not in s:
    favicon = ("<link rel=\"icon\" href=\"data:image/svg+xml,"
               "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E"
               "%3Crect width='100' height='100' rx='22' fill='%23b94b25'/%3E"
               "%3Ctext x='50' y='70' font-size='58' font-family='sans-serif' "
               "font-weight='700' fill='white' text-anchor='middle'%3EMA%3C/text%3E%3C/svg%3E\">")
    s = s.replace('<title>', favicon + '<title>', 1)

# ---------- 2) 联系区加 PDF 下载入口 ----------
if PDF_NAME not in s:
    link_css = ('<style>.pdflink{margin:34px 0 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap}'
                '.pdflink a{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;'
                'background:var(--accent);color:#fff;border-radius:999px;font-size:14px;font-weight:600;'
                'letter-spacing:.02em;transition:opacity .25s}'
                '.pdflink a:hover{opacity:.86}'
                '.pdflink span{color:var(--muted);font-size:13px}</style>')
    s = s.replace('</head>', link_css + '</head>', 1)

    link_html = (f'<div class="pdflink">'
                 f'<a href="{PDF_NAME}" download>下载 PDF 版作品集 →</a>'
                 f'<span>15 页横向版面，适合邮件投递与打印</span>'
                 f'</div>')
    # 插到联系区 </section> 之前（该 section 是页面最后一个）
    idx = s.rindex('</section></main>')
    s = s[:idx] + link_html + s[idx:]

DST.write_text(s, encoding='utf-8')
has_icon = 'rel="icon"' in s
has_pdf = PDF_NAME in s
print(f'源文件: {SRC}  {before/1048576:.2f} MB')
print(f'输出  : {DST}  {len(s.encode("utf-8"))/1048576:.2f} MB')
print(f'新增  : favicon={has_icon}  PDF 入口={has_pdf}')
