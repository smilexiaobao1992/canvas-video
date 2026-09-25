# 生成式效果（engine/generative.js）

参考 p5.js 示例（噪声、连接的粒子、烟雾和雪花、群集、递归树、3D、物理）做的效果，全部改写成**时间的纯函数**。需要逐步模拟的效果（鸟群、滚动的小球）会用固定种子一次性预先算好，之后按时间取值，所以依然可以任意跳帧、并行导出。效果展示见 `examples/components` 的 gen1、gen2、gen3 三个场景，实际用法见 `examples/llm-reasoning` 的 attention 和 reason 场景。

## 噪声与颜色
| 函数 | 说明 |
|---|---|
| `noise2(x, y, seed)`、`noise3(x, y, z, seed)` | Perlin 噪声，范围约 -1..1，在各个方向上都平滑。把 z 设为 `t * 速度`，就得到随时间缓慢变化的噪声 |
| `fbm(x, y, octaves=4, seed)` | 分形噪声（多层叠加），适合云、地形、纸张纹理 |
| `mixColor(a, b, t)` | 两个 hex 颜色之间插值，返回 `rgb(...)` |

## 背景类
| 函数 | 说明 |
|---|---|
| `networkField(t, { rect, n=70, linkDist=180, seed, color, accent, drift, speed, dot, signals=8, alpha, lit })` | 粒子网络：点在噪声驱动下漂移，距离近于 linkDist 的点之间连线，signals 个光点沿连线跳动。`lit(i, p)` 返回 0..1，用来点亮部分节点（比如离焦点近的）。最多 120 个点。适合做神经网络、知识图谱、“AI 大脑”的背景，建议 alpha 取 0.25 到 0.5，不要抢主体 |
| `flowField(t, { rect, n=220, scale, speed, life, trail, color, width, alpha, seed })` | 流场：粒子顺着噪声场留下渐隐的流线，最多 400 条。适合表现“数据在流动”、气流、思绪。只想在一块区域里显示时，外面用 `ctx.clip()` 裁剪 |

## 场景氛围 backdrop
在 script.json 里写全局 `"backdrop"`，或者给场景单独写 `"backdrop"` 和 `"backdropOpacity"`（0..1）。氛围层画在风格底图之上、场景内容之下，带视差，每一幕用场景 id 做种子，位置各不相同。

| 名字 | 效果 |
|---|---|
| `network` | 全屏粒子神经网络，低透明度 |
| `flow` | 噪声流场 |
| `particles` | 缓缓上浮的光点 |
| `spotlight` | 从上方打下的一束柔光 |
| `gradient` | 三团颜色（note、ok、mark）缓慢漂移的大渐变光 |
| `rings` | 同心圆波纹缓慢扩散 |
| `space` | 太空：深色星空、星云、闪烁的星星，偶尔划过流星 |
| `sunset` / `dusk` / `dawn` | 日落 / 黄昏 / 黎明的天空渐变 |
| `none` | 不加（默认） |

`space`、`sunset`、`dusk`、`dawn` 会盖住风格底图，整片换成天空，所以要和风格搭配：`space`、`dusk` 这类深色天空配深色风格（blueprint、neon、pixel），`dawn` 这类浅色天空配浅色风格，不然文字会看不清。

自定义：`registerBackdrop(name, (t, info) => {...})`，info 里有 `seed`、`sceneIndex`、`opacity`。也可以在场景里手动画：`drawBackdrop(name, t, opts)`。名字写错会在启动时报错，并列出可用的名字。

## 手绘质感
| 函数 | 说明 |
|---|---|
| `pencilFill({ color, angle=-0.9, spacing=7, width=1.6, cross=false, alpha=0.8, seed, bounds })` | 用铅笔排线填充**当前路径**（先 `beginPath` 画好形状，再调用它），像彩铅涂色；`cross: true` 交叉排线。可以先用浅色 `fill()` 打底再叠排线 |

## 粒子发射器
`emitter(t, { preset, x, y, start, stop, seed, color, ... })`，其中 **start、stop 是全局秒数**，常写 `S.start + S.word(0, '某词')`。每个粒子都能按时间直接算出来，不保存任何状态。

| 预设 | 效果 |
|---|---|
| `smoke` | 烟：慢慢上升、变大、变淡 |
| `sparks` | 火花：向上喷出后被重力拉下，深色风格下会叠加发光 |
| `snow` | 雪：从画面顶部整体飘落，左右轻轻摆动 |
| `rain` | 雨：斜着落下的细线 |
| `bubbles` | 气泡：上浮、摆动，带高光 |
| `dataBurst` | 数据喷发：0 和 1 向四周炸开，适合 AI 或数据主题 |

