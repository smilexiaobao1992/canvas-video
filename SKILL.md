---
name: canvas-video
description: 用纯代码（JS + Canvas2D）做讲解、科普类动画视频。一个 render(t) 函数画出每一帧；edge-tts 配音，带逐词时间戳，自动生成时间轴；自动加代码合成的背景音乐和音效；多个 Chrome 并行，用 WebCodecs 硬件编码导出 mp4。支持横屏 16:9、竖屏 9:16、方屏 1:1。内置 10 种可切换风格（paper 纸张手绘、blueprint 蓝图发光、chalk 黑板粉笔、neon 霓虹赛博、minimal 极简信息图、pixel 像素、ink 水墨、papercut 剪纸、isometric 等轴测、inked 插画描边）；插画画法（粗描边、平涂、排线，能画任何主体）；动效库（弹簧、粒子聚字、形状变形、乱码解码、震屏、彩带）；生成式效果（粒子神经网络、噪声流场、烟雾、火花、雪、数据喷发、鸟群、递归生长树、3D 点云、梯度下降小球）；组件库（图表、代码块、终端、AI 对话界面、流程图、时间轴、对比表、图标）；可替换角色（机器人、人物、小猫，或自己用代码画的）。以下情况都应使用本 skill：用户想用代码或 Canvas 画动画视频；提到“JS 绘制每一帧”“逐帧渲染”“render(t)”“程序化动画”；想做科普、讲解、知识类短视频（包括抖音、小红书竖屏）并接受扁平或手绘画风；想给现有视频换风格、换角色；或者正在修改含有 script.json + scenes.js 的 canvas-video 项目。即使用户没提 Canvas，只要想要“像 X 上那种用 JS 画出来的讲解动画”，也用本 skill。如果用户点名要用 Canvas2D 或 canvas-video，本 skill 优先于 HyperFrames 这类基于 DOM 的视频框架。
---

# canvas-video：用代码画出每一帧

核心思路：**画面是时间的纯函数**。给 `render(t)` 一个时间 t，它把这一帧从零画出来；导出时从 t=0 开始逐帧调用，编码成视频，再混入配音、音乐和音效。这样可以精确逐帧导出，预览时能任意拖动，改一句台词后画面和声音都会自动重新对齐。

## 分层：什么固定，什么可以换

| 层 | 文件 | 说明 |
|---|---|---|
| 引擎（固定） | `engine/core.js`、`motion.js`、`generative.js`、`components.js`、`characters.js`、`iso.js`、`load.js`，以及 `scripts/*` | 绘图函数、动效、组件、场景调度、镜头、转场、字幕、配音、混音、导出。一般不要改 |
| 风格（可替换） | `engine/styles/*.js` | 调色板、字体、背景、线条、阴影、质感、默认转场。见 `references/styles.md` |
| 形象（可替换） | `engine/characters/*.js` | 角色的长相和动作。见 `references/characters.md` |
| 内容（每个视频都不同） | `script.json`、`scenes.js` | 口播稿，以及每个场景怎么画 |

场景代码里只写语义颜色（`C.ok` 正确、`C.bad` 错误、`C.note` 注释、`C.mark` 高亮……），不写死十六进制颜色，这样同一套代码可以用任何风格渲染。

## 工作流

下面的 `<skill>` 指本文件所在的目录（比如 `~/.claude/skills/canvas-video` 或 `~/.codex/skills/canvas-video`）。

