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

> `assets/` 与 `print/` 是上一版多文件站点的遗留物。当前首页是单文件，
> 不再引用它们，可以安全删除（能省约 6 MB）；保留是为了日后想恢复旧版排版时留个底。

---

## 隐私说明

`.gitignore` 已排除 `resume.docx`（含手机号与邮箱）。线上不提供简历文件下载，
面试沟通时单独发送即可。
