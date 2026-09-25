# 风格包

风格决定“怎么画”，场景决定“画什么”。风格包是一个 `registerStyle(name, def)` 调用，没写的字段会用默认值补上。

## 接口

```js
registerStyle('my-style', {
  dark: false,                         // 深色风格：星芒走发光路线；也可以用来判断文字颜色
  palette: {                           // 必须提供全部语义角色，含义见 primitives.md
    bg, surface, surfaceAlt, ink, sub, muted, neutral, ok, okDeep, bad, note, mark, onMark,
  },
  fonts: { body: '"LXGW WenKai", "PingFang SC", sans-serif', title: null /* 默认同 body */, mono: 'Menlo, monospace' },
  line: {
    wobble: 1.6,                       // 手绘抖动幅度（像素），0 表示干净利落
    mode: 'pencil',                    // 'pencil' | 'glow' | 'chalk' | 'clean'
    glowBlur: 16,                      // glow 模式的发光半径
    pencil: 'rgba(59, 42, 32, 0.3)',   // pencil 模式的重影颜色
  },                                   // mode 还可以是 'brush'：墨晕 + 主笔画 + 干笔飞白（水墨）
  shadow: 'hatch',                     // 'hatch' 排线 | 'soft' 柔和模糊 | 'hard' 清晰偏移 | 'none'
  hatch: { rgb: '59, 42, 32', spacing: 7 },   // 排线、柔和阴影、硬投影都用这个 rgb
  hardShadow: { alpha: 0.35, blur: 0 },       // shadow 为 'hard' 时的不透明度和模糊（剪纸 3，像素 0）
  pixelate: 0,                         // 大于 1 时整帧按 1/N 分辨率渲染后放大（像素风格用 3）；字幕和角标不受影响
  texture: { grain: 16, vignette: 'rgba(90, 60, 30, 0.13)' },  // grain 取 0-40；vignette 设为 null 表示不要暗角
  transition: 'wipe',                  // 默认转场，可选：wipe、erase、blot、slide、dissolve、fade、iris、zoom、glitch、split、shutter、portal、cut（iris 到 portal 见 motion.md）
  subtitle: { size: 36, color: null, plate: false },           // plate：字幕加半透明底板
  background(b, w, h, P, rand) {},     // 只画一次，缓存在离屏画布里；b 是离屏画布的 2D 上下文，P 是调色板
  ambient(c, t, P, info) {},           // 可选，每帧画的环境动画（光斑、浮尘、雾、云）；info = { seed, sceneIndex, t, lt }
  overlay(c, t, P) {},                 // 可选，每帧叠加在场景上面（在颗粒、暗角之前），比如扫描线、闪烁
});
```

## 背景分层与视差
每帧的背景由远到近分四层，镜头推近或平移时，越远的层动得越少，产生纵深：

| 层 | 来源 | 跟镜头移动的比例 |
|---|---|---|
| 底图 | `background`（静态缓存） | 0.12 |
| 环境层 | `ambient`（风格提供，每帧画） | 0.35 |
| 氛围层 | 场景的 `backdrop`（见 generative.md） | 0.6 |
| 内容 | 场景函数 | 1 |

写 `ambient` 的要求：
- 必须是 t 的纯函数；随机数用 `mulberry32(info.seed)`，这样每一幕的光斑、云、雾位置都不一样，同一幕每帧又完全一致。
- 透明度要低，不要抢内容；也不要画进右上角角标和底部字幕的区域。
- 每帧开销控制在 2ms 以内：模糊、渐变这类耗时的东西用 `sprite(key, w, h, draw)` 预先画成贴图缓存，每帧只 `drawImage`；柔和光斑直接用 `lightBlob(x, y, r, color, alpha)`。
- 镜头推近时各层会放大一点留出余量，画的范围覆盖 0..W、0..H 即可。

## 内置风格

