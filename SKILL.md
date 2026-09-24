---
name: canvas-video
description: 用纯代码（JS + Canvas2D）做讲解、科普类动画视频：一个 render(t) 函数画出每一帧，edge-tts 配音自动生成时间轴，puppeteer 逐帧导出成 mp4。风格包可以切换（paper 纸张手绘、blueprint 蓝图发光、chalk 黑板粉笔、neon 霓虹赛博、minimal 极简信息图、pixel 像素、ink 水墨、papercut 剪纸、isometric 等轴测），还带一组等轴测 3D 绘图函数，同一个故事可以一键换风格。以下情况都应使用本 skill：用户想用代码或 Canvas 画动画视频；提到“JS 绘制每一帧”“逐帧渲染”“render(t)”“程序化动画”；想做科普、讲解、知识类短视频并且接受扁平或手绘画风；想给现有视频换风格或新建风格；或者正在修改含有 script.json + scenes.js 的 canvas-video 项目。即使用户没提 Canvas，只要想要“像 X 上那种用 JS 画出来的讲解动画”，也用本 skill。如果用户点名要用 Canvas2D 或 canvas-video，本 skill 优先于 HyperFrames 这类基于 DOM 的视频框架。
---

# canvas-video：用代码画出每一帧

核心思路：**画面是时间的纯函数**。给 `render(t)` 一个时间 t，它把这一帧从零画出来；导出脚本从 t=0 开始一帧一帧调用，再交给 ffmpeg 合成视频。这样可以精确逐帧导出，预览时能任意拖动，改一句台词后画面会自动重新对齐。

## 三层结构：什么固定，什么可以换

| 层 | 文件 | 说明 |
|---|---|---|
| 引擎（固定） | `engine/core.js`、`mascot.js`、`iso.js`、`load.js`，以及 `scripts/*.mjs` | 绘图函数、场景调度、镜头、转场、质感叠加层、配音、导出。一般不要改 |
| 风格（可替换） | `engine/styles/*.js` | 调色板、字体、背景、线条处理、阴影、质感、转场、叠加层。怎么写见 `references/styles.md` |
| 内容（每个视频都不同） | `script.json`、`scenes.js` | 口播稿，以及每个场景怎么画 |

场景代码里只写语义颜色，比如 `C.ok` 表示正确、`C.bad` 表示错误、`C.mark` 表示高亮，不写死十六进制颜色。这样同一套场景代码可以用任何风格渲染。

## 工作流

下面的 `<skill>` 指本文件所在的目录（比如 `~/.claude/skills/canvas-video` 或 `~/.codex/skills/canvas-video`）。

```bash
# 1. 新建项目：复制引擎，安装 puppeteer-core 和 edge-tts（需要联网）
node <skill>/scripts/init.mjs my-video
#    想从完整示例改起，加 --example llm-reasoning 或 --example iso-city
#    skill 升级后，更新已有项目的引擎：node <skill>/scripts/init.mjs my-video --update-engine

# 2. 编辑 script.json（口播稿、风格）和 scenes.js（画面）

# 3. 生成时间轴。写画面阶段先用 --dry：离线估算每句时长，生成静音音轨，速度快
node scripts/tts.mjs --dry

# 4. 截图自查：每个场景出一张图，拼成 snaps/sheet.png。页面报错时退出码为 1
node scripts/snap.mjs            # 或指定时刻：snap.mjs 3.5 12；或每个场景取多个点：--at 0.3,0.9

# 5. 画面满意后，生成真实配音（按句缓存，改稿后只重新合成改动的句子）
node scripts/tts.mjs

# 6. 导出
node scripts/export.mjs          # → out.mp4
node scripts/export.mjs --style chalk   # 整片强制换成黑板风格 → out-chalk.mp4
```

预览：直接用浏览器打开 `index.html`，有播放、拖动条，还有风格下拉框可以切换；地址后加 `?t=12.5` 跳到指定时刻，加 `?style=neon` 强制换风格。

**每次改完 scenes.js 都要跑 snap.mjs，并且亲自看 sheet.png。** 很多问题只有看图才发现得了：文字重叠、深色风格下文字看不清、元素被镜头裁掉、动作和台词对不上。只看代码不报错是不够的。

## script.json

