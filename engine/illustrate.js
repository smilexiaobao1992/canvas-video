// Illustration kit: inked cartoon look — bold dark outlines, flat saturated fills, pencil hatching inside shapes,
// a darker crescent on the shadow side, glowing light sources. Every function is a pure function of its arguments
// (time goes in as t / p), so frames can be rendered in any order.

const ILL = {
  outline: '#1a1233', cream: '#f7eedc', gold: '#f5b83d', orange: '#f0844a', magenta: '#e8488a', pink: '#f59ac0',
  violet: '#8a63f0', lavender: '#b8a2ff', teal: '#48c2b9', blue: '#4f86e8', green: '#63c98c', brown: '#4a2c1f', night: '#0d0a1f',
};

// ---------- core: one inked shape ----------
// build() adds the shape's path (no beginPath); draw it in local coordinates (translate first) so the hatching moves with it.
// hatch: { color, spacing, angle, width, alpha, cross } | false; shade: { dx, dy, color } darker crescent; glow: color
function inkShape(build, o = {}) {
  const { fill = ILL.cream, outline = ILL.outline, lw = 5, hatch = {}, shade = null, glow = null, alpha = 1, box = null } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (glow) { ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 45; ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
  ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill();
  if (shade) {
    ctx.save(); ctx.beginPath(); build(); ctx.clip();
    ctx.beginPath(); ctx.rect(-W * 3, -H * 3, W * 7, H * 7);
    ctx.save(); ctx.translate(shade.dx ?? 12, shade.dy ?? -12); build(); ctx.restore();
    ctx.fillStyle = shade.color || 'rgba(26, 18, 51, 0.28)'; ctx.fill('evenodd');
    ctx.restore();
  }
  if (hatch) {
    ctx.beginPath(); build();
    pencilFill({ color: hatch.color || ILL.outline, spacing: hatch.spacing || 8, angle: hatch.angle ?? -1.05, width: hatch.width || 1.5, alpha: hatch.alpha ?? 0.15, cross: !!hatch.cross, seed: hatch.seed || 5, bounds: box });
  }
  if (lw > 0) { ctx.beginPath(); build(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}
// several circles merged into one blob (clouds, bushes, nebulae): outline only around the union
function blobShape(circles, o = {}) {
  const { fill = ILL.cream, outline = ILL.outline, lw = 5, hatch = {}, alpha = 1, shade = null } = o;
  const build = () => circles.forEach(([x, y, r]) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); });
  ctx.save(); ctx.globalAlpha *= alpha;
  if (lw > 0) { ctx.beginPath(); build(); ctx.strokeStyle = outline; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill();
  if (shade) {
    // darken the whole blob, then repaint the fill shifted: what stays dark is the crescent (works for overlapping circles)
    ctx.save(); ctx.beginPath(); build(); ctx.clip();
    ctx.fillStyle = shade.color || 'rgba(26, 18, 51, 0.3)'; ctx.fillRect(-W * 3, -H * 3, W * 7, H * 7);
    ctx.beginPath(); circles.forEach(([x, y, r]) => { const X = x + (shade.dx ?? 10), Y = y + (shade.dy ?? -14); ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, Math.PI * 2); });
    ctx.fillStyle = fill; ctx.fill(); ctx.restore();
  }
  if (hatch) { ctx.beginPath(); build(); pencilFill({ color: hatch.color || ILL.outline, spacing: hatch.spacing || 9, angle: hatch.angle ?? -1.05, alpha: hatch.alpha ?? 0.2, seed: hatch.seed || 7, width: hatch.width || 1.5 }); }
  ctx.restore();
}
function cloud(cx, cy, w, h, o = {}) {
  const r = mulberry32(o.seed || 21), n = o.puffs || 15, circles = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), rad = h * (0.2 + 0.2 * Math.sin(u * Math.PI)) * (0.85 + r() * 0.3);
    circles.push([cx - w / 2 + u * w + (r() - 0.5) * w * 0.05, cy - rad * 0.35 + (r() - 0.5) * h * 0.2, rad]);
  }
  for (let i = 0; i < n - 1; i++) circles.push([cx - w / 2 + ((i + 0.5) / (n - 1)) * w, cy + h * 0.18, h * (0.16 + r() * 0.1)]);
  blobShape(circles, { fill: o.fill || ILL.lavender, shade: { dx: 0, dy: -h * 0.16, color: 'rgba(10, 6, 25, 0.38)' }, hatch: { alpha: 0.2, spacing: 8 }, ...o });
}