| 名字 | 调色 | 线条 | 阴影 | 质感 | 转场 | 适合 |
|---|---|---|---|---|---|---|
| paper | 米色纸、深棕墨 | 抖动 1.6 + 铅笔重影 | 排线 | 颗粒 16 + 暖色暗角 | 斜线划过 | 默认，温暖的科普讲解 |
| blueprint | 深蓝、淡紫墨、荧光绿 | 抖动 1.6 + 发光 | 蓝色排线 | 颗粒 16 + 暗角 | 斜线划过 | 机器内部、原理、数据流 |
| chalk | 墨绿黑板、粉笔白 | 抖动 2.4 + 粉笔断续 | 白色排线 | 颗粒 24 + 暗角 | 黑板擦擦除 | 课堂、数学、推导 |
| neon | 近黑、霓虹粉青 | 干净 + 强发光 | 无 | 扫描线 + 暗角 | 斜线划过 | 科技、赛博、游戏 |
| minimal | 浅灰白、高饱和强调色 | 干净 | 柔和投影 | 无 | 淡入淡出 | 商务、数据、信息图 |
| pixel | PICO-8 深蓝 16 色 | 干净 | 硬投影 | 像素化 ×3 | 方块替换 | 游戏、复古、趣味科普 |
| ink | 宣纸、墨色、朱砂、青绿 | 抖动 2.0 + 毛笔 | 柔和 | 颗粒 10 + 暗角 | 墨迹晕开 | 国风、历史、文化 |
| papercut | 薄荷纸、奶油纸、珊瑚橙 | 抖动 0.6 | 硬投影（模糊 3） | 颗粒 8 | 纸片滑入 | 儿童、故事、温暖叙事 |
| isometric | 灰蓝底、柔和配色 | 干净 | 柔和 | 淡暗角 | 淡入淡出 | 架构、网络、城市、流程（配合 iso.js） |
| inked | 深紫夜色、奶油白字、金洋红青紫 | 干净 | 无 | 颗粒 14 + 暗角 + 星尘 | 钻进物体 | 插画短片、宇宙感的科普（配合 illustrate.js） |

## 新写一个风格的步骤

1. 复制最接近的内置风格到项目的 `styles/<name>.js`，改名字。
2. 先定调色板。检查几组对比：`ink` 对 `bg`、`ink` 对 `surface`、`onMark` 对 `mark`、`ok` 和 `bad` 对 `bg` 都要够清楚。深色风格设 `dark: true`。
3. 再定“手感”：wobble 的大小、线条模式、阴影方式，这三项最能决定风格的气质。
4. 背景只画一次，可以做得精细一些：条纹、网格、擦痕、渐变、辅助线。背景不跟镜头动，能形成一点视差感。
5. 需要每帧都变的效果（扫描线移动、光带、闪烁）放进 `overlay`，而且必须只由 t 决定。
6. 在 `index.html` 里、`scenes.js` 之前加上 `<script src="styles/<name>.js"></script>`。想把它变成内置风格，就放进 skill 的 `engine/styles/`，并在 `engine/load.js` 的列表里加上名字。
7. 用 `node scripts/snap.mjs --style <name> --at 0.9` 把现有场景全部换成新风格看一遍。所有场景都清楚可读，才算这个风格合格。

## 设计建议
- 同一部片子最多用两种风格交替，比如 paper 加 blueprint，并且让风格和内容对应（外部 / 内部、问题 / 原理）。风格太多会显得乱。
- 字体会影响排版宽度，但版面都是用 `measure` / `tokW` 动态算的，所以换字体不会挤爆布局。
- 想让字更有手写感，用霞鹜文楷（LXGW WenKai）；想要干净，用 PingFang SC。机器上没装的字体会回退到下一个。
- 快速上手：只改调色板和 `line`，就能得到一个明显不同的新风格。
- 背景里的装饰物（太阳、印章、山）不跟镜头动，而且不知道场景内容会放在哪里。所以只能放在边缘：顶部边缘、角落、底部 20% 以内，也不能太抢眼。
