/* Components: ready-made, style-aware explainer widgets with built-in entrance animation.
 * Conventions: (x, y) is the top-left corner unless noted; `p` is 0..1 reveal progress; `lt` is scene seconds
 * for widgets that play a sequence (terminal, chat, flow). Colors default to semantic palette roles.
 */

// ---------- icons: drawn in a 100x100 box centered on (x, y) ----------
const ICONS = {
  brain(c) { c.arc(-16, -8, 22, Math.PI * 0.6, Math.PI * 1.9); c.arc(16, -8, 22, Math.PI * 1.1, Math.PI * 0.4); c.moveTo(0, -28); c.lineTo(0, 30); c.moveTo(-18, 6); c.quadraticCurveTo(-6, 10, -8, 22); c.moveTo(18, 6); c.quadraticCurveTo(6, 10, 8, 22); },
  gear(c) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.moveTo(Math.cos(a) * 26, Math.sin(a) * 26); c.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); } c.moveTo(28, 0); c.arc(0, 0, 28, 0, Math.PI * 2); c.moveTo(11, 0); c.arc(0, 0, 11, 0, Math.PI * 2); },
  search(c) { c.moveTo(14, -8); c.arc(-6, -8, 20, 0, Math.PI * 2); c.moveTo(8, 7); c.lineTo(32, 32); },
  doc(c) { c.moveTo(-24, -36); c.lineTo(12, -36); c.lineTo(26, -22); c.lineTo(26, 36); c.lineTo(-24, 36); c.closePath(); c.moveTo(12, -36); c.lineTo(12, -22); c.lineTo(26, -22); for (const y of [-6, 8, 22]) { c.moveTo(-12, y); c.lineTo(14, y); } },
  db(c) { c.ellipse(0, -24, 30, 10, 0, 0, Math.PI * 2); c.moveTo(-30, -24); c.lineTo(-30, 24); c.ellipse(0, 24, 30, 10, 0, Math.PI, 0, true); c.lineTo(30, -24); c.moveTo(-30, 0); c.ellipse(0, 0, 30, 10, 0, Math.PI, 0, true); },
  tool(c) { c.moveTo(-28, 28); c.lineTo(6, -6); c.arc(16, -16, 14, Math.PI * 0.75, Math.PI * 2.1); c.lineTo(22, -14); c.lineTo(14, -22); c.moveTo(-28, 28); c.lineTo(-22, 34); c.lineTo(10, 2); },
  lock(c) { c.rect(-26, -4, 52, 40); c.moveTo(-16, -4); c.lineTo(-16, -18); c.arc(0, -18, 16, Math.PI, 0); c.lineTo(16, -4); c.moveTo(0, 10); c.lineTo(0, 22); },
  cloud(c) { c.moveTo(-30, 20); c.arc(-26, 6, 14, Math.PI * 0.5, Math.PI * 1.4); c.arc(-6, -8, 20, Math.PI * 1.1, Math.PI * 1.9); c.arc(20, 2, 16, Math.PI * 1.4, Math.PI * 0.5); c.closePath(); },
  bolt(c) { c.moveTo(8, -38); c.lineTo(-20, 6); c.lineTo(0, 6); c.lineTo(-8, 38); c.lineTo(22, -8); c.lineTo(2, -8); c.closePath(); },
  check(c) { c.moveTo(-26, 2); c.lineTo(-6, 22); c.lineTo(28, -20); },
  cross(c) { c.moveTo(-22, -22); c.lineTo(22, 22); c.moveTo(22, -22); c.lineTo(-22, 22); },
  star(c) { shapes.star(0, 0, 36).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); },
  user(c) { c.moveTo(14, -16); c.arc(0, -16, 14, 0, Math.PI * 2); c.moveTo(-28, 34); c.quadraticCurveTo(-28, 6, 0, 6); c.quadraticCurveTo(28, 6, 28, 34); },
  chat(c) { c.moveTo(-32, -24); c.lineTo(32, -24); c.lineTo(32, 16); c.lineTo(-6, 16); c.lineTo(-20, 30); c.lineTo(-18, 16); c.lineTo(-32, 16); c.closePath(); for (const x of [-14, 0, 14]) { c.moveTo(x + 2, -4); c.arc(x, -4, 2, 0, Math.PI * 2); } },
  globe(c) { c.moveTo(32, 0); c.arc(0, 0, 32, 0, Math.PI * 2); c.moveTo(-32, 0); c.lineTo(32, 0); c.moveTo(0, -32); c.ellipse(0, 0, 13, 32, 0, -Math.PI / 2, Math.PI * 1.5); c.moveTo(-28, -14); c.lineTo(28, -14); c.moveTo(-28, 14); c.lineTo(28, 14); },
  code(c) { c.moveTo(-12, -20); c.lineTo(-32, 0); c.lineTo(-12, 20); c.moveTo(12, -20); c.lineTo(32, 0); c.lineTo(12, 20); c.moveTo(6, -28); c.lineTo(-6, 28); },
  chip(c) { c.rect(-22, -22, 44, 44); c.rect(-10, -10, 20, 20); for (const k of [-12, 0, 12]) { c.moveTo(k, -22); c.lineTo(k, -32); c.moveTo(k, 22); c.lineTo(k, 32); c.moveTo(-22, k); c.lineTo(-32, k); c.moveTo(22, k); c.lineTo(32, k); } },
  eye(c) { c.moveTo(-36, 0); c.quadraticCurveTo(0, -30, 36, 0); c.quadraticCurveTo(0, 30, -36, 0); c.moveTo(11, 0); c.arc(0, 0, 11, 0, Math.PI * 2); },
  bulb(c) { c.moveTo(-12, 16); c.quadraticCurveTo(-28, 0, -24, -14); c.arc(0, -14, 24, Math.PI, 0); c.quadraticCurveTo(28, 0, 12, 16); c.closePath(); c.moveTo(-10, 24); c.lineTo(10, 24); c.moveTo(-6, 32); c.lineTo(6, 32); },
  book(c) { c.moveTo(0, -24); c.quadraticCurveTo(-18, -32, -34, -26); c.lineTo(-34, 28); c.quadraticCurveTo(-18, 22, 0, 30); c.quadraticCurveTo(18, 22, 34, 28); c.lineTo(34, -26); c.quadraticCurveTo(18, -32, 0, -24); c.lineTo(0, 30); },
  rocket(c) { c.moveTo(0, -38); c.quadraticCurveTo(20, -20, 14, 16); c.lineTo(-14, 16); c.quadraticCurveTo(-20, -20, 0, -38); c.moveTo(6, -10); c.arc(0, -10, 6, 0, Math.PI * 2); c.moveTo(-14, 6); c.lineTo(-26, 22); c.lineTo(-12, 20); c.moveTo(14, 6); c.lineTo(26, 22); c.lineTo(12, 20); c.moveTo(-6, 22); c.lineTo(0, 36); c.lineTo(6, 22); },
  key(c) { c.moveTo(-6, -6); c.arc(-18, -6, 12, 0, Math.PI * 2); c.moveTo(-6, -6); c.lineTo(32, -6); c.moveTo(20, -6); c.lineTo(20, 6); c.moveTo(28, -6); c.lineTo(28, 4); },
  folder(c) { c.moveTo(-34, -22); c.lineTo(-10, -22); c.lineTo(-4, -14); c.lineTo(34, -14); c.lineTo(34, 26); c.lineTo(-34, 26); c.closePath(); },
  mail(c) { c.rect(-34, -22, 68, 46); c.moveTo(-34, -22); c.lineTo(0, 6); c.lineTo(34, -22); },
  plug(c) { c.moveTo(-10, -36); c.lineTo(-10, -18); c.moveTo(10, -36); c.lineTo(10, -18); c.moveTo(-22, -18); c.lineTo(22, -18); c.lineTo(22, 0); c.quadraticCurveTo(22, 16, 0, 16); c.quadraticCurveTo(-22, 16, -22, 0); c.closePath(); c.moveTo(0, 16); c.lineTo(0, 36); },
  loop(c) { c.arc(0, 0, 26, -Math.PI * 0.3, Math.PI * 1.3); c.moveTo(-15, -26); c.lineTo(-17, -12); c.lineTo(-4, -14); },
};
// icon: stroked with the style's line mode; o.fill fills closed icons first
function iconGlyph(name, x, y, size = 80, o = {}) {
  const { color = C.ink, fill = null, width = 5, alpha = 1, rot = 0 } = o;
  if (!ICONS[name]) throw new Error(`unknown icon "${name}"; available: ${Object.keys(ICONS).join(', ')}`);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size / 100, size / 100);
  ctx.beginPath(); ICONS[name](ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = width * (100 / size) * (size / 80); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  strokeInk();
  ctx.restore();
}
// icon inside a rounded badge that pops in with a spring
function iconBadge(name, x, y, size, lt, at, o = {}) {
  const s = spring(lt - at, { stiffness: 220, damping: 13 });
  if (s <= 0) return;
  const { bg = C.surface, color = C.ink, ring = C.ink } = o;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadowRect(-size / 2 + 6, -size / 2 + 8, size, size, size * 0.28);
  rr(-size / 2, -size / 2, size, size, size * 0.28); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = ring; ctx.lineWidth = 3.5; strokeInk();
  iconGlyph(name, 0, 0, size * 0.6, { color });
  ctx.restore();
}

