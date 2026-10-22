# 03 · 图标

## 双轨制

图标分两层，来源与用法不同，不许混用：

| 层 | 来源 | 用途 | 目录 |
|---|---|---|---|
| UI 层 | vzUit 图标集里的功能类分类 | 搜索、用户、锁、设置、文件、通知这类界面控件 | `icons/8-ui` `9-media` `10-editing` `11-symbols` 共 341 个 |
| 内容层 | 同一图标集里的题材分类，以及 game-icon-pack | 游戏、道具、食物、建筑、车辆、品牌标识 | `icons/1-game` 到 `7-vehicles` 与 `12-misc` 共 374 个 |

分层的意义是风格可控：两层同为 game-icons 系的填充圆角风格，混排不会像线性图标配填充图标那样冲突。不要为了补一个 UI 图标去引入 Lucide 或 Tabler，那会把两种风格塞进同一个界面。

品牌标识（各产品 logo）不进图标集，单独放 `assets/brand/`，按 SVG 原样使用。

## 引用方式

sprite 分两份，按用途引其中之一，不要两份都引：

| 文件 | 内容 | 体积 |
|---|---|---|
| `icons-ui.svg` | 功能类 341 个 | 223 KB |
| `icons-content.svg` | 题材类 474 个 | 380 KB |

```html
<svg class="vz-ico" viewBox="2.09 2.06 5.71 5.71"><use href="https://cdn.jsdelivr.net/gh/VZService/vzUit@main/icons-ui.svg#ui-search" x="2.09" y="2.06" width="5.71" height="5.71"/></svg>
```

`<use>` 的 `x` `y` `width` `height` 必须与外层 `svg` 的 `viewBox` 四个值完全一致，一个都不能省。原因是图标集的原始画布不是零点起算（多为 `2.00 2.00 6.00 6.00` 这类），symbol 保留了这个非零原点，`<use>` 不显式给值时会从 (0,0) 起算，被外层 viewBox 映射后整体向左上溢出。`.vz-ico` 的 `overflow: visible` 会让溢出露出来，看起来就是图标错位。

实测数据：64×64 容器、`viewBox="2 2 6 6"` 时，不带 x/y 的 `<use>` 相对容器向左上各偏 20.3px，带上后只剩下 1px 边框差。这个偏移量随 viewBox 的原点变大，原点越靠里偏得越多。

取某个图标的 viewBox 用 `grep` 在 sprite 里查对应的 `symbol`，别自己估。

sprite 里每个图标的 id 由「分类名去掉数字 - 文件名」构成，例如 `game-dice`、`ui-search`、`media-file`。跨分类同名不会冲突。

三种写法里只有前两种允许：

| 写法 | 是否允许 | 原因 |
|---|---|---|
| `<use>` 引 sprite | 允许 | 继承 `currentColor`，一份缓存全站复用 |
| 直接内联 `<svg><path .../></svg>` | 允许，仅限一次性大图与品牌标识 | 省一次请求，但会污染 HTML |
| `<img src="xxx.svg">` | 禁止 | img 不继承父级颜色，图标固定显示为黑色或被滤镜强行染色 |

存量里 `docs/ICON.md` 规定必须内联，是因为当时没有 sprite。sprite 方案落地后，内联只保留给品牌标识，其余改 `<use>`。

## 尺寸与着色

尺寸只有四档：16 / 20 / 24 / 32，基准 24。用类控制，不写行内宽高。

```css
.vz-ico { display: inline-block; width: 1.1em; height: 1.1em; vertical-align: -0.15em; fill: currentColor; }
.vz-ico-16 { width: 16px; height: 16px; }
.vz-ico-24 { width: 24px; height: 24px; }
.vz-ico-32 { width: 32px; height: 32px; }
```

着色只经父级 `color` 控制。禁止改 `fill` 为固定色值，禁止单边拉伸。图标与文字并排时用 `vertical-align: -0.15em`，这个偏移量是照现有视觉调的，别改成 `middle`。

## 挑选流程

必须按目录清单检索确认文件存在，不许凭名字猜。图标名与视觉形态经常不一致（`gear` 目录里可能有宝剑），猜出来的名字大多引用不到。

新增图标时先进 `icons/` 对应分类并更新 sprite，不许在页面里直接贴一段来历不明的 path。

## 已知待办

图标源在仓内 `icons/` 按 12 个分类目录存放，`icons-ui.svg` 与 `icons-content.svg` 是由它们生成的产物，改源之后重跑脚本，别手改产物。别的项目自带的图标资源不并入本体系，各自跟自己的上游走。
