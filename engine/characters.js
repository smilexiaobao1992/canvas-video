/* Characters and cast.
 * A character is a drawing (bot, person, cat, or your own); a role is a part in the story (host, student).
 * script.json maps roles to characters: "cast": { "host": "bot", "student": { "character": "person", "colors": {...}, "options": {...} } }
 * Scenes only name roles — drawRole('host', ...) — so swapping the cast never touches scene code.
 */
const CHARACTERS = {};

// def: { height = 300, shadowWidth = 70, colors: {...}, options: {...}, draw(o) }
// draw(o) paints in local space with the feet at (0, 0) and ~height px tall at scale 1.
function registerCharacter(name, def) {
  CHARACTERS[name] = { height: 300, shadowWidth: 70, colors: {}, options: {}, ...def, name };
}

// normalize cast entries to { character, colors, options } and validate them
function resolveCast(cast, override, sceneId) {
  const out = {};
  for (const [role, v] of Object.entries({ ...cast, ...override })) {
    const e = typeof v === 'string' ? { character: v } : { ...v };
    if (override[role]) e.character = override[role];
    if (!CHARACTERS[e.character]) throw new Error(`scene "${sceneId}": role "${role}" uses unknown character "${e.character}"; available: ${Object.keys(CHARACTERS).join(', ')}`);
    out[role] = e;
  }
  return out;
}

// o: { mood: 'normal'|'happy'|'sad', look: -1..1, walk, wave, point, talk, alpha, seed, options }
function drawCharacter(name, x, y, s, t, o = {}, entry = {}) {
  const def = CHARACTERS[name];
  if (!def) throw new Error(`unknown character "${name}"; available: ${Object.keys(CHARACTERS).join(', ')}`);
  const { mood = 'normal', look = 0, walk = false, wave = false, point = false, talk = false, alpha = 1, seed = 0 } = o;
  const colors = { ...def.colors, ...(entry.colors || {}) };
  const options = { ...def.options, ...(entry.options || {}), ...(o.options || {}) };
  const bobY = walk ? -Math.abs(Math.sin(t * 10)) * 10 : Math.sin(t * 2.2 + seed) * 2;
  const legSwing = walk ? Math.sin(t * 10) * 10 : 0;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  groundShadow(def.shadowWidth);
  ctx.translate(0, bobY);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  def.draw({ t, mood, look, walk, legSwing, bobY, wave, point, talk, seed, colors, options });
  ctx.restore();
}

// draw whoever plays `role` in the current scene; a bare character name also works
function drawRole(role, x, y, s, t, o = {}) {
  const entry = CUR_SCENE && CUR_SCENE.cast[role];
  if (entry) return drawCharacter(entry.character, x, y, s, t, o, entry);
  if (CHARACTERS[role]) return drawCharacter(role, x, y, s, t, o);
  throw new Error(`role "${role}" is not in the cast of scene "${CUR_SCENE && CUR_SCENE.id}"; add it to "cast" in script.json`);
}

// ellipse shadow under the feet, styled like shadowRect
function groundShadow(w) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(8, 3, w, 11, 0, 0, Math.PI * 2);
  if (STYLE.shadow === 'hatch') {
    ctx.clip();
    ctx.strokeStyle = `rgba(${STYLE.hatch.rgb}, 0.45)`; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = -w - 20; i < w + 20; i += 6) { ctx.moveTo(i, 16); ctx.lineTo(i + 20, -10); }
    ctx.stroke();
  } else if (STYLE.shadow === 'hard') { ctx.fillStyle = `rgba(${STYLE.hatch.rgb}, ${STYLE.hardShadow.alpha})`; ctx.fill(); }
  else { ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'; ctx.fill(); }
  ctx.restore();
}

// shared helpers for character drawings
// blink: true for a short moment every ~3.3s, offset by seed
const charBlink = (t, seed) => (t + seed) % 3.3 < 0.13;
// talking mouth: opens and closes ~6 times per second
const charMouthOpen = (t, seed) => frac(t * 6 + seed * 0.37) < 0.5;
// limb from (sx, sy) at angle a (0 = straight down, positive = toward +x), stroked with an ink outline
function charLimb(sx, sy, a, len, width, fill, ink, endR, endFill) {
  const ex = sx + Math.sin(a) * len, ey = sy + Math.cos(a) * len;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
  if (fill !== ink) { ctx.strokeStyle = ink; ctx.lineWidth = width + 6; strokeInk(); ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.stroke(); }
  else { ctx.strokeStyle = ink; ctx.lineWidth = width; strokeInk(); }
  if (endR) { ctx.beginPath(); ctx.arc(ex, ey, endR, 0, Math.PI * 2); ctx.fillStyle = endFill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3; strokeInk(); }
  return { x: ex, y: ey };
}
// right-arm angle for the common gestures
const charArmR = (o, rest = 0.35) => (o.wave ? 2.55 + Math.sin(o.t * 9) * 0.35 : o.point ? 1.5 : rest + Math.sin(o.t * 1.7) * 0.06);
const charArmL = (o, rest = -0.35) => rest - Math.sin(o.t * 1.7) * 0.06;
