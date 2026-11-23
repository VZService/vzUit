# 01 · 设计 token

唯一来源是 `src/tokens.css`。本文件说明每个数值怎么用、什么情况下不许自己写值。

## 三层结构

| 层 | 变量 | 谁可以引用 |
|---|---|---|
| 基础色盘 | `--vz-palette-*` | 只有语义层，业务与组件不许直接取 |
| 语义 | `--vz-bg` `--vz-text` `--vz-border` `--vz-primary` `--vz-<状态>-bg` | 业务样式与组件都走这层 |
| 组件 | `--vz-radius-*` `--vz-control-*` `--vz-shadow-*` `--vz-space-*` | 组件内部与布局 |

## 使用原则

页面与组件的样式只允许引用变量，不允许出现字面色值、字面圆角、字面层级、字面过渡时长。需要新数值时改 `tokens.css`，不在业务 CSS 里就地造一个。

唯一例外是第三方库的覆盖样式与 SVG 呈现属性（`fill` 吃不到 `var()`），这两类要在规则上方加一行注释说明来源。

## 颜色

| 组 | 变量 | 用途 |
|---|---|---|
| 背景 | `--vz-bg` `--vz-deep` `--vz-bg-surface` `--vz-bg-elevated` `--vz-bg-modal` `--vz-bg-subtle` `--vz-bg-disabled` | 页面底、深色底、承载面、浮起面、弹窗面、浅底、禁用底 |
| 玻璃 | `--vz-surface` `--vz-glass-2` 到 `--vz-glass-15` | 深色主题下的半透明表面，数字即 alpha×100 |
| 边框 | `--vz-hairline` `--vz-border-0` 到 `--vz-border-3` `--vz-border-hover` `--vz-border-focus` | 常规卡片优先用 `--vz-hairline`（半透明微线，近 0.5px 观感） |
| 文字 | `--vz-text` `--vz-text-secondary` `--vz-text-tertiary` `--vz-text-disabled` | 四档，一页内不超过三档混用 |
| 品牌 | `--vz-brand-from` `--vz-brand-to` `--vz-primary` `--vz-primary-hover` `--vz-primary-active` `--vz-primary-subtle` `--vz-primary-gradient` | 渐变固定 135 度，起止色不许换向 |
| 状态 | `--vz-success` `--vz-warning` `--vz-danger` `--vz-info` 与配套 `*-bg` `*-border` | 徽标、横幅、状态点用浅底加深字三件套 |
| 标签 | `--vz-tag-*` 五色 | 分类标记，不许扩展到第六种 |

`--vz-error` 与 `--vz-danger` 同值，新代码统一用 `--vz-danger`。

亮色主题由 `[data-theme="light"]` 提供，语义层整体换值：页面底 `#f8fafc`、承载面 `#ffffff`、文字主 `#0f172a`、次 `#475569`、三 `#94a3b8`、禁用 `#cbd5e1`、边框 `#e2e8f0`。业务代码不写这两套值，只引用变量。

## 字体与字号

两个字体栈分工固定，不许互换：`--vz-font`（得意黑）用于官网展示与营销页大标题，`--vz-font-ui`（Inter 栈）用于界面正文、表单、按钮。界面正文用得意黑会让小字发虚。

字号只允许 12 / 14 / 16 / 24 / 30 / 46 六级，`--vz-fs-20` 保留为 16 的别名，存量引用不断链。

界面内按字阶四档成对取用，字号与行高不许拆开单配：

| 档 | 变量 | 值 |
|---|---|---|
| 页面标题 | `--vz-type-page-size` / `--vz-type-page-line` | 20 / 28，字重 600 |
| 区块标题 | `--vz-type-section-size` / `--vz-type-section-line` | 16 / 24，字重 600 |
| 正文 | `--vz-type-body-size` / `--vz-type-body-line` | 14 / 20，字重 400 或 500 |
| 辅助说明 | `--vz-type-caption-size` / `--vz-type-caption-line` | 12 / 16，字重 400 |

