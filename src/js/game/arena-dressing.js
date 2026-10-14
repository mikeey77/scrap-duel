// Set dressing: props that belong to one arena (beach umbrellas, chess pieces, hockey goals…),
// the Grand Chessboard arena, and fixed landmarks per theme. Art is top-down, like all junk.
Object.assign(JUNK, {
  umbrella: { name: 'Beach umbrella', r: 17, m: 1.5, h: 30, hp: 35, bounce: 0.9, note: 'Flies surprisingly far.' },
  umbrellab: { name: 'Beach umbrella', r: 17, m: 1.5, h: 30, hp: 35, bounce: 0.9 },
  sandcastle: { name: 'Sandcastle', r: 15, m: 8, h: 18, hp: 22, note: 'Somebody worked hard on this.' },
  lifebuoy: { name: 'Lifebuoy', r: 10, m: 0.8, h: 6, hp: 40, bounce: 1.2 },
  surfboard: { name: 'Surfboard', r: 16, m: 2, h: 6, hp: 50, bounce: 0.7 },
  cooler: { name: 'Cooler box', r: 11, m: 4, h: 14, hp: 60 },
  palm: { name: 'Palm tree', r: 20, m: 60, h: 60, hp: 500, heavy: 1, note: 'Coconuts not included.' },
  puck: { name: 'Hockey puck', r: 8, m: 0.5, h: 4, hp: 999, bounce: 1.3, note: 'Slapshot it into a goal.' },
  goal: { name: 'Hockey goal', r: 26, m: 80, h: 20, hp: 900, heavy: 1 },
  carwreck: { name: 'Car wreck', r: 22, m: 20, h: 18, hp: 260, note: 'Previous owner: you, probably.' },
  log: { name: 'Rotten log', r: 20, m: 12, h: 14, hp: 150 },
  cauldron: { name: 'Bubbling cauldron', r: 13, m: 10, h: 18, hp: 120 },
  skull: { name: 'Cow skull', r: 10, m: 1, h: 8, hp: 30 },
  acunit: { name: 'Rooftop AC unit', r: 16, m: 20, h: 22, hp: 220 },
  mug: { name: 'Giant mug', r: 12, m: 3, h: 18, hp: 45 },
  penguin: { name: 'Penguin', r: 9, m: 2, h: 14, hp: 40, bounce: 1.1, note: 'Waddles. Unbothered.' }
});
JUNKNAMES.push('umbrella', 'sandcastle', 'lifebuoy', 'cooler', 'carwreck', 'log', 'mug', 'penguin');
// chess pieces: white for the left half, black for the mirrored right half
const CHESS = {
  pawn: [19, 6, 90],
  rook: [25, 30, 300],
  knight: [24, 16, 200],
  bishop: [23, 14, 180],
  queen: [27, 34, 360],
  king: [30, 80, 700]
};
for (const [k, [r, m, hp]] of Object.entries(CHESS)) {
  const nm = k[0].toUpperCase() + k.slice(1);
  JUNK[k] = { name: `White ${nm.toLowerCase()}`, r, m, h: r * 2, hp, heavy: k === 'king' ? 1 : 0 };
  JUNK['b' + k] = { name: `Black ${nm.toLowerCase()}`, r, m, h: r * 2, hp, heavy: k === 'king' ? 1 : 0 };
}

