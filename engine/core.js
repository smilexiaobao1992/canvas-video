/* canvas-video engine core.
 * Plain script (no ES modules) so the page works when opened from file://.
 * Contract: every frame is a pure function of time t. Scenes never keep state between frames.
 */
// canvas size comes from the timeline ("format" in script.json): 16:9 1920x1080, 9:16 1080x1920, 1:1 1080x1080
const W = (window.TIMELINE && window.TIMELINE.width) || 1920, H = (window.TIMELINE && window.TIMELINE.height) || 1080;
const CANVAS = document.getElementById('c');
CANVAS.width = W; CANVAS.height = H;
// snapshots read pixels back constantly; a CPU-backed canvas keeps them bit-stable across runs
const MAIN = CANVAS.getContext('2d', { willReadFrequently: new URLSearchParams(location.search).has('snap') });
const ASPECT = W / H > 1.2 ? 'wide' : W / H < 0.8 ? 'tall' : 'square';
// screen-space layout for pinned elements; SAFE is the area scenes should keep important content in
const LAYOUT = {
  wide:   { tag: { x: 80, y: 110, size: 72, sub: 34 }, hud: { x: W - 130, y: 138 }, logo: { x: W - 110, y: 58 }, sub: { y: H - 60, maxW: W - 400, lines: 2, scale: 1 }, safe: { x0: 80, y0: 200, x1: W - 80, y1: H - 140 } },
  square: { tag: { x: 60, y: 100, size: 60, sub: 30 }, hud: { x: W - 100, y: 128 }, logo: { x: W - 80, y: 52 }, sub: { y: H - 70, maxW: W - 160, lines: 2, scale: 1.1 }, safe: { x0: 60, y0: 180, x1: W - 60, y1: H - 170 } },
  tall:   { tag: { x: 64, y: 170, size: 66, sub: 32 }, hud: { x: W - 90, y: 250 }, logo: { x: W - 70, y: 100 }, sub: { y: H * 0.84, maxW: W - 160, lines: 3, scale: 1.25 }, safe: { x0: 60, y0: 320, x1: W - 60, y1: H * 0.7 } },
}[ASPECT];
const SAFE = LAYOUT.safe;
let ctx = MAIN; // primitives always draw into `ctx`; transitions may swap it to an offscreen canvas

// ---------- styles ----------
const STYLES = {};
let STYLE = null;
let C = {}; // active palette (semantic roles), switched per scene
const STYLE_DEFAULTS = {
  dark: false,
  fonts: { body: '"PingFang SC", sans-serif', title: null, mono: 'Menlo, monospace' },
  line: { wobble: 0, mode: 'clean', glowBlur: 16, pencil: 'rgba(0, 0, 0, 0.25)' },
  shadow: 'none', // 'hatch' | 'soft' | 'hard' | 'none'
  hatch: { rgb: '0, 0, 0', spacing: 7 },
  hardShadow: { alpha: 0.35, blur: 0 },
  pixelate: 0, // > 1: render the frame at 1/N resolution and upscale without smoothing
  texture: { grain: 0, vignette: null },
  transition: 'fade', // see TRANSITIONS below and in motion.js
  subtitle: { size: 36, color: null, plate: false },
  background(b, w, h, P) { b.fillStyle = P.bg; b.fillRect(0, 0, w, h); },
  overlay: null,
};
function registerStyle(name, def) {
  const s = { ...STYLE_DEFAULTS, ...def, name };
  for (const k of ['fonts', 'line', 'hatch', 'hardShadow', 'texture', 'subtitle']) s[k] = { ...STYLE_DEFAULTS[k], ...(def[k] || {}) };
  s.fonts.title = s.fonts.title || s.fonts.body;
  STYLES[name] = s;
}
function useStyle(name) {
  const s = STYLES[name];
  if (!s) throw new Error(`unknown style "${name}"; available: ${Object.keys(STYLES).join(', ')}`);
  STYLE = s; C = s.palette;
  return s;
}

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// exact 0 at t<=0: the raw formula returns ~1e-16 there, which makes `> 0` checks fire early
const easeOutBack = (t) => { if (t <= 0) return 0; const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const frac = (x) => x - Math.floor(x);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const typed = (str, p) => { const cs = [...str]; return cs.slice(0, Math.floor(cs.length * clamp(p) + 1e-6)).join(''); };
const bz = ([a, b, c, d], t) => {
  const u = 1 - t;
  return {
    x: u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    y: u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  };
};
// lighten (amount > 0) or darken (amount < 0) a hex color; amount in -1..1
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
}
function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// ---------- text ----------
const font = (size, weight = 400, role = 'body') => `${weight} ${size}px ${STYLE.fonts[role]}`;
function text(str, x, y, o = {}) {
  const { size = 40, color = C.ink, align = 'center', baseline = 'middle', weight = 400, alpha = 1, role = 'body' } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(size, weight, role); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  ctx.restore();
}
function measure(str, size, weight = 400, role = 'body') { ctx.font = font(size, weight, role); return ctx.measureText(str).width; }

