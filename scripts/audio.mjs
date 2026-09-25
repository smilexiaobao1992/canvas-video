// Procedural audio: background music presets and sound effects synthesized in plain JS (no samples to download),
// plus the final mix (voice + ducked music + sfx cues -> loudness-normalized audio.wav).
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SR = 44100;
const TAU = Math.PI * 2;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function rng(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function writeWav(path, L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak; // normalize to about -1 dBFS; the mixer sets the final level
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}

// ---------- music ----------
const PRESETS = {
  // warm major pads, soft plucked arpeggio, gentle bass
  calm:   { bpm: 76, root: 60, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], arp: 2, arpOct: 12, hats: false, bright: 0.25 },
  // faster, brighter, light hi-hats
  bright: { bpm: 100, root: 62, chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], arp: 4, arpOct: 12, hats: true, bright: 0.45 },
  // slow minor, darker and sparser
  deep:   { bpm: 64, root: 57, chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], arp: 1, arpOct: 12, hats: false, bright: 0.12 },
};

export function synthMusic(preset, seconds, path) {
  const P = PRESETS[preset];
  if (!P) throw new Error(`unknown music preset "${preset}"; available: ${Object.keys(PRESETS).join(', ')}`);
  const n = Math.ceil((seconds + 1) * SR), L = new Float32Array(n), R = new Float32Array(n);
  const beat = 60 / P.bpm, bar = beat * 4, chordLen = bar * 2, r = rng(11);
  const chordAt = (t) => P.chords[Math.floor(t / chordLen) % P.chords.length];

  // pads: detuned sine stacks per chord, raised-cosine crossfade between chords
  const nChords = Math.ceil(seconds / chordLen) + 1;
  for (let c = 0; c < nChords; c++) {
    const t0 = c * chordLen, chord = P.chords[c % P.chords.length];
    const a = Math.floor(Math.max(0, t0 - 0.8) * SR), b = Math.min(n, Math.floor((t0 + chordLen + 0.8) * SR));
    for (const [k, iv] of [...chord, chord[0] + 12].entries()) {
      const f = hz(P.root - 12 + iv), pan = (k % 2 ? 0.35 : -0.35);
      for (let i = a; i < b; i++) {
        const t = i / SR, local = t - (t0 - 0.8);
        const env = Math.min(1, local / 1.2) * Math.min(1, (chordLen + 1.6 - local) / 1.2);
        const v = (Math.sin(TAU * f * t) + P.bright * Math.sin(TAU * 2 * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t + 1)) * env * 0.05;
        L[i] += v * (1 - pan); R[i] += v * (1 + pan);
      }
    }
  }
  // bass on beats 1 and 3
  for (let t0 = 0; t0 < seconds; t0 += beat * 2) {
    const f = hz(P.root - 24 + chordAt(t0)[0]), a = Math.floor(t0 * SR), b = Math.min(n, a + Math.floor(beat * 1.8 * SR));
    for (let i = a; i < b; i++) { const t = (i - a) / SR; const v = Math.sin(TAU * f * t) * Math.exp(-t * 2.2) * Math.min(1, t / 0.01) * 0.16; L[i] += v; R[i] += v; }
  }
  // plucked arpeggio with a ping-pong echo
  const step = beat / P.arp, pattern = [0, 1, 2, 3, 2, 1];
  const echoL = new Float32Array(n), echoR = new Float32Array(n);
  let k = 0;
  for (let t0 = 0; t0 < seconds; t0 += step, k++) {
    const chord = chordAt(t0), tones = [...chord, chord[0] + 12];
    const f = hz(P.root + P.arpOct + tones[pattern[k % pattern.length]]);
    const vel = 0.07 * (0.75 + 0.25 * r()), a = Math.floor(t0 * SR), b = Math.min(n, a + Math.floor(1.2 * SR));
    for (let i = a; i < b; i++) {
      const t = (i - a) / SR;
      const v = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 9)) * Math.exp(-t * 4.5) * Math.min(1, t / 0.004) * vel;
      L[i] += v * 0.8; R[i] += v * 0.6; echoL[i] += v; echoR[i] += v;
    }
  }
  const d = Math.floor(beat * 0.75 * SR);
  for (let i = d; i < n; i++) { echoL[i] += echoR[i - d] * 0.35; echoR[i] += echoL[i - d] * 0.35; }
  for (let i = 0; i < n; i++) { L[i] += echoR[i] * 0.22; R[i] += echoL[i] * 0.22; }
  // soft hi-hats on the off-beats
  if (P.hats) {
    for (let t0 = beat / 2; t0 < seconds; t0 += beat) {
      const a = Math.floor(t0 * SR), b = Math.min(n, a + Math.floor(0.05 * SR));
      let prev = 0;
      for (let i = a; i < b; i++) { const w = r() * 2 - 1, hp = w - prev; prev = w; const v = hp * Math.exp(-((i - a) / SR) * 70) * 0.03; L[i] += v * 0.7; R[i] += v; }
    }
  }
  // fade in 2s, fade out 3s
  for (let i = 0; i < n; i++) { const t = i / SR, g = Math.min(1, t / 2) * Math.min(1, Math.max(0, (seconds - t) / 3)); L[i] *= g; R[i] *= g; }
  writeWav(path, L, R);
}

