"""逐页提取 PDF 文字，核对页面内容是否完整（发现空白页或缺失内容）
用法: python tools/pdf-audit.py "print/毛安-工业设计作品集.pdf"
"""
import sys
import pymupdf

doc = pymupdf.open(sys.argv[1])
print(f"总页数: {doc.page_count}\n")

expect = {
    1:  ["毛安", "工业设计", "15924124508"],
    2:  ["关于我", "个人优势", "基本信息", "能力清单"],
    3:  ["项目索引", "全自动落叶清扫机器人", "经历与实践"],
    22: ["正在寻找", "3027891801@qq.com", "nyamushi.github.io"],
}

blank, missing = [], []
for i, page in enumerate(doc, 1):
    text = page.get_text().strip()
    chars = len(text.replace("\n", ""))
    imgs = len(page.get_images(full=True))
    flag = "空白!!" if chars < 20 and imgs == 0 else ""
    if flag:
        blank.append(i)
    print(f"  第 {i:2d} 页  文字 {chars:5d} 字  图片 {imgs} 张  {flag}")

    for kw in expect.get(i, []):
        if kw not in text:
            missing.append(f"第 {i} 页缺少「{kw}」")

print()
if blank:
    print(f"空白页: {blank}")
if missing:
    print("内容缺失:")
    for m in missing:
        print("  - " + m)
if not blank and not missing:
    print("全部页面均有内容，关键信息齐全。")
doc.close()
