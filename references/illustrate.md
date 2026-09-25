# 插画函数库（engine/illustrate.js）

画风：粗深色描边、饱和平涂、形状里压一层铅笔排线、暗部一道弧形阴影、光源发光。和 `inked` 风格搭配效果最好，其他深色风格（blueprint、neon）也能用。示例：`examples/token-journey`。

## 构图原则（插画镜头）
- **一镜一个大主体**：主体占画面 40% 以上，放在中间或三分线上。小方框加标签的排法会像 PPT。
- **少文字**：旁白和字幕负责讲，画面上只留关键词（`outlinedText`），不要标题和说明文字。
- **一句台词一镜**：每镜 2~5 秒。镜内要有持续的动作（旋转、生长、涌动、脉冲），不能出现静止帧。
- **镜头之间有连续性**：同一个主角（比如发光的 token `orb`）贯穿全片；用 `portal` 钻进主角，再从里面展开下一镜，`transitionFocus` 填主角在上一镜结尾时的**屏幕坐标**（注意镜头平移和缩放）。
- **背景配天空**：`space`、`dusk`、`dawn`、`sunset` 这几个 backdrop 和插画最搭。

## 基础画法
| 函数 | 说明 |
|---|---|
| `ILL` | 配色：`outline` 描边、`cream`、`gold`、`orange`、`magenta`、`pink`、`violet`、`lavender`、`teal`、`blue`、`green`、`brown`、`night` |
| `inkShape(build, { fill, outline, lw=5, hatch, shade, glow, alpha, box })` | 核心画法：平涂、排线、暗部弧形阴影、粗描边依次画。`build()` 只往路径里加形状，不要调用 `beginPath`。**先 `translate` 到形状中心，再用局部坐标画**，这样排线会跟着形状一起动；`box` 填形状的局部包围盒，排线只画这一块，速度快很多。`hatch: false` 表示不画排线；`shade: { dx, dy }` 是阴影的偏移，偏移反方向那一侧会压暗 |
| `blobShape(circles, o)` | 用几个圆拼成一团（云、树丛、星云），只在外轮廓描边 |
| `cloud(cx, cy, w, h, { fill, seed })` | 插画风云团 |
| `outlinedText(str, x, y, { size, color, alpha })` | 奶油色字加粗深色描边，压在复杂画面上也看得清 |

## 光
| 函数 | 说明 |
|---|---|
| `glow(x, y, r, color, alpha)` | 柔光。深色风格下用叠加混合，看起来是“光”，而不是一团发灰的颜色 |
| `glowStar(x, y, r, t, color, { intensity, phase })` | 发光核心加十字星芒 |
| `flare(x, y, s, color, alpha)` | 四角星 |
| `twinkles(t, rect, n, colors, seed)` | 一片闪烁的四角星 |
| `beam(x0, y0, x1, y1, w, color, alpha)` | 发光光束 |

## 主体
| 函数 | 说明 |
|---|---|
| `ringTunnel(t, cx, cy, { speed, colors, g=1.3, bend })` | 彩色粗圆环一圈套一圈，不停朝镜头涌来（无限推进）。`bend: [x, y]` 让隧道拐弯。想加速时，传入按时间积分后的 t，不要直接改 speed，否则圆环会跳 |
| `galaxyDisk(t, cx, cy, R, { tilt, n, arms, colors, spin })` | 旋转的旋臂星系。返回 `proj(rad, ang)`，把盘面坐标换算成屏幕坐标，可以把词挂在旋臂上（角度要加上 `3.6 * u + t * spin * (1.3 - 0.6u)`，才能跟着旋臂转） |
| `helix3D(t, cx, cy, len, { p, R, turns, strands, colors, labels })` | 横向的 3D 双螺旋，p 控制从左往右长出来 |
| `dendrites(cx, cy, p, t, { reach, roots, depth, seed, soma, color, pulses })` | 神经元：树突分叉长出，光点沿树突流向中心。返回树突末端的坐标列表 |
| `accretionDisk(t, cx, cy, R, { tilt, colors, hole })` | 黑洞吸积盘，带上方的透镜光环 |
| `lightning(x0, y0, x1, y1, t, { period, offset, seed, width })` | 分叉闪电，每 period 秒劈一次，每次形状不同。返回闪光强度，可以用来让天空跟着闪。想让闪电正好劈在某个词上，传 `lt - S.word(...) + 10 * period` |
| `prismSpectrum(cx, cy, size, p, bands, { src, focus, dim })` | 光束射进棱镜，散成色带，色带宽度按 value 分配，末端标词。返回 `{ exit, ends }` |
| `planet(x, y, r, { fill, stripes, ring, craters, glow, t })` | 插画风行星 |
| `phyllotaxis(cx, cy, R, p, { n, petals, t })` | 向日葵：种子按黄金角一圈圈盘旋长出，再展开花瓣 |

## 性能
大量粒子用一次 `stroke` 批量画，不要逐个做渐变；模糊、渐变这类静态纹理用 `sprite` 缓存。token-journey 整片平均每帧 0.7ms。
