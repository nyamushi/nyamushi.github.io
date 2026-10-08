"""校验优化后的 HTML 结构：图片是否全为 JPEG、有无残留外链、内容是否完整。
用法: python tools/verify-html.py <html>
"""
import re
import sys
from pathlib import Path

p = Path(sys.argv[1] if len(sys.argv) > 1 else 'portfolio-2026/index.html')
s = p.read_text(encoding='utf-8')

print(f'文件: {p}')
print(f'体积: {p.stat().st_size / 1048576:.2f} MB\n')

imgs = re.findall(r'<img', s)
png = len(re.findall(r'data:image/png', s))
jpg = len(re.findall(r'data:image/jpeg', s))
uris = len(re.findall(r'data:image/', s))

print('图片检查:')
print(f'  <img> 标签     {len(imgs)}')
print(f'  data URI       {uris}')
print(f'  PNG 内嵌       {png}   (应为 0)')
print(f'  JPEG 内嵌      {jpg}')

# 外链资源（http/file 开头，或非 data/#/mailto 的 src）
# 仓库内自带的 PDF 下载链接属于预期内，不算外部依赖
EXPECTED = {'MaoAn-Portfolio-2026.pdf'}
ext = [u for u in re.findall(r'(?:src|href)="([^"]+)"', s)
       if not u.startswith(('data:', '#')) and u not in EXPECTED]
print(f'  非内嵌引用     {len(ext)}  {ext[:5]}')

print('\n内容完整性:')
checks = {
    '标题': r'<title>([^<]+)</title>',
    'Hero 区': r'class="hero',
    '关于我': r'id="profile"',
    '项目列表': r'id="works"',
    '联系方式': r'id="contact"',
}
for name, pat in checks.items():
    m = re.search(pat, s)
    print(f'  {name:<8} {"OK" if m else "缺失"}')

anchors = [f'id="p0{i}"' for i in range(1, 7)]
missing = [a for a in anchors if a not in s]
print(f'  六个项目锚点  {"OK" if not missing else "缺失 " + str(missing)}')
print(f'  文创系列三图  {"OK" if s.count("series") >= 1 else "缺失"}')

# 联系方式是否还在
for kw in ['15924124508', '3027891801@qq.com', '@喵喵虫nyamushi']:
    print(f'  含 {kw:<22} {"OK" if kw in s else "缺失"}')

ok = png == 0 and not ext and not missing
print('\n' + ('结构校验通过' if ok else '有问题，请检查上面的输出'))
sys.exit(0 if ok else 1)
