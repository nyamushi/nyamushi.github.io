"""检查首页的移动端适配情况。
用法: python tools/check-mobile-ready.py [html]
"""
import re
import sys
from pathlib import Path

p = Path(sys.argv[1] if len(sys.argv) > 1 else 'index.html')
s = p.read_text(encoding='utf-8')

m = re.search(r'<meta name="viewport"[^>]*>', s)
print('viewport 声明:', m.group(0) if m else '缺失 !!')

# 媒体查询（只看 head 里的样式，避免扫到 base64 图片数据）
style_start = s.find('<style>')
style_end = s.find('</style>')
css = s[style_start:style_end] if style_start >= 0 and style_end > style_start else ''

# 统计所有 style 块
css_all = ''.join(re.findall(r'<style>(.*?)</style>', s, re.S))
print(f'\nCSS 总长: {len(css_all)} 字符')

mqs = re.findall(r'@media[^{]+', css_all)
print(f'媒体查询: {len(mqs)} 个')
for q in mqs[:8]:
    print('  ', q.strip())

print('\n响应式手法使用情况:')
for name, pat in [
    ('grid-template-columns', r'grid-template-columns'),
    ('minmax(', r'minmax\('),
    ('clamp(', r'clamp\('),
    ('flex-wrap', r'flex-wrap'),
    ('max-width:100%', r'max-width:\s*100%'),
    ('object-fit', r'object-fit'),
]:
    print(f'  {name:<24} {len(re.findall(pat, css_all))} 处')

# 固定像素宽度（可能在窄屏溢出）
fixed = re.findall(r'width:\s*(\d{3,})px', css_all)
big = sorted({int(x) for x in fixed if int(x) > 400}, reverse=True)
print(f'\n固定宽度 >400px（窄屏可能溢出）: {big[:10] if big else "无"}')

print(f'\n页面总高（桌面）: 见渲染结果')
