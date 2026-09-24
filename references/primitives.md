# 引擎 API（engine/core.js、characters.js、iso.js）

所有函数都是全局的，画到当前的 `ctx` 上。颜色用当前风格的调色板 `C`。

## 全局变量
| 名称 | 说明 |
|---|---|
| `W`, `H` | 1920, 1080 |
| `ctx` | 当前的 2D 绘图上下文（转场时引擎可能把它临时换成离屏画布，所以别缓存它） |
| `C` | 当前调色板，语义角色见下 |
| `STYLE` | 当前风格对象（`STYLE.dark`、`STYLE.shadow`、`STYLE.line`…） |

### 调色板语义角色
| 角色 | 用途 |
|---|---|
| `bg` | 背景底色 |
| `surface` | 卡片、方块、节点的填充 |
| `surfaceAlt` | 第二种填充（翻面、选中状态） |
| `ink` | 主线条、主文字 |
| `sub` | 次要文字（比 ink 弱） |
| `muted` | 更弱的文字、辅助线、未激活元素 |
| `neutral` | 中性填充（比如柱状图里没被选中的柱子） |
| `ok` / `okDeep` | 正确、积极、强调；okDeep 用于小颗粒等需要更深颜色的地方 |
| `bad` | 错误、否定 |
| `note` | 注释、标签、副标题 |
| `mark` / `onMark` | 高亮底色 / 高亮底上的文字颜色（所有风格里都是深色） |

需要半透明时用 `withAlpha(C.ok, 0.3)`。

## 数学与时间
| 函数 | 说明 |
|---|---|
| `clamp(x, a=0, b=1)`、`lerp(a, b, t)`、`frac(x)` | 基础工具 |
| `prog(t, a, b)` | t 从 a 走到 b 时，从 0 线性变到 1，超出范围会被截断。几乎所有动画都从它开始 |
| `easeOut`、`easeIn`、`easeInOut`、`easeOutBack` | 缓动函数，输入 0..1。easeOutBack 会先超出一点再回弹，适合弹出效果，在 0 处精确返回 0 |
| `mulberry32(seed)` | 带种子的随机数生成器，每次调用返回 0..1。同一个种子永远得到同一串数 |
| `typed(str, p)` | 按进度 p 截取前面一部分字符，用来做打字效果 |
| `bz([[x,y]×4], u)` | 三次贝塞尔曲线上参数为 u 的点，返回 `{x, y}` |
| `shade(hex, amount)` | 调亮（amount > 0）或调暗（amount < 0）一个颜色，范围 -1..1 |

## 文字
| 函数 | 说明 |
|---|---|
| `text(str, x, y, { size, color, align, baseline, weight, alpha, role })` | role 可以是 `'body'`、`'title'`、`'mono'`，对应风格里的字体 |
| `measure(str, size, weight, role)` | 文字宽度；排版前先量 |
| `font(size, weight, role)` | 返回 ctx.font 用的字符串 |

## 线条
| 函数 | 说明 |
|---|---|
| `strokeInk()` | 按当前风格的线条模式描边当前路径（pencil 铅笔重影 / glow 发光 / chalk 粉笔 / clean 干净）。**自己画路径后用它代替 `ctx.stroke()`**，线条才会跟着风格变 |
| `strokeSamples(pts, { color, width, dash, dashOffset, alpha })` | 把点列 `[{x,y}]` 连成线，自动带风格抖动 |
| `samplePath(fn, p, n=80)` | 在 u=0..p 范围内采样 fn(u)，配合 `strokeSamples` 实现“线条逐渐画出来” |
| `pathWithArrow(fn, p, opts)` | 同上，并在线头画箭头（`head: false` 不画，`headSize` 调大小） |
| `arrowHead(x, y, angle, size, color, alpha)` | 单独画一个箭头 |

