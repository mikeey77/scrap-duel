// Open world (test mode): one big generated map made of the arena themes.
// The world is cut into 1000×1000 chunks. A chunk is generated from the world seed the first time you come
// near it (props, ruins, ramps, pickups, its own ground picture) and parked again when you drive away, so only
// the area around you is simulated. Biomes are Voronoi regions: cold in the north, hot in the south, towns
// and gardens in between, the odd chessboard or toy room anywhere. Roads cross the map; every crossing has a
// camp where you repair and respawn. Raiders roam and come after you when you get close.
const OW_CH = 1000, // chunk size
  OW_N = 20, // chunks per side
  OW_REG = 2600, // biome region size
  OW_ROAD = 4, // a road every 4 chunks
  OW_ROADW = 70; // half road width
let OW = null;

/* ---------- seeded randomness ---------- */
function owRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const owHash = (x, y, s) =>
  (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041)) >>> 0;
/** Runs f with Math.random replaced by a seeded generator, so chunk contents are the same every visit. */
function owSeeded(seed, f) {
  const r = Math.random;
  Math.random = owRng(seed);
  try {
    return f();
  } finally {
    Math.random = r;
  }
}

/* ---------- biomes ---------- */
const OW_BIOMES = {
  cold: ['ice', 'frozenlot', 'glacier'],
  hot: ['desert', 'volcano', 'beach'],
  green: ['backyard', 'swamp', 'beach'],
  town: [
    'junkyard',
    'carpark',
    'construction',
    'market',
    'factory',
    'crusheryard',
    'scrapfactory',
    'stormroof',
    'carwash'
  ],
  odd: ['chess', 'toyroom', 'pinball', 'haunted', 'space', 'kitchen', 'funfair', 'neonstrip', 'warpzone']
};
const owTheme = id => THEMES.find(t => t.id === id) || THEMES[0];
function owSite(gx, gy) {
  const k = gx + ',' + gy;
  let s = OW.sites.get(k);
  if (s) return s;
  const r = owRng(owHash(gx, gy, OW.seed));
  const x = (gx + 0.15 + 0.7 * r()) * OW_REG,
    y = (gy + 0.15 + 0.7 * r()) * OW_REG,
    lat = y / (OW_N * OW_CH); // 0 = north, 1 = south
  let group;
  const roll = r();
  if (roll < 0.14) group = 'odd';
  else if (lat < 0.3) group = roll < 0.75 ? 'cold' : 'town';
  else if (lat > 0.7) group = roll < 0.75 ? 'hot' : 'green';
  else group = roll < 0.5 ? 'town' : 'green';
  const list = OW_BIOMES[group];
  let id = list[Math.floor(r() * list.length)];
  // the region you start in is always the junkyard
  const c = (OW_N * OW_CH) / 2;
  if (
    Math.abs(x - c) < OW_REG &&
    Math.abs(y - c) < OW_REG &&
    gx === Math.floor(c / OW_REG) &&
    gy === Math.floor(c / OW_REG)
  )
    id = 'junkyard';
  s = { x, y, th: owTheme(id) };
  OW.sites.set(k, s);
  return s;
}
/** The biome theme at a world point (wavy region borders). */
function owThemeAt(x, y) {
  const wx = x + Math.sin(y / 310) * 90 + Math.cos(x / 520) * 60,
    wy = y + Math.cos(x / 270) * 90 + Math.sin(y / 610) * 60,
    gx = Math.floor(wx / OW_REG),
    gy = Math.floor(wy / OW_REG);
  let best = null,
    bd = 1e18;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const s = owSite(gx + i, gy + j),
        d = (s.x - wx) ** 2 + (s.y - wy) ** 2;
      if (d < bd) ((bd = d), (best = s));
    }
  return best.th;
}

/* ---------- roads and camps ---------- */
const owRoadY = (k, x) => (k * OW_ROAD + 2) * OW_CH + Math.sin(x / 1100 + k * 1.7) * 140;
const owRoadX = (k, y) => (k * OW_ROAD + 2) * OW_CH + Math.sin(y / 1250 + k * 2.3) * 140;
const OW_ROADS = Math.floor((OW_N - 2) / OW_ROAD) + 1;
function owRoadDist(x, y) {
  let d = 1e9;
  for (let k = 0; k < OW_ROADS; k++) {
    d = Math.min(d, Math.abs(y - owRoadY(k, x)), Math.abs(x - owRoadX(k, y)));
  }
  return d;
}
const owOnRoad = (x, y) => owRoadDist(x, y) < OW_ROADW;
/** Camps sit where the roads cross: repair, respawn point, a little shelter of tyres. */
function owCamps() {
  const out = [];
  for (let j = 0; j < OW_ROADS; j++)
    for (let i = 0; i < OW_ROADS; i++) {
      // the crossing of vertical road i and horizontal road j (a few fixed-point steps)
      let x = (i * OW_ROAD + 2) * OW_CH,
        y = (j * OW_ROAD + 2) * OW_CH;
      for (let n = 0; n < 4; n++) {
        y = owRoadY(j, x);
        x = owRoadX(i, y);
      }
      out.push({ x, y, i, j, seen: false });
    }
  return out;
}

