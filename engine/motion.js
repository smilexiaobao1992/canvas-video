/* Motion library: expressive, deterministic motion building blocks. Every function is a pure function of its
 * inputs (usually a 0..1 progress or a time), so frames stay reproducible.
 */

// ---------- timing ----------
// damped spring from 0 to 1 (overshoots and settles); p is seconds since start, not 0..1
function spring(t, { stiffness = 170, damping = 14, mass = 1 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
// progress of item i in a staggered group: starts at start + i*gap, lasts dur, eased
const stagger = (lt, i, start, gap, dur, ease = easeOut) => ease(prog(lt, start + i * gap, start + i * gap + dur));
const easeOutElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * 2 * Math.PI) / 3) + 1);
const easeInBack = (t) => { const c1 = 1.70158; return (c1 + 1) * t * t * t - c1 * t * t; };
// 0 -> 1 -> 0 over p (for flashes and pulses)
const pingPong = (p) => Math.sin(Math.PI * clamp(p));
// smooth deterministic 1D noise in -1..1
const noise1 = (x, seed = 0) => Math.sin(x * 1.7 + seed * 12.9) * 0.5 + Math.sin(x * 3.1 + seed * 7.3) * 0.3 + Math.sin(x * 5.3 + seed * 3.1) * 0.2;

// ---------- geometry ----------
// position and heading along a parametric path fn(u) -> {x, y}
function followPath(fn, u) {
  const a = fn(clamp(u - 0.002)), b = fn(clamp(u + 0.002)), p = fn(clamp(u));
  return { x: p.x, y: p.y, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}
// resample a closed polygon [[x, y], ...] to n points evenly spaced along its perimeter
function resample(pts, n) {
  const segs = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const total = segs.reduce((a, b) => a + b, 0), out = [];
  for (let k = 0; k < n; k++) {
    let d = (k / n) * total, i = 0;
    while (d > segs[i]) { d -= segs[i]; i++; }
    const p = pts[i], q = pts[(i + 1) % pts.length], f = segs[i] ? d / segs[i] : 0;
    out.push([lerp(p[0], q[0], f), lerp(p[1], q[1], f)]);
  }
  return out;
}
// closed shapes as point lists, centered on (cx, cy)
const shapes = {
  circle: (cx, cy, r, n = 64) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2 - Math.PI / 2) * r, cy + Math.sin((i / n) * Math.PI * 2 - Math.PI / 2) * r]),
  rect: (cx, cy, w, h) => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]],
  star: (cx, cy, r, spikes = 5, inner = 0.45) => Array.from({ length: spikes * 2 }, (_, i) => { const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2, rr2 = i % 2 ? r * inner : r; return [cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2]; }),
  polygon: (cx, cy, r, sides) => Array.from({ length: sides }, (_, i) => { const a = (i / sides) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }),
  heart: (cx, cy, r, n = 64) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return [cx + r * 0.06 * 16 * Math.sin(t) ** 3, cy - r * 0.06 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; }),
};
// morph between two closed shapes (any point counts) and build the path; then fill / strokeInk it
function morphPath(a, b, p, n = 96) {
  const A = resample(a, n), B = resample(b, n), e = easeInOut(clamp(p));
  // rotate B's start index to the point closest to A's first point, so the morph does not twist
  let best = 0, bd = Infinity;
  B.forEach((q, i) => { const d = Math.hypot(q[0] - A[0][0], q[1] - A[0][1]); if (d < bd) { bd = d; best = i; } });
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const q = B[(i + best) % n], x = lerp(A[i][0], q[0], e), y = lerp(A[i][1], q[1], e);
    const [wx, wy] = wobPt(x, y);
    if (i) ctx.lineTo(wx, wy); else ctx.moveTo(wx, wy);
  }
  ctx.closePath();
}

