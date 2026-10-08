"""重建 HTML 作品集：把内嵌 PNG 换成压缩后的 JPEG，把体积从 60MB 压到个位数。

用法: python tools/build-html-optimized.py <源目录> <输出目录>
"""
import base64
import io
import sys
from html import escape
from pathlib import Path

from PIL import Image

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r'D:\ai工作区\项目分组\新建文件夹')
OUTDIR = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(r'C:\Users\30278\Downloads\作品集\portfolio-2026')
OUTDIR.mkdir(parents=True, exist_ok=True)
OUT = OUTDIR / 'index.html'

# 内嵌图片的处理参数：网页展示用，2000px 宽足够
MAX_W = 2000
QUALITY = 82

_cache = {}


def data_uri(name):
    """把图片压成 JPEG 并返回 data URI（同一文件只处理一次）。"""
    if name in _cache:
        return _cache[name]
    p = SRC / name
    im = Image.open(p)
    # 去掉 alpha（PNG 可能有透明通道），白底合成后再存 JPEG
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert('RGB')
    if im.width > MAX_W:
        h = round(im.height * MAX_W / im.width)
        im = im.resize((MAX_W, h), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    raw = buf.getvalue()
    _cache[name] = 'data:image/jpeg;base64,' + base64.b64encode(raw).decode()
    print(f'  {name[:52]:<54} {im.width}x{im.height}  {len(raw)/1024:8.1f} KB')
    return _cache[name]


def img(name, cls=''):
    return f'<img class="{cls}" src="{data_uri(name)}" alt="{escape(name)}" loading="lazy">'


CARDS = [
    ('01', '全自动落叶清扫机器人', 'AUTONOMOUS LEAF SWEEPER', '产品设计',
     '面向户外场景的落叶专扫设备，围绕形态、清扫结构、CMF 与可维护性展开。',
     'jimeng-2026-06-16-8638-3D_渲染未来树叶收集站_绘制前部双盘边刷清扫总成的侧视图.png'),
    ('02', '文化创意桌面产品系列', 'CULTURAL DESKTOP OBJECTS', '产品设计',
     '从青铜鼎、良渚玉琮与三星堆金面中提取结构线索，转译为桌面收纳、首饰盒与光影灯。', '鼎.png'),
    ('03', '时光种子 · 桌面生态盆景', 'TIME SEED / DESKTOP TERRARIUM', '产品设计',
     '以 DIY 过程为核心，探索容器造型、组件构成、CMF 与摆放场景。',
     '6117E731717B79D206277F7D79745D4E.jpg'),
    ('04', '「萌宠吸吸」解压文具套装', 'CUTE PET STATIONERY', '文创设计',
     '将三种萌宠角色延展到橡皮、直尺、中性笔与笔袋，平衡日常功能与轻松把玩。', 'stationery-props.jpg'),
    ('05', 'AR 山海经神兽卡牌', 'AR SHANHAIJING CARDS', '交互设计',
     '在团队项目中负责 AR 交互实现、3D 模型与动画制作及展板排版。',
     'AC101BB4EBBEB05A7D0673B028DF80D4.jpg'),
    ('06', '气动按摩仪配套 App', 'AIR MASSAGE / COMPANION APP', '界面设计',
     '围绕首页、控制、数据与用户中心，建立硬件状态与移动端控件之间的映射。', 'massager-home.jpg'),
]

# ---------- 样式：直接从原 HTML 中抽取，保证与原始版本完全一致 ----------
ORIG_HTML = SRC / '毛安_工业设计作品集_2026.html'
_src = ORIG_HTML.read_text(encoding='utf-8')
_i, _j = _src.index('<style>') + len('<style>'), _src.index('</style>')
CSS = _src[_i:_j]
print(f'从原 HTML 抽取样式 {len(CSS)} 字符\n压缩内嵌图片：')

HERO_IMG = img('jimeng-2026-06-16-8638-3D_渲染未来树叶收集站_绘制前部双盘边刷清扫总成的侧视图.png')

parts = []
parts.append('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width, initial-scale=1">'
             '<title>毛安 · 工业设计作品集 2026</title><style>')
parts.append(CSS or '')
parts.append('</style></head><body>')
parts.append('<header class="nav"><div class="wrap navin"><a href="#top">MA / 2026</a>'
             '<nav class="navlinks"><a href="#profile">关于我</a><a href="#works">项目</a>'
             '<a href="#contact">联系</a></nav></div></header>')
parts.append('<main id="top"><section class="hero wrap"><div>'
             '<div class="eyebrow">INDUSTRIAL DESIGN PORTFOLIO</div><h1>毛安</h1>'
             '<h2>工业设计 · 产品设计</h2>'
             '<p>用产品造型、CMF 与体验设计，回应真实场景中的使用问题。'
             '关注从需求收敛、形态推演到产品表达的完整链路。</p>'
             '<div class="meta"><span>杭州电子科技大学</span><span>2027 届</span><span>杭州</span></div>'
             '</div><div>' + HERO_IMG + '</div></section>')
parts.append('<section id="profile" class="wrap"><div class="sectionhead"><div>'
             '<div class="eyebrow">PROFILE</div><h2>把想法做成<br>能被理解的产品。</h2></div>'
             '<p>工业设计专业本科在读。关注产品造型、结构思考、CMF 与数字交互之间的连接。</p></div>'
             '<div class="profile"><div>'
             '<p class="lead">比起单纯追求视觉冲击，我更在意一件事：产品在真实场景里如何被使用、维护与继续迭代。</p>'
             '<p>已有项目覆盖户外设备、文化创意产品、桌面生态、文具系列、AR 交互与配套 App。'
             '后续作品集会继续补足过程图、样机证据与测试结果。</p></div>'
             '<div class="stats"><div class="stat"><strong>01</strong><span>产品造型</span></div>'
             '<div class="stat"><strong>02</strong><span>CMF 表达</span></div>'
             '<div class="stat"><strong>03</strong><span>交互体验</span></div></div></div></section>')
parts.append('<section id="works" class="wrap"><div class="sectionhead"><div>'
             '<div class="eyebrow">SELECTED WORKS</div><h2>精选项目</h2></div>'
             '<p>六个项目，按造型与结构思考、文化转译、体验设计及交互能力展开。</p></div>'
             '<div class="contents">')
parts.append(''.join(
    f'<a href="#p{n}"><span class="no">{n}</span><strong>{t}</strong><small>{c} / {d}</small></a>'
    for n, t, e, c, d, k in CARDS))
parts.append('</div>')

for n, t, e, c, d, k in CARDS:
    parts.append(f'<article class="project" id="p{n}"><div class="projectgrid"><div>'
                 f'<div class="eng">{e}</div><h3>{t}</h3><p class="desc">{d}</p>'
                 f'<div class="meta"><span>{c}</span><span>2026</span>'
                 f'<span>个人 / 团队职责见 PDF</span></div></div><div>{img(k)}</div></div>')
    if n == '02':
        parts.append('<div class="series">'
                     f'<figure>{img("鼎.png")}<figcaption>鼎盛 / 桌面收纳</figcaption></figure>'
                     f'<figure>{img("玉.png")}<figcaption>玉琮 / 首饰盒</figcaption></figure>'
                     f'<figure>{img("光.png")}<figcaption>时光 / 光影灯</figcaption></figure>'
                     '</div>')
    parts.append('</article>')

parts.append('</section><section id="contact" class="contact wrap"><div class="eyebrow">GET IN TOUCH</div>'
             '<h2>寻找工业设计 /<br>产品设计方向的机会。</h2>'
             '<div class="contactgrid"><div><small>PHONE</small><strong>15924124508</strong></div>'
             '<div><small>EMAIL</small><strong>3027891801@qq.com</strong></div>'
             '<div><small>CITY</small><strong>杭州</strong></div>'
             '<div><small>BILIBILI</small><strong>@喵喵虫nyamushi</strong></div></div>'
             '</section></main></body></html>')

OUT.write_text(''.join(parts), encoding='utf-8')
print(f'\n输出: {OUT}')
print(f'体积: {OUT.stat().st_size / 1048576:.2f} MB')