/* ---------- chunks ---------- */
const owKey = (cx, cy) => cx + ',' + cy;
function owGenChunk(cx, cy) {
  const ch = { cx, cy, k: owKey(cx, cy), objs: [], zones: [], st: [], pk: [], canvas: null, bld: [], poi: null };
  const x0 = cx * OW_CH,
    y0 = cy * OW_CH,
    mid = owThemeAt(x0 + OW_CH / 2, y0 + OW_CH / 2),
    home = OW.home0;
  owSeeded(owHash(cx, cy, OW.seed ^ 0x51ed), () => {
    const nearCamp = (x, y, r) => OW.camps.some(c => Math.hypot(c.x - x, c.y - y) < r + 170);
    const free = (x, y, r) =>
      x - r > Math.max(WM + 20, x0 + 10) &&
      x + r < Math.min(AW - WM - 20, x0 + OW_CH - 10) &&
      y - r > Math.max(WM + 20, y0 + 10) &&
      y + r < Math.min(AH - WM - 20, y0 + OW_CH - 10) &&
      owRoadDist(x, y) > OW_ROADW + r + 20 &&
      !nearCamp(x, y, r) &&
      Math.hypot(x - home.x, y - home.y) > 320 + r &&
      ch.st.every(s => circRectDist(x, y, s) > r + 30) &&
      ch.objs.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + 10) &&
      ch.zones.every(z => Math.hypot((z.x || 0) + (z.w || 0) / 2 - x, (z.y || 0) + (z.h || 0) / 2 - y) > r + 90);
    const spot = (r, tries = 40) => {
      for (let t = 0; t < tries; t++) {
        const x = x0 + rnd(40, OW_CH - 40),
          y = y0 + rnd(40, OW_CH - 40);
        if (free(x, y, r)) return [x, y];
      }
      return null;
    };
    // buildings with loot first, then a raider camp, then loose ruins
    owGenBuildings(ch, x0, y0, free, mid);
    owGenPOI(ch, spot, x0, y0);
    const nW = ch.bld.length ? 0 : Math.floor(rnd(0, 3));
    for (let i = 0; i < nW; i++) {
      const v = Math.random() < 0.5,
        len = rnd(140, 300),
        p = spot(len / 2);
      if (!p) continue;
      const th = owThemeAt(p[0], p[1]);
      ch.st.push({
        x: p[0] - (v ? 18 : len / 2),
        y: p[1] - (v ? len / 2 : 18),
        w: v ? 36 : len,
        h: v ? len : 36,
        wall: th.wall
      });
    }
    // the theme's own features: ramps, trampolines, oil, spikes, speed pads and its gimmick
    const zone = (n, f) => {
      for (let i = 0; i < n; i++) {
        const p = spot(70);
        if (p) ch.zones.push(f(p[0], p[1]));
      }
    };
    const k = 0.6;
    zone(Math.round((mid.ramps || 0) * k + Math.random() * 0.6), (x, y) => {
      const ang = pick([0, Math.PI / 2, -Math.PI / 2, Math.PI]),
        v = Math.abs(Math.sin(ang)) > 0.5,
        w = v ? 70 : 110,
        h = v ? 110 : 70;
      return { kind: 'ramp', x: x - w / 2, y: y - h / 2, w, h, ang };
    });
    zone(Math.round((mid.tramp || 0) * k), (x, y) => ({ kind: 'tramp', x: x - 40, y: y - 40, w: 80, h: 80 }));
    zone(Math.round((mid.oil || 0) * k), (x, y) => ({ kind: 'oil', x, y, r: rnd(45, 80) }));
    zone(Math.round((mid.spikes || 0) * k), (x, y) =>
      Math.random() < 0.5
        ? { kind: 'spikes', x: x - 11, y: y - 75, w: 22, h: 150 }
        : { kind: 'spikes', x: x - 75, y: y - 11, w: 150, h: 22 }
    );
    zone(Math.round((mid.pads || 0) * k), (x, y) => ({
      kind: 'pad',
      x: x - 45,
      y: y - 30,
      w: 90,
      h: 60,
      ang: pick([0, Math.PI])
    }));
    for (const [g, n] of Object.entries(mid.extra || {}))
      if (g !== 'portal') zone(Math.round(n * k), (x, y) => gimmickZone(g, x, y));
    // junk from whichever biome each spot is in
    const nJ = 7 + Math.floor(Math.random() * 7);
    for (let i = 0; i < nJ; i++) {
      const p = spot(22);
      if (!p) continue;
      const th = owThemeAt(p[0], p[1]),
        kind = pick(th.junk),
        o = mkObj(kind, p[0], p[1]);
      o.ow = ch.k;
      ch.objs.push(o);
    }
    if (Math.random() < 0.35) {
      const p = spot(14);
      if (p) {
        const o = mkObj('barrel', p[0], p[1]);
        o.ow = ch.k;
        ch.objs.push(o);
      }
    }
    // pickups: scrap now and then, a repair kit rarely
    if (Math.random() < 0.45) {
      const p = spot(20);
      if (p) ch.pk.push({ kind: 'coins', x: p[0], y: p[1], val: 20, cd: 0 });
    }
    if (Math.random() < 0.12) {
      const p = spot(20);
      if (p) ch.pk.push({ kind: 'repair', x: p[0], y: p[1], val: 0.3, cd: 0 });
    }
    if (Math.random() < 0.1) {
      const p = spot(20);
      if (p) ch.pk.push({ kind: 'power', x: p[0], y: p[1], p: pick(POWER_IDS), cd: 0 });
    }
  });
  // camps in this chunk get a ring of tyre stacks with a gap toward each road
  for (const c of OW.camps) {
    if (Math.floor(c.x / OW_CH) !== cx || Math.floor(c.y / OW_CH) !== cy) continue;
    for (let i = 0; i < 12; i++) {
      // tyre walls in the four corners between the roads
      const a = (Math.floor(i / 3) * Math.PI) / 2 + Math.PI / 4 + ((i % 3) - 1) * 0.22;
      const o = mkObj('tires', c.x + Math.cos(a) * 200, c.y + Math.sin(a) * 200, 0);
      if (owRoadDist(o.x, o.y) < OW_ROADW + 10) continue;
      o.ow = ch.k;
      ch.objs.push(o);
    }
  }
  for (const z of ch.zones) z.ow = ch.k;
  for (const s of ch.st) s.ow = ch.k;
  // the same ids on every computer, so the host and a friend talk about the same crate
  const base = 1e7 + (cy * OW_N + cx) * 400;
  ch.objs.forEach((o, i) => ((o.uid = base + i), (o.ow = ch.k)));
  ch.pk.forEach((p, i) => ((p.uid = base + 300 + i), (p.ow = ch.k)));
  return ch;
}

