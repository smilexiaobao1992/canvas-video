// Export: N headless Chrome instances each render a contiguous range of frames and encode it in the page with
// WebCodecs (H.264, hardware encoder when available). The Annex B segments are byte-concatenated (each starts
// on a keyframe) and muxed with voice.wav. Rendering is a pure function of t, so ranges are independent.
// Usage: node scripts/export.mjs [--style <name>] [--cast host=cat,student=person] [--out file.mp4]
//                                [--workers N] [--bitrate <Mbps>] [--draft]
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, rmSync, openSync, writeSync, closeSync } from 'node:fs';
import { cpus } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
const draft = argv.includes('--draft');
const style = opt('style');
const cast = opt('cast');
const OUT = opt('out') || `out${style ? `-${style}` : ''}${draft ? '-draft' : ''}.mp4`;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const tlSrc = readFileSync('timeline.js', 'utf8');
const TL = JSON.parse(tlSrc.slice(tlSrc.indexOf('{'), tlSrc.lastIndexOf('}') + 1));
const fps = draft ? 15 : TL.fps;
const total = Math.ceil(TL.duration * fps);
const bitrate = Number(opt('bitrate') ?? (draft ? 4 : 20)) * 1e6;
// at least ~2s of frames per worker; more instances than that only adds startup cost
const workers = Math.max(1, Math.min(Number(opt('workers') ?? Math.min(6, cpus().length - 2)), Math.ceil(total / (fps * 2))));

const url = new URL(pathToFileURL(resolve('index.html')).href);
url.searchParams.set('export', '1');
if (style) url.searchParams.set('style', style);
if (cast) url.searchParams.set('cast', cast.replaceAll('=', ':'));

const SEG_DIR = 'build/export';
rmSync(SEG_DIR, { recursive: true, force: true });
mkdirSync(SEG_DIR, { recursive: true });
const ranges = Array.from({ length: workers }, (_, k) => [Math.floor((total * k) / workers), Math.floor((total * (k + 1)) / workers)]);
const done = new Array(workers).fill(0);
const started = Date.now();
const progress = () => process.stdout.write(`\r${done.reduce((a, b) => a + b, 0)}/${total} frames  ${workers} workers  ${((Date.now() - started) / 1000).toFixed(0)}s`);

// runs inside the page: render frames [a, b) and stream encoded chunks out through window.__chunk
async function encodeRange({ a, b, fps, bitrate, keyEvery }) {
  const cfg = { codec: 'avc1.640028', width: 1920, height: 1080, bitrate, bitrateMode: 'variable', framerate: fps, avc: { format: 'annexb' }, hardwareAcceleration: 'prefer-hardware' };
  if (!(await VideoEncoder.isConfigSupported(cfg)).supported) {
    cfg.hardwareAcceleration = 'no-preference';
    if (!(await VideoEncoder.isConfigSupported(cfg)).supported) throw new Error('this Chrome cannot encode H.264 with WebCodecs');
  }
  let failure = null;
  const sends = [];
  const enc = new VideoEncoder({
    output: (chunk) => {
      const u = new Uint8Array(chunk.byteLength);
      chunk.copyTo(u);
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      sends.push(window.__chunk(btoa(s)));
    },
    error: (e) => { failure = e; },
  });
  enc.configure(cfg);
  const cv = document.getElementById('c');
  let renderMs = 0;
  for (let i = a; i < b; i++) {
    const r0 = performance.now();
    window.renderFrame(i / fps);
    renderMs += performance.now() - r0;
    const frame = new VideoFrame(cv, { timestamp: Math.round(((i - a) * 1e6) / fps), duration: Math.round(1e6 / fps) });
    enc.encode(frame, { keyFrame: (i - a) % keyEvery === 0 });
    frame.close();
    if (enc.encodeQueueSize > 6) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
    if (failure) throw failure;
    if ((i - a) % 30 === 0) window.__progress(i - a);
  }
  await enc.flush();
  await Promise.all(sends);
  if (failure) throw failure;
  return { renderMs };
}

async function worker(k, [a, b]) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    let pageError = null;
    page.on('pageerror', (e) => { pageError = e; });
    const out = createWriteStream(`${SEG_DIR}/seg-${String(k).padStart(2, '0')}.h264`);
    await page.exposeFunction('__chunk', (b64) => { out.write(Buffer.from(b64, 'base64')); });
    await page.exposeFunction('__progress', (n) => { done[k] = n; progress(); });
    await page.goto(url.href);
    await page.evaluate(() => window.ready);
    if (pageError) throw pageError;
    const stats = await page.evaluate(encodeRange, { a, b, fps, bitrate, keyEvery: fps * 2 });
    if (pageError) throw pageError;
    await new Promise((r) => out.end(r));
    done[k] = b - a; progress();
    return stats;
  } finally {
    await browser.close();
  }
}

let stats;
try {
  stats = await Promise.all(ranges.map((r, k) => worker(k, r)));
} catch (e) {
  console.error(`\nexport failed: ${e.message}`);
  process.exit(1);
}
const encodedAt = Date.now();

// Annex B streams concatenate byte-for-byte when every segment starts with a keyframe
const joined = `${SEG_DIR}/all.h264`;
const fd = openSync(joined, 'w');
ranges.forEach((_, k) => writeSync(fd, readFileSync(`${SEG_DIR}/seg-${String(k).padStart(2, '0')}.h264`)));
closeSync(fd);
execFileSync('ffmpeg', [
  '-v', 'error', '-y',
  '-fflags', '+genpts', '-r', String(fps), '-f', 'h264', '-i', joined,
  '-i', 'voice.wav',
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
  OUT,
]);
rmSync(SEG_DIR, { recursive: true, force: true });

const wall = (Date.now() - started) / 1000;
const renderAvg = stats.reduce((s, x) => s + x.renderMs, 0) / total;
console.log(`\ndone -> ${OUT}`);
console.log(`  ${TL.duration}s video, ${total} frames @ ${fps}fps, ${workers} workers, ${(bitrate / 1e6).toFixed(0)} Mbps${draft ? ' (draft)' : ''}`);
console.log(`  wall ${wall.toFixed(1)}s = ${(total / wall).toFixed(0)} fps (${(TL.duration / wall).toFixed(1)}x realtime); render JS ~${renderAvg.toFixed(1)} ms/frame; mux ${((Date.now() - encodedAt) / 1000).toFixed(1)}s`);