所有预设字段都能覆盖：`rate`（每秒个数）、`life`、`speed`、`angle`、`spread`、`gravity`、`drag`、`size`、`grow`、`shape`（dot / smoke / spark / rain / snow / bubble / bit）、`area`（`true` 表示整个顶边，或者写 `{x0, x1, y}` 指定一条出生线）。

## 群集
```js
const flock = makeFlock({ n: 40, seed: 5, rect, duration: S.dur + 1, target: (tt) => ({ x, y }) });  // 按参数缓存
drawFlock(flock, lt, { shape: 'arrow' | 'dot', size, color, accent, trail: 0.4 });
```
- 用分离、对齐、聚合三条规则预先模拟，可选一个随时间移动的吸引点 target。
- `flock.at(t)` 返回 `[{x, y, angle}]`，可以拿来自己画成别的形状，比如小信封、小机器人。
- 适合表现“很多个 Agent 协作”“请求蜂拥而至”“信息流动”。

## 递归树
`branchTree(x, y, p, { depth=5, len, angle, spread, shrink, branches=2, seed, width, color, accent, highlight, focus, leaves, labels, labelSide })`
- p 从 0 到 1：一层一层长出来，叶子在最后一段弹出。
- `highlight: [1, 0, 1]` 表示从根部起每一层选第几个子枝（从 0 开始），这条路径就是“选中的那条”。`focus` 从 0 到 1 时，其余枝条变淡，选中的路径变成 accent 色并加粗。
- `labels` 按叶子的生成顺序给文字（深度优先：[0,0,0]、[0,0,1]、[0,1,0] 以此类推）。横向的树，标签放在叶子右边；竖直的树，标签放在叶子上方。
- 需要知道叶子坐标（比如要在后面画叉号、画连线）时，用 `treeNodes({...同样的参数})` 取出节点，筛选 `n.tip`，坐标要加上树的起点 `(x, y)`，参考 llm-reasoning 里的 `reasonGeom()`。
- 适合表现决策树、推理模型“同时试几条路”、知识体系、分类。

## 轻量 3D
| 函数 | 说明 |
|---|---|
| `project3([x, y, z], cam)` | 透视投影，`cam = { rx, ry, dist=900, fov=800, cx, cy }`，返回 `{x, y, s, z}`。让 `ry = lt * 0.35` 就是缓慢旋转 |
| `drawPointCloud(points, cam, { r, color, labelSize, depthFade })` | points 为 `[{ p: [x,y,z], label?, color?, r? }]`，由远到近绘制，远处的点更小更淡 |
| `drawLine3(a, b, cam, { arrow, p, color, width, dash })` | 3D 连线或箭头（p 控制画出进度） |
| `wireAxes(len, cam, { labels })`、`wireSphere(r, cam, { lat, lon })`、`wireCube(size, cam)` | 坐标轴、线框球、线框立方体 |

适合表现词向量和嵌入空间（“国王 - 男人 + 女人 ≈ 女王”）、高维数据、模型的“空间”概念。坐标单位是像素量级，点的范围一般在 ±250 左右。

## 物理轨迹
| 函数 | 说明 |
|---|---|
| `rollDown(curve, t, { x0, g=2600, friction=1.2, duration, key })` | 小球沿曲线 `y = curve(x)` 滚动（屏幕坐标，y 越大越低，所以山谷是中间 y 最大），返回 `{x, y, v}`。结果按曲线源码加参数缓存；如果两条不同的曲线用了同样的函数源码（闭包），要传不同的 `key` |
| `bounce(t, { y0, floor, restitution=0.6, gravity=3000 })` | 弹跳球的高度（解析式），落地后每次弹起都按 restitution 衰减 |

梯度下降的写法：画出损失曲线，小球从 `S.word(0, '小球')` 开始 `rollDown`，最低点处用 `glowPulse` 或文字标注。

## 性能
- 网络 ≤ 120 个点、流场 ≤ 400 条线已经是上限。实际用 60 到 80 个点、150 到 250 条线就足够好看，每帧的开销在几毫秒以内。
- 群集的预模拟在第一次调用时完成（40 只、20 秒大约几十毫秒），之后都走缓存。
