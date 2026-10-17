// Open world, part 6: scenery. Trees, pines, palms, cacti, rocks and crystals per biome, street lamps along the
// roads that light up at night, and cloud shadows drifting over everything. Trunks and rocks are solid;
// canopies hang over the cars and turn see-through when you drive under them. Every piece is drawn once into a
// small sprite and reused, so a forest costs about as much as one picture per tree.

const OW_SCEN = {
  backyard: [
    ['tree', 5],
    ['bush', 4],
    ['flowers', 3]
  ],
  swamp: [
    ['deadtree', 3],
    ['tree', 2],
    ['reeds', 5],
    ['bush', 2]
  ],
  beach: [
    ['palm', 4],
    ['rock', 1],
    ['bush', 1]
  ],
  desert: [
    ['cactus', 5],
    ['rock', 3]
  ],
  volcano: [
    ['rock', 5],
    ['deadtree', 1]
  ],
  ice: [
    ['pine', 4],
    ['rock', 2]
  ],
  frozenlot: [
    ['pine', 3],
    ['rock', 1]
  ],
  glacier: [
    ['pine', 2],
    ['rock', 3]
  ],
  haunted: [
    ['deadtree', 5],
    ['rock', 1]
  ],
  space: [
    ['crystal', 4],
    ['rock', 2]
  ],
  warpzone: [['crystal', 3]],
  neonstrip: [
    ['crystal', 1],
    ['bush', 2]
  ],
  construction: [
    ['rock', 2],
    ['bush', 1]
  ],
  junkyard: [
    ['bush', 2],
    ['deadtree', 1]
  ],
  carpark: [
    ['tree', 2],
    ['bush', 3]
  ],
  market: [
    ['tree', 2],
    ['bush', 2]
  ],
  funfair: [
    ['tree', 2],
    ['flowers', 2]
  ],
  default: [
    ['bush', 2],
    ['tree', 1]
  ]
};
// solid: trunk/body radius as a share of the size; canopy: drawn over the cars
const OW_SCEN_KIND = {
  tree: { r: [70, 110], solid: 0.2, canopy: true },
  pine: { r: [55, 82], solid: 0.22, canopy: true },
  palm: { r: [62, 88], solid: 0.16, canopy: true },
  deadtree: { r: [52, 80], solid: 0.2, canopy: true },
  cactus: { r: [16, 26], solid: 0.8 },
  rock: { r: [26, 52], solid: 0.82 },
  crystal: { r: [16, 28], solid: 0.7, glow: '#7fe0ff' },
  bush: { r: [22, 36] },
  reeds: { r: [14, 22] },
  flowers: { r: [12, 20] }
};

