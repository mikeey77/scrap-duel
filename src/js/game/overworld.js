// The Scrap Road map: one illustrated top-down map of the four regions (Scrapyard → Rust Canyon → Neon Docks →
// Junk King's Keep) with the road through every mission. Click a mission to see it, start it from the card.
// The terrain is generated once from a fixed seed, so the map looks the same every time.

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

/* ---------- the map screen ---------- */
const owGateOpen = w => !w.gate || storyStars(w.gate.boss) > 0;
const owRegionOpen = id => storyOpen(STORY.find(m => m.region === id).id);
let OWM = null; // { hover, view: {x, y, z} }
function owView(W, H) {
  const pad = 16,
    z = Math.min((W - pad * 2) / OW_W, (H - pad * 2) / OW_H);
  return { z, x: (W - OW_W * z) / 2, y: (H - OW_H * z) / 2 };
}
function owDraw() {
  const cv = $('#owc');
  if (!cv || !OWM) return;
  const d = dprOf(),
    r = cv.getBoundingClientRect();
  if (!r.width) return;
  if (cv.width !== Math.round(r.width * d) || cv.height !== Math.round(r.height * d)) {
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
  }
  const c = cv.getContext('2d'),
    W = r.width,
    H = r.height,
    V = (OWM.view = owView(W, H)),
    t = ANIM;
  c.setTransform(d, 0, 0, d, 0, 0);
  c.fillStyle = '#070c18';
  c.fillRect(0, 0, W, H);
  c.save();
  c.translate(V.x, V.y);
  c.scale(V.z, V.z);
  c.drawImage(owTerrain(), 0, 0, OW_W, OW_H);
  // animated landmarks
  for (const o of OW.anim) {
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
        c.arc(o.x + Math.sin(t * 9 + i) * 3, o.y - i * 4, 10 - i * 3, 0, Math.PI * 2);
        c.fill();
      }
    } else if (o.kind === 'crane') {
      c.save();
      c.translate(o.x, o.y);
      c.fillStyle = '#c9a227';
      c.fillRect(-22, -22, 44, 44);
      c.rotate(Math.sin(t * 0.3 + o.x) * 0.8);
      c.fillStyle = '#ffb423';
      c.fillRect(-30, -9, 260, 18);
      c.fillStyle = '#1a1100';
      for (let x = -20; x < 220; x += 24) c.fillRect(x, -9, 3, 18);
      c.fillStyle = '#6c747d';
      c.fillRect(188, 18, 24, 16);
      c.restore();
    }
  }
  // the travelled road glows: from the start through every beaten mission
  const done = STORY.filter(m => storyStars(m.id)).length,
    pts = [];
  let seen = 0;
  for (const p of OW_ROAD) {
    if (!p) continue;
    pts.push(p);
    const id = Object.keys(OW_SITES).find(k => OW_SITES[k] === p);
    if (id && STORY.findIndex(m => m.id === id) >= done) break;
    if (id) seen++;
  }
  c.strokeStyle = 'rgba(255,180,35,.85)';
  c.lineWidth = 14;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.setLineDash([2, 26]);
  c.lineDashOffset = -t * 40;
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.stroke();
  c.setLineDash([]);
  // locked regions sit under a dark veil with a hazard pattern
  for (const id in OW_REG) {
    if (owRegionOpen(id)) continue;
    const R = OW_REG[id];
    c.fillStyle = 'rgba(5,8,18,.62)';
    c.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    c.save();
    c.beginPath();
    c.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    c.clip();
    c.strokeStyle = 'rgba(255,180,35,.06)';
    c.lineWidth = 30;
    for (let k = -OW_H; k < OW_W; k += 120) {
      c.beginPath();
      c.moveTo(k, 0);
      c.lineTo(k + OW_H, OW_H);
      c.stroke();
    }
    c.restore();
  }
  // gates
  for (const w of OW_WALLS)
    if (w.gate) {
      const g = w.gate,
        vert = w.h > w.w,
        gx = vert ? w.x + w.w / 2 : (g.x0 + g.x1) / 2,
        gy = vert ? (g.y0 + g.y1) / 2 : w.y + w.h / 2,
        open = owGateOpen(w);
      c.save();
      c.translate(gx, gy);
      c.fillStyle = open ? '#1f5a44' : '#4a1c26';
      c.strokeStyle = open ? '#3fe0a0' : '#ff5c7a';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(0, 0, 44, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = open ? '#3fe0a0' : '#ff5c7a';
      if (open) {
        c.fillRect(-16, -4, 32, 8);
        c.fillRect(-4, -16, 8, 32);
      } else {
        c.fillRect(-16, -6, 32, 24);
        c.strokeStyle = c.fillStyle;
        c.beginPath();
        c.arc(0, -8, 11, Math.PI, 0);
        c.stroke();
      }
      c.restore();
    }
  // region names
  const LBL = { r1: [60, 1320], r2: [1560, 2370], r3: [1960, 1250], r4: [100, 1150] };
  for (const reg of STORY_REGIONS) {
    const [x, y] = LBL[reg.id],
      open = owRegionOpen(reg.id);
    c.font = '700 96px "Chakra Petch", sans-serif';
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    c.fillStyle = 'rgba(5,8,18,.7)';
    c.fillText(reg.name.toUpperCase(), x + 4, y + 4);
    c.fillStyle = open ? reg.col : 'rgba(141,163,194,.55)';
    c.fillText(reg.name.toUpperCase(), x, y);
  }
  // mission sites
  for (const m of STORY) owDrawSite(c, m, t);
  c.restore();
}
function owDrawSite(c, m, t) {
  const [x, y] = OW_SITES[m.id],
    open = storyOpen(m.id),
    stars = storyStars(m.id),
    boss = m.kind === 'boss',
    col = STORY_REGIONS.find(r => r.id === m.region).col,
    sel = storySel === m.id,
    hov = OWM.hover === m.id,
    next = nextMission() === m,
    R = boss ? 92 : 68;
  c.save();
  c.translate(x, y);
  if (next) {
    // beacon on the next mission
    c.globalAlpha = 0.35 + Math.sin(t * 3) * 0.15;
    c.fillStyle = col;
    c.beginPath();
    c.arc(0, 0, R + 30 + Math.sin(t * 3) * 8, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }
  c.fillStyle = 'rgba(0,0,0,.4)';
  owOct(c, 10, 12, R);
  c.fill();
  c.fillStyle = open ? (stars ? '#1c2a44' : '#2a3a58') : '#1a1f2a';
  owOct(c, 0, 0, R);
  c.fill();
  c.lineWidth = sel || hov ? 10 : 6;
  c.strokeStyle = sel ? '#e6f1ff' : open ? col : '#3a3f48';
  c.stroke();
  c.fillStyle = open ? '#e6f1ff' : '#5d6670';
  c.font = `700 ${boss ? 60 : 46}px "Chakra Petch", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(boss ? '☠' : String(STORY.indexOf(m) + 1), 0, 3);
  if (stars) {
    c.font = '44px sans-serif';
    c.fillStyle = '#ffd257';
    c.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), 0, R + 40);
  }
  if (sel || hov || boss || next) {
    c.font = '700 48px "Chakra Petch", sans-serif';
    const w = c.measureText(m.name).width + 40,
      ly = -R - 50;
    c.fillStyle = 'rgba(10,16,32,.92)';
    c.fillRect(-w / 2, ly - 34, w, 68);
    c.fillStyle = open ? col : '#5d6670';
    c.fillRect(-w / 2, ly - 34, 8, 68);
    c.fillStyle = '#e6f1ff';
    c.fillText(m.name, 0, ly + 1);
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
/** Which mission is under a point on the canvas (CSS px). */
function owHit(px, py) {
  const V = OWM && OWM.view;
  if (!V) return null;
  const x = (px - V.x) / V.z,
    y = (py - V.y) / V.z;
  let best = null,
    bd = 95;
  for (const m of STORY) {
    const [sx, sy] = OW_SITES[m.id],
      d = Math.hypot(sx - x, sy - y);
    if (d < bd) ((bd = d), (best = m.id));
  }
  return best;
}
function owHeader() {
  const el = $('#owHead');
  if (!el) return;
  const done = STORY.filter(m => storyStars(m.id)).length;
  el.innerHTML = `<div class="sr-sum"><b>${done}</b><span>/ ${STORY.length} missions</span></div>
    <div class="sr-sum"><b>${totalStars()}</b><span>/ ${STORY.length * 3} stars</span></div>
    <div class="wb-bolts"><i class="boltico" aria-hidden="true"></i><b>${GEAR.bolts}</b><span>bolts</span></div>`;
}
function owCard() {
  const el = $('#owCard');
  if (!el) return;
  el.innerHTML = storyCardHtml(STORY_BY[storySel]);
  const go = $('#srGo');
  if (go) go.addEventListener('click', () => owLaunch(storySel));
}
function owLaunch(id) {
  if (!storyOpen(id)) return;
  sfx('go');
  OWM = null;
  $('#ovStory').hidden = true;
  startStory(id);
}
function owOpen() {
  OWM = { hover: null, view: null };
  owWorld();
  $('#ovStory').innerHTML = `<div class="story ow">
    <header><div><span class="label">Story mode</span><h2>Scrap Road</h2></div>
      <div class="ow-head" id="owHead"></div>
      <button class="btn ghost" id="srWork">Garage</button><button class="btn ghost" id="srBack">Main menu</button></header>
    <div class="ow-body"><div class="ow-stage"><canvas id="owc" aria-label="Scrap Road map: click a mission"></canvas></div>
      <aside class="sr-card" id="owCard"></aside></div></div>`;
  owHeader();
  owCard();
  const cv = $('#owc');
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(),
      h = owHit(e.clientX - r.left, e.clientY - r.top);
    OWM && (OWM.hover = h);
    cv.style.cursor = h ? 'pointer' : 'default';
  });
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(),
      h = owHit(e.clientX - r.left, e.clientY - r.top);
    if (!h) return;
    if (h === storySel && storyOpen(h)) return owLaunch(h);
    storySel = h;
    sfx('ui');
    owCard();
  });
  $('#srWork').addEventListener('click', () => {
    OWM = null;
    $('#ovStory').hidden = true;
    openGarageHQ(() => openStory());
  });
  $('#srBack').addEventListener('click', () => {
    OWM = null;
    $('#ovStory').hidden = true;
    sfx('ui');
    showMenu();
  });
}
/** Called from the main loop while the map is open. */
function owFrame(dt) {
  if (!OWM || $('#ovStory').hidden) return false;
  ANIM += dt;
  owDraw();
  return true;
}
