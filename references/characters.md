# 角色与形象

- **形象（character）**：一个画出来的人物，比如 `bot` 机器人、`person` 人物、`cat` 小猫，或者你自己画的。
- **角色（role）**：故事里的一个位置，比如 `host` 主持人、`student` 学生。

场景代码里只写角色，谁来演由 `script.json` 的 `cast` 决定。换形象、改颜色都不用动场景代码。

## 在 script.json 里分配角色

```json
"cast": {
  "host": "bot",
  "student": { "character": "person", "colors": { "shirt": "#e76f51", "hair": "#6b3e26" }, "options": { "hair": "long", "glasses": true } },
  "pet": "cat"
}
```
- 值可以直接写形象名，也可以写成对象：`character` 是形象名，`colors` 覆盖颜色，`options` 覆盖形象自己的选项。
- 场景里也可以写 `"cast"`，只在这个场景生效，会合并到全局 cast 上。
- 临时换形象：预览时加 `?cast=host:cat`；截图和导出加 `--cast host=cat,student=person`。

## 在场景里画角色

```js
drawRole('host', x, y, scale, t, {
  mood: 'normal' | 'happy' | 'sad',   // 表情
  look: -1..1,                         // 眼睛朝向
  lookAt: { x, y },                    // 看向画面上的某个点（会覆盖 look）
  walk: true,                          // 走路（身体颠簸、摆腿）
  wave: true, point: true,             // 挥手 / 右手向右指
  talk: S.speaking(lt),                // 说话：旁白念着的时候嘴一张一合
  alpha, seed,                         // 透明度；seed 让多个角色的眨眼、摆动错开
  options: { ... },                    // 临时覆盖形象选项（比如这一幕戴上眼镜）
});
```
- (x, y) 是脚底位置。scale=1 时身高约 300px（机器人 300、人物 320、小猫 270）。
- `drawRole` 找不到这个角色时，如果恰好有同名的形象，就直接画那个形象；都没有就报错，并提示去 cast 里添加。

## 内置形象

| 名字 | 说明 | 可改的颜色 | 选项 |
|---|---|---|---|
| `bot` | 圆头机器人，屏幕脸，天线会晃 | ink, head, body, screen, eye, antenna, ok, bad, tear | — |
| `person` | 卡通小人，会脸红 | ink, skin, hair, shirt, pants, shoe, cheek, mouth, tear | `hair`: short / long / bun；`glasses`: true / false |
| `cat` | 胖乎乎的站立小猫，尾巴会摆 | ink, fur, belly, stripe, earIn, nose, eye, cheek, mouth, tear | — |

几种常见组合：
- 老师：`{ "character": "person", "colors": { "shirt": "#6d597a" }, "options": { "hair": "bun", "glasses": true } }`
- 学生：`{ "character": "person", "colors": { "shirt": "#e76f51" }, "options": { "hair": "long" } }`
- 黑猫：`{ "character": "cat", "colors": { "fur": "#3a3a3a", "belly": "#6a6a6a", "stripe": "#2a2a2a" } }`

## 自定义形象

在项目里新建 `characters/<name>.js`，并在 `index.html` 的自定义区域（`engine/load.js` 之后、`scenes.js` 之前）加上 `<script src="characters/<name>.js"></script>`。

```js
registerCharacter('owl', {
  height: 260,              // s=1 时大约多高，只用于参考
  shadowWidth: 60,          // 地面阴影的半宽
  colors: { ink: '#3b2a20', feather: '#8d6e63', belly: '#f5e6d3', eye: '#ffffff', beak: '#f2a65a' },
  options: { tufts: true },
  draw(o) {
    // o = { t, mood, look, walk, legSwing, bobY, wave, point, talk, seed, colors, options }
    // 局部坐标：脚底在 (0, 0)，往上是负 y。引擎已经做好移动、缩放、透明度、地面阴影和走路颠簸。
    const { t, mood, look, talk, seed, colors: K, options } = o;
    ctx.beginPath(); ctx.ellipse(0, -120, 70, 100, 0, 0, Math.PI * 2);
    ctx.fillStyle = K.feather; ctx.fill();
    ctx.strokeStyle = K.ink; ctx.lineWidth = 4; strokeInk();   // 用 strokeInk，线条才会跟着风格变
    // ... 眼睛（用 charBlink(t, seed) 眨眼）、嘴（talk && charMouthOpen(t, seed)）、翅膀（charLimb + charArmR(o)）
  },
});
```

写形象时可以用的辅助函数（在 `engine/characters.js` 里）：
| 函数 | 说明 |
|---|---|
| `charLimb(sx, sy, angle, len, width, fill, ink, endR, endFill)` | 画手臂或腿：带描边的粗线，末端可以加一个圆（手、爪子）。angle 为 0 表示垂直向下，正值偏向 +x |
| `charArmR(o, rest)`、`charArmL(o, rest)` | 根据 wave、point 和待机摆动算出手臂角度 |
| `charBlink(t, seed)` | 大约每 3.3 秒眨一次眼 |
| `charMouthOpen(t, seed)` | 说话时嘴巴的开合 |

要点：
- 所有描边都用 `strokeInk()`，形状用 `rr()`，暗部用 `hatchShade()`，这样形象在铅笔、毛笔、粉笔、发光等风格里都会自动换画法。
- 颜色全部从 `o.colors` 取，不要写死，否则用户没法通过 cast 换色。
- 必须是时间的纯函数：动作只由 `t` 和 `seed` 决定。
- 画完用 `node scripts/snap.mjs --cast host=<name>` 检查，最好在 paper、ink、neon 三种风格下各看一遍。
- 想做成内置形象：把文件放进 skill 的 `engine/characters/`，再加到 `engine/load.js` 的列表里。
