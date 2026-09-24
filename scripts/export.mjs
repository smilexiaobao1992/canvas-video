// Render index.html frame by frame in headless Chrome and pipe PNGs into ffmpeg together with voice.wav.
// Usage: node scripts/export.mjs [--style <name>] [--out file.mp4]
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const style = arg('style');
const OUT = arg('out') || (style ? `out-${style}.mp4` : 'out.mp4');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('pageerror', async (e) => { console.error('page error:', e.message); await browser.close(); process.exit(1); });
const url = new URL(pathToFileURL(resolve('index.html')).href);
url.searchParams.set('export', '1');
if (style) url.searchParams.set('style', style);
await page.goto(url.href);
await page.evaluate(() => window.ready);

const { duration, fps } = await page.evaluate(() => window.TIMELINE);
const total = Math.ceil(duration * fps);

const ff = spawn('ffmpeg', [
  '-v', 'error', '-y',
  '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-i', 'voice.wav',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
  OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));

const started = Date.now();
for (let i = 0; i < total; i++) {
  const dataUrl = await page.evaluate((t) => {
    window.renderFrame(t);
    return document.getElementById('c').toDataURL('image/png');
  }, i / fps);
  const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) process.stdout.write(`\r${i}/${total} frames  ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`\ndone -> ${OUT} (${duration}s, ${total} frames, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