// ---------- sound effects ----------
function tone(L, R, t0, dur, fn, pan = 0) {
  const a = Math.floor(t0 * SR), b = Math.min(L.length, a + Math.floor(dur * SR));
  for (let i = a; i < b; i++) { const v = fn((i - a) / SR); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
}
const SFX = {
  whoosh(L, R, r) {
    // band-limited noise whose brightness rises and falls while it pans left to right
    let lp = 0, lp2 = 0;
    tone(L, R, 0, 0.6, (t) => {
      const u = t / 0.6, cut = 0.02 + 0.25 * Math.sin(Math.PI * u);
      lp += cut * ((r() * 2 - 1) - lp); lp2 += cut * (lp - lp2);
      return (lp - lp2 * 0.6) * Math.sin(Math.PI * u) ** 1.5 * 1.4;
    });
    for (let i = 0; i < L.length; i++) { const p = i / L.length; L[i] *= 1.3 - p; R[i] *= 0.3 + p; }
  },
  pop(L, R) { let ph = 0; tone(L, R, 0, 0.14, (t) => { ph += (TAU * (300 + 700 * Math.exp(-t * 40))) / SR; return Math.sin(ph) * Math.exp(-t * 28) * Math.min(1, t / 0.002); }); },
  ding(L, R) { tone(L, R, 0, 1.4, (t) => [1, 2.76, 5.4].reduce((s, m, k) => s + Math.sin(TAU * 1175 * m * t) * Math.exp(-t * (3 + k * 3)) / (k + 1), 0) * Math.min(1, t / 0.003) * 0.6); },
  success(L, R) {
    for (const [t0, f] of [[0, 784], [0.11, 1047], [0.22, 1319]]) tone(L, R, t0, 0.9, (t) => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t)) * Math.exp(-t * 5) * Math.min(1, t / 0.003) * 0.5);
  },
  error(L, R) {
    for (const t0 of [0, 0.17]) tone(L, R, t0, 0.14, (t) => [1, 3, 5, 7].reduce((s, h) => s + Math.sin(TAU * 185 * h * t) / h, 0) * Math.min(1, t / 0.005) * Math.min(1, (0.14 - t) / 0.02) * 0.5);
  },
  click(L, R, r) { tone(L, R, 0, 0.04, (t) => ((r() * 2 - 1) * 0.5 + Math.sin(TAU * 2200 * t)) * Math.exp(-t * 160) * 0.8); },
  type(L, R, r) {
    for (let k = 0; k < 7; k++) { const t0 = k * 0.07 + r() * 0.02, f = 1800 + r() * 900; tone(L, R, t0, 0.03, (t) => ((r() * 2 - 1) * 0.4 + Math.sin(TAU * f * t)) * Math.exp(-t * 200) * 0.6, r() * 0.4 - 0.2); }
  },
  swell(L, R, r) {
    // riser: noise and a rising tone that grow, then stop sharply
    let ph = 0;
    tone(L, R, 0, 1.2, (t) => { ph += (TAU * (200 + 700 * (t / 1.2) ** 2)) / SR; const g = (t / 1.2) ** 2.5 * Math.min(1, (1.2 - t) / 0.02); return (Math.sin(ph) * 0.5 + (r() * 2 - 1) * 0.25) * g; });
  },
  glitch(L, R, r) {
    for (let k = 0; k < 6; k++) {
      const t0 = k * 0.05, f = 200 + r() * 1400;
      tone(L, R, t0, 0.04, (t) => Math.sign(Math.sin(TAU * f * t)) * 0.35 * Math.min(1, (0.04 - t) / 0.005), r() - 0.5);
    }
  },
};
const SFX_LEN = { whoosh: 0.6, pop: 0.2, ding: 1.4, success: 1.2, error: 0.4, click: 0.1, type: 0.6, swell: 1.25, glitch: 0.35 };
export const SFX_NAMES = Object.keys(SFX);