// ---------- panels ----------
// window frame with title bar; returns the content rect { x, y, w, h }
function windowFrame(x, y, w, h, o = {}) {
  const { title = '', dots = true, fill = C.surface, bar = C.neutral, alpha = 1, radius = 16 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  shadowRect(x + 10, y + 12, w, h, radius);
  rr(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  ctx.save(); rr(x, y, w, h, radius); ctx.clip(); ctx.fillStyle = bar; ctx.fillRect(x, y, w, 44); ctx.restore();
  rr(x, y, w, h, radius); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeInk();
  if (dots) [C.bad, C.mark, C.ok].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 26 + i * 22, y + 22, 7, 0, Math.PI * 2); ctx.fill(); });
  if (title) text(title, x + w / 2, y + 23, { size: 20, color: C.sub, role: 'mono' });
  ctx.restore();
  return { x: x + 20, y: y + 64, w: w - 40, h: h - 84 };
}
// browser window with an address bar
function browserWindow(x, y, w, h, url, o = {}) {
  const r = windowFrame(x, y, w, h, { ...o, title: '' });
  rr(x + 110, y + 9, w - 140, 26, 13); ctx.fillStyle = C.surface; ctx.fill();
  text(url, x + 128, y + 23, { size: 17, color: C.sub, align: 'left', role: 'mono' });
  return r;
}

