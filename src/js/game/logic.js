// Logic modules: tiny chips on the top layer that switch action groups on by themselves.
// Each chip has an OUTPUT key (amber badge, set with the Keys tool) and inputs: an optional INPUT key
// (cyan badge, Shift+click with the Keys tool) and wires from other chips (Wire tool, the "logic" layer).
// Chips read their inputs from the previous tick, so loops are allowed and always stable.

const LOGIC = {
  timer: { glyph: '⏱', period: 2 }, // on for half of every period while enabled
  toggle: { glyph: '⇄' }, // flips on each rising edge of its input
  delay: { glyph: '⧗', wait: 0.6 }, // copies its input 0.6 s later
  snoop: { glyph: '◉', range: 320, cone: 0.6 }, // enemy within range and ±cone (rad) of its facing
  speedo: { glyph: '⚡', speed: 170 }, // car faster than this (px/s)
  and: { glyph: '&' },
  or: { glyph: '≥1' }
};
const isLogic = id => !!LOGIC[id];

/** Built once per car (from makeCar via setupLogic). */
function setupLogic(v, design) {
  v.chips = v.insts.filter(I => isLogic(I.id));
  if (!v.chips.length) return;
  const at = new Map(v.chips.map(I => [key(I.anchorX, I.anchorY), I]));
  for (const I of v.chips) {
    const e = design.top.get(key(I.anchorX, I.anchorY)) || {};
    I.ig = e.i | 0;
    I.srcs = (e.w || []).map(k => at.get(k)).filter(Boolean);
    I.out = false;
    I.st = 0; // toggle state / timer clock
    I.hist = []; // delay buffer [time, value]
  }
}
/** Host tick: evaluates every chip and publishes the groups they hold. */
function stepLogic(v, dt) {
  if (!v.chips || !v.chips.length) return;
  const prev = new Map(v.chips.map(I => [I, I.alive && I.out]));
  let mask = 0;
  for (const I of v.chips) {
    if (!I.alive) {
      I.out = false;
      continue;
    }
    const wires = I.srcs.map(s => prev.get(s)),
      keyIn = I.ig ? !!((v.groups | 0) & (1 << I.ig)) : null,
      ins = keyIn === null ? wires : [...wires, keyIn],
      any = ins.some(Boolean),
      none = !ins.length;
    switch (I.id) {
      case 'timer': {
        const on = none || any;
        I.st = on ? I.st + dt : 0;
        I.out = on && I.st % LOGIC.timer.period < LOGIC.timer.period / 2;
        break;
      }
      case 'toggle':
        if (any && !I.last) I.out = !I.out;
        I.last = any;
        break;
      case 'delay': {
        I.hist.push([B.time, any]);
        while (I.hist.length > 1 && I.hist[1][0] <= B.time - LOGIC.delay.wait) I.hist.shift();
        I.out = I.hist[0][0] <= B.time - LOGIC.delay.wait ? I.hist[0][1] : false;
        break;
      }
      case 'snoop': {
        const [x, y] = ipos(v, I),
          fa = faceAng(v, I),
          P = LOGIC.snoop;
        I.out =
          (none || any) &&
          others(v).some(
            e =>
              !e.dead &&
              !inSmoke(e.x, e.y) &&
              Math.hypot(e.x - x, e.y - y) < P.range + e.rad &&
              Math.abs(wrap(Math.atan2(e.y - y, e.x - x) - fa)) < P.cone
          );
        break;
      }
      case 'speedo':
        I.out = (none || any) && Math.hypot(v.vx, v.vy) > LOGIC.speedo.speed;
        break;
      case 'and':
        I.out = !none && ins.every(Boolean);
        break;
      case 'or':
        I.out = any;
        break;
    }
    I.active = I.out;
    if (I.out && I.g) mask |= 1 << I.g;
  }
  v.logicGroups = mask;
}

