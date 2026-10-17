// Wear and tear: damage you can see on every part (scratches, scorch, dents, cracks, glowing edges),
// bare charred frames where a part was shot off, and wrecks that stay behind when a car dies:
// a burnt carcass you can push around and, in the open world, break open for parts.

/** Damage on one part, drawn in the part's own frame after its art. r = hp / max. */
function drawWear(c, s, r, seed) {
  if (r > 0.82 || s < 10) return;
  const h = s / 2,
    q = k => hullHash(seed * 7 + k, k * 13 + seed * 3),
    pt = k => [(q(k) - 0.5) * s * 0.7, (q(k + 50) - 0.5) * s * 0.7];
  c.save();
  c.lineCap = 'round';
  // scratches
  c.strokeStyle = 'rgba(235,240,245,.22)';
  c.lineWidth = Math.max(0.6, s * 0.02);
  const nScr = r < 0.6 ? 3 : 2;
  for (let i = 0; i < nScr; i++) {
    const [x, y] = pt(i),
      a = q(i + 9) * Math.PI,
      l = s * (0.15 + q(i + 20) * 0.2);
    c.beginPath();
    c.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
    c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
  if (r < 0.62) {
    // scorch
    const [x, y] = pt(30),
      R = s * (0.3 + q(31) * 0.15),
      g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(20,12,6,${Math.min(0.75, (0.62 - r) * 1.6)})`);
    g.addColorStop(1, 'rgba(20,12,6,0)');
    c.fillStyle = g;
    c.fillRect(-h, -h, s, s);
  }
  if (r < 0.52) {
    // dents: a dark dip with a lit rim on the far side
    const nD = r < 0.3 ? 2 : 1;
    for (let i = 0; i < nD; i++) {
      const [x, y] = pt(40 + i),
        R = s * (0.12 + q(42 + i) * 0.08),
        g = c.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x, y, R);
      g.addColorStop(0, 'rgba(0,0,0,.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, R, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.28)';
      c.lineWidth = Math.max(0.8, s * 0.025);
      c.beginPath();
      c.arc(x, y, R * 0.9, 0.2, 1.6);
      c.stroke();
    }
  }
  if (r < 0.32) {
    // cracks
    c.strokeStyle = 'rgba(8,8,10,.8)';
    c.lineWidth = Math.max(0.8, s * 0.03);
    for (let i = 0; i < 2; i++) {
      let [x, y] = pt(60 + i);
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (q(70 + i * 5 + k) - 0.5) * s * 0.35;
        y += (q(80 + i * 5 + k) - 0.5) * s * 0.35;
        c.lineTo(Math.max(-h, Math.min(h, x)), Math.max(-h, Math.min(h, y)));
      }
      c.stroke();
    }
  }
  if (r < 0.2) {
    // red-hot metal around the worst crack
    const [x, y] = pt(60),
      R = s * 0.28;
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(255,120,40,${0.35 + 0.2 * Math.sin(ANIM * 9 + seed)})`);
    g.addColorStop(1, 'rgba(255,60,20,0)');
    c.fillStyle = g;
    c.fillRect(-h, -h, s, s);
  }
  c.restore();
}

