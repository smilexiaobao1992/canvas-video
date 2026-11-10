// Render still frames for review: a labeled contact sheet (snaps/sheet[-tag].png, split into sheet-p1.png,
// sheet-p2.png ... when there are many frames) plus full-size PNGs. Frames from the previous run are removed.
// Two checks run alongside:
//   sweep   every scene is run through its whole duration, so an error that only happens late in a scene
//           (a wrong S.word anchor behind an `if`, a typo in a branch) is reported now, all at once
//   purity  every pick is rendered twice (second pass in reverse order) and pixel hashes must match
// Exits 1 on page errors, scene errors, impure scenes or golden mismatches.
// The sweep also measures pacing, which stills cannot show: how long each shot holds, how much of the frame the
// content covers, how much of the picture is moving, and whether the camera moves. A summary is printed and the
// per-shot table goes to snaps/pacing.txt. These are observations to look at, never a failure.
// Usage: node scripts/snap.mjs                     one frame per scene at 70% of its duration
//        node scripts/snap.mjs 3.5 12 20.2         specific times (seconds)
//        node scripts/snap.mjs --at 0.3,0.9        frames per scene at these fractions of its duration
//        node scripts/snap.mjs --strip             one row per shot with frames across its duration (to see motion);
//                                                  writes the sheets only, no full-size PNGs
//        node scripts/snap.mjs --scene bell,last   only these scenes (with or without --strip)
//        node scripts/snap.mjs --style chalk       force every scene into one style
//        node scripts/snap.mjs --cast host=cat     swap who plays a role
//        node scripts/snap.mjs --no-check          skip the sweep and the purity check
//        node scripts/snap.mjs --golden <dir> [--update-golden]   compare thumbnails with (or refresh) reference images
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { launchBrowser, openPage, closeBrowser } from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return false; argv.splice(i, 1); return true; };
const style = opt('style');
const cast = opt('cast');
const at = (opt('at') || '0.7').split(',').map(Number);
const only = (opt('scene') || '').split(',').filter(Boolean);
const strip = flag('strip');
const outDir = opt('out') || 'snaps';
const golden = opt('golden');
const updateGolden = flag('update-golden');
const check = !flag('no-check');
const bad = argv.filter((a) => a.startsWith('--') || Number.isNaN(Number(a)));
if (bad.length) { console.error(`unknown arguments: ${bad.join(' ')} (times must be separate numbers, e.g. snap.mjs 3.5 12)`); process.exit(1); }
const times = argv.map(Number);
const GOLDEN_TOLERANCE = 1.5; // mean absolute difference per channel (0-255) on 320px-wide thumbnails

mkdirSync(outDir, { recursive: true });
const browser = await launchBrowser();
const { page, errors } = await openPage(browser, { style, cast, snap: true });