/** The ground picture of one chunk: biome colours in 20 px blocks, speckle, biome details, roads, camps. */
function owGround(ch) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = OW_CH;
  const g = cv.getContext('2d'),
    x0 = ch.cx * OW_CH,
    y0 = ch.cy * OW_CH,
    B2 = 40,
    PAD = 120;
  owSeeded(owHash(ch.cx, ch.cy, OW.seed ^ 0x9a1), () => {
    // biome colours as a tiny picture (one pixel per block, a bit past the chunk edge) that is
    // stretched with smoothing: soft borders for free, and neighbouring chunks meet without a seam
    const n = (OW_CH + PAD * 2) / B2,
      small = document.createElement('canvas');
    small.width = small.height = n;
    const sg = small.getContext('2d'),
      ths = new Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const wx = x0 - PAD + i * B2 + B2 / 2,
          wy = y0 - PAD + j * B2 + B2 / 2,
          th = (ths[j * n + i] = owThemeAt(wx, wy));
        let col = th.ground[0];
        if (th.id === 'chess') col = (Math.floor(wx / 120) + Math.floor(wy / 120)) % 2 ? '#8a5a32' : '#e6d3ad';
        else if (th.id === 'kitchen' || th.id === 'market' || th.id === 'carwash')
          col = (Math.floor(wx / 60) + Math.floor(wy / 60)) % 2 ? th.ground[0] : mix(th.ground[0], 0.06);
        sg.fillStyle = col;
        sg.fillRect(i, j, 1, 1);
      }
    // soften on a small in-between picture (cheap), then stretch that over the chunk
    const mid = document.createElement('canvas');
    mid.width = mid.height = n * 4;
    const mg = mid.getContext('2d');
    mg.imageSmoothingEnabled = true;
    try {
      mg.filter = 'blur(3px)';
    } catch (e) {}
    mg.drawImage(small, 0, 0, n * 4, n * 4);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'low';
    g.drawImage(mid, -PAD, -PAD, OW_CH + PAD * 2, OW_CH + PAD * 2);
    const thAt = (x, y) =>
      ths[clamp(Math.floor((y + PAD) / B2), 0, n - 1) * n + clamp(Math.floor((x + PAD) / B2), 0, n - 1)];
    // soft patches and grit in each block's own tint
    for (let i = 0; i < 30; i++) {
      const x = rnd(0, OW_CH),
        y = rnd(0, OW_CH),
        th = thAt(x, y);
      g.fillStyle = `rgba(${Math.random() < 0.5 ? th.ground[1] : th.ground[2]},${rnd(0.04, 0.09)})`;
      g.beginPath();
      g.ellipse(x, y, rnd(40, 160), rnd(30, 110), rnd(0, 3), 0, 7);
      g.fill();
    }
    // grit: grouped per colour so the canvas changes fill style a few times instead of thousands
    const grit = new Map();
    for (let i = 0; i < 1300; i++) {
      const x = rnd(0, OW_CH),
        y = rnd(0, OW_CH),
        th = thAt(x, y),
        key = `rgba(${Math.random() < 0.5 ? th.ground[1] : th.ground[2]},${[0.09, 0.15, 0.21][Math.floor(Math.random() * 3)]})`;
      let L = grit.get(key);
      if (!L) grit.set(key, (L = []));
      L.push(x, y, rnd(1, 3), rnd(1, 3));
    }
    for (const [col, L] of grit) {
      g.fillStyle = col;
      for (let i = 0; i < L.length; i += 4) g.fillRect(L[i], L[i + 1], L[i + 2], L[i + 3]);
    }
    // a few details that say where you are
    for (let i = 0; i < 26; i++) {
      const x = rnd(0, OW_CH),
        y = rnd(0, OW_CH),
        th = thAt(x, y);
      if (owRoadDist(x0 + x, y0 + y) < OW_ROADW + 10) continue;
      owDetail(g, th.id, x, y);
    }
  });
  owDrawFloors(g, ch);
  // roads: asphalt, kerbs and a dashed centre line
  const step = 10;
  for (let k = 0; k < OW_ROADS; k++) {
    for (const [w, col] of [
      [OW_ROADW * 2 + 12, 'rgba(40,40,42,.55)'],
      [OW_ROADW * 2, '#4a4d52']
    ]) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      for (let x = -step; x <= OW_CH + step; x += step) g.lineTo(x, owRoadY(k, x0 + x) - y0);
      g.stroke();
      g.beginPath();
      for (let y = -step; y <= OW_CH + step; y += step) g.lineTo(owRoadX(k, y0 + y) - x0, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(242,210,90,.55)';
    g.lineWidth = 5;
    g.setLineDash([34, 30]);
    g.beginPath();
    for (let x = -step; x <= OW_CH + step; x += step) g.lineTo(x, owRoadY(k, x0 + x) - y0);
    g.stroke();
    g.beginPath();
    for (let y = -step; y <= OW_CH + step; y += step) g.lineTo(owRoadX(k, y0 + y) - x0, y);
    g.stroke();
    g.setLineDash([]);
  }
  // camps: a round concrete pad with a wrench
  for (const c of OW.camps) {
    const x = c.x - x0,
      y = c.y - y0;
    if (x < -260 || y < -260 || x > OW_CH + 260 || y > OW_CH + 260) continue;
    g.fillStyle = '#7a7d80';
    g.beginPath();
    g.arc(x, y, 120, 0, 7);
    g.fill();
    g.strokeStyle = '#f2b705';
    g.lineWidth = 8;
    g.setLineDash([22, 14]);
    g.beginPath();
    g.arc(x, y, 110, 0, 7);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(242,183,5,.85)';
    g.font = '700 46px "Chakra Petch", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('⚒', x, y - 4);
    g.font = '700 20px "Chakra Petch", sans-serif';
    g.fillText('CAMP', x, y + 46);
  }
  // the edge of the world
  g.fillStyle = '#f2b705';
  for (const [ex, ey, ew, eh] of [
    [-x0, -y0, WM, AH],
    [AW - WM - x0, -y0, WM, AH],
    [-x0, -y0, AW, WM],
    [-x0, AH - WM - y0, AW, WM]
  ])
    g.fillRect(ex, ey, ew, eh);
  ch.canvas = cv;
}
/** Small ground details per biome. */
function owDetail(g, id, x, y) {
  const r = rnd(4, 9);
  switch (id) {
    case 'backyard':
    case 'swamp':
      g.strokeStyle = id === 'swamp' ? 'rgba(90,150,70,.7)' : 'rgba(60,110,40,.6)';
      g.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(x + i * 3, y);
        g.lineTo(x + i * 5, y - r * 1.4);
        g.stroke();
      }
      break;
    case 'beach':
    case 'desert':
      g.strokeStyle = 'rgba(150,110,60,.25)';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < 6; i++) g.lineTo(x + i * 14, y + Math.sin(i) * 5);
      g.stroke();
      break;
    case 'ice':
    case 'frozenlot':
    case 'glacier':
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rnd(-30, 30), y + rnd(-30, 30));
      g.lineTo(x + rnd(-30, 30), y + rnd(-30, 30));
      g.stroke();
      break;
    case 'volcano':
      g.strokeStyle = 'rgba(255,120,30,.45)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 4; i++) g.lineTo((x += rnd(-30, 30)), (y += rnd(-30, 30)));
      g.stroke();
      break;
    case 'junkyard':
    case 'crusheryard':
    case 'construction':
      g.fillStyle = 'rgba(60,45,30,.35)';
      g.fillRect(x, y, r * 2.4, r * 0.7);
      break;
    default:
      g.fillStyle = 'rgba(0,0,0,.08)';
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
  }
}

/** Skid marks in the open world go onto the chunk they land on. */
const owMarks = {
  fillStyle: '#000',
  fillRect(x, y, w, h) {
    const ch = OW && OW.chunks.get(owKey(Math.floor(x / OW_CH), Math.floor(y / OW_CH)));
    if (!ch || !ch.canvas) return;
    const g = ch.canvas.getContext('2d');
    g.fillStyle = this.fillStyle;
    g.fillRect(x - ch.cx * OW_CH, y - ch.cy * OW_CH, w, h);
  }
};

