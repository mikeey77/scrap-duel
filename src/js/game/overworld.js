// The Scrap Road world: a top-down map you drive around in your own car between missions.
// Four regions (Scrapyard → Rust Canyon → Neon Docks → Junk King's Keep) are walled off by gates that open when the
// region's boss is beaten. Roads link the mission sites; hidden caches with bolts and gear sit off the road, and fog
// lifts where you have driven. The terrain is generated once from a fixed seed, so the world is the same every time.

const OW_W = 3600,
  OW_H = 2400,
  OW_FOG = 60; // px per fog cell
const OW_START = [220, 2240];
const OW_REG = {
  r1: { x0: 0, y0: 1200, x1: 1500, y1: OW_H, ground: '#4d4033', ground2: '#5b4c3b' },
  r2: { x0: 1500, y0: 1300, x1: OW_W, y1: OW_H, ground: '#8f5a2c', ground2: '#a3683a' },
  r3: { x0: 1900, y0: 0, x1: OW_W, y1: 1300, ground: '#283240', ground2: '#2f3a4a' },
  r4: { x0: 0, y0: 0, x1: 1900, y1: 1200, ground: '#352f42', ground2: '#3e374d' }
};
// mission sites, in story order
const OW_SITES = {
  r1a: [330, 2120],
  r1b: [700, 1900],
  r1c: [1060, 2180],
  r1d: [1180, 1600],
  r1x: [640, 1440],
  r2a: [1860, 2120],
  r2b: [2320, 1880],
  r2c: [2950, 2200],
  r2d: [3320, 1760],
  r2x: [2700, 1560],
  r3a: [2560, 1060],
  r3b: [3120, 920],
  r3c: [3300, 460],
  r3d: [2720, 330],
  r3x: [2200, 720],
  r4a: [1640, 620],
  r4b: [1220, 920],
  r4c: [700, 700],
  r4x: [380, 330]
};
// walls between regions; each gap is a gate that opens when `boss` is beaten
const OW_WALLS = [
  { x: 1480, y: 1200, w: 40, h: 1200, gate: { y0: 1760, y1: 1880, boss: 'r1x' } },
  { x: 1500, y: 1280, w: 2100, h: 40, gate: { x0: 2500, x1: 2620, boss: 'r2x' } },
  { x: 1880, y: 0, w: 40, h: 1300, gate: { y0: 560, y1: 680, boss: 'r3x' } },
  { x: 0, y: 1180, w: 1500, h: 40 }
];
const OW_GATES = [
  [1500, 1820],
  [2560, 1300],
  [1900, 620]
];
// the road, as waypoints through every site and gate
const OW_ROAD = [
  OW_START,
  OW_SITES.r1a,
  OW_SITES.r1b,
  OW_SITES.r1c,
  [1300, 1980],
  OW_SITES.r1d,
  OW_SITES.r1x,
  null,
  OW_SITES.r1d,
  [1380, 1820],
  OW_GATES[0],
  OW_SITES.r2a,
  OW_SITES.r2b,
  [2600, 2100],
  OW_SITES.r2c,
  OW_SITES.r2d,
  [3000, 1620],
  OW_SITES.r2x,
  [2560, 1440],
  OW_GATES[1],
  OW_SITES.r3a,
  OW_SITES.r3b,
  OW_SITES.r3c,
  OW_SITES.r3d,
  OW_SITES.r3x,
  OW_GATES[2],
  OW_SITES.r4a,
  OW_SITES.r4b,
  OW_SITES.r4c,
  OW_SITES.r4x
];
// hidden caches, off the road. Rewards are rolled when found.
const OW_CACHES = [
  { id: 'c1', x: 120, y: 1700, r: 'r1', hint: 'Behind the tyre mountain' },
  { id: 'c2', x: 1360, y: 2330, r: 'r1', hint: 'In the scrap corner' },
  { id: 'c3', x: 900, y: 1300, r: 'r1', hint: 'Under the crane' },
  { id: 'c4', x: 2080, y: 1420, r: 'r2', hint: 'Canyon nook' },
  { id: 'c5', x: 3480, y: 2320, r: 'r2', hint: 'On the beach' },
  { id: 'c6', x: 2540, y: 2330, r: 'r2', hint: 'Between the lava pools' },
  { id: 'c7', x: 3500, y: 1160, r: 'r3', hint: 'End of the pier' },
  { id: 'c8', x: 2050, y: 160, r: 'r3', hint: 'Container maze' },
  { id: 'c9', x: 2900, y: 640, r: 'r3', hint: 'Under the big crane' },
  { id: 'c10', x: 1760, y: 1080, r: 'r4', hint: 'Below the gate tower' },
  { id: 'c11', x: 120, y: 980, r: 'r4', hint: 'The moat' },
  { id: 'c12', x: 1100, y: 140, r: 'r4', hint: 'Behind the throne room' }
];

