"""字体子集化压缩 PDF：把整份嵌入的字体裁到「正文实际用到的字形」。

保留原字形 ID（retain_gids=True），因此 PDF 里已有的 CIDToGIDMap 与
字体宽度数组依然有效，不需要改写内容流。

用法: python tools/subset-pdf-fonts.py <输入.pdf> <输出.pdf>
"""
import io
import os
import sys

import pymupdf
from fontTools import subset
from fontTools.ttLib import TTFont

src = sys.argv[1]
dst = sys.argv[2]

doc = pymupdf.open(src)
before = os.path.getsize(src)

# ---------- 1) 收集正文实际用到的字符 ----------
used = set()
for pno in range(doc.page_count):
    used |= set(doc[pno].get_text())
used = {c for c in used if c.strip()}
print(f'页数 {doc.page_count}，正文使用字符 {len(used)} 个')

# ---------- 2) 找出字体文件流（含 /Length1 的流即 TrueType 文件） ----------
targets = []
for xref in range(1, doc.xref_length()):
    try:
        o = doc.xref_object(xref, compressed=True)
    except Exception:
        continue
    if '/Length1' in o:
        data = doc.xref_stream(xref)
        if data:
            targets.append((xref, data))

if not targets:
    print('未找到可子集化的字体流')
    sys.exit(0)

print(f'找到 {len(targets)} 个内嵌字体文件\n')

total_before = 0
total_after = 0
for xref, data in targets:
    total_before += len(data)
    tt = TTFont(io.BytesIO(data), fontNumber=0)
    name = tt['name'].getDebugName(1) or '(未命名)'
    n0 = tt['maxp'].numGlyphs

    # 字体覆盖不到的字形（如 Helvetica 只覆盖 ASCII），按交集取
    cmap = tt.getBestCmap() or {}
    chars = {c for c in used if ord(c) in cmap}
    if not chars:
        # 没有任何命中：保留 ASCII，避免子集为空
        chars = {chr(i) for i in range(32, 127)}
        print(f'  xref {xref} {name}: 无命中，回退保留 ASCII')

    opts = subset.Options()
    opts.retain_gids = True          # 关键：保持原 GID，PDF 映射继续有效
    opts.desubroutinize = False
    opts.hinting = False
    opts.legacy_kern = False
    opts.layout_features = []
    opts.name_IDs = ['*']
    opts.name_legacy = True
    opts.notdef_outline = True

    font = subset.load_font(io.BytesIO(data), opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text=''.join(sorted(chars)))
    subsetter.subset(font)

    buf = io.BytesIO()
    subset.save_font(font, buf, opts)
    new = buf.getvalue()
    font.close()
    tt.close()

    n1 = len(chars)
    print(f'  xref {xref}  {name[:34]:<36} 码位 {n0:>6} -> {n1:>4}   '
          f'{len(data)/1048576:>6.2f}MB -> {len(new)/1048576:>5.2f}MB')

    if len(new) < len(data):
        doc.update_stream(xref, new, compress=True)
        doc.xref_set_key(xref, 'Length1', str(len(new)))
        total_after += len(new)
    else:
        total_after += len(data)

doc.save(dst, garbage=4, deflate=True, clean=True)
doc.close()

after = os.path.getsize(dst)
print(f'\n字体数据: {total_before/1048576:.2f} MB -> {total_after/1048576:.2f} MB')
print(f'文件体积: {before/1048576:.2f} MB -> {after/1048576:.2f} MB '
      f'（压缩到 {after/before*100:.1f}%）')
print(f'输出: {dst}')
