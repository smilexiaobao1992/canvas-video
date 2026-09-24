// Pixel: retro 8-bit — PICO-8 palette, frame rendered at 1/3 resolution and upscaled, hard shadows, block dissolve.
registerStyle('pixel', {
  dark: true,
  palette: {
    bg: '#1d2b53', surface: '#29366f', surfaceAlt: '#7e2553', ink: '#fff1e8', sub: '#c2c3c7', muted: '#5f574f',
    neutral: '#3b4a7a', ok: '#00e436', okDeep: '#008751', bad: '#ff004d', note: '#29adff', mark: '#ffec27', onMark: '#1d2b53',
  },
  fonts: { body: '"PingFang SC", sans-serif' },
  line: { wobble: 0, mode: 'clean' },
  shadow: 'hard',
  hatch: { rgb: '0, 0, 0', spacing: 6 },
  hardShadow: { alpha: 0.5, blur: 0 },
  pixelate: 3,
  texture: { grain: 0, vignette: null },
  transition: 'dissolve',
  subtitle: { plate: true },
  background(b, w, h, P, r) {
    const px = 6; // one "pixel" after 1/3 downscale is 3px; use a 6px grid so details survive
    const snap = (v) => Math.floor(v / px) * px;
    const bands = ['#16224a', '#1a2750', '#1d2b53', '#22305c', '#283566', '#2f3b70'];
    bands.forEach((c, i) => { b.fillStyle = c; b.fillRect(0, snap((i * h * 0.62) / bands.length), w, h); });
    for (let i = 0; i < 140; i++) {
      b.fillStyle = r() < 0.2 ? '#ffec27' : `rgba(255, 241, 232, ${0.35 + r() * 0.6})`;
      b.fillRect(snap(r() * w), snap(r() * h * 0.55), px, px);
    }
    // stepped mountains, far then near
    for (const [base, amp, color] of [[0.66, 0.16, '#3b2a5c'], [0.76, 0.1, '#241a3f']]) {
      b.fillStyle = color;
      for (let x = 0; x < w; x += px * 4) {
        const top = snap(h * (base - amp * (0.5 + 0.35 * Math.sin(x * 0.004 + base * 9) + 0.15 * Math.sin(x * 0.013))));
        b.fillRect(x, top, px * 4, h - top);
      }
    }
    b.fillStyle = '#142042'; b.fillRect(0, snap(h * 0.86), w, h);
  },
});
