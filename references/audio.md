# 声音：配音、背景音乐、音效

## 配音（scripts/tts.mjs）
- 每句话用 edge-tts 合成，同时拿到**逐词时间戳**，按“声音 + 语速 + 文本”缓存在 `build/tts/`。
- 句子从第一个词开始、到最后一个词结束来裁剪，首尾加很短的淡入淡出，所以词的时间和音频严格对齐。整条人声音轨统一到 -16 LUFS。
- `--dry`：离线模式，按字数估算时长和每个词的时间，音轨是静音，接口和真实配音完全一样。写画面阶段先用它；换成真实配音后，时长会有变化，要重新 snap 检查一遍。
- 场景里取词的时间：`S.word(i, '词')` 是开始时刻，`S.wordEnd(i, '词')` 是结束时刻；同一个词出现多次时，用第三个参数选第几次（从 0 开始）。

## 背景音乐与音效（scripts/audio.mjs，全部用代码合成，不需要下载素材）
| 音乐预设 | 感觉 |
|---|---|
| `calm` | 大调铺底 + 轻柔拨弦琶音，76 BPM，适合大多数科普 |
| `bright` | 更快更亮，带轻微的踩镲，100 BPM，适合轻快、产品类 |
| `deep` | 小调、慢速，64 BPM，适合悬念、深度话题 |

也可以写 `"music": "bgm.mp3"` 用自己的音乐文件，会循环铺满整片。

| 音效 | 适合 |
|---|---|
| `whoosh` | 转场、东西飞过（转场时会自动加上） |
| `pop` | 元素弹出、气泡出现 |
| `ding` | 提示、消息到达 |
| `success` | 答对、完成（上行三连音） |
| `error` | 出错、答错 |
| `click` | 点击、按键 |
| `type` | 打字、敲代码 |
| `swell` | 大字或关键画面登场前的上扬音 |
| `glitch` | 故障（glitch 转场会自动加上） |

在 scenes.js 里写：
```js
const SFX = {
  sceneId: (S) => [{ at: S.word(0, '错了'), sound: 'error' }, { at: S.L(1).e, sound: 'success', volume: 0.8 }],
};
```

## 混音（scripts/mix.mjs、export.mjs）
- 人声，加上音乐（用 sidechain 自动闪避：有人声时压低，停顿时回来），再加上所有音效，最后统一响度到 -16 LUFS（常见网络视频标准）。
- `node scripts/mix.mjs` 生成 `audio.wav`，预览页会优先播放它；导出时会自动重新混一遍。
- 音量：`musicVolume` 默认 0.16，`sfxVolume` 默认 0.35，单个音效还可以在 cue 里单独写 volume。音乐太吵就调低 musicVolume；如果人声清楚但音乐听不见，可以提到 0.2 到 0.25。
- 不想要：`"music": null` 关音乐，`"sfx": false` 关所有音效，`"transitionSfx": false` 只关转场的 whoosh。
