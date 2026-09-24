// Ink wash (水墨): rice paper, brush strokes with ink bleed, distant misty mountains, a cinnabar seal, ink-blot transitions.
registerStyle('ink', {
  palette: {
    bg: '#efe8d8', surface: '#f8f3e8', surfaceAlt: '#e8dfca', ink: '#1f1c1a', sub: '#5b554e', muted: '#a39a8c',
    neutral: '#ddd3c0', ok: '#3d6b58', okDeep: '#2c5242', bad: '#b3342b', note: '#5f7384', mark: '#e6c170', onMark: '#1f1c1a',
  },
  fonts: { body: '"LXGW WenKai", "PingFang SC", sans-serif' },
  line: { wobble: 2.0, mode: 'brush' },
  shadow: 'soft',
  hatch: { rgb: '31, 28, 26', spacing: 7 },
  texture: { grain: 10, vignette: 'rgba(60, 50, 30, 0.16)' },
  transition: 'blot',
  background(b, w, h, P, r) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    // rice paper fibres
    b.lineWidth = 0.7;
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, l = 8 + r() * 34, a = r() * Math.PI;
      b.strokeStyle = `rgba(120, 100, 70, ${0.04 + r() * 0.07})`;
      b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); b.stroke();
    }
    // three misty mountain ridges, far to near
    [[0.6, 0.17, 0.08, 7], [0.7, 0.13, 0.12, 4], [0.8, 0.09, 0.16, 2]].forEach(([base, amp, alpha, blur], k) => {
      b.save(); b.filter = `blur(${blur}px)`;
      b.beginPath(); b.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = h * (base - amp * (0.55 + 0.3 * Math.sin(x * 0.0031 + k * 2.1) + 0.15 * Math.sin(x * 0.011 + k) + 0.06 * Math.sin(x * 0.037)));
        b.lineTo(x, y);
      }
      b.lineTo(w, h); b.closePath();
      const g = b.createLinearGradient(0, h * (base - amp), 0, h);
      g.addColorStop(0, `rgba(31, 28, 26, ${alpha})`); g.addColorStop(0.6, `rgba(31, 28, 26, ${alpha * 0.25})`); g.addColorStop(1, 'rgba(31, 28, 26, 0)');
      b.fillStyle = g; b.fill(); b.restore();
    });
    // cinnabar seal, bottom right
    b.save(); b.translate(w - 130, h - 150); b.rotate(-0.04);
    b.fillStyle = '#b3342b'; b.beginPath(); b.roundRect(-34, -34, 68, 68, 6); b.fill();
    b.fillStyle = '#f8f3e8'; b.font = `700 40px ${'"LXGW WenKai", "PingFang SC", sans-serif'}`; b.textAlign = 'center'; b.textBaseline = 'middle';
    b.fillText('思', 0, 2);
    b.restore();
  },
});
