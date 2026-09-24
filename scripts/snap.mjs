// Render still frames for review: one labeled contact sheet (snaps/sheet[-style].png) plus full-size PNGs.
// Fails with exit code 1 if the page throws or logs errors — use it after every change to scenes.js.
// Usage: node scripts/snap.mjs                     one frame per scene at 70% of its duration
//        node scripts/snap.mjs 3.5 12 20.2         specific times (seconds)
//        node scripts/snap.mjs --at 0.3,0.9        frames per scene at these fractions of its duration
//        node scripts/snap.mjs --style chalk       force every scene into one style
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const style = opt('style');
const at = (opt('at') || '0.7').split(',').map(Number);
const outDir = opt('out') || 'snaps';
const times = argv.map(Number).filter((x) => !Number.isNaN(x));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const url = new URL(pathToFileURL(resolve('index.html')).href);
url.searchParams.set('export', '1');
if (style) url.searchParams.set('style', style);
await page.goto(url.href);
await page.evaluate(() => window.ready).catch((e) => errors.push(String(e)));

if (!errors.length) {
  const result = await page.evaluate(async ({ times, at }) => {
    const TL = window.TIMELINE;
    const picks = times.length
      ? times.map((t) => ({ t, label: `${t}s` }))
      : TL.scenes.flatMap((s) => at.map((f) => { const t = +(s.start + (s.end - s.start) * f).toFixed(2); return { t, label: `${s.id} @ ${t}s` }; }));
    const src = document.getElementById('c');
    const cols = 2, tw = 960, th = 540, lh = 36;
    const sheet = document.createElement('canvas');
    sheet.width = cols * tw; sheet.height = Math.ceil(picks.length / cols) * (th + lh);
    const b = sheet.getContext('2d');
    b.fillStyle = '#111'; b.fillRect(0, 0, sheet.width, sheet.height);
    const frames = [];
    picks.forEach((p, i) => {
      window.renderFrame(p.t);
      frames.push({ label: p.label, data: src.toDataURL('image/png') });
      const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + lh);
      b.drawImage(src, x, y + lh, tw, th);
      b.fillStyle = '#eee'; b.font = '22px Menlo, monospace'; b.textBaseline = 'middle';
      b.fillText(p.label, x + 12, y + lh / 2);
    });
    return { sheet: sheet.toDataURL('image/png'), frames };
  }, { times, at });
  const tag = style ? `-${style}` : '';
  const png = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
  writeFileSync(`${outDir}/sheet${tag}.png`, png(result.sheet));
  result.frames.forEach((f, i) => writeFileSync(`${outDir}/${String(i).padStart(2, '0')}${tag}-${f.label.replace(/[^\w.]+/g, '_')}.png`, png(f.data)));
  console.log(`${result.frames.length} frames -> ${outDir}/sheet${tag}.png`);
}
await browser.close();
if (errors.length) { console.error('page errors:\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