function owAttach(ch) {
  if (ch.on) return;
  ch.on = true;
  // a client gets moving objects and pickups from the host; walls, zones and still props it builds itself
  B.objs.push(...ch.objs.filter(o => o.hp > 0 && !o.dead && !OW.gone.has(o.uid)));
  B.zones.push(...ch.zones);
  B.st.push(...ch.st);
  if (B.net !== 'client') B.pk.push(...ch.pk.filter(p => !OW.gone.has(p.uid)));
}
/** Ground pictures are painted one chunk per frame, nearest first, two chunks ahead of the camera. */
function owPaintAhead(x, y) {
  const cx = Math.floor(x / OW_CH),
    cy = Math.floor(y / OW_CH);
  let best = null,
    bd = 1e9;
  for (let j = -2; j <= 2; j++)
    for (let i = -2; i <= 2; i++) {
      const a = cx + i,
        b = cy + j;
      if (a < 0 || b < 0 || a >= OW_N || b >= OW_N) continue;
      const k = owKey(a, b);
      let ch = OW.chunks.get(k);
      if (ch && ch.canvas) continue;
      const d = i * i + j * j;
      if (d < bd) ((bd = d), (best = [a, b, k]));
    }
  if (!best) return;
  let ch = OW.chunks.get(best[2]);
  if (!ch) OW.chunks.set(best[2], (ch = owGenChunk(best[0], best[1])));
  owGround(ch);
}
function owDetach(ch) {
  if (!ch.on) return;
  ch.on = false;
  // objects that were pushed into another chunk stay with the chunk they started in
  ch.objs = B.objs.filter(o => o.ow === ch.k);
  for (const o of ch.objs) OW.parked.add(o.uid);
  B.objs = B.objs.filter(o => o.ow !== ch.k);
  B.zones = B.zones.filter(z => z.ow !== ch.k);
  B.st = B.st.filter(s => s.ow !== ch.k);
  if (B.net !== 'client') {
    ch.pk = B.pk.filter(p => p.ow === ch.k);
    B.pk = B.pk.filter(p => p.ow !== ch.k);
  }
}
/** Loads the chunks around every player and parks the ones nobody is near. */
function owStream(points) {
  const want = new Set();
  for (const [x, y] of points) {
    const cx = Math.floor(x / OW_CH),
      cy = Math.floor(y / OW_CH);
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const a = cx + i,
          b = cy + j;
        if (a < 0 || b < 0 || a >= OW_N || b >= OW_N) continue;
        want.add(owKey(a, b));
      }
  }
  for (const k of want) {
    let ch = OW.chunks.get(k);
    if (!ch) {
      const [a, b] = k.split(',').map(Number);
      OW.chunks.set(k, (ch = owGenChunk(a, b)));
    }
    owAttach(ch);
  }
  const near = (ch, r) =>
    points.some(
      ([x, y]) => Math.max(Math.abs(ch.cx - Math.floor(x / OW_CH)), Math.abs(ch.cy - Math.floor(y / OW_CH))) <= r
    );
  for (const ch of OW.chunks.values()) {
    if (!near(ch, 2)) owDetach(ch);
    // keep the pictures of a few recent chunks; regenerate the rest when you come back
    if (ch.canvas && !near(ch, 4)) ch.canvas = null;
  }
}

/* ---------- start and leave ---------- */
/** opt: seed (a shared or saved world), save (a saved game to continue), net ('host' or 'client'), friend. */
function startWorld(design, label, opt = {}) {
  G.started = true;
  G.mode = opt.net ? 'mp' : 'solo';
  hideOverlays();
  $('#ovMenu').hidden = true;
  G.phase = 'world';
  AW = AH = OW_N * OW_CH;
  const S = opt.save || null,
    seed = S ? S.seed : opt.seed != null ? opt.seed : (Date.now() & 0xffffff) ^ 0x5d;
  OW = {
    seed,
    net: opt.net || null,
    sites: new Map(),
    chunks: new Map(),
    seen: new Set(S ? S.seen : []),
    gone: new Set(),
    parked: new Set(),
    design,
    label,
    scrap: S ? S.scrap : 0,
    lastCoins: 0,
    wrecked: S ? S.wrecked : 0,
    done: S ? S.done : 0,
    inv: S ? { ...S.inv } : {},
    spawnT: 2,
    map: null,
    designs: {},
    players: opt.net ? 2 : 1,
    respawn: {},
    homes: {},
    notes: [],
    fly: [],
    fade: 1.2,
    clock: S && S.clock != null ? S.clock : undefined,
    mission: null
  };
  OW.camps = owCamps();
  const c0 = OW.camps.reduce((a, b) =>
    Math.hypot(b.x - AW / 2, b.y - AH / 2) < Math.hypot(a.x - AW / 2, a.y - AH / 2) ? b : a
  );
  OW.home0 = { x: c0.x, y: c0.y };
  if (S) for (const [i, j] of S.camps || []) OW.camps.find(c => c.i === i && c.j === j).seen = true;
  const c = (S && S.home && OW.camps.find(x => x.i === S.home[0] && x.j === S.home[1])) || c0;
  c.seen = true;
  OW.home = c;
  OW.homes[0] = OW.homes[1] = c;
  updateHUD();
  $('#build').hidden = true;
  $('#arena').hidden = false;
  $('#waitcard').hidden = true;
  sizeArena();
  const me = opt.net === 'client' ? 1 : 0;
  B = newB({
    net: opt.net || null,
    me,
    theme: owThemeAt(c.x, c.y),
    t: 0,
    ow: true,
    kind: 'world',
    noRing: true,
    remoteIn: null,
    remoteEdges: new Set(),
    rec: opt.net === 'host'
  });
  B.kind = 'world';
  B.grip = B.theme.grip;
  B.surf = surfaceOf(B.theme);
  B.sp = [[c.x, c.y + 40, 0]];
  ground = null;
  gx = owMarks;
  const mine = owPlayerCar(design, me, c, G.name, G.paint, 'local');
  mine.look = { ...G.style };
  B.cars =
    me === 0
      ? [mine]
      : [
          owPlayerCar(
            opt.friend?.design || design,
            0,
            c,
            opt.friend?.name || 'Host',
            opt.friend?.paint || '#4ea1ff',
            null
          ),
          mine
        ];
  if (opt.net === 'host')
    B.cars[1] = owPlayerCar(
      opt.friend?.design || design,
      1,
      c,
      opt.friend?.name || G.oppName || 'Friend',
      opt.friend?.paint || '#4ea1ff',
      'remote'
    );
  OW.seen.add(owKey(Math.floor(c.x / OW_CH), Math.floor(c.y / OW_CH)));
  owStream(B.cars.map(v => [v.x, v.y]));
  for (let i = 0; i < 9; i++) owPaintAhead(mine.x, mine.y);
  owBuildMap();
  cam.x = cam.tx = mine.x;
  cam.y = cam.ty = mine.y;
  cam.z = cam.tz = 1.6;
  B.flash = 1;
  sfx('tele');
  setButtons();
  OW.toast = S
    ? {
        text: 'Welcome back',
        sub: `${OW.done} missions done · ${Object.values(OW.inv).reduce((a, b) => a + b, 0)} parts in My parts`,
        t: 0
      }
    : {
        text: opt.net ? 'Open world · together' : 'Open world · test',
        sub: 'Loot buildings, take missions at camps (Enter), wreck raiders.',
        t: 0
      };
}
/** A player's car at a camp (players get slots 0 and 1). */
function owPlayerCar(design, idx, camp, name, paint, ctrl) {
  const v = makeCar(design, idx, camp.x + (idx ? 70 : -30), camp.y + 40, 0, {
    tune: ctrl === 'local' ? [...(G.tune || [])] : [],
    name,
    paint
  });
  v.ctrl = ctrl;
  v.team = 0;
  v.player = true;
  v.design = design;
  v.look = { ...DEFAULT_STYLE };
  return v;
}
/** Back to normal arena size; called whenever a normal battle or the menu takes over. */
function leaveWorld() {
  if (!OW) return;
  if (!OW.net) owSave();
  OW = null;
  AW = 2000;
  AH = 1250;
  gx = null;
  const b = $('#owCampBtn');
  if (b) b.hidden = true;
  const ov = $('#ovCamp');
  if (ov) ov.hidden = true;
}

