"""检查部署文件的完整性：favicon.ico / PDF / HTML 逐个验证。
用法: python tools/verify-deploy.py
"""
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
bad = []


def check_ico(p: Path):
    """ICO 结构：ICONDIR(6字节) + ICONDIRENTRY(16字节/图) + 图像数据"""
    raw = p.read_bytes()
    print(f'\n[ favicon.ico ]  {len(raw)} 字节')
    if len(raw) < 22:
        print('  !! 文件过小，不像合法 ICO')
        bad.append('favicon.ico 过小')
        return
    r1, r2, r3 = struct.unpack('<HHH', raw[:6])
    print(f'  reserved={r1} (应 0)  type={r2} (应 1=ICO)  图像数={r3}')
    if r1 != 0 or r2 != 1 or r3 < 1:
        print('  !! 头部字段异常 —— 不是合法 ICO')
        bad.append('favicon.ico 头部异常')
        return
    off = 6
    for i in range(r3):
        w, h, ncol, res, planes, bpp, size, offset = struct.unpack('<BBBBHHII', raw[off:off + 16])
        print(f'  图 {i}: {w or 256}x{h or 256}  {bpp}bpp  {size} 字节  @偏移 {offset}')
        if offset + size > len(raw):
            print('  !! 图像数据越界 —— 文件被截断')
            bad.append('favicon.ico 数据越界')
        # 判断内嵌格式
        head = raw[offset:offset + 8]
        if head[:8] == b'\x89PNG\r\n\x1a\n':
            print('       内嵌 PNG')
        elif head[:3] == b'\xff\xd8\xff':
            print('       内嵌 JPEG（浏览器兼容但 Windows 资源管理器可能报错）')
        else:
            dib = struct.unpack('<I', raw[offset:offset + 4])[0]
            print(f'       内嵌 BMP/DIB（header size={dib}）')
        off += 16


def check_pdf(p: Path):
    raw = p.read_bytes()
    print(f'\n[ {p.name} ]  {len(raw)/1048576:.2f} MB')
    print(f'  头: {raw[:8]!r}')
    if not raw.startswith(b'%PDF-'):
        print('  !! 不是合法 PDF 头')
        bad.append('PDF 头异常')
    tail = raw[-2048:]
    if b'%%EOF' not in tail:
        print('  !! 结尾缺少 %%EOF —— 文件可能被截断')
        bad.append('PDF 缺少 EOF')
    else:
        print('  尾: 含 %%EOF  OK')
    # 重要：检查是否有增量更新残留
    print(f'  %%EOF 出现次数: {raw.count(b"%%EOF")}')


def check_html(p: Path):
    raw = p.read_bytes()
    s = raw.decode('utf-8')
    print(f'\n[ index.html ]  {len(raw)/1048576:.2f} MB')
    # HTML 里的非法字符（控制字符会让某些服务器/解析器出问题）
    ctrl = [(i, c) for i, c in enumerate(s) if ord(c) < 0x20 and c not in '\t\n\r']
    print(f'  非法控制字符: {len(ctrl)}')
    if ctrl:
        for i, c in ctrl[:5]:
            print(f'    位置 {i}: 0x{ord(c):02x}')
        bad.append('HTML 含非法控制字符')
    # 代理对 / 非法 UTF-8 序列
    print(f'  </html> 结尾: {"OK" if s.rstrip().endswith("</html>") else "缺失"}')
    # 检查所有 img src 是否都以 data: 或 http 开头
    srcs = re.findall(r'<img[^>]*\ssrc="([^"]*)"', s)
    weird = [x[:60] for x in srcs if not x.startswith(('data:', 'http', './'))]
    print(f'  <img> 数量: {len(srcs)}   异常 src: {len(weird)}')
    if weird:
        print('   ', weird[:3])
        bad.append('存在异常 img src')


print('=== 部署文件完整性检查 ===')
check_html(ROOT / 'index.html')
check_pdf(ROOT / 'MaoAn-Portfolio-2026.pdf')
check_ico(ROOT / 'favicon.ico')

print()
if bad:
    print('发现问题：')
    for b in bad:
        print('  - ' + b)
    sys.exit(1)
print('三个部署文件均完整。')