// ---------- lines ----------
// low-frequency noise that makes lines look hand drawn (amplitude = STYLE.line.wobble)
const wob = (x, y) => Math.sin(x * 0.045 + y * 0.031) * 0.6 + Math.sin(x * 0.017 - y * 0.052 + 1.3) * 0.4;
const wobPt = (x, y) => { const a = STYLE.line.wobble; return a ? [x + a * wob(x, y), y + a * wob(y + 37, x)] : [x, y]; };

// strokes the current path in the style's line mode
function strokeInk() {
  const L = STYLE.line;
  ctx.save();
  if (L.mode === 'glow') { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = L.glowBlur; ctx.stroke(); }
  else if (L.mode === 'pencil') { ctx.shadowColor = L.pencil; ctx.shadowOffsetX = 1.8; ctx.shadowOffsetY = 1.4; ctx.stroke(); }
  else if (L.mode === 'brush') {
    // ink bleed halo, main stroke, then a broken dry-brush pass
    const lw = ctx.lineWidth, dashed = ctx.getLineDash().length > 0;
    ctx.save(); ctx.filter = 'blur(3px)'; ctx.globalAlpha *= 0.3; ctx.lineWidth = lw * 2.2; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.lineWidth = lw * 1.15; ctx.globalAlpha *= 0.92; ctx.stroke(); ctx.restore();
    if (!dashed) { ctx.setLineDash([18, 4, 7, 5]); ctx.lineDashOffset = 3; ctx.lineWidth = lw * 0.5; ctx.globalAlpha *= 0.5; ctx.stroke(); }
  }
  else if (L.mode === 'chalk') {
    ctx.globalAlpha *= 0.88; ctx.stroke();
    if (ctx.getLineDash().length === 0) { ctx.setLineDash([2, 5, 1, 7]); ctx.lineWidth *= 1.5; ctx.globalAlpha *= 0.4; ctx.stroke(); }
  } else ctx.stroke();
  ctx.restore();
}
function strokeSamples(pts, o = {}) {
  if (pts.length < 2) return;
  const { color = C.ink, width = 3, dash = null, dashOffset = 0, alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOffset; }
  ctx.beginPath();
  pts.forEach((p, i) => { const [x, y] = wobPt(p.x, p.y); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  strokeInk();
  ctx.restore();
}
// sample a parametric curve fn(u) -> {x, y} for u in 0..p
function samplePath(fn, p, n = 80) {
  const pts = [];
  const steps = Math.max(2, Math.ceil(n * p));
  for (let i = 0; i <= steps; i++) pts.push(fn((i / steps) * p));
  return pts;
}
function arrowHead(x, y, angle, size = 18, color = C.ink, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-size, -size * 0.6); ctx.lineTo(0, 0); ctx.lineTo(-size, size * 0.6); strokeInk();
  ctx.restore();
}
// draws fn from 0..p with an arrow head at the moving tip
function pathWithArrow(fn, p, o = {}) {
  if (p <= 0) return;
  const pts = samplePath(fn, p);
  strokeSamples(pts, o);
  if (o.head !== false && pts.length > 2) {
    const a = pts[pts.length - 1], b = pts[pts.length - 3];
    arrowHead(a.x, a.y, Math.atan2(a.y - b.y, a.x - b.x), o.headSize || 18, o.color || C.ink, o.alpha ?? 1);
  }
}

// ---------- shapes ----------
// rounded rect path (r: number or [tl, tr, br, bl]); wobbly when the style asks for it
function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (w <= 0 || h <= 0) return;
  if (!STYLE.line.wobble) { ctx.roundRect(x, y, w, h, r); return; }
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.min(v, w / 2, h / 2));
  const pts = [];
  const seg = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const arc = (cx, cy, rad, a0) => {
    if (rad <= 0) { pts.push([cx, cy]); return; }
    const n = Math.max(3, Math.ceil(rad / 4));
    for (let i = 0; i < n; i++) { const a = a0 + (Math.PI / 2) * (i / n); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  };
  seg(x + tl, y, x + w - tr, y); arc(x + w - tr, y + tr, tr, -Math.PI / 2);
  seg(x + w, y + tr, x + w, y + h - br); arc(x + w - br, y + h - br, br, 0);
  seg(x + w - br, y + h, x + bl, y + h); arc(x + bl, y + h - bl, bl, Math.PI / 2);
  seg(x, y + h - bl, x, y + tl); arc(x + tl, y + tl, tl, Math.PI);
  pts.forEach(([px, py], i) => { const [qx, qy] = wobPt(px, py); if (i === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy); });
  ctx.closePath();
}
function hatchFill(alpha, spacing, x, y, w, h) {
  ctx.strokeStyle = `rgba(${STYLE.hatch.rgb}, ${alpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = -h; i < w; i += spacing) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); }
  ctx.stroke();
}
// drop shadow for a box; pass the box already offset (e.g. x + 8, y + 10). Look depends on STYLE.shadow
function shadowRect(x, y, w, h, r, alpha = 0.32) {
  if (w <= 0 || h <= 0 || STYLE.shadow === 'none') return;
  ctx.save();
  if (STYLE.shadow === 'hatch') { rr(x, y, w, h, r); ctx.clip(); hatchFill(alpha, STYLE.hatch.spacing, x, y, w, h); }
  else if (STYLE.shadow === 'hard') {
    const hs = STYLE.hardShadow;
    if (hs.blur) ctx.filter = `blur(${hs.blur}px)`;
    rr(x, y, w, h, r); ctx.fillStyle = `rgba(${STYLE.hatch.rgb}, ${hs.alpha})`; ctx.fill();
  } else { ctx.filter = 'blur(10px)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = `rgba(${STYLE.hatch.rgb}, ${alpha * 0.45})`; ctx.fill(); }
  ctx.restore();
}
// hatched shading inside a shape; only drawn by hatching styles
function hatchShade(x, y, w, h, r, alpha = 0.18) {
  if (STYLE.shadow !== 'hatch') return;
  ctx.save(); rr(x, y, w, h, r); ctx.clip(); hatchFill(alpha, 7, x, y, w, h); ctx.restore();
}
function sparkle(x, y, s, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const star = () => {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.7); ctx.quadraticCurveTo(x, y, x + s * 1.7, y); ctx.quadraticCurveTo(x, y, x, y + s * 1.7);
    ctx.quadraticCurveTo(x, y, x - s * 1.7, y); ctx.quadraticCurveTo(x, y, x, y - s * 1.7);
    ctx.fill();
  };
  if (STYLE.dark) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.4);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; star();
  } else { ctx.fillStyle = color; star(); }
  ctx.restore();
}
function drawCheck(x, y, s, p, color = C.ok) {
  if (p <= 0) return;
  const f = (u) => (u < 0.35 ? { x: x - s * 0.5 + (u / 0.35) * s * 0.35, y: y + (u / 0.35) * s * 0.35 } : { x: x - s * 0.15 + ((u - 0.35) / 0.65) * s * 0.75, y: y + s * 0.35 - ((u - 0.35) / 0.65) * s * 0.8 });
  strokeSamples(samplePath(f, p, 30), { color, width: s * 0.14 });
}
function drawCross(x, y, s, p, color = C.bad) {
  if (p <= 0) return;
  const p1 = clamp(p * 2), p2 = clamp(p * 2 - 1);
  strokeSamples([{ x: x - s / 2, y: y - s / 2 }, { x: x - s / 2 + s * p1, y: y - s / 2 + s * p1 }], { color, width: s * 0.13 });
  if (p2 > 0) strokeSamples([{ x: x + s / 2, y: y - s / 2 }, { x: x + s / 2 - s * p2, y: y - s / 2 + s * p2 }], { color, width: s * 0.13 });
}
function drawGround(y, x0 = 0, x1 = W, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (STYLE.shadow === 'hatch') {
    const r = mulberry32(3);
    ctx.strokeStyle = withAlpha(C.muted, 0.45); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x < x1; x += 7) { const len = 10 + r() * 55; ctx.moveTo(x, y + 6); ctx.lineTo(x + r() * 3, y + 6 + len); }
    ctx.stroke();
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); strokeInk();
  ctx.restore();
}

// ---------- components ----------
function tokW(label, size = 36, pad = 16) { return Math.max(size * 1.4, measure(label, size) + pad * 2); }
// centered box with a label; returns its width
function drawToken(cx, cy, label, o = {}) {
  const { size = 36, pad = 16, h = size * 1.75, fill = C.surface, stroke = C.ink, textColor = C.ink, alpha = 1, sy = 1, sx = 1, lw = 3, boxAlpha = 1, w = null, shadow = true } = o;
  const tw = w ?? tokW(label, size, pad);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy); ctx.scale(sx, sy);
  if (boxAlpha > 0) {
    ctx.save(); ctx.globalAlpha *= boxAlpha;
    if (shadow) shadowRect(-tw / 2 + 7, -h / 2 + 8, tw, h, 12);
    rr(-tw / 2, -h / 2, tw, h, 12);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; strokeInk();
    ctx.restore();
  }
  text(label, 0, 2, { size, color: textColor });
  ctx.restore();
  return tw;
}
// horizontal row of token boxes centered on cx -> [{x, w}]
function rowLayout(labels, size, pad, gap, cx) {
  const ws = labels.map((l) => tokW(l, size, pad));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
  let x = cx - total / 2;
  return ws.map((w) => { const c = x + w / 2; x += w + gap; return { x: c, w }; });
}
// speech bubble centered on (cx, cy) with its tail pointing at tail {x, y}
function drawBubble(cx, cy, w, h, tail, o = {}) {
  const { alpha = 1, scale = 1, fill = C.surface, stroke = C.ink } = o;
  if (scale <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy); ctx.scale(scale, scale);
  const tx = tail.x - cx, ty = tail.y - cy;
  const baseX = clamp(tx, -w / 2 + 40, w / 2 - 70);
  shadowRect(-w / 2 + 10, -h / 2 + 12, w, h, 26);
  rr(-w / 2, -h / 2, w, h, 26);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 3.5; strokeInk();
  ctx.beginPath();
  ctx.moveTo(baseX, h / 2 - 2); ctx.lineTo(tx, ty); ctx.lineTo(baseX + 36, h / 2 - 2);
  ctx.fillStyle = fill; ctx.fill();
  strokeInk();
  ctx.fillRect(baseX + 3, h / 2 - 6, 30, 6);
  ctx.restore();
}

// ---------- screen-pinned elements (ignore the scene camera) ----------
function pinned(fn) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); fn(); ctx.restore(); }
// top-left chapter title with typed text and a hand-drawn underline; p = 0..1 reveal
function drawTag(big, small, p) {
  if (p <= 0) return;
  pinned(() => {
    const { x, y, size, sub } = LAYOUT.tag;
    text(typed(big, p * 1.8), x, y, { size, align: 'left', role: 'title' });
    const w = measure(big, size, 400, 'title');
    // subtitle sits to the right on wide screens, under the title on narrow ones
    const [sx, sy] = ASPECT === 'wide' ? [x + w + 24, y + 12] : [x, y + size * 1.25];
    text(typed(small, (p - 0.45) / 0.55), sx, sy, { size: sub, color: C.note, align: 'left' });
    const u = easeOut(prog(p, 0.35, 1));
    const uy = y + size * 0.7;
    if (u > 0) strokeSamples(samplePath((k) => ({ x: x - 2 + k * (w + 8), y: uy - Math.sin(k * Math.PI) * 4 + k * 3 }), u, 30), { color: C.ink, width: 3.5 });
  });
}
// meter bar with ticks and a percentage label
function drawProgress(x, y, w, value, label) {
  pinned(() => {
    rr(x, y, w, 30, 4); ctx.fillStyle = C.surface; ctx.fill();
    rr(x, y, w * clamp(value), 30, 4); ctx.fillStyle = C.ok; ctx.fill();
    rr(x, y, w, 30, 4); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; strokeInk();
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const tx = x + (w * i) / 20; ctx.moveTo(tx, y + 36); ctx.lineTo(tx, y + (i % 5 ? 42 : 48)); }
    ctx.stroke();
    text(`${label} ${Math.round(value * 100)}%`, x + w + 20, y + 16, { size: 36, color: C.ok, align: 'left' });
  });
}

// ---------- background helpers (for style.background) ----------
// faint construction guides: rings, dashed rules, crosshairs
function bgGuides(b, color) {
  b.save();
  b.strokeStyle = color; b.lineWidth = 1.5;
  for (const r of [300, 420, 560]) { b.beginPath(); b.arc(W * 0.66, H * 0.48, r, 0, Math.PI * 2); b.stroke(); }
  b.setLineDash([8, 12]); b.beginPath(); b.moveTo(0, H * 0.66); b.lineTo(W, H * 0.66); b.moveTo(W * 0.2, 0); b.lineTo(W * 0.2, H); b.stroke(); b.setLineDash([]);
  for (const [x, y] of [[W * 0.073, H * 0.24], [W * 0.927, H * 0.22], [W * 0.917, H * 0.83], [W * 0.083, H * 0.815]]) { b.beginPath(); b.moveTo(x - 12, y); b.lineTo(x + 12, y); b.moveTo(x, y - 12); b.lineTo(x, y + 12); b.stroke(); }
  b.restore();
}
// scattered specks (paper fibres, chalk dust, star field)
function bgDust(b, rgb, r, n = 6000, maxAlpha = 0.06, size = 1.6) {
  for (let i = 0; i < n; i++) { b.fillStyle = `rgba(${rgb}, ${r() * maxAlpha})`; b.fillRect(r() * W, r() * H, size, size); }
}

// ---------- caches: backgrounds, vignette, grain ----------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const BG_CACHE = {}, VIG_CACHE = {};
function bgOf(s) {
  if (!BG_CACHE[s.name]) { const c = makeCanvas(W, H); s.background(c.getContext('2d'), W, H, s.palette, mulberry32(7)); BG_CACHE[s.name] = c; }
  return BG_CACHE[s.name];
}
function vignetteOf(s) {
  if (!s.texture.vignette) return null;
  if (!VIG_CACHE[s.name]) {
    const c = makeCanvas(W, H), b = c.getContext('2d');
    const g = b.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)'); g.addColorStop(1, s.texture.vignette);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    VIG_CACHE[s.name] = c;
  }
  return VIG_CACHE[s.name];
}
const GRAIN = (() => {
  const c = makeCanvas(256, 256), b = c.getContext('2d');
  const img = b.createImageData(256, 256), r = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r() * 40;
  }
  b.putImageData(img, 0, 0);
  return c;
})();
const GRAIN_PATTERNS = new WeakMap();
function drawGrain(t, s) {
  if (!s.texture.grain) return;
  if (!GRAIN_PATTERNS.has(ctx)) GRAIN_PATTERNS.set(ctx, ctx.createPattern(GRAIN, 'repeat'));
  const r = mulberry32(Math.floor(t * 12) + 1);
  const ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
  ctx.save();
  ctx.globalAlpha = s.texture.grain / 40;
  ctx.fillStyle = GRAIN_PATTERNS.get(ctx);
  ctx.translate(-ox, -oy);
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

// ---------- scene runtime ----------
let SCENE_LIST = [], SCENE_FNS = {}, CAM_FNS = {}, TL = null, CUR_SCENE = null;
const OFF = makeCanvas(W, H), OFF_CTX = OFF.getContext('2d');

function drawScene(S, lt, t) {
  const s = useStyle(S.style);
  CUR_SCENE = S;
  ctx.drawImage(bgOf(s), 0, 0);
  ctx.save();
  // scene camera: focus point + zoom; default is a slow push-in
  const cam = CAM_FNS[S.id] ? CAM_FNS[S.id](lt, S) : { x: W / 2, y: H / 2, z: 1 + 0.035 * easeInOut(clamp(lt / S.dur)) };
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  SCENE_FNS[S.id](lt, S, t);
  ctx.restore();
}

// helpers for transitions that need the previous or next frame as an image
const PREV = makeCanvas(W, H);
function grabPrev() { const b = PREV.getContext('2d'); b.clearRect(0, 0, W, H); b.drawImage(ctx.canvas, 0, 0); return PREV; }
function renderOff(drawNext) { const prev = ctx; ctx = OFF_CTX; ctx.reset(); drawNext(); ctx = prev; return OFF; }

// each transition reveals the incoming scene (drawNext) over the frozen last frame of the previous one (already on ctx)
const TRANSITIONS = {
  wipe(drawNext, wp) {
    const ex = lerp(-360, W + 360, wp);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-400, 0); ctx.lineTo(ex + 300, 0); ctx.lineTo(ex - 300, H); ctx.lineTo(-400, H); ctx.closePath();
    ctx.clip(); drawNext(); ctx.restore();
    strokeSamples([{ x: ex + 300, y: -10 }, { x: ex - 300, y: H + 10 }], { color: C.ink, width: 5 });
  },
  erase(drawNext, wp) {
    const ex = lerp(-260, W + 260, wp);
    const edge = [];
    for (let y = -20; y <= H + 20; y += 30) edge.push({ x: ex + Math.sin(y * 0.045) * 40 + Math.sin(y * 0.13) * 14 - (y / H) * 120, y });
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-400, -20);
    edge.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(-400, H + 20); ctx.closePath();
    ctx.clip(); drawNext(); ctx.restore();
    ctx.save();
    ctx.filter = 'blur(14px)'; ctx.strokeStyle = withAlpha(C.ink, 0.16); ctx.lineWidth = 70;
    ctx.beginPath(); edge.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.restore();
  },
  // ink blot spreading from the center with a noisy edge
  blot(drawNext, wp) {
    const R = Math.hypot(W, H) * 0.62 * wp;
    const pts = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      const r = R * (1 + 0.12 * Math.sin(5 * a + 1.3) + 0.06 * Math.sin(11 * a + wp * 4) + 0.04 * Math.sin(23 * a));
      pts.push({ x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r * 0.8 });
    }
    const trace = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
    ctx.save(); trace(); ctx.clip(); drawNext(); ctx.restore();
    ctx.save(); ctx.filter = 'blur(10px)'; ctx.strokeStyle = withAlpha(C.ink, 0.28 * (1 - wp)); ctx.lineWidth = 36; trace(); ctx.stroke(); ctx.restore();
  },
  // new scene slides up like a sheet of paper laid on top
  slide(drawNext, wp) {
    const y = (1 - wp) * H;
    ctx.save();
    const g = ctx.createLinearGradient(0, y - 40, 0, y);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)'); g.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 40, W, 40);
    ctx.beginPath(); ctx.rect(0, y, W, H - y); ctx.clip();
    ctx.translate(0, y);
    drawNext();
    ctx.restore();
  },
  // blocks of the new scene appear in a seeded random order
  dissolve(drawNext, wp) {
    const cols = 32, rows = Math.round((32 * H) / W), bw = W / cols, bh = H / rows, r = mulberry32(5);
    ctx.save(); ctx.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (r() < wp) ctx.rect(i * bw, j * bh, bw + 0.5, bh + 0.5);
    ctx.clip(); drawNext(); ctx.restore();
  },
  fade(drawNext, wp) {
    const next = renderOff(drawNext);
    ctx.save(); ctx.globalAlpha = wp; ctx.drawImage(next, 0, 0); ctx.restore();
  },
};

function drawLogo() {
  if (!TL.brand) return;
  ctx.save();
  const { x, y } = LAYOUT.logo;
  ctx.translate(x, y);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  text(TL.brand, 0, 0, { size: 34, align: 'right', weight: 700, role: 'title' });
  ctx.restore();
  const w = measure(TL.brand, 34, 700, 'title');
  strokeSamples(samplePath((u) => ({ x: x - 6 - w + u * (w + 8), y: y + 26 - Math.sin(u * Math.PI) * 5 + u * 2 }), 1, 20), { color: C.ok, width: 3 });
}
function drawHud(i, S, lt) {
  if (!TL.hud) return;
  const { x, y } = LAYOUT.hud;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.muted; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = C.bad; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(lt / S.dur)); ctx.stroke();
  ctx.fillStyle = C.bad; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  text(`${i + 1} · ${S.title}`, x - 32, y + 1, { size: 22, color: C.note, align: 'right' });
}
// split text into wrap units: one CJK char, or a latin word with its trailing space; closing punctuation sticks to the unit before it
const NO_LINE_START = /^[，。、！？；：,.!?;:）)》」』”’…—]$/;
const SEGMENTER = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'word' }) : null;
function wrapUnits(str) {
  const units = [];
  // word segmentation keeps Chinese words like 画面 together; fall back to single characters
  const pieces = SEGMENTER ? [...SEGMENTER.segment(str)].map((x) => x.segment) : str.match(/[A-Za-z0-9_'’.-]+\s*|\s+|./gu) || [];
  for (const m of pieces) {
    if (units.length && NO_LINE_START.test(m.trim())) units[units.length - 1] += m;
    else units.push(m);
  }
  return units;
}
// greedy wrap into lines no wider than maxW, then rebalance so lines have similar widths
function wrapText(str, size, maxW, weight = 400) {
  const units = wrapUnits(str);
  const fill = (limit, pref = true) => {
    const lines = [];
    let cur = '';
    for (const u of units) {
      if (cur && measure(cur + u, size, weight) > limit) {
        // prefer breaking after punctuation when it sits in the back part of the line
        const cs = [...cur], k = Math.max(...[...'，。、！？；：,.!?;:'].map((c) => cs.lastIndexOf(c)));
        if (pref && k > cs.length * 0.55 && k < cs.length - 1) { lines.push(cs.slice(0, k + 1).join('')); cur = cs.slice(k + 1).join('').trimStart() + u; }
        else { lines.push(cur); cur = u.trimStart(); }
      } else cur += u;
    }
    if (cur) lines.push(cur);
    return lines.map((l) => l.trimEnd());
  };
  const lines = fill(maxW, false);
  if (lines.length < 2) return lines;
  // narrowest limit that keeps the same line count gives balanced lines; punctuation breaks win when they fit
  const lo = measure(str, size, weight) / lines.length;
  for (const pref of [true, false]) for (let lim = lo; lim <= maxW; lim += 12) { const t = fill(lim, pref); if (t.length === lines.length) return t; }
  return lines;
}
// per-character [start, end] times (relative to the line) from the TTS word boundaries
function charTimes(line) {
  if (line._chars) return line._chars;
  const chars = [...line.text], out = new Array(chars.length).fill(null);
  let cursor = 0;
  for (const w of line.words || []) {
    const wc = [...w.text.trim()];
    if (!wc.length) continue;
    const idx = findChars(chars, wc, cursor);
    if (idx < 0) continue;
    wc.forEach((_, j) => { out[idx + j] = [lerp(w.s, w.e, j / wc.length), lerp(w.s, w.e, (j + 1) / wc.length)]; });
    cursor = idx + wc.length;
  }
  // punctuation and anything unmatched inherits the time of the previous character
  let last = [0, 0];
  for (let i = 0; i < out.length; i++) { if (out[i]) last = out[i]; else out[i] = [last[1], last[1]]; }
  line._chars = out;
  return out;
}
function findChars(chars, wc, from) {
  const lower = (c) => c.toLowerCase();
  for (let i = from; i <= chars.length - wc.length; i++) if (wc.every((c, j) => lower(chars[i + j]) === lower(c))) return i;
  return -1;
}
function drawSubtitle(t) {
  const l = TL.lines.find((x) => t >= x.start && t < x.end + 0.25);
  if (!l) return;
  const st = STYLE.subtitle, L = LAYOUT.sub;
  let size = Math.round(st.size * L.scale), lines = wrapText(l.text, size, L.maxW);
  while (lines.length > L.lines && size > 20) { size = Math.round(size * 0.9); lines = wrapText(l.text, size, L.maxW); }
  const lh = size * 1.35, y0 = L.y - (lines.length - 1) * lh;
  const color = st.color || C.ink;
  if (st.plate) {
    const w = Math.max(...lines.map((x) => measure(x, size))) + 56;
    ctx.save(); ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y0 - size * 0.95, w, (lines.length - 1) * lh + size * 1.9, 12);
    ctx.fillStyle = withAlpha(C.bg, 0.78); ctx.fill(); ctx.restore();
  }
  const highlight = TL.subtitles && TL.subtitles.highlight && l.words;
  const times = highlight ? charTimes(l) : null;
  let spoken = Infinity;
  if (highlight) { const lt = t - l.start; spoken = times.filter(([s]) => s <= lt).length; }
  const chars = [...l.text];
  let k = 0;
  lines.forEach((ln, i) => {
    const y = y0 + i * lh, lc = [...ln];
    if (!highlight) { text(ln, W / 2, y, { size, color }); return; }
    // locate this wrapped line inside the original text (wrapping drops the spaces it broke on)
    const start = Math.max(k, findChars(chars, lc, k));
    const x0 = W / 2 - measure(ln, size) / 2;
    const done = clamp(spoken - start, 0, lc.length);
    text(ln, x0, y, { size, color: withAlpha(color, 0.38), align: 'left' });
    if (done > 0) text(lc.slice(0, done).join(''), x0, y, { size, color, align: 'left' });
    k = start + lc.length;
  });
}

const PIX = makeCanvas(W, H), PIX_CTX = PIX.getContext('2d');
function pixelateFrame(n) {
  const w = Math.round(W / n), h = Math.round(H / n);
  PIX_CTX.imageSmoothingEnabled = true;
  PIX_CTX.clearRect(0, 0, w, h);
  PIX_CTX.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(PIX, 0, 0, w, h, 0, 0, W, H); ctx.restore();
}
function sceneIndexAt(t) { const i = SCENE_LIST.findIndex((s) => t < s.end); return i < 0 ? SCENE_LIST.length - 1 : i; }
function render(t) {
  ctx = MAIN;
  ctx.reset(); // clears pixels and every piece of state (transform, clip, filter, composite, shadow, dash)
  const i = sceneIndexAt(t);
  const S = SCENE_LIST[i];
  const lt = t - S.start;
  const tr = S.transition;
  const wp = i > 0 ? easeInOut(prog(lt, 0, S.tdur)) : 1;
  if (wp < 1 && tr !== 'cut') {
    const P = SCENE_LIST[i - 1];
    drawScene(P, P.dur - 0.001, P.end - 0.001);
    TRANSITIONS[tr](() => drawScene(S, lt, t), wp);
  } else drawScene(S, lt, t);
  const s = useStyle(S.style);
  const fade = i === 0 ? prog(lt, 0, 0.4) : S.last ? 1 - prog(lt, S.dur - 1.0, S.dur) : 1;
  if (fade < 1) { ctx.globalAlpha = 1 - fade; ctx.drawImage(bgOf(s), 0, 0); ctx.globalAlpha = 1; }
  if (s.overlay) { ctx.save(); s.overlay(ctx, t, C); ctx.restore(); }
  if (s.pixelate > 1) pixelateFrame(s.pixelate);
  drawGrain(t, s);
  const vig = vignetteOf(s);
  if (vig) ctx.drawImage(vig, 0, 0);
  drawLogo();
  drawHud(i, S, lt);
  drawSubtitle(t);
  return S;
}

// ---------- boot: preview UI + export hooks ----------
function boot({ scenes, cams, sfx } = {}) {
  // SCENES / CAMS / SFX declared with const in scenes.js share the global lexical scope, so they can be picked up by name
  scenes = scenes || SCENES;
  cams = cams || (typeof CAMS !== 'undefined' ? CAMS : {});
  sfx = sfx || (typeof SFX !== 'undefined' ? SFX : {});
  TL = window.TIMELINE;
  if (!TL) throw new Error('timeline.js is missing — run `node scripts/tts.mjs` first');
  const params = new URLSearchParams(location.search);
  const forced = params.get('style');
  // ?cast=host:cat,student:person overrides the script's cast for every scene
  const castOverride = Object.fromEntries((params.get('cast') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));
  SCENE_FNS = scenes; CAM_FNS = cams;
  SCENE_LIST = TL.scenes.map((s, i) => {
    const lines = TL.lines.filter((l) => l.scene === s.id);
    const style = forced || s.style || TL.style || 'paper';
    if (!STYLES[style]) throw new Error(`scene "${s.id}" uses unknown style "${style}"; available: ${Object.keys(STYLES).join(', ')}`);
    if (!scenes[s.id]) throw new Error(`scenes.js has no function for scene "${s.id}"`);
    const cast = resolveCast({ ...(TL.cast || {}), ...(s.cast || {}) }, castOverride, s.id);
    const transition = s.transition || STYLES[style].transition;
    if (!TRANSITIONS[transition] && transition !== 'cut') throw new Error(`scene "${s.id}" uses unknown transition "${transition}"; available: ${Object.keys(TRANSITIONS).join(', ')}, cut`);
    const line = (k) => {
      if (!lines[k]) throw new Error(`scene "${s.id}" has no narration line ${k} (it has ${lines.length})`);
      return lines[k];
    };
    // time (relative to the scene) of `str` inside narration line k; nth picks a later occurrence
    const wordAt = (k, str, nth, edge) => {
      const l = line(k), chars = [...l.text], wc = [...str];
      let idx = -1;
      for (let n = 0, from = 0; n <= nth; n++, from = idx + 1) { idx = findChars(chars, wc, from); if (idx < 0) break; }
      if (idx < 0) throw new Error(`scene "${s.id}" line ${k} does not contain "${str}" (occurrence ${nth}); text: ${l.text}`);
      const ct = charTimes(l);
      return l.start - s.start + (edge === 'e' ? ct[idx + wc.length - 1][1] : ct[idx][0]);
    };
    return {
      ...s, style, lines, cast, transition, tdur: s.transitionDuration ?? 0.6, dur: s.end - s.start, last: i === TL.scenes.length - 1,
      word: (k, str, nth = 0) => wordAt(k, str, nth, 's'),
      wordEnd: (k, str, nth = 0) => wordAt(k, str, nth, 'e'),
      words: (k) => (line(k).words || []).map((w) => ({ text: w.text, s: w.s + line(k).start - s.start, e: w.e + line(k).start - s.start })),
      // true while a narration line of this scene is being spoken (drive talking mouths with it)
      speaking: (lt) => lines.some((l) => lt >= l.start - s.start && lt < l.end - s.start),
      L: (k) => ({ s: line(k).start - s.start, e: line(k).end - s.start }),
    };
  });

  // sound-effect cues in absolute seconds: scene SFX functions plus an automatic whoosh on every transition
  window.collectCues = () => {
    const cues = [];
    const auto = !(TL.audio && TL.audio.transitionSfx === false);
    SCENE_LIST.forEach((S, i) => {
      if (auto && i > 0 && S.transition !== 'cut') cues.push({ at: S.start, sound: S.transition === 'glitch' ? 'glitch' : 'whoosh', volume: 0.7 });
      if (sfx[S.id]) for (const c of sfx[S.id](S)) {
        if (!c.sound || !Number.isFinite(c.at)) throw new Error(`SFX for scene "${S.id}" must return [{ at, sound }]`);
        cues.push({ ...c, at: S.start + c.at });
      }
    });
    return cues.sort((a, b) => a.at - b.at);
  };

  const unknown = Object.keys(scenes).filter((id) => !TL.scenes.some((s) => s.id === id));
  if (unknown.length) console.warn(`scenes.js defines scenes not in script.json: ${unknown.join(', ')}`);

  if (params.has('export')) document.body.classList.add('export');
  const audio = document.getElementById('voice');
  // the full mix (voice + music + sfx) is written by scripts/mix.mjs; before that exists, preview the bare voice
  audio.src = 'audio.wav';
  audio.onerror = () => { if (!audio.src.endsWith('voice.wav')) audio.src = 'voice.wav'; };
  const seek = document.getElementById('seek');
  const playBtn = document.getElementById('play');
  const timeLbl = document.getElementById('time');
  const sceneLbl = document.getElementById('scene');
  const styleSel = document.getElementById('style');
  seek.max = TL.duration;
  let cur = parseFloat(params.get('t') || '0');
  let playing = false;

  styleSel.innerHTML = ['<option value="">script styles</option>', ...Object.keys(STYLES).map((n) => `<option ${n === forced ? 'selected' : ''}>${n}</option>`)].join('');
  styleSel.onchange = () => { params.set('style', styleSel.value); if (!styleSel.value) params.delete('style'); params.set('t', cur.toFixed(2)); location.search = params.toString(); };

  function show(t) {
    const S = render(t);
    seek.value = t;
    timeLbl.textContent = `${t.toFixed(2)}s / ${TL.duration.toFixed(1)}s`;
    sceneLbl.textContent = `${S.id} · ${S.title} · ${S.style}`;
  }
  function tick() {
    if (!playing) return;
    cur = audio.currentTime;
    if (cur >= TL.duration) { playing = false; playBtn.textContent = '▶'; }
    show(Math.min(cur, TL.duration));
    requestAnimationFrame(tick);
  }
  playBtn.onclick = () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
    if (playing) { if (cur >= TL.duration) cur = 0; audio.currentTime = cur; audio.play(); tick(); } else audio.pause();
  };
  seek.oninput = () => { cur = parseFloat(seek.value); audio.currentTime = cur; show(cur); };
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playBtn.click(); } });

  window.renderFrame = (t) => render(t);
  const fontLoads = [];
  for (const s of Object.values(STYLES)) for (const f of [s.fonts.body, s.fonts.title]) for (const wgt of [400, 700]) fontLoads.push(document.fonts.load(`${wgt} 40px ${f}`));
  // web fonts split by unicode-range load lazily; force every declared face so the first frames never use a fallback
  for (const f of document.fonts) fontLoads.push(f.load());
  window.ready = Promise.all(fontLoads).then(() => show(cur));
}