/** Scatters the biome's scenery over a chunk (seeded: the same trees in the same spots every visit). */
function owGenScenery(ch) {
  const x0 = ch.cx * OW_CH,
    y0 = ch.cy * OW_CH,
    hq = OW.hq,
    out = (ch.scen = []);
  owSeeded(owHash(ch.cx, ch.cy, OW.seed ^ 0x7aee), () => {
    const n = 10 + Math.floor(Math.random() * 10);
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      const x = x0 + rnd(30, OW_CH - 30),
        y = y0 + rnd(30, OW_CH - 30),
        th = owThemeAt(x, y),
        list = OW_SCEN[th.id] || OW_SCEN.default,
        k = wpick(list, e => e[1])[0],
        K = OW_SCEN_KIND[k],
        r = rnd(K.r[0], K.r[1]),
        body = K.solid ? r * K.solid : 0;
      if (x < WM + 60 || y < WM + 60 || x > AW - WM - 60 || y > AH - WM - 60) continue;
      if (owRoadDist(x, y) < OW_ROADW + (K.canopy ? r * 0.6 : r) + 12) continue;
      if (OW.camps.some(c => Math.hypot(c.x - x, c.y - y) < 260 + r)) continue;
      if (Math.hypot(x - OW.home0.x, y - OW.home0.y) < 340 + r) continue;
      if (hq && Math.abs(x - hq.x) < hq.w / 2 + r + 30 && Math.abs(y - hq.y) < hq.h / 2 + r + 30) continue;
      if (ch.st.some(s => circRectDist(x, y, s) < (K.canopy ? body : r) + 26)) continue;
      if (ch.objs.some(o => Math.hypot(o.x - x, o.y - y) < o.r + (body || r) + 14)) continue;
      if (
        ch.zones.some(z =>
          z.r !== undefined ? Math.hypot(z.x - x, z.y - y) < z.r + r : circRectDist(x, y, z) < r + 10
        )
      )
        continue;
      if (out.some(o => Math.hypot(o.x - x, o.y - y) < (o.r + r) * (K.canopy ? 0.75 : 1))) continue;
      const it = { k, x, y, r, v: Math.floor(Math.random() * 4), a: rnd(0, Math.PI * 2) };
      out.push(it);
      if (body) ch.st.push({ x: x - body, y: y - body, w: body * 2, h: body * 2, scen: true });
    }
    // street lamps along the roads that cross this chunk, on alternate sides
    for (let k = 0; k < OW_ROADS; k++) {
      for (let x = x0 + 90; x < x0 + OW_CH; x += 300) {
        const ry = owRoadY(k, x);
        if (ry < y0 || ry > y0 + OW_CH) continue;
        const side = Math.round(x / 300) % 2 ? 1 : -1,
          ly = ry + side * (OW_ROADW + 16);
        if (!OW.camps.some(c => Math.hypot(c.x - x, c.y - ly) < 280))
          out.push({ k: 'lamp', x, y: ly, r: 44, side, v: 0 });
      }
      for (let y = y0 + 90; y < y0 + OW_CH; y += 300) {
        const rx = owRoadX(k, y);
        if (rx < x0 || rx > x0 + OW_CH) continue;
        const side = Math.round(y / 300) % 2 ? 1 : -1,
          lx = rx + side * (OW_ROADW + 16);
        if (!OW.camps.some(c => Math.hypot(c.x - lx, c.y - y) < 280))
          out.push({ k: 'lamp', x: lx, y, r: 44, side, v: 1 });
      }
    }
  });
}

