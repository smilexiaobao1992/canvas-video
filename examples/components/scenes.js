// Gallery: every motion helper and component in one short video. Also used by the self-test.
const SCENES = {
  text(lt, S, t) {
    const l0 = S.L(0);
    drawTag('文字动效', 'textReveal / particleText', prog(lt, 0.1, 1));
    const modes = ['bounce', 'drop', 'scramble', 'wave', 'split'];
    modes.forEach((m, i) => {
      const y = 260 + i * 110;
      text(m, 360, y, { size: 26, color: C.note, align: 'right', role: 'mono' });
      textReveal('大模型会思考', 620, y, lt - (l0.s + i * 0.35), { mode: m, size: 64 });
    });
    const pp = prog(lt, l0.s + 1.2, l0.s + 3.2) + prog(lt, S.dur - 1.3, S.dur - 0.4);
    particleText('AGENT', 1400, 540, pp, { size: 190, step: 5 });
  },

  morph(lt, S, t) {
    const l0 = S.L(0);
    drawTag('形状变形', 'morphPath / burst / confetti', prog(lt, 0.1, 1));
    const cx = W / 2, cy = 560;
    const circle = shapes.circle(cx, cy, 200), star = shapes.star(cx, cy, 240), heart = shapes.heart(cx, cy, 240);
    const p1 = prog(lt, S.word(0, '星星') - 0.3, S.word(0, '星星') + 0.5), p2 = prog(lt, S.word(0, '心') - 0.3, S.word(0, '心') + 0.5);
    const rot = lt * 0.3;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(p2 > 0 ? 0 : rot * p1); ctx.translate(-cx, -cy);
    if (p2 > 0) morphPath(star, heart, p2); else morphPath(circle, star, p1);
    ctx.fillStyle = withAlpha(p2 > 0 ? C.bad : C.ok, 0.35); ctx.fill();
    ctx.strokeStyle = p2 > 0 ? C.bad : C.ok; ctx.lineWidth = 6; strokeInk();
    ctx.restore();
    glowPulse(cx, cy, 320, t, p2 > 0 ? C.bad : C.ok, 0.6);
    burst(cx, cy, prog(lt, S.word(0, '星星') + 0.4, S.word(0, '星星') + 1.2), { r0: 260, r1: 380, color: C.mark });
    confetti(prog(lt, S.word(0, '心') + 0.4, S.dur + 1));
  },

  charts(lt, S, t) {
    const l0 = S.L(0);
    drawTag('图表', 'barChart / lineChart', prog(lt, 0.1, 1));
    barChart(140, 300, 720, 460, [{ label: 'GPT-3', value: 175 }, { label: 'PaLM', value: 540 }, { label: 'GPT-4', value: 1760 }, { label: '未来', value: 2600 }], lt, { start: l0.s, highlight: 3, format: (v) => `${Math.round(v)}B` });
    lineChart(1040, 300, 720, 460, [{ values: [2, 3, 5, 9, 16, 30, 55], label: '算力' }, { values: [1, 2, 2.5, 4, 6, 9, 14], label: '数据', color: C.note }], prog(lt, S.word(0, '折线图'), S.word(0, '折线图') + 2.2), { labels: ['2018', '', '2020', '', '2022', '', '2024'] });
  },

  numbers(lt, S, t) {
    const l0 = S.L(0);
    drawTag('数字', 'donutChart / progressRing / counter', prog(lt, 0.1, 1));
    donutChart(420, 560, 170, [{ label: '检索', value: 35 }, { label: '推理', value: 45 }, { label: '生成', value: 20 }], prog(lt, l0.s, l0.s + 1.4), { center: '耗时' });
    progressRing(960, 560, 150, 0.87, prog(lt, S.word(0, '进度环'), S.word(0, '进度环') + 1.5), { label: '准确率' });
    counter(1530, 560, 0, 1250000, prog(lt, S.word(0, '计数器') - 0.3, S.word(0, '计数器') + 1.8), { size: 72, suffix: ' tokens' });
  },

  code(lt, S, t) {
    const l0 = S.L(0);
    drawTag('代码与终端', 'codeBlock / terminal', prog(lt, 0.1, 1));
    codeBlock(100, 240, 880, [
      "import { Agent } from 'sdk'",
      '',
      '// give the model tools and a goal',
      'const agent = new Agent({ tools })',
      "const result = await agent.run('订机票')",
      'print(result.summary)',
    ], prog(lt, l0.s, l0.s + 2.6), { title: 'agent.js', highlight: 4 });
    terminal(1040, 240, 780, 380, [
      { cmd: 'node agent.js', at: l0.s + 2.2, out: ['→ search_flights(北京, 上海)', '→ compare_prices(12 results)', '→ book(MU5101)', '✓ 已预订 9:30 航班'] },
    ], lt, { title: 'zsh' });
  },

  chat(lt, S, t) {
    const l0 = S.L(0);
    drawTag('对话界面', 'chatBubbles', prog(lt, 0.1, 1));
    const r = browserWindow(420, 200, 1080, 720, 'chat.example.com');
    chatBubbles(r.x, r.y + 10, r.w, [
      { role: 'user', text: '帮我查一下明天上海的天气', at: l0.s },
      { role: 'tool', text: '调用工具 weather("上海")', at: l0.s + 1.1 },
      { role: 'ai', text: '明天上海多云转晴，22 到 28 度，适合出门。', at: S.word(0, '思考'), think: 1.0 },
    ], lt, { t });
  },

  flow(lt, S, t) {
    const l0 = S.L(0);
    drawTag('流程图', 'flowChart / iconGlyph', prog(lt, 0.1, 1));
    const a = l0.s;
    flowChart([
      { id: 'goal', x: 300, y: 540, label: '目标', icon: 'star', at: a },
      { id: 'plan', x: 760, y: 360, label: '规划', icon: 'brain', at: a + 0.4 },
      { id: 'tool', x: 1220, y: 360, label: '调用工具', icon: 'tool', at: a + 0.8 },
      { id: 'check', x: 1220, y: 720, label: '检查结果', icon: 'eye', at: a + 1.2 },
      { id: 'done', x: 1640, y: 540, label: '完成', icon: 'check', at: a + 1.6, color: withAlpha(C.ok, 0.25) },
    ], [
      { from: 'goal', to: 'plan', at: a + 0.3, flow: true },
      { from: 'plan', to: 'tool', at: a + 0.7, flow: true },
      { from: 'tool', to: 'check', at: a + 1.1, flow: true },
      { from: 'check', to: 'plan', at: a + 1.5, label: '不满意就重来', dashed: true, curve: -0.2 },
      { from: 'check', to: 'done', at: a + 1.9, flow: true },
    ], lt, { t });
  },

  table(lt, S, t) {
    const l0 = S.L(0);
    drawTag('时间轴与对比', 'timelineAxis / compareTable / callout', prog(lt, 0.1, 1));
    timelineAxis(160, 330, 760, [{ label: '聊天', sub: '2022' }, { label: '工具', sub: '2023' }, { label: '智能体', sub: '2024' }, { label: '协作', sub: '2025' }], lt, { start: l0.s, dur: 2 });
    compareTable(1060, 230, [220, 220, 220], 84, ['能力', '聊天机器人', '智能体'], [['回答问题', '✓', '✓'], ['调用工具', '✗', '✓'], ['多步规划', '✗', '✓']], lt, { start: S.word(0, '对比') });
    callout(740, 330, 820, 620, '这里开始能自己动手', prog(lt, S.word(0, '标注') - 0.2, S.word(0, '标注') + 1.2));
  },

  gen1(lt, S, t) {
    drawTag('生成式背景', 'networkField / flowField / emitter', prog(lt, 0.1, 1));
    const reveal = prog(lt, 0, 1.2);
    // left: neural-network style particle graph, nodes near the pointer light up
    const cx = 520, cy = 600;
    networkField(t, { rect: { x0: 120, y0: 260, x1: 920, y1: 940 }, n: 60, linkDist: 170, alpha: reveal, lit: (i, p) => 1 - clamp(Math.hypot(p.x - cx, p.y - cy) / 260) });
    // right top: flow field
    ctx.save(); ctx.beginPath(); ctx.rect(1040, 240, 760, 360); ctx.clip();
    flowField(t, { rect: { x0: 1000, y0: 200, x1: 1840, y1: 640 }, n: 160, color: C.ok, alpha: 0.8 * reveal });
    ctx.restore();
    // right bottom: data burst on the word 喷出
    emitter(t, { preset: 'dataBurst', x: 1420, y: 800, start: S.start + S.word(0, '喷出'), stop: S.start + S.word(0, '喷出') + 0.8, color: C.mark, seed: 3 });
    iconBadge('chip', 1420, 800, 110, lt, S.word(0, '喷出') - 0.3);
  },

  gen2(lt, S, t) {
    drawTag('群集与生长', 'makeFlock / branchTree', prog(lt, 0.1, 1));
    const flock = makeFlock({ n: 40, seed: 5, rect: { x0: 100, y0: 240, x1: 900, y1: 900 }, duration: S.dur + 1, target: (tt) => ({ x: 500 + Math.cos(tt * 0.9) * 220, y: 570 + Math.sin(tt * 1.3) * 150 }) });
    drawFlock(flock, lt, { color: C.ink, accent: C.bad, size: 13 });
    branchTree(1400, 960, prog(lt, 0.3, S.word(0, '长出来') + 0.6), {
      depth: 4, len: 190, spread: 0.5, seed: 7, highlight: [1, 0, 1],
      focus: prog(lt, S.word(0, '点亮') - 0.2, S.word(0, '点亮') + 0.6), labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    });
  },

  gen3(lt, S, t) {
    drawTag('三维与物理', 'project3 / drawPointCloud / rollDown', prog(lt, 0.1, 1));
    const cam = { rx: -0.35, ry: lt * 0.35, dist: 900, fov: 1150, cx: 540, cy: 620 };
    wireAxes(260, cam, { labels: ['x', 'y', 'z'] });
    const r = mulberry32(9);
    const words = [['国王', [120, -140, 60]], ['女王', [160, -60, -120]], ['男人', [-60, -120, 140]], ['女人', [-20, -40, -40]], ['猫', [-180, 120, 40]], ['狗', [-150, 150, -40]]];
    const cloud = [...Array.from({ length: 50 }, () => ({ p: [(r() - 0.5) * 460, (r() - 0.5) * 460, (r() - 0.5) * 460], r: 4, color: C.muted })),
      ...words.map(([label, p]) => ({ p, label, r: 9, color: C.note }))];
    drawPointCloud(cloud, cam, { labelSize: 26 });
    drawLine3([-60, -120, 140], [120, -140, 60], cam, { arrow: true, color: C.ok, width: 3.5, p: prog(lt, S.word(0, '词向量'), S.word(0, '词向量') + 0.8) });
    drawLine3([-20, -40, -40], [160, -60, -120], cam, { arrow: true, color: C.ok, width: 3.5, p: prog(lt, S.word(0, '词向量') + 0.5, S.word(0, '词向量') + 1.3) });
    // gradient descent: a ball rolls down a curve into the valley
    // screen y grows downward, so a valley is largest y in the middle; the bump gives a local dip on the way down
    const curve = (x) => 880 - 0.0014 * (x - 1480) ** 2 + 30 * Math.sin((x - 1080) / 55);
    strokeSamples(samplePath((u) => ({ x: 1080 + u * 800, y: curve(1080 + u * 800) }), 1, 120), { color: C.ink, width: 4 });
    const ball = rollDown(curve, Math.max(0, lt - S.word(0, '小球')), { x0: 1110, friction: 1.4 });
    glowPulse(ball.x, ball.y - 18, 40, t, C.bad);
    ctx.fillStyle = C.bad; ctx.beginPath(); ctx.arc(ball.x, ball.y - 18, 18, 0, Math.PI * 2); ctx.fill();
    text('损失', 1080, 400, { size: 26, color: C.sub, align: 'left' });
    if (lt > S.word(0, '梯度下降')) text('最低点', 1480, curve(1480) + 48, { size: 28, color: C.ok, alpha: prog(lt, S.word(0, '梯度下降'), S.word(0, '梯度下降') + 0.4) });
  },

  icons(lt, S, t) {
    const l0 = S.L(0);
    drawTag('图标', 'iconBadge / ICONS', prog(lt, 0.1, 1));
    const names = Object.keys(ICONS), cols = 9;
    names.forEach((n, i) => {
      const x = 260 + (i % cols) * 175, y = 330 + Math.floor(i / cols) * 190;
      iconBadge(n, x, y, 120, lt, l0.s + i * 0.07);
      if (lt > l0.s + i * 0.07 + 0.3) text(n, x, y + 88, { size: 20, color: C.sub, role: 'mono' });
    });
    drawRole('host', 1600, 1000, 0.5, t, { wave: lt > S.dur - 1.6, mood: 'happy', talk: S.speaking(lt) });
  },
};

const CAMS = {
  // a little punch-in when the particles assemble
  text: (lt, S) => { const k = punchIn(lt, S.L(0).s + 3.1, 0.05); return { x: W / 2, y: H / 2, z: k }; },
  // screen shake when the heart lands
  morph: (lt, S) => { const s = shake(lt, S.word(0, '心') + 0.2, 10); return { x: W / 2 + s.x, y: H / 2 + s.y, z: 1 }; },
};

const SFX = {
  text: (S) => [{ at: S.L(0).s + 3.1, sound: 'swell', volume: 0.6 }],
  morph: (S) => [{ at: S.word(0, '星星'), sound: 'pop' }, { at: S.word(0, '心') + 0.3, sound: 'success' }],
  code: (S) => [{ at: S.L(0).s, sound: 'type' }, { at: S.L(0).s + 1.2, sound: 'type' }, { at: S.L(0).s + 2.2, sound: 'click' }],
  chat: (S) => [{ at: S.L(0).s, sound: 'pop' }, { at: S.L(0).s + 1.1, sound: 'click' }, { at: S.word(0, '思考') + 1.0, sound: 'ding', volume: 0.6 }],
  table: (S) => [{ at: S.word(0, '标注'), sound: 'pop' }],
};
