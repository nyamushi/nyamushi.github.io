# 毛安 · 工业设计作品集网站

面向 2027 届校招的在线作品集。纯静态站点（HTML + CSS + 原生 JS），
**无需构建、无框架依赖**，双击 `index.html` 即可打开，也可直接部署到任意静态托管。

---

## 一、快速开始

### 本地预览（推荐）
```powershell
node tools/serve.js          # 默认 http://127.0.0.1:4173/
```

或直接双击 `index.html`（`file://` 方式同样可用，脚本均为非模块脚本）。

### 部署到 GitHub Pages（当前使用）

```powershell
# 1. 首次：初始化并提交
git init -b main
git add .
git commit -m "作品集：7 个项目"

# 2. 关联远程仓库（换成你自己的地址）
git remote add origin https://github.com/你的用户名/portfolio.git

# 3. 推送
git push -u origin main
```

推送后在仓库页面 **Settings → Pages**：
- Source 选 `Deploy from a branch`
- Branch 选 `main`、目录选 `/ (root)`
- 保存后等 1–2 分钟，访问 `https://你的用户名.github.io/portfolio/`

> **简历不会上传**：`.gitignore` 已排除 `resume.docx`（内含手机号与邮箱）。
> 因此线上站点的「下载简历」按钮已改为「导出 PDF」+「复制邮箱」，
> 简历请在面试沟通时单独发送。

### 其他托管方式

| 平台 | 操作 |
|---|---|
| Netlify / Vercel | 直接拖拽文件夹到部署面板 |
| Gitee Pages | 国内访问更快，需实名；推送后在「服务 → Gitee Pages」开启 |
| 阿里云 OSS / 腾讯云 COS | 上传后开启静态网站托管 |
| 校园 / 企业服务器 | 上传到 Web 根目录 |

---

## 二、目录结构

```
作品集/
├── index.html                   首页（Hero / 项目 / 关于 / 能力 / 经历 / 联系）
├── resume.docx                  简历 —— 【已被 .gitignore 排除，不发布到公网】
├── .gitignore                   排除简历与自检截图
├── favicon.ico
├── projects/
│   ├── _template.html           详情页模板（不要直接改生成后的页面）
│   ├── leaf-sweeper-robot.html  01 全自动落叶清扫机器人
│   ├── ar-shanhaijing-cards.html 02 AR 山海经神兽卡牌
│   ├── culture-desktop-series.html 03 文化创意桌面产品系列
│   ├── time-seed-terrarium.html 04 时光种子 · 桌面生态盆景 DIY 套件
│   ├── air-massage-app.html     05 气动按摩仪 · 配套 App
│   ├── cute-pet-stationery.html 06 「萌宠吸吸」解压文具套装
│   └── more-works.html          07 其他课程项目
├── assets/
│   ├── css/style.css            设计系统（颜色/字体/间距令牌 + 全部组件样式）
│   ├── js/projects.js           ★ 内容数据层：所有文案、项目、经历都在这里
│   ├── js/main.js               交互：导航、滚动动效、筛选、图片灯箱
│   └── img/                     优化后的图片（多分辨率变体）
├── raw-src/                     原始素材（高分辨率原图，不参与部署可删）
└── tools/                       构建与自检脚本
```

> 详情页由 `projects/_template.html` 统一生成，**改版式只改模板**，
> 然后运行 `node tools/build-pages.js` 重新产出全部页面（slug 从数据层自动读取）。

---

## 三、怎么改内容

**所有文案集中在 `assets/js/projects.js`**，改这一个文件即可：

| 想改什么 | 改哪个常量 |
|---|---|
| 姓名 / 电话 / 邮箱 / 状态 | `SITE` |
| 首页四个数字 | `STATS` |
| 技能跑马灯 | `MARQUEE` |
| 关于我的基本信息表 | `FACTS` |
| 个人优势四条 | `ADVANTAGES` |
| 能力清单四组 | `SKILLS` |
| 项目详情（标题、亮点、CMF、规格、图片…） | `PROJECTS` |
| 经历时间线 | `TIMELINE` |

项目对象里几个按需使用的字段：

| 字段 | 作用 |
|---|---|
| `cover` / `cardSub` | 卡片封面图与两行简介 |
| `figures[]` | 详情页大图（`src` / `width` / `height` / `cap`） |
| `uiScreens[]` | 多屏界面并排展示（按摩仪项目用，`src` / `full` / `name` / `desc`） |
| `series[]` | 同系列多件产品逐件展示（文创项目用） |
| `cmf.swatches[]` | CMF 色板（`hex` / `name`） |
| `noImage` + `noImageLabel` | 无图项目卡片的占位文案 |
| `cardWide` | 预留：置 `true` 可让卡片跨两列做「主次版式」 |

改完后：

- **只改文案** → 刷新浏览器即可，无需任何构建。
- **改了项目 slug 或增删项目** → 运行 `node tools/build-pages.js` 重新生成详情页。

### 新增一个项目
1. 在 `PROJECTS` 数组里加一个对象，字段参考现有项目（`slug` / `index` / `title` / `category` / `catKey` / `year` / `role` / `cover` / `overview` / `figures` …）。
2. 把图片放进 `raw-src/`，在 `tools/build-assets.ps1` 的 `$plan` 里加一行映射，运行该脚本生成优化图。
3. 运行 `node tools/build-pages.js` 生成详情页。
4. 运行 `node tools/check.js` 自检。

