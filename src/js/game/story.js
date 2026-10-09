// Scrap Road: the story mode. Four regions of hand-made missions on a road map, each ending in a boss.
// A mission is a short single-player match with its own rival, arena layout, special rounds and salvage
// crates to find on the way. Bosses are hand-built giant cars with phases. Rewards: bolts, gear, stickers.

/* ---------- regions and missions ---------- */
const STORY_REGIONS = [
  {
    id: 'r1',
    name: 'The Scrapyard',
    col: '#ffb423',
    blurb: 'Where every car begins: a mountain of junk and a truck that eats cars.'
  },
  { id: 'r2', name: 'Rust Canyon', col: '#ff7a3a', blurb: 'Sand, lava and a drill that never stops spinning.' },
  {
    id: 'r3',
    name: 'Neon Docks',
    col: '#5be7ff',
    blurb: 'Container stacks, conveyor belts and a baron who collects cars with a magnet.'
  },
  {
    id: 'r4',
    name: "Junk King's Keep",
    col: '#c58bff',
    blurb: 'The castle at the end of the road. The Junk King does not do rematches.'
  }
];
// rival: a BOTS-like entry. kind: duel | salvage | special | boss. stars: 1 win, 2 no round lost, 3 the bonus goal.
const STORY = [
  {
    id: 'r1a',
    region: 'r1',
    name: 'Welcome to the Yard',
    kind: 'salvage',
    theme: 'junkyard',
    layout: 'lanes',
    rounds: 2,
    diff: 0,
    coins: 0,
    salvage: 3,
    rival: { name: 'Rusty Ramirez', style: 'rammer', likes: ['melee', 'flip'], paint: '#e2504a' },
    intro: 'Rusty runs the gate. Beat him, grab the loose parts, and the yard is yours to explore.',
    reward: { bolts: 40, sticker: 'rat' }
  },
  {
    id: 'r1b',
    region: 'r1',
    name: 'Salvage Rights',
    kind: 'salvage',
    theme: 'carpark',
    layout: 'maze',
    rounds: 2,
    diff: 0,
    coins: 40,
    salvage: 6,
    rival: { name: 'Magpie', style: 'gunner', likes: ['gun', 'econ'], paint: '#c58bff' },
    intro: 'Magpie wants every crate in this car park. Get there first: whatever she grabs is gone.',
    reward: { bolts: 50, sticker: 'lightning' }
  },
  {
    id: 'r1c',
    region: 'r1',
    name: 'Scrap Run Rumble',
    kind: 'special',
    theme: 'construction',
    sched: ['scrap', 'scrap'],
    rounds: 2,
    diff: 1,
    coins: 60,
    salvage: 2,
    rival: { name: 'Gunny McBolt', style: 'gunner', likes: ['gun', 'expl'], paint: '#4ea1ff' },
    intro: 'Deliver scrap to your depot faster than Gunny. Cargo slows you down, so deliver often.',
    reward: { bolts: 60, gear: 'saw' }
  },
  {
    id: 'r1d',
    region: 'r1',
    name: 'Ramp Rats',
    kind: 'duel',
    theme: 'backyard',
    layout: 'ramps',
    rounds: 3,
    diff: 1,
    coins: 80,
    salvage: 2,
    rival: { name: 'Granny Gearbox', style: 'rammer', likes: ['melee', 'def'], paint: '#ff8fc7' },
    intro: 'Granny Gearbox has been ramming cars since before wheels were round. Mind the ramps.',
    reward: { bolts: 60 }
  },
  {
    id: 'r1x',
    region: 'r1',
    name: 'Mother Crusher',
    kind: 'boss',
    boss: 'crusher',
    theme: 'junkyard',
    layout: 'pit',
    rounds: 3,
    diff: 1,
    coins: 220,
    salvage: 2,
    intro: 'A garbage truck with a grudge. Break the saws off the front and she is just a big box.',
    reward: { bolts: 120, gear: 'saw', gearLvl: 2, ach: 'road1' }
  },
  {
    id: 'r2a',
    region: 'r2',
    name: 'Sand Trap',
    kind: 'duel',
    theme: 'desert',
    layout: 'canyon',
    rounds: 3,
    diff: 1,
    coins: 120,
    salvage: 3,
    rival: { name: 'Scorch', style: 'brawler', likes: ['fire', 'melee'], paint: '#ff8a3a' },
    intro: 'The canyon road is narrow. Scorch likes it that way.',
    reward: { bolts: 70, sticker: 'paw' }
  },
  {
    id: 'r2b',
    region: 'r2',
    name: 'Hot Wheels',
    kind: 'special',
    theme: 'volcano',
    layout: 'bridge',
    sched: ['sumo', null, 'sumo'],
    rounds: 3,
    diff: 1,
    coins: 140,
    salvage: 2,
    rival: { name: 'Big Boom Betty', style: 'artillery', likes: ['expl', 'gun'], paint: '#f2b705' },
    intro: 'A bridge over lava and a sumo ring. Push, do not get pushed.',
    reward: { bolts: 80, gear: 'flamer' }
  },
  {
    id: 'r2c',
    region: 'r2',
    name: 'Beach Party',
    kind: 'salvage',
    theme: 'beach',
    sched: [null, 'duck'],
    rounds: 2,
    diff: 1,
    coins: 160,
    salvage: 5,
    rival: { name: 'DJ Dynamo', style: 'artillery', likes: ['energy', 'expl'], paint: '#5cc38f' },
    intro: 'Crates washed up on the beach, and a golden duck to steal. DJ Dynamo brought speakers.',
    reward: { bolts: 80, sticker: 'heart' }
  },
  {
    id: 'r2d',
    region: 'r2',
    name: 'Night Drive',
    kind: 'special',
    theme: 'desert',
    layout: 'canyon',
    sched: ['night', 'night', 'night'],
    rounds: 3,
    diff: 2,
    coins: 180,
    salvage: 2,
    rival: { name: 'Professor Volt', style: 'gunner', likes: ['energy', 'gun'], paint: '#5be7ff' },
    intro: 'Headlights on. The Professor hunts in the dark.',
    reward: { bolts: 90 }
  },
  {
    id: 'r2x',
    region: 'r2',
    name: 'Twin Drill',
    kind: 'boss',
    boss: 'drill',
    theme: 'desert',
    layout: 'pit',
    rounds: 3,
    diff: 2,
    coins: 300,
    salvage: 2,
    intro: 'Two drills, two boosters and no brakes. Dodge the charge, hit it from the side.',
    reward: { bolts: 160, gear: 'drill', gearLvl: 2, ach: 'road2' }
  },
  {
    id: 'r3a',
    region: 'r3',
    name: 'Conveyor Chaos',
    kind: 'duel',
    theme: 'factory',
    layout: 'docks',
    rounds: 3,
    diff: 2,
    coins: 200,
    salvage: 3,
    rival: { name: 'Magpie', style: 'gunner', likes: ['gun', 'econ'], paint: '#c58bff' },
    intro: 'Magpie is back, and she brought friends: about forty shipping containers.',
    reward: { bolts: 90 }
  },
  {
    id: 'r3b',
    region: 'r3',
    name: 'Zero G',
    kind: 'special',
    theme: 'space',
    sched: ['lowgrav', 'lowgrav', 'lowgrav'],
    rounds: 3,
    diff: 2,
    coins: 220,
    salvage: 3,
    rival: { name: 'Professor Volt', style: 'gunner', likes: ['energy', 'air'], paint: '#5be7ff' },
    intro: 'Low gravity, big jumps. Everything floats, including your dignity.',
    reward: { bolts: 100, sticker: 'chip' }
  },
  {
    id: 'r3c',
    region: 'r3',
    name: 'Wash & Wax',
    kind: 'salvage',
    theme: 'carwash',
    layout: 'maze',
    rounds: 2,
    diff: 2,
    coins: 240,
    salvage: 6,
    rival: { name: 'Gunny McBolt', style: 'gunner', likes: ['gun', 'slip'], paint: '#4ea1ff' },
    intro: 'Soap floors and hidden crates. Slide in, grab, slide out.',
    reward: { bolts: 100, gear: 'laser' }
  },
  {
    id: 'r3d',
    region: 'r3',
    name: 'Lights Out',
    kind: 'special',
    theme: 'haunted',
    sched: ['night', 'mayhem', 'night'],
    rounds: 3,
    diff: 2,
    coins: 260,
    salvage: 2,
    rival: { name: 'Scorch', style: 'brawler', likes: ['fire', 'melee'], paint: '#ff8a3a' },
    intro: 'The docks lose power at midnight. Scorch does not need light, he brings his own.',
    reward: { bolts: 110, sticker: 'eye' }
  },
  {
    id: 'r3x',
    region: 'r3',
    name: 'The Magnet Baron',
    kind: 'boss',
    boss: 'baron',
    theme: 'factory',
    layout: 'ring',
    rounds: 3,
    diff: 2,
    coins: 380,
    salvage: 2,
    intro: 'He pulls cars in and zaps them. Kill the tesla coils first or keep your distance.',
    reward: { bolts: 200, gear: 'tesla', gearLvl: 2, ach: 'road3' }
  },
  {
    id: 'r4a',
    region: 'r4',
    name: 'The Gate',
    kind: 'duel',
    theme: 'haunted',
    layout: 'castle',
    rounds: 3,
    diff: 2,
    coins: 320,
    salvage: 3,
    rival: { name: 'Mega Mauler', style: 'rammer', likes: ['melee', 'pinball', 'flip'], paint: '#e2504a' },
    intro: 'The Junk King keeps a Mauler at his gate. It has never let anyone through.',
    reward: { bolts: 120 }
  },
  {
    id: 'r4b',
    region: 'r4',
    name: 'Piano Heist',
    kind: 'special',
    theme: 'kitchen',
    sched: ['piano', 'piano', 'piano'],
    rounds: 3,
    diff: 2,
    coins: 340,
    salvage: 3,
    rival: { name: 'Grandma Tank', style: 'gunner', likes: ['gun', 'def'], paint: '#c58bff' },
    intro: "The King's grand piano is going to your depot. Grandma Tank disagrees.",
    reward: { bolts: 130 }
  },
  {
    id: 'r4c',
    region: 'r4',
    name: 'King of the Hill',
    kind: 'special',
    theme: 'volcano',
    layout: 'castle',
    sched: ['hill', 'hill', 'hill'],
    rounds: 3,
    diff: 2,
    coins: 360,
    salvage: 2,
    rival: { name: 'Big Boom Betty', style: 'artillery', likes: ['expl', 'gun'], paint: '#f2b705' },
    intro: 'Hold the courtyard. Betty will shell it from the walls.',
    reward: { bolts: 140 }
  },
  {
    id: 'r4x',
    region: 'r4',
    name: 'The Junk King',
    kind: 'boss',
    boss: 'king',
    theme: 'volcano',
    layout: 'castle',
    rounds: 3,
    diff: 2,
    coins: 480,
    salvage: 3,
    intro: 'Spinning arms, a throne full of guns and three phases of bad temper. This is the end of the road.',
    reward: { bolts: 400, gear: 'grinder', gearLvl: 3, ach: 'kingslayer' }
  }
];
const STORY_BY = Object.fromEntries(STORY.map(m => [m.id, m]));

