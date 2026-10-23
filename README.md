# vzUit · VZService 统一标准

VZService 全站共用的样式、图标与代码规范。一份源文件，多个站引用，改一次全站跟着变。

本仓库是标准的唯一来源。各站不再各自维护一份 reset、一套色值、一批图标。

## 仓库结构

| 路径 | 内容 |
|---|---|
| `src/tokens.css` | 设计变量与字体，纯 token，无组件 |
| `src/vzuit.css` | 完整组件样式，用 `@import` 引 tokens.css 与 components/ |
| `src/components/` | 可单独引用的组件，文件名即组件名，全部 `vz-` 前缀 |
| `src/vzuit-core.js` | UI 运行时 core 段，弹窗、加载圈、转义、轻量 Markdown、页眉页脚外壳，只依赖 DOM |
| `public/starter.html` | 接入样板，新站照这份抄引用顺序与控件结构 |
| `specs/` | 五份规范，见下方索引 |
| `configs/` | editorconfig 与 biome 配置，各站直接拷 |
| `tools/build-icons.mjs` | 图标集合成 sprite |
| `tools/stamp.mjs` | 内容哈希版本戳注入 |
| `tools/check-tokens.mjs` | 变量、层级、硬编码与基座漂移检查 |
| `tools/normalize-alpha.mjs` | 白色透明夹值档位归并 |
| `index.html` | 组件演示页 |

## 三种引用方式

只需要颜色、字号、间距（例如纯展示页）：

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VZService/vzUit@main/src/tokens.css">
```

需要完整组件（大多数站用这个）：

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/VZService/vzUit@main/src/vzuit.css">
```

需要 UI 运行时（弹窗、加载圈、转义、页眉页脚外壳）：

```html
<script src="https://cdn.jsdelivr.net/gh/VZService/vzUit@main/src/vzuit-core.js"></script>
<script>
  VZCore.setup({ nav: [{ href: '/', label: '主页', id: 'home' }], footer: [] });
  VZCore.renderShell();
  VZCore.VZConfirm('确定吗？').then(function (ok) { /* ok 为 true 或 false */ });
</script>
```

需要图标（功能图标与题材图标分两份，按需引其一）：

```html
<svg class="vz-ico" aria-hidden="true"><use href="https://cdn.jsdelivr.net/gh/VZService/vzUit@main/icons-ui.svg#ui-search"></use></svg>
```

`@main` 是浮动地址，推送后 jsDelivr 通常几分钟到十几分钟内生效，缓存上限 12 小时。要求立即生效或锁版本时改用 tag。

## 规范索引

| 文件 | 管什么 |
|---|---|
| `specs/01-token.md` | 变量清单、使用原则、存量硬编码替换表 |
| `specs/02-css.md` | 引用顺序、类名前缀、层叠、断点、动画、无障碍 |
| `specs/03-icon.md` | 图标双轨制、sprite 引用、尺寸与着色 |
| `specs/04-code-style.md` | 命名、文件结构、版本戳、脚本分层、提交信息 |
| `specs/05-adopt.md` | 哪些站接哪些不接、单站接入清单、委托方项目改动约定、浅色皮肤 |

## 校验

```bash
npx @biomejs/biome check .
```

配置在 `configs/biome.json`，拷到站点根目录后即可用。规则覆盖 JS、TS、JSON、CSS 的格式与静态检查。Python 侧用 ruff，行宽 100。

图标与版本戳的生成：

```bash
node tools/build-icons.mjs <图标源目录> icons.svg --split
node tools/stamp.mjs <站点根目录>
```

白色透明的存量收编两步走，先跑同值替换，再跑档位归并：

```bash
node tools/replace-hardcoded.mjs <站点目录> --dry   # 与 token 完全同值，零视觉变化
node tools/normalize-alpha.mjs <站点目录> --dry     # 夹值档位，按语义就近归并
```

接入后拿这两条验收，任一非零就算没接完：

```bash
node tools/check-tokens.mjs <站点目录> --base src/tokens.css
```

扫样板页这类「变量靠外链引入、页内不定义」的文件时，check-tokens 会把它引用的每个变量都报成未定义，这是脚本按目录找定义文件的预期行为。判断样板页本身有没有问题，看浏览器实测结果，别拿单扫 `public/` 的输出当结论。

```bash
node tools/check-tokens.mjs <站点目录> --base src/tokens.css
```

第一条查未定义变量、字面量 z-index、残留的硬编码白色透明；`--base` 额外比对站点 `:root` 与基座 `tokens.css` 的漂移（缺项、多项、取值不同）。站点没有独立 `tokens.css`、把变量写在组件文件里的，也能直接查。

## 与源头站的关系

vzUit 最初由一个站点的公共样式文件抽出。这个站继续作为规范的试验场，新组件先在那边跑顺，再回流到本仓库。其他站引用本仓库，不再各自维护副本。

抽取时保留原值不变，只补齐缺失的过渡时长与圆角语义变量，并把绕过变量的字面量层级改回 token。视觉上与原版一致，这一点用计算样式逐项比对验证过。

## 许可

MIT（Copyright © 2026 VZService）。用于非 VZService 项目时请勿使用 VZService 品牌标识。