```bash
# 1. 新建项目：复制引擎；安装 puppeteer-core、霞鹜文楷网页字体和 edge-tts（需要联网）
node <skill>/scripts/init.mjs my-video               # 竖屏加 --format 9:16
#    从示例改起：--example components（组件和动效大全）| llm-reasoning（63 秒完整作品）| iso-city（等轴测）| token-journey（插画短片）
#    skill 升级后，更新已有项目：node <skill>/scripts/init.mjs my-video --update-engine
cd my-video

# 2. 写 script.json（口播稿、画面比例、风格、角色、音频）和 scenes.js（画面）

# 3. 生成时间轴。写画面阶段先用 --dry：离线估算时长和逐词时间，生成静音音轨，速度快
node scripts/tts.mjs --dry

# 4. 截图自查：每个场景出一张图，拼成 snaps/sheet.png；页面报错或画面不是纯函数时，退出码为 1
node scripts/snap.mjs                 # 或指定时刻：snap.mjs 3.5 12；或每个场景取多个点：--at 0.3,0.9

# 5. 画面满意后，生成真实配音（按句缓存）
node scripts/tts.mjs
node scripts/mix.mjs                  # 可选：生成 audio.wav，预览页就能听到人声、音乐和音效混在一起的效果

# 6. 导出（63 秒的视频约 13 秒导完）
node scripts/export.mjs                     # → out.mp4
node scripts/export.mjs --style chalk       # 整片换成黑板风格
node scripts/export.mjs --cast host=cat     # 主持人换成小猫
node scripts/export.mjs --draft             # 15fps 草稿，最快
#   其他参数：--workers N（默认 min(6, 核数-2)）、--bitrate 30（Mbps，默认 20）、--out 文件名
```

预览：浏览器打开 `index.html`，可以播放、拖动、切换风格；地址后加 `?t=12.5` 跳到指定时刻，`?style=neon` 换风格，`?cast=host:cat` 换角色。

**每次改完 scenes.js 都要跑 snap.mjs，并亲自看 sheet.png。** 总览图是缩小的；细节（文字挤在一起、箭头穿过文字）要打开同目录下的全尺寸 PNG（`snaps/00-<场景>@<时间>.png`）才看得清。 文字重叠、深色风格下看不清、元素被镜头裁掉、动作和台词对不上，这些只有看图才发现得了。

## script.json