// ---------- light ----------
// soft light: additive on dark styles so it reads as light rather than a muddy tint
function glow(x, y, r, color, alpha = 1) {
  if (!STYLE.dark) return lightBlob(x, y, r, color, alpha);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; lightBlob(x, y, r, color, alpha * 0.8); ctx.restore();
}
// four-point flare with a soft glow: stars, sparks, the glowing token core
function flare(x, y, s, color = '#ffffff', alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y); ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y); ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s);
  ctx.fill(); ctx.restore();
}
function glowStar(x, y, r, t, color = ILL.gold, o = {}) {
  const pulse = 1 + 0.08 * Math.sin(t * 4 + (o.phase || 0)), k = o.intensity ?? 1;
  glow(x, y, r * 5 * pulse, color, 0.55 * k);
  glow(x, y, r * 2.2, '#fff4d6', 0.9 * k);
  flare(x, y, r * 3.2 * pulse, '#fffaf0', 0.9 * k);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); flare(0, 0, r * 1.5 * pulse, '#fffaf0', 0.6 * k); ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
}
// twinkling four-point stars scattered over rect
function twinkles(t, rect, n = 40, colors = ['#ffffff', ILL.gold, ILL.pink, ILL.teal], seed = 9) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(rect.x0, rect.x1, r()), y = lerp(rect.y0, rect.y1, r()), s = 5 + r() * 12, ph = r() * 20, sp = 1.5 + r() * 2.5, col = colors[i % colors.length];
    const k = Math.max(0, Math.sin(t * sp + ph));
    if (k > 0.05) flare(x, y, s * (0.4 + 0.6 * k), col, k);
  }
}
// glowing beam between two points (laser, light ray, falling light)
function beam(x0, y0, x1, y1, w, color = ILL.gold, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
  [[w * 3, 0.12], [w * 1.8, 0.25], [w, 0.9]].forEach(([lw, a]) => { ctx.globalAlpha = alpha * a; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
  ctx.globalAlpha = alpha; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = w * 0.35; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}

// ---------- tunnel ----------
// thick colored rings rushing at the camera (portal / "going deeper"); speed in rings per second
function ringTunnel(t, cx, cy, o = {}) {
  const { speed = 1.2, colors = [ILL.cream, ILL.gold, ILL.magenta, ILL.lavender, ILL.violet], g = 1.3, r0 = 14, bend = [0, 0], seed = 3, alpha = 1 } = o;
  const phase = t * speed, maxR = Math.hypot(W, H) * 0.75;
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let j = 0; ; j++) {
    const id = j - Math.floor(phase), r = r0 * Math.pow(g, j + frac(phase));
    if (r > maxR * g) break;
    const th = r * (1 - 1 / g) * 0.84, fade = prog(r, r0, r0 * 5);
    const depth = 1 - Math.log(r / r0) / Math.log(maxR / r0), x = cx + bend[0] * depth * 120, y = cy + bend[1] * depth * 120;
    const col = colors[((id % colors.length) + colors.length) % colors.length];
    ctx.globalAlpha = alpha * fade;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x, y, r - th, 0, Math.PI * 2, true);
    ctx.fillStyle = col; ctx.fill();
    // scratchy ticks across the band
    const rr = mulberry32(seed + ((id % 997) + 997) * 13);
    ctx.strokeStyle = withAlpha(ILL.outline, 0.35); ctx.lineWidth = Math.max(1, r * 0.006); ctx.beginPath();
    for (let k = 0; k < 70; k++) { const a = rr() * Math.PI * 2, r0 = r - th * (0.1 + rr() * 0.5), r1 = r0 - th * (0.1 + rr() * 0.3); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); }
    ctx.stroke();
    ctx.strokeStyle = ILL.outline; ctx.lineWidth = Math.min(10, Math.max(2, r * 0.012));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r - th, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ---------- galaxy ----------
// rotating spiral particle disk; tilt flattens it (1 = face-on); returns a projector for disk coordinates
function galaxyDisk(t, cx, cy, R, o = {}) {
  const { tilt = 0.42, n = 2600, arms = 3, colors = [ILL.gold, ILL.pink, ILL.lavender], seed = 4, spin = 0.12, alpha = 1, rot = -0.18 } = o;
  const r = mulberry32(seed), cr = Math.cos(rot), sr = Math.sin(rot);
  const proj = (rad, ang) => { const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad * tilt; return { x: cx + x * cr - y * sr, y: cy + x * sr + y * cr }; };
  ctx.save(); ctx.globalAlpha *= alpha;
  lightBlob(cx, cy, R * 0.9, ILL.violet, 0.35);
  // particles as short dashes along their orbits, batched into one path per color and brightness
  const paths = {};
  for (let i = 0; i < n; i++) {
    const u = Math.pow(r(), 0.8), arm = i % arms, rad = R * (0.04 + u * 0.96);
    const ang = (arm / arms) * Math.PI * 2 + u * 3.6 + (r() - 0.5) * (0.3 + u * 0.55) + t * spin * (1.3 - u * 0.6);
    const q = proj(rad, ang), q2 = proj(rad, ang + (6 + r() * 10) / Math.max(rad, 40));
    const key = `${u < 0.2 ? 3 : arm % colors.length}|${r() < 0.5 ? 1 : 0}`;
    (paths[key] = paths[key] || []).push(q.x, q.y, q2.x, q2.y);
  }
  ctx.lineCap = 'round';
  for (const [key, seg] of Object.entries(paths)) {
    const [ci, bright] = key.split('|').map(Number);
    ctx.strokeStyle = ci === 3 ? '#ffe6b8' : colors[ci]; ctx.globalAlpha = alpha * (bright ? 0.95 : 0.55); ctx.lineWidth = bright ? 2.6 : 1.8;
    ctx.beginPath(); for (let k = 0; k < seg.length; k += 4) { ctx.moveTo(seg[k], seg[k + 1]); ctx.lineTo(seg[k + 2], seg[k + 3]); } ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  // faint orbit ellipses, like a star chart
  ctx.strokeStyle = withAlpha(ILL.lavender, 0.18); ctx.lineWidth = 1.5; ctx.setLineDash([4, 10]);
  [0.55, 1.05].forEach((k) => { ctx.beginPath(); ctx.ellipse(cx, cy, R * k, R * k * tilt, rot, 0, Math.PI * 2); ctx.stroke(); });
  ctx.setLineDash([]);
  lightBlob(cx, cy, R * 0.32, '#ffc98a', 0.85);
  lightBlob(cx, cy, R * 0.1, '#ffffff', 0.9);
  ctx.restore();
  return proj;
}

// ---------- double helix ----------
// horizontal 3D double helix; rungs are colored bars (a vector's numbers); p reveals rungs left to right
function helix3D(t, cx, cy, len, o = {}) {
  const { turns = 3.2, R = 150, n = 34, p = 1, spin = 1.1, strands = [ILL.violet, ILL.magenta], colors = [ILL.gold, ILL.teal, ILL.pink, ILL.green, ILL.orange, ILL.blue], labels = null } = o;
  const at = (u, s) => { const a = u * turns * Math.PI * 2 + t * spin + s * Math.PI; return { x: cx - len / 2 + u * len, y: cy + Math.sin(a) * R, z: Math.cos(a) }; };
  const seg = (s, front) => {
    ctx.lineCap = 'round';
    for (let k = 0; k < 120; k++) {
      const u0 = k / 120, u1 = (k + 1) / 120;
      if (u0 > p) break;
      const a = at(u0, s), b = at(Math.min(u1, p), s);
      if ((a.z > 0) !== front) continue;
      const w = 16 * (1 + 0.25 * a.z);
      ctx.strokeStyle = ILL.outline; ctx.lineWidth = w + 7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let k = 0; k < 120; k++) {
      const u0 = k / 120, u1 = (k + 1) / 120;
      if (u0 > p) break;
      const a = at(u0, s), b = at(Math.min(u1, p), s);
      if ((a.z > 0) !== front) continue;
      const w = 16 * (1 + 0.25 * a.z);
      ctx.strokeStyle = front ? strands[s] : mixColor(strands[s], ILL.outline, 0.35); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = withAlpha('#ffffff', front ? 0.35 : 0.12); ctx.lineWidth = w * 0.25; ctx.beginPath(); ctx.moveTo(a.x, a.y - w * 0.22); ctx.lineTo(b.x, b.y - w * 0.22); ctx.stroke();
    }
  };
  ctx.save();
  seg(0, false); seg(1, false);
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n;
    if (u > p) break;
    const a = at(u, 0), b = at(u, 1), g = easeOutBack(clamp((p - u) * 8));
    const my = (a.y + b.y) / 2, ya = lerp(my, a.y, g), yb = lerp(my, b.y, g);
    ctx.lineCap = 'round';
    ctx.strokeStyle = ILL.outline; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(a.x, ya); ctx.lineTo(b.x, yb); ctx.stroke();
    ctx.strokeStyle = colors[k % colors.length]; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(a.x, ya); ctx.lineTo(b.x, yb); ctx.stroke();
    if (labels && Math.abs(a.y - b.y) > R * 1.2 && g > 0.9) text(labels[k % labels.length], a.x, my, { size: 20, color: ILL.cream, weight: 700 });
  }
  seg(0, true); seg(1, true);
  ctx.restore();
}

// ---------- neuron ----------
const DENDRITE_CACHE = {};
function dendriteGeom(seed, reach, roots, depth) {
  const key = `${seed}|${reach}|${roots}|${depth}`;
  if (DENDRITE_CACHE[key]) return DENDRITE_CACHE[key];
  const r = mulberry32(seed), segs = [], tips = [];
  const grow = (x, y, ang, len, w, d, parent) => {
    const pts = [{ x, y }], steps = 10;
    let a = ang;
    for (let k = 1; k <= steps; k++) { a += (r() - 0.5) * 0.35; pts.push({ x: pts[k - 1].x + Math.cos(a) * len / steps, y: pts[k - 1].y + Math.sin(a) * len / steps }); }
    const s = { pts, w0: w, w1: w * 0.62, d, parent };
    segs.push(s);
    const end = pts[steps];
    if (d >= depth) { tips.push({ x: end.x, y: end.y, seg: segs.length - 1 }); return; }
    const kids = d < 1 ? 2 : r() < 0.7 ? 2 : 3;
    for (let c = 0; c < kids; c++) grow(end.x, end.y, a + (c - (kids - 1) / 2) * (0.5 + r() * 0.3), len * (0.62 + r() * 0.15), w * 0.62, d + 1, segs.length - 1);
  };
  for (let i = 0; i < roots; i++) grow(0, 0, (i / roots) * Math.PI * 2 + (r() - 0.5) * 0.5, reach * 0.42, 22, 0, -1);
  return (DENDRITE_CACHE[key] = { segs, tips });
}
// neuron: soma at (cx, cy) with branching dendrites; p grows them; pulses travel from tips to the soma.
// returns tip positions (screen coords) so scenes can hang tokens on them
function dendrites(cx, cy, p, t, o = {}) {
  const { seed = 12, reach = 520, roots = 6, depth = 3, color = ILL.lavender, soma = ILL.pink, pulses = 10, pulse = ILL.gold } = o;
  const { segs, tips } = dendriteGeom(seed, reach, roots, depth);
  const vis = (s) => prog(p, s.d / (depth + 1), (s.d + 1) / (depth + 1));
  const sway = (pt, k) => ({ x: cx + pt.x + Math.sin(t * 0.9 + pt.y * 0.01) * 3 * k, y: cy + pt.y + Math.cos(t * 0.8 + pt.x * 0.01) * 3 * k });
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1, 2]) {
    segs.forEach((s) => {
      const v = vis(s);
      if (v <= 0) return;
      const m = Math.max(1, Math.ceil(v * (s.pts.length - 1)));
      for (let k = 0; k < m; k++) {
        const a = sway(s.pts[k], s.d), b = sway(s.pts[k + 1], s.d), w = lerp(s.w0, s.w1, k / (s.pts.length - 1));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        if (pass === 0) { ctx.strokeStyle = ILL.outline; ctx.lineWidth = w + 7; }
        else if (pass === 1) { ctx.strokeStyle = color; ctx.lineWidth = w; }
        else { ctx.strokeStyle = withAlpha('#ffffff', 0.35); ctx.lineWidth = w * 0.22; }
        ctx.stroke();
      }
    });
  }
  // pulses running inward along random tip-to-root chains
  if (p >= 1) {
    const r = mulberry32(seed + 1);
    for (let i = 0; i < pulses; i++) {
      const tip = tips[Math.floor(r() * tips.length)], ph = r();
      const u = frac(t * 0.45 + ph), chain = [];
      for (let si = tip.seg; si >= 0; si = segs[si].parent) chain.push(segs[si]);
      const f = u * chain.length, s = chain[Math.min(chain.length - 1, Math.floor(f))], local = 1 - (f - Math.floor(f));
      const idx = local * (s.pts.length - 1), k = Math.floor(idx), a = s.pts[k], b = s.pts[Math.min(k + 1, s.pts.length - 1)];
      const q = sway({ x: lerp(a.x, b.x, idx - k), y: lerp(a.y, b.y, idx - k) }, s.d);
      glow(q.x, q.y, 34, pulse, 0.8); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const sp = easeOutBack(clamp(p * 4));
  if (sp > 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sp, sp);
    inkShape(() => ctx.arc(0, 0, 92, 0, Math.PI * 2), { fill: soma, shade: { dx: 20, dy: -22 }, lw: 6, box: { x: -100, y: -100, w: 200, h: 200 } });
    inkShape(() => ctx.arc(0, 0, 34, 0, Math.PI * 2), { fill: ILL.violet, lw: 5, hatch: false });
    ctx.restore();
  }
  ctx.restore();
  return tips.map((tp) => sway(tp, depth));
}

