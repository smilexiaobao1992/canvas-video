# 动效库（engine/motion.js）

所有函数都是输入的纯函数，同样的参数永远得到同样的画面。先看 `examples/components/scenes.js`，每种效果都有用法示例。

## 时间与缓动
| 函数 | 说明 |
|---|---|
| `spring(t, { stiffness=170, damping=14, mass=1 })` | 弹簧：从 0 到 1，会冲过头再回弹。**t 是秒**（比如 `lt - 开始时间`），不是 0..1 的进度。刚度越大越快，阻尼越小回弹越多 |
| `stagger(lt, i, start, gap, dur, ease)` | 一组元素里第 i 个的进度：从 `start + i*gap` 开始，持续 dur 秒 |
| `easeOutElastic`、`easeInBack` | 更多缓动（输入 0..1） |
| `pingPong(p)` | 0 → 1 → 0，适合闪一下、脉冲一下 |
| `noise1(x, seed)` | 平滑的伪随机，范围 -1..1，适合轻微抖动、漂浮 |

## 形状
| 函数 | 说明 |
|---|---|
| `shapes.circle(cx, cy, r)`、`.rect(cx, cy, w, h)`、`.star(cx, cy, r, spikes, inner)`、`.polygon(cx, cy, r, sides)`、`.heart(cx, cy, r)` | 返回闭合形状的点列 `[[x, y], ...]` |
| `morphPath(a, b, p, n=96)` | 在两个形状之间变形，只建路径；之后自己 `ctx.fill()` 或 `strokeInk()`。点数不同也可以，会自动重采样并对齐起点，避免扭曲 |
| `resample(pts, n)` | 把形状均匀重采样成 n 个点 |
| `followPath(fn, u)` | 路径上的位置和切线角 `{x, y, angle}`，用来让物体顺着路线转向 |

## 文字
| 函数 | 说明 |
|---|---|
| `textReveal(str, x, y, lt, { mode, size, color, weight, align, dur=0.9, role='title' })` | 逐字入场。**lt 是距离开始的秒数**（常写 `lt - S.word(0, '某词')`），返回整段宽度。大多数模式在 dur 秒内全部到位，`scramble` 最后一个字要到约 1.25×dur 才定下来。mode：`bounce` 弹跳、`drop` 下落、`scramble` 乱码解码、`wave` 波浪、`split` 上下分开、`blur` 模糊变清、`typewriter` 打字机 |
| `particleText(str, x, y, p, { size, step=5, dot, color, accent, spread, seed })` | 粒子聚成文字。p 从 0 到 1：从四周飞来聚合；1 到 2：再炸散出去。step 越小粒子越密，也越慢 |
| `highlighter(x, y, w, h, p, color)` | 荧光笔从左往右涂 |
| `circleMark(x, y, rx, ry, p, { color, width })` | 手绘圈，绕一圈多一点 |

## 效果
| 函数 | 说明 |
|---|---|
| `shake(lt, at, amp=14, dur=0.5)` | 在 CAMS 里用：`{x: W/2 + s.x, y: H/2 + s.y}`。从 at 开始震动，逐渐衰减 |
| `punchIn(lt, at, amount=0.08, dur=0.5)` | 在 CAMS 里当作 z 使用：快速推近再回落 |
| `ripple(x, y, lt, at, { rings, maxR, dur, color })` | 点击涟漪 |
| `glowPulse(x, y, r, t, color, strength)` | 呼吸光晕，深色和浅色风格都适用 |
| `burst(x, y, p, { n, r0, r1, color })` | 放射状线条，用来强调 |
| `confetti(p, { x0, x1, y0, fall, n, colors })` | 彩带从上往下落，p 从 0 到 1 是整个过程 |
| `orbit(cx, cy, rx, ry, t, n, draw(i, x, y, depth), speed)` | 环绕运动，自动按远近排序；depth 从 -1 到 1，可以用来调远处的大小和透明度 |
| `typingDots(x, y, t, { color, r, gap })` | “正在思考”的三个点 |

## 转场（在 script.json 的场景里写 `"transition"`）
`iris` 圆形收拢再展开 · `zoom` 穿越推进 · `glitch` 数字故障 · `split` 画面从中间劈开 · `shutter` 百叶窗；另外还有 core 里的 `wipe`、`erase`、`blot`、`slide`、`dissolve`、`fade`、`cut`。

## 组合示例
```js
// 念到“心”的时候圆变成心形：先震一下屏，再撒彩带（出自 examples/components）
const p = prog(lt, S.word(0, '心') - 0.3, S.word(0, '心') + 0.5);
morphPath(shapes.circle(cx, cy, 200), shapes.heart(cx, cy, 240), p);
ctx.fillStyle = withAlpha(C.bad, 0.35); ctx.fill(); ctx.strokeStyle = C.bad; ctx.lineWidth = 6; strokeInk();
confetti(prog(lt, S.word(0, '心') + 0.4, S.dur + 1));
// CAMS: morph: (lt, S) => { const s = shake(lt, S.word(0, '心') + 0.2, 10); return { x: W/2 + s.x, y: H/2 + s.y, z: 1 }; }
```
