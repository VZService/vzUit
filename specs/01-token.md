# 01 · 设计 token

唯一来源是 `src/tokens.css`。本文件说明每个数值怎么用、什么情况下不许自己写值。

## 使用原则

页面与组件的样式只允许引用变量，不允许出现字面色值、字面圆角、字面层级、字面过渡时长。需要新数值时改 `tokens.css` 并升版本，不在业务 CSS 里就地造一个。

唯一例外是第三方库的覆盖样式（例如覆盖某个 UI 库内联写死的颜色），这类需要在该规则上方加一行注释说明来源。

## 颜色

| 组 | 变量 | 用途 |
|---|---|---|
| 背景 | `--vz-bg` `--vz-deep` `--vz-bg-surface` `--vz-bg-elevated` `--vz-bg-modal` | 页面底、深色底、卡片面、浮起面、弹窗面，按由深到浅使用 |
| 玻璃 | `--vz-surface` `--vz-glass-2` `--vz-glass-3` `--vz-glass-4` `--vz-glass-8` `--vz-glass-12` `--vz-glass-15` | 半透明白，叠在深色底上做表面。名字里的数字就是 alpha×100，越大越亮。12 与 15 是斜坡顶端，只用在「已经是 0.06 以上的表面再抬一档」的悬停反馈 |
| 边框 | `--vz-border-0` `--vz-border` `--vz-border-1` `--vz-border-2` `--vz-border-3` `--vz-border-hover` `--vz-border-focus` | 1 最弱 3 最强，`border-0` 是最弱的发丝线（0.04），focus 固定紫 |
| 文字 | `--vz-text` `--vz-text-secondary` `--vz-text-tertiary` `--vz-text-disabled` | 四级，一页内不超过三级混用 |
| 品牌 | `--vz-brand-from` `--vz-brand-to` `--vz-primary` `--vz-primary-2` `--vz-primary-gradient` | 渐变固定 135 度，起止色不许换向 |
| 色阶 | `--vz-brand-1` 到 `--vz-brand-10` | 只在需要色阶对比的图表与徽标里用 |
| 功能 | `--vz-success` `--vz-warning` `--vz-error` `--vz-danger` `--vz-info` | `--vz-error` 与 `--vz-danger` 同值，新代码统一用 `--vz-danger` |
| 标签 | `--vz-tag-*` 五色 | 分类标签，不许扩展到第六种 |

## 字体与字号

两个字体栈分工固定，不许互换：`--vz-font`（得意黑）用于官网展示与营销页大标题，`--vz-font-ui`（Inter 栈）用于界面正文、表单、按钮。界面正文用得意黑会让小字发虚。

字号只允许 `--vz-fs-12` 到 `--vz-fs-46` 八级。正文默认 `--vz-fs-16`，辅助说明 `--vz-fs-14`，最小 `--vz-fs-12`，再小就不写。字重只允许 400 / 500 / 600 / 700。

## 间距与圆角

间距 `--vz-space-1` 到 `--vz-space-6` 对应 4 / 8 / 12 / 16 / 24 / 32。所有 margin、padding、gap 都从这六级里选，需要 20px 这类夹值时就近取 16 或 24，不许写 20。

圆角按组件语义分配，不按数值命名：

| 变量 | 值 | 用途 |
|---|---|---|
| `--vz-radius-sm` | 12px | 小控件、抽屉条目 |
| `--vz-radius-input` | 14px | 输入框、下拉框 |
| `--vz-radius-toast` | 16px | 轻提示 |
| `--vz-radius` | 20px | 卡片默认 |
| `--vz-radius-lg` | 24px | 大卡片、面板 |
| `--vz-radius-xl` | 32px | 弹窗主体 |
| `--vz-radius-tag` | 40px | 标签胶囊 |
| `--vz-radius-pill` | 60px | 按钮胶囊 |
| `--vz-radius-progress` | 10px | 进度条 |

## 层级与时长

层级封顶四层，组件内不许出现 `z-index: 9999` 这类字面量。遮罩用 `--vz-z-overlay`，抽屉用 `--vz-z-drawer`，弹窗用 `--vz-z-modal`，全局提示用 `--vz-z-toast`。

`src/vzuit.css` 里的层级已全部收进这四个变量，`tools/check-tokens.mjs` 会把字面量 `z-index` 报出来，新增组件照此处理。

过渡时长三档：`--vz-dur-fast`（悬停变色）、`--vz-dur`（常规过渡）、`--vz-dur-slow`（弹窗显隐）。弹窗的 `--vz-dur-slow` 必须与 `vzuit.js` 里的 `VZ_MODAL_MS` 保持一致，改一个必须同时改另一个。

## 高频硬编码替换表

这张表是给存量代码改造用的，左列是现在散落在各站 CSS 里的写法，右列是应改成的变量。

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
| `border-radius: 14px` | `var(--vz-radius-input)` |
| `border-radius: 20px` | `var(--vz-radius)` |
| `border-radius: 60px` | `var(--vz-radius-pill)` |
| `z-index: 99999` 或 `1000` | `var(--vz-z-overlay)` |
| `transition: all 0.2s` | `transition: all var(--vz-dur-fast)` |

## 白色透明归并表

上表只收「与 token 完全同值」的档位，视觉必然零变化，由 `tools/replace-hardcoded.mjs` 批量处理。剩下的夹值档位由 `tools/normalize-alpha.mjs` 按属性语义就近归并，视觉有 ≤0.08 alpha 的轻微差异，属于有意的档位收敛。

| 属性 | 原值 | 归到 |
|---|---|---|
| 背景 / 渐变 / 阴影 | 0.02 / 0.03 / 0.04 / 0.05 / 0.08 / 0.12 / 0.15 | glass 斜坡：`surface` / `glass-2` / `glass-3` / `glass-4` / `glass-8` / `glass-12` / `glass-15` |
| 悬停态背景 | 0.04 / 0.08 | `surface-hover` / `surface-raised` |
| 边框 | 0.03 / 0.04 / 0.05 / 0.06 / 0.08 / 0.10 / 0.15 | `border-0` / `border-0` / `border-0` / `border-1` / `border-2`（悬停下用 `border-hover`）/ `border` / `border-3` |
| 文字 | 0.20–0.32 / 0.40–0.50 / 0.60–0.75 | `text-disabled` / `text-tertiary` / `text-secondary` |

判断依据是属性名，不是出现位置：`color` `fill` `stroke` 走文字档，`border-*` `outline-*` 走边框档，其余走表面档。脚本按当前选择器是否含 `:hover` `.active` `.open` `.show` `:focus` 区分静态与悬停。

例外：脚本里拼出来的内联样式字符串、SVG 呈现属性（`fill="rgba(...)"` 不能吃 `var()`）、第三方库覆盖样式，这三类不在自动归并范围内，需要在改动处加注释说明来源。