// ---------- black hole ----------
// accretion disk around a black hole, with the lensed arc over the top; p: 0..1 fades it in
function accretionDisk(t, cx, cy, R, o = {}) {
  const { tilt = 0.3, colors = ['#fff1d6', ILL.gold, ILL.orange, ILL.magenta, ILL.violet], hole = 0.3, spin = 0.5, seed = 8 } = o;
  const B = colors.length, r0 = R * 0.42;
  const band = (k, a0, a1, lensed) => {
    const ro = lerp(r0, R, (k + 1) / B), ri = lerp(r0, R, k / B);
    ctx.beginPath();
    if (lensed) { const s = 0.62; ctx.ellipse(cx, cy, ro * s, ro * s, 0, a0, a1); ctx.ellipse(cx, cy, ri * s, ri * s, 0, a1, a0, true); }
    else { ctx.ellipse(cx, cy, ro, ro * tilt, 0, a0, a1); ctx.ellipse(cx, cy, ri, ri * tilt, 0, a1, a0, true); }
    ctx.closePath(); ctx.fillStyle = colors[k]; ctx.fill();
    ctx.strokeStyle = ILL.outline; ctx.lineWidth = 3; ctx.stroke();
  };
  const streaks = (a0, a1) => {
    const r = mulberry32(seed);
    ctx.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const u = r(), rad = lerp(r0, R, u), w = 0.08 + r() * 0.2, a = r() * Math.PI * 2 + t * spin * (1.4 - u);
      const s = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (!(s > a0 && s + w < a1)) continue;
      ctx.strokeStyle = r() < 0.5 ? withAlpha('#ffffff', 0.45) : withAlpha(ILL.outline, 0.25); ctx.lineWidth = 1.5 + r() * 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * tilt, 0, s, s + w); ctx.stroke();
    }
  };
  ctx.save();
  lightBlob(cx, cy, R * 1.5, ILL.orange, 0.3);
  for (let k = B - 1; k >= 0; k--) band(k, Math.PI, Math.PI * 2, false);
  streaks(Math.PI, Math.PI * 2);
  for (let k = B - 1; k >= 0; k--) band(k, Math.PI * 1.02, Math.PI * 1.98, true);
  ctx.beginPath(); ctx.arc(cx, cy, R * hole, 0, Math.PI * 2); ctx.fillStyle = '#07050f'; ctx.fill();
  ctx.strokeStyle = '#fff1d6'; ctx.lineWidth = 3; ctx.stroke();
  for (let k = B - 1; k >= 0; k--) band(k, 0, Math.PI, false);
  streaks(0, Math.PI);
  ctx.restore();
}