/* ---------- each frame ---------- */
function owStep(dt) {
  const v = myCar();
  if (!v) return;
  B.t += dt; // gimmicks (stoves, vents) run on the world clock
  const host = B.net !== 'client',
    players = B.cars.filter(c => c && c.player);
  owStream((host ? players : [v]).map(c => [c.x, c.y]));
  owPaintAhead(v.x + v.vx * 0.8, v.y + v.vy * 0.8);
  const cx = Math.floor(v.x / OW_CH),
    cy = Math.floor(v.y / OW_CH);
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) OW.seen.add(owKey(cx + i, cy + j));
  // coins picked up or earned count as scrap; a new car after a wreck starts at zero
  if (v.coins < OW.lastCoins) OW.lastCoins = 0;
  if (v.coins > OW.lastCoins) {
    OW.scrap += v.coins - OW.lastCoins;
    OW.lastCoins = v.coins;
  }
  // biome change: new rules, new music, a big name on screen
  const th = owThemeAt(v.x, v.y);
  if (th !== B.theme) {
    B.theme = th;
    B.grip = th.grip;
    B.surf = surfaceOf(th);
    OW.toast = { text: th.name, sub: `${surfaceOf(th).name} · ${(THEME_BLURB[th.id] || '').split('.')[0]}`, t: 0 };
  }
  if (OW.toast) OW.toast.t += dt;
  for (const n of OW.notes) n.t += dt;
  OW.notes = OW.notes.filter(n => n.t < 6);
  for (const c of OW.camps) {
    const d = Math.hypot(c.x - v.x, c.y - v.y);
    if (d < 1400) c.seen = true;
    if (!host && d < 110 && OW.home !== c) {
      OW.home = c;
      OW.toast = { text: 'Camp', sub: 'Repaired. You respawn here now. Enter: missions and garage.', t: 0 };
    }
  }
  owFxStep(dt);
  owCampUI();
  if (!host) return;
  // camps: repair, set the respawn point (for each player)
  for (const p of players) {
    if (p.dead || B.seq !== 'play') continue;
    for (const c of OW.camps) {
      if (Math.hypot(c.x - p.x, c.y - p.y) > 110) continue;
      if (OW.homes[p.idx] === c && integrity(p) > 0.995) continue;
      if ((OW.campT && OW.campT[p.idx]) > B.time) continue;
      OW.campT = OW.campT || {};
      OW.campT[p.idx] = B.time + 4;
      OW.homes[p.idx] = c;
      if (p.idx === B.me) {
        OW.home = c;
        OW.toast = { text: 'Camp', sub: 'Repaired. You respawn here now. Enter: missions and garage.', t: 0 };
      }
      owRebuild(p, p.design);
      spark(p.x, p.y, 18, '#5cc38f');
      sfx('repair', p.x, p.y);
    }
  }
  // wrecked players come back at their camp after a few seconds
  for (const p of players) {
    if (!p.dead) continue;
    OW.respawn[p.idx] = OW.respawn[p.idx] || B.time + 3.5;
    if (B.time < OW.respawn[p.idx]) continue;
    OW.respawn[p.idx] = 0;
    const c = OW.homes[p.idx] || OW.home,
      n = owRebuild(p, p.design);
    n.x = c.x + (p.idx ? 60 : -40);
    n.y = c.y + 40;
    n.vx = n.vy = 0;
    n.dead = false;
    n.coins = 0;
    if (p.idx === B.me) OW.lastCoins = 0;
    sfx('tele', n.x, n.y);
  }
  owRaiders(dt, players);
  owMissionTick(dt);
  owWakePOIs(players.filter(p => !p.dead));
  const lead = players.find(p => !p.dead);
  if (lead) {
    owConvoy(dt, lead);
    owBounty(lead);
  }
  bossTick(dt);
}

