"""压缩 PDF：把内嵌的无损图片重压为 JPEG，显著减小体积。

用法: python tools/compress-pdf.py <输入.pdf> <输出.pdf> [目标DPI] [JPEG质量]
"""
import os
import sys

import pymupdf

src = sys.argv[1]
dst = sys.argv[2]
DPI = int(sys.argv[3]) if len(sys.argv) > 3 else 0      # 0 = 不改变像素尺寸
QUALITY = int(sys.argv[4]) if len(sys.argv) > 4 else 80

doc = pymupdf.open(src)
before = os.path.getsize(src)
pages_before = doc.page_count

# 统计原始图片体积，便于对比
total_in = 0
seen = set()
for pno in range(doc.page_count):
    for info in doc[pno].get_images(full=True):
        if info[0] in seen:
            continue
        seen.add(info[0])
        try:
            total_in += len(doc.extract_image(info[0])['image'])
        except Exception:
            pass

n = doc.rewrite_images(
    dpi_threshold=0,          # 处理全部图片，不只高 DPI 的
    dpi_target=DPI,           # 0 = 保持原像素尺寸，只换编码
    quality=QUALITY,
    lossy=True,               # JPEG 等有损格式一并重压
    lossless=True,            # PNG 等无损格式转 JPEG（体积大头）
    bitonal=False,            # 不动黑白图，避免文字发虚
    color=True,
    gray=True,
)

doc.save(dst, garbage=4, deflate=True, clean=True)
doc.close()

after = os.path.getsize(dst)
print(f'处理图片: {n} 张（原始内嵌约 {total_in/1048576:.2f} MB）')
print(f'页数: {pages_before}')
print(f'体积: {before/1048576:.2f} MB -> {after/1048576:.2f} MB  '
      f'（压缩到 {after/before*100:.1f}%）')
print(f'输出: {dst}')