## 形状与组件
| 函数 | 说明 |
|---|---|
| `rr(x, y, w, h, r)` | 圆角矩形路径，r 可以是数字或 `[tl,tr,br,bl]`。只建路径，之后自己 fill 或 `strokeInk()`；风格要求时会自动抖动 |
| `shadowRect(x, y, w, h, r, alpha)` | 投影。传入**已经偏移过**的框（通常 x+8、y+10）。按风格画成排线、柔和阴影或者不画 |
| `hatchShade(x, y, w, h, r, alpha)` | 形状内部的排线阴影，只有 hatch 类风格会画 |
| `drawToken(cx, cy, label, { size, pad, h, w, fill, stroke, textColor, lw, sx, sy, alpha, boxAlpha, shadow })` | 居中的带字方块，返回宽度。sy 设成 `abs(cos)` 可以做翻牌效果 |
| `tokW(label, size, pad)` | 算出方块宽度 |
| `rowLayout(labels, size, pad, gap, cx)` | 一排方块居中排版，返回 `[{x, w}]` |
| `drawBubble(cx, cy, w, h, tail{x,y}, { scale, alpha, fill, stroke })` | 对话气泡，尾巴指向 tail |
| `drawCheck(x, y, s, p, color)`、`drawCross(x, y, s, p, color)` | 按进度 p 逐渐画出的对勾、叉号 |
| `drawGround(y, x0, x1, alpha)` | 地平线；hatch 类风格下面会加草丛般的短竖线 |
| `sparkle(x, y, s, color, alpha)` | 星芒：深色风格下叠加发光，浅色风格下画实心星形 |

## 固定在屏幕上的元素
| 函数 | 说明 |
|---|---|
| `pinned(fn)` | 在屏幕坐标系里执行 fn，不受镜头影响 |
| `drawTag(big, small, p)` | 左上角章节标题：逐字打出 + 手绘下划线 |
| `drawProgress(x, y, w, value, label)` | 进度条加百分比 |

## 角色
| 函数 | 说明 |
|---|---|
| `drawRole(role, x, y, s, t, { mood, look, walk, wave, point, talk, alpha, seed, options })` | 画当前场景 cast 里扮演 role 的形象。(x, y) 是脚底；s=1 时约 300px 高 |
| `drawCharacter(name, x, y, s, t, opts)` | 不经过 cast，直接画某个形象 |
| `S.speaking(lt)` | 本场景有旁白正在念时返回 true，传给 `talk` 就能让嘴动起来 |
| `registerCharacter(name, def)` | 注册新形象，见 `characters.md` |

## 等轴测（engine/iso.js）
世界坐标：+x 往右下，+y 往左下，+z 往上。`o = { ox, oy, s }` 指定原点的屏幕位置和一个单位的像素大小（默认 `ISO = { ox: 960, oy: 380, s: 64 }`）。每个函数都接受 `o`。
| 函数 | 说明 |
|---|---|
| `isoPt(x, y, z, o)` | 世界坐标投影到屏幕，返回 `{x, y}` |
| `isoPoly(pts3, o)` | 用三维点列建路径，之后自己 fill 或描边 |
| `isoBox(x, y, z, w, d, h, { o, color, top, left, right, stroke, lw, alpha, shadow, label })` | 立方体。三个面的颜色默认按 color 自动算明暗；z 为 0 时自动在地面投影 |
| `isoRoof(x, y, z, w, d, h, { o, color })` | 双坡屋顶，放在方块顶上 |
| `isoTile(x, y, w, d, { o, fill, stroke })`、`isoGrid(x0, y0, x1, y1, { o, color, step })` | 地面格子和网格线 |
| `isoAlong(pts3, u)` | 沿三维折线按长度取点，返回 `[x, y, z]`，用来移动数据包、角色 |
| `isoPath(pts3, p, { o, ...pathWithArrow 的参数 })` | 沿三维折线逐渐画出路径 |
| `isoLabel(str, x, y, z, { o, dy, ...text 的参数 })` | 在三维点上方写字 |

遮挡关系：把要画的对象收集成 `{ depth: x + y（取中心）, draw }`，按 depth 从小到大画。参考 `examples/iso-city/scenes.js` 里的 `drawSorted`。

## 背景辅助（写风格时用）
- `bgGuides(b, color)`：淡淡的辅助圆、虚线参考线、十字标记
- `bgDust(b, rgb, rand, n, maxAlpha, size)`：随机撒点，用来做纸纤维、粉笔灰、星空

## 引擎行为
- `index.html` 只引用 `engine/load.js`，由它按顺序加载 core、characters、iso、内置形象和全部内置风格。
- 每帧开头调用 `ctx.reset()`，彻底清空上一帧留下的变换、裁剪、滤镜、混合模式和阴影。
- 场景切换时按新场景风格的 `transition` 转场，时长 0.6 秒；上一幕停在最后一帧。
- 第一幕开头淡入 0.4 秒，最后一幕结尾淡出 1 秒。
- 没有定义 CAMS 的场景，默认 3.5% 缓慢推近。
- 每帧绘制顺序：背景 → 镜头内的场景内容 → 风格叠加层 → 颗粒 → 暗角 → 角标 → 章节小圆环 → 字幕。