/* ---------- raiders ---------- */
function owRaiderDesign(diff) {
  const t = pick(BRAWL_TYPES),
    k = t.style + diff;
  OW.designs[k] = OW.designs[k] || [];
  if (OW.designs[k].length < 2) OW.designs[k].push({ t, d: brawlDesign(t, diff) });
  return pick(OW.designs[k]);
}
function owRaiders(dt, players) {
  const live = players.filter(p => !p.dead);
  const dist = v => Math.min(...players.map(p => Math.hypot(v.x - p.x, v.y - p.y)));
  // far-away raiders quietly leave; wrecks clear their slot after a while
  for (const v of B.cars) {
    if (!v || v.player || v.gone) continue;
    if (!v.dead && dist(v) > 2800 && !v.aggro && !v.mission) {
      v.dead = true;
      v.gone = true;
    }
    if (v.dead && !v.gone && (v.deadT = (v.deadT || 0) + dt) > 4) v.gone = true;
  }
  if (!live.length || B.seq !== 'play') return;
  OW.spawnT -= dt;
  const me = pick(live),
    far = Math.hypot(me.x - OW.home0.x, me.y - OW.home0.y),
    diff = far > 7000 ? 2 : far > 3000 ? 1 : 0,
    cap = 1 + diff + players.length + (owIsNight() ? 1 : 0),
    n = B.cars.filter(c => c && !c.player && !c.dead).length;
  if (OW.spawnT > 0 || n >= cap) return;
  OW.spawnT = owIsNight() ? rnd(3.5, 7) : rnd(5, 10);
  // never right next to a camp: those are safe
  if (OW.camps.some(c => Math.hypot(c.x - me.x, c.y - me.y) < 500)) return;
  for (let t = 0; t < 20; t++) {
    const a = rnd(0, Math.PI * 2),
      r = rnd(1000, 1300),
      x = me.x + Math.cos(a) * r,
      y = me.y + Math.sin(a) * r;
    if (x < 200 || y < 200 || x > AW - 200 || y > AH - 200) continue;
    if (B.st.some(s => circRectDist(x, y, s) < 90) || B.objs.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 70))
      continue;
    owSpawnRaider(x, y, diff, false);
    return;
  }
}
/** Raiders wander until a player comes close or shoots them, then fight like a normal bot. */
function raiderThink(v, dt) {
  let d = 1e9;
  for (const p of B.cars) if (p && p.player && !p.dead) d = Math.min(d, Math.hypot(p.x - v.x, p.y - v.y));
  const hitByPlayer = v.lastBy && B.cars[v.lastBy.att] && B.cars[v.lastBy.att].player;
  if (d < 850 || (hitByPlayer && d < 2000)) v.aggro = true;
  if (v.aggro && !v.said) {
    // a raider tells you it has seen you
    v.said = true;
    if (Math.random() < 0.7) txt(v.x, v.y - v.rad - 26, pick(v.hunter ? HUNTER_LINES : RAIDER_LINES), '#ff9a84', 2);
  }
  if (d > 1900 && !v.mission && !v.hunter) v.aggro = false;
  // camps are safe ground: raiders turn away from them
  const camp = OW.camps.find(c => Math.hypot(c.x - v.x, c.y - v.y) < 420);
  if (v.aggro && !camp) return botThink(v, dt);
  const R = v.raider;
  R.t -= dt;
  if (camp) {
    R.tx = v.x + (v.x - camp.x);
    R.ty = v.y + (v.y - camp.y);
    R.t = 2;
  } else if (R.t <= 0 || Math.hypot(R.tx - v.x, R.ty - v.y) < 80) {
    R.t = rnd(3, 7);
    R.tx = clamp(v.x + rnd(-600, 600), 300, AW - 300);
    R.ty = clamp(v.y + rnd(-600, 600), 300, AH - 300);
  }
  const head = v.a - Math.PI / 2,
    want = Math.atan2(R.ty - v.y, R.tx - v.x),
    diffA = wrap(want - head);
  return {
    ...ZERO_IN,
    edges: new Set(),
    th: Math.abs(diffA) > 1.6 ? -0.3 : 0.45,
    st: clamp(diffA * 2, -1, 1),
    aimX: R.tx,
    aimY: R.ty
  };
}
const RAIDER_LINES = [
  'Fresh scrap!',
  'Nice wheels. Mine now.',
  'Toll road! Pay up!',
  'Get it!',
  'That one has shiny bits!',
  'Out of my junkyard!',
  'Dibs on the cockpit!',
  'Rev it, boys!'
];
const HUNTER_LINES = ['There you are.', 'Nothing personal. It pays well.', 'Your bounty just went up. For me.'];
const WRECK_LINES = ['I will be back!', 'My mum built that!', 'Worth it.', 'Ow, my bolts.', 'Tell the boss…', 'Not again!'];
/** A raider is wrecked: scrap for whoever did it, maybe a repair kit or a part on the ground. */
function owRaiderDown(v) {
  if (B.net === 'client') return;
  OW.wrecked++;
  if (Math.random() < 0.45) txt(v.x, v.y - v.rad - 26, pick(WRECK_LINES), '#ece8df', 1.8);
  const by = v.lastBy && B.cars[v.lastBy.att],
    k = by && by.player && !by.dead ? by : B.cars.find(c => c.player && !c.dead);
  if (k) coinPop(v.x, v.y, 15 + v.diff * 15 + (v.hunter ? 60 : 0) + (v.boss ? 100 : 0), k);
  if (Math.random() < 0.3) B.pk.push({ kind: 'repair', x: v.x, y: v.y, val: 0.3, cd: 0, uid: owUid() });
  if (v.convoy || v.hunter || v.boss || Math.random() < 0.25) {
    const n = v.boss ? 3 : v.convoy ? 3 : 1;
    for (let i = 0; i < n; i++)
      owDropPart(
        v.x + rnd(-80, 80),
        v.y + rnd(-80, 80),
        owRollPart(v.x, v.y, v.boss ? 2.5 : v.convoy || v.hunter ? 1 : 0),
        v
      );
  }
}

/* ---------- camera ---------- */
function owCam(v) {
  // look ahead the way you drive, and zoom out a little at speed
  const sp = Math.hypot(v.vx, v.vy);
  cam.tx = v.x + v.vx * 0.45;
  cam.ty = v.y + v.vy * 0.45;
  cam.tz = clamp(1.2 - sp / 1400, 0.82, 1.2);
}

