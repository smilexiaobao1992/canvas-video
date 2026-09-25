// Paper: warm hand-drawn explainer look — striped paper, wobbly pencil lines, hatched shadows, film grain.
registerStyle('paper', {
  palette: {
    bg: '#f3ecdc', surface: '#fffaf0', surfaceAlt: '#fdf0c8', ink: '#3b2a20', sub: '#8a7a62', muted: '#b9a98c',
    neutral: '#e2d3b3', ok: '#3aa05a', okDeep: '#2d7a45', bad: '#d0543a', note: '#7f93b8', mark: '#f7d84a', onMark: '#1e1a16',
  },
  fonts: { body: '"LXGW WenKai", "PingFang SC", sans-serif' },
  line: { wobble: 1.6, mode: 'pencil', pencil: 'rgba(59, 42, 32, 0.3)' },
  shadow: 'hatch',
  hatch: { rgb: '59, 42, 32', spacing: 7 },
  texture: { grain: 16, vignette: 'rgba(90, 60, 30, 0.13)' },
  transition: 'wipe',
  // drifting warm light patches and floating dust; layout differs per scene (info.seed)
  ambient(c, t, P, info) {
    const r = mulberry32(info.seed), R = Math.max(W, H) * 0.34;
    for (let k = 0; k < 2; k++) { const bx = r() * W, by = r() * H; lightBlob(bx + Math.sin(t * 0.12 + k * 2) * W * 0.1, by + Math.cos(t * 0.1 + k) * H * 0.1, R, '#fff4dc', 0.6); }
    c.fillStyle = 'rgba(120, 90, 50, 0.45)';
    for (let i = 0; i < 30; i++) {
      const x0 = r() * W, y0 = r() * H, sp = 6 + r() * 10, ph = r() * 50, sz = 1.4 + r() * 1.6;
      c.globalAlpha = 0.25 + 0.45 * Math.sin(t * 0.8 + ph) ** 2;
      c.beginPath(); c.arc(((x0 + t * sp) % (W + 40)) - 20, y0 + Math.sin(t * 0.4 + ph) * 25, sz, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  },
  background(b, w, h, P, r) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    b.save(); b.translate(w / 2, h / 2); b.rotate(Math.PI / 4);
    b.fillStyle = 'rgba(222, 205, 170, 0.32)';
    for (let x = -2200; x < 2200; x += 200) b.fillRect(x, -2200, 95, 4400);
    b.restore();
    bgGuides(b, 'rgba(59, 42, 32, 0.06)');
    bgDust(b, '120, 90, 50', r);
  },
});
