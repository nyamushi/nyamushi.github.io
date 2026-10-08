"""分析 PDF 内嵌图片，找出体积大头。
用法: python tools/pdf-image-report.py <pdf>
"""
import sys
import pymupdf

pdf = sys.argv[1]
doc = pymupdf.open(pdf)
seen = {}
for pno in range(doc.page_count):
    for info in doc[pno].get_images(full=True):
        xref = info[0]
        if xref in seen:
            seen[xref]['pages'].append(pno + 1)
            continue
        try:
            d = doc.extract_image(xref)
        except Exception as e:
            seen[xref] = {'err': str(e), 'pages': [pno + 1]}
            continue
        seen[xref] = {
            'w': d['width'], 'h': d['height'],
            'ext': d['ext'], 'bytes': len(d['image']),
            'cs': d.get('colorspace'), 'bpc': d.get('bpc'),
            'pages': [pno + 1],
        }

rows = [(k, v) for k, v in seen.items() if 'bytes' in v]
rows.sort(key=lambda kv: -kv[1]['bytes'])
total = sum(v['bytes'] for _, v in rows)
print(f"共 {len(rows)} 张图片，合计 {total/1048576:.2f} MB（文件 {__import__('os').path.getsize(pdf)/1048576:.2f} MB）\n")
print(f"{'xref':>6} {'尺寸':>12} {'格式':>5} {'位深':>4} {'大小':>10}  出现页")
for xref, v in rows:
    print(f"{xref:>6} {str(v['w'])+'x'+str(v['h']):>12} {v['ext']:>5} {str(v['bpc']):>4} "
          f"{v['bytes']/1024:>8.0f}KB  {','.join(map(str, v['pages'][:8]))}")
doc.close()
