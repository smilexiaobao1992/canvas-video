# canvas-video

用纯代码做讲解、科普类动画视频的 Agent Skill。

核心思路：**画面是时间的纯函数**。一个 `render(t)` 函数给定时间 t，就把这一帧从零画出来；配音由 edge-tts 自动生成并排好时间轴；puppeteer 驱动无头 Chrome 一帧一帧画，ffmpeg 把帧和配音合成 mp4。

- 没有任何图片素材，所有画面都是 Canvas2D 画出来的
- 改一句台词，画面自动重新对齐
- 同一套场景代码，一行参数就能换成 9 种风格中的任意一种；横屏、竖屏、方屏都支持
- 动效库和组件库：弹簧、粒子聚字、形状变形、乱码解码、震屏；图表、代码块、终端、AI 对话界面、流程图、图标
- 生成式效果（参考 p5.js 示例，改写成纯函数）：粒子神经网络、Perlin 噪声流场、粒子发射器（烟、火花、雪、雨、气泡、数据喷发）、鸟群、递归生长树、轻量 3D 点云、物理轨迹（梯度下降小球、弹跳）
- 声音：配音带逐词时间戳，画面和音效可以卡在具体的词上；背景音乐和音效都用代码合成，有人声时音乐自动压低；字幕逐字高亮
- 角色可替换、可自定义：内置机器人、人物、小猫，场景里只写角色名，由 `cast` 决定谁来演
- 背景有层次：风格自带缓慢流动的环境层（光斑、雾、云、浮尘），每一幕可以换不同的氛围（神经网络、流场、光点、聚光、太空、日落、黄昏、黎明……），镜头推近时各层有视差
- 带镜头运动、转场（包括钻进某个物体的 portal）、字幕、章节进度提示
- 导出很快：多个 Chrome 并行渲染，浏览器内硬件编码，63 秒的视频约 13 秒导完

## 风格

| 风格 | 感觉 | 转场 |
|---|---|---|
| `paper` | 米色条纹纸、铅笔抖动线、排线阴影、颗粒 | 斜线划过 |
| `blueprint` | 深蓝网格、发光线条、星芒 | 斜线划过 |
| `chalk` | 黑板、断续粉笔线、擦痕、木框 | 黑板擦擦除 |
| `neon` | 近黑底加透视网格、强发光、扫描线 | 斜线划过 |
| `minimal` | 浅灰白底、干净线条、柔和投影 | 淡入淡出 |
| `pixel` | PICO-8 16 色，整帧像素化 | 方块逐格替换 |
| `ink` | 宣纸、毛笔墨晕、远山、朱红印章 | 墨迹晕开 |
| `papercut` | 分层彩纸、硬投影、纸山 | 纸片滑入 |
| `isometric` | 柔和配色加 30° 斜网格 | 淡入淡出 |

## 角色

```json
"cast": {
  "host": "bot",
  "student": { "character": "person", "colors": { "shirt": "#e76f51" }, "options": { "hair": "long", "glasses": true } }
}
```

| 形象 | 说明 |
|---|---|
| `bot` | 圆头机器人，屏幕脸 |
| `person` | 卡通小人，发型（short / long / bun）、眼镜、肤色和衣服颜色都能改 |
| `cat` | 站立的卡通小猫，尾巴会摆 |

三个形象都支持表情、眼神、走路、挥手、指向、说话（跟着旁白动嘴），也都会跟着风格变画法。自定义形象：写一个 `registerCharacter(...)` 文件就行，见 `references/characters.md`。导出时可以临时换人：`--cast host=cat`。

## 动效、组件与声音

见 `references/motion.md`、`references/generative.md`、`references/components.md`、`references/audio.md`。`examples/components` 用一个场景演示一类效果，是最快的上手方式。

## 等轴测

另外还有一组等轴测绘图函数（`engine/iso.js`：立体方块、屋顶、地面格子、路径），用来画立体的小城、机房、流程。

## 依赖

- Node.js 18 以上
- Python 3（用来安装 edge-tts）
- ffmpeg
- Google Chrome 或 Chromium：会自动查找 macOS、Linux、Windows 上的常见安装位置，也可以用环境变量 `CHROME_PATH` 指定
- 字体：`init` 会通过 npm 安装霞鹜文楷网页字体（lxgw-wenkai-webfont），每台机器渲染结果一致

edge-tts 需要联网，口播稿会发到微软的语音服务上合成。

## 安装

这个仓库本身就是一个 skill 目录（根目录下有 `SKILL.md`），克隆或软链接到 agent 读取 skill 的目录即可。

