// Example: the journey of one token through a language model, told as illustrated shots (engine/illustrate.js).
// One narration line per scene; every shot has one large hero illustration and almost no on-screen text.

const TOKS = ['猫', '为什么', '喜欢', '纸箱', '？'];
const TCOL = [ILL.gold, ILL.pink, ILL.teal, ILL.orange, ILL.lavender];
const ANSWER = ['因为', '纸箱', '又', '暖和', '又', '安全', '。'];
const BANDS = [
  { label: '因为', value: 52, color: ILL.gold }, { label: '其实', value: 15, color: ILL.orange }, { label: '猫', value: 12, color: ILL.magenta },
  { label: '可能', value: 11, color: ILL.violet }, { label: '纸箱', value: 10, color: ILL.teal },
];
const PRISM = { x: W * 0.33, y: H * 0.5, size: 400, src: { x: 170, y: 260 } };

// ---------- shared drawing ----------
// inked token capsule
function pill(x, y, label, size, fill, o = {}) {
  const w = measure(label, size) + size * 0.95, h = size * 1.5, a = o.alpha ?? 1;
  if (a <= 0) return w;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale) ctx.scale(o.scale, o.scale);
  if (o.glow) glow(0, 0, w * 1.1, fill, o.glow * a);
  inkShape(() => ctx.roundRect(-w / 2, -h / 2, w, h, h / 2), { fill, lw: Math.max(4, size * 0.09), alpha: a, shade: { dx: size * 0.1, dy: -size * 0.14 }, box: { x: -w / 2, y: -h / 2, w, h } });
  text(label, 0, size * 0.03, { size, color: ILL.outline, weight: 700, alpha: a });
  ctx.restore();
  return w;
}
// the traveller: a glowing golden token
function orb(x, y, r, t, k = 1, label = '猫') {
  glow(x, y, r * 4.2, ILL.gold, 0.45 * k);
  glow(x, y, r * 2, '#fff1c9', 0.4 * k);
  ctx.save(); ctx.translate(x, y);
  inkShape(() => ctx.arc(0, 0, r, 0, Math.PI * 2), { fill: ILL.gold, lw: Math.max(4, r * 0.07), shade: { dx: r * 0.22, dy: -r * 0.2 }, box: { x: -r, y: -r, w: 2 * r, h: 2 * r } });
  text(label, 0, r * 0.04, { size: r * (label.length > 1 ? 0.62 : 0.95), color: ILL.outline, weight: 700 });
  ctx.restore();
  flare(x - r * 0.42, y - r * 0.48, r * 0.32 * (1 + 0.15 * Math.sin(t * 5)), '#ffffff', 0.9);
}
// token row of the prompt; sep 0 = one ribbon, 1 = scattered capsules
// (computed at draw time: measure() needs the active style's font)
function rowLayout72() {
  const size = 72, ws = TOKS.map((l) => measure(l, size) + size * 0.95), total = ws.reduce((a, b) => a + b, 0);
  let x = W / 2 - total / 2;
  return ws.map((w, i) => { const c = x + w / 2; x += w; return { x: c, w, l: c - w / 2, r: c + w / 2, i }; });
}
function scattered(i, sep, t) {
  const r = mulberry32(40 + i), ROW = rowLayout72();
  return { x: ROW[i].x + sep * (i - 2) * 95, y: H / 2 + sep * (Math.sin(i * 2.3) * 150 + Math.sin(t * 1.3 + i) * 12), rot: sep * (r() - 0.5) * 0.5 };
}
// a comet head with a fading trail along a path fn(u)
function comet(fn, u, t, color = ILL.gold) {
  ctx.save(); ctx.lineCap = 'round';
  for (let k = 24; k >= 1; k--) {
    const a = fn(clamp(u - k * 0.012)), b = fn(clamp(u - (k - 1) * 0.012)), f = 1 - k / 24;
    ctx.strokeStyle = withAlpha(color, 0.7 * f); ctx.lineWidth = 3 + 14 * f; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
  const p = fn(u);
  glowStar(p.x, p.y, 14, t, color);
}

// ---------- scenes ----------
const SCENES = {
  enter(lt, S, t) {
    const at = S.word(0, '回车');
    const press = easeOut(prog(lt, at - 0.12, at + 0.06)) * (1 - easeInOut(prog(lt, at + 0.45, at + 0.9)));
    const cx = W / 2, cy = H / 2 + 10, w = 640, h = 380, depth = 70, dy = press * depth * 0.8;
    lightBlob(cx, cy + 60, 820, ILL.violet, 0.4 + press * 0.3);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.05);
    inkShape(() => ctx.roundRect(-w / 2 - 24, -h / 2 + depth - 16, w + 48, h + 24, 64), { fill: '#5b45b0', lw: 8, box: { x: -w / 2 - 24, y: -h / 2, w: w + 48, h: h + depth } });
    inkShape(() => ctx.roundRect(-w / 2, -h / 2 + dy - 16, w, h, 54), { fill: ILL.cream, lw: 8, shade: { dx: -18, dy: -22 }, box: { x: -w / 2, y: -h / 2 - 16, w, h: h + depth } });
    // the return-arrow glyph, drawn as thick strokes
    ctx.strokeStyle = ILL.outline; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(170, -110 + dy); ctx.lineTo(170, 40 + dy); ctx.lineTo(-150, 40 + dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-80, -30 + dy); ctx.lineTo(-155, 40 + dy); ctx.lineTo(-80, 110 + dy); ctx.stroke();
    text('Enter', -130, -110 + dy, { size: 58, color: ILL.outline, weight: 700 });
    ctx.restore();
    burst(cx, cy, prog(lt, at, at + 0.55), { n: 18, r0: 380, r1: 600, color: ILL.gold, width: 10 });
    const sp = prog(lt, at, at + 1.2);
    if (sp > 0 && sp < 1) twinkles(t, { x0: cx - 600, y0: cy - 380, x1: cx + 600, y1: cy + 380 }, 22, [ILL.gold, '#ffffff', ILL.pink], 5);
  },

  split(lt, S, t) {
    const ROW = rowLayout72(), cut = S.word(0, '切成'), bladeP = prog(lt, cut - 0.1, cut + 0.9);
    const x0 = ROW[0].l - 80, x1 = ROW[ROW.length - 1].r + 80, bx = lerp(x0, x1, bladeP), size = 72;
    const passT = (x) => lerp(cut - 0.1, cut + 0.9, (x - x0) / (x1 - x0));
    // pieces already cut off drift apart; the rest is still one ribbon
    const firstJoined = ROW.findIndex((p) => lt < passT(p.r));
    ROW.forEach((p, i) => {
      if (firstJoined !== -1 && i >= firstJoined) return;
      const sep = easeOut(prog(lt, passT(p.r), passT(p.r) + 0.9)), q = scattered(i, sep, t);
      pill(q.x, q.y, TOKS[i], size, mixColor(ILL.cream, TCOL[i], sep), { rot: q.rot });
    });
    if (firstJoined !== -1) {
      const l = ROW[firstJoined].l, r = ROW[ROW.length - 1].r, h = size * 1.5;
      ctx.save(); ctx.translate((l + r) / 2, H / 2);
      inkShape(() => ctx.roundRect(-(r - l) / 2, -h / 2, r - l, h, h / 2), { fill: ILL.cream, lw: 7, shade: { dx: 7, dy: -10 }, box: { x: -(r - l) / 2, y: -h / 2, w: r - l, h } });
      ctx.restore();
      ROW.slice(firstJoined).forEach((p, k) => text(TOKS[firstJoined + k], p.x, H / 2 + 2, { size, color: ILL.outline, weight: 700 }));
    }
    // the light blade
    if (bladeP > 0 && bladeP < 1) {
      beam(bx + 90, H / 2 - 260, bx - 90, H / 2 + 260, 10, ILL.gold);
      flare(bx, H / 2, 70, '#ffffff', 0.9);
    }
    ROW.forEach((p) => { const k = prog(lt, passT(p.r), passT(p.r) + 0.5); if (k > 0 && k < 1) flare(p.r, H / 2 + Math.sin(p.r) * 40, 40 * (1 - k), ILL.gold, 1 - k); });
  },

  pick(lt, S, t) {
    const ROW = rowLayout72(), at = S.word(0, '猫'), k = easeInOut(prog(lt, at - 0.25, at + 0.7)), dive = easeIn(prog(lt, at + 0.9, S.dur));
    ROW.forEach((p, i) => {
      if (i === 0) return;
      const q = scattered(i, 1, t), out = 1 + 2.5 * k;
      pill(W / 2 + (q.x - W / 2) * out, H / 2 + (q.y - H / 2) * out, TOKS[i], 72, TCOL[i], { rot: q.rot * (1 + k), alpha: 1 - k * 0.85 });
    });
    const q = scattered(0, 1, t), cx = lerp(q.x, W / 2, k), cy = lerp(q.y, H / 2, k);
    if (k > 0.35) orb(cx, cy, 110 * easeOutBack(prog(k, 0.35, 1)), t, k);
    else pill(cx, cy, '猫', 72, TCOL[0], { rot: q.rot * (1 - k), scale: 1 + k, glow: k });
    burst(W / 2, H / 2, prog(lt, at + 0.3, at + 0.9), { n: 16, r0: 160, r1: 320, color: ILL.gold, width: 8 });
    pinned(() => speedLines(W / 2, H / 2, prog(lt, at + 0.8, S.dur + 0.3), { color: '#ffffff', alpha: 0.6 * dive + 0.2 }));
  },

  vector(lt, S, t) {
    const num = S.word(0, '数字'), grow = easeInOut(prog(lt, 0.2, num + 0.6));
    const L = 1500, cy = H / 2 + 20;
    helix3D(t, W / 2, cy, L, { p: grow, R: 170, turns: 3 });
    // numbers peel off the rungs and float up
    const r = mulberry32(3);
    for (let i = 0; i < 12; i++) {
      const at = num - 0.4 + i * 0.12, u = lt - at, x = W / 2 - L / 2 + (i + 0.5) / 12 * L + (r() - 0.5) * 40, v = (r() * 2 - 1).toFixed(2);
      if (u <= 0 || u > 2.6) continue;
      outlinedText(v, x, cy - 240 - u * 55, { size: 34, color: [ILL.gold, ILL.teal, ILL.pink][i % 3], alpha: prog(u, 0, 0.3) * (1 - prog(u, 1.8, 2.6)) });
    }
    const k = easeInOut(prog(lt, 0, 0.9));
    orb(lerp(W / 2, W / 2 - L / 2 - 90, k), cy, lerp(110, 62, k), t);
  },

  galaxy(lt, S, t) {
    const cx = W / 2, cy = H / 2 + 30, R = 780, spin = 0.15;
    const proj = galaxyDisk(t, cx, cy, R, { n: 3000, tilt: 0.42, spin });
    const words = [['猫', 0.4, 0.05, ILL.gold], ['狗', 0.5, 0.35, ILL.orange], ['老虎', 0.34, 0.62, ILL.orange], ['纸箱', 0.78, 3.2, ILL.teal], ['盒子', 0.9, 3.5, ILL.teal], ['快递', 0.68, 3.75, ILL.teal], ['喜欢', 0.55, 1.75, ILL.pink], ['温暖', 0.68, 2.1, ILL.pink]];
    const at = S.word(0, '相近');
    words.forEach(([w, u, a, col], i) => {
      const g = easeOutBack(prog(lt, at - 0.8 + i * 0.12, at - 0.3 + i * 0.12));
      if (g <= 0) return;
      const q = proj(R * u, a + 3.6 * u + t * spin * (1.3 - u * 0.6));
      glow(q.x, q.y, 60 * g, col, 0.8);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, 6 * g, 0, Math.PI * 2); ctx.fill();
      outlinedText(w, q.x, q.y - 38 * g, { size: 40 * g, color: col });
    });
  },

  planets(lt, S, t) {
    const dogAt = S.word(0, '狗'), tigerAt = S.word(0, '老虎'), boxAt = S.word(0, '纸箱');
    const cat = { x: 760, y: 520 }, dog = { x: 1060, y: 360 }, tiger = { x: 1040, y: 700 }, box = { x: 2350, y: 560 };
    // "near" orbit around the cat
    ctx.save(); ctx.strokeStyle = withAlpha(ILL.lavender, 0.45); ctx.lineWidth = 3; ctx.setLineDash([8, 12]);
    ctx.beginPath(); ctx.ellipse(cat.x + 120, cat.y, 400, 250, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    planet(cat.x, cat.y, 150, { fill: ILL.gold, stripes: [withAlpha(ILL.orange, 0.45), withAlpha(ILL.orange, 0.3)], ring: ILL.pink, t, spin: 0.6, glow: ILL.gold });
    outlinedText('猫', cat.x, cat.y + 215, { size: 46, color: ILL.gold });
    const dg = easeOutBack(prog(lt, dogAt - 0.3, dogAt + 0.3)), tg = easeOutBack(prog(lt, tigerAt - 0.3, tigerAt + 0.3));
    if (dg > 0) { planet(dog.x, dog.y, 85 * dg, { fill: ILL.orange, craters: 4, seed: 5 }); outlinedText('狗', dog.x + 130, dog.y, { size: 40, alpha: dg }); }
    if (tg > 0) { planet(tiger.x, tiger.y, 100 * tg, { fill: '#f29a3a', stripes: [withAlpha(ILL.outline, 0.55), withAlpha(ILL.outline, 0.55), withAlpha(ILL.outline, 0.55)], t }); outlinedText('老虎', tiger.x + 160, tiger.y, { size: 40, alpha: tg }); }
    // the far one
    const far = easeInOut(prog(lt, boxAt - 0.2, boxAt + 1.1));
    planet(box.x, box.y, 90, { fill: '#c99b69', craters: 5, seed: 9 });
    outlinedText('纸箱', box.x, box.y + 140, { size: 44, color: '#e8c39a' });
    if (far > 0) {
      const x1 = lerp(cat.x + 170, box.x - 110, far);
      ctx.save(); ctx.strokeStyle = ILL.pink; ctx.lineWidth = 5; ctx.setLineDash([16, 14]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(cat.x + 170, cat.y); ctx.lineTo(x1, lerp(cat.y, box.y, far)); ctx.stroke(); ctx.restore();
      if (far > 0.7) outlinedText('很远', (cat.x + box.x) / 2, (cat.y + box.y) / 2 - 50, { size: 50, color: ILL.pink, alpha: prog(far, 0.7, 1) });
    }
    twinkles(t, { x0: 0, y0: 0, x1: 2800, y1: H }, 24);
  },

  tunnel(lt, S, t) {
    const tt = lt * 0.9 + (0.9 * lt * lt) / S.dur;
    ringTunnel(tt, W / 2, H / 2, { speed: 1, bend: [Math.sin(lt * 0.8) * 0.6, Math.cos(lt * 0.6) * 0.4] });
    pinned(() => speedLines(W / 2, H / 2, frac(lt * 0.9), { color: '#ffffff', alpha: 0.55 }));
    orb(W / 2, H / 2, 64, t);
    const n = Math.floor(1 + 31 * easeIn(prog(lt, 0.2, S.dur - 0.2)));
    outlinedText(`第 ${n} 层`, W / 2, 130, { size: 46, color: ILL.cream });
  },

  neuron(lt, S, t) {
    const p = easeOut(prog(lt, 0, 1.6));
    const tips = dendrites(W / 2, H / 2, p, t, { reach: 640, roots: 6, depth: 3, seed: 12, soma: ILL.gold, color: ILL.lavender, pulses: 14 });
    const inside = tips.filter((q) => q.x > 200 && q.x < W - 200 && q.y > 140 && q.y < H - 200);
    const pick = [-2.6, -0.5, 0.6, 2.5].map((a) => inside.reduce((best, q) => {
      const d = Math.abs(Math.atan2(q.y - H / 2, q.x - W / 2) - a) - Math.hypot(q.x - W / 2, q.y - H / 2) / 2000;
      return !best || d < best.d ? { ...q, d } : best;
    }, null));
    pick.forEach((q, i) => {
      const g = easeOutBack(prog(lt, 1.1 + i * 0.15, 1.6 + i * 0.15));
      if (g > 0) pill(q.x, q.y, TOKS[i + 1], 46, TCOL[i + 1], { scale: g, glow: 0.4 });
    });
    orb(W / 2, H / 2, 78, t);
  },

  absorb(lt, S, t) {
    const cx = W / 2, cy = H / 2 + 20, R = 640, k = easeInOut(prog(lt, 0.3, S.dur - 0.3));
    accretionDisk(t, cx, cy, R, { tilt: 0.3, hole: 0.2 });
    // other tokens' light spiralling in
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < 16; i++) {
        const u = frac(lt * 0.35 + i / 16 + s * 0.07), rad = lerp(R * 1.1, 60, u), a = s * (Math.PI / 2) + 0.6 + u * 5 + t * 0.3;
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.3;
        lightBlob(x, y, 30 * (1 - u * 0.5), TCOL[s + 1], 0.8);
        ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    orb(cx, cy, lerp(64, 96, k), t, 1 + k * 0.6);
  },

  insight(lt, S, t) {
    const st = S.word(0, '明白'), hab = S.word(0, '习性');
    const ox = W / 2, oy = H * 0.68;
    // rain
    ctx.strokeStyle = 'rgba(160, 180, 255, 0.22)'; ctx.lineWidth = 1.6; ctx.beginPath();
    const rr = mulberry32(4);
    for (let i = 0; i < 220; i++) { const x = rr() * W * 1.2, y = (rr() * H + t * 950) % H; ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 36); }
    ctx.stroke();
    // distant strikes, then the one that hits the token
    const k1 = lightning(W * 0.16, H * 0.18, W * 0.1, H * 0.72, t, { period: 1.9, seed: 5, width: 3 });
    const k2 = lightning(W * 0.86, H * 0.2, W * 0.93, H * 0.7, t, { period: 2.3, offset: 0.9, seed: 9, width: 3 });
    const k3 = lt > st - 0.02 ? lightning(ox + 60, H * 0.14, ox, oy - 70, lt - st + 14, { period: 1.4, seed: 77, width: 9 }) : 0;
    pinned(() => { ctx.fillStyle = withAlpha('#9fb8ff', 0.1 * Math.max(k1 * 0.5, k2 * 0.5, k3)); ctx.fillRect(0, 0, W, H); });
    cloud(W * 0.28, H * 0.07, W * 0.85, 330, { fill: '#4b3d95', seed: 8 });
    cloud(W * 0.7, H * 0.13, W * 0.95, 350, { fill: '#3b2f7a', seed: 3 });
    const lit = easeOut(prog(lt, st, st + 0.4));
    orb(ox, oy, lerp(66, 92, lit), t, 1 + lit * 0.8);
    burst(ox, oy, prog(lt, st, st + 0.6), { n: 18, r0: 110, r1: 260, color: ILL.gold, width: 8 });
    [['动物', -330, -40, ILL.pink], ['习性', 0, -230, ILL.teal], ['提问', 330, -40, ILL.lavender]].forEach(([w, dx, dy, col], i) => {
      const g = spring(lt - (hab - 0.5 + i * 0.18), { stiffness: 220, damping: 13 });
      if (g > 0.01) pill(ox + dx, oy + dy, w, 44, col, { scale: g, glow: 0.35 });
    });
  },

  prism(lt, S, t) {
    const p = easeInOut(prog(lt, 0.2, S.dur - 0.4));
    prismSpectrum(PRISM.x, PRISM.y, PRISM.size, p, BANDS, { src: PRISM.src });
    orb(PRISM.src.x, PRISM.src.y, 58, t);
  },

  choose(lt, S, t) {
    const at = S.word(0, '因为'), dim = easeInOut(prog(lt, at - 0.4, at + 0.4));
    const { exit, ends } = prismSpectrum(PRISM.x, PRISM.y, PRISM.size, 1, BANDS, { src: PRISM.src, focus: 0, dim });
    orb(PRISM.src.x, PRISM.src.y, 58, t);
    const q = { x: lerp(exit.x, ends[0].x, 0.45), y: lerp(exit.y, ends[0].y, 0.45) }, g = easeOutBack(prog(lt, at, at + 0.6));
    if (g > 0) orb(q.x, q.y, 80 * g, t, 1.2, '因为');
  },

  again(lt, S, t) {
    const pts = [...TOKS, '因为'].map((w, i) => ({ w, x: 250 + i * 235, y: 470 + Math.sin(i * 1.1) * 90 }));
    const go = S.word(0, '又一个'), link = easeOut(prog(lt, 0.2, 1));
    ctx.save(); ctx.strokeStyle = withAlpha(ILL.cream, 0.45); ctx.lineWidth = 3;
    for (let i = 0; i < pts.length - 1; i++) {
      const u = i < pts.length - 2 ? 1 : link;
      ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(lerp(pts[i].x, pts[i + 1].x, u), lerp(pts[i].y, pts[i + 1].y, u)); ctx.stroke();
    }
    ctx.restore();
    pts.forEach((p, i) => {
      const last = i === pts.length - 1, g = last ? easeOutBack(prog(lt, 0.6, 1.1)) : 1;
      glow(p.x, p.y, 90, last ? ILL.gold : ILL.lavender, 0.5);
      if (g > 0) pill(p.x, p.y, p.w, 50, last ? ILL.gold : TCOL[i], { scale: g });
    });
    // the next empty slot
    const slot = { x: 250 + 6 * 235, y: 470 + Math.sin(6 * 1.1) * 90 };
    ctx.save(); ctx.globalAlpha = prog(lt, go, go + 0.5); ctx.strokeStyle = ILL.cream; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.roundRect(slot.x - 60, slot.y - 38, 120, 76, 38); ctx.stroke(); ctx.restore();
    if (lt > go) outlinedText('?', slot.x, slot.y, { size: 40, alpha: 0.5 + 0.5 * Math.sin(t * 5) });
    // a comet leaves from the newest token, back down into the model
    const u = prog(lt, go, go + 1.8);
    if (u > 0 && u < 1) {
      const a = pts[pts.length - 1];
      comet((v) => bz([[a.x, a.y], [a.x + 200, a.y + 420], [W * 0.62, H * 1.0], [W * 0.35, H + 220]], v), easeIn(u), t);
    }
  },

  bloom(lt, S, t) {
    const cx = W / 2, cy = H / 2 - 90;
    phyllotaxis(cx, cy, 150, easeOut(prog(lt, 0, S.dur - 1.6)), { t, n: 440 });
    const row = rowLayout(ANSWER, 44, 20, 14, W / 2);
    ANSWER.forEach((w, i) => {
      const at = 1.2 + i * 0.42, g = spring(lt - at, { stiffness: 200, damping: 13 });
      if (g > 0.01) pill(row[i].x, 880 + Math.sin(t * 1.5 + i) * 4, w, 44, TCOL[i % TCOL.length], { scale: g });
    });
    twinkles(t, { x0: 0, y0: 0, x1: W, y1: H * 0.6 }, 16, ['#ffffff', ILL.gold]);
  },
};