let impure = [], mismatches = [], broken = [], result = null, pacing = null;
if (!errors.length) {
  const goldenIn = golden && !updateGolden && existsSync(golden)
    ? Object.fromEntries(readdirSync(golden).filter((f) => f.endsWith('.webp')).map((f) => [f, `data:image/webp;base64,${readFileSync(`${golden}/${f}`).toString('base64')}`]))
    : null;
  result = await page.evaluate(async ({ times, at, only, strip, check, withThumbs, goldenIn }) => {
    const TL = window.TIMELINE;
    const src = document.getElementById('c');
    const g = src.getContext('2d');
    const wide = src.width > src.height;
    const unknown = only.filter((id) => !TL.scenes.some((s) => s.id === id));
    if (unknown.length) return { broken: [`--scene: no scene named ${unknown.join(', ')}; scenes are ${TL.scenes.map((s) => s.id).join(', ')}`] };
    const wanted = (id) => !only.length || only.includes(id);
    // sweep (only for the per-scene run; explicit times are for a quick look at one moment)
    const broken = [];
    let pacing = null;
    if (check && !times.length) {
      const seen = new Set();
      const note = (where, e) => { const msg = String((e && e.message) || e); if (!seen.has(msg)) { seen.add(msg); broken.push(`${where}: ${msg}`); } };
      try { window.collectCues(); } catch (e) { note('SFX', e); }
      let shots = [];
      try { shots = window.shotList().map((s) => ({ ...s, n: 0, change: 0, cam: null })); } catch (e) { note('shots', e); }
      // pacing is measured on a small CPU copy of each frame, above the subtitle block (its highlight changes all the time)
      const pw = 96, ph = Math.round((96 * src.height) / src.width), rows = Math.max(1, Math.round((ph * window.subtitleTop()) / src.height));
      const small = document.createElement('canvas'); small.width = pw; small.height = ph;
      const sg = small.getContext('2d', { willReadFrequently: true });
      const grab = (h = rows) => { sg.clearRect(0, 0, pw, ph); sg.drawImage(src, 0, 0, pw, ph); return sg.getImageData(0, 0, pw, h).data; };
      const differ = (a, b, tol = 16) => { let n = 0; for (let k = 0; k < a.length; k += 4) if (Math.abs(a[k] - b[k]) > tol || Math.abs(a[k + 1] - b[k + 1]) > tol || Math.abs(a[k + 2] - b[k + 2]) > tol) n++; return n / (a.length / 4); };
      // every 0.1s is rendered (errors, camera); every fifth frame is read back and compared with the one half a second earlier.
      // Golden runs are regression tests over many styles: they keep the error sweep and skip the pacing measurement.
      const measure = !withThumbs;
      const STEP = 0.1, EVERY = 5;
      let k = 0, prev = null;
      for (let i = 0, t = 0; t < TL.duration; i++, t = i * STEP) {
        while (k < shots.length - 1 && t >= shots[k].end) k++;
        try { window.renderFrame(t); } catch (e) { const s = TL.scenes.find((x) => t >= x.start && t < x.end); note(`${s ? s.id : '?'} @ ${t.toFixed(1)}s`, e); prev = null; continue; }
        const sh = shots[k];
        if (!sh) continue;
        const cam = window.lastCam();
        if (measure && i % EVERY === 0) { const px = grab(); if (prev && prev.k === k) { sh.change += differ(px, prev.px); sh.n++; } prev = { px, k }; }
        sh.cam = sh.cam ? { x0: Math.min(sh.cam.x0, cam.x), x1: Math.max(sh.cam.x1, cam.x), y0: Math.min(sh.cam.y0, cam.y), y1: Math.max(sh.cam.y1, cam.y), z0: Math.min(sh.cam.z0, cam.z), z1: Math.max(sh.cam.z1, cam.z) }
          : { x0: cam.x, x1: cam.x, y0: cam.y, y1: cam.y, z0: cam.z, z1: cam.z };
      }
      if (broken.length) return { broken };
      // frame use: how much of the frame the scene's own drawing changes, against an empty pass, averaged over three moments
      for (const sh of measure ? shots : []) {
        sh.cover = 0;
        for (const f of [0.25, 0.5, 0.75]) {
          const at = sh.start + (sh.end - sh.start) * f;
          window.renderFrame(at); const full = grab(ph);
          window.renderFrame(at, { empty: true }); sh.cover += differ(full, grab(ph), 6) / 3; // both passes share t, so a low tolerance is safe
        }
      }
      if (measure) pacing = shots.map((s) => ({ scene: s.scene, shot: s.shot, start: s.start, dur: s.end - s.start, cover: s.cover, change: s.n ? s.change / s.n : null, ownCam: s.ownCam,
        zoom: s.cam ? s.cam.z1 / s.cam.z0 - 1 : 0, pan: s.cam ? Math.hypot(s.cam.x1 - s.cam.x0, s.cam.y1 - s.cam.y0) : 0 }));
    }
    const picks = times.length ? times.map((t) => ({ t, label: `${t}s` }))
      : strip ? window.shotList().filter((s) => wanted(s.scene)).flatMap((s) => (wide ? [0.1, 0.5, 0.9] : [0.08, 0.36, 0.64, 0.92]).map((f) => { const t = +(s.start + (s.end - s.start) * f).toFixed(2); return { t, label: `${s.scene}#${s.shot} @ ${t}s` }; }))
      : TL.scenes.filter((s) => wanted(s.id)).flatMap((s) => at.map((f) => { const t = +(s.start + (s.end - s.start) * f).toFixed(2); return { t, label: `${s.id} @ ${t}s` }; }));
    const hash = async () => {
      const buf = await crypto.subtle.digest('SHA-1', g.getImageData(0, 0, src.width, src.height).data);
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
    };
    const tw = 320, th = Math.round((320 * src.height) / src.width);
    const thumb = document.createElement('canvas'); thumb.width = tw; thumb.height = th;
    // CPU-backed on purpose: a canvas switches GPU->CPU after its first readback, and the two paths scale differently
    const tg = thumb.getContext('2d', { willReadFrequently: true });
    const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    // a page holds 6 wide or 8 tall/square frames, so each frame stays large enough to read when the sheet is viewed whole;
    // in strip mode a row is one shot (3 frames wide, 4 tall/square), read left to right
    const [cols, cw, pageRows] = strip ? (wide ? [3, 640, 4] : [4, 320, 3]) : (wide ? [2, 960, 3] : [4, 400, 2]);
    const ch = Math.round((cw * src.height) / src.width), lh = 36;
    const perPage = cols * pageRows;
    const sheets = [];
    let b = null;
    const frames = [], thumbs = [], diffs = [];
    for (const [i, p] of picks.entries()) {
      if (i % perPage === 0) {
        const sheet = document.createElement('canvas');
        sheet.width = cols * cw; sheet.height = Math.ceil(Math.min(perPage, picks.length - i) / cols) * (ch + lh);
        b = sheet.getContext('2d');
        b.fillStyle = '#111'; b.fillRect(0, 0, sheet.width, sheet.height);
        sheets.push(sheet);
      }
      window.renderFrame(p.t);
      if (check) p.hash = await hash();
      // strips are for reading motion at a glance: only the sheets are written, not dozens of full-size PNGs
      frames.push({ label: p.label, data: strip ? null : src.toDataURL('image/png') });
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
      const j = i % perPage, x = (j % cols) * cw, y = Math.floor(j / cols) * (ch + lh);
      b.drawImage(src, x, y + lh, cw, ch);
      b.fillStyle = '#eee'; b.font = '22px Menlo, monospace'; b.textBaseline = 'middle';
      b.fillText(p.label, x + 12, y + lh / 2);
    }
    // purity: re-render in reverse order; a scene that keeps state between frames renders differently
    const impure = [];
    if (check) for (const p of [...picks].reverse()) { window.renderFrame(p.t); if ((await hash()) !== p.hash) impure.push(p.label); }
    return { broken, pacing, sheets: sheets.map((s) => s.toDataURL('image/png')), frames, impure, thumbs, diffs };
  }, { times, at, only, strip, check, withThumbs: !!golden, goldenIn });
  broken = result.broken;
  pacing = result.pacing || null;
}
if (pacing && pacing.length && !errors.length && !broken.length) {
  // pacing report: numbers for the things a contact sheet cannot show
  const pct = (x) => `${Math.round(x * 100)}%`, name = (s) => (pacing.some((x) => x.scene === s.scene && x.shot > 0) ? `${s.scene}#${s.shot}` : s.scene);
  const avg = (f) => pacing.reduce((a, s) => a + f(s), 0) / pacing.length;
  const total = pacing.reduce((a, s) => a + s.dur, 0);
  const moving = pacing.filter((s) => s.change !== null);
  const camWord = (s) => (s.zoom > 0.002 || s.pan > 2 ? `${s.ownCam ? 'own' : 'default'}: zoom ${(s.zoom * 100).toFixed(1)}%${s.pan > 2 ? `, travel ${Math.round(s.pan)}px` : ''}` : 'still');
  const table = ['shot                 start    holds   frame use   moving/0.5s   camera',
    ...pacing.map((s) => `${name(s).padEnd(20)} ${s.start.toFixed(1).padStart(6)}s ${s.dur.toFixed(1).padStart(6)}s ${pct(s.cover).padStart(9)} ${(s.change === null ? '-' : pct(s.change)).padStart(11)}     ${camWord(s)}`)].join('\n');
  writeFileSync(`${outDir}/pacing.txt`, `${table}\n\nholds = seconds the picture stays on one shot\nframe use = share of the frame the scene's own drawing covers (average of three moments in the shot)\nmoving/0.5s = share of the picture (above the subtitles) that differs from half a second earlier, averaged over the shot\n`);
  const top = (list, f, n = 4) => list.slice().sort((a, b) => f(b) - f(a)).slice(0, n);
  const longest = top(pacing, (s) => s.dur, 1)[0];
  console.log(`pacing: ${pacing.length} shots in ${total.toFixed(0)}s, average ${(total / pacing.length).toFixed(1)}s, longest ${longest.dur.toFixed(1)}s (${name(longest)})`);
  console.log(`  frame use ${pct(avg((s) => s.cover))} on average; ${moving.length ? `${pct(moving.reduce((a, s) => a + s.change, 0) / moving.length)} of the picture changes every half second` : 'shots too short to measure motion'}; ${pacing.filter((s) => s.ownCam).length} of ${pacing.length} shots have their own camera move`);
  const holds = top(pacing.filter((s) => s.dur > 6), (s) => s.dur), small = top(pacing.filter((s) => s.cover < 0.6), (s) => -s.cover), still = top(moving.filter((s) => s.change < 0.02), (s) => -s.change);
  if (holds.length) console.log(`  longest holds: ${holds.map((s) => `${name(s)} ${s.dur.toFixed(1)}s`).join(', ')}${pacing.filter((s) => s.dur > 6).length > holds.length ? ` (+${pacing.filter((s) => s.dur > 6).length - holds.length} more over 6s)` : ''}`);
  if (small.length) console.log(`  least of the frame used: ${small.map((s) => `${name(s)} ${pct(s.cover)}`).join(', ')}`);
  if (still.length) console.log(`  least motion: ${still.map((s) => `${name(s)} ${pct(s.change)}`).join(', ')}`);
  console.log(`  per-shot table -> ${outDir}/pacing.txt`);
}
if (!errors.length && !broken.length) {
  const tag = [style, cast && cast.replace(/[^\w]+/g, '_')].filter(Boolean).map((x) => `-${x}`).join('');
  const png = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
  // file names carry the time, so frames from an earlier run would otherwise pile up next to the new ones
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stale = new RegExp(`^(\\d+${esc}-[\\w.]+|sheet${esc}(-p\\d+)?)\\.png$`);
  for (const f of readdirSync(outDir)) if (stale.test(f)) rmSync(`${outDir}/${f}`);
  const sheetNames = result.sheets.map((_, i) => `${outDir}/sheet${tag}${result.sheets.length > 1 ? `-p${i + 1}` : ''}.png`);
  result.sheets.forEach((d, i) => writeFileSync(sheetNames[i], png(d)));
  result.frames.forEach((f, i) => f.data && writeFileSync(`${outDir}/${String(i).padStart(2, '0')}${tag}-${f.label.replace(/[^\w.]+/g, '_')}.png`, png(f.data)));
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
  const where = sheetNames.length > 1 ? `${sheetNames[0]} … ${sheetNames[sheetNames.length - 1].split('/').pop()}` : sheetNames[0];
  console.log(`${result.frames.length} frames -> ${where}${check && !impure.length ? ' (pure)' : ''}${worst !== null ? ` (golden max diff ${worst.toFixed(2)})` : ''}`);
}
await closeBrowser(browser);
if (errors.length) { console.error('page errors:\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
if (broken.length) { console.error(`${broken.length} scene error(s):\n` + broken.map((e) => '  ' + e).join('\n')); process.exit(1); }
if (impure.length) { console.error(`not a pure function of t (renders differ on repeat): ${impure.join(', ')}`); process.exit(1); }
if (mismatches.length) { console.error(`differs from golden (> ${GOLDEN_TOLERANCE}): ${mismatches.map((m) => `${m.label}${m.missing ? ' (missing)' : ` ${m.diff.toFixed(2)}`}`).join(', ')}\n  if the change is intended: rerun with --update-golden`); process.exit(1); }
