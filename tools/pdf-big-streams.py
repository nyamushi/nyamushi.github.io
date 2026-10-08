"""列出体积最大的非图片流对象，判断 22MB 到底是什么。
用法: python tools/pdf-big-streams.py <pdf>
"""
import sys

import pymupdf

pdf = sys.argv[1]
doc = pymupdf.open(pdf)

rows = []
for xref in range(1, doc.xref_length()):
    try:
        if not doc.xref_is_stream(xref) or doc.xref_is_image(xref):
            continue
        raw = doc.xref_stream_raw(xref)
        obj = doc.xref_object(xref, compressed=True)
        rows.append((len(raw), xref, obj[:200].replace('\n', ' ')))
    except Exception:
        pass

rows.sort(reverse=True)
print(f'非图片流对象共 {len(rows)} 个\n')
print(f"{'字节':>12} {'xref':>6}  对象头")
for size, xref, head in rows[:15]:
    print(f'{size/1048576:>9.2f} MB {xref:>6}  {head}')

total = sum(r[0] for r in rows)
print(f'\n合计 {total/1048576:.2f} MB')
doc.close()