/* ---------- drawing ---------- */
function owDrawGround(c) {
  const s = view.sc * cam.z,
    hw = view.w / (2 * s),
    hh = view.h / (2 * s);
  const cx0 = Math.floor((cam.x - hw) / OW_CH),
    cx1 = Math.floor((cam.x + hw) / OW_CH),
    cy0 = Math.floor((cam.y - hh) / OW_CH),
    cy1 = Math.floor((cam.y + hh) / OW_CH);
  c.fillStyle = '#0d1220';
  c.fillRect(cam.x - hw - 10, cam.y - hh - 10, hw * 2 + 20, hh * 2 + 20);
  for (let cy = cy0; cy <= cy1; cy++)
    for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cy < 0 || cx >= OW_N || cy >= OW_N) continue;
      const k = owKey(cx, cy);
      let ch = OW.chunks.get(k);
      if (!ch) OW.chunks.set(k, (ch = owGenChunk(cx, cy)));
      if (ch.canvas) c.drawImage(ch.canvas, cx * OW_CH, cy * OW_CH);
      else {
        // not painted yet (it will be in a frame or two): the biome's colour stands in
        c.fillStyle = owThemeAt(cx * OW_CH + OW_CH / 2, cy * OW_CH + OW_CH / 2).ground[0];
        c.fillRect(cx * OW_CH, cy * OW_CH, OW_CH + 1, OW_CH + 1);
      }
    }
}
/** The whole map at 1 px = 100 world px, built once (biome colours and roads). */
function owBuildMap() {
  const n = (OW_N * OW_CH) / 100,
    cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d');
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const wx = x * 100 + 50,
        wy = y * 100 + 50;
      g.fillStyle = owOnRoad(wx, wy) ? '#9aa0a8' : owThemeAt(wx, wy).ground[0];
      g.fillRect(x, y, 1, 1);
    }
  OW.map = cv;
}
function owHUD(c) {
  const v = myCar();
  if (!v) return;
  const W = view.w,
    H = view.h;
  // minimap, top right: what you have seen, camps, raiders, you
  const M = Math.min(210, W * 0.18),
    mx = W - M - 18,
    my = 18,
    k = M / AW;
  c.save();
  c.fillStyle = 'rgba(6,10,20,.85)';
  c.fillRect(mx - 4, my - 4, M + 8, M + 8);
  c.imageSmoothingEnabled = false;
  if (OW.map) c.drawImage(OW.map, mx, my, M, M);
  c.fillStyle = 'rgba(6,10,20,.88)';
  for (let cy = 0; cy < OW_N; cy++)
    for (let cx = 0; cx < OW_N; cx++)
      if (!OW.seen.has(owKey(cx, cy)))
        c.fillRect(mx + cx * OW_CH * k, my + cy * OW_CH * k, OW_CH * k + 0.6, OW_CH * k + 0.6);
  for (const cp of OW.camps) {
    if (!cp.seen) continue;
    c.fillStyle = cp === OW.home ? '#3fe0a0' : '#f2b705';
    c.fillRect(mx + cp.x * k - 3, my + cp.y * k - 3, 6, 6);
  }
  for (const ch of OW.chunks.values()) {
    if (!OW.seen.has(ch.k)) continue;
    c.fillStyle = 'rgba(220,226,232,.75)';
    for (const b of ch.bld || []) c.fillRect(mx + b.x * k, my + b.y * k, Math.max(2, b.w * k), Math.max(2, b.h * k));
    if (ch.poi) {
      c.fillStyle = ch.poi.awake ? 'rgba(255,77,58,.5)' : '#ff4d3a';
      c.beginPath();
      c.moveTo(mx + ch.poi.x * k, my + ch.poi.y * k - 4);
      c.lineTo(mx + ch.poi.x * k + 4, my + ch.poi.y * k + 3);
      c.lineTo(mx + ch.poi.x * k - 4, my + ch.poi.y * k + 3);
      c.fill();
    }
  }
  for (const r of B.cars) {
    if (!r || r === v || r.dead) continue;
    if (r.player) {
      c.fillStyle = r.paint;
      c.beginPath();
      c.arc(mx + r.x * k, my + r.y * k, 4, 0, 7);
      c.fill();
      c.strokeStyle = '#fff';
      c.stroke();
      continue;
    }
    c.fillStyle = r.convoy ? '#ffd257' : r.aggro ? '#ff4d3a' : 'rgba(255,120,100,.7)';
    c.beginPath();
    c.arc(mx + r.x * k, my + r.y * k, r.boss || r.hunter ? 4 : 2.5, 0, 7);
    c.fill();
  }
  const tg = owMissionTarget();
  if (tg) {
    c.strokeStyle = '#5be7ff';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(mx + tg.x * k, my + tg.y * k, 5 + Math.sin(ANIM * 6), 0, 7);
    c.stroke();
  }
  c.save();
  c.translate(mx + v.x * k, my + v.y * k);
  c.rotate(v.a);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0, -6);
  c.lineTo(4, 5);
  c.lineTo(-4, 5);
  c.closePath();
  c.fill();
  c.restore();
  c.strokeStyle = 'rgba(91,231,255,.45)';
  c.lineWidth = 1;
  c.strokeRect(mx - 0.5, my - 0.5, M + 1, M + 1);
  c.restore();
  // status, top left: where you are, how your car is doing, what you have
  const integ = v.dead ? 0 : integrity(v);
  c.save();
  owPanel(c, 18, 18, 280, 100, B.theme.ground ? B.theme.ground[0] : '#5be7ff');
  c.fillStyle = '#dfe9f5';
  c.font = '700 20px "Chakra Petch", sans-serif';
  c.textAlign = 'left';
  c.fillText(B.theme.name, 32, 44);
  owDrawClock(c, 278, 38);
  c.font = '500 13px "Barlow Semi Condensed", sans-serif';
  c.fillStyle = '#8fa3bd';
  const home = Math.round(Math.hypot(OW.home.x - v.x, OW.home.y - v.y) / S);
  c.fillText(`${(B.surf || SURFACES.asphalt).name} · camp ${home} m · ${OW.label}`, 32, 63);
  c.fillStyle = 'rgba(255,255,255,.12)';
  c.fillRect(32, 74, 250, 9);
  OW.hpShown = OW.hpShown == null ? integ : OW.hpShown + (integ - OW.hpShown) * 0.08;
  if (OW.hpShown > integ) {
    // the part you just lost lingers a moment in white
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fillRect(32, 74, 250 * OW.hpShown, 9);
  }
  c.fillStyle = integ > 0.5 ? '#5cc38f' : integ > 0.25 ? '#f2b705' : '#e2504a';
  c.fillRect(32, 74, 250 * integ, 9);
  const nParts = Object.values(OW.inv).reduce((a, b) => a + b, 0),
    pul = OW.pulse || 0;
  c.font = '600 14px "Barlow Semi Condensed", sans-serif';
  c.fillStyle = OW.shown < OW.scrap - 0.5 ? '#fff3c4' : '#ffd257';
  const t1 = `Scrap ${Math.round(OW.shown == null ? OW.scrap : OW.shown)}`;
  c.fillText(t1, 32, 106);
  let px = 32 + c.measureText(t1).width + 14;
  c.save();
  c.translate(px, 101);
  c.scale(1 + pul * 0.35, 1 + pul * 0.35);
  c.fillStyle = pul > 0.05 ? '#ffffff' : '#ffd257';
  const t2 = `My parts ${nParts}`;
  c.fillText(t2, 0, 5);
  c.restore();
  const flyX = px + c.measureText(t2).width / 2;
  px += c.measureText(t2).width + 14;
  c.fillStyle = '#ffd257';
  c.fillText(`Wrecked ${OW.wrecked}`, px, 106);
  c.restore();
  // the mission, under the status box, with a bar for how far along it is
  const MS = OW.mission,
    tg2 = owMissionTarget();
  if (MS) {
    c.save();
    owPanel(c, 18, 124, 280, 62, '#5be7ff');
    c.fillStyle = '#5be7ff';
    c.font = '700 14px "Chakra Petch", sans-serif';
    c.textAlign = 'left';
    c.fillText(MS.title, 32, 144);
    c.fillStyle = '#b6c8e0';
    c.font = '500 13px "Barlow Semi Condensed", sans-serif';
    const extra = MS.type === 'race' ? ` · ${Math.max(0, Math.ceil(MS.time - MS.t))} s` : '';
    c.fillText(tg2 ? `${tg2.label} · ${Math.round(Math.hypot(tg2.x - v.x, tg2.y - v.y) / S)} m${extra}` : '', 32, 162);
    let prog = 0,
      pcol = '#5be7ff';
    if (MS.type === 'race') {
      prog = Math.max(0, 1 - MS.t / MS.time);
      pcol = prog < 0.25 ? '#e2504a' : '#5be7ff';
      for (let i = 0; i < MS.pts.length; i++) {
        c.fillStyle = i < MS.step ? '#5be7ff' : 'rgba(255,255,255,.2)';
        c.beginPath();
        c.arc(222 + i * 13, 140, 4, 0, 7);
        c.fill();
      }
    } else if (MS.type === 'fetch') prog = MS.carrying !== false ? 0.5 : 0.1;
    else if (MS.foes) {
      const left = MS.foes.filter(i => B.cars[i] && !B.cars[i].dead).length;
      prog = 1 - left / MS.foes.length;
      pcol = '#ff8268';
    }
    c.fillStyle = 'rgba(255,255,255,.1)';
    c.fillRect(32, 172, 250, 5);
    c.fillStyle = pcol;
    c.fillRect(32, 172, 250 * prog, 5);
    c.restore();
  }
  // notes: finds and events, bottom left; they slide in
  c.save();
  c.textAlign = 'left';
  c.font = '600 14px "Barlow Semi Condensed", sans-serif';
  OW.notes.forEach((n, i) => {
    c.globalAlpha = Math.max(0, Math.min(1, (6 - n.t) * 1.5, n.t * 4));
    const dx = -Math.max(0, 1 - n.t * 5) * 40,
      w = c.measureText(n.text).width + 24,
      yy = H - 60 - (OW.notes.length - 1 - i) * 30;
    owPanel(c, 18 + dx, yy, w, 25, n.col);
    c.fillStyle = n.col;
    c.fillText(n.text, 30 + dx, yy + 17);
  });
  c.restore();
  owDrawFly(c, flyX, 101);
  // an arrow to the mission target and to your friend when they are off screen
  const sc0 = view.sc * cam.z,
    arrows = [];
  if (tg2) arrows.push([tg2.x, tg2.y, '#5be7ff', tg2.label]);
  for (const f of B.cars) if (f && f.player && f !== v && !f.dead) arrows.push([f.x, f.y, f.paint, f.name]);
  for (const [x, y, col, label] of arrows) {
    const [ex, ey] = worldToScreen(x, y, sc0);
    if (ex > 0 && ey > 0 && ex < W && ey < H) continue;
    const a = Math.atan2(ey - H / 2, ex - W / 2),
      px = clamp(ex, 40, W - 40),
      py = clamp(ey, 120, H - 40);
    c.save();
    c.translate(px, py);
    c.rotate(a);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(-8, -11);
    c.lineTo(-3, 0);
    c.lineTo(-8, 11);
    c.closePath();
    c.fill();
    c.restore();
    c.save();
    c.fillStyle = '#ece8df';
    c.font = '700 11px "Barlow Semi Condensed", sans-serif';
    c.textAlign = 'center';
    c.fillText(`${label} · ${Math.round(Math.hypot(x - v.x, y - v.y) / S)} m`, px, py + 26);
    c.restore();
  }
  // arrows to raiders that are after you
  const s = view.sc * cam.z;
  for (const r of B.cars) {
    if (!r || r === v || r.dead || !r.aggro || r.player) continue;
    const [ex, ey] = worldToScreen(r.x, r.y, s);
    if (ex > 0 && ey > 0 && ex < W && ey < H) continue;
    const a = Math.atan2(ey - H / 2, ex - W / 2),
      px = clamp(ex, 30, W - 30),
      py = clamp(ey, 30, H - 30);
    c.save();
    c.translate(px, py);
    c.rotate(a);
    c.fillStyle = '#ff4d3a';
    c.beginPath();
    c.moveTo(14, 0);
    c.lineTo(-8, -9);
    c.lineTo(-4, 0);
    c.lineTo(-8, 9);
    c.closePath();
    c.fill();
    c.restore();
  }
  // big place names and news: pops in, a line grows under it, fades out
  const T = OW.toast;
  if (T && T.t < 3.2) {
    const a = Math.min(1, T.t * 3, (3.2 - T.t) * 2),
      pop = 1 + Math.max(0, 0.25 - T.t) * 0.6;
    c.save();
    c.globalAlpha = a;
    c.textAlign = 'center';
    c.translate(W / 2, H * 0.2);
    c.scale(pop, pop);
    c.font = `700 ${Math.round(Math.min(46, W * 0.035))}px "Chakra Petch", sans-serif`;
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.fillText(T.text.toUpperCase(), 2, 3);
    c.fillStyle = T.col || '#ffffff';
    c.fillText(T.text.toUpperCase(), 0, 0);
    const lw = Math.min(1, T.t * 2.5) * Math.min(340, c.measureText(T.text.toUpperCase()).width + 40);
    c.fillStyle = T.col || '#5be7ff';
    c.fillRect(-lw / 2, 12, lw, 3);
    c.font = '500 16px "Barlow Semi Condensed", sans-serif';
    c.fillStyle = '#d5e0ee';
    c.fillText(T.sub, 0, 36);
    c.restore();
  }
  if (v.dead) {
    c.save();
    c.textAlign = 'center';
    c.fillStyle = '#ff8268';
    c.font = '700 28px "Chakra Petch", sans-serif';
    c.fillText('WRECKED · back to your camp in a moment', W / 2, H / 2 + 80);
    c.restore();
  }
  if (OW.fade > 0) {
    c.fillStyle = `rgba(6,10,20,${Math.min(1, OW.fade * 1.4)})`;
    c.fillRect(0, 0, W, H);
  }
}