**Claude Code**
```bash
git clone git@github.com:smilexiaobao1992/canvas-video.git ~/projects/canvas-video
ln -s ~/projects/canvas-video ~/.claude/skills/canvas-video
```
之后对 Claude 说“用 canvas-video 做一个讲 XX 的科普视频”，或者直接输入 `/canvas-video`。

**Codex 及其他支持 Agent Skills（SKILL.md）格式的 agent**

把同一个目录链接到对应 agent 的 skills 目录，比如 Codex 是 `~/.codex/skills/`：
```bash
ln -s ~/projects/canvas-video ~/.codex/skills/canvas-video
```
Codex 上已经实测跑通（做出了一个 20 秒的视频）。需要注意：Codex 的沙箱里启动不了 Chrome，截图、混音、导出这几步要批准它在沙箱外执行；初始化和配音需要联网。

**不支持 skills 的 agent**

在项目的 `AGENTS.md`（或该 agent 读取的说明文件）里加一句：“做代码动画视频时，先读 `~/projects/canvas-video/SKILL.md`，按里面的流程来。”

引擎是纯 JS 和 Node 脚本，不依赖任何特定的 agent，也可以不用 agent，自己手动按下面的流程使用。

## 手动使用

```bash
SKILL=~/projects/canvas-video

# 新建项目（会安装 puppeteer-core，并在项目里建 Python 虚拟环境装 edge-tts）
node $SKILL/scripts/init.mjs my-video --example components
cd my-video

node scripts/tts.mjs --dry     # 离线估算时长，先调画面
node scripts/snap.mjs          # 每个场景截一张图，拼成 snaps/sheet.png
node scripts/tts.mjs           # 生成真实配音（带逐词时间戳）
node scripts/mix.mjs           # 混合人声、音乐和音效，生成 audio.wav，供预览页播放
node scripts/export.mjs        # 导出 out.mp4
node scripts/export.mjs --style ink   # 整片换成水墨风格，导出 out-ink.mp4
node scripts/export.mjs --cast host=person   # 主持人换成人物
node scripts/export.mjs --draft       # 草稿：15fps 低码率，几秒出片
```

预览：用浏览器打开 `index.html`，可以播放、拖动，还能从下拉框切换风格。

skill 升级后，更新已有项目的引擎：
```bash
node $SKILL/scripts/init.mjs my-video --update-engine
```

## 项目结构

一个视频项目只有两个文件需要自己写：

- `script.json`：口播稿（按场景分句）、声音、风格、角标文字
- `scenes.js`：每个场景一个函数 `(lt, S, t) => void`，用引擎提供的绘图函数和语义颜色（`C.ok`、`C.bad`、`C.mark`…）来画

## 仓库结构

```
SKILL.md                 给 agent 的主说明：工作流、约定、检查清单
engine/
  core.js                绘图函数、场景调度、镜头、转场、质感、预览和导出接口
  characters.js          角色和 cast
  characters/*.js        3 个内置形象
  motion.js              动效库
  generative.js          生成式效果（噪声、粒子、群集、树、3D、物理）
  components.js          组件库
  iso.js                 等轴测绘图函数
  load.js                按顺序加载引擎、内置形象和全部内置风格
  styles/*.js            9 个风格包
scripts/
  init.mjs               新建项目 / 更新引擎
  lib.mjs                公共函数：查找 Chrome、启动浏览器、读取时间轴
  tts.mjs, edge_words.py 配音 + 逐词时间戳 + 时间轴（支持 --dry）
  audio.mjs, mix.mjs     代码合成音乐和音效，负责混音
  snap.mjs               截图拼成总览图，页面报错时失败退出
  export.mjs             并行渲染 + WebCodecs 编码导出 mp4（--style / --cast / --draft / --workers）
  selftest.mjs           引擎自检：所有示例 + 竖屏模板，覆盖所有风格和形象，加基准图对比、混音和导出
tests/golden/            基准图（webp 缩略图）
templates/               新项目模板
examples/
  components/            组件与动效大全
  llm-reasoning/         63 秒：大模型是怎么推理出答案的
  iso-city/              15 秒：等轴测数据城市
references/              API、动效、组件、声音、风格接口、角色接口、场景写法、踩过的坑
```

## 扩展

- **新风格**：按 `references/styles.md` 写一个 `registerStyle(...)`，放进 `engine/styles/`，再在 `engine/load.js` 的列表里加上名字。
- **新形象**：按 `references/characters.md` 写一个 `registerCharacter(...)`。
- **新的场景写法**：先看 `references/scene-patterns.md`，以及 `examples/` 里的代码。
- 改完引擎运行 `node scripts/selftest.mjs`，全部通过再提交。