/* ---------- art ---------- */
const wedgeDisc = (c, r, cols) => {
  const n = 8;
  for (let i = 0; i < n; i++) {
    c.fillStyle = cols[i % cols.length];
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, r, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = 'rgba(0,0,0,.25)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(0, 0, r, 0, 7);
  c.stroke();
};
// the piece's side-view silhouette embossed on its round base, so it reads as a chess piece from above
const PIECE_PATH = {
  pawn: [
    [-0.32, 0.5],
    [0.32, 0.5],
    [0.22, 0.32],
    [0.12, -0.05],
    [0.2, -0.12],
    [0.12, -0.2],
    'o',
    [-0.12, -0.2],
    [-0.2, -0.12],
    [-0.12, -0.05],
    [-0.22, 0.32]
  ],
  rook: [
    [-0.36, 0.5],
    [0.36, 0.5],
    [0.3, 0.32],
    [0.22, -0.18],
    [0.32, -0.25],
    [0.32, -0.5],
    [0.18, -0.5],
    [0.18, -0.38],
    [0.06, -0.38],
    [0.06, -0.5],
    [-0.06, -0.5],
    [-0.06, -0.38],
    [-0.18, -0.38],
    [-0.18, -0.5],
    [-0.32, -0.5],
    [-0.32, -0.25],
    [-0.22, -0.18],
    [-0.3, 0.32]
  ],
  knight: [
    [-0.34, 0.5],
    [0.34, 0.5],
    [0.28, 0.3],
    [0.3, -0.05],
    [0.18, -0.4],
    [-0.02, -0.55],
    [-0.08, -0.45],
    [-0.3, -0.25],
    [-0.36, -0.08],
    [-0.24, -0.02],
    [-0.06, -0.14],
    [-0.2, 0.3],
    [-0.28, 0.32]
  ],
  bishop: [
    [-0.32, 0.5],
    [0.32, 0.5],
    [0.22, 0.32],
    [0.1, 0.05],
    [0.24, -0.15],
    [0.12, -0.36],
    [0, -0.44],
    [-0.12, -0.36],
    [-0.24, -0.15],
    [-0.1, 0.05],
    [-0.22, 0.32]
  ],
  queen: [
    [-0.34, 0.5],
    [0.34, 0.5],
    [0.26, 0.32],
    [0.14, 0],
    [0.36, -0.36],
    [0.18, -0.16],
    [0.1, -0.44],
    [0, -0.2],
    [-0.1, -0.44],
    [-0.18, -0.16],
    [-0.36, -0.36],
    [-0.14, 0],
    [-0.26, 0.32]
  ],
  king: [
    [-0.34, 0.5],
    [0.34, 0.5],
    [0.26, 0.32],
    [0.14, 0],
    [0.3, -0.24],
    [0.06, -0.28],
    [0.06, -0.38],
    [0.14, -0.38],
    [0.14, -0.46],
    [0.06, -0.46],
    [0.06, -0.56],
    [-0.06, -0.56],
    [-0.06, -0.46],
    [-0.14, -0.46],
    [-0.14, -0.38],
    [-0.06, -0.38],
    [-0.06, -0.28],
    [-0.3, -0.24],
    [-0.14, 0],
    [-0.26, 0.32]
  ]
};
function drawChessPiece(c, k, r, w) {
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.beginPath();
  c.arc(r * 0.12, r * 0.15, r, 0, 7);
  c.fill();
  circ(c, 0, 0, r, w ? '#efe7d6' : '#2b2522', w ? '#a89a80' : '#a8988a', 2.5);
  circ(c, 0, 0, r * 0.84, w ? '#f8f3e8' : '#3a322e');
  // the piece stands upright on the board: keep the silhouette upright whatever way the base is turned
  c.save();
  try {
    const m = c.getTransform();
    c.rotate(-Math.atan2(m.b, m.a));
  } catch (e) {}
  c.fillStyle = w ? '#b8a684' : '#120e0c';
  c.beginPath();
  for (const pt of PIECE_PATH[k]) {
    if (pt === 'o') continue;
    c.lineTo(pt[0] * r * 1.45, pt[1] * r * 1.45);
  }
  c.closePath();
  c.fill();
  if (k === 'pawn') circ(c, 0, -r * 0.42, r * 0.24, w ? '#b8a684' : '#120e0c');
  if (k === 'knight') circ(c, -r * 0.05, -r * 0.3, r * 0.06, w ? '#f8f3e8' : '#3a322e');
  c.restore();
}
for (const k of Object.keys(CHESS)) {
  JUNKDRAW[k] = (c, r) => drawChessPiece(c, k, r, true);
  JUNKDRAW['b' + k] = (c, r) => drawChessPiece(c, k, r, false);
}
Object.assign(JUNKDRAW, {
  umbrella: (c, r) => {
    wedgeDisc(c, r, ['#e2504a', '#fbf6ec']);
    circ(c, 0, 0, r * 0.12, '#6a4a2a');
  },
  umbrellab: (c, r) => {
    wedgeDisc(c, r, ['#4ea1ff', '#f2b705']);
    circ(c, 0, 0, r * 0.12, '#6a4a2a');
  },
  sandcastle: (c, r) => {
    c.fillStyle = '#d9b874';
    c.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    c.fillStyle = '#c4a160';
    c.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8);
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1]
    ])
      circ(c, x * r * 0.7, y * r * 0.7, r * 0.32, '#e3c588', '#b08e50', 1);
    line(c, [0, 0, 0, -r * 0.9], '#5a4a30', 1.5);
    c.fillStyle = '#e2504a';
    c.beginPath();
    c.moveTo(0, -r * 0.9);
    c.lineTo(r * 0.45, -r * 0.75);
    c.lineTo(0, -r * 0.6);
    c.fill();
  },
  lifebuoy: (c, r) => {
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = i % 2 ? '#fbf6ec' : '#e2504a';
      c.lineWidth = r * 0.45;
      c.beginPath();
      c.arc(0, 0, r * 0.72, (i / 4) * Math.PI * 2, ((i + 1) / 4) * Math.PI * 2);
      c.stroke();
    }
  },
  surfboard: (c, r) => {
    c.fillStyle = '#5be7ff';
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.32, 0, 0, 7);
    c.fill();
    c.fillStyle = '#ff8fc7';
    c.fillRect(-r * 0.75, -r * 0.06, r * 1.5, r * 0.12);
    c.strokeStyle = 'rgba(0,0,0,.25)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.32, 0, 0, 7);
    c.stroke();
  },
  cooler: (c, r) => {
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, 3);
    c.fillStyle = '#2f7fd6';
    c.fill();
    rr(c, -r * 0.85, -r * 0.55, r * 1.7, r * 1.1, 3);
    c.fillStyle = '#f4f8fb';
    c.fill();
    c.fillStyle = '#9fb6c9';
    c.fillRect(-r * 0.35, -r * 0.1, r * 0.7, r * 0.2);
  },
  palm: (c, r) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      c.save();
      c.rotate(a);
      c.fillStyle = i % 2 ? '#3f8a3a' : '#5aa84a';
      c.beginPath();
      c.ellipse(r * 0.55, 0, r * 0.6, r * 0.2, 0, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(20,50,20,.5)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(r * 1.1, 0);
      c.stroke();
      c.restore();
    }
    circ(c, 0, 0, r * 0.22, '#7a5230');
    circ(c, r * 0.18, r * 0.1, r * 0.1, '#5a3a1f');
    circ(c, -r * 0.12, r * 0.16, r * 0.1, '#5a3a1f');
  },
  puck: (c, r) => {
    circ(c, 0, 0, r, '#15171a', '#3a3f46', 1.5);
    circ(c, -r * 0.3, -r * 0.3, r * 0.2, 'rgba(255,255,255,.18)');
  },
  goal: (c, r) => {
    // opening faces +x
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 1;
    for (let i = -r; i <= r; i += 6) {
      c.beginPath();
      c.moveTo(-r * 0.6, i);
      c.lineTo(r * 0.5, i);
      c.stroke();
    }
    for (let i = -r * 0.6; i <= r * 0.5; i += 6) {
      c.beginPath();
      c.moveTo(i, -r);
      c.lineTo(i, r);
      c.stroke();
    }
    c.strokeStyle = '#e2504a';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(r * 0.5, -r);
    c.lineTo(-r * 0.6, -r);
    c.lineTo(-r * 0.6, r);
    c.lineTo(r * 0.5, r);
    c.stroke();
  },
  carwreck: (c, r) => {
    rr(c, -r, -r * 0.55, r * 2, r * 1.1, r * 0.25);
    c.fillStyle = '#8a4a2a';
    c.fill();
    c.fillStyle = 'rgba(60,30,15,.6)';
    c.beginPath();
    c.ellipse(-r * 0.3, r * 0.1, r * 0.4, r * 0.25, 0.4, 0, 7);
    c.fill();
    rr(c, -r * 0.45, -r * 0.42, r * 0.9, r * 0.84, 4);
    c.fillStyle = '#3a4a55';
    c.fill();
    line(c, [-r * 0.3, -r * 0.3, r * 0.1, r * 0.2], 'rgba(220,235,245,.7)', 1.5);
    line(c, [r * 0.1, -r * 0.35, -r * 0.05, 0], 'rgba(220,235,245,.7)', 1.5);
    circ(c, r * 0.7, -r * 0.35, r * 0.12, '#f2d27a');
    c.fillStyle = '#5a3a1f';
    c.fillRect(r * 0.62, r * 0.2, r * 0.3, r * 0.2);
  },
  log: (c, r) => {
    rr(c, -r, -r * 0.35, r * 2, r * 0.7, r * 0.3);
    c.fillStyle = '#6a4a2a';
    c.fill();
    line(c, [-r * 0.7, -r * 0.1, r * 0.6, -r * 0.12], '#4a321c', 2);
    line(c, [-r * 0.5, r * 0.12, r * 0.8, r * 0.1], '#4a321c', 2);
    circ(c, r * 0.95, 0, r * 0.3, '#b08850', '#6a4a2a', 2);
    circ(c, -r * 0.3, -r * 0.2, r * 0.12, '#5aa84a');
  },
  cauldron: (c, r) => {
    circ(c, 0, 0, r, '#1e1c22', '#4a4652', 2);
    circ(c, 0, 0, r * 0.75, '#57d68a');
    circ(c, -r * 0.25, -r * 0.2, r * 0.18, '#a6f5c4');
    circ(c, r * 0.2, r * 0.15, r * 0.12, '#a6f5c4');
  },
  skull: (c, r) => {
    c.fillStyle = '#efe7d6';
    c.beginPath();
    c.ellipse(0, 0, r * 0.55, r * 0.75, 0, 0, 7);
    c.fill();
    line(c, [-r * 0.4, -r * 0.6, -r, -r * 0.9], '#efe7d6', 3);
    line(c, [r * 0.4, -r * 0.6, r, -r * 0.9], '#efe7d6', 3);
    circ(c, -r * 0.22, -r * 0.15, r * 0.14, '#3a2a1a');
    circ(c, r * 0.22, -r * 0.15, r * 0.14, '#3a2a1a');
  },
  acunit: (c, r) => {
    c.fillStyle = '#b8c0c8';
    c.fillRect(-r, -r, r * 2, r * 2);
    circ(c, 0, 0, r * 0.75, '#5b6878');
    for (let i = 0; i < 3; i++) {
      c.save();
      c.rotate((i / 3) * Math.PI * 2 + performance.now() / 120);
      c.fillStyle = '#d8dde2';
      c.beginPath();
      c.ellipse(r * 0.35, 0, r * 0.35, r * 0.12, 0, 0, 7);
      c.fill();
      c.restore();
    }
    circ(c, 0, 0, r * 0.12, '#3a3f46');
  },
  mug: (c, r) => {
    circ(c, 0, 0, r, '#e2504a', '#9a2f2a', 2);
    circ(c, 0, 0, r * 0.75, '#5a3a1f');
    c.strokeStyle = '#e2504a';
    c.lineWidth = r * 0.25;
    c.beginPath();
    c.arc(r * 1.05, 0, r * 0.35, -1.6, 1.6);
    c.stroke();
  },
  penguin: (c, r) => {
    c.fillStyle = '#1f2328';
    c.beginPath();
    c.ellipse(0, 0, r * 0.8, r, 0, 0, 7);
    c.fill();
    c.fillStyle = '#f4f8fb';
    c.beginPath();
    c.ellipse(0, r * 0.15, r * 0.5, r * 0.7, 0, 0, 7);
    c.fill();
    c.fillStyle = '#f08a24';
    c.beginPath();
    c.moveTo(-r * 0.15, -r * 0.6);
    c.lineTo(r * 0.15, -r * 0.6);
    c.lineTo(0, -r * 1.05);
    c.fill();
  }
});