/* ---------- bosses: hand-built cars ---------- */
// Base legend: C cockpit, F frame, G girder, A armour, H heavy plate, W wheel, M monster wheel, S saw, D drill,
// J jaws, P spike, R bumper, B booster, k tyre wall, r rotator, X grinder. Top legend: m mg, c cannon,
// x minigun, o mortar, t tesla, g magnet, s shield, p point defence, f flamer, l laser, z railgun, w swarm, e emp.
const BOSS_LEGEND_B = {
  C: 'cockpit',
  F: 'frame',
  G: 'girder',
  A: 'armor',
  H: 'heavyplate',
  W: 'wheel',
  M: 'monster',
  S: 'saw',
  D: 'drill',
  J: 'jaws',
  P: 'spike',
  R: 'bumper',
  B: 'booster',
  k: 'tirewall',
  r: 'rotator',
  X: 'grinder'
};
const BOSS_LEGEND_T = {
  m: 'mg',
  c: 'cannon',
  x: 'minigun',
  o: 'mortar',
  t: 'tesla',
  g: 'magnet',
  s: 'shield',
  p: 'pd',
  f: 'flamer',
  l: 'laser',
  z: 'railgun',
  w: 'swarm',
  e: 'emp'
};
const STORY_BOSSES = {
  crusher: {
    name: 'Mother Crusher',
    style: 'rammer',
    paint: '#5cc38f',
    hp: 1.35,
    dmg: 0.9,
    taunt: 'Bin day!',
    base: ['..SSS..', 'RGFCFGR', 'WFFFFFW', 'WGAAAGW'],
    top: ['.......', '.m...m.', '.......', '.......']
  },
  drill: {
    name: 'Twin Drill',
    style: 'rammer',
    paint: '#ff8a3a',
    hp: 1.15,
    dmg: 0.85,
    taunt: 'Brrrrrrrrr.',
    base: ['.D.D.', 'DGFGD', 'WFCFW', 'WGFGW', 'AFFFA', 'WBBBW'],
    top: ['.....', '.f.f.', '.....', '.x.x.', '.....', '.....']
  },
  baron: {
    name: 'The Magnet Baron',
    style: 'gunner',
    paint: '#4ea1ff',
    hp: 1.25,
    dmg: 0.9,
    taunt: 'Come closer. I insist.',
    base: ['.RRRRR.', 'WGFGFGW', 'AFFCFFA', 'WGFFFGW', 'AHFFFHA', 'W.WWW.W'],
    top: ['.......', '.t.g.t.', '..p.p..', '.l...l.', '.s...e.', '.......']
  },
  king: {
    name: 'The Junk King',
    style: 'brawler',
    paint: '#f2b705',
    hp: 1.2,
    dmg: 0.85,
    taunt: 'Kneel before the scrap.',
    base: ['...RXR...', 'S.RGGGR.S', 'GrAFFFArG', '..WFCFW..', '..WGFGW..', '..AFFFA..', '..WMMMW..'],
    top: ['.........', '.........', '..c...c..', '...z.x...', '..m.s.m..', '...w.p...', '.........']
  }
};
/** Turns a boss sketch into a design. Melee and joints face away from the cockpit. */
function bossDesign(id) {
  const B_ = STORY_BOSSES[id],
    base = new Map(),
    top = new Map(),
    h = B_.base.length,
    w = B_.base[0].length;
  let cx = 0,
    cy = 0;
  B_.base.forEach((row, y) => [...row].forEach((ch, x) => ch === 'C' && ((cx = x), (cy = y))));
  const outward = (x, y) => {
    // the direction (0 front, 1 right, 2 back, 3 left) whose neighbour is empty, preferring away from the cockpit
    const dirs = [0, 1, 2, 3].filter(d => {
      const nx = x + FX[d],
        ny = y + FY[d];
      return !(B_.base[ny] && B_.base[ny][nx] && B_.base[ny][nx] !== '.');
    });
    const away = d => FX[d] * (x - cx) + FY[d] * (y - cy);
    return dirs.sort((a, b) => away(b) - away(a))[0] ?? 0;
  };
  const jointRot = (x, y) => {
    // joints point at the neighbour that is further from the cockpit
    let best = 0,
      bd = -1;
    for (let d = 0; d < 4; d++) {
      const nx = x + FX[d],
        ny = y + FY[d];
      if (!(B_.base[ny] && B_.base[ny][nx] && B_.base[ny][nx] !== '.')) continue;
      const dd = Math.abs(nx - cx) + Math.abs(ny - cy);
      if (dd > bd) ((bd = dd), (best = d));
    }
    return best;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = B_.base[y][x],
        id2 = BOSS_LEGEND_B[ch];
      if (!id2) continue;
      const m = MOD[id2],
        gx = x - cx,
        gy = y - cy,
        rot = isJoint(id2) ? jointRot(x, y) : m.dir ? outward(x, y) : 0;
      base.set(key(gx, gy), { id: id2, rot, x: gx, y: gy });
      const t = B_.top[y] && BOSS_LEGEND_T[B_.top[y][x]];
      if (t) top.set(key(gx, gy), { id: t, rot: 0, x: gx, y: gy });
    }
  return { base, top };
}

