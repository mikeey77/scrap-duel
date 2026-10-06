// Bay expansion shapes, arena junk and props, codex roadmap.
/* ---------- Bay shapes ---------- */
const WS_BOUND = { x: 10, y: 9 };
function bbox(ws) {
  let x0 = 99,
    x1 = -99,
    y0 = 99,
    y1 = -99;
  for (const k of ws) {
    const [x, y] = unkey(k);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, x1, y0, y1 };
}
const SHAPES = [
  {
    id: 'wide',
    name: 'Wide Chassis',
    rar: 0,
    desc: '+1 column down each side. Room for flank guns and wheels.',
    gen: ws => {
      const o = [];
      for (const k of ws) {
        const [x, y] = unkey(k);
        if (!ws.has(key(x - 1, y))) o.push([x - 1, y]);
        if (!ws.has(key(x + 1, y))) o.push([x + 1, y]);
      }
      return o;
    }
  },
  {
    id: 'long',
    name: 'Long Chassis',
    rar: 0,
    desc: '+1 row front and back. Good for rams and tail guns.',
    gen: ws => {
      const o = [];
      for (const k of ws) {
        const [x, y] = unkey(k);
        if (!ws.has(key(x, y - 1))) o.push([x, y - 1]);
        if (!ws.has(key(x, y + 1))) o.push([x, y + 1]);
      }
      return o;
    }
  },
  {
    id: 'pods',
    name: 'Side Pods',
    rar: 1,
    desc: 'Two 2×3 pods on the flanks. Wide stance.',
    gen: ws => {
      const b = bbox(ws),
        o = [];
      for (const y of [-1, 0, 1])
        for (const dx of [1, 2]) {
          o.push([b.x1 + dx, y], [b.x0 - dx, y]);
        }
      return o;
    }
  },
  {
    id: 'nose',
    name: 'Nose Cone',
    rar: 1,
    desc: 'A pointed front for spikes, saws and lances.',
    gen: ws => {
      const b = bbox(ws),
        o = [];
      for (const x of [-2, -1, 0, 1, 2]) o.push([x, b.y0 - 1]);
      for (const x of [-1, 0, 1]) o.push([x, b.y0 - 2]);
      o.push([0, b.y0 - 3]);
      return o;
    }
  },
  {
    id: 'tail',
    name: 'Tail Boom',
    rar: 1,
    desc: 'A spine out the back for mines, oil and rear guns.',
    gen: ws => {
      const b = bbox(ws),
        o = [];
      for (let i = 1; i <= 4; i++) o.push([0, b.y1 + i]);
      o.push([-1, b.y1 + 4], [1, b.y1 + 4]);
      return o;
    }
  },
  {
    id: 'arms',
    name: 'Outrigger Arms',
    rar: 2,
    desc: 'Arms reaching four out to each side. Long reach, easy to snap.',
    gen: ws => {
      const b = bbox(ws),
        o = [];
      for (let i = 1; i <= 4; i++) o.push([b.x1 + i, 0], [b.x0 - i, 0]);
      o.push([b.x1 + 4, -1], [b.x0 - 4, -1]);
      return o;
    }
  },
  {
    id: 'corners',
    name: 'Corner Bastions',
    rar: 2,
    desc: '2×2 blocks on all four corners.',
    gen: ws => {
      const b = bbox(ws),
        o = [];
      for (const [cx, cy] of [
        [b.x0 - 1, b.y0 - 1],
        [b.x1 + 1, b.y0 - 1],
        [b.x0 - 1, b.y1 + 1],
        [b.x1 + 1, b.y1 + 1]
      ])
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) o.push([cx + (cx < 0 ? -dx : dx), cy + (cy < 0 ? -dy : dy)]);
      return o.concat(SHAPES[0].gen(ws), SHAPES[1].gen(ws));
    }
  },
  {
    id: 'ring',
    name: 'Full Ring',
    rar: 3,
    desc: '+1 cell all the way around.',
    gen: ws => {
      const o = [];
      for (const k of ws) {
        const [x, y] = unkey(k);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if (!ws.has(key(x + dx, y + dy))) o.push([x + dx, y + dy]);
      }
      return o;
    }
  },
  {
    id: 'hangar',
    name: 'Hangar',
    rar: 4,
    desc: '+2 cells all the way around.',
    gen: ws => {
      const o = new Set();
      for (const k of ws) {
        const [x, y] = unkey(k);
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) if (!ws.has(key(x + dx, y + dy))) o.add(key(x + dx, y + dy));
      }
      return [...o].map(unkey);
    }
  }
];

