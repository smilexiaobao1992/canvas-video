// Blueprint: deep navy engineering sheet — grid, glowing lines, sparkles. Good for "inside the machine" scenes.
registerStyle('blueprint', {
  dark: true,
  palette: {
    bg: '#141a38', surface: '#1b2350', surfaceAlt: '#2b3a7a', ink: '#dfe4ff', sub: '#aab4e6', muted: '#56608f',
    neutral: '#2a3363', ok: '#4ff0a0', okDeep: '#4ff0a0', bad: '#ff4f8b', note: '#8fa3ff', mark: '#ffd84a', onMark: '#1e1a16',
  },
  fonts: { body: '"LXGW WenKai", "PingFang SC", sans-serif' },
  line: { wobble: 1.6, mode: 'glow', glowBlur: 16 },
  shadow: 'hatch',
  hatch: { rgb: '143, 163, 255', spacing: 7 },
  texture: { grain: 16, vignette: 'rgba(0, 0, 10, 0.38)' },
  transition: 'wipe',
  background(b, w, h, P, r) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    for (const [step, a] of [[40, 0.05], [200, 0.1]]) {
      b.strokeStyle = `rgba(143, 163, 255, ${a})`; b.lineWidth = 1; b.beginPath();
      for (let x = 0; x <= w; x += step) { b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, h); }
      for (let y = 0; y <= h; y += step) { b.moveTo(0, y + 0.5); b.lineTo(w, y + 0.5); }
      b.stroke();
    }
    bgGuides(b, 'rgba(143, 163, 255, 0.10)');
    bgDust(b, '200, 210, 255', r);
  },
});