// ---------- code & terminal ----------
const KEYWORDS = /^(const|let|var|function|return|if|else|for|while|await|async|import|from|export|class|new|def|in|of|true|false|null|None|True|False|print)$/;
function tokenizeCode(line) {
  const out = [], re = /(\/\/.*|#.*)|("[^"]*"?|'[^']*'?|`[^`]*`?)|(\b\d+(\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const [tok] = m;
    const kind = m[1] ? 'comment' : m[2] ? 'string' : m[3] ? 'number' : m[5] ? (KEYWORDS.test(tok) ? 'keyword' : /^\s*\(/.test(line.slice(re.lastIndex)) ? 'call' : 'ident') : 'plain';
    out.push({ tok, kind });
  }
  return out;
}
// code editor with typing reveal (p: 0..1 over all characters), syntax colors and an optional highlighted line
function codeBlock(x, y, w, lines, p, o = {}) {
  const { size = 26, title = 'main.js', highlight = -1, lineNumbers = true } = o;
  const lh = size * 1.55, h = 64 + lines.length * lh + 30;
  const r = windowFrame(x, y, w, h, { title, fill: STYLE.dark ? shade(C.bg, -0.25) : '#1f2430', bar: STYLE.dark ? shade(C.bg, -0.1) : '#2a3040' });
  const colors = { keyword: '#c792ea', string: '#c3e88d', number: '#f78c6c', comment: '#697098', call: '#82aaff', ident: '#e6e6e6', plain: '#b8c0d8' };
  const totalChars = lines.reduce((a, l) => a + [...l].length, 0);
  let budget = Math.floor(totalChars * clamp(p) + 1e-6), cursor = null;
  lines.forEach((line, i) => {
    const ly = r.y + i * lh + lh / 2 - 4;
    if (i === highlight && p >= 1) { ctx.fillStyle = withAlpha(C.mark, 0.18); ctx.fillRect(x + 4, ly - lh / 2, w - 8, lh); }
    if (lineNumbers) text(String(i + 1), x + 34, ly, { size: size * 0.8, color: '#4b5270', role: 'mono' });
    let cx = x + (lineNumbers ? 64 : 24);
    for (const { tok, kind } of tokenizeCode(line)) {
      if (budget <= 0) break;
      const shown = [...tok].slice(0, budget).join('');
      budget -= [...shown].length;
      text(shown, cx, ly, { size, color: colors[kind], align: 'left', role: 'mono' });
      cx += measure(shown, size, 400, 'mono');
    }
    if (budget <= 0 && !cursor) cursor = { x: cx, y: ly };
  });
  if (p > 0 && p < 1 && cursor && Math.floor(p * 40) % 2 === 0) { ctx.fillStyle = '#e6e6e6'; ctx.fillRect(cursor.x + 2, cursor.y - size * 0.6, size * 0.5, size * 1.1); }
  return { h };
}
// terminal: entries [{ cmd, out: [lines], at }] — each command types in at `at`, output follows
function terminal(x, y, w, h, entries, lt, o = {}) {
  const { size = 24, title = 'zsh', prompt = '$' } = o;
  const r = windowFrame(x, y, w, h, { title, fill: '#15171d', bar: '#23262f' });
  const lh = size * 1.5, rows = [];
  for (const e of entries) {
    const tp = clamp((lt - e.at) / Math.max(0.3, [...e.cmd].length * 0.04));
    if (lt < e.at) break;
    rows.push({ s: `${prompt} ${typed(e.cmd, tp)}`, c: '#e6e6e6', cursor: tp < 1 });
    if (tp >= 1) (e.out || []).forEach((line, k) => { if (lt > e.at + [...e.cmd].length * 0.04 + 0.25 + k * 0.12) rows.push({ s: line, c: line.startsWith('✓') ? '#7ee787' : line.startsWith('✗') ? '#ff7b72' : '#a0a8c0' }); });
  }
  const maxRows = Math.floor(r.h / lh), vis = rows.slice(-maxRows);
  vis.forEach((row, i) => {
    const yy = r.y + i * lh + lh / 2 - 6;
    text(row.s, r.x, yy, { size, color: row.c, align: 'left', role: 'mono' });
    if (row.cursor && Math.floor(lt * 3) % 2 === 0) { ctx.fillStyle = '#e6e6e6'; ctx.fillRect(r.x + measure(row.s, size, 400, 'mono') + 4, yy - size * 0.55, size * 0.5, size * 1.1); }
  });
}

// ---------- chat ----------
// messages [{ role: 'user' | 'ai' | 'tool', text, at, think = 0.8 }]; AI shows typing dots for `think` seconds, then streams text
function chatBubbles(x, y, w, messages, lt, o = {}) {
  const { size = 30, gap = 22, maxW = w * 0.72, t = lt, avatars = true, streamRate = 22 } = o;
  let cy = y;
  for (const m of messages) {
    if (lt < m.at) break;
    const mine = m.role === 'user', tool = m.role === 'tool';
    const think = m.role === 'ai' ? m.think ?? 0.8 : 0;
    const typingNow = lt < m.at + think;
    const shownText = typingNow ? '' : m.role === 'ai' ? typed(m.text, (lt - m.at - think) * streamRate / [...m.text].length) : m.text;
    const lines = typingNow ? [''] : wrapText(m.role === 'ai' ? shownText || ' ' : m.text, size, maxW - 44);
    const bw = typingNow ? 110 : Math.max(...lines.map((l) => measure(l, size))) + 44, bh = lines.length * size * 1.4 + 26;
    const bx = mine ? x + w - bw - (avatars ? 70 : 0) : x + (avatars ? 70 : 0);
    const s = spring(lt - m.at, { stiffness: 260, damping: 18 });
    ctx.save();
    ctx.translate(mine ? bx + bw : bx, cy + bh); ctx.scale(s, s); ctx.translate(-(mine ? bx + bw : bx), -(cy + bh));
    const fill = mine ? C.note : tool ? C.neutral : C.surface, ink = mine ? '#ffffff' : C.ink;
    shadowRect(bx + 5, cy + 7, bw, bh, 20);
    rr(bx, cy, bw, bh, 20); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = mine ? 0 : 2.5; if (!mine) strokeInk();
    if (typingNow) typingDots(bx + 32, cy + bh / 2 + 4, t, { color: C.ink, r: 6, gap: 22 });
    else {
      let left = [...shownText].length;
      lines.forEach((ln, i) => { const part = [...ln].slice(0, Math.max(0, left)).join(''); left -= [...ln].length; text(part, bx + 22, cy + 13 + size * 0.7 + i * size * 1.4, { size, color: ink, align: 'left' }); });
    }
    if (avatars) iconGlyph(mine ? 'user' : tool ? 'tool' : 'chip', mine ? x + w - 28 : x + 28, cy + bh - 22, 44, { color: C.sub, width: 6 });
    ctx.restore();
    cy += bh + gap;
  }
  return cy;
}

// ---------- charts ----------
// bars: data [{ label, value, color? }]; grows with a staggered spring; highlight index gets C.ok
function barChart(x, y, w, h, data, lt, o = {}) {
  const { start = 0, max = Math.max(...data.map((d) => d.value)) * 1.1, highlight = -1, format = (v) => String(Math.round(v)), size = 26, horizontal = false } = o;
  const n = data.length, gapR = 0.35;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath();
  if (horizontal) { ctx.moveTo(x, y); ctx.lineTo(x, y + h); } else { ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); }
  strokeInk();
  data.forEach((d, i) => {
    const g = spring(lt - start - i * 0.08, { stiffness: 120, damping: 14 });
    const color = d.color || (i === highlight ? C.ok : C.neutral);
    if (horizontal) {
      const bh = h / (n + (n + 1) * gapR), by = y + bh * gapR + i * bh * (1 + gapR), bw2 = (d.value / max) * w * g;
      if (bw2 > 1) { shadowRect(x + 6, by + 6, bw2, bh, 6); rr(x, by, bw2, bh, [0, 8, 8, 0]); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2.5; strokeInk(); }
      text(d.label, x - 14, by + bh / 2, { size, align: 'right' });
      if (g > 0.3) text(format(d.value * Math.min(1, g)), x + bw2 + 12, by + bh / 2, { size: size * 0.9, align: 'left', color: i === highlight ? C.ok : C.sub });
    } else {
      const bw = w / (n + (n + 1) * gapR), bx = x + bw * gapR + i * bw * (1 + gapR), bh2 = (d.value / max) * h * g;
      if (bh2 > 1) { shadowRect(bx + 6, y + h - bh2 + 6, bw, bh2, 6); rr(bx, y + h - bh2, bw, bh2, [8, 8, 0, 0]); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2.5; strokeInk(); }
      text(d.label, bx + bw / 2, y + h + size, { size });
      if (g > 0.3) text(format(d.value * Math.min(1, g)), bx + bw / 2, y + h - bh2 - size * 0.8, { size: size * 0.9, color: i === highlight ? C.ok : C.sub });
    }
  });
}
// lines: series [{ values: [...], color?, label? }]; p reveals left to right with a glowing tip
function lineChart(x, y, w, h, series, p, o = {}) {
  const { min = 0, max = Math.max(...series.flatMap((s) => s.values)) * 1.1, labels = [], grid = 4, size = 22 } = o;
  ctx.save(); ctx.strokeStyle = withAlpha(C.muted, 0.6); ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]); ctx.beginPath();
  for (let k = 0; k <= grid; k++) { const gy = y + (h * k) / grid; ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke(); ctx.restore();
  labels.forEach((l, i) => text(l, x + (w * i) / Math.max(1, labels.length - 1), y + h + size * 1.2, { size, color: C.sub }));
  series.forEach((s, si) => {
    const n = s.values.length, color = s.color || [C.ok, C.note, C.bad, C.mark][si % 4];
    const at = (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; const v = lerp(s.values[i], s.values[i + 1], easeInOut(k)); return { x: x + u * w, y: y + h - ((v - min) / (max - min)) * h }; };
    const e = clamp(p);
    if (e <= 0) return;
    strokeSamples(samplePath(at, e, 120), { color, width: 5 });
    const tip = at(e);
    glowPulse(tip.x, tip.y, 26, e * 10, color);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2); ctx.fill();
    if (s.label && e >= 1) text(s.label, tip.x + 14, tip.y, { size, color, align: 'left' });
  });
}
// donut: data [{ label, value, color? }] sweeps in; center label optional
function donutChart(cx, cy, r, data, p, o = {}) {
  const { thickness = r * 0.38, center = '', size = 24, legend = true } = o;
  const total = data.reduce((a, d) => a + d.value, 0), e = easeInOut(clamp(p));
  let a0 = -Math.PI / 2;
  data.forEach((d, i) => {
    const span = (d.value / total) * Math.PI * 2, color = d.color || [C.ok, C.note, C.mark, C.bad, C.neutral][i % 5];
    const a1 = a0 + span * e;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, Math.max(a0 + 0.001, Math.min(a1, -Math.PI / 2 + Math.PI * 2 * e))); ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.lineCap = 'butt'; ctx.stroke();
    if (legend && e >= 1) {
      const mid = a0 + span / 2, lx = cx + Math.cos(mid) * (r + thickness * 0.9), ly = cy + Math.sin(mid) * (r + thickness * 0.9);
      text(`${d.label} ${Math.round((d.value / total) * 100)}%`, lx, ly, { size, color: C.ink, align: Math.cos(mid) > 0.2 ? 'left' : Math.cos(mid) < -0.2 ? 'right' : 'center' });
    }
    a0 += span;
  });
  if (center) text(center, cx, cy, { size: size * 1.4, weight: 700 });
}
// counter that eases from `from` to `to` (thousands separators) and pops when it lands; p: 0..1
function counter(x, y, from, to, p, o = {}) {
  const { size = 96, color = C.ink, prefix = '', suffix = '', decimals = 0, align = 'center' } = o;
  const v = lerp(from, to, easeOut(clamp(p)));
  const str = `${prefix}${v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;
  const pop = 1 + 0.1 * pingPong(prog(p, 0.9, 1));
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  // tabular layout: every digit gets the width of "0" so the number does not jitter while counting
  const dw = measure('0', size, 700, 'title');
  const chars = [...str], widths = chars.map((c) => (/\d/.test(c) ? dw : measure(c, size, 700, 'title')));
  const w = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
  chars.forEach((ch, i) => { text(ch, cx + widths[i] / 2, 0, { size, color, weight: 700, role: 'title' }); cx += widths[i]; });
  ctx.restore();
}

// ---------- diagrams ----------
// flow chart: nodes [{ id, x, y, label, icon?, at, w?, color? }], edges [{ from, to, at, label?, flow?, curve? }]
// nodes pop in with a spring at `at`; edges draw at `at`; flow: true sends pulses along the edge afterwards
function flowChart(nodes, edges, lt, o = {}) {
  const { size = 28, nodeH = 84, t = lt } = o;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const nw = (n) => n.w || Math.max(160, measure(n.label, size) + (n.icon ? 110 : 60));
  const edgeFn = (e) => {
    const a = byId[e.from], b = byId[e.to];
    if (!a || !b) throw new Error(`flowChart edge ${e.from} -> ${e.to} references a missing node`);
    const dx = b.x - a.x, dy = b.y - a.y, horiz = Math.abs(dx) * (nodeH / nw(a)) > Math.abs(dy);
    const sx = a.x + (horiz ? Math.sign(dx) * nw(a) / 2 : 0), sy = a.y + (horiz ? 0 : Math.sign(dy) * nodeH / 2);
    const ex = b.x - (horiz ? Math.sign(dx) * nw(b) / 2 : 0), ey = b.y - (horiz ? 0 : Math.sign(dy) * nodeH / 2);
    const bend = e.curve ?? 0, mx = (sx + ex) / 2 - (ey - sy) * bend, my = (sy + ey) / 2 + (ex - sx) * bend;
    return (u) => bz([[sx, sy], [lerp(sx, mx, 0.7), lerp(sy, my, 0.7)], [lerp(ex, mx, 0.7), lerp(ey, my, 0.7)], [ex, ey]], u);
  };
  for (const e of edges) {
    const p = easeInOut(prog(lt, e.at, e.at + 0.6));
    if (p <= 0) continue;
    const fn = edgeFn(e), color = e.color || C.ink;
    pathWithArrow(fn, p, { color, width: 3.5, dash: e.dashed ? [10, 8] : null, headSize: 16 });
    if (e.label && p >= 1) { const m = fn(0.5); text(e.label, m.x, m.y - 22, { size: size * 0.75, color: C.note }); }
    if (e.flow && p >= 1) for (let k = 0; k < 3; k++) { const q = fn(frac((t - e.at) * 0.6 + k / 3)); sparkle(q.x, q.y, 7, e.color || C.ok); }
  }
  for (const n of nodes) {
    const s = spring(lt - n.at, { stiffness: 200, damping: 14 });
    if (s <= 0) continue;
    const w = nw(n);
    ctx.save(); ctx.translate(n.x, n.y); ctx.scale(s, s);
    shadowRect(-w / 2 + 7, -nodeH / 2 + 8, w, nodeH, 18);
    rr(-w / 2, -nodeH / 2, w, nodeH, 18); ctx.fillStyle = n.color || C.surface; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; strokeInk();
    if (n.icon) { iconGlyph(n.icon, -w / 2 + 48, 0, 46, { color: n.iconColor || n.textColor || C.ink }); text(n.label, -w / 2 + 88, 2, { size, align: 'left', color: n.textColor || C.ink }); }
    else text(n.label, 0, 2, { size, color: n.textColor || C.ink });
    ctx.restore();
  }
}
// horizontal timeline: items [{ label, sub?, at }] with dots that pop as a progress line reaches them
function timelineAxis(x, y, w, items, lt, o = {}) {
  const { start = 0, dur = 2, size = 26 } = o;
  const p = easeInOut(prog(lt, start, start + dur));
  strokeSamples([{ x, y }, { x: x + w * p, y }], { color: C.ink, width: 4 });
  items.forEach((it, i) => {
    const ix = x + (w * i) / Math.max(1, items.length - 1), reached = p * w >= ix - x - 1;
    const s = reached ? spring(lt - (start + (dur * i) / Math.max(1, items.length - 1)), { stiffness: 260, damping: 12 }) : 0;
    ctx.save(); ctx.translate(ix, y); ctx.scale(s, s);
    ctx.fillStyle = i === items.length - 1 ? C.ok : C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); strokeInk();
    text(it.label, 0, i % 2 ? 50 : -48, { size, weight: 700 });
    if (it.sub) text(it.sub, 0, i % 2 ? 86 : -84, { size: size * 0.75, color: C.sub });
    ctx.restore();
  });
}
// comparison table; rows reveal one by one; cells may be ✓ / ✗ for icons
function compareTable(x, y, colW, rowH, headers, rows, lt, o = {}) {
  const { start = 0, gap = 0.35, size = 26 } = o;
  const w = colW.reduce((a, b) => a + b, 0);
  const hp = easeOut(prog(lt, start, start + 0.4));
  ctx.save(); ctx.globalAlpha *= hp;
  rr(x, y, w, rowH, [12, 12, 0, 0]); ctx.fillStyle = C.ink; ctx.fill();
  let cx = x;
  headers.forEach((h, i) => { text(h, cx + colW[i] / 2, y + rowH / 2, { size, weight: 700, color: C.bg }); cx += colW[i]; });
  ctx.restore();
  rows.forEach((row, r) => {
    const p = easeOut(prog(lt, start + 0.3 + r * gap, start + 0.6 + r * gap));
    if (p <= 0) return;
    const ry = y + rowH * (r + 1);
    ctx.save(); ctx.globalAlpha *= p; ctx.translate((1 - p) * 40, 0);
    ctx.fillStyle = r % 2 ? C.surface : withAlpha(C.neutral, 0.6); ctx.fillRect(x, ry, w, rowH);
    let cx2 = x;
    row.forEach((cell, i) => {
      const mx = cx2 + colW[i] / 2, my = ry + rowH / 2;
      if (cell === '✓') drawCheck(mx, my, rowH * 0.45, 1); else if (cell === '✗') drawCross(mx, my, rowH * 0.36, 1);
      else text(cell, mx, my, { size, weight: i === 0 ? 700 : 400 });
      cx2 += colW[i];
    });
    ctx.restore();
  });
  const tp = easeOut(prog(lt, start, start + 0.4 + rows.length * gap));
  rr(x, y, w, rowH * (1 + rows.length) * tp, 12); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeInk();
}
// callout: dot on the target, elbow leader line, then a label box; p: 0..1
function callout(tx, ty, lx, ly, label, p, o = {}) {
  const { size = 26, color = C.note } = o;
  const d = easeOutBack(prog(p, 0, 0.3)), l = easeInOut(prog(p, 0.2, 0.7)), b = easeOut(prog(p, 0.6, 1));
  if (d <= 0) return;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(tx, ty, 8 * d, 0, Math.PI * 2); ctx.fill();
  ripple(tx, ty, p * 2, 0.1, { color, rings: 1, maxR: 40, dur: 1 });
  const ex = lx + (lx > tx ? -10 : 10);
  if (l > 0) strokeSamples(samplePath((u) => (u < 0.5 ? { x: lerp(tx, tx, 0), y: lerp(ty, ly, u * 2) } : { x: lerp(tx, ex, (u - 0.5) * 2), y: ly }), l, 30), { color, width: 3 });
  if (b > 0) {
    const w = measure(label, size) + 32, bx = lx > tx ? lx : lx - w;
    ctx.save(); ctx.globalAlpha *= b;
    rr(bx, ly - size * 0.9, w, size * 1.8, 10); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 3; strokeInk();
    text(label, bx + w / 2, ly + 1, { size, color: C.ink });
    ctx.restore();
  }
}
// progress ring with percentage; p: 0..1 of value
function progressRing(cx, cy, r, value, p, o = {}) {
  const { width = 16, color = C.ok, size = r * 0.5, label = '' } = o;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(C.muted, 0.4); ctx.lineWidth = width; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  const v = value * easeOut(clamp(p));
  ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v); strokeInk();
  ctx.restore();
  text(`${Math.round(v * 100)}%`, cx, cy - (label ? size * 0.25 : 0), { size, weight: 700, role: 'title' });
  if (label) text(label, cx, cy + size * 0.75, { size: size * 0.45, color: C.sub });
}
