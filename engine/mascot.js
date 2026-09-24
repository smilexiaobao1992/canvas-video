/* Mascot: a small round-headed robot drawn from primitives.
 * Keeps its own paper palette in every style (a style may override colors via `mascot: {...}`),
 * while outlines and shading follow the active style's line mode.
 * (x, y) = feet position, s = scale (s = 1 is about 300px tall), t = global time for idle motion.
 */
const BOT_COLORS = { ink: '#3b2a20', head: '#efe3c8', body: '#dccaa6', screen: '#3a2c24', eye: '#a7ef9a', antenna: '#f2c14e', ok: '#3aa05a', bad: '#d0543a', tear: '#8fc3e8' };

function drawBot(x, y, s, t, o = {}) {
  const { wave = false, point = false, mood = 'normal', look = 0, walk = false, alpha = 1, seed = 0 } = o;
  const B = { ...BOT_COLORS, ...STYLE.mascot };
  const bobY = walk ? -Math.abs(Math.sin(t * 10)) * 10 : Math.sin(t * 2.2) * 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  // ground shadow
  ctx.save();
  ctx.beginPath(); ctx.ellipse(8, 3, 70, 11, 0, 0, Math.PI * 2);
  if (STYLE.shadow === 'hatch') {
    ctx.clip();
    ctx.strokeStyle = `rgba(${STYLE.hatch.rgb}, 0.45)`; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = -90; i < 90; i += 6) { ctx.moveTo(i, 16); ctx.lineTo(i + 20, -10); }
    ctx.stroke();
  } else { ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'; ctx.fill(); }
  ctx.restore();
  ctx.translate(0, bobY);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = B.ink;
  // legs
  const legSwing = walk ? Math.sin(t * 10) * 10 : 0;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-20, -46); ctx.lineTo(-22 + legSwing, -6 - bobY);
  ctx.moveTo(20, -46); ctx.lineTo(22 - legSwing, -6 - bobY);
  strokeInk();
  ctx.fillStyle = B.ink;
  ctx.beginPath(); ctx.ellipse(-26 + legSwing, -4 - bobY, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(26 - legSwing, -4 - bobY, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
  // arms: angle 0 = straight down, positive = rotate outward to the right side
  const arm = (sx, sy, a) => {
    const ex = sx + Math.sin(a) * 58, ey = sy + Math.cos(a) * 58;
    ctx.strokeStyle = B.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); strokeInk();
    ctx.fillStyle = B.ink; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
  };
  arm(-42, -112, -0.35 - Math.sin(t * 1.7) * 0.06);
  const aR = wave ? 2.55 + Math.sin(t * 9) * 0.35 : point ? 1.5 : 0.35 + Math.sin(t * 1.7) * 0.06;
  arm(42, -112, aR);
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
  // head
  rr(-74, -250, 148, 118, 32); ctx.fillStyle = B.head; ctx.fill(); strokeInk();
  rr(-56, -232, 112, 82, 20); ctx.fillStyle = B.screen; ctx.fill();
  // face
  const ex = look * 10;
  ctx.strokeStyle = B.eye; ctx.fillStyle = B.eye; ctx.lineWidth = 5;
  const blink = (t + seed) % 3.3 < 0.13;
  for (const sx of [-24, 24]) {
    ctx.beginPath();
    if (mood === 'happy') { ctx.arc(sx + ex, -190, 11, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (mood === 'sad') { ctx.moveTo(sx + ex - 10, sx < 0 ? -190 : -202); ctx.lineTo(sx + ex + 10, sx < 0 ? -202 : -190); ctx.stroke(); }
    else if (blink) { ctx.moveTo(sx + ex - 10, -196); ctx.lineTo(sx + ex + 10, -196); ctx.stroke(); }
    else { ctx.arc(sx + ex, -196, 10, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.beginPath();
  if (mood === 'sad') ctx.arc(ex, -158, 11, Math.PI * 1.2, Math.PI * 1.8);
  else ctx.arc(ex, -176, mood === 'happy' ? 13 : 9, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  if (mood === 'sad') {
    ctx.fillStyle = B.tear;
    ctx.beginPath(); ctx.moveTo(84, -236); ctx.quadraticCurveTo(96, -214, 84, -208); ctx.quadraticCurveTo(72, -214, 84, -236); ctx.fill();
  }
  hatchShade(-74, -170, 148, 38, [0, 0, 32, 32]);
  hatchShade(-46, -70, 92, 28, [0, 0, 20, 20]);
  ctx.restore();
}
