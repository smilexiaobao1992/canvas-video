// Voiceover + timeline: synthesize each narration line with edge-tts, measure it, lay lines out on a
// timeline, and write timeline.js (loaded by index.html) + voice.wav (mixed track).
// Usage: node scripts/tts.mjs          real voice via edge-tts (online, cached per line)
//        node scripts/tts.mjs --dry    offline: estimate durations from text length, silent voice.wav
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DRY = process.argv.includes('--dry');
const LINE_GAP = 0.35;
// trim leading/trailing silence, then short fades so trimmed edges never click
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,afade=t=in:d=0.04,areverse,afade=t=in:d=0.015';
const script = JSON.parse(readFileSync('script.json', 'utf8'));
const voice = script.voice || 'zh-CN-YunxiNeural';
const rate = script.rate || '+0%';
mkdirSync('build/tts', { recursive: true });

const probe = (file) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

// edge-tts talks to an online service; retry transient network failures
function synth(text, out) {
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync('.venv/bin/edge-tts', ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', out], { stdio: ['ignore', 'ignore', 'pipe'] });
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`  retry ${attempt}: ${text}`);
    }
  }
}
// rough speaking time for --dry mode: ~4.2 CJK chars/s, ~2.8 latin words/s
const estimate = (text) => {
  const cjk = (text.match(/[㐀-鿿]/g) || []).length;
  const words = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(0.8, cjk / 4.2 + words / 2.8);
};

const lines = [];
const scenes = [];
let cursor = 0;
let n = 0;

for (const scene of script.scenes) {
  const sceneStart = cursor;
  let t = sceneStart + (scene.lead ?? 0.5);
  for (const text of scene.lines) {
    let dur, file = null;
    if (DRY) dur = estimate(text);
    else {
      // cache by voice + rate + text so unchanged lines are not re-synthesized
      const key = createHash('md5').update(`${voice}|${rate}|${text}`).digest('hex').slice(0, 10);
      const base = `build/tts/${key}`;
      if (!existsSync(`${base}.mp3`)) synth(text, `${base}.mp3`);
      // trim leading/trailing silence so subtitles and visuals line up with speech
      if (!existsSync(`${base}.v2.wav`)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${base}.mp3`, '-af', TRIM, '-ar', '44100', '-ac', '1', `${base}.v2.wav`]);
      file = `${base}.v2.wav`;
      dur = probe(file);
    }
    lines.push({ id: n, scene: scene.id, text, start: +t.toFixed(3), end: +(t + dur).toFixed(3), file });
    console.log(`[${t.toFixed(2)}s +${dur.toFixed(2)}s] ${scene.id}: ${text}`);
    t += dur + LINE_GAP;
    n++;
  }
  cursor = (scene.lines.length ? t - LINE_GAP : t) + (scene.hold ?? 1.0);
  scenes.push({ id: scene.id, title: scene.title || scene.id, style: scene.style || null, cast: scene.cast || null, start: +sceneStart.toFixed(3), end: +cursor.toFixed(3) });
}

const duration = +cursor.toFixed(3);

if (DRY) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(duration), 'voice.wav']);
} else {
  // mix all lines onto one track at their start offsets
  const args = ['-v', 'error', '-y'];
  lines.forEach((l) => args.push('-i', l.file));
  const filters = lines.map((l, i) => `[${i}]adelay=${Math.round(l.start * 1000)}:all=1[a${i}]`);
  // even loudness across lines (-16 LUFS, a common target for web video), padded to the full duration
  filters.push(`${lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur=${duration}[out]`);
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '44100', 'voice.wav');
  execFileSync('ffmpeg', args);
}

const timeline = {
  duration, fps: script.fps || 30, style: script.style || 'paper', brand: script.brand ?? null, hud: script.hud ?? true, cast: script.cast || { host: 'bot' },
  scenes, lines: lines.map(({ file, ...l }) => l),
};
writeFileSync('timeline.js', `window.TIMELINE = ${JSON.stringify(timeline, null, 2)};\n`);
console.log(`\ntotal ${duration}s, ${scenes.length} scenes, ${lines.length} lines${DRY ? ' (dry: estimated timing, silent audio)' : ''} -> timeline.js, voice.wav`);