/* ---------- seeded world generation ---------- */
function owRand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const owRegionAt = (x, y) => {
  for (const id in OW_REG) {
    const R = OW_REG[id];
    if (x >= R.x0 && x < R.x1 && y >= R.y0 && y < R.y1) return id;
  }
  return y > 1200 ? 'r1' : 'r4';
};
/** Distance from a point to the road polyline (null breaks the line). */
function owRoadDist(x, y) {
  let best = 1e9;
  for (let i = 1; i < OW_ROAD.length; i++) {
    const a = OW_ROAD[i - 1],
      b = OW_ROAD[i];
    if (!a || !b) continue;
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t));
  }
  return best;
}
let OW = null; // world: { solids, deco, anim, img, scale }
function owWorld() {
  if (OW) return OW;
  const rnd2 = owRand(1337),
    solids = [],
    deco = [],
    anim = [];
  const free = (x, y, r) =>
    owRoadDist(x, y) > r + 70 &&
    Object.values(OW_SITES).every(([sx, sy]) => Math.hypot(sx - x, sy - y) > r + 120) &&
    OW_CACHES.every(c => Math.hypot(c.x - x, c.y - y) > r + 130) &&
    Math.hypot(OW_START[0] - x, OW_START[1] - y) > r + 120 &&
    OW_WALLS.every(w => circRectDist(x, y, w) > r + 30) &&
    solids.every(s => Math.hypot(s.x - x, s.y - y) > s.r + r + 12);
  const place = (reg, n, rmin, rmax, kind, solid = true) => {
    const R = OW_REG[reg];
    for (let i = 0, t = 0; i < n && t < n * 40; t++) {
      const r = rmin + rnd2() * (rmax - rmin),
        x = R.x0 + 30 + rnd2() * (R.x1 - R.x0 - 60),
        y = R.y0 + 30 + rnd2() * (R.y1 - R.y0 - 60);
      if (owRegionAt(x, y) !== reg || !free(x, y, r)) continue;
      const o = { kind, x, y, r, a: rnd2() * Math.PI * 2, s: rnd2() };
      (solid ? solids : deco).push(o);
      i++;
    }
  };
  // Scrapyard: junk piles, tyre stacks, wrecks
  place('r1', 34, 40, 90, 'junk');
  place('r1', 16, 22, 30, 'tyres');
  place('r1', 8, 34, 40, 'wreck');
  // Rust Canyon: rocks, cacti, lava
  place('r2', 30, 40, 110, 'rock');
  place('r2', 26, 10, 14, 'cactus');
  place('r2', 9, 50, 90, 'lava', false);
  // Neon Docks: container stacks, bollards
  place('r3', 34, 46, 60, 'container');
  place('r3', 14, 10, 12, 'bollard');
  // Keep: towers, statues, braziers
  place('r4', 16, 40, 60, 'tower');
  place('r4', 14, 22, 28, 'statue');
  place('r4', 12, 12, 14, 'brazier');
  // animated landmarks
  anim.push(
    { kind: 'crane', x: 900, y: 1380, r: 0 },
    { kind: 'crane', x: 2900, y: 700, r: 0 },
    { kind: 'crane', x: 3300, y: 1100, r: 0 }
  );
  for (const o of solids) if (o.kind === 'brazier') anim.push({ kind: 'fire', x: o.x, y: o.y });
  for (const o of deco) if (o.kind === 'lava') anim.push({ kind: 'lavaglow', x: o.x, y: o.y, r: o.r });
  OW = { solids, deco, anim, img: null, scale: 0.6 };
  return OW;
}