字重只允许 400 / 500 / 600 / 700。展示页的大标题可以超出四档，界面页不许。

## 间距

`--vz-space-1` 到 `--vz-space-8` 对应 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64。所有 margin、padding、gap 都从这八级里选，需要 20px 这类夹值时就近取 16 或 24。嵌套容器四边内边距对称。

## 圆角

圆角按组件语义分配，不按数值命名：

| 变量 | 值 | 用途 |
|---|---|---|
| `--vz-radius-none` | 0 | 贴边容器，成组拼接时中间不留缝 |
| `--vz-radius-2xs` | 4px | 14 到 16px 见方的微元素：勾选框、行内色块、标签上的关闭 |
| `--vz-radius-xs` | 8px | 20 到 22px：徽标、提示条关闭 |
| `--vz-radius-sm` | 12px | 28 到 32px 控件：下拉项、分页、文件区、卡片式选项 |
| `--vz-radius-input` | 14px | 输入框、选择器触发器、输入组 |
| `--vz-radius-md` | 16px | 气泡确认、横幅提示、Tooltip |
| `--vz-radius` | 20px | 业务卡片、KPI 卡 |
| `--vz-radius-lg` | 24px | 面板、下拉菜单、表格容器、批量条、弹窗内模块 |
| `--vz-radius-xl` | 32px | 弹窗、抽屉、原生 dialog |
| `--vz-radius-2xl` | 40px | 顶层浮层 |
| `--vz-radius-toast` | 16px | 轻提示 |
| `--vz-radius-button` | 999px | 按钮，品牌胶囊观感 |
| `--vz-radius-tag` | 999px | 标签 |
| `--vz-radius-progress` | 999px | 进度条 |
| `--vz-radius-pill` | 999px | 头像、胶囊徽标、开关轨道、分段容器 |

档位跟元素的短边挂钩，不跟组件名挂钩：短边 16 走 2xs、20 到 22 走 xs、28 到 32 走 sm，
容器按容器尺度取。同一个组件在不同密度下可以换档，所以按钮只认 `--vz-radius-button`。

两档形状：默认档是圆角，整站偏柔；`<html data-shape="sharp">` 切方形档，同一批变量压到
2 到 8px 的近直角。形状档只翻矩形语义那批，`pill` 与 `progress` 不动，开关轨道与分段控件
在方形档下单独压一次。档位切换只改根元素属性，组件里不出现 `data-shape` 判断。

同心圆角公式：外圆角等于内圆角加内边距。

## 控件尺寸

`--vz-control-h-sm` 28、`--vz-control-h` 32、`--vz-control-h-lg` 40，全部是 4 的倍数。图标 14 / 16 / 20 三档，正文 14 配 16 图标，小标题 16 配 18 或 20。

行内图标统一 `translateY(0.125em)` 下移对齐 x-height，走 `--vz-icon-shift`，不做机械居中。

## 阴影

四级：`--vz-shadow-none`、`--vz-shadow-card`、`--vz-shadow-popover`、`--vz-shadow-dialog`。
常规卡片不用阴影，只用 `--vz-hairline` 微线切分；阴影只给 Dropdown、Popover、Modal、Drawer 这类离屏浮层。

防裁切硬门禁：阴影元素到任意 `overflow != visible` 祖先边缘的间距必须大于等于偏移加模糊加扩散，否则投影被截成黑线。

## 层级与时长

层级封顶四层：`--vz-z-overlay`（遮罩）、`--vz-z-drawer`（抽屉）、`--vz-z-modal`（弹窗）、`--vz-z-toast`（全局提示）。组件内不许出现 `z-index: 9999` 这类字面量。

过渡时长三档：`--vz-dur-fast`（悬停）、`--vz-dur`（常规）、`--vz-dur-slow`（浮层显隐）。弹窗时长与 JS 里的 `VZ_MODAL_MS`、轻提示与 `TOAST_LEAVE_MS` 成对，改一边必须同时改另一边。