// ---------- text effects ----------
// per-character reveal. mode: 'bounce' | 'drop' | 'wave' | 'scramble' | 'typewriter' | 'blur' | 'split'
// lt = seconds since the reveal starts; the whole string is in by about dur seconds
function textReveal(str, x, y, lt, o = {}) {
  const { mode = 'bounce', size = 56, color = C.ink, weight = 700, align = 'center', dur = 0.9, role = 'title', seed = 1, alpha = 1 } = o;
  const chars = [...str];
  const widths = chars.map((c) => measure(c, size, weight, role));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const gap = chars.length > 1 ? (dur * 0.6) / (chars.length - 1) : 0, each = dur * 0.4 + 0.001;
  const r = mulberry32(seed), GLYPHS = '01<>/#*+=%$&@ABCDEFXYZ';
  chars.forEach((ch, i) => {
    const w = widths[i], local = lt - i * gap, p = clamp(local / each);
    const mid = cx + w / 2;
    cx += w;
    if (mode === 'typewriter') { if (p > 0) text(ch, mid, y, { size, color, weight, role, alpha }); return; }
    if (mode === 'scramble') {
      // random glyphs that settle into the real character
      const settled = local > each * 1.6;
      const g = settled ? ch : GLYPHS[Math.floor(frac(Math.sin((i + 1) * 91.7 + Math.floor(lt * 18) * 13.1) * 43758.5) * GLYPHS.length)];
      if (local > 0) text(g, mid, y, { size, color: settled ? color : C.note, weight, role, alpha });
      return;
    }
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    let dy = 0, sc = 1, rot = 0, a = 1;
    // overshoot capped so neighbouring characters never collide
    if (mode === 'bounce') { const s = spring(local, { stiffness: 260, damping: 15 }); sc = Math.min(s, 1.06); dy = (1 - s) * size * 0.5; }
    else if (mode === 'drop') { const e = easeOutBack(p); dy = -(1 - e) * size * 1.2; rot = (1 - e) * (r() - 0.5) * 0.8; a = p; }
    else if (mode === 'wave') { dy = Math.sin(lt * 5 - i * 0.6) * size * 0.12 * (1 - clamp((lt - dur) / 1.5)); a = p; }
    else if (mode === 'blur') { a = p; ctx.filter = `blur(${(1 - p) * 10}px)`; sc = 1 + (1 - p) * 0.3; }
    else if (mode === 'split') { const e = easeOut(p); dy = (i % 2 ? 1 : -1) * (1 - e) * size; a = e; }
    ctx.globalAlpha *= a;
    ctx.translate(mid, y + dy); ctx.rotate(rot); ctx.scale(sc, sc);
    text(ch, 0, 0, { size, color, weight, role });
    ctx.restore();
  });
  return total;
}

