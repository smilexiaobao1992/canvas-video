/* Content layer: one function per scene id in script.json.
 * Signature: (lt, S, t) => void
 *   lt = seconds since this scene started, t = global seconds (use for idle motion like blinking)
 *   S  = { id, title, style, dur, lines, cast, L(i) -> { s, e }, speaking(lt) }
 *        L(i): narration line i start/end relative to the scene; speaking(lt): true while a line is being spoken
 * Characters: drawRole('host', x, y, scale, t, { mood, look, walk, wave, point, talk }) — who plays "host" is set by "cast" in script.json.
 * Draw with engine primitives and semantic colors (C.ink, C.ok, C.bad, C.note, C.mark, C.surface ...).
 * Everything must be a pure function of time: no state carried between frames.
 */
const SCENES = {
  hello(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('用代码画视频', 'Canvas2D', prog(lt, 0.3, 1.4));
    drawGround(740);
    const bx = lerp(-160, 460, easeOut(prog(lt, 0, 1.6)));
    drawRole('host', bx, 740, 1, t, { walk: lt < 1.5, look: 0.8, mood: lt > l1.s ? 'happy' : 'normal', talk: S.speaking(lt) });
    // card that types the first line as it is spoken
    const s = easeOutBack(prog(lt, l0.s - 0.3, l0.s + 0.2));
    if (s > 0) {
      ctx.save(); ctx.translate(1180, 420); ctx.scale(s, s);
      shadowRect(-480 + 12, -80 + 14, 960, 160, 22);
      rr(-480, -80, 960, 160, 22); ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; strokeInk();
      text(typed('render(t) → 这一帧的画面', prog(lt, l0.s, l0.e)), -440, 4, { size: 48, align: 'left' });
      ctx.restore();
    }
    drawCheck(1600, 420, 70, prog(lt, l1.s + 0.5, l1.s + 1.0));
  },

  idea(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('核心思路', 'frame = f(t)', prog(lt, 0.2, 1.3));
    // a timeline with a moving playhead; frames pop out as it passes
    const y = 620, x0 = 360, x1 = 1560;
    strokeSamples([{ x: x0, y }, { x: x1, y }], { color: C.muted, width: 4 });
    const head = lerp(x0, x1, easeInOut(prog(lt, l0.s, l1.e)));
    for (let i = 0; i < 6; i++) {
      const fx = lerp(x0 + 60, x1 - 60, i / 5);
      const a = easeOutBack(prog(head, fx - 40, fx + 40));
      if (a > 0) drawToken(fx, y - 110, `t=${i}`, { size: 34, sy: a, fill: C.surfaceAlt });
    }
    ctx.strokeStyle = C.ok; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(head, y - 40); ctx.lineTo(head, y + 40); strokeInk();
    sparkle(head, y, 9, C.ok);
    text('每一帧 = f(t)', 960, 820, { size: 44, color: C.note, alpha: prog(lt, l1.s, l1.s + 0.5) });
  },
};

// optional per-scene camera: (lt, S) => { x, y, z } focus point + zoom; omitted scenes slowly push in
const CAMS = {};