/** Things in the world that belong to missions: the crate, checkpoints, the target area. */
function owDrawMarks(c) {
  const M = OW && OW.mission;
  if (!M) return;
  const pulse = 1 + Math.sin(ANIM * 4) * 0.06;
  if (M.type === 'fetch') {
    const p = M.cargo;
    c.save();
    c.translate(p.x, p.y - (M.carrying !== false ? 34 : 0));
    JUNKDRAW.lootcrate(c, M.carrying !== false ? 11 : 16);
    c.restore();
    if (M.carrying === false) {
      c.strokeStyle = 'rgba(91,231,255,.8)';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(p.x, p.y, 46 * pulse, 0, 7);
      c.stroke();
    } else {
      c.strokeStyle = 'rgba(91,231,255,.6)';
      c.lineWidth = 6;
      c.setLineDash([20, 14]);
      c.beginPath();
      c.arc(M.dest.x, M.dest.y, 130 * pulse, 0, 7);
      c.stroke();
      c.setLineDash([]);
    }
  } else if (M.type === 'race') {
    M.pts.forEach((p, i) => {
      if (i < M.step) return;
      c.strokeStyle = i === M.step ? '#5be7ff' : 'rgba(91,231,255,.3)';
      c.lineWidth = i === M.step ? 8 : 4;
      c.beginPath();
      c.arc(p.x, p.y, i === M.step ? 100 * pulse : 90, 0, 7);
      c.stroke();
      c.fillStyle = 'rgba(91,231,255,.8)';
      c.font = '700 28px "Chakra Petch", sans-serif';
      c.textAlign = 'center';
      c.fillText(String(i + 1), p.x, p.y + 10);
    });
  } else {
    c.strokeStyle = M.type === 'boss' ? 'rgba(255,92,122,.6)' : 'rgba(255,128,104,.5)';
    c.lineWidth = 6;
    c.setLineDash([26, 18]);
    c.beginPath();
    c.arc(M.at.x, M.at.y, 260 * pulse, 0, 7);
    c.stroke();
    c.setLineDash([]);
  }
}
