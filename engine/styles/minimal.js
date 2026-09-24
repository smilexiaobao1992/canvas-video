// Minimal: clean infographic — off-white canvas, crisp lines, soft shadows, lots of air, cross-fades.
registerStyle('minimal', {
  palette: {
    bg: '#f6f6f3', surface: '#ffffff', surfaceAlt: '#eef2ff', ink: '#15171c', sub: '#5f6673', muted: '#b4b9c4',
    neutral: '#e6e8ee', ok: '#10a55a', okDeep: '#0b7d43', bad: '#e5484d', note: '#3e63dd', mark: '#ffd60a', onMark: '#1e1a16',
  },
  fonts: { body: '"PingFang SC", sans-serif' },
  line: { wobble: 0, mode: 'clean' },
  shadow: 'soft',
  hatch: { rgb: '20, 24, 40', spacing: 7 },
  texture: { grain: 0, vignette: null },
  transition: 'fade',
  background(b, w, h, P) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    b.fillStyle = 'rgba(20, 24, 40, 0.07)';
    for (let x = 24; x < w; x += 48) for (let y = 24; y < h; y += 48) b.fillRect(x - 1, y - 1, 2.5, 2.5);
  },
});
