/* Isometric helpers. World axes: +x runs down-right, +y runs down-left, +z runs up.
 * One world unit = o.s pixels; o = { ox, oy, s } places the world origin on screen.
 * Occlusion is painter's order: draw objects sorted by (x + y) ascending, lower z first.
 */
const ISO = { ox: 960, oy: 380, s: 64 };
const COS30 = Math.cos(Math.PI / 6);

function isoPt(x, y, z = 0, o = ISO) {
  return { x: o.ox + (x - y) * COS30 * o.s, y: o.oy + (x + y) * 0.5 * o.s - z * o.s };
}
function isoPoly(pts3, o = ISO) {
  ctx.beginPath();
  pts3.forEach(([x, y, z], i) => { const p = isoPt(x, y, z, o); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  ctx.closePath();
}
// flat shadow cast toward +x on the ground, styled like shadowRect
function isoShadow(x, y, w, d, h, o = ISO, alpha = 0.3) {
  if (STYLE.shadow === 'none' || h <= 0) return;
  const k = Math.min(h * 0.6, 3);
  const foot = [[x, y, 0], [x + w + k, y, 0], [x + w + k, y + d, 0], [x, y + d, 0]];
  ctx.save();
  isoPoly(foot, o);
  if (STYLE.shadow === 'hatch') {
    ctx.clip();
    const ps = foot.map(([fx, fy, fz]) => isoPt(fx, fy, fz, o));
    const x0 = Math.min(...ps.map((p) => p.x)), x1 = Math.max(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y)), y1 = Math.max(...ps.map((p) => p.y));
    hatchFill(alpha, STYLE.hatch.spacing, x0, y0, x1 - x0, y1 - y0);
  }
  else {
    if (STYLE.shadow === 'soft') ctx.filter = 'blur(8px)';
    else if (STYLE.hardShadow.blur) ctx.filter = `blur(${STYLE.hardShadow.blur}px)`;
    ctx.fillStyle = `rgba(${STYLE.hatch.rgb}, ${STYLE.shadow === 'hard' ? STYLE.hardShadow.alpha : alpha * 0.6})`;
    ctx.fill();
  }
  ctx.restore();
}
// box with its three visible faces; face colors default to shades of `color`
function isoBox(x, y, z, w, d, h, opt = {}) {
  const { o = ISO, color = C.surface, top, left, right, stroke = C.ink, lw = 2.5, alpha = 1, shadow = z === 0, label = null, labelSize = 26 } = opt;
  if (h <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (shadow) isoShadow(x, y, w, d, h, o);
  ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
  const faces = [
    { pts: [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], fill: left ?? shade(color, -0.1) },
    { pts: [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], fill: right ?? shade(color, -0.24) },
    { pts: [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], fill: top ?? color },
  ];
  for (const f of faces) { isoPoly(f.pts, o); ctx.fillStyle = f.fill; ctx.fill(); strokeInk(); }
  ctx.restore();
  if (label) { const p = isoPt(x + w / 2, y + d / 2, z + h, o); text(label, p.x, p.y - 34, { size: labelSize, color: C.ink, alpha }); }
}
// gable roof (ridge along x) sitting on top of a box footprint
function isoRoof(x, y, z, w, d, h, opt = {}) {
  const { o = ISO, color = C.bad, stroke = C.ink, lw = 2.5, alpha = 1 } = opt;
  ctx.save();
  ctx.globalAlpha *= alpha; ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
  const ym = y + d / 2;
  const faces = [
    { pts: [[x + w, y, z], [x + w, y + d, z], [x + w, ym, z + h]], fill: shade(color, -0.25) },
    { pts: [[x, y + d, z], [x + w, y + d, z], [x + w, ym, z + h], [x, ym, z + h]], fill: color },
  ];
  for (const f of faces) { isoPoly(f.pts, o); ctx.fillStyle = f.fill; ctx.fill(); strokeInk(); }
  ctx.restore();
}
function isoTile(x, y, w, d, opt = {}) {
  const { o = ISO, fill = C.neutral, stroke = null, lw = 1.5, alpha = 1 } = opt;
  ctx.save(); ctx.globalAlpha *= alpha;
  isoPoly([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]], o);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}
function isoGrid(x0, y0, x1, y1, opt = {}) {
  const { o = ISO, color = withAlpha(C.muted, 0.5), lw = 1.5, step = 1, alpha = 1 } = opt;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  for (let x = x0; x <= x1 + 1e-6; x += step) { const a = isoPt(x, y0, 0, o), b = isoPt(x, y1, 0, o); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  for (let y = y0; y <= y1 + 1e-6; y += step) { const a = isoPt(x0, y, 0, o), b = isoPt(x1, y, 0, o); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  ctx.stroke(); ctx.restore();
}
// point at fraction u (0..1, by length) along a 3D polyline, in world coordinates
function isoAlong(pts3, u) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts3.length; i++) { const [a, b] = [pts3[i - 1], pts3[i]]; const l = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)); segs.push(l); total += l; }
  let dist = clamp(u) * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? clamp(dist / segs[i]) : 0, a = pts3[i], b = pts3[i + 1];
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2] || 0, b[2] || 0, k)];
    }
    dist -= segs[i];
  }
  return pts3[pts3.length - 1];
}
// draw a 3D polyline progressively (0..p) with an arrow head, e.g. a route on the ground
function isoPath(pts3, p, opt = {}) {
  const { o = ISO, ...rest } = opt;
  pathWithArrow((u) => { const [x, y, z] = isoAlong(pts3, u); return isoPt(x, y, z, o); }, p, rest);
}
function isoLabel(str, x, y, z, opt = {}) {
  const { o = ISO, dy = 0, ...rest } = opt;
  const p = isoPt(x, y, z, o);
  text(str, p.x, p.y + dy, rest);
}