// ---------- lightning ----------
// a strike every `period` seconds, a new bolt shape each time; returns the flash intensity (0..1) for sky flashes
function lightning(x0, y0, x1, y1, t, o = {}) {
  const { period = 1.6, seed = 31, color = '#9fb8ff', width = 5, offset = 0 } = o;
  const n = Math.floor((t + offset) / period), u = frac((t + offset) / period);
  const k = u < 0.05 ? u / 0.05 : Math.exp(-(u - 0.05) * 9) * (u < 0.18 && u > 0.1 ? 0.5 : 1);
  if (k < 0.02) return 0;
  const r = mulberry32(seed + n * 101);
  const bolt = (ax, ay, bx, by, disp, depth) => {
    let pts = [{ x: ax, y: ay }, { x: bx, y: by }];
    for (let d = 0; d < depth; d++) {
      const next = [pts[0]];
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; next.push({ x: (a.x + b.x) / 2 + (r() - 0.5) * disp, y: (a.y + b.y) / 2 + (r() - 0.5) * disp * 0.3 }, b); }
      pts = next; disp *= 0.55;
    }
    return pts;
  };
  const main = bolt(x0, y0, x1, y1, Math.hypot(x1 - x0, y1 - y0) * 0.35, 7);
  const branches = [];
  for (let b = 0; b < 5; b++) {
    const s = main[Math.floor(8 + r() * (main.length * 0.6))], ang = Math.PI / 2 + (r() - 0.5) * 1.6, L = 120 + r() * 220;
    branches.push(bolt(s.x, s.y, s.x + Math.cos(ang) * L, s.y + Math.sin(ang) * L, L * 0.4, 5));
  }
  const stroke = (pts, w) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.lineWidth = w; ctx.stroke(); };
  ctx.save(); ctx.globalAlpha *= k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(color, 0.35); stroke(main, width * 5); branches.forEach((b) => stroke(b, width * 2.5));
  ctx.strokeStyle = color; stroke(main, width * 1.8); branches.forEach((b) => stroke(b, width * 0.9));
  ctx.strokeStyle = '#ffffff'; stroke(main, width * 0.8); branches.forEach((b) => stroke(b, width * 0.4));
  ctx.restore();
  glow(x1, y1, 220, color, 0.6 * k);
  return k;
}