/* ---------- arena layouts ---------- */
const wallH = (x, y, w) => ({ x, y, w, h: 36 }),
  wallV = (x, y, h) => ({ x, y, w: 36, h });
const STORY_LAYOUTS = {
  lanes: () => ({
    st: [wallH(420, 380, 480), wallH(1100, 380, 480), wallH(420, 834, 480), wallH(1100, 834, 480)],
    zn: [
      { kind: 'ramp', x: 945, y: 200, w: 110, h: 70, ang: 0 },
      { kind: 'ramp', x: 945, y: 980, w: 110, h: 70, ang: Math.PI },
      { kind: 'oil', x: AW / 2, y: AH / 2, r: 70 }
    ],
    junk: 10
  }),
  maze: () => {
    const st = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        const x = 520 + i * 280,
          y = 230 + j * 330;
        st.push((i + j) % 2 ? wallV(x, y, 200) : wallH(x - 80, y + 80, 200));
      }
    return { st, zn: [{ kind: 'pad', x: AW / 2 - 45, y: AH / 2 - 30, w: 90, h: 60, ang: 0 }], junk: 6 };
  },
  ramps: () => ({
    st: [wallV(700, 300, 260), wallV(1264, 690, 260)],
    zn: [
      { kind: 'ramp', x: 520, y: 760, w: 110, h: 70, ang: 0 },
      { kind: 'ramp', x: 1370, y: 420, w: 110, h: 70, ang: Math.PI },
      { kind: 'ramp', x: 945, y: 300, w: 110, h: 70, ang: 0 },
      { kind: 'ramp', x: 945, y: 880, w: 110, h: 70, ang: Math.PI },
      { kind: 'tramp', x: AW / 2 - 40, y: AH / 2 - 40, w: 80, h: 80 }
    ],
    junk: 8
  }),
  pit: () => {
    // a ring of short walls around an open pit: room to circle a big boss
    const st = [],
      R = 430;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8,
        x = AW / 2 + Math.cos(a) * R,
        y = AH / 2 + Math.sin(a) * R * 0.92;
      st.push(Math.abs(Math.cos(a)) > 0.7 ? wallV(x - 18, y - 70, 140) : wallH(x - 70, y - 18, 140));
    }
    return { st, zn: [{ kind: 'oil', x: AW / 2, y: AH / 2, r: 60 }], junk: 6 };
  },
  canyon: () => ({
    st: [
      wallH(WM, 300, 620),
      wallH(AW - WM - 620, 300, 620),
      wallH(WM, 914, 620),
      wallH(AW - WM - 620, 914, 620),
      wallV(820, 300, 240),
      wallV(1144, 710, 240)
    ],
    zn: [
      { kind: 'ramp', x: 945, y: 560, w: 110, h: 70, ang: 0 },
      { kind: 'oil', x: 560, y: AH / 2, r: 55 },
      { kind: 'oil', x: AW - 560, y: AH / 2, r: 55 }
    ],
    junk: 8
  }),
  bridge: () => ({
    st: [wallH(600, 420, 300), wallH(1100, 420, 300), wallH(600, 794, 300), wallH(1100, 794, 300)],
    zn: [gimmickZone('lava', AW / 2, 180), gimmickZone('lava', AW / 2, AH - 180)],
    junk: 6
  }),
  docks: () => {
    const st = [];
    for (const [x, y] of [
      [520, 220],
      [520, 900],
      [1360, 220],
      [1360, 900],
      [880, 500],
      [1000, 680]
    ])
      st.push({ x, y, w: 120, h: 54 });
    return {
      st,
      zn: [gimmickZone('belt', AW / 2, 300), gimmickZone('belt', AW / 2, AH - 300)],
      junk: 8
    };
  },
  ring: () => ({
    st: [wallV(560, 380, 480), wallV(AW - 596, 380, 480)],
    zn: [
      { kind: 'spikes', x: AW / 2 - 75, y: 200, w: 150, h: 22 },
      { kind: 'spikes', x: AW / 2 - 75, y: AH - 222, w: 150, h: 22 },
      { kind: 'pad', x: 320, y: 200, w: 90, h: 60, ang: 0 },
      { kind: 'pad', x: AW - 410, y: AH - 260, w: 90, h: 60, ang: Math.PI }
    ],
    junk: 6
  }),
  castle: () => ({
    // outer walls with gates, a courtyard in the middle
    st: [
      wallH(560, 260, 330),
      wallH(1110, 260, 330),
      wallH(560, 954, 330),
      wallH(1110, 954, 330),
      wallV(560, 260, 240),
      wallV(560, 750, 240),
      wallV(AW - 596, 260, 240),
      wallV(AW - 596, 750, 240)
    ],
    zn: [{ kind: 'tramp', x: AW / 2 - 40, y: AH / 2 - 40, w: 80, h: 80 }],
    junk: 8
  })
};
/** Builds a mission arena: the hand-made layout (or the normal generator) plus salvage crates. */
function storyField(th) {
  const M = storyMission();
  let f;
  if (M.layout && STORY_LAYOUTS[M.layout]) {
    const L = STORY_LAYOUTS[M.layout]();
    f = {
      st: L.st,
      zn: L.zn,
      ob: [],
      pk: [
        { kind: 'repair', x: AW / 2, y: AH / 2 + 120, val: 0.25, cd: 0 },
        { kind: 'power', x: AW / 2, y: AH * 0.3, p: pick(POWER_IDS), cd: 8 },
        { kind: 'power', x: AW / 2, y: AH * 0.7, p: pick(POWER_IDS), cd: 8 },
        { kind: 'coins', x: AW / 2 - 300, y: AH / 2, val: 30, cd: 0 },
        { kind: 'coins', x: AW / 2 + 300, y: AH / 2, val: 30, cd: 0 }
      ],
      sp: [
        [260, AH / 2, Math.PI / 2],
        [AW - 260, AH / 2, -Math.PI / 2]
      ]
    };
    for (let i = 0, t = 0; i < L.junk && t < 400; t++) {
      const k = pick(th.junk),
        r = (JUNK[k] || PROPS[k]).r,
        x = rnd(WM + 60, AW - WM - 60),
        y = rnd(WM + 60, AH - WM - 60);
      if (storyFree(f, x, y, r + 20)) {
        f.ob.push(mkObj(k, x, y));
        i++;
      }
    }
  } else f = genArena('battle', th);
  for (const s of G.story.salvageLeft) {
    let x = s.x,
      y = s.y;
    if (x == null || !storyFree(f, x, y, 40))
      for (let t = 0; t < 300; t++) {
        x = rnd(WM + 80, AW - WM - 80);
        y = rnd(WM + 80, AH - WM - 80);
        if (storyFree(f, x, y, 40) && Math.abs(x - AW / 2) < AW * 0.42) break;
      }
    s.x = x;
    s.y = y;
    f.pk.push({ kind: 'salvage', sid: s.sid, id: s.id, gear: s.gear, x, y, cd: 0 });
  }
  return f;
}
function storyFree(f, x, y, r) {
  return (
    f.st.every(s => circRectDist(x, y, s) > r) &&
    f.sp.every(p => Math.hypot(p[0] - x, p[1] - y) > r + 160) &&
    f.ob.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r) &&
    f.zn.every(z => !inZone(x, y, z.r !== undefined ? { x: z.x, y: z.y, r: z.r + r } : z))
  );
}