/* ---------- Arena objects ---------- */
const JUNK = {
  duck: { name: 'Rubber duck', r: 14, m: 1, h: 12, hp: 40, note: 'Quacks when you honk.' },
  goldduck: {
    name: 'Golden duck',
    r: 14,
    m: 1,
    h: 12,
    hp: 60,
    note: 'Rare. Worth 25 coins when smashed.',
    coins: 25
  },
  couch: { name: 'Couch', r: 26, m: 12, h: 22, hp: 120 },
  piano: { name: 'Grand piano', r: 26, m: 30, h: 28, hp: 200 },
  fridge: { name: 'Fridge', r: 17, m: 16, h: 40, hp: 150 },
  bathtub: { name: 'Bathtub', r: 24, m: 14, h: 18, hp: 140 },
  cart: { name: 'Shopping cart', r: 15, m: 4, h: 20, hp: 60, bounce: 0.6 },
  cone: { name: 'Traffic cone', r: 9, m: 0.6, h: 10, hp: 15 },
  vending: { name: 'Vending machine', r: 20, m: 26, h: 44, hp: 180 },
  donut: { name: 'Giant donut', r: 20, m: 3, h: 12, hp: 50, bounce: 0.9 },
  toilet: { name: 'Toilet', r: 12, m: 6, h: 16, hp: 60 },
  gnome: { name: 'Garden gnome', r: 8, m: 1, h: 10, hp: 20 },
  washer: { name: 'Washing machine', r: 16, m: 14, h: 30, hp: 130 },
  flamingo: { name: 'Flamingo float', r: 17, m: 0.6, h: 20, hp: 25, bounce: 1 },
  pin: { name: 'Bowling pin', r: 9, m: 1.5, h: 12, hp: 25 },
  beachball: { name: 'Beach ball', r: 15, m: 0.4, h: 30, hp: 15, bounce: 1.1 },
  tv: { name: 'Old TV', r: 14, m: 5, h: 12, hp: 40 },
  hay: { name: 'Hay bale', r: 18, m: 5, h: 20, hp: 70, note: 'Burns fast.', flammable: 1 },
  potty: { name: 'Porta-potty', r: 16, m: 10, h: 44, hp: 110 },
  booth: { name: 'Phone booth', r: 15, m: 12, h: 50, hp: 120 },
  mattress: { name: 'Mattress', r: 22, m: 3, h: 10, hp: 60, bounce: 1.3, note: 'Very bouncy.' },
  mower: { name: 'Runaway lawn mower', r: 13, m: 5, h: 12, hp: 50, note: 'Drives itself around.', motor: 1 },
  chair: { name: 'Office chair', r: 12, m: 2, h: 20, hp: 40, note: 'Spins when hit.', spinny: 1 },
  arcade: { name: 'Arcade cabinet', r: 16, m: 18, h: 44, hp: 140 },
  chicken: { name: 'Rubber chicken', r: 10, m: 0.5, h: 8, hp: 15 },
  snowman: { name: 'Snowman', r: 15, m: 4, h: 30, hp: 40 },
  cactus: { name: 'Cactus', r: 12, m: 6, h: 30, hp: 60, note: 'Hurts whatever bumps into it.', thorny: 1 },
  pinata: { name: 'Piñata', r: 15, m: 1.5, h: 24, hp: 45, note: 'Drops 15 coins.', coins: 15 },
  hydrant: {
    name: 'Fire hydrant',
    r: 9,
    m: 20,
    h: 16,
    hp: 90,
    note: 'Breaks into a geyser that launches things.',
    geyser: 1
  },
  melon: { name: 'Watermelon', r: 11, m: 2, h: 12, hp: 20 },
  pumpkin: { name: 'Pumpkin', r: 13, m: 3, h: 16, hp: 30 },
  mailbox: { name: 'Mailbox', r: 8, m: 3, h: 20, hp: 40 },
  trophy: { name: 'Giant trophy', r: 12, m: 6, h: 30, hp: 80 },
  bumpercar: { name: 'Bumper car', r: 18, m: 6, h: 16, hp: 120, bounce: 1.25 }
};
const JUNKNAMES = Object.keys(JUNK).filter(k => k !== 'goldduck');
const PROPS = {
  crate: { name: 'Wooden crate', r: 13, m: 3, h: 22, hp: 50 },
  barrel: { name: 'Explosive barrel', r: 11, m: 2, h: 22, hp: 20, explode: { r: 85, dmg: 60 } },
  tires: { name: 'Tyre stack', r: 20, m: 8, h: 18, hp: 260, bounce: 0.85 },
  barrier: { name: 'Jersey barrier', r: 22, m: 60, h: 26, hp: 600, heavy: 1 },
  dummy: { name: 'Target dummy', r: 26, m: 16, h: 24, hp: 400, target: 1 },
  sentry: { name: 'Sentry turret', r: 20, m: 999, h: 30, hp: 300, target: 1, fixed: 1 }
};
const ZONES_INFO = [
  ['Ramp', 'Hit it fast to get airborne'],
  ['Trampoline', 'Launches anything that drives on it'],
  ['Oil slick', 'Kills your grip'],
  ['Spike strip', 'Shreds wheels'],
  ['Boost pad', 'Shoves you along its arrows'],
  ['Concrete wall', 'Indestructible cover']
];
const ROADMAP = {
  'More arena objects (ideas)': [
    'Hot tub',
    'Inflatable T-rex',
    'Grandfather clock',
    'Satellite dish',
    'Canoe',
    'Jukebox',
    'Ice cream truck',
    'Hamster ball',
    'Giant dice (random effect when smashed)',
    'Slot machine (pays out or explodes)',
    'Bouncy castle',
    'Beehive (bees chase the nearest car)',
    'Tumbleweed that rolls with the wind',
    'Crashed UFO',
    'Wedding cake',
    'Sumo inflatable',
    'Garden hose',
    'Shopping trolley train',
    'Statue',
    'Christmas tree'
  ],
  'Planned modules (clear how to build)': [
    'Cargo Bay (carry junk without a magnet)',
    'Grapple Hook (swing around walls)',
    'Oil Fire Igniter (sets your own oil slicks alight)',
    'Tow Cable between two cars',
    'Spotlight that reveals smoke',
    'Ram Plow that scoops cars up',
    'Sticky Tyres (climb ramps at any speed)'
  ],
  'Ideas, not sure yet': [
    'Pivot Joint (articulated sections)',
    'Spider Legs (walk over walls)',
    'Gravity Well mine',
    'Wings that glide off ramps',
    'Propeller for water arenas',
    'Mini-me drone you drive separately',
    'Cloaking device',
    'Grapple swing from walls',
    'Tow cable between two cars',
    'Sail (wind-powered speed)',
    'Weather arenas (rain, ice, sandstorm)',
    'Team 2v2 with shared drafts'
  ],
  Multiplayer: [
    'Both players draft and build at the same time',
    'Ready-up in the waiting arena',
    'Winner gets bonus coins, loser gets a comeback reroll',
    'Spectate the other build while you wait'
  ]
};