// particles fly in from a seeded cloud and assemble into text (p: 0 scattered -> 1 formed; >1 bursts out again up to 2)
const PARTICLE_CACHE = {};
function textPoints(str, size, weight, role, step) {
  const key = `${str}|${size}|${weight}|${role}|${step}|${STYLE.fonts[role]}`;
  if (PARTICLE_CACHE[key]) return PARTICLE_CACHE[key];
  const w = Math.ceil(measure(str, size, weight, role)) + 8, h = Math.ceil(size * 1.4);
  const c = makeCanvas(w, h), b = c.getContext('2d');
  b.font = font(size, weight, role); b.textBaseline = 'middle'; b.fillStyle = '#000'; b.fillText(str, 4, h / 2);
  const data = b.getImageData(0, 0, w, h).data, pts = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 128) pts.push([x - w / 2, y - h / 2]);
  return (PARTICLE_CACHE[key] = pts);
}
function particleText(str, x, y, p, o = {}) {
  const { size = 120, weight = 700, role = 'title', color = C.ink, accent = C.ok, step = 5, dot = 2.6, seed = 3, spread = 700 } = o;
  const pts = textPoints(str, size, weight, role, step), r = mulberry32(seed);
  const burst = p > 1;
  ctx.save();
  pts.forEach(([px, py], i) => {
    const ang = r() * Math.PI * 2, dist = spread * (0.4 + r()), delay = r() * 0.35;
    const k = burst ? 1 - easeIn(clamp((p - 1 - delay * 0.5) / 0.6)) : easeInOut(clamp((p - delay) / 0.65));
    const sx = x + Math.cos(ang) * dist, sy = y + Math.sin(ang) * dist * 0.7;
    const cx = lerp(sx, x + px, k), cy = lerp(sy, y + py, k);
    ctx.globalAlpha = 0.25 + 0.75 * k;
    ctx.fillStyle = k > 0.98 ? color : accent;
    ctx.beginPath(); ctx.arc(cx, cy, dot * (0.7 + 0.3 * k), 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

// ---------- effects ----------
// camera shake offset for CAMS: add to x/y; decays over `dur` seconds after `at`
function shake(lt, at, amp = 14, dur = 0.5, seed = 0) {
  const k = 1 - clamp((lt - at) / dur);
  if (lt < at || k <= 0) return { x: 0, y: 0 };
  return { x: noise1(lt * 40, seed) * amp * k, y: noise1(lt * 40, seed + 5) * amp * k };
}
// quick zoom punch for CAMS.z: 1 -> 1+amount -> settles
const punchIn = (lt, at, amount = 0.08, dur = 0.5) => (lt < at ? 1 : 1 + amount * Math.exp(-(lt - at) * (6 / dur)) * Math.sin(Math.min(Math.PI / 2, (lt - at) * 20)));
// expanding rings (a click / ping)
function ripple(x, y, lt, at, o = {}) {
  const { color = C.note, rings = 3, maxR = 120, dur = 1.1, width = 4 } = o;
  for (let k = 0; k < rings; k++) {
    const p = prog(lt, at + k * 0.18, at + k * 0.18 + dur);
    if (p <= 0 || p >= 1) continue;
    ctx.save(); ctx.globalAlpha *= 1 - p; ctx.strokeStyle = color; ctx.lineWidth = width * (1 - p * 0.6);
    ctx.beginPath(); ctx.arc(x, y, maxR * easeOut(p), 0, Math.PI * 2); strokeInk(); ctx.restore();
  }
}
// breathing glow behind a point (works on light and dark styles)
function glowPulse(x, y, r, t, color = C.ok, strength = 1) {
  const k = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.save();
  if (STYLE.dark) ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * (1 + 0.15 * k));
  g.addColorStop(0, withAlpha(color, (STYLE.dark ? 0.45 : 0.3) * k * strength)); g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// radial burst lines (emphasis); p: 0..1
function burst(x, y, p, o = {}) {
  const { color = C.mark, n = 12, r0 = 40, r1 = 140, width = 5, seed = 2 } = o;
  if (p <= 0 || p >= 1) return;
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.2, e = easeOut(p), len = (r1 - r0) * (0.6 + 0.4 * r());
    const a0 = r0 + len * Math.max(0, e - 0.35), a1 = r0 + len * e;
    strokeSamples([{ x: x + Math.cos(a) * a0, y: y + Math.sin(a) * a0 }, { x: x + Math.cos(a) * a1, y: y + Math.sin(a) * a1 }], { color, width: width * (1 - p * 0.5) });
  }
}
// confetti falling from the top of a box; p: 0..1 over its life
function confetti(p, o = {}) {
  const { x0 = 0, x1 = W, y0 = -40, fall = H * 0.9, n = 90, seed = 7, colors = [C.ok, C.mark, C.bad, C.note] } = o;
  if (p <= 0 || p >= 1) return;
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), delay = r() * 0.3, spin = (r() - 0.5) * 20, drift = (r() - 0.5) * 160, c = colors[i % colors.length];
    const q = clamp((p - delay) / (1 - delay));
    if (q <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= 1 - clamp((q - 0.8) / 0.2);
    ctx.translate(x + drift * q + Math.sin(q * 8 + i) * 20, y0 + fall * easeIn(q) * 0.6 + fall * q * 0.4);
    ctx.rotate(spin * q); ctx.scale(1, Math.cos(q * 12 + i));
    ctx.fillStyle = c; ctx.fillRect(-7, -4, 14, 8);
    ctx.restore();
  }
}
// n satellites orbiting (cx, cy); draw(i, x, y, depth) is called back-to-front with depth -1..1
function orbit(cx, cy, rx, ry, t, n, draw, speed = 0.5, phase = 0) {
  const items = Array.from({ length: n }, (_, i) => { const a = t * speed * Math.PI * 2 + (i / n) * Math.PI * 2 + phase; return { i, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, depth: Math.sin(a) }; });
  items.sort((a, b) => a.depth - b.depth).forEach((it) => draw(it.i, it.x, it.y, it.depth));
}
// "thinking" dots
function typingDots(x, y, t, o = {}) {
  const { color = C.ink, r = 7, gap = 24 } = o;
  for (let d = 0; d < 3; d++) {
    const k = Math.max(0, Math.sin(t * 6 - d * 0.9));
    ctx.fillStyle = withAlpha(color, 0.3 + 0.7 * k);
    ctx.beginPath(); ctx.arc(x + d * gap, y - k * 8, r, 0, Math.PI * 2); ctx.fill();
  }
}
// highlighter stroke behind text; p: 0..1 sweep
function highlighter(x, y, w, h, p, color = C.mark) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha *= STYLE.dark ? 0.4 : 0.75;
  ctx.fillStyle = color;
  const e = easeOut(p);
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.1); ctx.lineTo(x + w * e, y); ctx.lineTo(x + w * e + 6, y + h * 0.95); ctx.lineTo(x - 4, y + h);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
// hand-drawn circle around something; p: 0..1 draw progress
function circleMark(x, y, rx, ry, p, o = {}) {
  const { color = C.bad, width = 5, seed = 1 } = o;
  if (p <= 0) return;
  const turns = 1.12, off = seed * 0.7;
  pathWithArrow((u) => { const a = off + u * Math.PI * 2 * turns; const k = 1 + 0.06 * Math.sin(u * 9 + seed); return { x: x + Math.cos(a) * rx * k, y: y + Math.sin(a) * ry * k }; }, easeInOut(p), { color, width, head: false });
}

// radial speed lines rushing toward (cx, cy); p: 0..1 over the burst (lines fade in and out)
function speedLines(cx, cy, p, o = {}) {
  const { n = 70, color = STYLE.dark ? '#ffffff' : C.ink, width = 3, inner = 0.25, seed = 11, alpha = 0.6 } = o;
  if (p <= 0 || p >= 1) return;
  const r = mulberry32(seed), R = Math.hypot(W, H) * 0.75, a0 = pingPong(p);
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2, len = 0.12 + r() * 0.25, ph = r();
    const u = frac(p * 1.6 + ph), rr0 = lerp(R, R * inner, u), rr1 = rr0 + R * len * (1 - u * 0.5);
    ctx.globalAlpha = alpha * a0 * (0.4 + 0.6 * r());
    ctx.lineWidth = width * (0.5 + r());
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * rr0, cy + Math.sin(ang) * rr0); ctx.lineTo(cx + Math.cos(ang) * rr1, cy + Math.sin(ang) * rr1); ctx.stroke();
  }
  ctx.restore();
}