/* ---------- terrain pre-render ---------- */
function owTerrain() {
  const W = owWorld();
  if (W.img) return W.img;
  const sc = W.scale,
    cv = document.createElement('canvas');
  cv.width = Math.round(OW_W * sc);
  cv.height = Math.round(OW_H * sc);
  const c = cv.getContext('2d'),
    rr = owRand(99);
  c.scale(sc, sc);
  // ground per region, with blotches for texture
  for (const id in OW_REG) {
    const R = OW_REG[id];
    c.fillStyle = R.ground;
    c.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    for (let i = 0; i < 260; i++) {
      c.fillStyle = i % 3 ? R.ground2 : 'rgba(0,0,0,.12)';
      c.globalAlpha = 0.25 + rr() * 0.35;
      c.beginPath();
      c.ellipse(
        R.x0 + rr() * (R.x1 - R.x0),
        R.y0 + rr() * (R.y1 - R.y0),
        20 + rr() * 90,
        10 + rr() * 50,
        rr() * 3,
        0,
        Math.PI * 2
      );
      c.fill();
    }
    c.globalAlpha = 1;
  }
  // Neon Docks: water along the top and right, with planks
  c.fillStyle = '#0f2a44';
  c.fillRect(1920, 0, OW_W - 1920, 90);
  c.fillRect(OW_W - 90, 0, 90, 1280);
  c.fillStyle = '#6b5236';
  for (let x = 2100; x < OW_W - 100; x += 260) c.fillRect(x, 0, 40, 130);
  c.fillRect(OW_W - 260, 1130, 260, 60);
  // beach in the canyon's far corner
  c.fillStyle = '#d9b77a';
  c.beginPath();
  c.ellipse(3500, 2350, 380, 200, -0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1d5a7a';
  c.beginPath();
  c.ellipse(3700, 2500, 360, 240, -0.3, 0, Math.PI * 2);
  c.fill();
  // Keep: a moat on the west side and flagstones
  c.fillStyle = '#1c2a4a';
  c.fillRect(0, 0, 70, 1180);
  c.strokeStyle = 'rgba(255,255,255,.035)';
  c.lineWidth = 2;
  for (let x = 80; x < 1880; x += 70)
    for (let y = 0; y < 1180; y += 70) c.strokeRect(x + ((y / 70) % 2) * 35, y, 70, 70);
  // the road: dark asphalt, a lighter edge and a dashed centre line
  const road = (w, col, dash) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.setLineDash(dash || []);
    c.beginPath();
    let pen = false;
    for (const p of OW_ROAD) {
      if (!p) {
        pen = false;
        continue;
      }
      pen ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]);
      pen = true;
    }
    c.stroke();
    c.setLineDash([]);
  };
  road(104, 'rgba(0,0,0,.35)');
  road(92, '#3a3c42');
  road(80, '#2c2e33');
  road(4, 'rgba(255,180,35,.55)', [26, 30]);
  // decor and solids
  for (const o of [...W.deco, ...W.solids]) owDrawProp(c, o, rr);
  // region walls (gates are drawn live)
  for (const w of OW_WALLS) {
    c.fillStyle = '#14161c';
    c.fillRect(w.x - 4, w.y - 4, w.w + 8, w.h + 8);
    c.fillStyle = '#5d6670';
    c.fillRect(w.x, w.y, w.w, w.h);
    c.fillStyle = 'rgba(255,180,35,.6)';
    const vert = w.h > w.w;
    for (let k = 0; k < (vert ? w.h : w.w); k += 60)
      vert ? c.fillRect(w.x + 6, w.y + k, w.w - 12, 20) : c.fillRect(w.x + k, w.y + 6, 20, w.h - 12);
  }
  W.img = cv;
  return cv;
}
function owDrawProp(c, o, rr) {
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.a);
  const r = o.r;
  if (o.kind === 'junk') {
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.beginPath();
    c.ellipse(6, 8, r, r * 0.8, 0, 0, Math.PI * 2);
    c.fill();
    const cols = ['#6c747d', '#8b5a3c', '#4a5563', '#a3483c', '#c9a227', '#3d4a3a'];
    for (let i = 0; i < 14; i++) {
      const a = rr() * Math.PI * 2,
        d = rr() * r * 0.75;
      c.fillStyle = cols[Math.floor(rr() * cols.length)];
      c.save();
      c.translate(Math.cos(a) * d, Math.sin(a) * d);
      c.rotate(rr() * 3);
      c.fillRect(-r * 0.25, -r * 0.14, r * 0.5, r * 0.28);
      c.restore();
    }
  } else if (o.kind === 'tyres') {
    for (const [dx, dy] of [
      [0, 0],
      [-r * 0.6, r * 0.5],
      [r * 0.6, r * 0.5]
    ]) {
      c.fillStyle = '#1a1a1c';
      c.beginPath();
      c.arc(dx, dy, r * 0.62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3a3a40';
      c.beginPath();
      c.arc(dx, dy, r * 0.28, 0, Math.PI * 2);
      c.fill();
    }
  } else if (o.kind === 'wreck') {
    c.fillStyle = ['#7a3d3a', '#36557a', '#7a6a2e'][Math.floor(o.s * 3)];
    c.fillRect(-r, -r * 0.5, r * 2, r);
    c.fillStyle = '#1e242c';
    c.fillRect(-r * 0.4, -r * 0.42, r * 0.8, r * 0.84);
    c.fillStyle = '#111';
    for (const [dx, dy] of [
      [-0.7, -0.6],
      [0.7, -0.6],
      [-0.7, 0.6],
      [0.7, 0.6]
    ])
      c.fillRect(dx * r - 6, dy * r - 4, 12, 8);
  } else if (o.kind === 'rock') {
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath();
    c.ellipse(8, 10, r, r * 0.85, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#6e3f1e';
    c.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2,
        d = r * (0.75 + rr() * 0.25);
      c.lineTo(Math.cos(a) * d, Math.sin(a) * d);
    }
    c.fill();
    c.fillStyle = 'rgba(255,200,140,.12)';
    c.beginPath();
    c.ellipse(-r * 0.2, -r * 0.25, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
  } else if (o.kind === 'cactus') {
    c.fillStyle = '#3d6a3a';
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.fillRect(-r * 1.6, -3, r * 3.2, 6);
  } else if (o.kind === 'lava') {
    c.fillStyle = '#5a1e0c';
    c.beginPath();
    c.ellipse(0, 0, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff5a1f';
    c.beginPath();
    c.ellipse(0, 0, r * 0.85, r * 0.6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffb423';
    c.beginPath();
    c.ellipse(-r * 0.2, -r * 0.1, r * 0.35, r * 0.2, 0, 0, Math.PI * 2);
    c.fill();
  } else if (o.kind === 'container') {
    const cols = ['#c0392b', '#2e86c1', '#d68910', '#1e8449', '#7d3c98', '#5d6d7e'];
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.fillRect(-r + 8, -r * 0.45 + 8, r * 2, r * 0.9);
    c.fillStyle = cols[Math.floor(o.s * cols.length)];
    c.fillRect(-r, -r * 0.45, r * 2, r * 0.9);
    c.fillStyle = 'rgba(0,0,0,.2)';
    for (let x = -r + 8; x < r; x += 10) c.fillRect(x, -r * 0.45, 3, r * 0.9);
  } else if (o.kind === 'bollard') {
    c.fillStyle = '#ffb423';
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1a1100';
    c.beginPath();
    c.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    c.fill();
  } else if (o.kind === 'tower') {
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath();
    c.arc(8, 10, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5a5268';
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#433d52';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.fillRect(Math.cos(a) * r * 0.82 - 6, Math.sin(a) * r * 0.82 - 6, 12, 12);
    }
    c.fillStyle = '#2b2636';
    c.beginPath();
    c.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    c.fill();
  } else if (o.kind === 'statue') {
    c.fillStyle = '#6b6e74';
    c.fillRect(-r, -r, r * 2, r * 2);
    c.fillStyle = '#c9a227';
    c.beginPath();
    c.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    c.fill();
  } else if (o.kind === 'brazier') {
    c.fillStyle = '#2b2636';
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/* ---------- state ---------- */
let OWS = null; // live driving state while the map is open
function owFogLoad() {
  const n = Math.ceil(OW_W / OW_FOG) * Math.ceil(OW_H / OW_FOG),
    f = new Uint8Array(n);
  const s = STORYP.fog;
  if (typeof s === 'string')
    try {
      const bin = atob(s);
      for (let i = 0; i < n; i++) f[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
    } catch (e) {}
  return f;
}
function owFogSave(f) {
  const bytes = new Uint8Array(Math.ceil(f.length / 8));
  for (let i = 0; i < f.length; i++) if (f[i]) bytes[i >> 3] |= 1 << (i & 7);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  STORYP.fog = btoa(s);
}
const owGateOpen = w => !w.gate || storyStars(w.gate.boss) > 0;
/** Wall rectangles that currently block the car (a wall split around its gate, plus the closed gate). */
function owBlockers() {
  const out = [];
  for (const w of OW_WALLS) {
    if (!w.gate) {
      out.push(w);
      continue;
    }
    const g = w.gate,
      vert = w.h > w.w;
    if (vert) {
      out.push({ x: w.x, y: w.y, w: w.w, h: g.y0 - w.y }, { x: w.x, y: g.y1, w: w.w, h: w.y + w.h - g.y1 });
      if (!owGateOpen(w)) out.push({ x: w.x, y: g.y0, w: w.w, h: g.y1 - g.y0, gate: w });
    } else {
      out.push({ x: w.x, y: w.y, w: g.x0 - w.x, h: w.h }, { x: g.x1, y: w.y, w: w.x + w.w - g.x1, h: w.h });
      if (!owGateOpen(w)) out.push({ x: g.x0, y: w.y, w: g.x1 - g.x0, h: w.h, gate: w });
    }
  }
  return out;
}
function owCarImage() {
  const k = G.paint + G.style.livery + (G.style.stickers || []).join();
  if (OWS && OWS.carKey === k && OWS.carImg) return OWS.carImg;
  const img = new Image();
  try {
    img.src = designURL(stylePreviewDesign(), 80, G.paint, G.style.livery);
  } catch (e) {}
  if (OWS) {
    OWS.carImg = img;
    OWS.carKey = k;
  }
  return img;
}
function owStart() {
  owWorld();
  const pos = STORYP.pos && Number.isFinite(STORYP.pos[0]) ? STORYP.pos : [...OW_START, -Math.PI / 2];
  OWS = {
    x: pos[0],
    y: pos[1],
    a: pos[2] ?? -Math.PI / 2,
    v: 0,
    keys: new Set(),
    fog: owFogLoad(),
    fogDirty: true,
    fogC: null,
    tracks: [],
    dust: [],
    near: null,
    cam: { x: pos[0], y: pos[1] },
    bump: 0,
    saveT: 0,
    msg: null
  };
  owReveal(true);
}
/** Lifts the fog around the car; returns true if anything new was seen. */
function owReveal(force) {
  const S = OWS,
    cols = Math.ceil(OW_W / OW_FOG),
    R = 6,
    cx = Math.floor(S.x / OW_FOG),
    cy = Math.floor(S.y / OW_FOG);
  let n = 0;
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R) continue;
      const x = cx + dx,
        y = cy + dy;
      if (x < 0 || y < 0 || x >= cols || y >= Math.ceil(OW_H / OW_FOG)) continue;
      const i = y * cols + x;
      if (!S.fog[i]) {
        S.fog[i] = 1;
        n++;
      }
    }
  if (n || force) S.fogDirty = true;
  return n > 0;
}
const owSeen = (x, y) => {
  const cols = Math.ceil(OW_W / OW_FOG);
  return !!OWS.fog[Math.floor(y / OW_FOG) * cols + Math.floor(x / OW_FOG)];
};

/* ---------- driving ---------- */
const OW_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  boost: ['ShiftLeft', 'ShiftRight']
};
const owHeld = (S, k) => OW_KEYS[k].some(c => S.keys.has(c));
function owStep(dt) {
  const S = OWS;
  if (!S) return;
  const onRoad = owRoadDist(S.x, S.y) < 50,
    top = (onRoad ? 520 : 340) * (owHeld(S, 'boost') ? 1.35 : 1),
    th = (owHeld(S, 'up') ? 1 : 0) - (owHeld(S, 'down') ? 1 : 0),
    st = (owHeld(S, 'right') ? 1 : 0) - (owHeld(S, 'left') ? 1 : 0);
  if (th > 0) S.v = Math.min(top, S.v + 620 * dt);
  else if (th < 0) S.v = Math.max(-180, S.v - (S.v > 0 ? 900 : 380) * dt);
  else S.v -= Math.sign(S.v) * Math.min(Math.abs(S.v), 300 * dt);
  if (S.v > top) S.v = Math.max(top, S.v - 600 * dt);
  const turn = st * 2.8 * clamp(Math.abs(S.v) / 200, 0, 1) * Math.sign(S.v || 1);
  S.a += turn * dt;
  let nx = S.x + Math.cos(S.a) * S.v * dt,
    ny = S.y + Math.sin(S.a) * S.v * dt;
  // collisions: props (circles), walls and closed gates (rects), world edge
  const R = 22;
  let hit = false;
  for (const o of OW.solids) {
    const d = Math.hypot(nx - o.x, ny - o.y),
      m = o.r * (o.kind === 'container' ? 0.95 : 0.8) + R;
    if (d < m) {
      nx = o.x + ((nx - o.x) / (d || 1)) * m;
      ny = o.y + ((ny - o.y) / (d || 1)) * m;
      hit = true;
    }
  }
  for (const w of owBlockers()) {
    const px = clamp(nx, w.x, w.x + w.w),
      py = clamp(ny, w.y, w.y + w.h),
      d = Math.hypot(nx - px, ny - py);
    if (d < R) {
      const k = (R - d) / (d || 1);
      nx += (nx - px) * k || (nx < w.x + w.w / 2 ? -R : R) * (w.h > w.w ? 1 : 0);
      ny += (ny - py) * k || (ny < w.y + w.h / 2 ? -R : R) * (w.w >= w.h ? 1 : 0);
      hit = true;
      if (w.gate && !S.msg) S.msg = { t: 3, text: `Gate locked: beat ${STORY_BY[w.gate.gate.boss].name} to open it` };
    }
  }
  nx = clamp(nx, R, OW_W - R);
  ny = clamp(ny, R, OW_H - R);
  if (hit) {
    if (Math.abs(S.v) > 160 && S.bump <= 0) {
      sfx('thump');
      S.bump = 0.4;
    }
    S.v *= 0.55;
  }
  S.bump -= dt;
  S.x = nx;
  S.y = ny;
  // tracks and dust off-road
  if (Math.abs(S.v) > 60) {
    S.tracks.push([S.x - Math.cos(S.a) * 18, S.y - Math.sin(S.a) * 18, S.a, 1]);
    if (S.tracks.length > 260) S.tracks.shift();
    if (!onRoad && Math.random() < 0.5)
      S.dust.push({ x: S.x - Math.cos(S.a) * 24, y: S.y - Math.sin(S.a) * 24, t: 0.8, r: 6 + Math.random() * 8 });
  }
  for (const d of S.dust) d.t -= dt;
  S.dust = S.dust.filter(d => d.t > 0);
  for (const t of S.tracks) t[3] -= dt * 0.12;
  owReveal();
  // caches
  for (const c of OW_CACHES)
    if (!(STORYP.caches || []).includes(c.id) && Math.hypot(c.x - S.x, c.y - S.y) < 46) owOpenCache(c);
  // nearest open site
  let near = null,
    nd = 150;
  for (const m of STORY) {
    const p = OW_SITES[m.id],
      d = Math.hypot(p[0] - S.x, p[1] - S.y);
    if (d < nd) ((nd = d), (near = m.id));
  }
  if (near !== S.near) {
    S.near = near;
    if (near) {
      storySel = near;
      sfx('beep');
    }
    owCard();
  }
  if (S.msg && (S.msg.t -= dt) <= 0) S.msg = null;
  S.saveT += dt;
  if (S.saveT > 3) owPersist();
  // camera eases after the car, looking a little ahead
  S.cam.x += (S.x + Math.cos(S.a) * S.v * 0.35 - S.cam.x) * Math.min(1, dt * 4);
  S.cam.y += (S.y + Math.sin(S.a) * S.v * 0.35 - S.cam.y) * Math.min(1, dt * 4);
}
function owPersist() {
  if (!OWS) return;
  OWS.saveT = 0;
  STORYP.pos = [Math.round(OWS.x), Math.round(OWS.y), +OWS.a.toFixed(2)];
  owFogSave(OWS.fog);
  saveStory();
}
function owOpenCache(c) {
  STORYP.caches = [...(STORYP.caches || []), c.id];
  const reg = STORY_REGIONS.findIndex(r => r.id === c.r),
    rr = owRand(c.id.length * 97 + reg * 13 + (STORYP.caches.length || 0));
  let text;
  if (rr() < 0.45) {
    const pool = MODS.filter(m => m.id !== 'cockpit' && m.rar <= Math.min(4, reg + 1) && m.rar >= Math.min(2, reg));
    const id = pool[Math.floor(rr() * pool.length)].id,
      g = addGear(id, 1 + Math.min(2, reg >> 1), true, 'Scrap Road cache');
    text = g ? `Gear found: ${gearName(g)}` : 'Gear found, but your locker is full';
  } else {
    const b = 40 + reg * 30 + Math.floor(rr() * 30);
    addBolts(b);
    text = `+${b} bolts`;
  }
  sfx('jackpot');
  OWS.msg = { t: 3.5, text: `Cache: ${c.hint}. ${text}`, good: true };
  if (STORYP.caches.length >= OW_CACHES.length) {
    const p = grant(0, ['explorer']);
    if (p.newAch.length) OWS.msg = { t: 5, text: 'All caches found! Title unlocked: Road Tripper', good: true };
  }
  owPersist();
  owHeader();
}

/* ---------- drawing ---------- */
function owDraw() {
  const S = OWS,
    cv = $('#owc');
  if (!S || !cv) return;
  const d = dprOf(),
    r = cv.getBoundingClientRect();
  if (cv.width !== Math.round(r.width * d) || cv.height !== Math.round(r.height * d)) {
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
  }
  const c = cv.getContext('2d'),
    W = r.width,
    H = r.height,
    z = clamp(Math.min(W / 1500, H / 900), 0.55, 1.1);
  c.setTransform(d, 0, 0, d, 0, 0);
  c.fillStyle = '#05080f';
  c.fillRect(0, 0, W, H);
  const cx = clamp(S.cam.x, W / (2 * z), OW_W - W / (2 * z)),
    cy = clamp(S.cam.y, H / (2 * z), OW_H - H / (2 * z));
  c.save();
  c.translate(W / 2, H / 2);
  c.scale(z, z);
  c.translate(-cx, -cy);
  const img = owTerrain(),
    k = OW.scale,
    vx0 = cx - W / (2 * z),
    vy0 = cy - H / (2 * z);
  c.drawImage(img, vx0 * k, vy0 * k, (W / z) * k, (H / z) * k, vx0, vy0, W / z, H / z);
  const t = ANIM;
  // tyre tracks
  c.fillStyle = 'rgba(0,0,0,.18)';
  for (const [x, y, a, f] of S.tracks) {
    if (f <= 0) continue;
    c.globalAlpha = Math.min(1, f);
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillRect(-3, -14, 6, 5);
    c.fillRect(-3, 9, 6, 5);
    c.restore();
  }
  c.globalAlpha = 1;
  // animated landmarks
  for (const o of OW.anim) {
    if (o.x < vx0 - 300 || o.x > vx0 + W / z + 300 || o.y < vy0 - 300 || o.y > vy0 + H / z + 300) continue;
    if (o.kind === 'lavaglow') {
      c.globalAlpha = 0.25 + Math.sin(t * 2 + o.x) * 0.12;
      c.fillStyle = '#ff7a1f';
      c.beginPath();
      c.ellipse(o.x, o.y, o.r * 1.5, o.r * 1.1, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    } else if (o.kind === 'fire') {
      for (let i = 0; i < 3; i++) {
        c.fillStyle = ['#ff5a1f', '#ffb423', '#ffe27a'][i];
        c.beginPath();
        c.arc(o.x + Math.sin(t * 9 + i) * 3, o.y - i * 4 + Math.sin(t * 13 + i * 2) * 2, 9 - i * 2.5, 0, Math.PI * 2);
        c.fill();
      }
    } else if (o.kind === 'crane') {
      c.save();
      c.translate(o.x, o.y);
      c.fillStyle = '#c9a227';
      c.fillRect(-22, -22, 44, 44);
      c.rotate(t * 0.25 + o.x);
      c.fillStyle = '#ffb423';
      c.fillRect(-30, -9, 260, 18);
      c.fillStyle = '#1a1100';
      for (let x = -20; x < 220; x += 24) c.fillRect(x, -9, 3, 18);
      c.strokeStyle = '#8b939c';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(200, 0);
      c.lineTo(200, 34);
      c.stroke();
      c.fillStyle = '#6c747d';
      c.fillRect(188, 34, 24, 16);
      c.restore();
    }
  }
  // neon blink on the docks
  c.globalAlpha = 0.5 + Math.max(0, Math.sin(t * 3)) * 0.5;
  c.fillStyle = '#5be7ff';
  c.font = '700 34px "Chakra Petch", sans-serif';
  c.fillText('NEON DOCKS', 2380, 1200);
  c.fillStyle = '#ff5c7a';
  c.fillText('OPEN 24/7', 3030, 1215);
  c.globalAlpha = 1;
  // gates
  for (const w of OW_WALLS)
    if (w.gate) {
      const g = w.gate,
        open = owGateOpen(w),
        vert = w.h > w.w,
        gx = vert ? w.x : g.x0,
        gy = vert ? g.y0 : w.y,
        gw = vert ? w.w : g.x1 - g.x0,
        gh = vert ? g.y1 - g.y0 : w.h;
      if (open) {
        c.fillStyle = 'rgba(63,224,160,.18)';
        c.fillRect(gx - 10, gy - 10, gw + 20, gh + 20);
      } else {
        c.fillStyle = '#2b1b22';
        c.fillRect(gx, gy, gw, gh);
        c.strokeStyle = `rgba(255,92,122,${0.6 + Math.sin(t * 4) * 0.3})`;
        c.lineWidth = 3;
        for (let k2 = 0; k2 < (vert ? gh : gw); k2 += 14) {
          c.beginPath();
          vert
            ? (c.moveTo(gx, gy + k2), c.lineTo(gx + gw, gy + k2 + 7))
            : (c.moveTo(gx + k2, gy), c.lineTo(gx + k2 + 7, gy + gh));
          c.stroke();
        }
      }
    }
  // caches: a glint you only notice when close (and revealed)
  for (const ch of OW_CACHES) {
    if ((STORYP.caches || []).includes(ch.id) || !owSeen(ch.x, ch.y)) continue;
    const pulse = 0.5 + Math.sin(t * 4 + ch.x) * 0.5;
    c.fillStyle = '#8a5a2b';
    c.fillRect(ch.x - 13, ch.y - 13, 26, 26);
    c.strokeStyle = '#5b3a1a';
    c.lineWidth = 3;
    c.strokeRect(ch.x - 13, ch.y - 13, 26, 26);
    c.globalAlpha = pulse;
    c.fillStyle = '#ffe27a';
    c.beginPath();
    c.moveTo(ch.x + 10, ch.y - 22);
    c.lineTo(ch.x + 13, ch.y - 15);
    c.lineTo(ch.x + 20, ch.y - 12);
    c.lineTo(ch.x + 13, ch.y - 9);
    c.lineTo(ch.x + 10, ch.y - 2);
    c.lineTo(ch.x + 7, ch.y - 9);
    c.lineTo(ch.x, ch.y - 12);
    c.lineTo(ch.x + 7, ch.y - 15);
    c.fill();
    c.globalAlpha = 1;
  }
  // mission sites
  for (const m of STORY) owDrawSite(c, m, t);
  // dust
  for (const d2 of S.dust) {
    c.globalAlpha = d2.t * 0.5;
    c.fillStyle = owRegionAt(d2.x, d2.y) === 'r2' ? '#d29a5c' : '#9c8c78';
    c.beginPath();
    c.arc(d2.x, d2.y, d2.r * (1.6 - d2.t), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // the car, with headlights in the Keep and on the docks
  const dark = ['r3', 'r4'].includes(owRegionAt(S.x, S.y));
  if (dark) {
    c.save();
    c.translate(S.x, S.y);
    c.rotate(S.a);
    const g = c.createRadialGradient(80, 0, 10, 80, 0, 170);
    g.addColorStop(0, 'rgba(255,240,190,.28)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(20, -10);
    c.lineTo(230, -90);
    c.lineTo(230, 90);
    c.lineTo(20, 10);
    c.fill();
    c.restore();
  }
  const ci = owCarImage();
  c.save();
  c.translate(S.x, S.y);
  c.rotate(S.a + Math.PI / 2);
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.fillRect(-24, -22, 52, 52);
  if (ci.complete && ci.naturalWidth) c.drawImage(ci, -30, -30, 60, 60);
  else {
    c.fillStyle = G.paint;
    c.fillRect(-18, -24, 36, 48);
  }
  c.restore();
  // fog of war (low-res, smoothed)
  owDrawFog(c);
  // region ambience tint (night in the Keep)
  c.restore();
  c.setTransform(d, 0, 0, d, 0, 0);
  const reg = owRegionAt(S.x, S.y);
  if (reg === 'r4' || reg === 'r3') {
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(5,6,20,0)');
    g.addColorStop(1, reg === 'r4' ? 'rgba(20,6,40,.55)' : 'rgba(4,12,30,.45)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  owDrawGuide(c, W, H, z, cx, cy);
  owDrawHUD(c, W, H, z, cx, cy);
}
/** An arrow at the screen edge pointing to the next mission when it is off screen. */
function owDrawGuide(c, W, H, z, cx, cy) {
  const n = nextMission();
  if (!n || OWS.near === n.id) return;
  const [tx, ty] = OW_SITES[n.id],
    sx = (tx - cx) * z + W / 2,
    sy = (ty - cy) * z + H / 2,
    m = 70;
  if (sx > m && sx < W - m && sy > m && sy < H - m) return;
  const a = Math.atan2(sy - H / 2, sx - W / 2),
    k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(a) || 1e-6)),
    x = W / 2 + Math.cos(a) * k,
    y = H / 2 + Math.sin(a) * k,
    dist = Math.round(Math.hypot(tx - OWS.x, ty - OWS.y) / 10);
  c.save();
  c.translate(x, y);
  c.globalAlpha = 0.75 + Math.sin(ANIM * 4) * 0.25;
  c.save();
  c.rotate(a);
  c.fillStyle = '#ffb423';
  c.beginPath();
  c.moveTo(22, 0);
  c.lineTo(-8, -14);
  c.lineTo(-2, 0);
  c.lineTo(-8, 14);
  c.closePath();
  c.fill();
  c.restore();
  c.globalAlpha = 1;
  c.font = '700 12px "Chakra Petch", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const lab = `${n.name} · ${dist} m`,
    w = c.measureText(lab).width + 14,
    ly = Math.sin(a) > 0.5 ? -30 : 30;
  c.fillStyle = 'rgba(10,16,32,.85)';
  c.fillRect(-w / 2, ly - 10, w, 20);
  c.fillStyle = '#ffd257';
  c.fillText(lab, 0, ly);
  c.restore();
}
function owDrawSite(c, m, t) {
  const [x, y] = OW_SITES[m.id],
    open = storyOpen(m.id),
    stars = storyStars(m.id),
    boss = m.kind === 'boss',
    col = STORY_REGIONS.find(r => r.id === m.region).col,
    seen = owSeen(x, y);
  if (!seen && !open) return;
  const near = OWS.near === m.id,
    R = boss ? 64 : 46;
  c.save();
  c.translate(x, y);
  // the arena pad: a chamfered octagon of concrete with hazard edges
  c.fillStyle = 'rgba(0,0,0,.35)';
  owOct(c, 8, 10, R);
  c.fill();
  c.fillStyle = open ? '#4a4f57' : '#2a2d33';
  owOct(c, 0, 0, R);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = open ? col : '#3a3f48';
  c.setLineDash([12, 8]);
  c.stroke();
  c.setLineDash([]);
  // holo pillar over open, unbeaten missions
  if (open && !stars) {
    c.globalAlpha = 0.25 + Math.sin(t * 3) * 0.1;
    const g = c.createLinearGradient(0, -R * 2.4, 0, 0);
    g.addColorStop(0, 'rgba(91,231,255,0)');
    g.addColorStop(1, col);
    c.fillStyle = g;
    c.fillRect(-R * 0.45, -R * 2.4, R * 0.9, R * 2.4);
    c.globalAlpha = 1;
  }
  if (near) {
    c.strokeStyle = '#e6f1ff';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, R + 16 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = open ? '#e6f1ff' : '#5d6670';
  c.font = `700 ${boss ? 30 : 22}px "Chakra Petch", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(boss ? '☠' : String(STORY.indexOf(m) + 1), 0, 2);
  // name plate
  c.font = '700 15px "Chakra Petch", sans-serif';
  const label = m.name,
    w = c.measureText(label).width + 20;
  c.fillStyle = 'rgba(10,16,32,.85)';
  c.fillRect(-w / 2, R + 10, w, 24);
  c.fillStyle = open ? col : '#5d6670';
  c.fillRect(-w / 2, R + 10, 3, 24);
  c.fillStyle = open ? '#e6f1ff' : '#8da3c2';
  c.fillText(label, 0, R + 23);
  if (stars) {
    c.fillStyle = '#ffd257';
    c.font = '14px sans-serif';
    c.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), 0, R + 46);
  }
  c.restore();
}
function owOct(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}
function owDrawFog(c) {
  const S = OWS,
    cols = Math.ceil(OW_W / OW_FOG),
    rows = Math.ceil(OW_H / OW_FOG);
  if (!S.fogC) {
    S.fogC = document.createElement('canvas');
    S.fogC.width = cols;
    S.fogC.height = rows;
  }
  if (S.fogDirty) {
    S.fogDirty = false;
    const fc = S.fogC.getContext('2d'),
      im = fc.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      im.data[i * 4] = 5;
      im.data[i * 4 + 1] = 8;
      im.data[i * 4 + 2] = 15;
      im.data[i * 4 + 3] = S.fog[i] ? 0 : 235;
    }
    fc.putImageData(im, 0, 0);
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(S.fogC, 0, 0, OW_W, OW_H);
}
function owDrawHUD(c, W, H, z, cx, cy) {
  const S = OWS;
  // telemetry strip, bottom left
  c.save();
  const kmh = Math.round(Math.abs(S.v) * 0.18),
    reg = STORY_REGIONS.find(r => r.id === owRegionAt(S.x, S.y));
  c.fillStyle = 'rgba(10,16,32,.85)';
  c.fillRect(16, H - 64, 330, 48);
  c.fillStyle = reg.col;
  c.fillRect(16, H - 64, 3, 48);
  c.font = '700 12px "Chakra Petch", sans-serif';
  c.fillStyle = '#7fb8d6';
  c.textBaseline = 'top';
  c.textAlign = 'left';
  c.fillText(reg.name.toUpperCase(), 30, H - 58);
  c.fillText(`X ${Math.round(S.x)}  Y ${Math.round(S.y)}`, 30, H - 38);
  c.font = '700 26px "Chakra Petch", sans-serif';
  c.fillStyle = '#e6f1ff';
  c.textAlign = 'right';
  c.fillText(String(kmh), 300, H - 58);
  c.font = '700 11px "Chakra Petch", sans-serif';
  c.fillStyle = '#8da3c2';
  c.fillText('KM/H', 338, H - 46);
  c.textAlign = 'left';
  // message toast
  if (S.msg) {
    c.font = '700 16px "Chakra Petch", sans-serif';
    const w = c.measureText(S.msg.text).width + 40;
    c.globalAlpha = Math.min(1, S.msg.t * 2);
    c.fillStyle = 'rgba(10,16,32,.92)';
    c.fillRect(W / 2 - w / 2, 18, w, 40);
    c.fillStyle = S.msg.good ? '#ffd257' : '#ff8a9c';
    c.fillRect(W / 2 - w / 2, 18, 3, 40);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(S.msg.text, W / 2, 38);
    c.globalAlpha = 1;
  }
  // nearby prompt
  if (S.near && storyOpen(S.near)) {
    c.font = '700 15px "Chakra Petch", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const s = `Enter · start ${STORY_BY[S.near].name}`,
      w = c.measureText(s).width + 30;
    c.fillStyle = '#ffb423';
    c.fillRect(W / 2 - w / 2, H - 70, w, 34);
    c.fillStyle = '#1a1100';
    c.fillText(s, W / 2, H - 53);
  }
  c.restore();
  owDrawMini();
}
/** Minimap: regions, explored area, sites and caches. Click a site you have seen to drive there instantly. */
function owDrawMini() {
  const cv = $('#owmini');
  if (!cv) return;
  const d = dprOf(),
    w = 240,
    h = 160;
  if (cv.width !== w * d) {
    cv.width = w * d;
    cv.height = h * d;
  }
  const c = cv.getContext('2d'),
    k = w / OW_W;
  c.setTransform(d, 0, 0, d, 0, 0);
  c.drawImage(owTerrain(), 0, 0, w, h);
  c.drawImage(OWS.fogC || owTerrain(), 0, 0, w, h);
  for (const m of STORY) {
    const [x, y] = OW_SITES[m.id];
    if (!owSeen(x, y) && !storyOpen(m.id)) continue;
    c.fillStyle = storyStars(m.id) ? '#ffd257' : storyOpen(m.id) ? '#5be7ff' : '#5d6670';
    c.fillRect(x * k - 3, y * k - 3, m.kind === 'boss' ? 8 : 6, m.kind === 'boss' ? 8 : 6);
  }
  c.save();
  c.translate(OWS.x * k, OWS.y * k);
  c.rotate(OWS.a);
  c.fillStyle = '#ffb423';
  c.beginPath();
  c.moveTo(6, 0);
  c.lineTo(-4, -4);
  c.lineTo(-4, 4);
  c.fill();
  c.restore();
  c.strokeStyle = '#34507e';
  c.strokeRect(0.5, 0.5, w - 1, h - 1);
}

/* ---------- screen ---------- */
function owHeader() {
  const el = $('#owHead');
  if (!el) return;
  el.innerHTML = `<div class="sr-sum"><b>${totalStars()}</b><span>/ ${STORY.length * 3} stars</span></div>
    <div class="sr-sum"><b>${(STORYP.caches || []).length}</b><span>/ ${OW_CACHES.length} caches</span></div>
    <div class="wb-bolts"><i class="boltico" aria-hidden="true"></i><b>${GEAR.bolts}</b><span>bolts</span></div>`;
}
/** The side card: the mission you are parked at, or what to do next. */
function owCard() {
  const el = $('#owCard');
  if (!el) return;
  const id = OWS && OWS.near;
  if (!id) {
    const n = nextMission();
    el.className = 'sr-card idle';
    el.innerHTML = `<span class="label">Scrap Road</span><h3>${n ? 'Drive to the next mission' : 'The road is yours'}</h3>
      <p>${n ? `Next up: <b>${esc(n.name)}</b>, the glowing pad on your minimap.` : 'Every boss is beaten. Hunt for three stars and the last caches.'}</p>
      <p class="small">WASD or arrows to drive, Shift to boost. Roads are faster than the dirt. Hidden caches glint off the road. Click a mission on the minimap to drive there instantly.</p>
      ${load('sd.name') ? '' : `<label class="ow-name"><span class="label">Your driver name</span><input id="owName" maxlength="16" placeholder="Player" value="${esc(G.name === 'Player' ? '' : G.name)}"></label><p class="small">The commentators will use it.</p>`}`;
    const nm = $('#owName');
    if (nm)
      nm.addEventListener('change', () => {
        G.name = nm.value.trim().slice(0, 16) || 'Player';
        store('sd.name', G.name);
        sfx('ui');
      });
    return;
  }
  el.className = 'sr-card';
  el.innerHTML = storyCardHtml(STORY_BY[id]);
  const go = $('#srGo');
  if (go) go.addEventListener('click', () => owLaunch(id));
}
function owLaunch(id) {
  if (!storyOpen(id)) return;
  owPersist();
  sfx('go');
  owClose();
  $('#ovStory').hidden = true;
  startStory(id);
}
function owOpen() {
  owStart();
  $('#ovStory').innerHTML = `<div class="story ow">
    <header><div><span class="label">Story mode</span><h2>Scrap Road</h2></div>
      <div class="ow-head" id="owHead"></div>
      <button class="btn ghost" id="srWork">Workbench</button><button class="btn ghost" id="srBack">Main menu</button></header>
    <div class="ow-stage"><canvas id="owc" aria-label="Scrap Road map. Drive with WASD or the arrow keys."></canvas>
      <canvas id="owmini" width="240" height="160" aria-label="Minimap: click a mission you have seen to drive there"></canvas>
      <aside class="sr-card" id="owCard"></aside></div></div>`;
  owHeader();
  owCard();
  $('#srWork').addEventListener('click', () => {
    owPersist();
    owClose();
    $('#ovStory').hidden = true;
    openWorkbench(() => openStory());
  });
  $('#srBack').addEventListener('click', () => {
    owPersist();
    owClose();
    $('#ovStory').hidden = true;
    sfx('ui');
    showMenu();
  });
  $('#owmini').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - r.left) / r.width) * OW_W,
      y = ((e.clientY - r.top) / r.height) * OW_H;
    let best = null,
      bd = 160;
    for (const m of STORY) {
      const [sx, sy] = OW_SITES[m.id];
      const dd = Math.hypot(sx - x, sy - y);
      if (dd < bd && storyOpen(m.id)) ((bd = dd), (best = m.id));
    }
    if (!best) return;
    const [sx, sy] = OW_SITES[best];
    OWS.x = sx;
    OWS.y = sy + 100;
    OWS.v = 0;
    OWS.a = -Math.PI / 2;
    OWS.cam = { x: OWS.x, y: OWS.y };
    owReveal();
    sfx('tele');
  });
  addEventListener('keydown', owKeyDown);
  addEventListener('keyup', owKeyUp);
  addEventListener('blur', owBlur);
}
function owClose() {
  removeEventListener('keydown', owKeyDown);
  removeEventListener('keyup', owKeyUp);
  removeEventListener('blur', owBlur);
  if (OWS) OWS.keys.clear();
}
const owBlur = () => OWS && OWS.keys.clear();
function owKeyDown(e) {
  if (!OWS || $('#ovStory').hidden) return;
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const all = Object.values(OW_KEYS).flat();
  if (all.includes(e.code)) {
    e.preventDefault();
    OWS.keys.add(e.code);
  } else if (e.code === 'Enter' && OWS.near) {
    e.preventDefault();
    owLaunch(OWS.near);
  } else if (e.code === 'Escape') {
    e.preventDefault();
    $('#srBack').click();
  }
}
function owKeyUp(e) {
  if (OWS) OWS.keys.delete(e.code);
}
/** Called from the main loop while the map is open. */
function owFrame(dt) {
  if (!OWS || $('#ovStory').hidden) return false;
  ANIM += dt;
  owStep(dt);
  owDraw();
  return true;
}
