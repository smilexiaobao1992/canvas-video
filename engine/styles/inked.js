// Inked: cartoon illustration — deep night-violet ground, bold dark outlines, flat saturated fills with pencil hatching
// (pair with engine/illustrate.js: inkShape, planet, ringTunnel, galaxyDisk, ...), twinkling star dust, subtitle plate.
registerStyle('inked', {
  dark: true,
  palette: {
    bg: '#15112b', surface: '#241d45', surfaceAlt: '#3a2d6b', ink: '#f7eedc', sub: '#c9bfe6', muted: '#5a4f8a',
    neutral: '#2c2452', ok: '#63c98c', okDeep: '#3fa36c', bad: '#e8488a', note: '#b8a2ff', mark: '#f5b83d', onMark: '#1a1233',
  },
  fonts: { body: '"PingFang SC", sans-serif' },
  line: { wobble: 0, mode: 'clean' },
  shadow: 'none',
  texture: { grain: 14, vignette: 'rgba(5, 3, 15, 0.45)' },
  transition: 'portal',
  subtitle: { plate: true },
  // slow star dust and a few four-point twinkles
  ambient(c, t, P, info) {
    const r = mulberry32(info.seed);
    c.fillStyle = '#f7eedc';
    for (let i = 0; i < 90; i++) {
      const x = r() * W, y = r() * H, ph = r() * 20, s = r() < 0.1 ? 2.6 : 1.5;
      c.globalAlpha = 0.2 + 0.6 * Math.max(0, Math.sin(t * (0.8 + r()) + ph)) ** 2;
      c.fillRect(((x + t * 4) % (W + 10)) - 5, y, s, s);
    }
    c.globalAlpha = 1;
    twinkles(t, { x0: 0, y0: 0, x1: W, y1: H }, 10, ['#ffffff', '#f5b83d', '#f59ac0'], info.seed);
  },
  background(b, w, h, P, r) {
    const g = b.createRadialGradient(w * 0.5, h * 0.45, 50, w * 0.5, h * 0.5, w * 0.75);
    g.addColorStop(0, '#231a47'); g.addColorStop(1, '#100c22');
    b.fillStyle = g; b.fillRect(0, 0, w, h);
    // faint diagonal pencil texture over the whole ground
    b.strokeStyle = 'rgba(0, 0, 0, 0.16)'; b.lineWidth = 1.2; b.beginPath();
    for (let i = 0; i < 1400; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 14; b.moveTo(x, y); b.lineTo(x + l * 0.5, y + l); }
    b.stroke();
    bgDust(b, '247, 238, 220', r, 260, 0.45, 1.6);
  },
});
