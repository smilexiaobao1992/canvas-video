// Voiceover + timeline: synthesize each narration line with edge-tts (with word boundaries), trim it to the
// spoken part, lay lines out on a timeline, and write timeline.js (loaded by index.html) + voice.wav.
// Usage: node scripts/tts.mjs          real voice via edge-tts (online, cached per line)
//        node scripts/tts.mjs --dry    offline: estimate durations and word timings, silent voice.wav
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { venvBin } from './lib.mjs';

const DRY = process.argv.includes('--dry');
const LINE_GAP = 0.35;
const LAG = 0.09; // edge-tts word offsets run ~90ms ahead of the mp3 audio (encoder delay)
const FORMATS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080] };
const script = JSON.parse(readFileSync('script.json', 'utf8'));
const voice = script.voice || 'zh-CN-YunxiNeural';
const rate = script.rate || '+0%';
const format = script.format || '16:9';
if (!FORMATS[format]) throw new Error(`unknown format "${format}"; use one of ${Object.keys(FORMATS).join(', ')}`);
mkdirSync('build/tts', { recursive: true });

const probe = (file) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

// edge-tts talks to an online service; retry transient network failures
function synth(text, mp3, json) {
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync(venvBin('python'), ['scripts/edge_words.py', voice, rate, text, mp3, json], { stdio: ['ignore', 'ignore', 'pipe'] });
      return;
    } catch (e) {
      if (attempt >= 3) throw new Error(`edge-tts failed 3 times for "${text}":\n${e.stderr || e.message}`);
      console.log(`  retry ${attempt}: ${text}`);
    }
  }
}

// --dry: speaking time from text (edge-tts Chinese voices ~4.9 chars/s at +0%, scaled by `rate`; pauses at punctuation)
const SPEED = 1 + (parseFloat(rate) || 0) / 100;
function estimate(text) {
  const units = text.match(/[A-Za-z0-9]+|[㐀-鿿]|[，。！？；：,.!?;:]/g) || [];
  const words = [];
  let t = 0;
  for (const u of units) {
    if (/^[，。！？；：,.!?;:]$/.test(u)) { t += (/[，,；;：:]/.test(u) ? 0.12 : 0.22) / SPEED; continue; }
    const d = (/[㐀-鿿]/.test(u) ? 1 / 4.9 : 1 / 3.0) / SPEED;
    words.push({ text: u, s: +t.toFixed(3), e: +(t + d).toFixed(3) });
    t += d;
  }
  return { dur: Math.max(0.8, words.length ? words[words.length - 1].e : 0.8), words };
}

const lines = [];
const scenes = [];
let cursor = 0;
let n = 0;

for (const scene of script.scenes) {
  const sceneStart = cursor;
  let t = sceneStart + (scene.lead ?? 0.5);
  for (const text of scene.lines) {
    let dur, words, file = null;
    if (DRY) ({ dur, words } = estimate(text));
    else {
      // cache by voice + rate + text so unchanged lines are not re-synthesized
      const key = createHash('md5').update(`w1|${voice}|${rate}|${text}`).digest('hex').slice(0, 12);
      const base = `build/tts/${key}`;
      if (!existsSync(`${base}.json`)) synth(text, `${base}.mp3`, `${base}.json`);
      const raw = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
      // cut from just before the first word to just after the last one; short fades so the cuts never click
      const start = Math.max(0, raw[0].offset + LAG - 0.05);
      const last = raw[raw.length - 1];
      const end = Math.min(probe(`${base}.mp3`), last.offset + last.duration + LAG + 0.03);
      if (!existsSync(`${base}.t2.wav`)) {
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${base}.mp3`, '-af',
          `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,areverse,afade=t=in:d=0.04,areverse`,
          '-ar', '44100', '-ac', '1', `${base}.t2.wav`]);
      }
      file = `${base}.t2.wav`;
      dur = probe(file);
      words = raw.map((w) => ({ text: w.text, s: +(w.offset + LAG - start).toFixed(3), e: +(w.offset + w.duration + LAG - start).toFixed(3) }));
    }
    lines.push({ id: n, scene: scene.id, text, start: +t.toFixed(3), end: +(t + dur).toFixed(3), words, file });
    console.log(`[${t.toFixed(2)}s +${dur.toFixed(2)}s] ${scene.id}: ${text}`);
    t += dur + LINE_GAP;
    n++;
  }
  cursor = (scene.lines.length ? t - LINE_GAP : t) + (scene.hold ?? 1.0);
  scenes.push({
    id: scene.id, title: scene.title || scene.id, style: scene.style || null, cast: scene.cast || null,
    transition: scene.transition || null, transitionDuration: scene.transitionDuration ?? null,
    start: +sceneStart.toFixed(3), end: +cursor.toFixed(3),
  });
}

const duration = +cursor.toFixed(3);

if (DRY) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(duration), 'voice.wav']);
} else {
  // place every line at its start time, even out loudness (-16 LUFS), pad to the full duration
  const args = ['-v', 'error', '-y'];
  lines.forEach((l) => args.push('-i', l.file));
  const filters = lines.map((l, i) => `[${i}]adelay=${Math.round(l.start * 1000)}:all=1[a${i}]`);
  filters.push(`${lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur=${duration}[out]`);
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '44100', 'voice.wav');
  execFileSync('ffmpeg', args);
}
// the old full mix no longer matches the new timing
rmSync('audio.wav', { force: true });

const [width, height] = FORMATS[format];
const timeline = {
  duration, fps: script.fps || 30, format, width, height,
  style: script.style || 'paper', brand: script.brand ?? null, hud: script.hud ?? true,
  cast: script.cast || { host: 'bot' }, subtitles: script.subtitles || {}, audio: script.audio || {},
  scenes, lines: lines.map(({ file, ...l }) => l),
};
writeFileSync('timeline.js', `window.TIMELINE = ${JSON.stringify(timeline)};\n`);
console.log(`\ntotal ${duration}s, ${format}, ${scenes.length} scenes, ${lines.length} lines${DRY ? ' (dry: estimated timing, silent audio)' : ''} -> timeline.js, voice.wav`);
