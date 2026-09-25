# 场景写法

下面这些都来自 `examples/llm-reasoning/scenes.js`，可以直接去那里看完整代码。它们是技法参考，演示某种效果在代码里怎么实现，不是固定套路。

## 1. 让动作对齐台词
```js
const l1 = S.L(1);                                  // 第 1 句 { s, e }
const p = prog(lt, l1.s, lerp(l1.s, l1.e, 0.45));  // 在这句话的前 45% 时间里完成
```
把一句话的时间按比例切开，分给几个子动作（比如思维链里一行一行写字）。这样换声音、改语速以后依然对齐。

## 2. 入场弹出
```js
const s = easeOutBack(prog(lt, l0.s - 0.3, l0.s + 0.2));
if (s > 0) { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); /* 以中心为原点画 */ ctx.restore(); }
```
一组元素依次弹出：给第 i 个元素的开始时间加 `i * 0.07`。

## 3. 打字和光标
```js
const shown = typed(str, p);
text(shown, x, y, { align: 'left' });
if (Math.floor(lt * 2.5) % 2 === 0) ctx.fillRect(x + measure(shown, size) + 6, y - 26, 3, 52);  // 闪烁光标
```

## 4. 线条逐渐画出，带箭头
```js
const curve = [[x0, y0], [c1x, c1y], [c2x, c2y], [x1, y1]];
pathWithArrow((u) => bz(curve, u), easeInOut(prog(lt, a, b)), { color: C.note, dash: [10, 10] });
```
虚线“在流动”：传 `dashOffset: -lt * 30`。

## 5. 沿路径流动的粒子
```js
for (let k = 0; k < n; k++) {
  const pt = bz(curve, frac(lt * 0.45 + k / n));   // 纯函数：位置只由时间决定
  STYLE.dark && k % 2 === 0 ? sparkle(pt.x, pt.y, 6, C.ok) : (ctx.fillStyle = C.okDeep, ctx.beginPath(), ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2), ctx.fill());
}
```
粒子数、粗细、透明度都可以用权重控制，用来表达“强弱”（注意力场景）。

## 6. 一句话碎成方块
量出每个字块“挨在一起”时的宽度和“拆成方块”后的宽度，按拆分进度 `split` 在两者之间插值；间距、边框透明度也跟着 split 变。拆开的过程中加一点正弦抖动，拆完回到 0：`Math.sin(i * 1.7) * 26 * Math.sin(split * Math.PI)`。

## 7. 循环的小节（柱状图猜字）
```js
const cyc = (S.dur - tail - c0) / steps.length;
const k = clamp(Math.floor((lt - c0) / cyc), 0, steps.length - 1);   // 第几轮
const u = clamp((lt - c0 - k * cyc) / cyc);                          // 本轮进度 0..1
```
在一轮内部再按 u 切分阶段：0–0.3 柱子长出来，0.45 起高亮胜出者，0.6–0.9 胜出的字飞到输出区，0.9–1 淡出。已经完成的轮次用 `done(i)` 判断后直接画出最终状态。

## 8. 预先算好的模拟（推理分支强化）
```js
const SIM = (() => { const r = mulberry32(42); let w = [1, 1, 1, 1]; const hist = [w.slice()];
  for (let k = 0; k < n; k++) { /* 按权重抽样、强化、蒸发 */ hist.push(w.slice()); } return { t0, dt, hist }; })();
// 场景里：it = (lt - t0) / dt，在 hist[floor(it)] 和 hist[floor(it)+1] 之间插值
```
模拟里不能用 `Math.random()`，也不能跨帧累积状态。需要用到时间轴时读 `window.TIMELINE`，因为 scenes.js 加载时引擎还没启动。

## 9. 气泡加叉号
气泡用 `drawBubble`，尾巴指向说话者的头。叉号不要盖在关键内容上，放在旁边，用 `lerp(1.6, 1, easeOutBack(p))` 做“砸下来”的缩放。

## 10. 高亮标记
```js
ctx.fillStyle = withAlpha(C.mark, (STYLE.dark ? 0.35 : 0.75) * p);   // 深色风格下降低不透明度
ctx.fillRect(x, y, w * easeOut(p), h);                                // 像荧光笔从左往右涂
text(str, cx, cy, { color: C.onMark });                               // 实心高亮底上的文字用 onMark
```

## 11. 镜头
```js
const CAMS = {
  attention(lt) { const k = easeInOut(prog(lt, 0.5, 2.6)); return { x: lerp(fx, W/2, k), y: lerp(690, H/2, k), z: lerp(1.5, 1, k) }; },  // 先特写再拉远
  outro(lt, S) { const { bx, by } = outroBot(lt, S); /* 跟随角色：往角色方向偏移一部分 */ },
};
```
- 镜头函数和场景函数要用同一个辅助函数算位置（比如 `outroBot`），否则跟随会错位。
- 推近幅度一般不超过 1.2；特写开场可以到 1.5–1.6，但要尽快拉开。
- 推近后，先检查画面边缘的元素会不会顶到左上角标题。

## 12. 角色沿台阶跳跃
依次处理每一级台阶：走到第 i 步时，位置从上一级插值到第 i 级，y 方向再减去 `sin(hp * π) * 60` 做出跳起的弧线。所有位置都从 lt 推算出来，不记录任何状态。

## 版面约定
- 左上角大约 80–700 × 60–170 留给标题，右上角 1560–1880 × 30–160 留给角标和章节小圆环，底部 y≈990–1050 留给字幕。
- 主要内容放在 y 200–900 之间。
- 吉祥物放在角落时 s 取 0.5–0.6，作为主角时取 0.8–1。
