# vzUit · VZService 统一标准

VZService 全站共用的样式、图标与代码规范。一份源文件，多个站引用，改一次全站跟着变。

本仓库是标准的唯一来源。各站不再各自维护一份 reset、一套色值、一批图标。

## 仓库结构

| 路径 | 内容 |
|---|---|
| `src/tokens.css` | 设计变量与字体，纯 token，无组件 |
| `src/vzuit.css` | 完整组件样式，含 token |
| `specs/` | 五份规范，见下方索引 |
| `configs/` | editorconfig 与 biome 配置，各站直接拷 |
| `tools/build-icons.mjs` | 图标集合成 sprite |
| `tools/stamp.mjs` | 内容哈希版本戳注入 |
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

## 与源头站的关系

vzUit 最初由一个站点的公共样式文件抽出。这个站继续作为规范的试验场，新组件先在那边跑顺，再回流到本仓库。其他站引用本仓库，不再各自维护副本。

抽取时保留原值不变，只补齐缺失的过渡时长与圆角语义变量，并把绕过变量的字面量层级改回 token。视觉上与原版一致，这一点用计算样式逐项比对验证过。

## 许可

MIT（Copyright © 2026 VZService）。用于非 VZService 项目时请勿使用 VZService 品牌标识。
