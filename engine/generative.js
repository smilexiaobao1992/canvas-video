/* Generative effects inspired by the p5.js examples, rewritten as pure functions of time:
 * Perlin noise + flow fields, particle networks, particle emitters, flocks, recursive trees, lightweight 3D,
 * and physics trajectories. Simulations (flock, rolling ball) are precomputed once from a seed and then sampled
 * by t, so every frame stays reproducible and exports can render out of order.
 */

// ---------- colors ----------
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// blend two hex colors; t = 0 gives a, 1 gives b
function mixColor(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b), k = clamp(t);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(', ')})`;
}

// ---------- Perlin noise ----------
const PERM_CACHE = {};
function perm(seed) {
  if (PERM_CACHE[seed]) return PERM_CACHE[seed];
  const r = mulberry32(seed * 7919 + 1), p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return (PERM_CACHE[seed] = Uint8Array.from([...p, ...p]));
}
const fade5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad3(h, x, y, z) {
  const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
// classic improved Perlin noise, -1..1 (about); smooth in every argument
function noise3(x, y, z = 0, seed = 0) {
  const P = perm(seed);
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade5(x), v = fade5(y), w = fade5(z);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(
    lerp(lerp(grad3(P[AA] & 15, x, y, z), grad3(P[BA] & 15, x - 1, y, z), u), lerp(grad3(P[AB] & 15, x, y - 1, z), grad3(P[BB] & 15, x - 1, y - 1, z), u), v),
    lerp(lerp(grad3(P[AA + 1] & 15, x, y, z - 1), grad3(P[BA + 1] & 15, x - 1, y, z - 1), u), lerp(grad3(P[AB + 1] & 15, x, y - 1, z - 1), grad3(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v),
    w,
  );
}
const noise2 = (x, y, seed = 0) => noise3(x, y, 0.5, seed);
// fractal noise: octaves of noise summed with halving amplitude
function fbm(x, y, octaves = 4, seed = 0) {
  let s = 0, a = 0.5, f = 1;
  for (let o = 0; o < octaves; o++) { s += a * noise3(x * f, y * f, 0.5 + o * 7.1, seed); f *= 2; a *= 0.5; }
  return s;
}

// ---------- flow field ----------
// particles drift along a slowly changing noise field and leave fading streamlines
function flowField(t, o = {}) {
  const { n = 220, rect = { x0: 0, y0: 0, x1: W, y1: H }, seed = 1, scale = 0.0022, speed = 90, life = 3.2, trail = 0.9, color = C.note, width = 2, evolve = 0.08, alpha = 0.7 } = o;
  const r = mulberry32(seed), dt = 1 / 30;
  const count = Math.min(n, 400);
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = width;
  for (let i = 0; i < count; i++) {
    const sx = lerp(rect.x0, rect.x1, r()), sy = lerp(rect.y0, rect.y1, r()), off = r() * life;
    // each particle loops: it is reborn every `life` seconds at its seeded start point
    const age = ((t + off) % life + life) % life, born = t - age;
    let x = sx, y = sy;
    const steps = Math.floor(age / dt), from = Math.max(0, steps - Math.floor(trail / dt));
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) {
      if (k >= from) { if (k === from) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      const a = noise3(x * scale, y * scale, (born + k * dt) * evolve, seed) * Math.PI * 2;
      x += Math.cos(a) * speed * dt; y += Math.sin(a) * speed * dt;
    }
    ctx.globalAlpha = alpha * Math.sin(Math.PI * (age / life));
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- particle network ----------
// drifting nodes linked when close (neural net / knowledge graph backdrop); `signals` pulses travel along links
function networkPoints(t, n, rect, seed, drift, speed) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const bx = lerp(rect.x0, rect.x1, r()), by = lerp(rect.y0, rect.y1, r());
    return { x: bx + drift * noise3(i * 0.37, 0.1, t * speed, seed), y: by + drift * noise3(i * 0.37, 9.7, t * speed, seed), i };
  });
}
function networkField(t, o = {}) {
  const { n = 70, rect = { x0: 0, y0: 0, x1: W, y1: H }, seed = 4, linkDist = 180, color = C.note, accent = C.ok, drift = 60, speed = 0.15, dot = 4, signals = 8, alpha = 1, lit = null } = o;
  const pts = networkPoints(t, Math.min(n, 120), rect, seed, drift, speed);
  const links = [];
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = 1.6;
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
    const d = Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
    if (d > linkDist) continue;
    links.push([a, b]);
    ctx.strokeStyle = withAlpha(color, 0.55 * (1 - d / linkDist));
    ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
  }
  // signals: each hops along a link, a new link every cycle, chosen by a hash of (signal, cycle)
  for (let k = 0; k < signals && links.length; k++) {
    const cyc = t * 0.8 + k * 0.37, idx = Math.floor(frac(Math.sin((Math.floor(cyc) + 1) * 12.9898 + k * 78.233) * 43758.5) * links.length);
    const [a, b] = links[idx], u = frac(cyc);
    sparkle(lerp(pts[a].x, pts[b].x, u), lerp(pts[a].y, pts[b].y, u), 5, accent, 0.9);
  }
  pts.forEach((p) => {
    const l = lit ? clamp(lit(p.i, p)) : 0;
    ctx.fillStyle = l > 0 ? mixColor(color, accent, l) : color;
    ctx.beginPath(); ctx.arc(p.x, p.y, dot * (1 + l * 0.8), 0, Math.PI * 2); ctx.fill();
    if (l > 0.3) glowPulse(p.x, p.y, 26, t + p.i, accent, l);
  });
  ctx.restore();
  return pts;
}

// ---------- particle emitter ----------
const EMITTERS = {
  smoke: { rate: 26, life: 3.2, speed: 60, angle: -Math.PI / 2, spread: 0.6, gravity: -30, drag: 0.6, size: 26, grow: 3, shape: 'smoke' },
  sparks: { rate: 90, life: 0.9, speed: 520, angle: -Math.PI / 2, spread: 2.2, gravity: 900, drag: 1.2, size: 3, shape: 'spark' },
  snow: { rate: 40, life: 7, speed: 70, angle: Math.PI / 2, spread: 0.3, gravity: 0, drag: 0, size: 4, shape: 'snow', area: true },
  rain: { rate: 120, life: 1.2, speed: 1300, angle: Math.PI / 2 + 0.15, spread: 0.02, gravity: 0, drag: 0, size: 2, shape: 'rain', area: true },
  bubbles: { rate: 10, life: 4, speed: 110, angle: -Math.PI / 2, spread: 0.4, gravity: -20, drag: 0.2, size: 14, shape: 'bubble' },
  dataBurst: { rate: 60, life: 1.8, speed: 420, angle: 0, spread: Math.PI * 2, gravity: 0, drag: 1.6, size: 26, shape: 'bit' },
};
// o: { preset, x, y (or area: {x0, x1, y}), start, stop, seed, color, ...any preset field }
function emitter(t, o = {}) {
  const cfg = { ...(EMITTERS[o.preset] || {}), ...o };
  const { x = W / 2, y = H / 2, rate = 30, life = 2, speed = 100, angle = -Math.PI / 2, spread = 0.5, gravity = 0, drag = 0, size = 4, grow = 0, shape = 'dot', seed = 1, start = 0, stop = Infinity, color = C.note, alpha = 1 } = cfg;
  if (o.preset && !EMITTERS[o.preset]) throw new Error(`unknown emitter preset "${o.preset}"; available: ${Object.keys(EMITTERS).join(', ')}`);
  const area = cfg.area === true ? { x0: 0, x1: W, y: -20 } : cfg.area;
  const i0 = Math.max(0, Math.ceil((t - life - start) * rate)), i1 = Math.floor((Math.min(t, stop) - start) * rate);
  ctx.save(); ctx.globalAlpha *= alpha;
  const baseAlpha = ctx.globalAlpha;
  if (STYLE.dark && (shape === 'spark' || shape === 'bit')) ctx.globalCompositeOperation = 'lighter';
  for (let i = i0; i <= i1; i++) {
    // per-particle randomness from a hash of (seed, index), so any frame can compute any particle
    const h = (k) => frac(Math.sin((i + 1) * 12.9898 + seed * 78.233 + k * 37.719) * 43758.5453);
    const birth = start + i / rate + (h(0) - 0.5) / rate, age = t - birth;
    if (age < 0 || age > life) continue;
    const a = angle + (h(1) - 0.5) * spread, v = speed * (0.6 + 0.8 * h(2)), k = drag;
    const reach = k > 0 ? (1 - Math.exp(-k * age)) / k : age;
    const fall = k > 0 ? (age - reach) / k : (age * age) / 2;
    const ox = area ? lerp(area.x0, area.x1, h(3)) : x, oy = area ? area.y : y;
    let px = ox + Math.cos(a) * v * reach, py = oy + Math.sin(a) * v * reach + gravity * fall;
    const u = age / life, fadeA = Math.min(1, age / 0.15) * (1 - u);
    ctx.globalAlpha = baseAlpha * fadeA;
    if (shape === 'smoke') {
      const rad = size * (1 + grow * u);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, withAlpha(color, 0.35)); g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'spark' || shape === 'rain') {
      const vx = Math.cos(a) * v * (k > 0 ? Math.exp(-k * age) : 1), vy = Math.sin(a) * v * (k > 0 ? Math.exp(-k * age) : 1) + gravity * (k > 0 ? reach : age);
      const len = shape === 'rain' ? 0.03 : 0.025;
      ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - vx * len, py - vy * len); ctx.stroke();
    } else if (shape === 'snow') {
      px += Math.sin(age * 1.6 + h(4) * 6) * 18;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, size * (0.6 + h(5) * 0.8), 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'bubble') {
      px += Math.sin(age * 3 + h(4) * 6) * 10;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, size * (0.6 + h(5) * 0.8), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = withAlpha('#ffffff', 0.5); ctx.beginPath(); ctx.arc(px - size * 0.3, py - size * 0.3, size * 0.18, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 'bit') {
      text(h(4) > 0.5 ? '1' : '0', px, py, { size: size * (1 - u * 0.4), color, role: 'mono', weight: 700 });
    } else {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- flocking (boids), precomputed ----------
const FLOCK_CACHE = {};
// target: optional (t) => {x, y} the flock is drawn toward
function makeFlock(o = {}) {
  const { n = 50, seed = 5, rect = { x0: 0, y0: 0, x1: W, y1: H }, duration = 30, dt = 1 / 30, maxSpeed = 260, target = null, targetWeight = 0.8 } = o;
  const key = JSON.stringify({ n, seed, rect, duration, dt, maxSpeed, targetWeight, target: target && String(target) });
  if (FLOCK_CACHE[key]) return FLOCK_CACHE[key];
  const r = mulberry32(seed), steps = Math.ceil(duration / dt) + 1;
  const X = new Float32Array(n), Y = new Float32Array(n), VX = new Float32Array(n), VY = new Float32Array(n);
  for (let i = 0; i < n; i++) { X[i] = lerp(rect.x0, rect.x1, r()); Y[i] = lerp(rect.y0, rect.y1, r()); const a = r() * Math.PI * 2; VX[i] = Math.cos(a) * maxSpeed * 0.5; VY[i] = Math.sin(a) * maxSpeed * 0.5; }
  const frames = [];
  for (let s = 0; s < steps; s++) {
    frames.push({ x: X.slice(), y: Y.slice(), vx: VX.slice(), vy: VY.slice() });
    const tgt = target ? target(s * dt) : null;
    for (let i = 0; i < n; i++) {
      let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, cnt = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = X[j] - X[i], dy = Y[j] - Y[i], d = Math.hypot(dx, dy);
        if (d > 120) continue;
        cnt++; cx += X[j]; cy += Y[j]; ax += VX[j]; ay += VY[j];
        if (d < 36) { sx -= dx / (d + 0.01); sy -= dy / (d + 0.01); }
      }
      let fx = 0, fy = 0;
      if (cnt) { fx += (cx / cnt - X[i]) * 0.8 + (ax / cnt - VX[i]) * 0.9; fy += (cy / cnt - Y[i]) * 0.8 + (ay / cnt - VY[i]) * 0.9; }
      fx += sx * 900; fy += sy * 900;
      if (tgt) { fx += (tgt.x - X[i]) * targetWeight; fy += (tgt.y - Y[i]) * targetWeight; }
      // soft walls keep the flock inside rect
      const m = 60;
      if (X[i] < rect.x0 + m) fx += 600; if (X[i] > rect.x1 - m) fx -= 600;
      if (Y[i] < rect.y0 + m) fy += 600; if (Y[i] > rect.y1 - m) fy -= 600;
      VX[i] += fx * dt; VY[i] += fy * dt;
      const sp = Math.hypot(VX[i], VY[i]);
      if (sp > maxSpeed) { VX[i] *= maxSpeed / sp; VY[i] *= maxSpeed / sp; }
    }
    for (let i = 0; i < n; i++) { X[i] += VX[i] * dt; Y[i] += VY[i] * dt; }
  }
  const flock = {
    n, duration,
    at(t) {
      const f = clamp(t / dt, 0, frames.length - 1), a = frames[Math.floor(f)], b = frames[Math.min(frames.length - 1, Math.floor(f) + 1)], k = f - Math.floor(f);
      return Array.from({ length: n }, (_, i) => ({ x: lerp(a.x[i], b.x[i], k), y: lerp(a.y[i], b.y[i], k), angle: Math.atan2(lerp(a.vy[i], b.vy[i], k), lerp(a.vx[i], b.vx[i], k)) }));
    },
  };
  return (FLOCK_CACHE[key] = flock);
}
function drawFlock(flock, t, o = {}) {
  const { shape = 'arrow', size = 12, color = C.ink, trail = 0.4, accent = null } = o;
  if (trail > 0) {
    const past = [0.1, 0.2, 0.3, 0.4].filter((d) => d <= trail).map((d) => flock.at(Math.max(0, t - d)));
    const now = flock.at(t);
    ctx.save(); ctx.strokeStyle = withAlpha(accent || color, 0.25); ctx.lineWidth = 2; ctx.beginPath();
    now.forEach((p, i) => { ctx.moveTo(p.x, p.y); past.forEach((q) => ctx.lineTo(q[i].x, q[i].y)); });
    ctx.stroke(); ctx.restore();
  }
  flock.at(t).forEach((b, i) => {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    ctx.fillStyle = accent && i === 0 ? accent : color;
    if (shape === 'dot') { ctx.beginPath(); ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * 0.7, size * 0.55); ctx.lineTo(-size * 0.35, 0); ctx.lineTo(-size * 0.7, -size * 0.55); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  });
}

// ---------- recursive tree ----------
const TREE_CACHE = {};
function treeNodes({ depth, len, angle, spread, shrink, seed, branches }) {
  const key = JSON.stringify([depth, len, angle, spread, shrink, seed, branches]);
  if (TREE_CACHE[key]) return TREE_CACHE[key];
  const r = mulberry32(seed), out = [];
  const grow = (x, y, a, l, d, path) => {
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
    out.push({ x, y, x2, y2, d, path, tip: d === depth - 1 });
    if (d === depth - 1) return;
    for (let k = 0; k < branches; k++) {
      const off = branches === 1 ? 0 : (k / (branches - 1) - 0.5) * spread * 2;
      grow(x2, y2, a + off + (r() - 0.5) * spread * 0.4, l * shrink * (0.85 + r() * 0.3), d + 1, [...path, k]);
    }
  };
  grow(0, 0, angle, len, 0, []);
  return (TREE_CACHE[key] = out);
}
// grows level by level as p goes 0..1; highlight: child indices from the root (e.g. [1, 0, 1]); focus 0..1 dims the rest
function branchTree(x, y, p, o = {}) {
  const { depth = 5, len = 160, angle = -Math.PI / 2, spread = 0.45, shrink = 0.72, seed = 2, branches = 2, color = C.ink, accent = C.ok, width = 10, highlight = null, focus = 0, leaves = true, labels = null, labelSize = 22 } = o;
  // labels sit beside the tips of sideways trees and above the tips of upright ones
  const labelSide = o.labelSide || (Math.abs(Math.cos(angle)) > 0.7 ? 'right' : 'above');
  const nodes = treeNodes({ depth, len, angle, spread, shrink, seed, branches });
  const onPath = (n) => highlight && n.path.length <= highlight.length && n.path.every((k, i) => k === highlight[i]);
  let tipIndex = 0;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  for (const n of nodes) {
    const g = clamp(p * depth - n.d);
    if (g <= 0) continue;
    const hl = onPath(n), a = hl ? 1 : 1 - 0.8 * focus;
    ctx.globalAlpha = a;
    strokeSamples([{ x: n.x, y: n.y }, { x: lerp(n.x, n.x2, easeOut(g)), y: lerp(n.y, n.y2, easeOut(g)) }], { color: hl && focus > 0 ? mixColor(color, accent, focus) : color, width: Math.max(1.5, width * Math.pow(shrink, n.d)) * (hl ? 1 + focus * 0.6 : 1) });
    // leaves pop in over the last 30% of their branch's growth, so they are fully in at p = 1
    if (n.tip && leaves && g > 0.7) {
      const s = easeOutBack(clamp((g - 0.7) / 0.3));
      ctx.fillStyle = hl && focus > 0 ? accent : C.surface; ctx.strokeStyle = hl && focus > 0 ? accent : color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(n.x2, n.y2, 9 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (labels && labels[tipIndex]) {
        const lc = hl && focus > 0 ? accent : C.sub;
        if (labelSide === 'right') text(labels[tipIndex], n.x2 + 18, n.y2, { size: labelSize, color: lc, alpha: s, align: 'left' });
        else text(labels[tipIndex], n.x2, n.y2 - 26, { size: labelSize, color: lc, alpha: s });
      }
    }
    if (n.tip) tipIndex++;
  }
  ctx.restore();
}

// ---------- lightweight 3D ----------
// cam: { rx, ry (radians), dist, fov, cx, cy }; returns screen point with scale s and depth z
function project3([x, y, z], cam = {}) {
  const { rx = 0, ry = 0, dist = 900, fov = 800, cx = W / 2, cy = H / 2 } = cam;
  const cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx);
  const x1 = x * cy1 + z * sy1, z1 = -x * sy1 + z * cy1;
  const y2 = y * cx1 - z1 * sx1, z2 = y * sx1 + z1 * cx1 + dist;
  const s = fov / Math.max(1, z2);
  return { x: cx + x1 * s, y: cy + y2 * s, s, z: z2 };
}
// points: [{ p: [x, y, z], label?, color?, r? }]; drawn far-to-near, far points smaller and fainter
function drawPointCloud(points, cam, o = {}) {
  const { r = 7, color = C.note, labelSize = 24, depthFade = true, labelColor = C.ink } = o;
  const proj = points.map((pt) => ({ pt, q: project3(pt.p, cam) })).sort((a, b) => b.q.z - a.q.z);
  const zs = proj.map((x) => x.q.z), zmin = Math.min(...zs), zmax = Math.max(...zs);
  for (const { pt, q } of proj) {
    const depth = zmax > zmin ? (q.z - zmin) / (zmax - zmin) : 0;
    ctx.save(); ctx.globalAlpha *= depthFade ? 1 - depth * 0.6 : 1;
    ctx.fillStyle = pt.color || color; ctx.beginPath(); ctx.arc(q.x, q.y, (pt.r || r) * q.s, 0, Math.PI * 2); ctx.fill();
    if (pt.label) text(pt.label, q.x + 14 * q.s + 6, q.y, { size: labelSize * Math.min(1.3, q.s), color: labelColor, align: 'left' });
    ctx.restore();
  }
  return proj;
}
function drawLine3(a, b, cam, o = {}) {
  const pa = project3(a, cam), pb = project3(b, cam);
  if (o.arrow) pathWithArrow((u) => ({ x: lerp(pa.x, pb.x, u), y: lerp(pa.y, pb.y, u) }), o.p ?? 1, { color: o.color || C.ink, width: o.width || 3, headSize: o.headSize || 14, dash: o.dash });
  else strokeSamples([pa, pb], { color: o.color || C.ink, width: o.width || 2, alpha: o.alpha ?? 1, dash: o.dash });
}
function wireAxes(len, cam, o = {}) {
  const { labels = ['x', 'y', 'z'], color = C.muted } = o;
  [[len, 0, 0], [0, -len, 0], [0, 0, len]].forEach((end, i) => {
    drawLine3([0, 0, 0], end, cam, { arrow: true, color, width: 2.5 });
    const q = project3(end.map((v) => v * 1.08), cam);
    text(labels[i], q.x, q.y, { size: 24, color });
  });
}
function wireSphere(r, cam, o = {}) {
  const { lat = 8, lon = 12, color = withAlpha(C.muted, 0.6), width = 1.5 } = o;
  for (let i = 1; i < lat; i++) {
    const phi = (i / lat) * Math.PI, y = -r * Math.cos(phi), rr2 = r * Math.sin(phi);
    strokeSamples(Array.from({ length: 49 }, (_, k) => { const a = (k / 48) * Math.PI * 2; return project3([rr2 * Math.cos(a), y, rr2 * Math.sin(a)], cam); }), { color, width });
  }
  for (let j = 0; j < lon; j++) {
    const a = (j / lon) * Math.PI * 2;
    strokeSamples(Array.from({ length: 33 }, (_, k) => { const phi = (k / 32) * Math.PI; return project3([r * Math.sin(phi) * Math.cos(a), -r * Math.cos(phi), r * Math.sin(phi) * Math.sin(a)], cam); }), { color, width });
  }
}
function wireCube(size, cam, o = {}) {
  const { color = C.ink, width = 2.5 } = o, h = size / 2;
  const v = [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]];
  [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => drawLine3(v[a], v[b], cam, { color, width }));
}

// ---------- physics trajectories ----------
// ball rolling on a height curve h(x) (screen coords, larger y = lower); precomputed, returns { x, y, v } at t
const ROLL_CACHE = {};
function rollDown(h, t, o = {}) {
  const { x0 = 0, g = 2600, friction = 1.2, duration = 12, dt = 1 / 240 } = o;
  // pass o.key when two different curves share the same function source (e.g. closures over different data)
  const key = o.key || `${h}|${x0}|${g}|${friction}|${duration}`;
  if (!ROLL_CACHE[key]) {
    const xs = [];
    let x = x0, v = 0;
    const dh = (x) => (h(x + 0.5) - h(x - 0.5));
    for (let k = 0; k <= duration / dt; k++) {
      xs.push(x);
      const s = dh(x);
      v += (g * s / (1 + s * s) - friction * v) * dt;
      x += v * dt / Math.sqrt(1 + s * s);
    }
    ROLL_CACHE[key] = { xs, dt };
  }
  const { xs, dt: d } = ROLL_CACHE[key], f = clamp(t / d, 0, xs.length - 1), i = Math.floor(f);
  const x = lerp(xs[i], xs[Math.min(xs.length - 1, i + 1)], f - i);
  return { x, y: h(x), v: (xs[Math.min(xs.length - 1, i + 1)] - xs[i]) / d };
}
// bouncing ball height (analytic): starts at y0 at t=0, floor at `floor`; returns y
function bounce(t, o = {}) {
  const { y0 = 0, floor = H * 0.7, restitution = 0.6, gravity = 3000 } = o;
  if (t <= 0) return y0;
  const hgt = floor - y0, t1 = Math.sqrt((2 * hgt) / gravity);
  if (t < t1) return y0 + 0.5 * gravity * t * t;
  let v = gravity * t1 * restitution, tt = t - t1;
  for (let k = 0; k < 30 && v > 20; k++) {
    const flight = (2 * v) / gravity;
    if (tt < flight) return floor - (v * tt - 0.5 * gravity * tt * tt);
    tt -= flight; v *= restitution;
  }
  return floor;
}
