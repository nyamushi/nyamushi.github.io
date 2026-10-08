"""严格校验两个 PDF 是否一致：页数、逐页文字、渲染像素差异。
用法: python tools/verify-pdf.py <原pdf> <新pdf>
"""
import sys

import pymupdf

old_p, new_p = sys.argv[1], sys.argv[2]
a = pymupdf.open(old_p)
b = pymupdf.open(new_p)

problems = []

# ---------- 1) 页数与页面尺寸 ----------
print(f'页数: {a.page_count} -> {b.page_count}')
if a.page_count != b.page_count:
    problems.append('页数不一致')

for i in range(min(a.page_count, b.page_count)):
    ra, rb = a[i].rect, b[i].rect
    if abs(ra.width - rb.width) > 1 or abs(ra.height - rb.height) > 1:
        problems.append(f'第 {i+1} 页尺寸不一致 {ra} vs {rb}')

# ---------- 2) 逐页文字比对 ----------
print('\n逐页文字比对：')
for i in range(min(a.page_count, b.page_count)):
    ta = a[i].get_text().strip()
    tb = b[i].get_text().strip()
    same = ta == tb
    flag = 'OK ' if same else '差异'
    print(f'  {flag} 第 {i+1:2d} 页  原 {len(ta):5d} 字  新 {len(tb):5d} 字')
    if not same:
        # 找出第一处不同，便于定位
        for j, (ca, cb) in enumerate(zip(ta, tb)):
            if ca != cb:
                problems.append(f'第 {i+1} 页第 {j} 字符不同: {ca!r} vs {cb!r}')
                break
        else:
            if len(ta) != len(tb):
                problems.append(f'第 {i+1} 页文字长度不同 {len(ta)} vs {len(tb)}')

# ---------- 3) 渲染像素差异 ----------
print('\n渲染比对（像素级）：')
for i in range(min(a.page_count, b.page_count)):
    pa = a[i].get_pixmap(dpi=90)
    pb = b[i].get_pixmap(dpi=90)
    if pa.width != pb.width or pa.height != pb.height:
        problems.append(f'第 {i+1} 页渲染尺寸不同')
        continue
    sa, sb = pa.samples, pb.samples
    diff = sum(1 for x, y in zip(sa, sb) if abs(x - y) > 24)
    pct = diff / len(sa) * 100
    flag = 'OK ' if pct < 0.5 else ('注意' if pct < 3 else '异常')
    print(f'  {flag} 第 {i+1:2d} 页  明显不同的像素 {pct:5.2f}%')
    if pct >= 3:
        problems.append(f'第 {i+1} 页渲染差异过大 {pct:.2f}%')

a.close()
b.close()

print()
if problems:
    print(f'发现 {len(problems)} 个问题：')
    for p in problems[:20]:
        print('  - ' + p)
    sys.exit(1)
print('校验通过：页数、文字、渲染三者一致。')