// ---------- prism ----------
// a beam hits a glass prism and fans out into bands; band width ∝ value. p: 0..0.4 beam in, 0.4..1 bands out.
// bands: [{ label, value, color }]; o.focus: index kept bright while others dim by o.dim (0..1); o.src: where the beam starts.
// Returns { exit, ends }: the point where light leaves the prism and each band's far-end center.
function prismSpectrum(cx, cy, size, p, bands, o = {}) {
  const { focus = -1, dim = 0, reach = W * 0.62, spread = 0.72, dir = 0.2, labelSize = 38 } = o;
  const h = size * 0.87, A = { x: cx, y: cy - h * 0.6 }, Bp = { x: cx - size / 2, y: cy + h * 0.4 }, Cp = { x: cx + size / 2, y: cy + h * 0.4 };
  const entry = { x: lerp(A.x, Bp.x, 0.5), y: lerp(A.y, Bp.y, 0.5) }, exit = { x: lerp(A.x, Cp.x, 0.55), y: lerp(A.y, Cp.y, 0.55) };
  const pin = easeInOut(clamp(p / 0.4)), pout = easeOut(prog(p, 0.4, 1));
  const src = o.src || { x: entry.x - W * 0.6, y: entry.y - W * 0.6 * 0.25 };
  if (pin > 0) beam(src.x, src.y, lerp(src.x, entry.x, pin), lerp(src.y, entry.y, pin), 16, '#fffaf0');
  const total = bands.reduce((s, b) => s + b.value, 0), ends = [];
  if (pout > 0) {
    let acc = 0;
    bands.forEach((b, i) => {
      const a0 = dir - spread / 2 + (acc / total) * spread, a1 = a0 + (b.value / total) * spread; acc += b.value;
      const L = reach * pout, e0 = { x: exit.x + Math.cos(a0) * L, y: exit.y + Math.sin(a0) * L }, e1 = { x: exit.x + Math.cos(a1) * L, y: exit.y + Math.sin(a1) * L };
      const k = focus < 0 || i === focus ? 1 : 1 - dim * 0.55;
      const s0 = { x: exit.x, y: exit.y - 10 + (acc - b.value) / total * 20 }, s1 = { x: exit.x, y: exit.y - 10 + acc / total * 20 };
      inkShape(() => { ctx.moveTo(s0.x, s0.y); ctx.lineTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.lineTo(s1.x, s1.y); ctx.closePath(); },
        { fill: b.color, lw: 3, alpha: k, hatch: { color: '#ffffff', alpha: 0.28, angle: (a0 + a1) / 2, spacing: 6, seed: 11 + i }, box: { x: exit.x - 20, y: exit.y - L, w: L + 40, h: L * 2 } });
      const m = { x: (e0.x + e1.x) / 2, y: (e0.y + e1.y) / 2 };
      ends.push(m);
      if (b.label && pout > 0.85) {
        const la = prog(pout, 0.85, 1) * k, lx = exit.x + Math.cos((a0 + a1) / 2) * (L * 0.82), ly = exit.y + Math.sin((a0 + a1) / 2) * (L * 0.82);
        outlinedText(b.label, lx, ly, { size: labelSize * (i === focus && dim > 0 ? 1 + 0.25 * dim : 1), alpha: la });
      }
    });
  }
  // glass prism on top
  inkShape(() => { ctx.moveTo(A.x, A.y); ctx.lineTo(Cp.x, Cp.y); ctx.lineTo(Bp.x, Bp.y); ctx.closePath(); },
    { fill: 'rgba(210, 225, 255, 0.16)', outline: '#f4f1ff', lw: 6, hatch: { color: '#ffffff', alpha: 0.25, spacing: 9, angle: -0.5 }, box: { x: Bp.x, y: A.y, w: size, h } });
  ctx.save(); ctx.strokeStyle = withAlpha('#ffffff', 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lerp(A.x, Bp.x, 0.15) + 14, lerp(A.y, Bp.y, 0.15) + 6); ctx.lineTo(lerp(A.x, Bp.x, 0.55) + 14, lerp(A.y, Bp.y, 0.55)); ctx.stroke(); ctx.restore();
  return { exit, ends };
}
// cream text with a thick dark outline (labels over busy illustrations)
function outlinedText(str, x, y, o = {}) {
  const { size = 40, color = ILL.cream, outline = ILL.outline, weight = 700, alpha = 1, align = 'center' } = o;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font(size, weight, 'title'); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.strokeStyle = outline; ctx.lineWidth = size * 0.22; ctx.strokeText(str, x, y);
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}

