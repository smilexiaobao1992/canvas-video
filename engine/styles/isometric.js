// Isometric: soft pastel technical look with a faint 30° grid. Pair with engine/iso.js for real 3D scenes.
registerStyle('isometric', {
  palette: {
    bg: '#eef1f7', surface: '#ffffff', surfaceAlt: '#e7ecff', ink: '#2b2d42', sub: '#5c6178', muted: '#b3b9cc',
    neutral: '#dfe4ee', ok: '#3cc49a', okDeep: '#259a76', bad: '#ef476f', note: '#5c7cfa', mark: '#ffd166', onMark: '#2b2d42',
  },
  fonts: { body: '"PingFang SC", sans-serif' },
  line: { wobble: 0, mode: 'clean' },
  shadow: 'soft',
  hatch: { rgb: '40, 50, 90', spacing: 7 },
  texture: { grain: 0, vignette: 'rgba(40, 50, 90, 0.08)' },
  transition: 'fade',
  background(b, w, h, P) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    const g = b.createRadialGradient(w * 0.5, h * 0.35, 50, w * 0.5, h * 0.35, w * 0.7);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.7)'); g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    b.fillStyle = g; b.fillRect(0, 0, w, h);
    // faint isometric grid: lines at +30° and -30°
    b.strokeStyle = 'rgba(92, 124, 250, 0.07)'; b.lineWidth = 1.2; b.beginPath();
    const k = Math.tan(Math.PI / 6), step = 64;
    for (let c = -w; c < w + h / k; c += step) { b.moveTo(c, 0); b.lineTo(c - h / k, h); b.moveTo(c - h / k, 0); b.lineTo(c, h); }
    b.stroke();
  },
});
