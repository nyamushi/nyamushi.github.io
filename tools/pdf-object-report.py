"""分析 PDF 体积构成：图片、字体、其它对象各占多少。
用法: python tools/pdf-object-report.py <pdf>
"""
import sys
from collections import defaultdict

import pymupdf

pdf = sys.argv[1]
doc = pymupdf.open(pdf)

by_type = defaultdict(lambda: [0, 0])   # 类型 -> [数量, 字节数]
fonts = {}

for xref in range(1, doc.xref_length()):
    try:
        if not doc.xref_is_stream(xref):
            continue
        raw = doc.xref_stream_raw(xref)
        size = len(raw)
        kind = '其它流'
        if doc.xref_is_image(xref):
            kind = '图片'
        else:
            obj = doc.xref_object(xref, compressed=True)
            if '/FontFile' in obj or doc.xref_is_font(xref):
                kind = '字体'
            elif '/Type/Font' in obj.replace(' ', ''):
                kind = '字体'
        by_type[kind][0] += 1
        by_type[kind][1] += size
    except Exception:
        pass

# 字体单独统计
for pno in range(doc.page_count):
    for f in doc[pno].get_fonts(full=True):
        xref = f[0]
        try:
            name, ext, ftype, _ = doc.extract_font(xref)
            fonts[xref] = (name, ext, ftype)
        except Exception:
            pass

import os
fsize = os.path.getsize(pdf)
print(f'文件: {pdf}')
print(f'体积: {fsize/1048576:.2f} MB   页数: {doc.page_count}\n')
print('按流对象统计：')
for k, (cnt, b) in sorted(by_type.items(), key=lambda kv: -kv[1][1]):
    print(f'  {k:<8} {cnt:>4} 个   {b/1048576:>7.2f} MB   ({b/fsize*100:>4.1f}%)')

print(f'\n嵌入字体 {len(fonts)} 个：')
for xref, (name, ext, ftype) in sorted(fonts.items()):
    try:
        size = len(doc.xref_stream_raw(xref)) if doc.xref_is_stream(xref) else 0
    except Exception:
        size = 0
    print(f'  xref {xref:>4}  {name[:36]:<38} {ext:<6} {ftype:<10} {size/1024:>8.0f} KB')

doc.close()
