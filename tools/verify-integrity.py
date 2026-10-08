"""严格校验 HTML 成品的完整性：base64 是否合法、标签是否配平、结构是否完整。
用法: python tools/verify-integrity.py <html>
"""
import base64
import re
import sys
from pathlib import Path

p = Path(sys.argv[1])
raw = p.read_bytes()

print(f'文件: {p}')
print(f'体积: {len(raw)/1048576:.2f} MB')

# ---------- 1) BOM 与编码 ----------
BOM = b'\xef\xbb\xbf'
has_bom = raw[:3] == BOM
print(f'BOM: {"有" if has_bom else "无"}')
try:
    s = raw.decode('utf-8')
    print('UTF-8 解码: OK')
except UnicodeDecodeError as e:
    print(f'UTF-8 解码失败: {e}')
    sys.exit(1)

# ---------- 2) base64 合法性（最关键：损坏会导致 Pages 构建失败） ----------
uris = re.findall(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', s)
print(f'\ndata URI 数量: {len(uris)}')
bad = 0
for i, b in enumerate(uris, 1):
    problems = []
    if len(b) % 4 != 0:
        problems.append(f'长度 {len(b)} 不是 4 的倍数')
    if '=' in b[:-2]:
        problems.append('填充符位置异常')
    try:
        dec = base64.b64decode(b, validate=True)
        # JPEG 魔数校验
        if not dec.startswith(b'\xff\xd8\xff'):
            problems.append('不是合法 JPEG（魔数不对）')
        if not dec.rstrip().endswith(b'\xff\xd9'):
            problems.append('JPEG 结尾标记缺失（可能被截断）')
        size = len(dec)
    except Exception as e:
        problems.append(f'base64 解码失败: {e}')
        size = 0
    flag = 'OK ' if not problems else '异常'
    if problems:
        bad += 1
    print(f'  {flag} #{i}  base64 {len(b)/1024:8.0f} KB  解码后 {size/1024:8.0f} KB  '
          f'{"  ".join(problems)}')

# ---------- 3) 标签配平 ----------
print('\n标签配平:')
for tag in ['html', 'head', 'body', 'main', 'section', 'article', 'div', 'figure']:
    op = len(re.findall(rf'<{tag}[\s>]', s))
    cl = len(re.findall(rf'</{tag}>', s))
    flag = 'OK ' if op == cl else '不配平'
    print(f'  {flag} <{tag}>  开 {op:4d}  闭 {cl:4d}')
    if op != cl:
        bad += 1

# ---------- 4) 结构完整性 ----------
print('\n结构:')
for name, pat in [('DOCTYPE', r'^<!doctype html>'), ('结尾 </html>', r'</html>\s*$'),
                  ('标题', r'<title>[^<]+</title>'), ('联系区', r'id="contact"'),
                  ('PDF 链接', r'MaoAn-Portfolio-2026\.pdf')]:
    ok = bool(re.search(pat, s.strip(), re.I | re.M))
    print(f'  {"OK " if ok else "缺失"} {name}')
    if not ok:
        bad += 1

print()
print('完整性校验通过' if bad == 0 else f'发现 {bad} 处问题')
sys.exit(0 if bad == 0 else 1)
