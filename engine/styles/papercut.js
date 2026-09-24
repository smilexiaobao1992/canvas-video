// Papercut (剪纸 / 纸艺): layered colored paper, scissor-cut edges, hard drop shadows, paper sheets sliding in.
registerStyle('papercut', {
  palette: {
    bg: '#9fd3c7', surface: '#fffaf0', surfaceAlt: '#ffe3c2', ink: '#2d3142', sub: '#4f5d75', muted: '#6fa698',
    neutral: '#d7efe8', ok: '#2a9d8f', okDeep: '#1f776c', bad: '#e76f51', note: '#35606e', mark: '#f4a261', onMark: '#2d3142',
  },
  fonts: { body: '"LXGW WenKai", "PingFang SC", sans-serif' },
  line: { wobble: 0.6, mode: 'clean' },
  shadow: 'hard',
  hatch: { rgb: '25, 45, 50', spacing: 7 },
  hardShadow: { alpha: 0.28, blur: 3 },
  texture: { grain: 8, vignette: 'rgba(20, 50, 50, 0.14)' },
  transition: 'slide',
  background(b, w, h, P, r) {
    b.fillStyle = P.bg; b.fillRect(0, 0, w, h);
    bgDust(b, '255, 255, 255', r, 3000, 0.12, 1.4);
    // cut-paper sun peeking from the top edge (kept out of the content area)
    b.save(); b.filter = 'blur(3px)'; b.fillStyle = 'rgba(25, 45, 50, 0.25)'; b.beginPath(); b.arc(w * 0.55 + 8, 10, 95, 0, Math.PI * 2); b.fill(); b.restore();
    b.fillStyle = '#ffd29d'; b.beginPath(); b.arc(w * 0.55, 0, 95, 0, Math.PI * 2); b.fill();
    // three paper hills, each casting a shadow on the layer behind
    [[0.8, 0.06, '#86c5b8'], [0.87, 0.05, '#6bb2a4'], [0.94, 0.04, '#4f9a8c']].forEach(([base, amp, color], k) => {
      const ridge = () => {
        b.beginPath(); b.moveTo(0, h);
        for (let x = 0; x <= w; x += 10) b.lineTo(x, h * (base - amp * (0.5 + 0.35 * Math.sin(x * 0.0042 + k * 1.7) + 0.15 * Math.sin(x * 0.013 + k))));
        b.lineTo(w, h); b.closePath();
      };
      b.save(); b.filter = 'blur(4px)'; b.translate(0, -9); ridge(); b.fillStyle = 'rgba(25, 45, 50, 0.25)'; b.fill(); b.restore();
      ridge(); b.fillStyle = color; b.fill();
    });
  },
});
