"""生成真正合法的 favicon.ico（多尺寸，ICO 容器内嵌 PNG）。
之前那个文件其实是 PNG 被错命名为 .ico，扩展名与内容不符。
用法: python tools/make-favicon.py
"""
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'favicon.ico'

ACCENT = (185, 75, 37, 255)      # 与站点 --accent 一致
WHITE = (255, 255, 255, 255)


def make(size: int) -> Image.Image:
    """画一个圆角方块 + MA 字样"""
    # 4 倍超采样后缩小，边缘更干净
    s = size * 4
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=ACCENT)

    # 优先用系统里的中文字体渲染，失败则退回默认位图字体
    font = None
    for path in [r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc',
                 r'C:\Windows\Fonts\arialbd.ttf', r'C:\Windows\Fonts\segoeuib.ttf']:
        try:
            font = ImageFont.truetype(path, int(s * 0.46))
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = 'MA'
    # 以实际包围盒居中
    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((s - tw) / 2 - box[0], (s - th) / 2 - box[1]), text, font=font, fill=WHITE)

    return im.resize((size, size), Image.LANCZOS)


def ico_bytes(images):
    """把多张 PNG 打包成 ICO 容器（现代浏览器与 Windows 均支持内嵌 PNG）"""
    pngs = []
    for im in images:
        buf = __import__('io').BytesIO()
        im.save(buf, 'PNG', optimize=True)
        pngs.append(buf.getvalue())

    n = len(pngs)
    header = struct.pack('<HHH', 0, 1, n)          # reserved=0, type=1(ICO), count
    entries = b''
    offset = 6 + 16 * n
    for im, data in zip(images, pngs):
        w = 0 if im.width >= 256 else im.width      # 256 在 ICO 里记作 0
        h = 0 if im.height >= 256 else im.height
        entries += struct.pack('<BBBBHHII',
                               w, h, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    return header + entries + b''.join(pngs)


sizes = [16, 32, 48, 64]
images = [make(s) for s in sizes]
OUT.write_bytes(ico_bytes(images))
print(f'已生成 {OUT}  {OUT.stat().st_size} 字节  尺寸 {sizes}')
