// Example: how a language model reasons its way to an answer.
// Scenes use only engine primitives and semantic palette roles, so any style can render them.

// ---------- shared content ----------
const QUESTION = '小明有3个苹果，又买了2袋，每袋4个，一共几个？';
const TOKENS = ['小明', '有', '3', '个', '苹果', '，', '又', '买了', '2', '袋', '，', '每袋', '4', '个', '，', '一共', '几个', '？'];

// ---------- scenes ----------
const SCENES = {
  intro(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawGround(720);
    const walkP = easeOut(prog(lt, 0, 1.6));
    const bx = lerp(-160, 470, walkP);
    const lookUp = prog(lt, l0.s + 0.5, l0.s + 1);
    drawRole('host', bx, 720, 1, t, { walk: lt < 1.5, look: lookUp * 0.8, mood: lt > l1.e ? 'normal' : 'normal' });
    drawTag('一个问题', '你问，它答', prog(lt, 0.3, 1.4));

    // question card
    const cardS = easeOutBack(prog(lt, l0.s - 0.3, l0.s + 0.2));
    if (cardS > 0) {
      ctx.save();
      ctx.translate(1230, 400); ctx.scale(cardS, cardS);
      shadowRect(-548, -76, 1120, 180, 22);
      rr(-560, -90, 1120, 180, 22); ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; strokeInk();
      text('用户提问', -520, -52, { size: 28, color: C.note, align: 'left' });
      const shown = typed(QUESTION, prog(lt, l0.s + 0.1, l0.s + 2.4));
      text(shown, -520, 20, { size: 44, align: 'left' });
      if (Math.floor(lt * 2.5) % 2 === 0) {
        const cw = measure(shown, 44);
        ctx.fillStyle = C.ink; ctx.fillRect(-520 + cw + 6, -8, 3, 52);
      }
      ctx.restore();
    }
    // dashed link from card to the bot's head
    const linkP = easeInOut(prog(lt, l0.s + 1.4, l0.s + 2.2));
    pathWithArrow((u) => bz([[680, 470], [600, 560], [560, 470], [bx + 110, 470]], u), linkP, { color: C.note, width: 3, dash: [10, 10] });
    // question marks pop above the head
    const qs = [[90, -350, 90, 0], [150, -300, 54, 0.25], [30, -320, 44, 0.45]];
    for (const [dx, dy, size, delay] of qs) {
      const q = easeOutBack(prog(lt, l1.s + 0.3 + delay, l1.s + 0.8 + delay));
      if (q <= 0) continue;
      ctx.save();
      ctx.translate(bx + dx, 720 + dy + Math.sin(t * 3 + dx) * 6); ctx.scale(q, q); ctx.rotate(0.12 * Math.sin(t * 2 + dx));
      text('?', 0, 0, { size, color: C.bad, weight: 700 });
      ctx.restore();
    }
  },

  token(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('切成 token', '切块 → 编号 → 向量', prog(lt, 0.2, 1.3));
    const size = 40, pad = 14;
    const split = easeInOut(prog(lt, l0.s + 1.2, l0.s + 2.6));
    const rowY = 400;
    // contiguous layout (no padding) morphing into spaced token boxes
    const plain = TOKENS.map((l) => measure(l, size));
    const ws = TOKENS.map((l, i) => lerp(plain[i], tokW(l, size, pad), split));
    const gap = 14 * split;
    const total = ws.reduce((a, b) => a + b, 0) + gap * (TOKENS.length - 1);
    let x = W / 2 - total / 2;
    const r = mulberry32(11);
    const cells = [];
    TOKENS.forEach((label, i) => {
      const cx = x + ws[i] / 2;
      const jitter = Math.sin(i * 1.7) * 26 * Math.sin(split * Math.PI);
      const id = 100 + Math.floor(r() * 9900);
      const vec = Array.from({ length: 8 }, () => r() * 2 - 1);
      const flip = prog(lt, l1.s + i * 0.07, l1.s + i * 0.07 + 0.35);
      drawToken(cx, rowY + jitter, label, { size, pad, w: ws[i], boxAlpha: split, lw: 3, sy: flip > 0 && flip < 1 ? Math.abs(Math.cos(flip * Math.PI)) : 1, fill: flip >= 0.5 ? C.surfaceAlt : C.surface });
      // token id
      if (flip > 0.5) text(`#${id}`, cx, rowY + 62, { size: 19, color: C.note, alpha: prog(flip, 0.5, 1) });
      // embedding vector strip
      vec.forEach((v, k) => {
        const cp = prog(lt, l1.s + 0.9 + i * 0.07 + k * 0.08, l1.s + 1.1 + i * 0.07 + k * 0.08);
        if (cp <= 0) return;
        cells.push({ x: cx, y: rowY + 100 + k * 26, v, a: cp });
      });
      x += ws[i] + gap;
    });
    for (const c of cells) {
      ctx.save();
      ctx.globalAlpha = c.a;
      ctx.beginPath(); ctx.roundRect(c.x - 13, c.y, 26, 22, 4);
      ctx.fillStyle = c.v > 0 ? withAlpha(C.ok, 0.2 + c.v * 0.8) : withAlpha(C.bad, 0.2 - c.v * 0.8);
      ctx.fill();
      ctx.strokeStyle = withAlpha(C.ink, 0.3); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    // bracket above the row: "18 tokens"
    const bp = easeOut(prog(lt, l0.s + 3.4, l0.s + 4.1));
    if (bp > 0) {
      const x0 = W / 2 - total / 2, x1 = W / 2 + total / 2, by = rowY - 70;
      const half = ((x1 - x0) / 2) * bp;
      strokeSamples([{ x: W / 2 - half, y: by + 14 }, { x: W / 2 - half, y: by }, { x: W / 2 + half, y: by }, { x: W / 2 + half, y: by + 14 }], { color: C.note, width: 3 });
      text(`${TOKENS.length} 个 token`, W / 2, by - 30, { size: 34, color: C.note, alpha: bp });
    }
    const np = prog(lt, l1.s + 1.8, l1.s + 2.4);
    if (np > 0) {
      text('每个 token → 一串数字（向量）', W / 2, 850, { size: 38, color: C.note, alpha: np });
      text('绿 = 正数   红 = 负数', W / 2, 905, { size: 26, color: C.muted, alpha: np });
    }
  },

  attention(lt, S, t) {
    const l1 = S.L(1);
    drawTag('注意力', 'Attention', prog(lt, 0.2, 1.3));
    const size = 36, pad = 14, rowY = 720;
    const lay = rowLayout(TOKENS, size, pad, 12, W / 2);
    const focus = 15;
    const weights = { 2: 0.75, 4: 0.45, 8: 0.7, 9: 0.6, 11: 0.85, 12: 0.9, 13: 0.35 };
    const targets = TOKENS.map((_, i) => i).filter((i) => i !== focus)
      .sort((a, b) => Math.abs(a - focus) - Math.abs(b - focus));
    const reveal = prog(lt, l1.s, l1.s + 0.8);
    const top = rowY - 34;
    // arcs
    targets.forEach((i, order) => {
      const w = weights[i] ?? 0.06;
      const p = easeOut(prog(lt, 0.8 + order * 0.1, 1.6 + order * 0.1));
      if (p <= 0) return;
      const a = lay[focus].x, b = lay[i].x;
      const h = 70 + Math.abs(a - b) * 0.38;
      const curve = [[b, top], [b, top - h], [a, top - h], [a, top]];
      const strong = w >= 0.6;
      const color = strong ? C.ok : C.ink;
      const alpha = lerp(0.35, strong ? 0.95 : 0.25, reveal);
      strokeSamples(samplePath((u) => bz(curve, u), p, 60), { color, width: 2 + w * 14 * lerp(0.6, 1, reveal), alpha });
      // information flowing from target into the focus token
      const n = Math.round(w * 6);
      for (let k = 0; k < n && p >= 1; k++) {
        const pt = bz(curve, frac(lt * 0.45 + k / n));
        if (strong && STYLE.dark && k % 2 === 0) { sparkle(pt.x, pt.y, 6, C.ok); continue; }
        ctx.fillStyle = strong ? C.okDeep : C.muted;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (strong && reveal > 0) text(w.toFixed(2), b, rowY + 58, { size: 26, color: C.ok, alpha: reveal });
    });
    TOKENS.forEach((label, i) => {
      const strong = (weights[i] ?? 0) >= 0.6;
      const fill = i === focus ? C.mark : strong && reveal > 0 ? withAlpha(C.ok, 0.25 * reveal) : C.surface;
      drawToken(lay[i].x, rowY, label, { size, pad, fill, lw: i === focus ? 4 : 3, textColor: i === focus ? C.onMark : C.ink });
    });
    // label under the focus token
    const fp = prog(lt, 0.5, 1.0);
    text('“一共” 在看谁？', lay[focus].x, rowY + 80, { size: 30, color: C.note, alpha: fp });
    drawRole('host', 170, 940, 0.5, t, { look: 1, seed: 1 });
  },

  next(lt, S, t) {
    const l0 = S.L(0);
    drawTag('猜下一个字', 'Next Token', prog(lt, 0.2, 1.3));
    const steps = [
      { cands: [['一共', 0.46], ['答', 0.2], ['总共', 0.14], ['小明', 0.1], ['嗯', 0.05]] },
      { cands: [['有', 0.52], ['是', 0.21], ['买了', 0.1], ['7', 0.08], ['11', 0.05]] },
      { cands: [['7', 0.34], ['11', 0.29], ['12', 0.18], ['9', 0.1], ['8', 0.06]] },
    ];
    // context row
    const ctxTokens = ['…', '每袋', '4', '个', '，', '一共', '几个', '？'];
    const size = 34, pad = 14, rowY = 300;
    let x = 160;
    ctxTokens.forEach((l) => { const w = tokW(l, size, pad); drawToken(x + w / 2, rowY, l, { size, pad, textColor: C.sub, stroke: C.muted }); x += w + 10; });
    x += 20;
    pathWithArrow((u) => ({ x: x + u * 50, y: rowY }), 1, { width: 3, headSize: 14 });
    x += 80;
    text('模型输出：', x - 40, rowY - 62, { size: 26, color: C.ok, align: 'left' });
    const slotX = [];
    steps.forEach((st) => { const w = tokW(st.cands[0][0], size, pad); slotX.push({ x: x + w / 2, w }); x += w + 10; });
    // cursor waiting for next token
    const c0 = l0.s + 1.2;
    const cyc = (S.dur - 1.2 - c0) / steps.length;
    const k = clamp(Math.floor((lt - c0) / cyc), 0, steps.length - 1);
    const u = lt < c0 ? -1 : clamp((lt - c0 - k * cyc) / cyc);
    const done = (i) => lt >= c0 + i * cyc + cyc * 0.9;
    steps.forEach((st, i) => { if (done(i)) drawToken(slotX[i].x, rowY, st.cands[0][0], { size, pad, stroke: C.ok, lw: 4 }); });
    const nextSlot = steps.findIndex((_, i) => !done(i));
    if (nextSlot >= 0 && Math.floor(lt * 2.5) % 2 === 0) {
      const sx = slotX[nextSlot].x - slotX[nextSlot].w / 2 + 6;
      ctx.fillStyle = C.ok; ctx.fillRect(sx, rowY - 26, 4, 52);
    }
    // bot + thinking dots
    drawRole('host', 330, 880, 0.8, t, { look: 1, seed: 2 });
    for (let d = 0; d < 3; d++) {
      const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 5 - d * 0.8));
      ctx.fillStyle = withAlpha(C.ink, a);
      ctx.beginPath(); ctx.arc(440 + d * 26, 620 - d * 14, 7 + d * 2, 0, Math.PI * 2); ctx.fill();
    }
    if (u < 0) return;
    // probability histogram
    const st = steps[k];
    const base = 820, maxH = 330, bw = 130;
    const fadeOut = k < steps.length - 1 ? 1 - prog(u, 0.9, 1) : 1;
    text('下一个字的概率', 1100, 420, { size: 32, color: C.note, alpha: fadeOut });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(680, base); ctx.lineTo(1540, base); strokeInk();
    st.cands.forEach(([label, p], j) => {
      const bx = 740 + j * 175;
      const g = easeOut(prog(u, j * 0.04, 0.3 + j * 0.04));
      const h = (p / 0.55) * maxH * g;
      const win = j === 0 && u > 0.45;
      ctx.save();
      ctx.globalAlpha = fadeOut * (u > 0.45 && j > 0 ? 0.45 : 1);
      shadowRect(bx + 9, base - h + 9, bw, h - 9, [8, 8, 0, 0]);
      rr(bx, base - h, bw, h, [8, 8, 0, 0]);
      ctx.fillStyle = win ? C.ok : C.neutral; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeInk();
      text(label, bx + bw / 2, base + 40, { size: 36 });
      if (g > 0.5) text(`${Math.round(p * 100)}%`, bx + bw / 2, base - h - 26, { size: 30, color: win ? C.ok : C.ink });
      ctx.restore();
    });
    // winner flies into the output slot
    const fly = easeInOut(prog(u, 0.6, 0.9));
    if (fly > 0 && fly < 1) {
      const h0 = (st.cands[0][1] / 0.55) * maxH;
      const fx = lerp(740 + bw / 2, slotX[k].x, fly);
      const fy = lerp(base - h0 - 70, rowY, fly) - Math.sin(fly * Math.PI) * 120;
      drawToken(fx, fy, st.cands[0][0], { size, pad, stroke: C.ok, lw: 4 });
    }
  },

  direct(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('一步到位？', '直接给答案', prog(lt, 0.2, 1.3));
    const appear = easeOutBack(prog(lt, 0.2, 0.7));
    const cross = prog(lt, l1.s + 2.3, l1.s + 2.7);
    const said = lt > l1.s + 1.3;
    // question / answer boxes
    ctx.save(); ctx.globalAlpha = clamp(appear);
    drawToken(380, 330, '问题', { size: 48, w: 280, h: 120 });
    drawToken(1540, 330, said ? '7' : '答案', { size: 48, w: 280, h: 120, stroke: cross > 0 ? C.bad : C.ink, textColor: said ? C.bad : C.ink, lw: cross > 0 ? 5 : 3 });
    ctx.restore();
    // skipped steps
    [760, 960, 1160].forEach((sx, i) => {
      const a = prog(lt, 0.5 + i * 0.15, 0.9 + i * 0.15);
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a * 0.7;
      ctx.setLineDash([8, 8]); ctx.strokeStyle = C.muted; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, 330, 38, 0, Math.PI * 2); strokeInk();
      ctx.restore();
      text('?', sx, 332, { size: 36, color: C.muted, alpha: a });
    });
    text('跳过的步骤', 960, 405, { size: 26, color: C.muted, alpha: prog(lt, l0.s + 1.6, l0.s + 2.1) });
    // jump arc
    const curve = [[530, 290], [780, 110], [1140, 110], [1390, 290]];
    const jp = easeInOut(prog(lt, l0.s + 0.3, l0.s + 1.6));
    pathWithArrow((u) => bz(curve, u), jp, { color: C.ink, width: 4, dash: [14, 10], head: jp >= 1 });
    if (jp > 0 && jp < 1) {
      const b = bz(curve, jp);
      ctx.fillStyle = C.mark; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, 16, 0, Math.PI * 2); ctx.fill(); strokeInk();
    }
    // bot answers
    drawRole('host', 760, 900, 0.85, t, { look: 1, mood: cross > 0.5 ? 'sad' : said ? 'happy' : 'normal', seed: 3 });
    const bs = easeOutBack(prog(lt, l1.s + 1.3, l1.s + 1.7));
    drawBubble(1200, 590, 460, 140, { x: 850, y: 740 }, { scale: bs });
    if (bs > 0.3) text('一共 7 个！', 1200, 592, { size: 60, weight: 700, alpha: prog(bs, 0.3, 1) });
    if (cross > 0) {
      const s = lerp(1.6, 1, easeOutBack(cross));
      ctx.save(); ctx.translate(1540, 590); ctx.scale(s, s);
      drawCross(0, 0, 110, 1);
      ctx.restore();
    }
    const ep = prog(lt, l1.s + 2.9, l1.s + 3.4);
    text('3 + 4 = 7？把「2 袋」漏掉了', 1200, 740, { size: 36, color: C.note, alpha: ep });
  },

  cot(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1), l2 = S.L(2);
    drawTag('思维链', 'Chain of Thought', prog(lt, 0.2, 1.3));
    // notepad
    const np = easeOutBack(prog(lt, 0.1, 0.6));
    ctx.save();
    ctx.translate(980, 540); ctx.scale(np, np); ctx.translate(-980, -540);
    shadowRect(574, 216, 880, 640, 18);
    rr(560, 200, 880, 640, 18); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; strokeInk();
    ctx.strokeStyle = withAlpha(C.note, 0.35); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 320; y < 820; y += 120) { ctx.moveTo(580, y + 40); ctx.lineTo(1420, y + 40); }
    strokeInk();
    ctx.strokeStyle = withAlpha(C.bad, 0.45);
    ctx.beginPath(); ctx.moveTo(630, 210); ctx.lineTo(630, 830); strokeInk();
    ctx.restore();

    const x0 = 670, size = 54;
    const rows = [
      { str: '先写步骤：', y: 290, p: prog(lt, l0.s, l0.s + 1.0), color: C.note, size: 40 },
      { str: '① 2 袋 × 4 个 = 8 个', y: 420, p: prog(lt, l1.s, lerp(l1.s, l1.e, 0.45)) },
      { str: '② 3 + 8 = 11 个', y: 540, p: prog(lt, lerp(l1.s, l1.e, 0.5), lerp(l1.s, l1.e, 0.92)) },
      { str: '答：11 个', y: 680, p: prog(lt, l1.e, l1.e + 0.5), color: C.ok, weight: 700 },
    ];
    const pos = (row, sub, from = 0) => {
      const i = row.str.indexOf(sub, from);
      return x0 + measure(row.str.slice(0, i), size, row.weight) + measure(sub, size, row.weight) / 2;
    };
    const clue = prog(lt, l2.s, l2.s + 0.8);
    const marks = [
      { x: pos(rows[1], '8'), y: rows[1].y }, { x: pos(rows[2], '8'), y: rows[2].y },
      { x: pos(rows[2], '11'), y: rows[2].y }, { x: pos(rows[3], '11'), y: rows[3].y },
    ];
    if (clue > 0) {
      for (const m of marks) {
        ctx.fillStyle = withAlpha(C.mark, (STYLE.dark ? 0.35 : 0.75) * clue);
        ctx.beginPath(); ctx.ellipse(m.x, m.y, 42 * easeOutBack(clue), 36 * easeOutBack(clue), 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    rows.forEach((r) => { if (r.p > 0) text(typed(r.str, r.p), x0, r.y, { size: r.size || size, align: 'left', color: r.color || C.ink, weight: r.weight || 400 }); });
    drawCheck(pos(rows[3], '个') + 90, rows[3].y, 70, prog(lt, l1.e + 0.5, l1.e + 0.9));
    // clue links: previous result feeds the next step
    const links = [[marks[0], marks[1]], [marks[2], marks[3]]];
    links.forEach(([a, b], i) => {
      const p = easeInOut(prog(lt, l2.s + 0.5 + i * 0.8, l2.s + 1.3 + i * 0.8));
      if (p <= 0) return;
      const curve = [[a.x, a.y + 36], [a.x, a.y + 75], [b.x, b.y - 75], [b.x, b.y - 38]];
      pathWithArrow((u) => bz(curve, u), p, { color: C.ok, width: 4, dash: [10, 8], dashOffset: -lt * 30, headSize: 16 });
      if (p >= 1) {
        for (let k = 0; k < 4; k++) {
          const pt = bz(curve, frac(lt * 0.6 + k / 4));
          ctx.fillStyle = C.okDeep; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); ctx.fill();
        }
        const mid = bz(curve, 0.5);
        text('线索', Math.max(a.x, b.x) + 70, mid.y, { size: 30, color: C.ok, alpha: prog(lt, l2.s + 1.3 + i * 0.8, l2.s + 1.7 + i * 0.8) });
      }
    });
    drawRole('host', 320, 880, 0.85, t, { point: lt > l1.s, look: 1, mood: lt > l1.e + 0.4 ? 'happy' : 'normal', seed: 4 });
  },

  reason(lt, S, t) {
    const l0 = S.L(0), l2 = S.L(2);
    drawTag('推理模型', '先在心里试几条路', prog(lt, 0.2, 1.3));
    const Q = [300, 580], A = [1660, 580];
    // construction rings around the nodes
    ctx.save();
    ctx.strokeStyle = withAlpha(C.note, 0.2); ctx.lineWidth = 1.5; ctx.setLineDash([6, 10]);
    for (const [cx, cy] of [Q, A]) for (const r of [110, 190]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    const paths = [
      { c: [Q, [700, 420], [1200, 760], A], label: '2×4=8 → 3+8=11', ok: true },
      { c: [Q, [560, 260], [880, 200], [1220, 250]], label: '3+4=7', ok: false },
      { c: [Q, [560, 920], [860, 940], [1180, 880]], label: '(3+2)×4=20', ok: false },
      { c: [Q, [520, 500], [760, 360], [1000, 400]], label: '3×2+4=10', ok: false },
    ];
    // weight simulation (precomputed history, see SIM below)
    const it = clamp((lt - SIM.t0) / SIM.dt, 0, SIM.hist.length - 1);
    const i0 = Math.floor(it), f = it - i0;
    const w = SIM.hist[i0].map((v, i) => lerp(v, SIM.hist[Math.min(i0 + 1, SIM.hist.length - 1)][i], f));
    const sum = w.reduce((a, b) => a + b, 0);
    const share = w.map((v) => v / sum);
    // paths
    paths.forEach((p, i) => {
      const grow = easeOut(prog(lt, 0.3 + i * 0.2, 1.3 + i * 0.2));
      const fn = (u) => bz(p.c, u);
      const dead = !p.ok && lt > l0.s + 2.5 + i * 0.5;
      const color = p.ok ? (share[0] > 0.4 ? C.ok : C.ink) : C.ink;
      strokeSamples(samplePath(fn, grow), { color, width: 3 + share[i] * 26, alpha: p.ok ? 0.9 : 0.2 + share[i] * 1.6, dash: dead ? [12, 12] : null });
      if (grow >= 1) {
        const lp = bz(p.c, 0.55);
        text(p.label, lp.x, lp.y - (p.ok ? 58 : 34), { size: 28, color: p.ok ? C.ok : C.note, alpha: prog(lt, 1.4, 2) });
      }
      if (!p.ok && grow >= 1) {
        const e = p.c[3];
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e[0], e[1], 16, 0, Math.PI * 2); ctx.fill(); strokeInk();
        drawCross(e[0] + 40, e[1] - 10, 34, prog(lt, l0.s + 2.5 + i * 0.5, l0.s + 2.9 + i * 0.5));
      }
    });
    // thought particles, distributed by current path shares
    const N = 28;
    const cum = share.map((_, i) => share.slice(0, i + 1).reduce((a, b) => a + b, 0));
    if (lt > 1.4) {
      for (let k = 0; k < N; k++) {
        const q = (k + 0.5) / N;
        const pi = cum.findIndex((c) => q <= c);
        const u = frac(lt * 0.28 + k * 0.618);
        const pt = bz(paths[pi].c, u);
        if (paths[pi].ok) { if (k % 3 === 0) sparkle(pt.x, pt.y, 7, C.ok); else { ctx.fillStyle = C.ok; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); ctx.fill(); } }
        else { ctx.fillStyle = C.note; ctx.globalAlpha = 1 - u * 0.8; ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      }
    }
    // nodes
    ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(Q[0], Q[1], 58, 0, Math.PI * 2); ctx.fill(); strokeInk();
    text('问题', Q[0], Q[1] + 2, { size: 36 });
    const solved = easeOutBack(prog(lt, l2.s + 1.4, l2.s + 1.9));
    ctx.fillStyle = solved > 0 ? C.ok : C.surface;
    ctx.beginPath(); ctx.arc(A[0], A[1], 60 * (1 + 0.25 * Math.sin(Math.PI * clamp(solved))), 0, Math.PI * 2); ctx.fill(); strokeInk();
    text(solved > 0 ? '11' : '…', A[0], A[1] + 2, { size: 44, color: solved > 0 ? C.surface : C.ink, weight: 700 });
    if (solved > 0) {
      const burst = prog(lt, l2.s + 1.4, l2.s + 2.4);
      sparkle(A[0] + 52, A[1] - 52, 14 * (1 - burst * 0.5), C.ok);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, d = 70 + burst * 110;
        sparkle(A[0] + Math.cos(a) * d, A[1] + Math.sin(a) * d, 5, C.ok, 1 - burst);
      }
    }
    text('答案', A[0], A[1] + 92, { size: 30, color: C.note });
    drawProgress(80, 180, 300, share[0], '把握');
    drawRole('host', 1700, 960, 0.5, t, { mood: solved > 0 ? 'happy' : 'normal', seed: 5 });
  },

  outro(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1), l2 = S.L(2);
    const p0 = prog(lt, l0.s + 0.8, l0.s + 1.3);
    text('不是', 700, 250, { size: 40, color: C.note, alpha: p0 });
    text('想好了再说', 960, 250, { size: 64, color: C.sub, alpha: p0 });
    const strike = easeOut(prog(lt, l0.s + 2.2, l0.s + 2.7));
    if (strike > 0) strokeSamples([{ x: 800, y: 254 }, { x: 800 + 320 * strike, y: 246 }], { color: C.bad, width: 7 });
    const p1 = prog(lt, l1.s, l1.s + 0.5);
    if (p1 > 0) {
      text('而是', 700, 400, { size: 40, color: C.note, alpha: p1 });
      const hw = measure('边说边想', 96, 700) + 40;
      ctx.fillStyle = C.mark;
      ctx.fillRect(960 - hw / 2, 350, hw * easeOut(prog(lt, l1.s + 0.2, l1.s + 0.8)), 104);
      text('边说边想', 960, 404, { size: 96, weight: 700, alpha: p1, color: C.onMark });
    }
    // stairs made of reasoning steps
    const ground = 880;
    drawGround(ground, 0, W, prog(lt, 0, 0.5));
    const { labels, bw, stepAt, tops } = outroSteps(S);
    labels.forEach((l, i) => {
      const a = easeOutBack(prog(lt, stepAt(i), stepAt(i) + 0.35));
      if (a <= 0) return;
      const top = tops[i].y - (1 - a) * 120;
      ctx.save(); ctx.globalAlpha = clamp(a);
      shadowRect(tops[i].x - bw / 2 + 10, top + 10, bw, ground - top - 10, [10, 10, 0, 0]);
      rr(tops[i].x - bw / 2, top, bw, ground - top, [10, 10, 0, 0]);
      ctx.fillStyle = C.surface; ctx.fill();
      if (i === labels.length - 1) { ctx.fillStyle = withAlpha(C.ok, 0.28); ctx.fill(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeInk();
      text(l, tops[i].x, top + 30, { size: 30, color: i === labels.length - 1 ? C.ok : C.ink });
      ctx.restore();
    });
    const { bx, by } = outroBot(lt, S);
    const finished = lt > stepAt(labels.length - 1) + 0.6;
    drawRole('host', bx, by, 0.6, t, { wave: finished, mood: finished ? 'happy' : 'normal', look: 0.6, seed: 6 });
  },
};

