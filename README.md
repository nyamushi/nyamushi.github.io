# 毛安 · 工业设计作品集 2026

面向 2027 届校招的作品集。线上站点：**https://nyamushi.github.io/**

仓库里是**两个自包含的成品**，都不依赖任何外部资源、字体或网络：

| 文件 | 说明 |
|---|---|
| `index.html` | 网页版，图片以 data URI 内嵌，单文件离线可用 |
| `MaoAn-Portfolio-2026.pdf` | PDF 版，15 页横向版面，适合邮件投递与打印 |

站点右下角联系区提供 PDF 下载入口。

---

## 内容

- **关于我**：工业设计本科在读，关注产品造型、CMF 与体验设计的完整链路
- **六个项目**
  1. 全自动落叶清扫机器人 — 产品设计
  2. 文化创意桌面产品系列 — 产品设计（鼎盛 / 玉琮 / 时光）
  3. 时光种子 · 桌面生态盆景 — 产品设计
  4. 「萌宠吸吸」解压文具套装 — 文创设计
  5. AR 山海经神兽卡牌 — 交互设计
  6. 气动按摩仪配套 App — 界面设计
- **联系方式**：15924124508 · 3027891801@qq.com · 杭州

---

## 体积压缩记录

两个成品都做过明显压缩，记录处理方式便于日后更新时复用。

| 成品 | 处理前 | 处理后 |
|---|---|---|
| 网页版 | 60.73 MB | **2.84 MB** |
| PDF 版 | 33.32 MB | **1.91 MB** |

### 网页版：图片编码问题

原先 10 处图片以**无损 PNG base64** 内嵌，占体积 100%；其中机器人图在 Hero 与项目区
**重复内嵌了两次**。改为压缩后的 JPEG（最长边 2000px、质量 82）后降到 1/21，观感无差别。

```powershell
python tools/build-html-optimized.py <素材目录> <输出目录>
```

### PDF 版：大头是字体，不是图片

体积有两个来源，第二个才是关键：

1. 18 张无损 PNG 图片 **11.27 MB** → 重压为 JPEG；
2. 两个**未做子集化**的微软雅黑字体 **21.94 MB**。

字体覆盖 29905 个码位，而全文实际只用了 **604 个字** —— 相当于为了几页作品集
把整套中日韩字库塞了进去（典型的 Windows「打印到 PDF」行为）。

```powershell
python tools/compress-pdf.py <输入.pdf> <中间.pdf> 0 80      # 第一步：压图片
python tools/subset-pdf-fonts.py <中间.pdf> <输出.pdf>       # 第二步：字体子集化
```

子集化的要点是**保留原字形 ID**（`retain_gids=True`）：这样 PDF 里既有的
CIDToGIDMap 与字体宽度数组继续有效，不需要重写内容流，**版面零变化**。

### 压缩后的校验

动过字体不能只看文件能否打开，所以做了逐页比对：

```powershell
python tools/verify-pdf.py <原.pdf> <新.pdf>
```

结果：15 页**文字一字不差、渲染像素差异 0.00%**，并在 200DPI 下确认中文小字边缘仍然锐利。
网页版同样有结构校验：

```powershell
python tools/verify-html.py index.html
```

---

## 目录说明

```
├── index.html                    网页版成品（2.84 MB，单文件）
├── MaoAn-Portfolio-2026.pdf      PDF 版成品（1.91 MB，15 页）
├── favicon.ico
├── tools/                        构建、压缩与校验脚本
│   ├── build-html-optimized.py   重建网页版（图片转压缩 JPEG）
│   ├── compress-pdf.py           PDF 第一步：图片重压
│   ├── subset-pdf-fonts.py       PDF 第二步：字体子集化
│   ├── verify-html.py            HTML 结构校验
│   ├── verify-pdf.py             PDF 逐页文字与渲染比对
│   └── pdf-*.py                  PDF 体积/字体/对象分析
├── assets/                       旧版多文件站点留下的图片（当前首页已不引用）
├── raw-src/                      原始素材（已 gitignore，不参与部署）
└── print/                        旧版 A4 生成产物（已 gitignore）
```

> `assets/` 与 `print/` 是上一版多文件站点的遗留物，已从仓库移除
> （`assets/` 与 `projects/` 归档到本地 `_archive/`，该目录已 gitignore）。
> 当前首页是单文件版，不引用它们；日后想参考旧排版可从 `_archive/` 取回。

---

## 隐私说明

`.gitignore` 已排除 `resume.docx`（含手机号与邮箱）。线上不提供简历文件下载，
面试沟通时单独发送即可。

---

## 排障记录

### favicon.ico 曾是损坏文件（会导致站点无法正常访问）

原 `favicon.ico`（606 字节）**其实是个 PNG 文件被错误地命名成 .ico**：
文件头是 PNG 魔数 `89 50 4E 47`，而非 ICO 应有的 `00 00 01 00`。
扩展名与内容不符，服务器提供该文件时会出错 —— 外部代理访问站点返回
**Cloudflare 520 / 522**，正是「源站返回未知错误」的典型表现。

已用 `tools/make-favicon.py` 重新生成合法 ICO（16/32/48/64 四个尺寸，
ICO 容器内嵌 PNG），并把首页 favicon 声明规范化（内联 SVG 优先、
`favicon.ico` 兜底且显式声明 `type`）。

### 本机无法访问 *.github.io（网络层问题，非站点故障）

本机网络对**整个 `*.github.io` 域名族**的 TLS 握手都会被阻断：

| 域名 | 结果 |
|---|---|
| `github.com` / `raw.githubusercontent.com` | 正常 200 |
| `pages.github.com` / `choosealicense.com` | 正常 200 |
| `github.io`（裸域名） | 超时 20s |
| `octocat.github.io`（他人站点） | 超时 20s |
| `nyamushi.github.io` | 超时 15–19s，重试稳定复现 |

连 TLS 证书都拿不到，属典型的 DNS 污染 / SNI 阻断特征。
**与站点本身无关** —— 换网络（如手机移动数据）即可验证。

### 清理旧版残留

原多文件站点（7 个项目、`assets/` + `projects/`）已被单文件版替换，
不再被任何页面引用。已从仓库移除并归档到本地 `_archive/`：

| 项目 | 清理前 | 清理后 |
|---|---|---|
| 仓库内容 | 11.24 MB / 98 个文件 | **4.89 MB / 48 个文件** |

---

## 校验工具

改动部署文件后建议跑一遍，三个脚本都应退出码 0：

```powershell
python tools/verify-deploy.py                 # 部署文件：HTML / PDF / ICO 逐个验证
python tools/verify-integrity.py index.html   # base64 合法性、标签配平、结构完整
python tools/verify-html.py index.html        # 图片编码与内容完整性
```

`verify-deploy.py` 会校验 ICO 容器结构（含图像数据是否越界）、PDF 是否含 `%%EOF`、
HTML 是否含非法控制字符 —— 这些正是本次 favicon 故障暴露出的检查盲区。