/* ---------- arenas ---------- */
const themeById = id => THEMES.find(t => t.id === id);
// the second ice rink becomes the Grand Chessboard; its corner bumpers move to the first rink
{
  const i = THEMES.findIndex(t => t.id === 'icerink');
  const chess = {
    id: 'chess',
    name: 'Grand Chessboard',
    ground: ['#cdb48a', '90,64,36', '240,226,196'],
    wall: 'chess',
    grip: 1,
    junk: ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'rook', 'knight', 'bishop', 'queen'],
    mirror: Object.fromEntries(Object.keys(CHESS).map(k => [k, 'b' + k])),
    fixed: [['king', 150, AH / 2 - 160, 0]],
    ramps: 0,
    oil: 0,
    spikes: 0,
    tramp: 2,
    pads: 1
  };
  if (i >= 0) THEMES[i] = chess;
  else THEMES.push(chess);
}
Object.assign(themeById('ice'), {
  junk: ['snowman', 'cone', 'puck', 'puck', 'puck', 'pin', 'trophy', 'penguin', 'chair'],
  fixed: [['goal', WM + 46, AH / 2, 0]],
  extra: { bumper: 2 }
});
Object.assign(themeById('beach'), {
  junk: [
    'umbrella',
    'umbrellab',
    'umbrella',
    'sandcastle',
    'sandcastle',
    'lifebuoy',
    'surfboard',
    'cooler',
    'beachball',
    'chair',
    'flamingo'
  ],
  fixed: [
    ['palm', 120, 300, 0],
    ['palm', 110, AH - 260, 0]
  ]
});
const addJunk = (id, ...ks) => themeById(id) && themeById(id).junk.push(...ks);
addJunk('junkyard', 'carwreck', 'carwreck');
addJunk('crusheryard', 'carwreck', 'carwreck', 'carwreck');
addJunk('carpark', 'carwreck');
addJunk('swamp', 'log', 'log', 'log');
addJunk('haunted', 'cauldron', 'cauldron');
addJunk('desert', 'skull', 'skull');
addJunk('stormroof', 'acunit', 'acunit');
addJunk('kitchen', 'mug', 'mug');
addJunk('frozenlot', 'penguin', 'penguin');
addJunk('glacier', 'penguin', 'penguin', 'penguin');