// ---------- planet ----------
function planet(x, y, r, o = {}) {
  const { fill = ILL.blue, stripes = null, ring = null, tilt = 0.28, craters = 0, seed = 2, glow: glowColor = null, spin = 0, t = 0 } = o;
  if (r <= 0) return;
  const ringPath = (front) => { ctx.ellipse(x, y, r * 1.75, r * 1.75 * tilt, -0.25, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.ellipse(x, y, r * 1.35, r * 1.35 * tilt, -0.25, front ? Math.PI : Math.PI * 2, front ? 0 : Math.PI, true); ctx.closePath(); };
  if (glowColor) glow(x, y, r * 2.4, glowColor, 0.45);
  if (ring) inkShape(() => ringPath(false), { fill: ring, lw: 4, hatch: false });
  ctx.save(); ctx.translate(x, y);
  inkShape(() => ctx.arc(0, 0, r, 0, Math.PI * 2), { fill, lw: Math.max(3, r * 0.06), shade: { dx: r * 0.28, dy: -r * 0.22 }, box: { x: -r, y: -r, w: 2 * r, h: 2 * r }, hatch: { alpha: 0.18, spacing: Math.max(5, r * 0.09) } });
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r - 2), 0, Math.PI * 2); ctx.clip();
  if (stripes) stripes.forEach((col, i) => {
    const yy = -r + ((i + 0.5) / stripes.length) * 2 * r;
    ctx.strokeStyle = col; ctx.lineWidth = r * 0.16; ctx.beginPath();
    for (let xx = -r; xx <= r; xx += 8) { const v = yy + Math.sin(xx * 0.03 + i + t * spin) * r * 0.05; xx === -r ? ctx.moveTo(xx, v) : ctx.lineTo(xx, v); }
    ctx.stroke();
  });
  const rr = mulberry32(seed);
  for (let i = 0; i < craters; i++) {
    const a = rr() * Math.PI * 2, d = rr() * r * 0.75, cr = r * (0.06 + rr() * 0.12);
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, cr, cr * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(ILL.outline, 0.22); ctx.fill(); ctx.strokeStyle = withAlpha(ILL.outline, 0.5); ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.fillStyle = withAlpha('#ffffff', 0.55); ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.16, r * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = ILL.outline; ctx.lineWidth = Math.max(3, r * 0.06); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (ring) inkShape(() => ringPath(true), { fill: ring, lw: 4, hatch: false });
}