/* ---------- progress ---------- */
let STORYP = { stars: {}, seen: {}, pos: null, fog: null, caches: [] };
function loadStory() {
  try {
    const s = JSON.parse(load('sd.story') || 'null');
    if (s && s.stars)
      STORYP = {
        stars: s.stars,
        seen: s.seen || {},
        pos: Array.isArray(s.pos) ? s.pos : null,
        fog: typeof s.fog === 'string' ? s.fog : null,
        caches: Array.isArray(s.caches) ? s.caches.filter(id => OW_CACHES.some(c => c.id === id)) : []
      };
  } catch (e) {}
}
const saveStory = () => store('sd.story', STORYP);
const storyStars = id => STORYP.stars[id] || 0;
const totalStars = () => STORY.reduce((a, m) => a + storyStars(m.id), 0);
/** A mission is open when the one before it (in story order) is beaten. */
function storyOpen(id) {
  const i = STORY.findIndex(m => m.id === id);
  return i === 0 || storyStars(STORY[i - 1].id) > 0;
}
const nextMission = () => STORY.find(m => !storyStars(m.id) && storyOpen(m.id)) || null;
const storyBadge = () => `${totalStars()}★`;
const storyMission = () => (G.story ? STORY_BY[G.story.mid] : null);
const stickerUnlocked = st =>
  !st.unlock ||
  (st.unlock.lvl && levelInfo().lvl >= st.unlock.lvl) ||
  (st.unlock.ach && PROG.ach.includes(st.unlock.ach)) ||
  (st.unlock.story && storyStars(st.unlock.story) > 0);

