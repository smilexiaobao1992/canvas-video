// Example: an isometric "data city" built with engine/iso.js.
// Objects are collected with a depth key (x + y of their center) and drawn back to front.

const CITY = { ox: 960, oy: 330, s: 72 };

function drawSorted(items) {
  items.sort((a, b) => a.depth - b.depth).forEach((it) => it.draw());
}
// small blinking status lights on the front-left face of a rack
function rackLights(x, y, w, d, h, t, seed) {
  const rows = Math.max(1, Math.floor(h / 0.45));
  for (let k = 0; k < rows; k++) {
    const z = 0.25 + k * 0.42;
    if (z + 0.15 > h) break;
    const on = frac(t * 1.3 + seed * 0.37 + k * 0.21) < 0.6;
    isoPoly([[x + 0.2, y + d, z], [x + 0.55, y + d, z], [x + 0.55, y + d, z + 0.14], [x + 0.2, y + d, z + 0.14]], CITY);
    ctx.fillStyle = on ? C.ok : C.muted; ctx.fill();
  }
}
function packet(pos, color) {
  const [x, y] = pos;
  return { depth: x + y, draw: () => isoBox(x - 0.17, y - 0.17, 0.12, 0.34, 0.34, 0.34, { o: CITY, color, shadow: false, lw: 2 }) };
}

const SCENES = {
  datacenter(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('数据中心', 'Data Center', prog(lt, 0.2, 1.3));
    const floor = prog(lt, 0.1, 0.8);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) isoTile(i, j, 1, 1, { o: CITY, fill: (i + j) % 2 ? C.neutral : shade(C.neutral, 0.35), alpha: floor });
    isoGrid(0, 0, 8, 8, { o: CITY, alpha: floor });

    const racks = [[1, 1, 2.2], [1, 4.2, 1.8], [4.2, 1, 2.6], [4.2, 4.2, 2.0], [6.5, 2.6, 1.4]];
    const routes = [
      [[2.2, 1.6], [4.2, 1.6]], [[1.6, 2.2], [1.6, 4.2]], [[4.8, 2.2], [4.8, 4.2]],
      [[2.2, 4.8], [4.2, 4.8]], [[5.4, 1.6], [6.5, 3.2]],
    ].map((r) => r.map(([x, y]) => [x, y, 0]));
    const flow = prog(lt, l1.s - 0.2, l1.s + 0.8);
    routes.forEach((r) => isoPath(r, easeInOut(flow), { o: CITY, color: C.note, width: 3, dash: [10, 8], dashOffset: -lt * 30, head: false }));

    const items = racks.map(([x, y, h], i) => {
      const hh = h * easeOutBack(prog(lt, l0.s + i * 0.25, l0.s + i * 0.25 + 0.6));
      return { depth: x + y + 1.2, draw: () => { isoBox(x, y, 0, 1.2, 1.2, hh, { o: CITY, color: C.surface }); if (hh > 0.3) rackLights(x, y, 1.2, 1.2, hh, t, i); } };
    });
    if (flow >= 1) routes.forEach((r, i) => { for (let k = 0; k < 2; k++) items.push(packet(isoAlong(r, frac(lt * 0.5 + k / 2 + i * 0.13)), k ? C.note : C.ok)); });
    drawSorted(items);

    text('每秒成千上万个请求，在服务器之间来回奔跑', 960, 950, { size: 34, color: C.note, alpha: prog(lt, l1.s + 1.0, l1.s + 1.6) });
    drawRole('host', 230, 900, 0.6, t, { look: 1, seed: 1 });
  },

  request(lt, S, t) {
    const l0 = S.L(0), l1 = S.L(1);
    drawTag('一次请求', 'Request → Response', prog(lt, 0.2, 1.3));
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) isoTile(i, j, 1, 1, { o: CITY, fill: (i + j) % 2 ? C.neutral : shade(C.neutral, 0.35) });
    isoGrid(0, 0, 8, 8, { o: CITY });

    const route = [[1.3, 6.3, 0], [4, 4, 0], [6.7, 1.5, 0]];
    isoPath(route, easeInOut(prog(lt, l0.s, l0.s + 1.2)), { o: CITY, color: C.note, width: 4, dash: [12, 9], dashOffset: -lt * 30 });

    const go = easeInOut(prog(lt, l0.s + 0.6, l0.e));
    const back = easeInOut(prog(lt, l1.s, l1.e));
    const arrived = lt > l0.e && lt < l1.s + 0.6;
    const done = lt > l1.e;
    const items = [
      { depth: 7.6, draw: () => { isoBox(0.5, 5.5, 0, 1.6, 1.6, 1.2, { o: CITY, color: C.surfaceAlt }); isoRoof(0.5, 5.5, 1.2, 1.6, 1.6, 0.8, { o: CITY, color: C.bad }); } },
      { depth: 8, draw: () => {
        isoBox(3.5, 3.5, 0, 1, 1, 0.6, { o: CITY, color: C.neutral });
        const a = isoPt(4.3, 3.7, 0.6, CITY), b = isoPt(4.3, 3.7, 1.3, CITY);
        strokeSamples([a, b], { color: C.ink, width: 3 });
        sparkle(b.x, b.y, 6, C.note, 0.5 + 0.5 * Math.sin(t * 6));
      } },
      { depth: 8.2, draw: () => isoBox(6, 0.8, 0, 1.4, 1.4, 2.6, { o: CITY, color: C.surface, top: arrived ? C.mark : undefined }) },
    ];
    if (go > 0 && go < 1) items.push(packet(isoAlong(route, go), C.ok));
    if (back > 0 && back < 1) items.push(packet(isoAlong(route, 1 - back), C.note));
    drawSorted(items);

    isoLabel('你的电脑', 1.3, 6.3, 2.4, { o: CITY, size: 28, dy: -44 });
    isoLabel('路由器', 4, 4, 1.4, { o: CITY, size: 28, dy: -12 });
    isoLabel('服务器', 6.7, 1.5, 2.6, { o: CITY, size: 28, dy: -78 });
    if (arrived) isoLabel('找到网页！', 6.7, 1.5, 2.6, { o: CITY, size: 26, color: C.ok, dy: -116 });
    if (done) {
      const p = isoPt(1.3, 6.3, 2.4, CITY);
      drawCheck(p.x + 110, p.y - 10, 50, prog(lt, l1.e, l1.e + 0.4));
    }
    drawRole('host', 230, 900, 0.6, t, { look: 1, mood: done ? 'happy' : 'normal', seed: 2 });
  },
};

const CAMS = {
  request(lt, S) {
    // drift toward the packet's side of the city while it travels
    const k = easeInOut(prog(lt, S.L(0).s, S.L(0).e)) - easeInOut(prog(lt, S.L(1).s, S.L(1).e));
    return { x: 960 + 60 * k, y: 560, z: 1.04 + 0.04 * Math.abs(k) };
  },
};