// ---------- sunflower ----------
// seeds spiral out at the golden angle (p 0..0.65), then petals unfold (0.55..1)
function phyllotaxis(cx, cy, R, p, o = {}) {
  const { n = 520, petals = 26, petal = ILL.gold, seed = 6, t = 0 } = o;
  const GA = Math.PI * (3 - Math.sqrt(5)), c = R / Math.sqrt(n), pp = easeOutBack(prog(p, 0.55, 1)), rr = mulberry32(seed);
  // petals: two layers, drawn back to front
  if (pp > 0) {
    for (const layer of [1, 0]) {
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + layer * (Math.PI / petals) + Math.sin(t * 0.8 + i) * 0.02, L = R * (0.95 + rr() * 0.25) * (layer ? 0.92 : 1) * pp, wdt = R * 0.2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        inkShape(() => { ctx.moveTo(R * 0.85, 0); ctx.quadraticCurveTo(R * 0.85 + L * 0.5, -wdt, R * 0.85 + L, 0); ctx.quadraticCurveTo(R * 0.85 + L * 0.5, wdt, R * 0.85, 0); },
          { fill: layer ? mixColor(petal, ILL.orange, 0.35) : petal, lw: 3.5, hatch: layer ? false : { alpha: 0.2, spacing: 6, seed: i }, box: { x: R * 0.8, y: -wdt, w: L + 20, h: wdt * 2 } });
        ctx.strokeStyle = withAlpha(ILL.outline, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(R * 0.9, 0); ctx.lineTo(R * 0.85 + L * 0.8, 0); ctx.stroke();
        ctx.restore();
      }
    }
  }
  const disc = easeOut(prog(p, 0, 0.2));
  if (disc > 0) inkShape(() => ctx.arc(cx, cy, R * 1.02 * disc, 0, Math.PI * 2), { fill: '#3a2216', lw: 5, hatch: false });
  const shown = Math.floor(n * prog(p, 0.02, 0.65));
  for (let i = 0; i < shown; i++) {
    const rad = c * Math.sqrt(i), a = i * GA, u = rad / R, g = clamp((n * prog(p, 0.02, 0.65) - i) / 25);
    ctx.fillStyle = u < 0.35 ? mixColor('#c9d86a', '#8a8a3a', u / 0.35) : u < 0.7 ? '#6b4a22' : '#2a170e';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, c * 0.42 * g, 0, Math.PI * 2); ctx.fill();
  }
}