/* ---------- running a mission ---------- */
function startStory(id) {
  const M = STORY_BY[id];
  if (!M || !storyOpen(id)) return;
  const prevDiff = G.diff;
  const salv = [];
  for (let i = 0; i < (M.salvage || 0); i++) {
    const gear = i === 0;
    const pool = MODS.filter(
      m => m.id !== 'cockpit' && m.rar <= Math.min(4, 1 + STORY_REGIONS.findIndex(r => r.id === M.region))
    );
    salv.push({ sid: i + 1, id: pick(pool).id, gear, x: null, y: null });
  }
  G.storyNext = {
    mid: id,
    prevDiff,
    rounds: M.rounds,
    sched: Array.from({ length: M.rounds }, (_, i) => (M.sched && M.sched[i]) || null),
    salvageLeft: salv,
    got: 0,
    stolen: 0,
    gearGot: [],
    boss: M.boss ? STORY_BOSSES[M.boss] : null
  };
  G.diff = M.diff;
  G.started = true;
  startMatch('solo', G.storyNext.sched, 'balanced');
}
/** Called by startMatch once the profile is fresh. */
function storySetup() {
  const S = G.story,
    M = storyMission();
  if (M.coins) G.coins += M.coins;
  const bot = makeBot(M.diff);
  const r = M.rival || STORY_BOSSES[M.boss];
  Object.assign(bot, { name: r.name, style: r.style, likes: r.likes || ['melee'], paint: r.paint });
  if (r.taunt) bot.say = [r.taunt];
  // the mission's starting coins are the player's head start; the rival only gets its own bot budget
  G.bot = bot;
  G.oppName = bot.name;
  G.oppPaint = bot.paint === G.paint ? PAINTS.find(p => p !== G.paint) : bot.paint;
  G.oppLook = randomLook(M.diff);
  G.oppBadge = G.oppLook.badge;
  if (S.boss) G.oppLook = { ...G.oppLook, title: 'legend' };
}
function storyThemeIndex() {
  const M = storyMission(),
    i = THEMES.findIndex(t => t.id === M.theme);
  return i >= 0 ? i : 0;
}
/** The boss replaces the bot's own car with its hand-built one. */
function storyBotExtras() {
  const S = G.story;
  if (!S || !S.boss) return {};
  return {
    design: packDesign(bossDesign(storyMission().boss)),
    tune: [],
    boss: { hp: S.boss.hp, dmg: S.boss.dmg, story: 1 }
  };
}
/** Salvage pickup: you get it, or the rival steals it for good. */
function storyGrab(v, p) {
  const S = G.story;
  if (!S) return;
  S.salvageLeft = S.salvageLeft.filter(s => s.sid !== p.sid);
  if (v.idx !== B.me) {
    S.stolen++;
    txt(p.x, p.y - 26, 'STOLEN!', '#ff5c7a', 1.4);
    sfx('squeak', p.x, p.y);
    commentate('stolen', { car: v });
    return;
  }
  if (p.gear) {
    const g = addGear(p.id, 1, true, storyMission().name);
    if (g) S.gearGot.push(g);
    txt(p.x, p.y - 26, 'GEAR: ' + MOD[p.id].name.toUpperCase(), '#ffd257', 1.8);
    sfx('jackpot', p.x, p.y);
  } else {
    gainWithSupport(p.id, 1);
    S.got++;
    txt(p.x, p.y - 26, '+1 ' + MOD[p.id].name.toUpperCase(), '#5be7ff', 1.4);
    sfx('reveal', p.x, p.y);
  }
  commentate('salvage', { car: v });
}
/** Boss phases: at 2/3 and 1/3 health the boss gets angrier. */
function storyTick() {
  if (!G.story || !G.story.boss || !B || B.seq !== 'play') return;
  const v = B.cars.find(c => c.boss);
  if (!v || v.dead) return;
  const hp = carHealth(v);
  v.phase = v.phase || 1;
  const want = hp < 0.34 ? 3 : hp < 0.67 ? 2 : 1;
  if (want > v.phase) {
    v.phase = want;
    v.rateMul = (v.rateMul || 1) * 1.25;
    v.c.topCap *= 1.08;
    v.c.accel *= 1.12;
    B.banner = {
      text: want === 3 ? 'FINAL PHASE' : 'PHASE 2',
      col: '#ff5c7a',
      t: 2.2,
      sub: v.name + ' is getting angry'
    };
    sfx('alarm');
    B.shake = Math.max(B.shake || 0, 8);
    commentate('phase', { car: v, n: want });
  }
}
const carHealth = v => {
  let a = 0;
  for (const I of v.insts) if (I.alive) a += Math.max(0, I.hp);
  return v.total ? a / v.total : 0;
};
/** Called from showFinal: stars, first-time rewards and unlocks. */
function storyFinish(won, tot) {
  const S = G.story,
    M = storyMission();
  G.diff = S.prevDiff;
  const before = storyStars(M.id),
    lostRound = G.log.some(r => !r.win),
    bonus = M.salvage && M.kind === 'salvage' ? S.got + S.gearGot.length >= M.salvage : tot.d >= tot.t * 2;
  const stars = won ? 1 + (lostRound ? 0 : 1) + (bonus ? 1 : 0) : 0;
  const res = { won, stars, before, first: won && !before, bolts: 0, drops: [...S.gearGot], unlocks: [] };
  if (stars > before) STORYP.stars[M.id] = stars;
  if (won) {
    const R = M.reward || {};
    res.bolts = res.first ? R.bolts || 0 : Math.round((R.bolts || 0) * 0.25);
    res.bolts += (stars - before > 0 ? stars - before : 0) * 15;
    if (res.first && R.gear) {
      const g = addGear(R.gear, R.gearLvl || 1, true, M.name);
      if (g) res.drops.push(g);
    }
    if (res.first && R.sticker) res.unlocks.push(['sticker', STICKER[R.sticker].name]);
    if (res.first && R.ach) {
      const p = grant(0, [R.ach]);
      for (const a of p.newAch) res.unlocks.push(['achievement', ACHIEVEMENTS[a].name]);
      for (const it of p.unlocked)
        res.unlocks.push([STYLE_SLOTS.find(x => x[0] === it.slot)[1].toLowerCase(), it.name]);
    }
  } else res.bolts = 15;
  addBolts(res.bolts);
  saveStory();
  return res;
}
function storyResultHtml(r) {
  if (!r) return '';
  const M = storyMission();
  return `<div class="storyres"><div class="stars big" aria-label="${r.stars} of 3 stars">${[1, 2, 3].map(i => `<i class="${i <= r.stars ? 'on' : ''}"></i>`).join('')}</div>
    <p class="small">${r.won ? (r.first ? 'Mission complete! The road continues.' : 'Mission replayed.') : 'Mission failed. The road is still here.'} ${M.kind === 'salvage' ? `Salvage: ${G.story.got + G.story.gearGot.length}/${M.salvage}${G.story.stolen ? ` · ${G.story.stolen} stolen` : ''}` : ''}</p>
    ${spoilsHtml({ bolts: r.bolts, drops: r.drops })}
    ${r.unlocks.map(([k, n]) => `<div class="unl">Unlocked ${esc(k)}: <b>${esc(n)}</b></div>`).join('')}</div>`;
}