---

## 四、图片处理

原图最大 5404×3040、单张 10MB，已统一压缩为多分辨率 JPEG 变体（共 26 个文件约 3.7MB）。

```powershell
& tools/build-assets.ps1     # 重新生成 assets/img 下所有变体
```

输出规则：`assets/img/<项目>/<名称>-<宽度>.jpg`（宽度 700 / 1000 / 1100 / 1280 / 1400 / 1600 / 1800 按需）。
脚本通过**文件字节数**识别 `raw-src/` 里的原始素材，因此重命名素材不影响处理；
**小图不会被放大**（目标宽度超过原图时按原图宽度输出）。

若素材是 **webp**：Windows PowerShell 5.1 的 GDI+ 无法解码，会报 `Out of memory`。
先用无头 Chrome 转成 JPEG（不需要额外依赖）：

```powershell
node tools/decode-webp.js raw-src/xxx.webp raw-src/xxx-1800.jpg 1800
```

然后把产出的 JPEG 字节数登记到 `tools/build-assets.ps1` 的 `$classified` 分派表里。

---

## 五、自检工具

```powershell
node tools/check.js        # 静态检查：资源引用、锚点、图片变体、页面与数据一致性
node tools/qa-all.js       # 浏览器实测：逐页渲染，查 JS 报错/失败请求/关键内容
node tools/qa-mobile.js    # 移动端 390px：横向溢出、汉堡菜单、关键内容
node tools/qa-filter.js    # 校验分类筛选后可见卡片数与破图情况
node tools/qa-shot.js <url> <out.png>   # 单页整页截图
node tools/measure-cards.js             # 打印各卡片实际宽高，核对版式是否一致
node tools/diag-grid.js                 # 打印卡片在网格中的位置，排查排版空洞
node tools/diag-contrast.js             # 浅色区块文字对比度（WCAG，正文需 ≥ 4.5:1）
node tools/diag-contrast-dark.js        # 深色区块文字对比度
```

> `qa-*.js` / `diag-*.js` 需要本机安装 Chrome（或设置环境变量 `CHROME_BIN`）。
> 截图采用「逐屏滚动 + 视口内截图拼接」，相比 `captureBeyondViewport` 能可靠渲染视口外的图片。

### 关于浅色区块的文字颜色（踩过的坑）

`.section--paper`（关于我）与 `.contact`（联系）是浅色纸底，但里面的组件
（`.adv` / `.fact` / `.spec-table` / `.tag` …）复用的是深色主题的文字色令牌。
如果不覆盖，就会渲染成**浅底浅字**（实测对比度只有 1.07:1，几乎不可见）。

因此 CSS 中把这两个区块的文字令牌**就地覆盖为深色**：

```css
.section--paper,
.contact {
  --text:   #17170f;
  --text-2: #4b4a42;
  --text-3: #6e6b63;
  --accent: #b8430c;   /* 橙色在浅底上需压暗，原 #ff5a1f 仅 2.79:1 */
  --line:   rgba(20, 20, 15, 0.13);
  --line-2: rgba(20, 20, 15, 0.28);
}
```

**改动这两处的颜色后，务必跑一遍 `diag-contrast.js` 与 `diag-contrast-dark.js` 确认对比度。**

---

## 六、设计说明

- **视觉调性**：现代简约工业风。深炭底 `#0b0b0c` + 工业橙 `#ff5a1f`（取自机器人 CMF 的活力警示橙），等宽字体做标签、无衬线做正文。
- **字体**：Inter + IBM Plex Mono（Google Fonts，走 CDN）；中文回退到系统字体（苹方 / 微软雅黑），断网也能正常显示。
- **项目网格**：桌面端固定 2 列，5 个项目 + 1 张「简历 / 联系」收尾卡正好 2×3 铺满；所有卡片同宽同高（图片区统一 `1.42:1`、文字区固定两行 `min-height:172px`），900px 以下回落单列。
  卡片图片用 `object-fit: contain` 完整展示展板、不裁切内容，四周留白由同图模糊放大层填充（`.card__media::before`）。
- **响应式**：断点 1080 / 900 / 780 / 560px；780px 以下切换为汉堡菜单。
- **无障碍**：语义化标签、`aria` 属性、键盘可操作、`focus-visible` 高亮、支持 `prefers-reduced-motion`。
- **打印**：内置打印样式，浏览器「打印 → 存储为 PDF」可直接导出一份浅色版作品集。

---

## 七、内容来源

站点文案依据 `resume.docx` 与素材展板整理：
全自动落叶清扫机器人（浙江省工业设计竞赛）、AR 山海经神兽卡牌（团队项目，指导：刘星）、
文化创意桌面产品系列（鼎盛 / 玉琮 / 时光）、时光种子桌面生态盆景 DIY 套件、
气动按摩仪 · 配套 App（产品三视图 + 四屏界面）、「萌宠吸吸」解压文具套装（3 人小组）、其他课程项目。

> 数据均来自简历与展板，未做夸大。如需调整措辞或补充项目，改 `assets/js/projects.js` 即可。
