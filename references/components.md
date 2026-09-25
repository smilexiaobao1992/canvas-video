# 组件库（engine/components.js）

现成的讲解组件，自带入场动画，颜色跟着风格走。约定：
- `(x, y)` 是左上角，特别说明的除外
- `p` 是 0..1 的出现进度
- `lt` 是场景内秒数，用于按时间顺序播放的组件（聊天、终端、流程图等）

每个组件的效果见 `examples/components`。

## 图标
- `iconGlyph(name, x, y, size=80, { color, fill, width, alpha, rot })`：以 (x, y) 为中心画一个图标。
- `iconBadge(name, x, y, size, lt, at, { bg, color, ring })`：图标加圆角底框，在 at 时刻弹簧弹入。
- 可用图标（`Object.keys(ICONS)`）：brain、gear、search、doc、db、tool、lock、cloud、bolt、check、cross、star、user、chat、globe、code、chip、eye、bulb、book、rocket、key、folder、mail、plug、loop。
- 新增图标：在 `ICONS` 里加一个 `(c) => { ...路径命令 }`，坐标在 -50..50 的方框内。

## 窗口与界面
| 组件 | 说明 |
|---|---|
| `windowFrame(x, y, w, h, { title, dots, fill, bar })` | 带标题栏和红黄绿三个圆点的窗口，返回内容区 `{x, y, w, h}` |
| `browserWindow(x, y, w, h, url)` | 带地址栏的浏览器窗口，返回内容区 |
| `codeBlock(x, y, w, lines, p, { size, title, highlight, lineNumbers })` | 深色代码编辑器：按 p 逐字打出，简单语法着色，打字光标；highlight 是打完后要高亮的行号（从 0 开始）。返回 `{h}` |
| `terminal(x, y, w, h, entries, lt, { size, title, prompt })` | entries = `[{ cmd, out: [...], at }]`：命令在 at 秒开始敲，敲完逐行输出。以 `✓` 开头的行显示绿色，以 `✗` 开头的显示红色 |
| `chatBubbles(x, y, w, messages, lt, { size=30, maxW=w*0.72, avatars=true, streamRate=22, t })` | messages = `[{ role: 'user' \| 'ai' \| 'tool', text, at, think=0.8 }]`：气泡弹出；ai 先显示 think 秒“正在输入”的三个点，再以每秒 streamRate 个字流式输出。气泡高度 = 行数 × size × 1.4 + 26，间距 22。返回最后一条气泡底部的 y，方便在下面接着画或定位标注 |

## 图表与数字
| 组件 | 说明 |
|---|---|
| `barChart(x, y, w, h, data, lt, { start, max, highlight, format, horizontal })` | data = `[{ label, value, color? }]`，柱子依次用弹簧长出；highlight 那一根用 C.ok 高亮 |
| `lineChart(x, y, w, h, series, p, { min, max, labels, grid })` | series = `[{ values, color?, label? }]`，从左往右画出，线头带光点 |
| `donutChart(cx, cy, r, data, p, { thickness, center, legend })` | 环形图，扇区旋转展开，画完显示百分比标签 |
| `progressRing(cx, cy, r, value, p, { label, color, width })` | 进度环，中间显示百分比 |
| `counter(x, y, from, to, p, { size, prefix, suffix, decimals, align })` | 数字从 from 缓动到 to：自动加千分位，数字等宽排列（计数时不会左右跳），到达终值时弹一下 |

## 结构图
| 组件 | 说明 |
|---|---|
| `flowChart(nodes, edges, lt, { size=28, nodeH=84, t })` | nodes = `[{ id, x, y, label, icon?, at, w?, color?, textColor?, iconColor? }]`（x, y 是中心点）；edges = `[{ from, to, at, label?, flow?, dashed?, curve?, color? }]`。节点弹出，连线画出；`flow: true` 让光点沿箭头流动；`curve` 取 -0.3..0.3 让连线弯曲，可以用来画回环。连线接在节点哪一侧，由节点之间的位置决定：满足 `|dx| × nodeH / 节点宽 > |dy|` 时接左右两侧，否则接上下两侧。想让箭头从侧面进出，就把节点摆得更偏水平一些 |
| `timelineAxis(x, y, w, items, lt, { start, dur, size })` | items = `[{ label, sub? }]`，进度线向前推，走到哪个节点，哪个节点就弹出 |
| `compareTable(x, y, colW[], rowH, headers, rows, lt, { start, gap, size })` | 对比表，逐行滑入；单元格写 `'✓'` 或 `'✗'` 会画成对勾、叉号 |
| `callout(tx, ty, lx, ly, label, p, { color, size })` | 引线标注：目标点加涟漪 → 折线 → 标签框 |

## 注意
- terminal 用的是等宽字体，但中文字符不是双倍宽，想用空格对齐表格的中文输出会参差不齐，改成列表形式更好。
- chatBubbles 的 AI 气泡随流式文字逐渐变宽变高，和真实聊天界面一样。

## 尺寸
默认尺寸是按 1920 宽的横屏定的。竖屏（1080 宽）里组件看起来会偏小：字号用 34 到 40，flowChart 的 `nodeH` 用 100 左右，窗口类组件宽度取 `SAFE` 宽度的 80% 到 100%。

## 搭配建议
- 讲“AI 怎么工作”时：`chatBubbles` 负责对话，`terminal` 或 `codeBlock` 负责工具调用，`flowChart` 负责流程，`iconBadge` 负责概念。
- 讲“对比”时：`compareTable`，或者左右两个 `windowFrame`。
- 数字要有冲击力：`counter` 滚动到大数，同时配 `punchIn` 和 `burst`。
- 组件都带有入场动画，不需要再额外淡入。退场可以在外层用 `ctx.globalAlpha` 淡出，或者直接切换场景。