```json
{
  "voice": "zh-CN-YunxiNeural", "rate": "+8%", "fps": 30,
  "format": "16:9",
  "style": "paper", "brand": null, "hud": true,
  "cast": { "host": "bot", "student": { "character": "person", "options": { "hair": "long" } } },
  "subtitles": { "highlight": true },
  "audio": { "music": "calm", "musicVolume": 0.16, "sfx": true, "sfxVolume": 0.35 },
  "scenes": [
    { "id": "intro", "title": "开场", "style": "blueprint", "transition": "iris", "lead": 0.8, "hold": 1.0,
      "lines": ["第一句。", "第二句。"] }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `format` | `16:9` 横屏 1920×1080（默认）、`9:16` 竖屏 1080×1920、`1:1` 方屏 1080×1080 |
| `lead` / `hold` | 场景开始到第一句之间的留白 / 最后一句说完后画面停留的秒数（给收尾动画留时间） |
| `style` / `transition` | 场景级设置会覆盖全局；转场还可以用 `transitionDuration` 调时长（默认 0.6 秒） |
| `backdrop` | 场景氛围：`network`、`flow`、`particles`、`spotlight`、`gradient`、`rings`，天空类 `space`、`sunset`、`dusk`、`dawn`，或 `none`（默认）；也可以用 `registerBackdrop` 自己写。全局写一个，场景可以单独覆盖，配合 `backdropOpacity`。见 `references/generative.md` |
| `transitionFocus` | 转场用 `portal` 时，镜头钻进上一幕的哪个点 `[x, y]` |
| `cast` | 把角色分配给形象，场景也可以写自己的 `cast` |
| `subtitles.highlight` | 字幕逐字高亮：念过的字变深，没念到的字是浅色 |
| `audio.music` | `calm`（舒缓）/ `bright`（明快）/ `deep`（深沉）/ 你自己的音乐文件路径 / `null` 不要音乐。有人声时音乐会自动压低 |
| `audio.sfx` | 是否开启音效。每次转场自动配一声 whoosh（`transitionSfx: false` 可以关掉）；其余音效在 scenes.js 的 `SFX` 里指定 |
| `brand` / `hud` | 右上角角标文字（默认 null，不显示）/ 章节进度小圆环 |

常用声音：云希 `zh-CN-YunxiNeural`（活泼男声）、晓晓 `zh-CN-XiaoxiaoNeural`（温暖女声）、云扬 `zh-CN-YunyangNeural`（新闻男声）。完整列表：`.venv/bin/edge-tts --list-voices`。edge-tts 需要联网，口播稿会发到微软的服务上合成。

## scenes.js

```js
const SCENES = {
  intro(lt, S, t) {            // lt = 场景内秒数；t = 全局秒数（用于眨眼、摆动这类待机动作）
    drawTag('标题', '副标题', prog(lt, 0.3, 1.4));
    // 动作挂在旁白的具体词上：念到“智能体”这三个字时，标题逐字弹进来
    textReveal('智能体', W / 2, SAFE.y0 + 120, lt - S.word(0, '智能体'), { mode: 'bounce', size: 120 });
    const p = prog(lt, S.L(1).s, S.L(1).e);        // 跟着第 1 句的语速推进，0..1
    particleText('AGENT', W / 2, H / 2, p, { size: 160 });
    drawRole('host', SAFE.x0 + 160, SAFE.y1, 1, t, { mood: p >= 1 ? 'happy' : 'normal', talk: S.speaking(lt) });
  },
};
const CAMS = { intro: (lt, S) => ({ x: W / 2, y: H / 2, z: punchIn(lt, S.word(0, '智能体'), 0.06) }) };  // 可选
const SFX = { intro: (S) => [{ at: S.word(0, '智能体'), sound: 'pop' }] };                               // 可选
```

- **画布**：`W × H` 由 `format` 决定。重要内容放在 `SAFE`（`{x0, y0, x1, y1}`）里面，它已经给标题、字幕和竖屏平台的界面留出了位置。画面位置都用 `W`、`H`、`SAFE` 来算，同一套场景就能适配不同比例。
- **时间**：
  - `S.L(i)`：本场景第 i 句（从 0 开始，按场景内编号）的 `{s, e}`，时间相对本场景开头
  - `S.word(i, '词')` / `S.wordEnd(i, '词')`：这个词在第 i 句里开始 / 结束说的时刻。按字匹配，配音把词切成“智能 / 体动手”这样也能找到“动手”
  - `S.speaking(lt)`：旁白正在念时为 true
  - 动作要挂在这些时间上，不要写死秒数，否则换声音或改语速后会对不上。
- **纯函数**：不能跨帧保存状态；模拟类内容用 `mulberry32(seed)` 预先算好，再按时间插值读取。snap 会自动检查这一点。
- **镜头**：`CAMS[id]` 返回 `{x, y, z}`，用 `shake()` 震屏、`punchIn()` 快速推近。`drawTag`、`drawProgress` 和用 `pinned()` 包起来的内容不受镜头影响。
- **音效**：`SFX[id](S)` 返回 `[{ at, sound, volume }]`。可用的声音有：`whoosh`、`pop`、`ding`、`success`、`error`、`click`、`type`、`swell`、`glitch`。

完整 API：`references/primitives.md`（基础）、`references/motion.md`（动效）、`references/generative.md`（生成式效果）、`references/illustrate.md`（插画主体）、`references/components.md`（组件）、`references/audio.md`（声音）。

## 创作交给你

这个 skill 只负责技术：引擎、风格、动效、组件、插画画法，以及配音、对齐、导出。视频讲什么、画什么、用什么节奏和结构，都由你按主题自己决定，下面列的只是工具，不是套路。示例和用户给的参考视频，用来看技法和代码怎么写，画面内容还是自己想。

工具箱（按需取用，也可以都不用，找不到合适的就用基础绘图函数自己画）：

- 动效（`references/motion.md`）：变形 `morphPath`、粒子聚字 `particleText`、弹簧和错开 `spring` / `stagger`、文字特效 `textReveal`、沿路径运动 `followPath`、强调 `burst` / `ripple` / `circleMark` / `highlighter`、镜头 `punchIn` / `shake`、速度线 `speedLines`。
- 转场：`wipe`、`erase`、`blot`、`slide`、`dissolve`、`fade`、`iris`、`zoom`、`glitch`、`split`、`shutter`、`portal`（钻进上一幕的某个点）、`cut`。
- 组件（`references/components.md`）：图表、代码块、终端、AI 对话界面、流程图、时间轴、对比表、图标。
- 生成式效果（`references/generative.md`）：粒子网络、噪声流场、粒子发射器、鸟群、递归树、3D 点云、物理轨迹，以及场景氛围 `backdrop`。
- 插画画法（`references/illustrate.md`）：`inkShape` 描边、平涂、排线、暗部阴影，可以画任何主体；库里另附几个示范主体。
- 声音：音效列表见下文 `SFX`，音乐和混音见 `references/audio.md`。

技术上的一个提示：动作和音效可以用 `S.word` 卡在台词的具体词上，换声音或改语速后依然对齐。

**看图自查时留意**：文字要看得清（横屏 26px 以下、竖屏 32px 以下通常就太小了）；主要内容放在 `SAFE` 里，不被标题、字幕、镜头裁掉；画面上同时要看的东西不要太多，信息多时可以分批出现或者拆成两幕。

## 角色

场景里只写角色名，比如 `drawRole('host', …)`，谁来演由 `cast` 决定。内置形象有 `bot`（机器人）、`person`（人物：发型、眼镜、各部位颜色都能改）、`cat`（小猫），都支持表情、眼神、走路、挥手、指向、说话。想要新形象，写 `characters/<name>.js` 调用 `registerCharacter`，见 `references/characters.md`。

## 风格

| 风格 | 感觉 | 默认转场 |
|---|---|---|
| `paper` | 米色条纹纸、铅笔抖动线、排线阴影、颗粒 | wipe 斜线划过 |
| `blueprint` | 深蓝网格、发光线条、星芒 | wipe |
| `chalk` | 黑板、断续粉笔线、擦痕、木框 | erase 黑板擦 |
| `neon` | 近黑底加透视网格、强发光、扫描线、字幕底板 | wipe |
| `minimal` | 浅灰白底、干净线条、柔和投影 | fade |
| `pixel` | PICO-8 16 色、整帧像素化、硬投影 | dissolve 方块替换 |
| `ink` | 宣纸、毛笔墨晕、远山、朱红印章 | blot 墨迹晕开 |
| `papercut` | 分层彩纸、硬投影、纸山 | slide 纸片滑入 |
| `isometric` | 柔和配色、30° 斜网格，配合 `iso.js` 画立体 | fade |
| `inked` | 深紫夜色底、粗描边插画、排线纹理、星尘，配合 `illustrate.js` | portal |

风格可以整片统一，也可以随内容切换（比如“外部世界”用 paper，“机器内部”用 blueprint），自己把握；切换太频繁容易显得乱。等轴测需要在场景里用 `isoBox` 等函数专门画，参考 `examples/iso-city`。

## 必读的坑

动手前先扫一眼 `references/pitfalls.md`。最常见的几个：
- 深色风格下，高亮底上的文字要用 `C.onMark`；图形和大字都放在 `SAFE` 里面。
- 竖屏时字幕在画面下方大约 84% 的高度，`SAFE.y1` 约为 70% 的高度，角色放在 `SAFE.y1` 附近。如果风格背景底部已经有地形（papercut 的纸山、ink 的远山、pixel 的山），就不要再画 `drawGround`，免得多出一条浮在空中的线。
- `--dry` 估算的时长和真实配音大约有 ±10% 的误差，控制总时长要以真实配音为准。
- 调画面时用 snap 和 `--draft`，不要反复整片导出。

## 改引擎之后

改了 `engine/`、`scripts/`、`templates/` 或 `examples/`，都要运行 `node <skill>/scripts/selftest.mjs`。它会覆盖所有示例（加上竖屏模板），在每种风格、每个形象下截图，做纯函数检查，和 `tests/golden/` 里的基准图比较，再混音并用草稿模式完整导出一遍。如果画面变化是有意的，用 `--update-golden` 更新基准图。

## 示例

示例用来看代码怎么写、技法怎么实现；它们的具体画面是那一个视频的选择，新视频的画面要自己想。

- `examples/components/`：组件和动效大全，一个场景演示一类，每一幕的转场都不同。
- `examples/llm-reasoning/`：63 秒的完整作品，讲“大模型是怎么推理出答案的”，paper 和 blueprint 交替使用。
- `examples/iso-city/`：15 秒的等轴测短片。
- `examples/token-journey/`：50 秒、14 镜的插画短片，inked 风格。可以看插画画法、一句一镜的快节奏、用 `portal` 钻进主角来衔接镜头这些技法怎么写。
