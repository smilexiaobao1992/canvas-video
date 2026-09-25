// Neon: cyberpunk night — perspective grid, clean glowing lines, scanlines, subtitle plate.
const NEON_SCAN = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 4;
  const b = c.getContext('2d'); b.fillStyle = 'rgba(0, 0, 0, 0.18)'; b.fillRect(0, 0, 4, 2);
  return c;
})();

registerStyle('neon', {
  dark: true,
  palette: {
    bg: '#0a0816', surface: '#140f2b', surfaceAlt: '#2a1b5c', ink: '#f1ecff', sub: '#b7b1e0', muted: '#4d4775',
    neutral: '#221a44', ok: '#3dffb0', okDeep: '#3dffb0', bad: '#ff3d7f', note: '#58c4ff', mark: '#ffe45c', onMark: '#1e1a16',
  },
  fonts: { body: '"PingFang SC", sans-serif', mono: 'Menlo, monospace' },
  line: { wobble: 0, mode: 'glow', glowBlur: 22 },
  shadow: 'none',
  texture: { grain: 10, vignette: 'rgba(0, 0, 0, 0.5)' },
  transition: 'wipe',
  subtitle: { plate: true },
  // floor grid rolling toward the viewer, twinkling stars, breathing horizon glow
  ambient(c, t, P, info) {
    const r = mulberry32(info.seed), hy = H * 0.64, N = 14;
    c.strokeStyle = 'rgba(255, 61, 127, 0.3)'; c.lineWidth = 1.6; c.beginPath();
    for (let k = 0; k < N; k++) { const y = hy + Math.pow(frac((k + t * 0.6) / N), 2.2) * (H - hy); c.moveTo(0, y); c.lineTo(W, y); }
    c.stroke();
    lightBlob(W / 2, hy, W * 0.45, '#ff3d7f', 0.16 + 0.06 * Math.sin(t * 1.4));
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * hy * 0.95, ph = r() * 20; c.globalAlpha = 0.15 + 0.7 * Math.max(0, Math.sin(t * 2 + ph)) ** 3; c.fillRect(x, y, 2, 2); }
    c.globalAlpha = 1;
  },
  background(b, w, h, P, r) {
    const g = b.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0816'); g.addColorStop(1, '#170c30');
    b.fillStyle = g; b.fillRect(0, 0, w, h);
    bgDust(b, '220, 220, 255', r, 500, 0.5, 1.8);
    // perspective floor grid toward a vanishing point
    const hy = h * 0.64, vx = w / 2;
    b.strokeStyle = 'rgba(255, 61, 127, 0.22)'; b.lineWidth = 1.5; b.beginPath();
    for (let i = -24; i <= 24; i++) { b.moveTo(vx + i * 30, hy); b.lineTo(vx + i * 260, h); }
    for (let k = 0; k < 14; k++) { const y = hy + Math.pow(k / 13, 2.2) * (h - hy); b.moveTo(0, y); b.lineTo(w, y); }
    b.stroke();
    const glow = b.createLinearGradient(0, hy - 60, 0, hy + 10);
    glow.addColorStop(0, 'rgba(255, 61, 127, 0)'); glow.addColorStop(1, 'rgba(255, 61, 127, 0.18)');
    b.fillStyle = glow; b.fillRect(0, hy - 60, w, 70);
  },
  overlay(c, t) {
    c.fillStyle = c.createPattern(NEON_SCAN, 'repeat'); c.fillRect(0, 0, W, H);
    const y = ((t * 260) % (H + 200)) - 100;
    const band = c.createLinearGradient(0, y - 60, 0, y + 60);
    band.addColorStop(0, 'rgba(255, 255, 255, 0)'); band.addColorStop(0.5, 'rgba(255, 255, 255, 0.035)'); band.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = band; c.fillRect(0, y - 60, W, 120);
  },
});
