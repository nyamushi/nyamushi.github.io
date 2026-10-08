"""检查 PDF 内嵌字体的可子集化空间：字体体积 vs 实际使用字符数。
用法: python tools/pdf-font-report.py <pdf>
"""
import io
import sys

import pymupdf
from fontTools.ttLib import TTFont

pdf = sys.argv[1]
doc = pymupdf.open(pdf)

# 1) 全文实际用到的字符
used = set()
for pno in range(doc.page_count):
    used |= set(doc[pno].get_text())
used.discard('\n')
used.discard('\r')
print(f'正文实际使用字符数（含中英文标点）: {len(used)}\n')

# 2) 找到字体文件流
print(f"{'xref':>6} {'对象头':<52} {'压缩后':>10} {'解压后':>10}")
font_streams = []
for xref in range(1, doc.xref_length()):
    try:
        o = doc.xref_object(xref, compressed=True)
    except Exception:
        continue
    if '/Length1' in o:                      # TrueType 字体文件流的特征
        raw = doc.xref_stream_raw(xref)
        plain = doc.xref_stream(xref)
        font_streams.append((xref, o[:50].replace('\n', ' '), len(raw), len(plain) if plain else 0))
        print(f'{xref:>6} {o[:50].replace(chr(10), " "):<52} {len(raw)/1048576:>8.2f}MB '
              f'{(len(plain) if plain else 0)/1048576:>8.2f}MB')

# 3) 逐个分析字体覆盖
print()
for xref, head, raw_len, plain_len in font_streams:
    data = doc.xref_stream(xref)
    if not data:
        print(f'xref {xref}: 无法解压，跳过')
        continue
    try:
        tt = TTFont(io.BytesIO(data), fontNumber=0, lazy=True)
    except Exception as e:
        print(f'xref {xref}: 解析失败 {e}')
        continue
    cmap = tt.getBestCmap()
    glyf = tt['glyf'] if 'glyf' in tt else None
    n_glyphs = tt['maxp'].numGlyphs
    covered = len(set(cmap) & used)
    print(f'xref {xref}  {head[:44]}')
    print(f'   字形总数 {n_glyphs}   字体覆盖码位 {len(cmap)}   正文命中 {covered}')
    if glyf is not None:
        comps = sum(1 for g in glyf.glyphs.values()
                    if g.isComposite() if g.numberOfContours == -1)
        print(f'   其中复合字形 {comps}')
    est = raw_len * (covered + 200) / max(len(cmap), 1)
    print(f'   子集化后估算 ≈ {est/1024:.0f} KB（当前 {raw_len/1024:.0f} KB）')
    tt.close()

doc.close()