/** Garage: wires between chips, drawn as glowing cables when the logic layer is visible. */
function drawLogicWires(c) {
  if (!(G.showLogic || G.tool === 'wire')) return;
  const chips = [...G.top.values()].filter(e => isLogic(e.id));
  c.save();
  c.lineWidth = Math.max(2, cell * 0.08);
  c.lineCap = 'round';
  for (const e of chips)
    for (const k of e.w || []) {
      const s = G.top.get(k);
      if (!s) continue;
      const x0 = cpx(s.x) + cell / 2,
        y0 = cpy(s.y) + cell / 2,
        x1 = cpx(e.x) + cell / 2,
        y1 = cpy(e.y) + cell / 2,
        mx = (x0 + x1) / 2,
        my = Math.min(y0, y1) - cell * 0.8;
      c.strokeStyle = 'rgba(91,231,255,.35)';
      c.lineWidth = Math.max(5, cell * 0.2);
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(mx, my, x1, y1);
      c.stroke();
      c.strokeStyle = '#a8f3ff';
      c.lineWidth = Math.max(2, cell * 0.07);
      c.stroke();
      // arrow head shows the signal direction
      const t = 0.85,
        ax = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1,
        ay = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1,
        a = Math.atan2(y1 - ay, x1 - ax);
      c.fillStyle = '#a8f3ff';
      c.beginPath();
      c.moveTo(ax + Math.cos(a) * 7, ay + Math.sin(a) * 7);
      c.lineTo(ax + Math.cos(a + 2.4) * 6, ay + Math.sin(a + 2.4) * 6);
      c.lineTo(ax + Math.cos(a - 2.4) * 6, ay + Math.sin(a - 2.4) * 6);
      c.fill();
    }
  if (G.wireFrom) {
    const s = G.top.get(G.wireFrom);
    if (s) {
      c.strokeStyle = '#ffb423';
      c.setLineDash([5, 4]);
      c.strokeRect(cpx(s.x) + 2, cpy(s.y) + 2, cell - 4, cell - 4);
      c.setLineDash([]);
    }
  }
  c.restore();
}
/** Wire tool: click a chip, then another chip to connect (or disconnect) them. */
function wireClick(k) {
  const e = G.top.get(k);
  if (!e || !isLogic(e.id)) {
    G.wireFrom = null;
    toast('Wires connect logic chips. Click a chip, then the chip it should feed.');
    drawBP();
    return;
  }
  if (!G.wireFrom || G.wireFrom === k) {
    G.wireFrom = G.wireFrom === k ? null : k;
    sfx('ui');
    drawBP();
    return;
  }
  const from = G.wireFrom;
  e.w = e.w || [];
  const i = e.w.indexOf(from);
  if (i >= 0) e.w.splice(i, 1);
  else if (e.w.length >= 4) return toast('A chip takes at most four wires.');
  else e.w.push(from);
  if (!e.w.length) delete e.w;
  G.wireFrom = null;
  sfx(i >= 0 ? 'remove' : 'beep');
  refreshUI();
}
/** Input-key badges (cyan) for chips. */
function drawLogicBadges(c) {
  c.save();
  c.font = `700 ${Math.max(9, cell * 0.3)}px "Chakra Petch", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const e of G.top.values()) {
    if (!isLogic(e.id) || !e.i) continue;
    const x = cpx(e.x) + cell * 0.82,
      y = cpy(e.y) + cell * 0.18,
      r = cell * 0.16;
    c.fillStyle = '#5be7ff';
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.fillStyle = '#0a1020';
    c.fillText(String(e.i), x, y + 1);
  }
  c.restore();
}
/** Art: a little circuit board with the chip's symbol and a status LED. */
function drawLogicArt(c, id, s, ang, st) {
  const h = s / 2,
    on = st && st.active;
  rr(c, -h * 0.82, -h * 0.82, h * 1.64, h * 1.64, h * 0.18);
  c.fillStyle = '#123a2e';
  c.fill();
  c.strokeStyle = '#3fe0a0';
  c.lineWidth = s * 0.04;
  c.stroke();
  c.strokeStyle = 'rgba(63,224,160,.45)';
  c.lineWidth = s * 0.025;
  for (const k of [-0.5, 0.5]) line(c, [-h * 0.82, k * h, -h * 0.5, k * h], 'rgba(63,224,160,.6)', s * 0.03);
  c.fillStyle = '#e6fff5';
  c.font = `700 ${s * 0.42}px "Chakra Petch", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(LOGIC[id].glyph, 0, h * 0.05);
  circ(c, h * 0.55, -h * 0.55, h * 0.14, on ? '#ffe27a' : '#2b4a40');
  if (id === 'snoop') {
    c.save();
    c.rotate(ang);
    line(c, [0, -h * 0.3, 0, -h * 0.95], '#3fe0a0', s * 0.06);
    c.restore();
  }
}