/** Ground art for the dressed-up arenas (called from makeGround). */
function dressGround(g, th) {
  if (th.id === 'chess') {
    const n = 8,
      sz = (AH - 2 * WM) / n,
      cols = Math.ceil((AW - 2 * WM) / sz),
      x0 = (AW - cols * sz) / 2;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < cols; i++) {
        g.fillStyle = (i + j) % 2 ? '#8a5a32' : '#e6d3ad';
        g.fillRect(x0 + i * sz, WM + j * sz, sz + 0.5, sz + 0.5);
      }
    // wood grain
    g.strokeStyle = 'rgba(60,35,15,.08)';
    g.lineWidth = 2;
    for (let y = WM; y < AH; y += 9) {
      g.beginPath();
      for (let x = 0; x <= AW; x += 40) g.lineTo(x, y + Math.sin(x / 130 + y) * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(40,24,10,.45)';
    g.font = '600 22px "Chakra Petch", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < cols; i++) g.fillText('abcdefghijkl'[i] || '', x0 + i * sz + sz / 2, AH - WM - 16);
    for (let j = 0; j < n; j++) g.fillText(String(n - j), WM + 16, WM + j * sz + sz / 2);
    return;
  }
  if (th.id === 'beach') {
    // beach towels, shells and footprints on the dry sand
    const towels = [
      ['#e2504a', '#fbf6ec'],
      ['#4ea1ff', '#fbf6ec'],
      ['#f2b705', '#5cc38f'],
      ['#ff8fc7', '#fbf6ec'],
      ['#c58bff', '#5be7ff']
    ];
    for (let i = 0; i < 16; i++) {
      const x = rnd(100, AW - 100),
        y = rnd(260, AH - 200),
        [a, b] = pick(towels);
      g.save();
      g.translate(x, y);
      g.rotate(rnd(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI / 2));
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(-36, -18, 76, 40);
      for (let s = 0; s < 6; s++) {
        g.fillStyle = s % 2 ? b : a;
        g.fillRect(-38 + s * 12.7, -20, 12.7, 40);
      }
      g.restore();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = pick(['rgba(255,240,220,.8)', 'rgba(240,190,170,.8)', 'rgba(220,200,240,.7)']);
      g.beginPath();
      g.ellipse(rnd(0, AW), rnd(200, AH - 160), 4, 3, rnd(0, 3), 0, 7);
      g.fill();
    }
    g.fillStyle = 'rgba(150,115,60,.18)';
    for (let t = 0; t < 4; t++) {
      let x = rnd(100, AW - 100),
        y = rnd(300, AH - 220),
        a = rnd(0, 6.28);
      for (let s = 0; s < 18; s++) {
        x += Math.cos(a) * 20;
        y += Math.sin(a) * 20;
        a += rnd(-0.25, 0.25);
        const o = s % 2 ? 6 : -6;
        g.beginPath();
        g.ellipse(x - Math.sin(a) * o, y + Math.cos(a) * o, 5, 3, a, 0, 7);
        g.fill();
      }
    }
  }
  if (th.id === 'ice') {
    // goal creases
    g.fillStyle = 'rgba(78,161,255,.28)';
    for (const [x, d] of [
      [WM + 46, 1],
      [AW - WM - 46, -1]
    ]) {
      g.beginPath();
      g.arc(x, AH / 2, 80, -Math.PI / 2, Math.PI / 2, d < 0);
      g.fill();
    }
  }
}
/** Some floors change within an arena (the beach has wet sand and a boardwalk). */
function surfaceAt(v) {
  const S = B.surf;
  if (!B.theme || B.kind === 'wait') return S;
  if (B.theme.id === 'beach') {
    if (v.y > AH - 150) return SURFACES.wood;
    if (v.y < 200) return SURFACES.wetsand;
  }
  return S;
}
