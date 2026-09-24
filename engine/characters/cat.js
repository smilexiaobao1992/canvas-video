// Cat: chubby cartoon cat standing upright, with a swinging tail, whiskers and forehead stripes.
registerCharacter('cat', {
  height: 270,
  shadowWidth: 62,
  colors: { ink: '#3b2a20', fur: '#f2a65a', belly: '#fff1dc', stripe: '#d9823b', earIn: '#f7b7b0', nose: '#e76f7a', eye: '#2b2320', cheek: '#f09a8a', mouth: '#8a3b3b', tear: '#8fc3e8' },
  draw(o) {
    const { t, mood, look, legSwing, bobY, talk, seed, colors: K } = o;
    ctx.strokeStyle = K.ink;
    // tail behind everything
    const sw = Math.sin(t * 2.5 + seed) * 22;
    ctx.beginPath(); ctx.moveTo(30, -52); ctx.quadraticCurveTo(104, -62, 88 + sw, -146);
    ctx.lineWidth = 20; strokeInk();
    ctx.strokeStyle = K.fur; ctx.lineWidth = 13; ctx.stroke();
    // legs + feet
    charLimb(-18, -40, Math.atan2(legSwing - 2, 32), 32 - bobY, 14, K.fur, K.ink, 0);
    charLimb(18, -40, Math.atan2(2 - legSwing, 32), 32 - bobY, 14, K.fur, K.ink, 0);
    for (const [fx, s2] of [[-20, legSwing], [20, -legSwing]]) {
      ctx.beginPath(); ctx.ellipse(fx + s2, -8 - bobY, 18, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = K.fur; ctx.fill(); ctx.strokeStyle = K.ink; ctx.lineWidth = 3.5; strokeInk();
    }
    // arms behind the body
    charLimb(-36, -112, charArmL(o, -0.45), 42, 13, K.fur, K.ink, 10, K.fur);
    charLimb(36, -112, charArmR(o, 0.45), 42, 13, K.fur, K.ink, 10, K.fur);
    // body + belly
    ctx.beginPath(); ctx.ellipse(0, -86, 44, 54, 0, 0, Math.PI * 2); ctx.fillStyle = K.fur; ctx.fill(); ctx.strokeStyle = K.ink; ctx.lineWidth = 4; strokeInk();
    ctx.beginPath(); ctx.ellipse(0, -78, 25, 34, 0, 0, Math.PI * 2); ctx.fillStyle = K.belly; ctx.fill();
    hatchShade(-44, -62, 88, 30, [0, 0, 30, 30]);
    // ears
    for (const m of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-58 * m, -196); ctx.lineTo(-44 * m, -262); ctx.lineTo(-12 * m, -226); ctx.closePath();
      ctx.fillStyle = K.fur; ctx.fill(); ctx.strokeStyle = K.ink; ctx.lineWidth = 4; strokeInk();
      ctx.beginPath(); ctx.moveTo(-48 * m, -208); ctx.lineTo(-42 * m, -244); ctx.lineTo(-24 * m, -224); ctx.closePath(); ctx.fillStyle = K.earIn; ctx.fill();
    }
    // head
    ctx.beginPath(); ctx.ellipse(0, -178, 68, 56, 0, 0, Math.PI * 2); ctx.fillStyle = K.fur; ctx.fill(); ctx.strokeStyle = K.ink; ctx.lineWidth = 4; strokeInk();
    ctx.strokeStyle = K.stripe; ctx.lineWidth = 5; ctx.beginPath();
    for (const [x0, x1] of [[-14, -10], [0, 0], [14, 10]]) { ctx.moveTo(x0, -230); ctx.lineTo(x1, -212); }
    ctx.stroke();
    // face
    const ex = look * 8;
    ctx.fillStyle = withAlpha(K.cheek, 0.5);
    for (const cx of [-44, 44]) { ctx.beginPath(); ctx.ellipse(cx + ex * 0.5, -160, 10, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = K.eye; ctx.fillStyle = K.eye; ctx.lineWidth = 4;
    const blink = charBlink(t, seed);
    for (const sx of [-26, 26]) {
      ctx.beginPath();
      if (mood === 'happy') { ctx.arc(sx + ex, -176, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (mood === 'sad') { ctx.moveTo(sx + ex - 9, sx < 0 ? -176 : -186); ctx.lineTo(sx + ex + 9, sx < 0 ? -186 : -176); ctx.stroke(); }
      else if (blink) { ctx.moveTo(sx + ex - 8, -180); ctx.lineTo(sx + ex + 8, -180); ctx.stroke(); }
      else {
        ctx.ellipse(sx + ex, -180, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx + ex + 3, -184, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = K.eye;
      }
    }
    ctx.fillStyle = K.nose;
    ctx.beginPath(); ctx.moveTo(-7 + ex, -166); ctx.lineTo(7 + ex, -166); ctx.lineTo(ex, -158); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = K.ink; ctx.lineWidth = 3;
    if (talk && charMouthOpen(t, seed)) { ctx.beginPath(); ctx.ellipse(ex, -148, 7, 6, 0, 0, Math.PI * 2); ctx.fillStyle = K.mouth; ctx.fill(); }
    else if (mood === 'sad') { ctx.beginPath(); ctx.arc(ex, -142, 9, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else {
      const r = mood === 'happy' ? 8 : 6;
      ctx.beginPath(); ctx.arc(ex - r, -158, r, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + r, -158, r, 0.1, Math.PI - 0.1); ctx.stroke();
    }
    // whiskers
    ctx.lineWidth = 2; ctx.beginPath();
    for (const m of [-1, 1]) for (const dy of [-10, 2, 14]) { ctx.moveTo(m * 40 + ex, -164 + dy * 0.3); ctx.lineTo(m * 78 + ex, -166 + dy); }
    ctx.stroke();
    if (mood === 'sad') {
      ctx.fillStyle = K.tear;
      ctx.beginPath(); ctx.moveTo(72, -214); ctx.quadraticCurveTo(84, -192, 72, -186); ctx.quadraticCurveTo(60, -192, 72, -214); ctx.fill();
    }
  },
});
