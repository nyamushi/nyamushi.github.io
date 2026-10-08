"""输出 PDF 基本信息（页数 / 尺寸 / 体积）"""
import os
import sys
import pymupdf

pdf = sys.argv[1] if len(sys.argv) > 1 else 'print/毛安-工业设计作品集.pdf'
doc = pymupdf.open(pdf)
r = doc[0].rect
size_mb = os.path.getsize(pdf) / 1048576
print(f"文件: {pdf}")
print(f"页数: {doc.page_count}")
print(f"页面: {r.width / 72 * 25.4:.0f} x {r.height / 72 * 25.4:.0f} mm (A4)")
print(f"体积: {size_mb:.2f} MB")
print(f"元数据标题: {doc.metadata.get('title') or '(无)'}")
doc.close()