/** A cell whose part was shot off: a bent, charred frame with a hole in it. */
function drawRuinCell(c, x, y, s, seed, age) {
  const h = s / 2,
    q = k => hullHash(seed * 5 + k, k * 7 + seed),
    e = h * 0.86;
  c.save();
  c.translate(x, y);
  c.rotate((q(1) - 0.5) * 0.25);
  // what is left of the plate
  c.fillStyle = '#1b1d20';
  c.beginPath();
  c.moveTo(-e, -e + q(2) * h * 0.4);
  c.lineTo(-e + q(3) * h * 0.5, -e);
  c.lineTo(e - q(4) * h * 0.4, -e);
  c.lineTo(e, -e + q(5) * h * 0.5);
  c.lineTo(e, e - q(6) * h * 0.3);
  c.lineTo(e - q(7) * h * 0.5, e);
  c.lineTo(-e + q(8) * h * 0.4, e);
  c.lineTo(-e, e - q(9) * h * 0.5);
  c.closePath();
  c.fill();
  // the girder frame that held it
  c.strokeStyle = '#3c4148';
  c.lineWidth = s * 0.09;
  c.lineJoin = 'round';
  c.strokeRect(-h * 0.78, -h * 0.78, h * 1.56, h * 1.56);
  c.lineWidth = s * 0.06;
  c.beginPath();
  c.moveTo(-h * 0.7, -h * 0.7);
  c.lineTo(h * (0.2 + q(10) * 0.4), h * (0.1 + q(11) * 0.4));
  c.stroke();
  // a torn hole showing the ground
  c.fillStyle = 'rgba(0,0,0,.65)';
  c.beginPath();
  const hx = (q(12) - 0.5) * h * 0.6,
    hy = (q(13) - 0.5) * h * 0.6;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2,
      rr2 = h * (0.25 + q(20 + k) * 0.2);
    c.lineTo(hx + Math.cos(a) * rr2, hy + Math.sin(a) * rr2);
  }
  c.closePath();
  c.fill();
  // still glowing for a few seconds
  const hot = Math.max(0, 1 - age / 4);
  if (hot > 0) {
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(255,120,40,${0.7 * hot})`;
    c.lineWidth = s * 0.05;
    c.stroke();
  }
  c.restore();
}

/* ---------- wrecks ---------- */
JUNK.wreck = {
  name: 'Wreck',
  r: 30,
  m: 14,
  h: 20,
  hp: 240,
  note: 'What is left of a car. Push it around; in the open world, break it open for parts.'
};
JUNKDRAW.wreck = (c, r) => {
  rr(c, -r, -r * 0.7, r * 2, r * 1.4, r * 0.3);
  c.fillStyle = '#26292e';
  c.fill();
  c.strokeStyle = '#0d0f12';
  c.lineWidth = Math.max(1, r * 0.1);
  c.stroke();
  c.fillStyle = 'rgba(255,110,30,.5)';
  c.beginPath();
  c.arc(r * 0.2, -r * 0.1, r * 0.25, 0, 7);
  c.fill();
};
/** A dead car becomes a burnt carcass object in the same spot (host and offline only). */
function makeWreck(v) {
  if (!B || B.demo || B.net === 'client' || !v.blocks || !v.blocks.length) return null;
  const cells = [],
    parts = [];
  for (const b of v.blocks) {
    if (b.chain) continue;
    cells.push([b.gx, b.gy, hullPart(b.inst.m) ? 1 : 0]);
    if (b.inst.id !== 'cockpit' && !parts.includes(b.inst.id) && MOD[b.inst.id] && !MOD[b.inst.id].boss)
      parts.push(b.inst.id);
  }
  if (!cells.length) return null;
  const o = mkObj('wreck', v.x, v.y, v.a);
  o.r = Math.max(22, v.rad * 0.85);
  o.m = Math.max(8, Math.min(40, cells.length * 0.8));
  o.hp = o.max = 120 + cells.length * 6;
  o.cells = cells;
  o.com = [v.comX, v.comY];
  o.paint = v.paint;
  o.born = B.time || 0;
  o.vx = v.vx * 0.5;
  o.vy = v.vy * 0.5;
  o.w = (v.w || 0) * 0.5;
  // in the open world it can be broken open for some of the parts it was made of
  if (B.ow) {
    o.salvage = parts.sort(() => Math.random() - 0.5).slice(0, v.boss ? 4 : v.convoy ? 3 : 2);
    const k = owKey(Math.floor(v.x / OW_CH), Math.floor(v.y / OW_CH));
    o.ow = k;
  }
  B.objs.push(o);
  return o;
}
/** Breaking a wreck in the open world: its parts tumble out. */
function wreckSalvage(o) {
  if (!B.ow || !o.salvage || B.net === 'client') return;
  owCrateBurst({ x: o.x, y: o.y, d: { loot: 2 } });
  o.salvage.forEach((id, i) => {
    const a = (i / o.salvage.length) * Math.PI * 2 + rnd(0, 1);
    owDropPart(o.x + Math.cos(a) * rnd(50, 90), o.y + Math.sin(a) * rnd(50, 90), id, o);
  });
  owNote(`Salvaged ${o.salvage.length} part${o.salvage.length > 1 ? 's' : ''} from the wreck`, '#ffd257');
}
function drawWreck(c, o) {
  const cells = o.cells,
    age = (B.time || 0) - (o.born || 0),
    s = S;
  if (!cells) {
    // on an online client: a generic burnt carcass of the right size
    rr(c, -o.r, -o.r * 0.7, o.r * 2, o.r * 1.4, o.r * 0.3);
    c.fillStyle = '#22252a';
    c.fill();
    c.strokeStyle = '#0d0f12';
    c.lineWidth = 3;
    c.stroke();
    return;
  }
  // the hull, charred
  const hc = cells.filter(q => q[2]).map(([x, y]) => ({ x, y, part: 1 }));
  c.save();
  c.translate(-o.com[0], -o.com[1]);
  drawHull(c, hc, s, o.a, { metal: '#2a2c30' });
  // scorch and soot over everything
  for (const [x, y] of cells) {
    const g = c.createRadialGradient(x * s, y * s, 0, x * s, y * s, s * 0.7);
    g.addColorStop(0, 'rgba(10,6,4,.55)');
    g.addColorStop(1, 'rgba(10,6,4,0)');
    c.fillStyle = g;
    c.fillRect(x * s - s, y * s - s, s * 2, s * 2);
  }
  // twisted bits where wheels and guns were
  c.strokeStyle = '#3d4148';
  c.lineWidth = s * 0.08;
  c.lineCap = 'round';
  cells.forEach(([x, y, solid], i) => {
    if (solid) return;
    const q = k => hullHash(i * 3 + k, k * 11 + i);
    c.beginPath();
    c.moveTo(x * s - s * 0.3, y * s + (q(1) - 0.5) * s * 0.4);
    c.lineTo(x * s + (q(2) - 0.5) * s * 0.3, y * s - s * 0.2);
    c.lineTo(x * s + s * 0.3, y * s + (q(3) - 0.5) * s * 0.5);
    c.stroke();
  });
  // embers that cool down
  const hot = Math.max(0, 1 - age / 12);
  if (hot > 0) {
    c.globalCompositeOperation = 'lighter';
    cells.forEach(([x, y], i) => {
      if (hullHash(i, 7) > 0.35) return;
      const g = c.createRadialGradient(x * s, y * s, 0, x * s, y * s, s * 0.6);
      g.addColorStop(0, `rgba(255,110,30,${(0.45 + 0.25 * Math.sin(ANIM * 7 + i)) * hot})`);
      g.addColorStop(1, 'rgba(255,60,10,0)');
      c.fillStyle = g;
      c.fillRect(x * s - s, y * s - s, s * 2, s * 2);
    });
  }
  c.restore();
}
/** Smoke and the odd flame from wrecks while they are still hot. */
function wreckFxStep(dt) {
  for (const o of B.objs) {
    if (o.kind !== 'wreck' || o.dead) continue;
    const age = (B.time || 0) - (o.born || 0);
    const k = Math.max(0.15, 1 - age / 20);
    if (Math.random() < dt * 5 * k)
      B.fx.push({
        k: 'smoke',
        x: o.x + rnd(-o.r, o.r) * 0.6,
        y: o.y + rnd(-o.r, o.r) * 0.6,
        vx: rnd(-12, 12),
        vy: rnd(-40, -15),
        life: rnd(1.2, 2.2),
        max: 2.2,
        r: rnd(6, 11)
      });
    if (age < 6 && Math.random() < dt * 8)
      B.fx.push({
        k: 'fire',
        x: o.x + rnd(-o.r, o.r) * 0.5,
        y: o.y + rnd(-o.r, o.r) * 0.5,
        vx: rnd(-10, 10),
        vy: rnd(-50, -20),
        life: rnd(0.3, 0.6),
        max: 0.6,
        r: rnd(3, 6)
      });
  }
}

/* ---------- burning parts ---------- */
/** Flames on one burning block. Every block burns differently: its own number of tongues, their spots,
 *  heights, speed and colour, all leaning away from the way the car drives. Embers and smoke fly off. */
function drawBurn(c, x, y, S, I, v) {
  const seed = I.n * 7.31 + (I.gcx || 0) * 3.7 + (I.gcy || 0) * 5.3,
    hot = Math.min(1, I.burn / 1.5),
    aura = I.burn > 1.6, // burning from a fire build: hotter, yellower
    sp = Math.hypot(v.vx || 0, v.vy || 0),
    la = sp > 20 ? Math.atan2(-(v.vy || 0), -(v.vx || 0)) : -Math.PI / 2 + Math.sin(ANIM * 0.7 + seed) * 0.4,
    lean = Math.min(1, 0.35 + sp / 260),
    n = 2 + Math.floor(hullHash(seed, 1) * 3),
    cool = REDUCED.on;
  c.save();
  c.translate(x, y);
  c.globalCompositeOperation = 'lighter';
  // a glow under the flames that breathes
  const gr = S * (0.6 + 0.12 * Math.sin(ANIM * (7 + hullHash(seed, 2) * 5) + seed)),
    g = c.createRadialGradient(0, 0, 0, 0, 0, gr);
  g.addColorStop(0, `rgba(255,${aura ? 150 : 110},30,${0.32 * hot})`);
  g.addColorStop(1, 'rgba(255,60,10,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, gr, 0, 7);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  const tongue = (w, len, wob) => {
    c.beginPath();
    c.moveTo(-w, 0);
    c.quadraticCurveTo(-w * 0.95, -len * 0.5, wob, -len);
    c.quadraticCurveTo(w * 0.95, -len * 0.5, w, 0);
    c.arc(0, 0, w, 0, Math.PI);
  };
  for (let k = 0; k < n; k++) {
    const h1 = hullHash(seed, k + 3),
      h2 = hullHash(k + 7, seed),
      bx = (h1 - 0.5) * S * 0.6,
      by = (h2 - 0.5) * S * 0.6,
      f = 5 + h1 * 7,
      flick = cool ? 0.85 : 0.7 + 0.2 * Math.sin(ANIM * f + seed * 3 + k) + 0.1 * Math.sin(ANIM * f * 2.3 + k * 5),
      len = S * (0.4 + h2 * 0.5) * flick * (0.6 + 0.4 * hot) * (1 + lean * 0.6),
      w = S * (0.13 + h1 * 0.1),
      a = la + (h2 - 0.5) * 0.9 + (cool ? 0 : Math.sin(ANIM * (3 + h1 * 4) + k) * 0.18),
      wob = cool ? 0 : Math.sin(ANIM * f * 1.7 + k) * w * 0.4;
    c.save();
    c.translate(bx, by);
    c.rotate(a + Math.PI / 2);
    // the flame: orange at the root, deep red and see-through at the tip
    const tg = c.createLinearGradient(0, w, 0, -len);
    tg.addColorStop(0, aura ? 'rgba(255,205,70,.95)' : 'rgba(255,150,40,.95)');
    tg.addColorStop(0.45, aura ? 'rgba(255,120,25,.85)' : 'rgba(232,72,18,.85)');
    tg.addColorStop(1, 'rgba(120,18,8,0)');
    c.fillStyle = tg;
    c.globalAlpha = 0.6 + 0.4 * hot;
    tongue(w, len, wob);
    c.fill();
    // a hot core inside it
    c.globalCompositeOperation = 'lighter';
    const cg = c.createLinearGradient(0, w * 0.5, 0, -len * 0.55);
    cg.addColorStop(0, 'rgba(255,245,190,.85)');
    cg.addColorStop(1, 'rgba(255,200,80,0)');
    c.fillStyle = cg;
    tongue(w * 0.5, len * 0.55, wob * 0.5);
    c.fill();
    c.restore();
  }
  c.restore();
  // embers and smoke, from a random spot on the block, drifting the same way as the flames
  if (!cool && Math.random() < 0.35 * (0.5 + hot)) {
    const dx = Math.cos(la),
      dy = Math.sin(la),
      ox = rnd(-S * 0.35, S * 0.35),
      oy = rnd(-S * 0.35, S * 0.35);
    B.fx.push({
      k: 'fire',
      x: x + ox,
      y: y + oy,
      vx: dx * rnd(20, 60) + rnd(-12, 12),
      vy: dy * rnd(20, 60) + rnd(-12, 12),
      life: rnd(0.2, 0.45),
      max: 0.45,
      r: rnd(1.5, 4.5)
    });
  }
  if (!cool && Math.random() < 0.06)
    B.fx.push({
      k: 'smoke',
      x: x + rnd(-6, 6),
      y: y + rnd(-6, 6),
      vx: Math.cos(la) * 25,
      vy: Math.sin(la) * 25,
      life: 0.9,
      max: 1.1,
      r: rnd(4, 7)
    });
}