```json
{
  "voice": "zh-CN-YunxiNeural", "rate": "+8%", "fps": 30,
  "style": "paper", "brand": "My Channel", "hud": true,
  "scenes": [
    { "id": "intro", "title": "开场", "style": "blueprint", "lead": 0.8, "hold": 1.0, "lines": ["第一句。", "第二句。"] }
  ]
}
```
- `lead`：场景开始到第一句旁白之间的空白秒数。`hold`：最后一句说完后画面停留的秒数，给动画留收尾时间。
- 场景的 `style` 会覆盖全局 `style`。常见用法是“外部世界”用 paper，“机器内部”用 blueprint，两种交替。
- `brand` 是右上角的角标文字，设为 null 就不显示；`hud` 控制章节进度小圆环。
- 常用声音：云希 `zh-CN-YunxiNeural`（活泼男声）、晓晓 `zh-CN-XiaoxiaoNeural`（温暖女声）、云扬 `zh-CN-YunyangNeural`（新闻男声）。完整列表：`.venv/bin/edge-tts --list-voices`。
- edge-tts 需要联网，口播稿会发到微软的服务上合成。

## scenes.js 约定

```js
const SCENES = {
  intro(lt, S, t) {            // lt = 场景内秒数；t = 全局秒数（用于眨眼、摆动这类待机动作）
    const l0 = S.L(0);         // 第 0 句旁白在本场景里的 { s: 开始, e: 结束 }
    drawTag('标题', '副标题', prog(lt, 0.3, 1.4));
    const p = prog(lt, l0.s, l0.e);             // 0..1，跟着这句话的语速推进
    text(typed('逐字打出', p), 960, 540, { size: 56 });
    drawBot(400, 800, 1, t, { mood: p >= 1 ? 'happy' : 'normal' });
  },
};
const CAMS = { intro: (lt, S) => ({ x: 960, y: 540, z: 1 + 0.05 * prog(lt, 0, S.dur) }) };  // 可选
```
- 画布是 1920×1080。镜头变换只作用在场景内容上；`drawTag`、`drawProgress` 和其他用 `pinned()` 包起来的元素固定在屏幕上。
- 动作时间要挂在旁白上（`S.L(i).s` 或 `.e`），不要写死秒数，这样换声音、改语速以后依然对齐。
- 不能跨帧保存状态。模拟类内容用 `mulberry32(seed)` 预先算好历史，再按时间插值读取。
- 绘图函数的完整列表见 `references/primitives.md`，常见场景的写法见 `references/scene-patterns.md`。

## 风格

| 风格 | 感觉 | 转场 |
|---|---|---|
| `paper` | 米色条纹纸、铅笔抖动线、排线阴影、颗粒 | 斜线划过 |
| `blueprint` | 深蓝网格、发光线条、星芒 | 斜线划过 |
| `chalk` | 黑板、断续粉笔线、擦痕、木框 | 黑板擦擦除 |
| `neon` | 近黑底加透视网格、强发光、扫描线、字幕底板 | 斜线划过 |
| `minimal` | 浅灰白底、干净线条、柔和投影 | 淡入淡出 |
| `pixel` | PICO-8 16 色、整帧按 1/3 分辨率像素化、硬投影 | 方块逐格替换 |
| `ink` | 宣纸底、毛笔墨晕加飞白、远山、朱红印章 | 墨迹晕开 |
| `papercut` | 分层彩纸、剪刀边缘、硬投影、纸山 | 新的一层纸滑上来 |
| `isometric` | 柔和配色加 30° 斜网格，适合配合等轴测绘图函数 | 淡入淡出 |

**等轴测不只是换个风格**：平面场景换成 `isometric` 风格后仍然是平面的。要画立体效果，得在场景里用 `engine/iso.js` 提供的 `isoBox`、`isoRoof`、`isoTile`、`isoPath` 等函数，画的时候按 x + y 从小到大排序。参考 `examples/iso-city`。

想新建一种风格，读 `references/styles.md`，在项目里加 `styles/<name>.js`，再在 `index.html` 里加一个 `<script>` 引用即可。

## 必读的坑

动手前先扫一眼 `references/pitfalls.md`。最常见的几个：
- `easeOutBack(0)` 已经修正为精确返回 0，自己写缓动函数时也要注意浮点误差，否则 `> 0` 的判断会提前触发。
- 深色风格下，高亮底上的文字要用 `C.onMark`，不能用 `C.ink`。
- 镜头推近会裁掉画面边缘的内容，标题和仪表类元素要用 pinned 固定在屏幕上。
- 颗粒、发光、排线、毛笔墨晕会让导出变慢，60 秒大约 3 分钟。调画面时用 snap，不要反复整片导出。

## 示例

- `examples/llm-reasoning/`：63 秒的完整作品，讲“大模型是怎么推理出答案的”，一共 8 个场景：token、注意力、概率柱状图、思维链、推理分支模拟等，paper 和 blueprint 交替使用。
- `examples/iso-city/`：15 秒的等轴测短片。服务器依次升起，数据包在服务器之间流动，一次请求从电脑经过路由器到服务器，再原路返回。

写新场景前，先在这里找相似的写法。
