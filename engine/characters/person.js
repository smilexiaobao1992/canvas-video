// Person: simple cartoon human. options.hair: 'short' | 'long' | 'bun', options.glasses: true/false.
// Recolor via cast colors (skin, hair, shirt, pants, shoe) to make teachers, students, engineers...
registerCharacter('person', {
  height: 320,
  shadowWidth: 60,
  colors: { ink: '#3b2a20', skin: '#f5cfa8', hair: '#3b2a20', shirt: '#5b8fd6', pants: '#3d4a66', shoe: '#2b2320', cheek: '#f09a8a', mouth: '#8a3b3b', tear: '#8fc3e8' },
  options: { hair: 'short', glasses: false },
  draw(o) {
    const { t, mood, look, legSwing, bobY, talk, seed, colors: P, options } = o;
    ctx.strokeStyle = P.ink;
    // legs + shoes
    charLimb(-14, -104, Math.atan2(legSwing - 5, 90), 90 - bobY, 16, P.pants, P.ink, 0);
    charLimb(14, -104, Math.atan2(5 - legSwing, 90), 90 - bobY, 16, P.pants, P.ink, 0);
    for (const [sx, sw] of [[-19, legSwing], [19, -legSwing]]) {
      ctx.beginPath(); ctx.ellipse(sx + sw, -8 - bobY, 18, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = P.shoe; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 3; strokeInk();
    }
    // long hair falls behind the head and shoulders
    if (options.hair === 'long') { rr(-58, -318, 116, 150, [56, 56, 24, 24]); ctx.fillStyle = P.hair; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 4; strokeInk(); }
    // arms behind the torso
    charLimb(-36, -196, charArmL(o, -0.25), 64, 14, P.shirt, P.ink, 10, P.skin);
    charLimb(36, -196, charArmR(o, 0.25), 64, 14, P.shirt, P.ink, 10, P.skin);
    // torso
    rr(-40, -208, 80, 112, [26, 26, 12, 12]); ctx.fillStyle = P.shirt; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 4; strokeInk();
    ctx.beginPath(); ctx.moveTo(-12, -207); ctx.lineTo(0, -193); ctx.lineTo(12, -207); ctx.lineWidth = 3; strokeInk();
    hatchShade(-40, -130, 80, 34, [0, 0, 12, 12]);
    // neck + head
    ctx.fillStyle = P.skin; ctx.fillRect(-9, -224, 18, 20);
    ctx.beginPath(); ctx.arc(0, -262, 50, 0, Math.PI * 2); ctx.fillStyle = P.skin; ctx.fill(); ctx.lineWidth = 4; strokeInk();
    // hair
    if (options.hair === 'bun') { ctx.beginPath(); ctx.arc(0, -322, 20, 0, Math.PI * 2); ctx.fillStyle = P.hair; ctx.fill(); strokeInk(); }
    ctx.beginPath();
    ctx.arc(0, -266, 54, Math.PI * 0.97, Math.PI * 2.03);
    for (const [hx, hy] of [[50, -262], [28, -272], [10, -256], [-12, -274], [-34, -258], [-52, -262]]) ctx.lineTo(hx, hy);
    ctx.closePath(); ctx.fillStyle = P.hair; ctx.fill(); strokeInk();
    // face
    const ex = look * 8;
    ctx.fillStyle = withAlpha(P.cheek, 0.55);
    for (const cx of [-32, 32]) { ctx.beginPath(); ctx.ellipse(cx + ex * 0.5, -238, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = P.ink; ctx.fillStyle = P.ink; ctx.lineWidth = 3.5;
    const blink = charBlink(t, seed);
    for (const sx of [-18, 18]) {
      ctx.beginPath();
      if (mood === 'happy') { ctx.arc(sx + ex, -250, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (blink) { ctx.moveTo(sx + ex - 7, -254); ctx.lineTo(sx + ex + 7, -254); ctx.stroke(); }
      else { ctx.ellipse(sx + ex, -254, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); }
      if (mood === 'sad') { ctx.beginPath(); ctx.moveTo(sx + ex - 9, sx < 0 ? -266 : -272); ctx.lineTo(sx + ex + 9, sx < 0 ? -272 : -266); ctx.stroke(); }
    }
    ctx.beginPath();
    if (talk && charMouthOpen(t, seed)) { ctx.ellipse(ex * 0.7, -232, 8, 6, 0, 0, Math.PI * 2); ctx.fillStyle = P.mouth; ctx.fill(); }
    else {
      if (mood === 'sad') ctx.arc(ex * 0.7, -222, 10, Math.PI * 1.2, Math.PI * 1.8);
      else ctx.arc(ex * 0.7, -240, mood === 'happy' ? 12 : 8, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
    }
    if (options.glasses) {
      ctx.lineWidth = 3;
      for (const sx of [-18, 18]) { ctx.beginPath(); ctx.arc(sx + ex, -254, 13, 0, Math.PI * 2); strokeInk(); }
      ctx.beginPath(); ctx.moveTo(-5 + ex, -256); ctx.lineTo(5 + ex, -256); strokeInk();
    }
    if (mood === 'sad') {
      ctx.fillStyle = P.tear;
      ctx.beginPath(); ctx.moveTo(56, -290); ctx.quadraticCurveTo(68, -268, 56, -262); ctx.quadraticCurveTo(44, -268, 56, -290); ctx.fill();
    }
  },
});