function outroSteps(S) {
  const l2 = S.L(2), ground = 880, bw = 150;
  const labels = ['2袋', '×4', '=8', '3+8', '=11', '✓'];
  const stepAt = (i) => l2.s + 0.3 + i * 0.5;
  const tops = labels.map((_, i) => ({ x: 560 + i * 170 + bw / 2, y: ground - (i + 1) * 55 }));
  return { labels, bw, stepAt, tops, ground };
}
// bot hops onto each new step
function outroBot(lt, S) {
  const { labels, stepAt, tops, ground } = outroSteps(S);
  let bx = 420, by = ground;
  for (let i = 0; i < labels.length; i++) {
    const hs = stepAt(i) + 0.25;
    if (lt < hs) break;
    const hp = easeInOut(prog(lt, hs, hs + 0.3));
    const px = bx, py = by;
    bx = lerp(px, tops[i].x, hp);
    by = lerp(py, tops[i].y, hp) - Math.sin(hp * Math.PI) * 60;
  }
  return { bx, by };
}

// per-scene camera: focus point (x, y) and zoom z
const CAMS = {
  token(lt, S) {
    const l0 = S.L(0), k = easeInOut(prog(lt, l0.s + 0.9, l0.s + 2.8));
    return { x: W / 2, y: lerp(420, H / 2, k), z: lerp(1.18, 1, k) + 0.03 * easeInOut(prog(lt, l0.s + 2.8, S.dur)) };
  },
  attention(lt) {
    const fx = rowLayout(TOKENS, 36, 14, 12, W / 2)[15].x;
    const k = easeInOut(prog(lt, 0.5, 2.6));
    return { x: lerp(fx, W / 2, k), y: lerp(690, H / 2, k), z: lerp(1.5, 1, k) };
  },
  cot(lt, S) {
    const l1 = S.L(1), l2 = S.L(2);
    const k = easeInOut(prog(lt, l1.s - 0.3, l1.s + 1.2)) - easeInOut(prog(lt, l2.s, l2.s + 1.2)) * 0.5;
    return { x: lerp(W / 2, 1000, k), y: lerp(H / 2, 520, k), z: 1 + 0.14 * k };
  },
  reason(lt, S) {
    const l2 = S.L(2);
    const k1 = easeInOut(prog(lt, 0.2, 2.4)), k2 = easeInOut(prog(lt, l2.s + 0.8, l2.s + 2.2));
    return { x: lerp(lerp(300, W / 2, k1), 1350, k2), y: lerp(580, H / 2, k1) + (500 - H / 2) * k2, z: lerp(lerp(1.6, 1, k1), 1.12, k2) };
  },
  outro(lt, S) {
    const { bx, by } = outroBot(lt, S);
    const k = easeInOut(prog(lt, S.L(2).s, S.L(2).s + 1));
    return { x: lerp(W / 2, lerp(W / 2, bx, 0.45), k), y: lerp(H / 2, lerp(H / 2, by - 120, 0.35), k), z: 1 + 0.1 * k };
  },
};

// deterministic path-weight simulation for the "reason" scene
const SIM = (() => {
  const sc = window.TIMELINE.scenes.find((s) => s.id === 'reason');
  const ls = window.TIMELINE.lines.filter((l) => l.scene === 'reason');
  const t0 = 1.4, dt = 0.2;
  const n = Math.floor((ls[2].start - sc.start - t0) / dt);
  const r = mulberry32(42);
  let w = [1, 1, 1, 1];
  const hist = [w.slice()];
  for (let k = 0; k < n; k++) {
    for (let a = 0; a < 3; a++) {
      let x = r() * w.reduce((s, v) => s + v, 0), i = 0;
      while (i < 3 && x > w[i]) { x -= w[i]; i++; }
      if (i === 0) w[0] += 0.3; // only the correct path reaches the answer and gets reinforced
    }
    w = w.map((v) => Math.max(0.03, v * 0.93)); // evaporation
    hist.push(w.slice());
  }
  return { t0, dt, hist };
})();