export function sfxFile(name, dir) {
  if (!SFX[name]) throw new Error(`unknown sound "${name}"; available: ${SFX_NAMES.join(', ')}`);
  const path = `${dir}/sfx-${name}.v1.wav`;
  if (!existsSync(path)) {
    const n = Math.ceil(SFX_LEN[name] * SR), L = new Float32Array(n), R = new Float32Array(n);
    SFX[name](L, R, rng(name.length * 97));
    writeWav(path, L, R);
  }
  return path;
}

// ---------- mix ----------
// cfg = TL.audio: { music: 'calm'|'bright'|'deep'|<file>|null, musicVolume, sfx: bool, sfxVolume }
export function mixAudio({ voice = 'voice.wav', duration, cfg = {}, cues = [], out = 'audio.wav', dir = 'build/audio' }) {
  mkdirSync(dir, { recursive: true });
  const inputs = ['-i', voice];
  const f = ['[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asplit=2[v][vkey]'];
  const mixIns = ['[v]'];
  let next = 1;
  const music = cfg.music === undefined ? 'calm' : cfg.music;
  if (music) {
    let file = music;
    if (PRESETS[music]) {
      file = `${dir}/music-${music}-${duration.toFixed(2)}.v1.wav`;
      if (!existsSync(file)) synthMusic(music, duration, file);
    } else if (!existsSync(file)) throw new Error(`music file not found: ${file} (or use a preset: ${Object.keys(PRESETS).join(', ')})`);
    inputs.push('-stream_loop', '-1', '-i', file);
    // music ducks under the voice: sidechain compression keyed by the narration
    f.push(`[${next}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,atrim=0:${duration},volume=${cfg.musicVolume ?? 0.16}[m0]`);
    f.push('[m0][vkey]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=600[m]');
    mixIns.push('[m]');
    next++;
  } else f.push('[vkey]anullsink');
  if (cfg.sfx !== false) {
    for (const c of cues) {
      inputs.push('-i', sfxFile(c.sound, dir));
      const ms = Math.max(0, Math.round(c.at * 1000));
      f.push(`[${next}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${(cfg.sfxVolume ?? 0.35) * (c.volume ?? 1)}[s${next}]`);
      mixIns.push(`[s${next}]`);
      next++;
    }
  }
  f.push(`${mixIns.join('')}amix=inputs=${mixIns.length}:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${duration}[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', f.join(';'), '-map', '[out]', '-ar', '44100', '-ac', '2', out]);
  return out;
}