/* ---------- sprites ---------- */
const SCEN_SPR = new Map();
function scenSprite(k, v, part) {
  const key = k + v + part;
  let cv = SCEN_SPR.get(key);
  if (cv) return cv;
  const R = 80, // drawn for a size-80 piece at 2x, scaled to fit when drawn
    Z = 2,
    W = R * 2.6;
  cv = document.createElement('canvas');
  cv.width = cv.height = Math.ceil(W * Z);
  const g = cv.getContext('2d');
  g.scale(Z, Z);
  g.translate(W / 2, W / 2);
  const rng = owRng(v * 97 + k.length * 13 + (part === 'top' ? 5 : 0)),
    blob = (x, y, r, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    };
  if (part === 'base') {
    // what sits on the ground: shadows, trunks, rocks, bushes, cacti
    if (k === 'tree' || k === 'palm' || k === 'deadtree' || k === 'pine') {
      const thin = k === 'deadtree' || k === 'palm';
      g.fillStyle = thin ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.26)';
      g.beginPath();
      g.ellipse(R * 0.3, R * 0.38, R * (thin ? 0.7 : 0.98), R * (thin ? 0.6 : 0.88), 0, 0, 7);
      g.fill();
      blob(0, 0, R * 0.2, k === 'palm' ? '#8a6a44' : k === 'deadtree' ? '#4a4038' : '#5c4128');
      blob(-R * 0.05, -R * 0.05, R * 0.12, k === 'palm' ? '#a5835a' : '#6e5134');
    } else if (k === 'rock') {
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.beginPath();
      g.ellipse(R * 0.15, R * 0.2, R * 0.95, R * 0.8, 0, 0, 7);
      g.fill();
      const pts = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2,
          rr = R * (0.72 + rng() * 0.28);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86]);
      }
      const gr = g.createLinearGradient(-R, -R, R, R);
      gr.addColorStop(0, '#a7a39b');
      gr.addColorStop(0.55, '#77736c');
      gr.addColorStop(1, '#4b4844');
      g.fillStyle = gr;
      g.beginPath();
      pts.forEach(([x, y]) => g.lineTo(x, y));
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(30,28,25,.6)';
      g.lineWidth = 3;
      g.stroke();
      // facets
      g.strokeStyle = 'rgba(255,255,255,.18)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(pts[5][0] * 0.4, pts[5][1] * 0.4);
      g.lineTo(pts[3][0] * 0.8, pts[3][1] * 0.8);
      g.moveTo(pts[5][0] * 0.4, pts[5][1] * 0.4);
      g.lineTo(pts[7][0] * 0.7, pts[7][1] * 0.7);
      g.stroke();
    } else if (k === 'cactus') {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.beginPath();
      g.ellipse(R * 0.2, R * 0.25, R * 0.95, R * 0.9, 0, 0, 7);
      g.fill();
      // seen from above: a ribbed round body and two arms
      for (const [ax, ay, ar] of [
        [-R * 0.75, -R * 0.1, R * 0.36],
        [R * 0.7, R * 0.15, R * 0.32]
      ]) {
        g.strokeStyle = '#3f7a3a';
        g.lineWidth = R * 0.42;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(ax, ay);
        g.stroke();
        blob(ax, ay, ar, '#4f9447');
      }
      const gr = g.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.1, 0, 0, R * 0.62);
      gr.addColorStop(0, '#7cc06a');
      gr.addColorStop(1, '#3a7436');
      blob(0, 0, R * 0.6, gr);
      g.strokeStyle = 'rgba(25,60,25,.6)';
      g.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * R * 0.15, Math.sin(a) * R * 0.15);
        g.lineTo(Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58);
        g.stroke();
      }
      blob(0, 0, R * 0.12, '#f4d36b');
    } else if (k === 'crystal') {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.beginPath();
      g.ellipse(R * 0.15, R * 0.2, R * 0.9, R * 0.8, 0, 0, 7);
      g.fill();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rng(),
          L = R * (0.6 + rng() * 0.5),
          w = R * 0.22;
        g.save();
        g.rotate(a);
        const gr = g.createLinearGradient(0, -w, 0, w);
        gr.addColorStop(0, '#d4fbff');
        gr.addColorStop(0.5, '#5fd2f0');
        gr.addColorStop(1, '#2a6f9a');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(0, -w);
        g.lineTo(L * 0.8, -w * 0.7);
        g.lineTo(L, 0);
        g.lineTo(L * 0.8, w * 0.7);
        g.lineTo(0, w);
        g.closePath();
        g.fill();
        g.restore();
      }
      blob(0, 0, R * 0.22, '#c9f6ff');
    } else if (k === 'bush' || k === 'flowers' || k === 'reeds') {
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.beginPath();
      g.ellipse(R * 0.15, R * 0.2, R * 0.9, R * 0.8, 0, 0, 7);
      g.fill();
      if (k === 'reeds') {
        g.strokeStyle = '#6f8a3c';
        g.lineWidth = 4;
        g.lineCap = 'round';
        for (let i = 0; i < 14; i++) {
          const a = rng() * Math.PI * 2,
            l = R * (0.4 + rng() * 0.6);
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * l, Math.sin(a) * l);
          g.stroke();
          if (i % 3 === 0) blob(Math.cos(a) * l, Math.sin(a) * l, 5, '#6b4a2a');
        }
      } else {
        const cols = ['#3f7a34', '#4f9140', '#5ea64b'];
        for (let i = 0; i < 7; i++)
          blob((rng() - 0.5) * R * 0.9, (rng() - 0.5) * R * 0.8, R * (0.3 + rng() * 0.25), cols[i % 3]);
        if (k === 'flowers')
          for (let i = 0; i < 9; i++)
            blob(
              (rng() - 0.5) * R * 1.1,
              (rng() - 0.5) * R,
              R * 0.09,
              ['#ff7aa8', '#ffe066', '#fff', '#b07cff'][i % 4]
            );
      }
    } else if (k === 'lamp') {
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(-R * 0.05, -R * 0.05, R * 0.9, R * 0.16);
      blob(0, 0, R * 0.22, '#3b4048');
      blob(0, 0, R * 0.12, '#6b727c');
    }
  } else {
    // the top: canopies and lamp heads, drawn over the cars
    if (k === 'tree') {
      const cols = ['#2f6b2c', '#3b8236', '#4a9a3f', '#5db04c'];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rng(),
          d = R * 0.42;
        blob(Math.cos(a) * d, Math.sin(a) * d, R * (0.42 + rng() * 0.12), cols[i % 2]);
      }
      blob(0, 0, R * 0.55, cols[1]);
      for (let i = 0; i < 5; i++)
        blob(-R * 0.25 + (rng() - 0.5) * R * 0.6, -R * 0.28 + (rng() - 0.5) * R * 0.5, R * 0.2, cols[3]);
    } else if (k === 'pine') {
      for (let layer = 0; layer < 3; layer++) {
        const rr = R * (1 - layer * 0.28);
        g.fillStyle = ['#1f4d33', '#2a6143', '#357553'][layer];
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + layer * 0.2,
            q = i % 2 ? rr * 0.62 : rr;
          g.lineTo(Math.cos(a) * q, Math.sin(a) * q);
        }
        g.closePath();
        g.fill();
        // snow on the tips
        g.fillStyle = 'rgba(240,248,255,.75)';
        for (let i = 0; i < 16; i += 2) {
          const a = (i / 16) * Math.PI * 2 + layer * 0.2;
          blob(Math.cos(a) * rr * 0.86, Math.sin(a) * rr * 0.86, R * 0.07, 'rgba(240,248,255,.8)');
        }
      }
      blob(0, 0, R * 0.12, '#e8f2fa');
    } else if (k === 'palm') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rng() * 0.4;
        g.save();
        g.rotate(a);
        g.fillStyle = i % 2 ? '#3f8c3a' : '#52a646';
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(R * 0.5, -R * 0.28, R, R * 0.05);
        g.quadraticCurveTo(R * 0.5, R * 0.1, 0, 0);
        g.fill();
        g.strokeStyle = 'rgba(20,60,20,.5)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(R * 0.5, -R * 0.08, R, R * 0.05);
        g.stroke();
        g.restore();
      }
      for (const [x, y] of [
        [-6, -4],
        [6, -2],
        [0, 7]
      ])
        blob(x, y, 7, '#6b4a24');
    } else if (k === 'deadtree') {
      g.strokeStyle = '#4b423b';
      g.lineCap = 'round';
      const branch = (x, y, a, l, w, d) => {
        const x2 = x + Math.cos(a) * l,
          y2 = y + Math.sin(a) * l;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x2, y2);
        g.stroke();
        if (d > 0) {
          branch(x2, y2, a - 0.5 - rng() * 0.3, l * 0.62, w * 0.62, d - 1);
          branch(x2, y2, a + 0.4 + rng() * 0.3, l * 0.6, w * 0.6, d - 1);
        }
      };
      for (let i = 0; i < 5; i++) branch(0, 0, (i / 5) * Math.PI * 2 + rng(), R * 0.45, 9, 2);
    } else if (k === 'lamp') {
      // the arm and the head, hanging out over the road
      g.strokeStyle = '#2f343b';
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -R * 0.55);
      g.stroke();
      g.fillStyle = '#2f343b';
      g.fillRect(-R * 0.2, -R * 0.75, R * 0.4, R * 0.24);
      g.fillStyle = '#fff3c4';
      g.fillRect(-R * 0.14, -R * 0.7, R * 0.28, R * 0.12);
    }
  }
  SCEN_SPR.set(key, cv);
  return cv;
}