## 高频硬编码替换表

| 现有写法 | 改为 |
|---|---|
| `rgba(255,255,255,0.02)` | `var(--vz-surface)` |
| `rgba(255,255,255,0.03)` | `var(--vz-glass-2)` |
| `rgba(255,255,255,0.04)` | `var(--vz-glass-3)` |
| `rgba(255,255,255,0.05)` | `var(--vz-glass-4)` |
| `rgba(255,255,255,0.08)` | `var(--vz-glass-8)` |
| `rgba(255,255,255,0.06)` | `var(--vz-border-1)` |
| `rgba(255,255,255,0.10)` | `var(--vz-border)` |
| `rgba(255,255,255,0.15)` | `var(--vz-border-3)` |
| `rgba(255,255,255,0.32 / 0.48 / 0.62)` | `var(--vz-text-disabled / tertiary / secondary)` |
| `rgba(167,139,250,0.30)` | `var(--vz-border-focus)` |
| `rgba(124,58,237,0.30)` | `var(--vz-shadow-primary-hover)` |
| `#11142a` | `var(--vz-bg-modal)` |
| `#080b14` | `var(--vz-bg)` |
| `#eef2f8` | `var(--vz-text)` |
| `border-radius: 4px` | `var(--vz-radius-sm)` |
| `border-radius: 6px` | `var(--vz-radius-md)` |
| `border-radius: 12px` | `var(--vz-radius)` |
| `border-radius: 16px` | `var(--vz-radius-xl)` |
| `border-radius: 999px` 或 `50%` 胶囊 | `var(--vz-radius-pill)` |
| `z-index: 99999` 或 `1000` | `var(--vz-z-overlay)` |
| `transition: all 0.2s` | `transition: all var(--vz-dur-fast)` |
| `padding: 18px 20px` | `var(--vz-space-4)` 配 `var(--vz-space-5)` |

## 白色透明归并表

上表只收「与 token 完全同值」的档位，视觉必然零变化，由 `tools/replace-hardcoded.mjs` 批量处理。剩下的夹值档位由 `tools/normalize-alpha.mjs` 按属性语义就近归并，视觉有 ≤0.08 alpha 的轻微差异，属于有意的档位收敛。

| 属性 | 原值 | 归到 |
|---|---|---|
| 背景 / 渐变 / 阴影 | 0.02 / 0.03 / 0.04 / 0.05 / 0.08 / 0.12 / 0.15 | glass 斜坡：`surface` / `glass-2` / `glass-3` / `glass-4` / `glass-8` / `glass-12` / `glass-15` |
| 悬停态背景 | 0.04 / 0.08 | `surface-hover` / `surface-raised` |
| 边框 | 0.03 / 0.04 / 0.05 / 0.06 / 0.08 / 0.10 / 0.15 | `border-0` / `border-0` / `border-0` / `border-1` / `border-2`（悬停下用 `border-hover`）/ `border` / `border-3` |
| 文字 | 0.20 到 0.32 / 0.40 到 0.50 / 0.60 到 0.75 | `text-disabled` / `text-tertiary` / `text-secondary` |

判断依据是属性名，不是出现位置：`color` `fill` `stroke` 走文字档，`border-*` `outline-*` 走边框档，其余走表面档。脚本按当前选择器是否含 `:hover` `.active` `.open` `.show` `:focus` 区分静态与悬停。

例外：脚本里拼出来的内联样式字符串、SVG 呈现属性、第三方库覆盖样式，这三类不在自动归并范围内，需要在改动处加注释说明来源。

## 亮色主题

深色是默认，`[data-theme="light"]` 切亮色，值取自同一条语义阶梯，组件层不改。站点不要把亮色值抄进自己的 CSS，加一个 `data-theme` 属性即可。

`--vz-glass-*` 在亮色下换成 slate 实色浅底，叠加效果靠边框表达；亮色页面不要再往上叠半透明白。