// ---------- more transitions ----------
Object.assign(TRANSITIONS, {
  // circle closes on the old scene, then opens on the new one
  iris(drawNext, wp) {
    const R = Math.hypot(W, H) / 2, closing = wp < 0.5, r = R * (closing ? 1 - easeIn(wp * 2) : easeOut(wp * 2 - 1));
    if (!closing) drawNext();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(0.1, r), 0, Math.PI * 2, true);
    ctx.fillStyle = STYLE.dark ? '#05060a' : C.ink; ctx.fill('evenodd'); ctx.restore();
  },
  // fly through: the old scene zooms past the camera while the new one zooms in from behind
  zoom(drawNext, wp) {
    // the new scene always covers the frame (scale >= 1) so no border shows; the old one flies past on top
    const prev = grabPrev(), next = renderOff(drawNext), e = easeInOut(wp);
    ctx.save();
    const s2 = 1 + 0.25 * (1 - e);
    ctx.translate(W / 2, H / 2); ctx.scale(s2, s2); ctx.drawImage(next, -W / 2, -H / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const s1 = 1 + easeIn(wp) * 1.8;
    ctx.globalAlpha = 1 - easeOut(clamp(wp * 1.3)); ctx.translate(W / 2, H / 2); ctx.scale(s1, s1); ctx.drawImage(prev, -W / 2, -H / 2);
    ctx.restore();
  },
  // digital glitch: slices jump sideways with color fringes, switching scenes in the middle
  glitch(drawNext, wp) {
    const prev = grabPrev(), next = renderOff(drawNext), src = wp < 0.5 ? prev : next;
    const amt = pingPong(wp), r = mulberry32(Math.floor(wp * 24) + 1);
    ctx.save(); ctx.drawImage(src, 0, 0);
    const slices = 14;
    for (let k = 0; k < slices; k++) {
      if (r() > amt) continue;
      const y = r() * H, h = 8 + r() * H * 0.08, dx = (r() - 0.5) * 220 * amt;
      ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = withAlpha(k % 2 ? C.bad : C.note, 0.35 * amt); ctx.fillRect(dx * 1.5, y, W, h * 0.3);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },
  // the old scene splits in half and the halves slide apart
  split(drawNext, wp) {
    const prev = grabPrev(), e = easeInOut(wp);
    drawNext();
    ctx.save();
    const d = (H / 2) * e;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; ctx.shadowBlur = 30;
    ctx.drawImage(prev, 0, 0, W, H / 2, 0, -d, W, H / 2);
    ctx.drawImage(prev, 0, H / 2, W, H / 2, 0, H / 2 + d, W, H / 2);
    ctx.restore();
  },
  // dive into a point of the old scene (e.g. an eye); the new scene opens out of it, with speed lines
  portal(drawNext, wp, S) {
    const [fx, fy] = S ? S.transitionFocus : [W / 2, H / 2];
    const prev = grabPrev(), next = renderOff(drawNext);
    ctx.save();
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    const s1 = Math.exp(easeIn(clamp(wp / 0.75)) * 2.6);
    ctx.globalAlpha = 1 - prog(wp, 0.55, 0.85);
    ctx.translate(fx, fy); ctx.scale(s1, s1); ctx.translate(-fx, -fy); ctx.drawImage(prev, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const open = easeInOut(prog(wp, 0.3, 1)), R = Math.hypot(W, H) * open;
    if (R > 0) {
      ctx.beginPath(); ctx.arc(lerp(fx, W / 2, open), lerp(fy, H / 2, open), R, 0, Math.PI * 2); ctx.clip();
      const s2 = lerp(1.6, 1, open);
      ctx.translate(lerp(fx, W / 2, open), lerp(fy, H / 2, open)); ctx.scale(s2, s2); ctx.drawImage(next, -W / 2, -H / 2);
    }
    ctx.restore();
    speedLines(fx, fy, prog(wp, 0.05, 0.8), { color: '#ffffff', alpha: 0.7 });
  },
  // venetian blinds
  shutter(drawNext, wp) {
    const n = 9, bh = H / n;
    ctx.save(); ctx.beginPath();
    for (let k = 0; k < n; k++) { const p = easeInOut(clamp(wp * 1.6 - k * 0.07)); ctx.rect(0, k * bh, W, bh * p + 0.5); }
    ctx.clip(); drawNext(); ctx.restore();
  },
});
