// Render still frames for review: one labeled contact sheet (snaps/sheet[-tag].png) plus full-size PNGs.
// Also checks that frames are a pure function of t: every pick is rendered twice (second pass in reverse
// order) and pixel hashes must match. Exits 1 on page errors, impure scenes or golden mismatches.
// Usage: node scripts/snap.mjs                     one frame per scene at 70% of its duration
//        node scripts/snap.mjs 3.5 12 20.2         specific times (seconds)
//        node scripts/snap.mjs --at 0.3,0.9        frames per scene at these fractions of its duration
//        node scripts/snap.mjs --style chalk       force every scene into one style
//        node scripts/snap.mjs --cast host=cat     swap who plays a role
//        node scripts/snap.mjs --no-check          skip the purity check
//        node scripts/snap.mjs --golden <dir> [--update-golden]   compare thumbnails with (or refresh) reference images
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { launchBrowser, openPage } from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return false; argv.splice(i, 1); return true; };
const style = opt('style');
const cast = opt('cast');
const at = (opt('at') || '0.7').split(',').map(Number);
const outDir = opt('out') || 'snaps';
const golden = opt('golden');
const updateGolden = flag('update-golden');
const check = !flag('no-check');
const times = argv.map(Number).filter((x) => !Number.isNaN(x));
const GOLDEN_TOLERANCE = 1.5; // mean absolute difference per channel (0-255) on 320px-wide thumbnails

mkdirSync(outDir, { recursive: true });
const browser = await launchBrowser();
const { page, errors } = await openPage(browser, { style, cast });

let impure = [], mismatches = [];
if (!errors.length) {
  const goldenIn = golden && !updateGolden && existsSync(golden)
    ? Object.fromEntries(readdirSync(golden).filter((f) => f.endsWith('.webp')).map((f) => [f, `data:image/webp;base64,${readFileSync(`${golden}/${f}`).toString('base64')}`]))
    : null;
  const result = await page.evaluate(async ({ times, at, check, withThumbs, goldenIn }) => {
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
    const tw = 320, th = Math.round((320 * src.height) / src.width);
    const thumb = document.createElement('canvas'); thumb.width = tw; thumb.height = th;
    // CPU-backed on purpose: a canvas switches GPU->CPU after its first readback, and the two paths scale differently
    const tg = thumb.getContext('2d', { willReadFrequently: true });
    const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const cols = src.width > src.height ? 2 : 4, cw = src.width > src.height ? 960 : 400, ch = Math.round((cw * src.height) / src.width), lh = 36;
    const sheet = document.createElement('canvas');
    sheet.width = cols * cw; sheet.height = Math.ceil(picks.length / cols) * (ch + lh);
    const b = sheet.getContext('2d');
    b.fillStyle = '#111'; b.fillRect(0, 0, sheet.width, sheet.height);
    const frames = [], thumbs = [], diffs = [];
    for (const [i, p] of picks.entries()) {
      window.renderFrame(p.t);
      if (check) p.hash = await hash();
      frames.push({ label: p.label, data: src.toDataURL('image/png') });
      tg.clearRect(0, 0, tw, th); tg.drawImage(src, 0, 0, tw, th);
      const name = `${String(i).padStart(2, '0')}.webp`;
      const webp = thumb.toDataURL('image/webp', 0.85);
      if (withThumbs) thumbs.push({ name, data: webp });
      if (goldenIn) {
        if (!goldenIn[name]) diffs.push({ label: p.label, diff: Infinity, missing: true });
        else {
          // compare after the same lossy round trip the golden went through, so compression noise cancels out
          tg.clearRect(0, 0, tw, th); tg.drawImage(await loadImg(webp), 0, 0, tw, th);
          const cur = tg.getImageData(0, 0, tw, th).data;
          tg.clearRect(0, 0, tw, th); tg.drawImage(await loadImg(goldenIn[name]), 0, 0, tw, th);
          const ref = tg.getImageData(0, 0, tw, th).data;
          let sum = 0;
          for (let k = 0; k < cur.length; k += 4) sum += Math.abs(cur[k] - ref[k]) + Math.abs(cur[k + 1] - ref[k + 1]) + Math.abs(cur[k + 2] - ref[k + 2]);
          diffs.push({ label: p.label, diff: sum / ((cur.length / 4) * 3) });
        }
      }
      const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + lh);
      b.drawImage(src, x, y + lh, cw, ch);
      b.fillStyle = '#eee'; b.font = '22px Menlo, monospace'; b.textBaseline = 'middle';
      b.fillText(p.label, x + 12, y + lh / 2);
    }
    // purity: re-render in reverse order; a scene that keeps state between frames renders differently
    const impure = [];
    if (check) for (const p of [...picks].reverse()) { window.renderFrame(p.t); if ((await hash()) !== p.hash) impure.push(p.label); }
    return { sheet: sheet.toDataURL('image/png'), frames, impure, thumbs, diffs };
  }, { times, at, check, withThumbs: !!golden, goldenIn });
  const tag = [style, cast && cast.replace(/[^\w]+/g, '_')].filter(Boolean).map((x) => `-${x}`).join('');
  const png = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
  writeFileSync(`${outDir}/sheet${tag}.png`, png(result.sheet));
  result.frames.forEach((f, i) => writeFileSync(`${outDir}/${String(i).padStart(2, '0')}${tag}-${f.label.replace(/[^\w.]+/g, '_')}.png`, png(f.data)));
  impure = result.impure;
  if (golden && (updateGolden || !existsSync(golden))) {
    rmSync(golden, { recursive: true, force: true });
    mkdirSync(golden, { recursive: true });
    result.thumbs.forEach((t) => writeFileSync(`${golden}/${t.name}`, png(t.data)));
    console.log(`golden updated: ${golden} (${result.thumbs.length} images)`);
  } else if (golden) {
    mismatches = result.diffs.filter((d) => d.diff > GOLDEN_TOLERANCE);
  }
  const worst = result.diffs.length ? Math.max(...result.diffs.map((d) => d.diff)) : null;
  console.log(`${result.frames.length} frames -> ${outDir}/sheet${tag}.png${check && !impure.length ? ' (pure)' : ''}${worst !== null ? ` (golden max diff ${worst.toFixed(2)})` : ''}`);
}
await browser.close();
if (errors.length) { console.error('page errors:\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
if (impure.length) { console.error(`not a pure function of t (renders differ on repeat): ${impure.join(', ')}`); process.exit(1); }
if (mismatches.length) { console.error(`differs from golden (> ${GOLDEN_TOLERANCE}): ${mismatches.map((m) => `${m.label}${m.missing ? ' (missing)' : ` ${m.diff.toFixed(2)}`}`).join(', ')}\n  if the change is intended: rerun with --update-golden`); process.exit(1); }
