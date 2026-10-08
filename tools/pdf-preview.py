"""把 PDF 每页渲染成 PNG，用于检查排版。
用法: python tools/pdf-preview.py "print/毛安-工业设计作品集.pdf" _qa/pdf
"""
import sys, os
import pymupdf

pdf_path = sys.argv[1]
out_dir = sys.argv[2] if len(sys.argv) > 2 else '_qa/pdf'
os.makedirs(out_dir, exist_ok=True)

doc = pymupdf.open(pdf_path)
print(f"页数: {doc.page_count}")
for i, page in enumerate(doc):
    rect = page.rect
    # A4 210x297mm -> 用 ~110 DPI 输出，便于整体查看
    pix = page.get_pixmap(dpi=110)
    out = os.path.join(out_dir, f"p{i+1:02d}.png")
    pix.save(out)
    if i == 0:
        print(f"页面尺寸: {rect.width:.1f} x {rect.height:.1f} pt "
              f"({rect.width/72*25.4:.0f} x {rect.height/72*25.4:.0f} mm)")
print(f"已输出 {doc.page_count} 张到 {out_dir}/")
doc.close()
