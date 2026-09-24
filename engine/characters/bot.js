// Bot: small round-headed robot with a screen face and a wobbling antenna.
registerCharacter('bot', {
  height: 300,
  colors: { ink: '#3b2a20', head: '#efe3c8', body: '#dccaa6', screen: '#3a2c24', eye: '#a7ef9a', antenna: '#f2c14e', ok: '#3aa05a', bad: '#d0543a', tear: '#8fc3e8' },
  draw(o) {
    const { t, mood, look, legSwing, bobY, talk, seed, colors: B } = o;
    ctx.strokeStyle = B.ink;
    // legs (feet stay on the ground while the body bobs)
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-20, -46); ctx.lineTo(-22 + legSwing, -6 - bobY);
    ctx.moveTo(20, -46); ctx.lineTo(22 - legSwing, -6 - bobY);
    strokeInk();
    ctx.fillStyle = B.ink;
    ctx.beginPath(); ctx.ellipse(-26 + legSwing, -4 - bobY, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(26 - legSwing, -4 - bobY, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
    // arms
    charLimb(-42, -112, charArmL(o), 58, 8, B.ink, B.ink, 9, B.ink);
    charLimb(42, -112, charArmR(o), 58, 8, B.ink, B.ink, 9, B.ink);
    // body
    ctx.strokeStyle = B.ink;
    rr(-46, -130, 92, 88, 20); ctx.fillStyle = B.body; ctx.fill(); ctx.lineWidth = 4; strokeInk();
    ctx.fillStyle = mood === 'sad' ? B.bad : B.ok;
    ctx.beginPath(); ctx.arc(0, -88, 9, 0, Math.PI * 2); ctx.fill();
    // antenna
    const ax = Math.sin(t * 3 + seed) * 8;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -248); ctx.quadraticCurveTo(ax * 0.3, -270, ax, -286); strokeInk();
    ctx.fillStyle = B.antenna; ctx.beginPath(); ctx.arc(ax, -292, 11, 0, Math.PI * 2); ctx.fill(); strokeInk();
    // head + screen
    rr(-74, -250, 148, 118, 32); ctx.fillStyle = B.head; ctx.fill(); strokeInk();
    rr(-56, -232, 112, 82, 20); ctx.fillStyle = B.screen; ctx.fill();
    // face
    const ex = look * 10;
    ctx.strokeStyle = B.eye; ctx.fillStyle = B.eye; ctx.lineWidth = 5;
    const blink = charBlink(t, seed);
    for (const sx of [-24, 24]) {
      ctx.beginPath();
      if (mood === 'happy') { ctx.arc(sx + ex, -190, 11, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else if (mood === 'sad') { ctx.moveTo(sx + ex - 10, sx < 0 ? -190 : -202); ctx.lineTo(sx + ex + 10, sx < 0 ? -202 : -190); ctx.stroke(); }
      else if (blink) { ctx.moveTo(sx + ex - 10, -196); ctx.lineTo(sx + ex + 10, -196); ctx.stroke(); }
      else { ctx.arc(sx + ex, -196, 10, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.beginPath();
    if (talk && charMouthOpen(t, seed)) { ctx.ellipse(ex, -168, 10, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    else {
      if (mood === 'sad') ctx.arc(ex, -158, 11, Math.PI * 1.2, Math.PI * 1.8);
      else ctx.arc(ex, -176, mood === 'happy' ? 13 : 9, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
    if (mood === 'sad') {
      ctx.fillStyle = B.tear;
      ctx.beginPath(); ctx.moveTo(84, -236); ctx.quadraticCurveTo(96, -214, 84, -208); ctx.quadraticCurveTo(72, -214, 84, -236); ctx.fill();
    }
    hatchShade(-74, -170, 148, 38, [0, 0, 32, 32]);
    hatchShade(-46, -70, 92, 28, [0, 0, 20, 20]);
  },
});
