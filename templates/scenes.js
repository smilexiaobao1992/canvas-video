/* Content layer: one function per scene id in script.json.
 * Signature: (lt, S, t) => void
 *   lt = seconds since this scene started, t = global seconds (use for idle motion like blinking)
 *   S  = { id, title, style, dur, lines, cast, L(i) -> { s, e }, word(i, '词'), wordEnd(i, '词'), speaking(lt) }
 *        L(i): narration line i start/end relative to the scene; word(i, str): when `str` is spoken in line i
 * Canvas: W x H (1920x1080, 1080x1920 or 1080x1080 from "format"); keep key content inside SAFE {x0, y0, x1, y1}.
 * Characters: drawRole('host', x, y, scale, t, { mood, look, walk, wave, point, talk }) — who plays "host" is set by "cast".
 * Draw with engine primitives, motion helpers and components; colors are semantic (C.ink, C.ok, C.bad, C.note, C.mark ...).
 * Everything must be a pure function of time: no state carried between frames.
 */
const SCENES = {
  hello(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    const cx = (SAFE.x0 + SAFE.x1) / 2, groundY = SAFE.y1 - 20;
    drawTag('用代码画视频', 'Canvas2D', prog(lt, 0.3, 1.4));
    drawGround(groundY, -200, W + 200);
    // the host walks in, then talks while the narration plays
    const bx = lerp(-160, SAFE.x0 + 180, easeOut(prog(lt, 0, 1.6)));
    drawRole('host', bx, groundY, 1, t, { walk: lt < 1.5, look: 0.8, mood: lt > l1.s ? 'happy' : 'normal', talk: S.speaking(lt) });
    // title letters bounce in exactly when "代码" is spoken
    textReveal('render(t)', cx, SAFE.y0 + 120, lt - S.word(0, '代码'), { mode: 'bounce', size: 96, role: 'mono' });
    // particles assemble into "每一帧" on the second line
    particleText('每一帧', cx, SAFE.y0 + 320, prog(lt, l1.s - 0.2, l1.s + 1.4), { size: 150 });
    drawCheck(cx + 300, SAFE.y0 + 120, 70, prog(lt, l1.e, l1.e + 0.4));
  },

  idea(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('核心思路', 'frame = f(t)', prog(lt, 0.2, 1.3));
    // a timeline with a moving playhead; frames pop out with a spring as it passes
    const y = (SAFE.y0 + SAFE.y1) / 2 + 60, x0 = SAFE.x0 + 60, x1 = SAFE.x1 - 60, n = W > H ? 6 : 4;
    strokeSamples([{ x: x0, y }, { x: x1, y }], { color: C.muted, width: 4 });
    const head = lerp(x0, x1, easeInOut(prog(lt, l0.s, l1.e)));
    for (let i = 0; i < n; i++) {
      const fx = lerp(x0 + 60, x1 - 60, i / (n - 1));
      const passed = (fx - x0) / (x1 - x0) * (l1.e - l0.s) + l0.s;
      const a = spring(lt - passed, { stiffness: 240, damping: 13 });
      if (a > 0) drawToken(fx, y - 110, `t=${i}`, { size: 34, sy: a, sx: a, fill: C.surfaceAlt });
    }
    ctx.strokeStyle = C.ok; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(head, y - 40); ctx.lineTo(head, y + 40); strokeInk();
    glowPulse(head, y, 40, t);
    sparkle(head, y, 9, C.ok);
    textReveal('每一帧 = f(t)', (x0 + x1) / 2, y + 170, lt - l1.s, { mode: 'scramble', size: 48, color: C.note });
  },
};

// optional per-scene camera: (lt, S) => { x, y, z } focus point + zoom; omitted scenes slowly push in
const CAMS = {};

// optional sound effects: (S) => [{ at: seconds in scene, sound, volume }]; transitions get a whoosh automatically
const SFX = {
  hello: (S) => [{ at: S.word(0, '代码'), sound: 'pop' }, { at: S.L(1).e, sound: 'success' }],
};
