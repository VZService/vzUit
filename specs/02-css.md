# 02 · CSS 组织

## 引用顺序

每个站点只有一个样式入口，加载顺序固定，不许打乱：

1. `tokens.css` 变量与字体
2. `vzuit.css` 组件
3. 站点自有样式 `site.css` 或按页面拆分的 `page-*.css`
4. 皮肤层（仅浅色或其他需要独立视觉的项目）

前三层之外再引入第四份全局 CSS 就视为重复造轮子，改造时合并回站点样式里。

## 两份入口的选择

`vzuit.css` 已包含 `tokens.css` 的内容，引用其中一份即可，不要同时引两份。只需要颜色与间距、不要组件的页面（例如纯展示的活动页）才单独引 `tokens.css`。

## 类名前缀

这是当前最需要收编的一项。现有 `vzuit.css` 里有大量裸类名：`.header` `.nav` `.btn-primary` `.post-card` `.modal` `.section-title`。这些名字放进任何一个站都会和该站自己的同名类打架，跨站复用必然出问题。

规则如下：

| 类别 | 前缀 | 例子 |
|---|---|---|
| vzUit 提供的组件 | `vz-` | `.vz-btn-primary` `.vz-modal` `.vz-card` |
| 站点自有布局块 | 站点短名 | `.acr-rank-table` `.blog-post-list` |
| 工具类 | `vz-u-` | `.vz-u-mt-4` `.vz-u-sr-only` |

裸类名不再新增。存量逐步迁：先在 `vzuit.css` 里给每个裸类并列加一个新名（`.btn-primary, .vz-btn-primary { ... }`），站点改用新名后再删旧的。一次迁一类，不做批量正则替换。

## 层叠与覆盖

不许用 `!important`，除了两处已存在的品牌反色（`.brand:hover` 的 background 与 border）。新增 `!important` 视为错误。

覆盖第三方库时用更高的选择器权重，不用 `!important` 硬压。行内 `style="..."` 只允许出现在 JS 计算出的动态值上（进度条宽度、拖拽位置），静态样式一律回到 CSS 类。

## 响应式

断点只有两档，与现状一致：`@media (max-width: 1024px)` 平板，`@media (max-width: 640px)` 手机。不许引入第三档，需要更细的控制时用 `clamp()` 或容器查询，不加断点。

移动端优先用弹性布局与 `gap` 自适应，少写死宽度。抽屉与遮罩的显隐必须由同一套类控制，不靠 JS 直接改 `style.display`。

## 动画

显隐过渡不能用 `display`，`display: none` 会把元素移出渲染树，过渡不生效。用 `opacity` 配 `visibility`，隐藏态的 `visibility` 延迟到淡出结束再跳变，同时立刻加 `pointer-events: none` 停止接收点击。这条在 `vzuit.css` 的弹窗里已有正确实现，照抄即可。

优先动 `transform` 与 `opacity`，不动 `width` `height` `top` `left`。动效时长统一走 `--vz-dur-*`。

尊重系统偏好：`@media (prefers-reduced-motion: reduce)` 下把过渡时长压到 0。

## 无障碍

`outline: none` 只在同时提供了可见焦点样式时才允许。键盘可达的交互元素必须有可见焦点环，统一用 `--vz-focus-ring`。

纯图标的按钮必须有 `aria-label`。装饰性 SVG 加 `aria-hidden="true"`。