/** Draws the scenery in view. 'base' goes under the cars, 'top' (canopies, lamp heads) over them. */
function owDrawScenery(c, part) {
  if (!OW) return;
  const cars = B.cars.filter(v => v && !v.dead),
    perfLite = SETTINGS.perf;
  for (const ch of OW.chunks.values()) {
    if (!ch.on || !ch.scen) continue;
    if (!owInView(ch.cx * OW_CH + OW_CH / 2, ch.cy * OW_CH + OW_CH / 2, OW_CH * 0.75)) continue;
    for (const it of ch.scen) {
      if (!owInView(it.x, it.y, it.r * 1.5)) continue;
      const K = OW_SCEN_KIND[it.k] || {},
        top = part === 'top';
      if (top && !K.canopy && it.k !== 'lamp') continue;
      const sp = scenSprite(it.k, it.v, part),
        sc = it.r / 80,
        W = 80 * 2.6 * sc;
      c.save();
      c.translate(it.x, it.y);
      if (it.k === 'lamp') c.rotate(it.v ? (it.side > 0 ? Math.PI : 0) + Math.PI / 2 : it.side > 0 ? 0 : Math.PI);
      else c.rotate(it.a);
      if (top && it.k !== 'lamp') {
        // canopies sway a little and fade when a car is underneath
        if (!perfLite && !REDUCED.on) c.rotate(Math.sin(ANIM * 0.8 + it.x * 0.01) * 0.04);
        const under = cars.some(v => Math.hypot(v.x - it.x, v.y - it.y) < it.r + (v.rad || 40) * 0.6);
        it.fade = (it.fade || 1) + ((under ? 0.35 : 1) - (it.fade || 1)) * 0.15;
        c.globalAlpha = it.fade;
      }
      c.drawImage(sp, -W / 2, -W / 2, W, W);
      c.restore();
    }
  }
}
/** Lamps and crystals glow at night. */
function owSceneryLights(light) {
  for (const ch of OW.chunks.values()) {
    if (!ch.on || !ch.scen) continue;
    for (const it of ch.scen)
      if ((it.k === 'lamp' || it.k === 'crystal') && owInView(it.x, it.y, 260))
        light(it.x, it.y, it.k === 'lamp' ? 230 : 120, it.k === 'lamp' ? 0.8 : 0.55);
  }
}

/** Cloud shadows drifting over the world on sunny days (screen-wide, attached to the ground). */
function owDrawClouds(c) {
  if (SETTINGS.perf || REDUCED.on || owNight() > 0.6) return;
  const t = (OW.clock || 0) * 14,
    a = 0.11 * (1 - owNight());
  for (let i = 0; i < 18; i++) {
    const span = 7000,
      bx = ((((i * 2311 + t * (0.8 + (i % 3) * 0.2)) % span) + span) % span) - 500,
      by = ((i * 3571) % span) - 500,
      // tile the pattern over the world so there are always some nearby
      x = bx + Math.floor((cam.x - bx) / span + 0.5) * span,
      y = by + Math.floor((cam.y - by) / span + 0.5) * span,
      R = 380 + (i % 5) * 90;
    if (!owInView(x, y, R)) continue;
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(10,16,30,${a})`);
    g.addColorStop(0.6, `rgba(10,16,30,${a * 0.6})`);
    g.addColorStop(1, 'rgba(10,16,30,0)');
    c.fillStyle = g;
    c.save();
    c.translate(x, y);
    c.scale(1.5, 1);
    c.translate(-x, -y);
    c.fillRect(x - R, y - R, R * 2, R * 2);
    c.restore();
  }
}