const CAMS = {
  enter: (lt, S) => ({ x: W / 2, y: H / 2, z: lerp(1, 1.06, lt / S.dur) * punchIn(lt, S.word(0, '回车'), 0.05) }),
  pick(lt, S) {
    const k = easeIn(prog(lt, S.word(0, '猫') + 0.8, S.dur));
    return { x: W / 2, y: H / 2, z: 1 + 1.6 * k };
  },
  galaxy: (lt, S) => ({ x: W / 2, y: H / 2, z: lerp(1.3, 1, easeOut(prog(lt, 0, S.dur))) }),
  planets(lt, S) {
    const k = easeInOut(prog(lt, S.word(0, '纸箱') - 0.2, S.word(0, '纸箱') + 1.2));
    return { x: lerp(880, 1560, k), y: 540, z: lerp(1.1, 0.72, k) };
  },
  choose(lt, S) {
    const k = easeInOut(prog(lt, S.word(0, '因为'), S.dur));
    return { x: lerp(W / 2, 1250, k), y: lerp(H / 2, 640, k), z: 1 + 0.25 * k };
  },
  bloom: (lt, S) => ({ x: W / 2, y: H / 2, z: 1 + 0.06 * easeInOut(prog(lt, 0, S.dur)) }),
};

const SFX = {
  enter: (S) => [{ at: S.word(0, '回车'), sound: 'click' }, { at: S.word(0, '回车') + 0.05, sound: 'pop' }],
  split: (S) => [{ at: S.word(0, '切成') - 0.1, sound: 'whoosh' }],
  pick: (S) => [{ at: S.word(0, '猫'), sound: 'pop' }, { at: S.word(0, '猫') + 0.8, sound: 'swell' }],
  vector: (S) => [{ at: S.word(0, '数字') - 0.3, sound: 'glitch' }],
  galaxy: (S) => [{ at: S.word(0, '相近') - 0.6, sound: 'ding' }],
  planets: (S) => [{ at: S.word(0, '狗'), sound: 'pop' }, { at: S.word(0, '老虎'), sound: 'pop' }, { at: S.word(0, '纸箱'), sound: 'whoosh' }],
  tunnel: () => [{ at: 0.1, sound: 'swell' }],
  neuron: () => [{ at: 1.1, sound: 'type' }],
  absorb: () => [{ at: 0.1, sound: 'swell' }],
  insight: (S) => [{ at: S.word(0, '明白'), sound: 'glitch' }, { at: S.word(0, '习性'), sound: 'ding' }],
  prism: () => [{ at: 0.3, sound: 'swell' }],
  choose: (S) => [{ at: S.word(0, '因为'), sound: 'success' }],
  again: (S) => [{ at: S.word(0, '又一个'), sound: 'whoosh' }],
  bloom: () => [...ANSWER.map((_, i) => ({ at: 1.2 + i * 0.42, sound: 'pop', volume: 0.6 })), { at: 4.5, sound: 'success' }],
};
