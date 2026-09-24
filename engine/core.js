/* canvas-video engine core.
 * Plain script (no ES modules) so the page works when opened from file://.
 * Contract: every frame is a pure function of time t. Scenes never keep state between frames.
 */
const W = 1920, H = 1080;
const MAIN = document.getElementById('c').getContext('2d');
let ctx = MAIN; // primitives always draw into `ctx`; transitions may swap it to an offscreen canvas

// ---------- styles ----------
const STYLES = {};
let STYLE = null;
let C = {}; // active palette (semantic roles), switched per scene
const STYLE_DEFAULTS = {
  dark: false,
  fonts: { body: '"PingFang SC", sans-serif', title: null, mono: 'Menlo, monospace' },
  line: { wobble: 0, mode: 'clean', glowBlur: 16, pencil: 'rgba(0, 0, 0, 0.25)' },
  shadow: 'none', // 'hatch' | 'soft' | 'none'
  hatch: { rgb: '0, 0, 0', spacing: 7 },
  texture: { grain: 0, vignette: null },
  transition: 'fade', // 'wipe' | 'erase' | 'fade' | 'cut'
  subtitle: { size: 36, color: null, plate: false },
  mascot: {},
  background(b, w, h, P) { b.fillStyle = P.bg; b.fillRect(0, 0, w, h); },
  overlay: null,
};
function registerStyle(name, def) {
  const s = { ...STYLE_DEFAULTS, ...def, name };
  for (const k of ['fonts', 'line', 'hatch', 'texture', 'subtitle', 'mascot']) s[k] = { ...STYLE_DEFAULTS[k], ...(def[k] || {}) };
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
  else { ctx.filter = 'blur(10px)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = `rgba(${STYLE.hatch.rgb}, ${alpha * 0.45})`; ctx.fill(); }
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
    text(typed(big, p * 1.8), 80, 110, { size: 72, align: 'left', role: 'title' });
    const w = measure(big, 72, 400, 'title');
    text(typed(small, (p - 0.45) / 0.55), 80 + w + 24, 122, { size: 34, color: C.note, align: 'left' });
    const u = easeOut(prog(p, 0.35, 1));
    if (u > 0) strokeSamples(samplePath((k) => ({ x: 78 + k * (w + 8), y: 160 - Math.sin(k * Math.PI) * 4 + k * 3 }), u, 30), { color: C.ink, width: 3.5 });
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
  for (const [x, y] of [[140, 260], [1780, 240], [1760, 900], [160, 880]]) { b.beginPath(); b.moveTo(x - 12, y); b.lineTo(x + 12, y); b.moveTo(x, y - 12); b.lineTo(x, y + 12); b.stroke(); }
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
function drawGrain(t, s) {
  if (!s.texture.grain) return;
  const r = mulberry32(Math.floor(t * 12) + 1);
  const ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
  ctx.save();
  ctx.globalAlpha = s.texture.grain / 40;
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat');
  ctx.translate(-ox, -oy);
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

// ---------- scene runtime ----------
let SCENE_LIST = [], SCENE_FNS = {}, CAM_FNS = {}, TL = null;
const TRANSITION = 0.6;
const OFF = makeCanvas(W, H), OFF_CTX = OFF.getContext('2d');

function drawScene(S, lt, t) {
  const s = useStyle(S.style);
  ctx.drawImage(bgOf(s), 0, 0);
  ctx.save();
  // scene camera: focus point + zoom; default is a slow push-in
  const cam = CAM_FNS[S.id] ? CAM_FNS[S.id](lt, S) : { x: W / 2, y: H / 2, z: 1 + 0.035 * easeInOut(clamp(lt / S.dur)) };
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  SCENE_FNS[S.id](lt, S, t);
  ctx.restore();
}

// each transition reveals the incoming scene (drawNext) over the frozen last frame of the previous one
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
  fade(drawNext, wp) {
    const prev = ctx;
    ctx = OFF_CTX; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    drawNext();
    ctx = prev;
    ctx.save(); ctx.globalAlpha = wp; ctx.drawImage(OFF, 0, 0); ctx.restore();
  },
};

function drawLogo() {
  if (!TL.brand) return;
  ctx.save();
  ctx.translate(1810, 58);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  text(TL.brand, 0, 0, { size: 34, align: 'right', weight: 700, role: 'title' });
  ctx.restore();
  const w = measure(TL.brand, 34, 700, 'title');
  strokeSamples(samplePath((u) => ({ x: 1804 - w + u * (w + 8), y: 84 - Math.sin(u * Math.PI) * 5 + u * 2 }), 1, 20), { color: C.ok, width: 3 });
}
function drawHud(i, S, lt) {
  if (!TL.hud) return;
  const x = 1790, y = 138;
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
function drawSubtitle(t) {
  const l = TL.lines.find((x) => t >= x.start && t < x.end + 0.25);
  if (!l) return;
  const st = STYLE.subtitle;
  if (st.plate) {
    const w = measure(l.text, st.size) + 56;
    ctx.save(); ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, 1020 - st.size * 0.95, w, st.size * 1.9, 12);
    ctx.fillStyle = withAlpha(C.bg, 0.78); ctx.fill(); ctx.restore();
  }
  text(l.text, W / 2, 1020, { size: st.size, color: st.color || C.ink });
}

function sceneIndexAt(t) { const i = SCENE_LIST.findIndex((s) => t < s.end); return i < 0 ? SCENE_LIST.length - 1 : i; }
function render(t) {
  ctx = MAIN;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.filter = 'none';
  const i = sceneIndexAt(t);
  const S = SCENE_LIST[i];
  const lt = t - S.start;
  const tr = STYLES[S.style].transition;
  const wp = i > 0 ? easeInOut(prog(lt, 0, TRANSITION)) : 1;
  if (wp < 1 && tr !== 'cut') {
    const P = SCENE_LIST[i - 1];
    drawScene(P, P.dur - 0.001, P.end - 0.001);
    TRANSITIONS[tr](() => drawScene(S, lt, t), wp);
  } else drawScene(S, lt, t);
  const s = useStyle(S.style);
  const fade = i === 0 ? prog(lt, 0, 0.4) : S.last ? 1 - prog(lt, S.dur - 1.0, S.dur) : 1;
  if (fade < 1) { ctx.globalAlpha = 1 - fade; ctx.drawImage(bgOf(s), 0, 0); ctx.globalAlpha = 1; }
  if (s.overlay) { ctx.save(); s.overlay(ctx, t, C); ctx.restore(); }
  drawGrain(t, s);
  const vig = vignetteOf(s);
  if (vig) ctx.drawImage(vig, 0, 0);
  drawLogo();
  drawHud(i, S, lt);
  drawSubtitle(t);
  return S;
}

// ---------- boot: preview UI + export hooks ----------
function boot({ scenes, cams = {} }) {
  TL = window.TIMELINE;
  if (!TL) throw new Error('timeline.js is missing — run `node scripts/tts.mjs` first');
  const params = new URLSearchParams(location.search);
  const forced = params.get('style');
  SCENE_FNS = scenes; CAM_FNS = cams;
  SCENE_LIST = TL.scenes.map((s, i) => {
    const lines = TL.lines.filter((l) => l.scene === s.id);
    const style = forced || s.style || TL.style || 'paper';
    if (!STYLES[style]) throw new Error(`scene "${s.id}" uses unknown style "${style}"; available: ${Object.keys(STYLES).join(', ')}`);
    if (!scenes[s.id]) throw new Error(`scenes.js has no function for scene "${s.id}"`);
    return {
      ...s, style, lines, dur: s.end - s.start, last: i === TL.scenes.length - 1,
      L: (k) => {
        if (!lines[k]) throw new Error(`scene "${s.id}" has no narration line ${k} (it has ${lines.length})`);
        return { s: lines[k].start - s.start, e: lines[k].end - s.start };
      },
    };
  });

  if (params.has('export')) document.body.classList.add('export');
  const audio = document.getElementById('voice');
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
  window.ready = Promise.all(fontLoads).then(() => show(cur));
}