/* ---------- the road map ---------- */
let storySel = null;
function storyPanelHtml() {
  const n = nextMission(),
    done = STORY.filter(m => storyStars(m.id)).length;
  return `<p>Four regions, ${STORY.length} missions and four bosses. Find gear and stickers on the way to the Junk King.</p>
    <div class="mstat"><b>${done}/${STORY.length}</b><span>missions</span></div><div class="mstat"><b>${totalStars()}/${STORY.length * 3}</b><span>stars</span></div>
    ${n ? `<p class="small">Next: <b>${esc(n.name)}</b> · ${esc(STORY_REGIONS.find(r => r.id === n.region).name)}</p>` : '<p class="small">The Junk King is beaten. Go for three stars everywhere.</p>'}
    <button class="btn mgo" id="mStory">Open the Scrap Road</button>`;
}
function openStory() {
  hideOverlays();
  if (G.story) {
    G.diff = G.story.prevDiff ?? G.diff;
    G.story = null;
  }
  if (G.phase !== 'menu') {
    G.phase = 'menu';
    updateHUD();
  }
  demoStop(); // the map has its own world; no battle behind it
  if (!storySel || !STORY_BY[storySel]) storySel = (nextMission() || STORY[STORY.length - 1]).id;
  $('#ovStory').hidden = false;
  owOpen();
}
/** The mission card shown when you park at a mission site. */
function storyCardHtml(M) {
  const R = STORY_REGIONS.find(r => r.id === M.region),
    open = storyOpen(M.id),
    st = storyStars(M.id),
    rw = M.reward || {};
  const rewards = [
    rw.bolts ? `${rw.bolts} bolts` : '',
    rw.gear ? `Gear: ${MOD[rw.gear].name}${rw.gearLvl > 1 ? ' +' + (rw.gearLvl - 1) : ''}` : '',
    rw.sticker ? `Sticker: ${STICKER[rw.sticker].name}` : '',
    rw.ach ? `Achievement: ${ACHIEVEMENTS[rw.ach].name}` : ''
  ].filter(Boolean);
  const kindText = {
    duel: 'Duel',
    salvage: 'Salvage hunt',
    special: M.sched ? [...new Set(M.sched.filter(Boolean))].map(x => SPECIALS[x].name).join(' + ') : 'Special',
    boss: 'Boss fight'
  }[M.kind];
  const goal3 = M.kind === 'salvage' ? `Find all ${M.salvage} salvage crates` : 'Deal twice the damage you take';
  const boss = M.boss ? STORY_BOSSES[M.boss] : null;
  return `<span class="label" style="color:${R.col}">${esc(R.name)} · ${esc(kindText)}</span>
    <h3>${esc(M.name)}</h3>
    ${boss ? `<p class="bossline">Boss: <b>${esc(boss.name)}</b> · best of ${M.rounds}, angrier at ⅔ and ⅓ health</p>` : M.rival ? `<p class="small">Rival: <b>${esc(M.rival.name)}</b> · ${esc(DIFF[M.diff].name)}</p>` : ''}
    <p>${esc(M.intro)}</p>
    <div class="sr-facts"><span>${M.rounds} round${M.rounds > 1 ? 's' : ''}</span><span>${esc(THEMES[THEMES.findIndex(t => t.id === M.theme)].name)}</span>${M.salvage ? `<span>${M.salvage} salvage crates</span>` : ''}${M.coins ? `<span>+${M.coins} starting coins</span>` : ''}</div>
    <div class="sr-goals"><span class="label">Stars</span>
      <div class="${st >= 1 ? 'on' : ''}">★ Win the mission</div>
      <div class="${st >= 2 ? 'on' : ''}">★ Do not lose a round</div>
      <div class="${st >= 3 ? 'on' : ''}">★ ${esc(goal3)}</div></div>
    <div class="sr-rew"><span class="label">${st ? 'First-clear rewards (claimed)' : 'Rewards'}</span>${rewards.map(r => `<span>${esc(r)}</span>`).join('')}</div>
    <button class="btn mgo" id="srGo" ${open ? '' : 'disabled'}>${open ? (st ? 'Replay mission' : 'Start mission') : 'Beat the previous mission first'}</button>`;
}
/** Boss health bar across the top of the arena. */
function drawBossBar(c) {
  if (!G.story || !G.story.boss || !B) return;
  const v = B.cars.find(x => x.boss);
  if (!v) return;
  const w = Math.min(560, view.w * 0.5),
    x = view.w / 2 - w / 2,
    y = 92,
    hp = v.dead ? 0 : carHealth(v);
  c.save();
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(10,16,32,.86)';
  c.fillRect(x - 10, y - 22, w + 20, 40);
  c.font = '700 13px "Chakra Petch", sans-serif';
  c.fillStyle = '#ff5c7a';
  c.textAlign = 'left';
  c.fillText(`BOSS · PHASE ${v.phase || 1}/3`, x, y - 6);
  c.fillStyle = '#e6f1ff';
  c.textAlign = 'right';
  c.fillText(v.name, x + w, y - 6);
  for (let i = 0; i < 3; i++) {
    const sx = x + (i * w) / 3 + (i ? 3 : 0),
      sw = w / 3 - 3,
      seg = clamp((hp - (2 - i) / 3) * 3, 0, 1);
    c.fillStyle = '#2b1b22';
    c.fillRect(sx, y, sw, 9);
    c.fillStyle = '#ff5c7a';
    c.fillRect(sx, y, sw * seg, 9);
  }
  c.restore();
}
