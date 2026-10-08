"""规范化首页的 favicon 声明：显式指向根目录的 favicon.ico，
并保留内联 SVG 作为优先版本（矢量更清晰）。
用法: python tools/fix-favicon-links.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / 'index.html'

s = HTML.read_text(encoding='utf-8')

# 取出现有的内联 SVG 图标（若有）
m = re.search(r'<link rel="icon" href="(data:image/svg\+xml,[^"]+)"[^>]*>', s)
svg_link = m.group(0) if m else ''

# 移除旧的 icon 声明（避免重复）
s = re.sub(r'<link rel="icon"[^>]*>', '', s)

# 重新插入：SVG 优先，ICO 兜底（浏览器会请求 /favicon.ico）
links = []
if svg_link:
    links.append(svg_link)
links.append('<link rel="icon" type="image/x-icon" href="favicon.ico" sizes="any">')
links.append('<link rel="apple-touch-icon" href="favicon.ico">')

s = s.replace('</head>', ''.join(links) + '</head>', 1)
HTML.write_text(s, encoding='utf-8')

print(f'已更新 {HTML}')
for l in links:
    print('  ' + (l[:88] + ('...' if len(l) > 88 else '')))
