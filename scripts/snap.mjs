// Render still frames for review: one labeled contact sheet (snaps/sheet[-style].png) plus full-size PNGs.
// Also checks that frames are a pure function of t: every pick is rendered twice (second pass in reverse
// order) and pixel hashes must match. Exits 1 on page errors or impure scenes — run it after every change.
// Usage: node scripts/snap.mjs                     one frame per scene at 70% of its duration
//        node scripts/snap.mjs 3.5 12 20.2         specific times (seconds)
//        node scripts/snap.mjs --at 0.3,0.9        frames per scene at these fractions of its duration
//        node scripts/snap.mjs --style chalk       force every scene into one style
//        node scripts/snap.mjs --cast host=cat     swap who plays a role
//        node scripts/snap.mjs --no-check          skip the purity check
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return false; argv.splice(i, 1); return true; };
const style = opt('style');
const cast = opt('cast');
const at = (opt('at') || '0.7').split(',').map(Number);
const outDir = opt('out') || 'snaps';
const check = !flag('no-check');
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
if (cast) url.searchParams.set('cast', cast.replaceAll('=', ':'));
await page.goto(url.href);
await page.evaluate(() => window.ready).catch((e) => errors.push(String(e)));

let impure = [];
if (!errors.length) {
  const result = await page.evaluate(async ({ times, at, check }) => {
    const TL = window.TIMELINE;
    const picks = times.length
      ? times.map((t) => ({ t, label: `${t}s` }))
      : TL.scenes.flatMap((s) => at.map((f) => { const t = +(s.start + (s.end - s.start) * f).toFixed(2); return { t, label: `${s.id} @ ${t}s` }; }));
    const src = document.getElementById('c');
    const g = src.getContext('2d');
    const hash = async () => {
      const buf = await crypto.subtle.digest('SHA-1', g.getImageData(0, 0, src.width, src.height).data);
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
    };
    const cols = 2, tw = 960, th = 540, lh = 36;
    const sheet = document.createElement('canvas');
    sheet.width = cols * tw; sheet.height = Math.ceil(picks.length / cols) * (th + lh);
    const b = sheet.getContext('2d');
    b.fillStyle = '#111'; b.fillRect(0, 0, sheet.width, sheet.height);
    const frames = [];
    for (const [i, p] of picks.entries()) {
      window.renderFrame(p.t);
      if (check) p.hash = await hash();
      frames.push({ label: p.label, data: src.toDataURL('image/png') });
      const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + lh);
      b.drawImage(src, x, y + lh, tw, th);
      b.fillStyle = '#eee'; b.font = '22px Menlo, monospace'; b.textBaseline = 'middle';
      b.fillText(p.label, x + 12, y + lh / 2);
    }
    // purity: re-render in reverse order; a scene that keeps state between frames renders differently
    const impure = [];
    if (check) for (const p of [...picks].reverse()) { window.renderFrame(p.t); if ((await hash()) !== p.hash) impure.push(p.label); }
    return { sheet: sheet.toDataURL('image/png'), frames, impure };
  }, { times, at, check });
  const tag = [style, cast && cast.replace(/[^\w]+/g, '_')].filter(Boolean).map((x) => `-${x}`).join('');
  const png = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
  writeFileSync(`${outDir}/sheet${tag}.png`, png(result.sheet));
  result.frames.forEach((f, i) => writeFileSync(`${outDir}/${String(i).padStart(2, '0')}${tag}-${f.label.replace(/[^\w.]+/g, '_')}.png`, png(f.data)));
  impure = result.impure;
  console.log(`${result.frames.length} frames -> ${outDir}/sheet${tag}.png${check ? (impure.length ? '' : ' (pure)') : ''}`);
}
await browser.close();
if (errors.length) { console.error('page errors:\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
if (impure.length) { console.error(`not a pure function of t (renders differ on repeat): ${impure.join(', ')}`); process.exit(1); }
