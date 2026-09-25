// Chalk: classroom blackboard — smudged green board, wooden frame, broken chalk strokes, eraser transitions.
registerStyle('chalk', {
  dark: true,
  palette: {
    bg: '#27352e', surface: '#2f3f37', surfaceAlt: '#3b5046', ink: '#f1efe6', sub: '#c5cfc7', muted: '#7d9186',
    neutral: '#3a4c43', ok: '#9fe3a4', okDeep: '#bff0c2', bad: '#f5978e', note: '#a8cdf0', mark: '#f4e39a', onMark: '#1e1a16',
  },
  fonts: { body: '"LXGW WenKai", "PingFang SC", sans-serif' },
  line: { wobble: 2.4, mode: 'chalk' },
  shadow: 'hatch',
  hatch: { rgb: '241, 239, 230', spacing: 8 },
  texture: { grain: 24, vignette: 'rgba(0, 0, 0, 0.35)' },
  transition: 'erase',
  // chalk dust drifting down and a slowly moving smudge of light
  ambient(c, t, P, info) {
    const r = mulberry32(info.seed);
    lightBlob(r() * W + Math.sin(t * 0.08) * 150, r() * H, Math.max(W, H) * 0.35, '#ffffff', 0.05);
    c.fillStyle = '#f1efe6';
    for (let i = 0; i < 40; i++) {
      const x0 = r() * W, sp = 10 + r() * 16, ph = r() * 100, sz = 1 + r() * 1.8;
      c.globalAlpha = 0.18 + 0.25 * Math.sin(t + ph) ** 2;
      c.beginPath(); c.arc(x0 + Math.sin(t * 0.3 + ph) * 30 - t * 4, (ph * 17 + t * sp) % (H + 20), sz, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  },
  background(b, w, h, P, r) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    // eraser smudges and swirls
    b.save(); b.filter = 'blur(28px)';
    for (let i = 0; i < 40; i++) {
      b.fillStyle = `rgba(255, 255, 255, ${0.015 + r() * 0.025})`;
      b.beginPath(); b.ellipse(r() * w, r() * h, 80 + r() * 260, 30 + r() * 90, r() * Math.PI, 0, Math.PI * 2); b.fill();
    }
    b.filter = 'blur(10px)'; b.lineWidth = 50; b.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      b.strokeStyle = `rgba(255, 255, 255, ${0.02 + r() * 0.02})`;
      const cx = r() * w, cy = r() * h, rad = 120 + r() * 200, a0 = r() * Math.PI * 2;
      b.beginPath(); b.arc(cx, cy, rad, a0, a0 + 1 + r() * 2); b.stroke();
    }
    b.restore();
    bgDust(b, '255, 255, 255', r, 9000, 0.12, 1.4);
    // wooden frame
    b.strokeStyle = '#6b4a2b'; b.lineWidth = 26; b.strokeRect(0, 0, w, h);
    b.strokeStyle = 'rgba(0, 0, 0, 0.35)'; b.lineWidth = 3; b.strokeRect(14, 14, w - 28, h - 28);
    b.fillStyle = '#5a3d22'; b.fillRect(0, h - 22, w, 22);
  },
});
