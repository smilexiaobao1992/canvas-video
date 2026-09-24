# canvas-video

用纯代码做讲解、科普类动画视频的 Agent Skill。

核心思路：**画面是时间的纯函数**。一个 `render(t)` 函数给定时间 t，就把这一帧从零画出来；配音由 edge-tts 自动生成并排好时间轴；puppeteer 驱动无头 Chrome 一帧一帧画，ffmpeg 把帧和配音合成 mp4。

- 没有任何图片素材，所有画面都是 Canvas2D 画出来的
- 改一句台词，画面自动重新对齐
- 同一套场景代码，一行参数就能换成 9 种风格中的任意一种
- 带吉祥物、镜头运动、转场、字幕、章节进度提示

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

另外还有一组等轴测绘图函数（`engine/iso.js`：立体方块、屋顶、地面格子、路径），用来画立体的小城、机房、流程。

## 依赖

- Node.js 18 以上
- Python 3（用来安装 edge-tts）
- ffmpeg
- Google Chrome。默认路径是 `/Applications/Google Chrome.app`，装在别处时用环境变量 `CHROME_PATH` 指定
- 建议安装[霞鹜文楷](https://github.com/lxgw/LxgwWenKai)字体。paper、blueprint、chalk、ink、papercut 这几种风格用它，没装时会回退到苹方

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
（Codex 上还没有实测过。）

**不支持 skills 的 agent**

在项目的 `AGENTS.md`（或该 agent 读取的说明文件）里加一句：“做代码动画视频时，先读 `~/projects/canvas-video/SKILL.md`，按里面的流程来。”

引擎是纯 JS 和 Node 脚本，不依赖任何特定的 agent，也可以不用 agent，自己手动按下面的流程使用。

## 手动使用

```bash
SKILL=~/projects/canvas-video

# 新建项目（会安装 puppeteer-core，并在项目里建 Python 虚拟环境装 edge-tts）
node $SKILL/scripts/init.mjs my-video --example llm-reasoning
cd my-video

node scripts/tts.mjs --dry     # 离线估算时长，先调画面
node scripts/snap.mjs          # 每个场景截一张图，拼成 snaps/sheet.png
node scripts/tts.mjs           # 生成真实配音
node scripts/export.mjs        # 导出 out.mp4
node scripts/export.mjs --style ink   # 整片换成水墨风格，导出 out-ink.mp4
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
  mascot.js              吉祥物
  iso.js                 等轴测绘图函数
  load.js                按顺序加载引擎和全部内置风格
  styles/*.js            9 个风格包
scripts/
  init.mjs               新建项目 / 更新引擎
  tts.mjs                配音 + 时间轴（支持 --dry）
  snap.mjs               截图拼成总览图，页面报错时失败退出
  export.mjs             逐帧导出 mp4（支持 --style）
templates/               新项目模板
examples/
  llm-reasoning/         63 秒：大模型是怎么推理出答案的
  iso-city/              15 秒：等轴测数据城市
references/              API、风格接口、场景写法、踩过的坑
```

## 扩展

- **新风格**：按 `references/styles.md` 写一个 `registerStyle(...)`，放进 `engine/styles/`，再在 `engine/load.js` 的列表里加上名字。
- **新的场景写法**：先看 `references/scene-patterns.md`，以及 `examples/` 里的代码。
