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
