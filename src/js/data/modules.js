// Module catalogue: rarities, categories, branches and all 190 modules (data only).
/* ---------- Rarity, categories, branches ---------- */
const RAR = [
  { name: 'Common', col: '#a3abb3', copies: 4, price: 20, w: 52 },
  { name: 'Uncommon', col: '#5cc38f', copies: 3, price: 40, w: 28 },
  { name: 'Rare', col: '#4ea1ff', copies: 2, price: 75, w: 13 },
  { name: 'Epic', col: '#c58bff', copies: 1, price: 130, w: 5.5 },
  { name: 'Legendary', col: '#ffa630', copies: 1, price: 220, w: 1.5 }
];
const CATS = [
  ['struct', 'Structure'],
  ['move', 'Movement'],
  ['chaos', 'Chaos'],
  ['weapon', 'Weapons'],
  ['melee', 'Melee'],
  ['defense', 'Defense'],
  ['utility', 'Utility']
].map(([id, name]) => ({ id, name }));
const CATNAME = Object.fromEntries(CATS.map(c => [c.id, c.name]));
const TAGS = {
  fire: 'Fire',
  hook: 'Tow & hook',
  pinball: 'Pinball',
  slip: 'Slippery',
  scrap: 'Scrap',
  flip: 'Flip',
  gun: 'Gunline',
  expl: 'Explosives',
  energy: 'Energy',
  melee: 'Melee',
  air: 'Air',
  def: 'Defense',
  econ: 'Scrap economy',
  cold: 'Water & ice'
};
const MOUNTNAME = ['no mount', 'light mount', 'heavy mount'];

/* ---------- 190 modules ----------
   D(id,name,cat,rarity,layer b|t,mount(base: what it holds) / weight(top: what it needs),hp,mass,desc,drawback,tags,art,props) */
const MODS = [];
const D = (id, name, cat, rar, layer, mnt, hp, mass, desc, con, tags, art, x = {}) =>
  MODS.push(
    Object.assign(
      { id, name, cat, rar, layer, mnt, hp, mass, desc, con, tags, art, price: x.price || RAR[rar].price },
      x
    )
  );
// Structure (base)
D(
  'cockpit',
  'Cockpit',
  'struct',
  0,
  'b',
  1,
  160,
  3,
  'Its destruction ends the fight. Holds one light top module.',
  'Where you put it decides what you have to protect.',
  [],
  { k: 'cockpit' },
  { price: 0 }
);
D(
  'frame',
  'Scrap Frame',
  'struct',
  0,
  'b',
  1,
  50,
  1,
  'Cheap connector. Holds a light top module.',
  'Easy to destroy.',
  [],
  { k: 'frame', c: '#5d6670', s: 'x' },
  { price: 10 }
);
D(
  'mesh',
  'Mesh Panel',
  'struct',
  0,
  'b',
  1,
  30,
  0.4,
  'Featherweight grating. Holds a light top module.',
  'Paper-thin.',
  ['air'],
  { k: 'frame', c: '#6b7178', s: 'mesh' },
  { price: 8 }
);
D(
  'girder',
  'Steel Girder',
  'struct',
  0,
  'b',
  2,
  95,
  2.2,
  'I-beam stock. Holds heavy top modules.',
  'Twice the weight of a frame.',
  ['melee'],
  { k: 'frame', c: '#4f6273', s: 'beam' },
  { price: 18 }
);
D('alloy', 'Alloy Frame', 'struct', 1, 'b', 1, 50, 0.5, 'Frame strength at half the weight.', 'Costs more.', ['air'], {
  k: 'frame',
  c: '#9fb0bd',
  s: 'x'
});
D(
  'beam',
  'Long Beam',
  'struct',
  1,
  'b',
  1,
  160,
  2,
  'Three cells long. Reaches weapons out across the bay.',
  'Break it and everything past it falls off.',
  ['melee', 'gun'],
  { k: 'beam' },
  { size: 3 }
);
D(
  'strut',
  'Spring Strut',
  'struct',
  1,
  'b',
  1,
  60,
  1,
  'Coil-sprung mount. Takes half impact damage.',
  'Bounces your aim on hard landings.',
  ['pinball'],
  { k: 'frame', c: '#5b6670', s: 'spring' },
  { res: { ram: 0.5 } }
);
D(
  'ballast',
  'Ballast Block',
  'struct',
  1,
  'b',
  2,
  130,
  8,
  'Dead weight. Hard to shove, hard to flip.',
  'Slows everything down.',
  ['melee', 'flip'],
  { k: 'frame', c: '#3d4247', s: 'block' },
  { flipRes: 1 }
);
D(
  'junction',
  'Reinforced Junction',
  'struct',
  2,
  'b',
  2,
  260,
  4,
  'Strong node. Touching parts get +20% HP.',
  'Heavy.',
  ['melee', 'def'],
  { k: 'frame', c: '#6c6f5a', s: 'hub' },
  { hubAura: 0.2 }
);
D(
  'ring',
  'Turret Ring',
  'struct',
  2,
  'b',
  2,
  70,
  2,
  'The weapon mounted on it swivels freely toward your cursor.',
  'A weak link: lose it and the turret falls off.',
  ['gun'],
  { k: 'ring' }
);
D(
  'coupler',
  'Breakaway Coupler',
  'struct',
  2,
  'b',
  1,
  40,
  1,
  'Press X to drop everything attached through it.',
  'Dropped parts stop working.',
  ['scrap'],
  { k: 'coupler' },
  { coupler: 1 }
);
D(
  'nanoframe',
  'Nanoframe',
  'struct',
  4,
  'b',
  1,
  110,
  0.5,
  'Self-healing lattice. Regenerates 4 HP/s.',
  'Holds only light modules.',
  ['def'],
  { k: 'frame', c: '#2f5f68', s: 'nano' },
  { regen: 4, glow: '#5fe3c8' }
);
// Movement (base, no mount)
D(
  'wheel',
  'Standard Wheel',
  'move',
  0,
  'b',
  0,
  45,
  1,
  'Cheap, efficient drive.',
  'Exposed wheels are easy targets.',
  [],
  { k: 'wheel', v: 'road' },
  { drive: { p: 7, g: 1, top: 250 }, price: 12 }
);
D(
  'steer',
  'Steering Wheel',
  'move',
  0,
  'b',
  0,
  40,
  1,
  'Sharper turning when placed far forward or back.',
  'Barely helps near the middle.',
  ['pinball'],
  { k: 'wheel', v: 'steer' },
  { drive: { p: 3, g: 0.8, top: 250 }, steer: 1, price: 15 }
);
D(
  'slick',
  'Racing Slick',
  'move',
  1,
  'b',
  0,
  35,
  1,
  'Fast tyre. +15% top speed.',
  'Grip drops off fast.',
  ['air'],
  { k: 'wheel', v: 'slick' },
  { drive: { p: 7, g: 0.75, top: 300 } }
);
D(
  'monster',
  'Monster Wheel',
  'move',
  1,
  'b',
  0,
  90,
  2.5,
  'Huge tyre. Rolls straight over small junk.',
  'Heavy and a big target.',
  ['flip', 'scrap'],
  { k: 'wheel', v: 'monster' },
  { drive: { p: 9, g: 1.3, top: 230 }, monster: 1 }
);
D(
  'spikedwheel',
  'Spiked Wheel',
  'move',
  2,
  'b',
  0,
  60,
  1.5,
  'Studded rim. Shreds whatever it rolls into.',
  'Chews up its own grip on hard ground.',
  ['melee'],
  { k: 'wheel', v: 'spiked' },
  { drive: { p: 7, g: 1.1, top: 240 }, ram: 4 }
);
D(
  'track',
  'Heavy Track',
  'move',
  2,
  'b',
  0,
  220,
  5,
  'Two cells long. Huge traction for pushing fights. Ignores spike strips.',
  'Slow and heavy.',
  ['hook', 'flip', 'melee'],
  { k: 'track' },
  { size: 2, drive: { p: 18, g: 2.6, top: 175 }, spikeproof: 1 }
);
D(
  'omni',
  'Omni Wheel',
  'move',
  2,
  'b',
  0,
  40,
  1,
  'Q and E strafe sideways.',
  'Weak at pushing and easy to shove.',
  ['gun', 'pinball'],
  { k: 'omni' },
  { drive: { p: 5, g: 0.8, top: 230, slide: 1 }, strafe: 1 }
);
D(
  'hover',
  'Hover Pad',
  'move',
  3,
  'b',
  0,
  50,
  1,
  'Glides over oil, glue, spikes and small junk.',
  'Slippery when turning or rammed.',
  ['slip', 'air'],
  { k: 'hover' },
  { drive: { p: 6, g: 0.6, top: 290 }, hover: 1, glow: '#7fe0ff' }
);
D(
  'engine',
  'Turbo Engine',
  'move',
  1,
  'b',
  1,
  70,
  3,
  '+12 drive power for all your wheels.',
  'Pops when destroyed.',
  ['air'],
  { k: 'engine' },
  { power: 12, boom: { r: 50, dmg: 35 } }
);
D(
  'gyro',
  'Gyroscope',
  'move',
  1,
  'b',
  1,
  45,
  1,
  'Spinning mass. +25% turning.',
  'Does nothing on its own.',
  ['pinball'],
  { k: 'gyro' },
  { turn: 0.25 }
);
D(
  'booster',
  'Directional Booster',
  'move',
  1,
  'b',
  0,
  50,
  1.5,
  'Shift fires a short burst the way it faces.',
  'Off-center boosters spin you.',
  ['pinball', 'air', 'flip'],
  { k: 'jet' },
  { dir: 1, booster: 1 }
);
D(
  'jump',
  'Jump Thruster',
  'move',
  3,
  'b',
  0,
  50,
  1.5,
  'J launches the car over low obstacles.',
  'Land badly and you end up on your roof.',
  ['air', 'flip'],
  { k: 'jumpjet' },
  { jump: 1 }
);
D(
  'anchor',
  'Anchor Foot',
  'move',
  2,
  'b',
  1,
  90,
  2,
  'C plants the car: no sliding, no recoil, steadier aim.',
  'You can’t drive until you pull it up.',
  ['scrap', 'gun'],
  { k: 'anchor' },
  { anchor: 1 }
);
D(
  'blink',
  'Blink Drive',
  'move',
  4,
  'b',
  1,
  60,
  2,
  'F teleports the car 180 units forward. 6 s cooldown.',
  'Can’t blink into walls; leaves you dizzy for a moment.',
  ['air', 'energy'],
  { k: 'blink' },
  { blink: 1, glow: '#c58bff' }
);
// Chaos
D(
  'flipper',
  'Spring Flipper',
  'chaos',
  2,
  'b',
  0,
  120,
  3,
  'Launches whatever is in front of it into the air.',
  'Weak against heavy, wide targets.',
  ['flip', 'pinball'],
  { k: 'flipper' },
  { dir: 1, flipper: 1, front: 1 }
);
D(
  'piston',
  'Boxing Piston',
  'chaos',
  1,
  'b',
  0,
  100,
  2.5,
  'Right-click punches whatever is in front.',
  'The recoil shoves you backward.',
  ['pinball'],
  { k: 'piston' },
  { dir: 1, piston: 1, front: 1 }
);
D(
  'springpad',
  'Spring Pad',
  'chaos',
  1,
  'b',
  0,
  90,
  1.5,
  'Anything that hits it gets bounced away hard.',
  'No damage of its own.',
  ['pinball'],
  { k: 'springpad' },
  { spring: 1 }
);
D(
  'oil',
  'Oil Sprayer',
  'chaos',
  0,
  't',
  1,
  45,
  1,
  'Hold Z to spray oil out of the side it faces.',
  'Your own wheels slip on it too.',
  ['slip', 'fire'],
  { k: 'sprayer', c: '#2a2a3a' },
  { dir: 1, spray: 'oil', front: 1, price: 22 }
);
D(
  'glue',
  'Glue Sprayer',
  'chaos',
  1,
  't',
  1,
  45,
  1,
  'Z drops a sticky patch that bogs wheels down. Three a round.',
  'It sticks to you too.',
  ['slip', 'hook'],
  { k: 'sprayer', c: '#c9b84a' },
  { dir: 1, spray: 'glue', front: 1 }
);
D(
  'ball',
  'Wrecking Ball',
  'chaos',
  3,
  't',
  2,
  100,
  3,
  'Swings a heavy ball on a chain.',
  'Its momentum drags your car around.',
  ['melee', 'pinball'],
  { k: 'ballmount' },
  { ball: 1 }
);
D(
  'catapult',
  'Scrap Catapult',
  'chaos',
  3,
  't',
  2,
  90,
  3,
  'Scoops up nearby junk. Right-click hurls it at your cursor.',
  'Ammo is whatever is lying around; odd shapes fly wild.',
  ['scrap'],
  { k: 'catapult' },
  { catapult: 1 }
);
D(
  'tractor',
  'Tractor Beam',
  'chaos',
  3,
  't',
  1,
  55,
  1.5,
  'Hold right-click to drag the object nearest your cursor toward you.',
  'Heavy things barely budge.',
  ['scrap', 'hook', 'energy'],
  { k: 'tractor' },
  { tractor: 1, glow: '#7fffb0' }
);
D(
  'vacuum',
  'Junk Vacuum',
  'chaos',
  2,
  't',
  1,
  60,
  2,
  'Sucks up small junk and turns it into repairs.',
  'Only eats small stuff.',
  ['scrap', 'econ'],
  { k: 'vacuum' },
  { vacuum: 1 }
);
D(
  'horn',
  'Air Horn',
  'chaos',
  0,
  't',
  1,
  35,
  0.5,
  'H honks. Sentries within 320 flinch and stop firing for 1.5 s.',
  'Ducks quack back.',
  ['def'],
  { k: 'horn' },
  { horn: 1, price: 16 }
);
D(
  'disco',
  'Disco Ball',
  'chaos',
  0,
  't',
  1,
  30,
  0.5,
  'Does nothing. Looks incredible.',
  'Does nothing.',
  ['econ'],
  { k: 'disco' },
  { disco: 1, price: 10 }
);
// Weapons (top)
const W = o => ({ wpn: o });
D(
  'mg',
  'Machine Gun',
  'weapon',
  0,
  't',
  1,
  40,
  1,
  'Steady fire that chews up exposed parts.',
  'Weak against heavy armor.',
  ['gun'],
  { k: 'gun', b: 2, l: 1.3, w: 0.09, c: '#3a4249' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', dmg: 5, rate: 8, spd: 780, rng: 560, spr: 0.06, dt: 'light', cls: 'ballistic' })
  }
);
D(
  'smg',
  'Twin SMG',
  'weapon',
  0,
  't',
  1,
  35,
  1,
  'Sprays a wall of lead at close range.',
  'Wild spread.',
  ['gun'],
  { k: 'gun', b: 2, l: 0.95, w: 0.08, c: '#3b3f45', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', dmg: 3, rate: 16, spd: 700, rng: 380, spr: 0.15, dt: 'light', cls: 'ballistic' })
  }
);
D(
  'nailgun',
  'Nail Gun',
  'weapon',
  0,
  't',
  1,
  35,
  1,
  'Pneumatic nails. Cheap and punchy.',
  'Slow to fire.',
  ['gun', 'scrap'],
  { k: 'gun', b: 1, l: 1.1, w: 0.13, c: '#b8902a', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', dmg: 10, rate: 3.5, spd: 700, rng: 480, spr: 0.04, dt: 'kin', cls: 'ballistic' })
  }
);
D(
  'pulse',
  'Pulse Laser',
  'weapon',
  0,
  't',
  1,
  35,
  1,
  'Quick energy bolts.',
  'Bolts fade at range.',
  ['energy'],
  { k: 'gun', b: 1, l: 1.15, w: 0.1, c: '#2a6f8a', h: 'lens', tip: '#7fe0ff' },
  {
    dir: 1,
    front: 1,
    glow: '#7fe0ff',
    ...W({ kind: 'bolt', dmg: 9, rate: 4, spd: 900, rng: 520, spr: 0.02, dt: 'energy', cls: 'energy' })
  }
);
D(
  'scatter',
  'Scattergun',
  'weapon',
  1,
  't',
  1,
  55,
  2,
  'Devastating seven-pellet blast.',
  'Useless at distance.',
  ['gun', 'melee'],
  { k: 'gun', b: 1, l: 1, w: 0.24, c: '#5a3d2a', v: 'flare' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'bullet',
      n: 7,
      dmg: 7,
      rate: 1.2,
      spd: 640,
      rng: 300,
      spr: 0.3,
      dt: 'kin',
      recoil: 14,
      cls: 'ballistic'
    })
  }
);
D(
  'hmg',
  'Heavy MG',
  'weapon',
  1,
  't',
  2,
  60,
  2,
  'Bigger rounds, longer reach.',
  'Needs a heavy mount.',
  ['gun'],
  { k: 'gun', b: 1, l: 1.5, w: 0.13, c: '#4a5056', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', dmg: 11, rate: 6, spd: 820, rng: 680, spr: 0.05, dt: 'kin', cls: 'ballistic' })
  }
);
D(
  'cannon',
  'Cannon',
  'weapon',
  1,
  't',
  2,
  70,
  3,
  'Heavy single shots.',
  'Strong recoil; off-center cannons yank your aim.',
  ['gun', 'expl'],
  { k: 'gun', b: 1, l: 1.45, w: 0.22, c: '#6c7781', v: 'brake' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'shell',
      dmg: 45,
      rate: 0.7,
      spd: 600,
      rng: 760,
      spr: 0.02,
      dt: 'kin',
      recoil: 70,
      cls: 'ballistic'
    })
  }
);
D(
  'harpoon',
  'Harpoon Launcher',
  'weapon',
  1,
  't',
  1,
  60,
  2,
  'Tethers its target. Hold right-click to reel it in.',
  'Heavy targets drag you instead.',
  ['hook'],
  { k: 'gun', b: 1, l: 1.1, w: 0.14, c: '#6b5a3a', h: 'box', v: 'harpoon' },
  { dir: 1, front: 1, ...W({ kind: 'harpoon', dmg: 20, cd: 1.5, spd: 700, rng: 520, dt: 'kin' }) }
);
D(
  'rocket',
  'Rocket Pod',
  'weapon',
  1,
  't',
  1,
  50,
  2,
  'Volleys of four rockets that splash.',
  'Long reload between volleys.',
  ['expl'],
  { k: 'pod', n: 4, c: '#6f7a3c' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'rocket',
      dmg: 30,
      burst: 4,
      reload: 4,
      spd: 320,
      rng: 850,
      spr: 0.08,
      splash: 45,
      dt: 'expl',
      cls: 'expl'
    })
  }
);
D(
  'flamer',
  'Flamethrower',
  'weapon',
  1,
  't',
  1,
  50,
  1.5,
  'Close-range fire that sets things burning.',
  'You have to stay close.',
  ['fire'],
  { k: 'gun', b: 1, l: 1, w: 0.18, c: '#8a3a22', h: 'tank', v: 'flame' },
  { dir: 1, front: 1, ...W({ kind: 'flame', dps: 55, rng: 190, dt: 'fire', cls: 'fire' }) }
);
D(
  'arc',
  'Arc Emitter',
  'weapon',
  1,
  't',
  1,
  55,
  2,
  'Lightning that jumps between up to four nearby targets.',
  'Short range, long cooldown.',
  ['energy'],
  { k: 'arc' },
  {
    dir: 1,
    front: 1,
    glow: '#bfe9ff',
    ...W({ kind: 'arc', dmg: 35, cd: 3.2, rng: 210, chain: 3, dt: 'energy', cls: 'energy' })
  }
);
D(
  'hydro',
  'Hydro Cannon',
  'weapon',
  1,
  't',
  1,
  55,
  2,
  'Blasts a water jet that shoves things across the arena and puts out fires.',
  'Almost no damage.',
  ['pinball', 'cold'],
  { k: 'gun', b: 1, l: 1.2, w: 0.2, c: '#2f6d8c', h: 'tank', v: 'water' },
  { dir: 1, front: 1, ...W({ kind: 'water', push: 70, rng: 320, dt: 'kin', cls: 'none' }) }
);
D(
  'tirel',
  'Tire Launcher',
  'weapon',
  1,
  't',
  2,
  65,
  2.5,
  'Fires tyres that ricochet off walls up to three times.',
  'Hard to aim on purpose.',
  ['pinball', 'scrap'],
  { k: 'gun', b: 1, l: 1.2, w: 0.3, c: '#3a3f44', h: 'box', v: 'tire' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bounce', dmg: 20, rate: 0.9, spd: 520, rng: 1400, dt: 'kin', cls: 'ballistic' })
  }
);
D(
  'minigun',
  'Minigun',
  'weapon',
  2,
  't',
  2,
  60,
  2,
  'Spins up to a storm of lead.',
  'Needs a second to spin up.',
  ['gun'],
  { k: 'gun', v: 'mini', l: 1.35, c: '#2f353b' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'bullet',
      dmg: 5,
      rate: 22,
      spd: 820,
      rng: 580,
      spr: 0.08,
      spin: 1,
      dt: 'light',
      cls: 'ballistic'
    })
  }
);
D(
  'autocannon',
  'Autocannon',
  'weapon',
  2,
  't',
  2,
  70,
  3,
  'Rapid exploding shells.',
  'Heavy, and the splash is small.',
  ['gun', 'expl'],
  { k: 'gun', b: 1, l: 1.5, w: 0.16, c: '#5b6650', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'shell',
      dmg: 16,
      rate: 3,
      spd: 700,
      rng: 700,
      spr: 0.04,
      splash: 22,
      dt: 'expl',
      recoil: 8,
      cls: 'ballistic'
    })
  }
);
D(
  'sniper',
  'Marksman Rifle',
  'weapon',
  2,
  't',
  1,
  40,
  1.5,
  'Long, precise, punishing.',
  'Slow and useless up close.',
  ['gun'],
  { k: 'gun', b: 1, l: 1.9, w: 0.07, c: '#3e4a3a', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', dmg: 60, rate: 0.7, spd: 1300, rng: 1100, spr: 0, dt: 'kin', cls: 'ballistic' })
  }
);
D(
  'missile',
  'Homing Missiles',
  'weapon',
  2,
  't',
  1,
  50,
  2,
  'Missiles that seek whatever is nearest your cursor.',
  'Slow to reload.',
  ['expl'],
  { k: 'pod', n: 2, c: '#c9ccc6', v: 'missile' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'homing', dmg: 45, rate: 0.5, spd: 340, rng: 1000, splash: 40, dt: 'expl', cls: 'expl' })
  }
);
D(
  'mortar',
  'Mortar',
  'weapon',
  2,
  't',
  2,
  60,
  3,
  'Lobs shells over cover onto your cursor.',
  'Minimum range; you have to lead the target.',
  ['expl'],
  { k: 'mortar', c: '#4f5a3a' },
  { ...W({ kind: 'lob', dmg: 55, rate: 0.5, rng: 800, min: 160, splash: 70, dt: 'expl', cls: 'expl' }) }
);
D(
  'napalm',
  'Napalm Lobber',
  'weapon',
  2,
  't',
  2,
  55,
  2.5,
  'Lobs fire that keeps burning on the ground.',
  'Light direct damage.',
  ['fire', 'expl'],
  { k: 'mortar', c: '#7a3a22', v: 'napalm' },
  {
    ...W({
      kind: 'lob',
      dmg: 20,
      rate: 0.5,
      rng: 620,
      min: 120,
      splash: 40,
      napalm: 1,
      dt: 'fire',
      cls: 'fire'
    })
  }
);
D(
  'sticky',
  'Sticky Bomb Launcher',
  'weapon',
  2,
  't',
  1,
  50,
  1.5,
  'Bombs that glue onto whatever they hit and blow up 1.6 s later.',
  'The delay gives targets time to move.',
  ['expl', 'hook'],
  { k: 'gun', b: 1, l: 1, w: 0.26, c: '#3f6a3a', h: 'box', v: 'sticky' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'sticky', dmg: 65, rate: 0.6, spd: 460, rng: 520, splash: 55, dt: 'expl', cls: 'expl' })
  }
);
D(
  'laser',
  'Laser Emitter',
  'weapon',
  2,
  't',
  1,
  40,
  1,
  'Continuous beam.',
  'Low damage per second at first.',
  ['energy'],
  { k: 'gun', b: 1, l: 1.05, w: 0.12, c: '#2b5b7a', h: 'lens', tip: '#9ff' },
  {
    dir: 1,
    front: 1,
    glow: '#7fe0ff',
    ...W({ kind: 'beam', dps: 42, rng: 540, dt: 'energy', cls: 'energy' })
  }
);
D(
  'tesla',
  'Tesla Coil',
  'weapon',
  2,
  't',
  2,
  60,
  2,
  'Zaps the nearest target on its own and chains to three more.',
  'Can’t be aimed.',
  ['energy'],
  { k: 'tesla' },
  {
    glow: '#bfe9ff',
    ...W({ kind: 'tesla', dmg: 22, cd: 1.2, rng: 230, chain: 3, dt: 'energy', cls: 'energy' })
  }
);
D(
  'freeze',
  'Freeze Ray',
  'weapon',
  3,
  't',
  1,
  50,
  1.5,
  'Beam that freezes things solid: they stop moving and take 25% more damage.',
  'Barely hurts on its own.',
  ['cold', 'energy'],
  { k: 'gun', b: 1, l: 1.1, w: 0.16, c: '#5aa8d8', h: 'lens', tip: '#e6faff', v: 'ice' },
  {
    dir: 1,
    front: 1,
    glow: '#bfefff',
    ...W({ kind: 'beam', dps: 12, rng: 440, freeze: 1, dt: 'energy', cls: 'energy' })
  }
);
D(
  'swarm',
  'Swarm Pod',
  'weapon',
  3,
  't',
  2,
  60,
  2,
  'A volley of twelve micro-rockets.',
  'Long reload; rockets scatter.',
  ['expl'],
  { k: 'pod', n: 9, c: '#6a3a3a' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'rocket',
      dmg: 14,
      burst: 12,
      reload: 3.5,
      spd: 340,
      rng: 800,
      spr: 0.25,
      splash: 30,
      dt: 'expl',
      fast: 1,
      cls: 'expl'
    })
  }
);
D(
  'cluster',
  'Cluster Mortar',
  'weapon',
  3,
  't',
  2,
  70,
  3,
  'One shell, eight bomblets.',
  'Very slow to reload.',
  ['expl'],
  { k: 'mortar', c: '#5a5a5a', v: 'cluster' },
  {
    ...W({
      kind: 'lob',
      dmg: 24,
      rate: 0.35,
      rng: 700,
      min: 160,
      splash: 40,
      cluster: 8,
      dt: 'expl',
      cls: 'expl'
    })
  }
);
D(
  'plasma',
  'Plasma Caster',
  'weapon',
  3,
  't',
  2,
  55,
  2,
  'Slow plasma orbs that splash.',
  'Slow projectiles.',
  ['energy'],
  { k: 'gun', b: 1, l: 1.2, w: 0.24, c: '#5a3f8a', h: 'lens', tip: '#e0b0ff' },
  {
    dir: 1,
    front: 1,
    glow: '#c79bff',
    ...W({
      kind: 'plasma',
      dmg: 42,
      rate: 0.9,
      spd: 420,
      rng: 700,
      spr: 0.02,
      splash: 42,
      dt: 'energy',
      cls: 'energy'
    })
  }
);
D(
  'railgun',
  'Railgun',
  'weapon',
  3,
  't',
  2,
  60,
  3,
  'Hold fire to charge a shot that pierces everything in line.',
  'The glowing charge gives targets time to react.',
  ['energy', 'gun'],
  { k: 'gun', b: 2, l: 1.6, w: 0.08, c: '#2d4b6b', h: 'box', v: 'rail' },
  {
    dir: 1,
    front: 1,
    glow: '#8cd2ff',
    ...W({ kind: 'rail', dmg: 150, charge: 1.1, cd: 2.5, rng: 1200, dt: 'energy', recoil: 40, cls: 'energy' })
  }
);
D(
  'drone',
  'Drone Bay',
  'weapon',
  3,
  't',
  2,
  70,
  2.5,
  'Launches two attack drones that orbit you and shoot nearby targets.',
  'Drones are fragile and die with the bay.',
  ['gun', 'air'],
  { k: 'drone' },
  { drones: 2 }
);
D(
  'photon',
  'Photon Array',
  'weapon',
  4,
  't',
  1,
  70,
  2,
  'Three beams at once.',
  'Beams spread wide at range.',
  ['energy'],
  { k: 'gun', b: 3, l: 1.2, w: 0.08, c: '#7a5ab0', h: 'lens', tip: '#f0d0ff' },
  {
    dir: 1,
    front: 1,
    glow: '#d6a8ff',
    ...W({ kind: 'beam', dps: 40, beams: 3, rng: 600, dt: 'energy', cls: 'energy' })
  }
);
D(
  'ion',
  'Ion Cannon',
  'weapon',
  4,
  't',
  2,
  90,
  3,
  'One huge charged blast.',
  'Slow shot, slow reload.',
  ['energy', 'expl'],
  { k: 'gun', b: 1, l: 1.6, w: 0.28, c: '#3a4aa8', h: 'lens', tip: '#cfe0ff' },
  {
    dir: 1,
    front: 1,
    glow: '#9fb6ff',
    ...W({
      kind: 'plasma',
      dmg: 140,
      rate: 0.4,
      spd: 520,
      rng: 900,
      spr: 0,
      splash: 75,
      dt: 'energy',
      big: 1,
      recoil: 50,
      cls: 'energy'
    })
  }
);
// Melee (base, front)
D(
  'spike',
  'Ram Spike',
  'melee',
  0,
  'b',
  0,
  85,
  2,
  'Forward spike. Heavy damage on impact.',
  'Only works if you actually hit something.',
  ['melee', 'pinball'],
  { k: 'spike' },
  { dir: 1, ram: 6, front: 1, price: 18 }
);
D(
  'saw',
  'Circular Saw',
  'melee',
  1,
  'b',
  0,
  70,
  2,
  'Continuous contact damage.',
  'Needs a sturdy mount; weak on a bare frame.',
  ['melee', 'hook'],
  { k: 'saw' },
  { dir: 1, front: 1, mel: { dps: 70 } }
);
D(
  'chainblade',
  'Chain Blade',
  'melee',
  1,
  'b',
  0,
  65,
  2,
  'Chainsaw bar with extra reach.',
  'Lower damage than a saw.',
  ['melee'],
  { k: 'chain' },
  { dir: 1, front: 1, mel: { dps: 52, reach: 1.4 } }
);
D(
  'drill',
  'Drill',
  'melee',
  2,
  'b',
  0,
  90,
  2.5,
  'Tungsten drill. Bores through anything.',
  'Heavy and slow to reach.',
  ['melee'],
  { k: 'drill' },
  { dir: 1, front: 1, mel: { dps: 100 } }
);
D(
  'hammer',
  'Piston Hammer',
  'melee',
  2,
  'b',
  0,
  100,
  3,
  'Smashes for 90 damage once a second.',
  'Misses if the target slips away.',
  ['melee', 'flip'],
  { k: 'hammer' },
  { dir: 1, front: 1, mel: { hit: 90, cd: 1 } }
);
D(
  'lance',
  'Ram Lance',
  'melee',
  2,
  'b',
  0,
  150,
  3,
  'Two cells long. Concentrates crash damage at the tip.',
  'Needs a fast, straight hit and a strong frame behind it.',
  ['melee', 'pinball'],
  { k: 'lance' },
  { dir: 1, size: 2, lance: 9, front: 1 }
);
D(
  'jaws',
  'Crusher Jaws',
  'melee',
  3,
  'b',
  0,
  140,
  3.5,
  'Hydraulic jaws. 200 damage per bite.',
  'Long gap between bites.',
  ['melee', 'hook'],
  { k: 'jaws' },
  { dir: 1, front: 1, mel: { hit: 200, cd: 1.6 } }
);
D(
  'grinder',
  'Grinder Drum',
  'melee',
  4,
  'b',
  0,
  180,
  4,
  'Rotating drum of teeth. Devastating.',
  'Very heavy.',
  ['melee'],
  { k: 'grinder' },
  { dir: 1, front: 1, mel: { dps: 200, reach: 1.2 } }
);
// Defense
D(
  'armor',
  'Armor Plate',
  'defense',
  0,
  'b',
  1,
  170,
  3,
  'Reliable protection. Shrugs off light rounds. Holds a light module.',
  'Heavy.',
  ['def', 'gun'],
  { k: 'plate', c: '#8e979e', p: 'bolts' },
  { res: { light: 0.6 }, price: 15 }
);
D(
  'tirewall',
  'Tire Wall',
  'defense',
  0,
  'b',
  0,
  90,
  1,
  'Stacked rubber. Halves impact damage and bounces things off.',
  'No mount on top.',
  ['pinball', 'def'],
  { k: 'plate', c: '#2a2c2f', p: 'tires' },
  { res: { ram: 0.5 }, bouncy: 1, price: 12 }
);
D(
  'bumper',
  'Shock Bumper',
  'defense',
  0,
  'b',
  0,
  100,
  1,
  'Bouncy edge. Crashes on it hurt 70% less.',
  'Takes edge space your weapons want.',
  ['pinball', 'def'],
  { k: 'bumper' },
  { dir: 1, bumper: 1, res: { ram: 0.7 }, price: 15 }
);
D(
  'sloped',
  'Sloped Armor',
  'defense',
  1,
  'b',
  0,
  130,
  3,
  'Glancing hits deal 70% less.',
  'Direct hits go straight in; blasts hit 25% harder.',
  ['def'],
  { k: 'plate', c: '#959ea6', p: 'slope' },
  { dir: 1, sloped: 1 }
);
D(
  'heavyplate',
  'Heavy Plate',
  'defense',
  1,
  'b',
  2,
  320,
  6,
  'Thick slab. Holds heavy modules.',
  'Very heavy.',
  ['def', 'melee'],
  { k: 'plate', c: '#6f7880', p: 'heavy' },
  { res: { light: 0.7 } }
);
D(
  'fireproof',
  'Fireproof Plating',
  'defense',
  1,
  'b',
  1,
  100,
  2,
  'Barely notices fire. Touching parts take half fire damage.',
  'Weaker than plain armor otherwise.',
  ['fire', 'def'],
  { k: 'plate', c: '#b8553a', p: 'tile' },
  { res: { fire: 0.9 }, fireAura: 1 }
);
D(
  'spikeplate',
  'Spiked Plating',
  'defense',
  1,
  'b',
  1,
  120,
  2.5,
  'Anything that bumps into it gets stabbed.',
  'Spikes catch on junk and slow you down.',
  ['melee', 'def'],
  { k: 'plate', c: '#7f8890', p: 'spikes' },
  { thorns: 1 }
);
D(
  'blast',
  'Blast Screen',
  'defense',
  1,
  't',
  1,
  80,
  1.5,
  'Catches rockets and shells that pass close by.',
  'Flimsy against gunfire.',
  ['def', 'expl'],
  { k: 'screen' },
  { screen: 1, res: { light: -1, kin: -0.5 } }
);
D(
  'smoke',
  'Smoke Launcher',
  'defense',
  0,
  't',
  1,
  35,
  1,
  'V hides you in smoke. Sentries lose their lock.',
  'You can’t see through it either.',
  ['def', 'slip'],
  { k: 'smoke' },
  { counter: 'smoke', price: 18 }
);
D(
  'reactive',
  'Reactive Armor',
  'defense',
  2,
  'b',
  0,
  100,
  3,
  'Cancels one big explosive hit completely.',
  'Then it breaks.',
  ['def', 'expl'],
  { k: 'plate', c: '#7c7a52', p: 'reactive' },
  { reactive: 1 }
);
D(
  'decoy',
  'Decoy Launcher',
  'defense',
  2,
  't',
  1,
  40,
  1,
  'V launches a decoy car that draws automated fire.',
  'A human opponent will spot it.',
  ['def'],
  { k: 'decoy' },
  { counter: 'decoy' }
);
D(
  'pd',
  'Point-Defense Turret',
  'defense',
  2,
  't',
  1,
  45,
  1.5,
  'Shoots down incoming rockets and shells.',
  'Bullets and big volleys still get through.',
  ['def', 'expl'],
  { k: 'pd' },
  { pd: 1 }
);
D(
  'shield',
  'Shield Projector',
  'defense',
  3,
  't',
  2,
  60,
  2,
  'A 120° energy shield in front that soaks 140 damage.',
  'Once broken it needs 4 s to come back.',
  ['energy', 'def'],
  { k: 'shield' },
  { dir: 1, shield: 1, glow: '#78beff' }
);
// Utility
D(
  'ammorack',
  'Ammo Rack',
  'utility',
  0,
  'b',
  1,
  40,
  1,
  '+10% ballistic damage each (max 3).',
  'Explodes when destroyed.',
  ['gun'],
  { k: 'ammo' },
  { aura: { dmg_ballistic: 0.1 }, auraMax: 3, boom: { r: 60, dmg: 60 }, price: 20 }
);
D(
  'radar',
  'Radar Dish',
  'utility',
  1,
  't',
  1,
  35,
  1,
  '+20% weapon range each (max 2).',
  'Fragile.',
  ['gun'],
  { k: 'radar' },
  { aura: { range: 0.2 }, auraMax: 2 }
);
D(
  'coolant',
  'Coolant Unit',
  'utility',
  1,
  't',
  1,
  45,
  1.5,
  '+15% fire rate each (max 3).',
  'Heavy for what it does.',
  ['gun', 'cold'],
  { k: 'coolant' },
  { aura: { rate: 0.15 }, auraMax: 3 }
);
D(
  'sensor',
  'Targeting Sensor',
  'utility',
  1,
  't',
  1,
  35,
  1,
  'Fixed guns auto-aim much wider; turrets track twice as fast.',
  'Fragile.',
  ['gun'],
  { k: 'sensor' },
  { sensor: 1 }
);
D(
  'pusher',
  'Obstacle Pusher',
  'utility',
  1,
  'b',
  0,
  160,
  3,
  'Bulldozer blade. Shoves heavy junk and barriers around.',
  'Can’t move walls, and it needs traction.',
  ['scrap', 'hook'],
  { k: 'pusher' },
  { dir: 1, pusher: 1, front: 1 }
);
D(
  'selfright',
  'Self-Righting Arm',
  'utility',
  1,
  'b',
  1,
  60,
  2,
  'Flips you back over in 1 s instead of 5.',
  'Space that could hold weapons or armor.',
  ['flip', 'air'],
  { k: 'selfright' },
  { selfright: 1 }
);
D(
  'repairarm',
  'Repair Arm',
  'utility',
  2,
  't',
  1,
  60,
  2,
  'Fixes a touching part after 2 s without taking damage.',
  '300 HP of repairs per round.',
  ['def'],
  { k: 'repairarm' },
  { repair: 1 }
);
D(
  'recycler',
  'Scrap Recycler',
  'utility',
  2,
  't',
  1,
  50,
  1.5,
  '+1 coin for every piece of junk you smash, +5 per target.',
  'Does nothing in a fight.',
  ['econ', 'scrap'],
  { k: 'recycler' },
  { recycler: 1 }
);
D(
  'jammer',
  'Signal Jammer',
  'utility',
  3,
  't',
  1,
  45,
  1,
  'V scrambles sentries within 350 for 4 s.',
  'Useless against a human aiming by hand.',
  ['energy', 'def'],
  { k: 'jammer' },
  { counter: 'jam', glow: '#c58bff' }
);
D(
  'magnet',
  'Magnetic Collector',
  'utility',
  3,
  't',
  2,
  70,
  2,
  'Pulls loose junk in and sticks it on as extra cover.',
  'Stuck junk adds weight and can block your guns.',
  ['scrap'],
  { k: 'magnet' },
  { magnet: 1 }
);
D(
  'overclock',
  'Overclock Core',
  'utility',
  4,
  'b',
  1,
  60,
  1,
  '+30% fire rate on every weapon.',
  'Every part takes 10% more damage.',
  ['gun', 'energy'],
  { k: 'chip' },
  { aura: { rate: 0.3 }, auraMax: 1, fragile: 0.1, glow: '#ffd27a' }
);
D(
  'horseshoe',
  'Lucky Horseshoe',
  'utility',
  4,
  't',
  1,
  40,
  0.5,
  '+25% coins at the end of every round (max 2).',
  'Does nothing in a fight.',
  ['econ'],
  { k: 'horseshoe' },
  { lucky: 1, glow: '#ffd257' }
);
/* ---------- v6 additions: 40 more modules ---------- */
D(
  'scaffold',
  'Scaffold Pole',
  'struct',
  0,
  'b',
  1,
  30,
  0.4,
  'Featherweight connector. Holds a light top module.',
  'Snaps if you look at it wrong.',
  ['air'],
  { k: 'frame', c: '#8a7a4a', s: 'x' },
  { price: 6 }
);
D(
  'rollcage',
  'Roll Cage',
  'struct',
  1,
  'b',
  1,
  80,
  2,
  'Tubular cage. Hard to flip and takes 30% less crash damage.',
  'Heavier than a plain frame.',
  ['flip', 'def'],
  { k: 'frame', c: '#a35a2a', s: 'hub' },
  { flipRes: 1, res: { ram: 0.3 } }
);
D(
  'honeycomb',
  'Honeycomb Frame',
  'struct',
  2,
  'b',
  1,
  90,
  0.8,
  'Light cells that soak blasts: explosions do half damage.',
  'Bullets punch straight through.',
  ['def', 'expl'],
  { k: 'frame', c: '#c9a227', s: 'mesh' },
  { res: { expl: 0.5, light: -0.3 } }
);
D(
  'titanframe',
  'Titanium Frame',
  'struct',
  3,
  'b',
  2,
  130,
  1.5,
  'Light, tough and holds heavy modules.',
  'Expensive.',
  ['def'],
  { k: 'frame', c: '#b9c4cc', s: 'beam' },
  { res: { light: 0.3, kin: 0.2 }, price: 110 }
);
D(
  'offroad',
  'Off-road Tyre',
  'move',
  0,
  'b',
  0,
  60,
  1.3,
  'Chunky tread. Grips well and shrugs off crashes.',
  'Lower top speed than road wheels.',
  ['scrap'],
  { k: 'wheel', v: 'monster' },
  { drive: { p: 6, g: 1.25, top: 215 }, res: { ram: 0.3 }, price: 14 }
);
D(
  'racing',
  'Racing Wheel',
  'move',
  2,
  'b',
  0,
  30,
  0.7,
  'Light racing rim. Highest top speed of any wheel.',
  'Fragile and slides in corners.',
  ['air', 'slip'],
  { k: 'wheel', v: 'slick' },
  { drive: { p: 8, g: 0.8, top: 340 } }
);
D(
  'studded',
  'Studded Ice Tyre',
  'move',
  1,
  'b',
  0,
  50,
  1.2,
  'Metal studs bite into ice and oil: your grip never drops below 90%.',
  'Slightly slower on normal ground.',
  ['cold'],
  { k: 'wheel', v: 'spiked' },
  { drive: { p: 6, g: 1, top: 235 }, studs: 1 }
);
D(
  'nitro',
  'Nitro Injector',
  'move',
  2,
  'b',
  0,
  55,
  1.5,
  'Shift fires one huge 1.4 s burst the way it faces.',
  '9 s recharge, and it explodes when destroyed.',
  ['air', 'pinball'],
  { k: 'jet' },
  { dir: 1, booster: 1, nitro: 1, boom: { r: 55, dmg: 45 }, glow: '#7fd0ff' }
);
D(
  'stabilizer',
  'Stabilizer Fin',
  'move',
  1,
  'b',
  1,
  50,
  1,
  '+15% turning and much harder to flip.',
  'Takes a slot armor could use.',
  ['flip', 'air'],
  { k: 'gyro' },
  { turn: 0.15, flipRes: 1 }
);
D(
  'parachute',
  'Parachute Brake',
  'move',
  1,
  't',
  1,
  40,
  0.8,
  'Soft landings: no flips, 65% less landing damage. Reverse at speed for a hard drag-chute stop.',
  'You can’t reverse quickly while moving fast.',
  ['air', 'def'],
  { k: 'chute' },
  { parachute: 1 }
);
D(
  'rivet',
  'Rivet Gun',
  'weapon',
  0,
  't',
  1,
  35,
  1,
  'Rapid rivets that work on anything.',
  'Short range.',
  ['gun', 'scrap'],
  { k: 'gun', b: 1, l: 1, w: 0.11, c: '#7a6a5a', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', dmg: 6, rate: 6, spd: 720, rng: 420, spr: 0.07, dt: 'kin', cls: 'ballistic' })
  }
);
D(
  'flak',
  'Flak Cannon',
  'weapon',
  2,
  't',
  2,
  65,
  2.5,
  'Bursting shells that splash on impact.',
  'Each shell hits softer than a cannon.',
  ['gun', 'expl'],
  { k: 'gun', b: 1, l: 1.35, w: 0.18, c: '#5a6650', v: 'brake' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'shell',
      dmg: 26,
      rate: 1.3,
      spd: 640,
      rng: 640,
      spr: 0.05,
      splash: 38,
      dt: 'expl',
      recoil: 25,
      cls: 'expl'
    })
  }
);
D(
  'grenade',
  'Grenade Launcher',
  'weapon',
  1,
  't',
  1,
  45,
  1.5,
  'Lobs grenades over cover. Shorter minimum range than a mortar.',
  'Small blasts.',
  ['expl'],
  { k: 'mortar', c: '#5a5a3a' },
  { ...W({ kind: 'lob', dmg: 27, rate: 1, rng: 540, min: 90, splash: 50, dt: 'expl', cls: 'expl' }) }
);
D(
  'inferno',
  'Inferno Projector',
  'weapon',
  3,
  't',
  2,
  70,
  2.5,
  'A huge gout of fire. Melts anything close.',
  'Even shorter reach than a flamethrower.',
  ['fire'],
  { k: 'gun', b: 1, l: 1.05, w: 0.26, c: '#a0301a', h: 'tank', v: 'flame' },
  { dir: 1, front: 1, glow: '#ff8a3a', ...W({ kind: 'flame', dps: 95, rng: 150, dt: 'fire', cls: 'fire' }) }
);
D(
  'sawlauncher',
  'Saw-blade Launcher',
  'weapon',
  2,
  't',
  2,
  60,
  2.5,
  'Fires spinning blades that ricochet twice.',
  'Slow reload.',
  ['melee', 'pinball'],
  { k: 'gun', b: 1, l: 1.15, w: 0.28, c: '#9aa3ab', h: 'box', v: 'tire' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'bounce',
      dmg: 32,
      rate: 0.8,
      spd: 620,
      rng: 1400,
      bounces: 2,
      dt: 'melee',
      cls: 'ballistic'
    })
  }
);
D(
  'bowling',
  'Bowling Ball Launcher',
  'weapon',
  1,
  't',
  2,
  60,
  3,
  'Heavy balls that hit like a truck and shove targets across the arena.',
  'Slow and loopy.',
  ['pinball', 'flip'],
  { k: 'bowl' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'shell',
      dmg: 28,
      rate: 0.6,
      spd: 430,
      rng: 700,
      spr: 0.02,
      knock: 3,
      dt: 'kin',
      recoil: 30,
      cls: 'ballistic'
    })
  }
);
D(
  'snowball',
  'Snowball Cannon',
  'weapon',
  1,
  't',
  1,
  45,
  1.5,
  'Packed snowballs freeze what they hit for a second.',
  'Hardly any damage.',
  ['cold'],
  { k: 'gun', b: 1, l: 1.05, w: 0.22, c: '#cfe8f5', h: 'tank', v: 'ice' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'shell',
      dmg: 10,
      rate: 1.4,
      spd: 560,
      rng: 560,
      spr: 0.03,
      freeze: 1.2,
      dt: 'kin',
      cls: 'none'
    })
  }
);
D(
  'sparkcoil',
  'Spark Coil',
  'weapon',
  1,
  't',
  1,
  40,
  1,
  'A pocket tesla coil. Zaps nearby targets on its own.',
  'Tiny range, chains only once.',
  ['energy'],
  { k: 'tesla' },
  {
    glow: '#bfe9ff',
    ...W({ kind: 'tesla', dmg: 12, cd: 0.9, rng: 170, chain: 1, dt: 'energy', cls: 'energy' })
  }
);
D(
  'bunker',
  'Bunker Buster',
  'weapon',
  3,
  't',
  2,
  60,
  3,
  'One enormous rocket with a huge blast.',
  'Five-second reload.',
  ['expl'],
  { k: 'pod', n: 1, c: '#4a4a3a' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'rocket',
      dmg: 120,
      burst: 1,
      reload: 5,
      spd: 280,
      rng: 900,
      spr: 0.02,
      splash: 85,
      dt: 'expl',
      cls: 'expl'
    })
  }
);
D(
  'hive',
  'Drone Hive',
  'weapon',
  4,
  't',
  2,
  80,
  3,
  'Launches three attack drones that orbit you.',
  'Drones are fragile and die with the hive.',
  ['gun', 'air'],
  { k: 'drone' },
  { drones: 3, glow: '#ff8a7a' }
);
D(
  'shears',
  'Hydraulic Shears',
  'melee',
  1,
  'b',
  0,
  90,
  2,
  'Fast snipping bites, 45 damage each.',
  'Short reach.',
  ['melee', 'hook'],
  { k: 'jaws' },
  { dir: 1, front: 1, mel: { hit: 45, cd: 0.6 } }
);
D(
  'blender',
  'Blender Drum',
  'melee',
  2,
  'b',
  0,
  120,
  3,
  'Spinning cutter drum. High contact damage.',
  'Needs a sturdy mount.',
  ['melee'],
  { k: 'saw' },
  { dir: 1, front: 1, mel: { dps: 110 } }
);
D(
  'batram',
  'Battering Ram',
  'melee',
  1,
  'b',
  0,
  170,
  5,
  'Iron ram head. Huge crash damage.',
  'Very heavy for one cell.',
  ['melee', 'pinball'],
  { k: 'spike' },
  { dir: 1, ram: 9, front: 1 }
);
D(
  'tusk',
  'Tusk Lance',
  'melee',
  3,
  'b',
  0,
  130,
  2.5,
  'Two cells of hardened tusk. The deadliest ram tip in the game.',
  'Takes extra damage from crashes that miss the tip.',
  ['melee', 'pinball'],
  { k: 'lance' },
  { dir: 1, size: 2, lance: 14, front: 1, res: { ram: -0.3 } }
);
D(
  'banana',
  'Banana Peel Dropper',
  'chaos',
  0,
  't',
  1,
  30,
  0.5,
  'Z drops a banana peel. Cars that drive over it spin out.',
  'Your own car slips on them too.',
  ['slip'],
  { k: 'banana' },
  { dir: 1, spray: 'banana', front: 1, price: 16 }
);
D(
  'mines',
  'Mine Layer',
  'chaos',
  2,
  't',
  1,
  45,
  1.5,
  'Z drops a mine (max 4). It arms after a second and blows up under enemies.',
  'Mines don’t move, so smart drivers avoid them.',
  ['expl', 'slip'],
  { k: 'mine' },
  { dir: 1, spray: 'mine', front: 1 }
);
D(
  'bombbay',
  'Bomb Bay',
  'chaos',
  3,
  'b',
  1,
  70,
  2,
  'Drops a bomb every 0.35 s while you are airborne.',
  'Useless without ramps, jumps or trampolines.',
  ['air', 'expl'],
  { k: 'bombbay' },
  { bombbay: 1 }
);
D(
  'wedge',
  'Launch Wedge',
  'chaos',
  2,
  'b',
  0,
  110,
  2,
  'Sloped nose. Cars that crash into it get launched into the air.',
  'No damage of its own.',
  ['flip', 'pinball'],
  { k: 'plate', c: '#c9a227', p: 'slope' },
  { dir: 1, wedge: 1, front: 1 }
);
D(
  'composite',
  'Composite Plate',
  'defense',
  2,
  'b',
  1,
  150,
  2,
  'Layered plate. Resists bullets, shells and blasts.',
  'Pricey for what it weighs.',
  ['def'],
  { k: 'plate', c: '#5f6a5a', p: 'heavy' },
  { res: { light: 0.5, kin: 0.4, expl: 0.3 } }
);
D(
  'foam',
  'Crash Foam',
  'defense',
  0,
  'b',
  0,
  60,
  0.5,
  'Squishy padding. Crashes do 85% less.',
  'Bullets go straight through.',
  ['pinball', 'def'],
  { k: 'bumper' },
  { dir: 1, bumper: 1, res: { ram: 0.85, light: -0.2 }, price: 12 }
);
D(
  'mirror',
  'Mirror Plate',
  'defense',
  3,
  'b',
  1,
  110,
  2,
  'Polished plating. Beams, lasers and lightning do 80% less.',
  'Shatters under bullets.',
  ['energy', 'def'],
  { k: 'plate', c: '#d8e4ec', p: 'slope' },
  { res: { energy: 0.8, light: -0.3 }, glow: '#e6f4ff' }
);
D(
  'flare',
  'Flare Launcher',
  'defense',
  1,
  't',
  1,
  35,
  0.8,
  'V fires flares. Homing missiles chase them instead of you.',
  'Does nothing against unguided weapons.',
  ['def', 'air'],
  { k: 'flare' },
  { counter: 'flare' }
);
D(
  'bubble',
  'Bubble Shield',
  'defense',
  4,
  't',
  2,
  60,
  2,
  'A 360° shield that soaks 100 damage from every side.',
  'Weaker than a directional shield and needs 5 s to recharge.',
  ['energy', 'def'],
  { k: 'bubble' },
  { shield: 1, bubble: 1, glow: '#9fd8ff' }
);
D(
  'emp',
  'EMP Pulse',
  'defense',
  3,
  't',
  1,
  45,
  1.5,
  'V knocks out nearby enemy weapons and shields for 2.5 s.',
  'Long cooldown, short range.',
  ['energy', 'def'],
  { k: 'emp' },
  { counter: 'emp', glow: '#7fe0ff' }
);
D(
  'optics',
  'Long-Range Optics',
  'utility',
  2,
  't',
  1,
  30,
  1,
  '+35% weapon range.',
  'Glass breaks easily: bullets do double damage to it.',
  ['gun'],
  { k: 'radar' },
  { aura: { range: 0.35 }, auraMax: 1, res: { light: -1 } }
);
D(
  'autoloader',
  'Autoloader',
  'utility',
  1,
  'b',
  1,
  50,
  1.5,
  '+10% fire rate and +5% ballistic damage each (max 2).',
  'Explodes when destroyed.',
  ['gun'],
  { k: 'ammo' },
  { aura: { rate: 0.1, dmg_ballistic: 0.05 }, auraMax: 2, boom: { r: 45, dmg: 40 } }
);
D(
  'capacitor',
  'Capacitor Bank',
  'utility',
  2,
  'b',
  1,
  50,
  1.5,
  '+20% energy weapon damage each (max 2).',
  'Discharges violently when destroyed.',
  ['energy'],
  { k: 'chip' },
  { aura: { dmg_energy: 0.2 }, auraMax: 2, boom: { r: 55, dmg: 50 }, glow: '#7fe0ff' }
);
D(
  'flashbang',
  'Flash-bang',
  'utility',
  2,
  't',
  1,
  35,
  0.8,
  'V blinds nearby rivals for 2.5 s: their screen whites out and bots lose their aim.',
  'Shares the countermeasure cooldown.',
  ['def'],
  { k: 'flare', v: 'flash' },
  { counter: 'flash' }
);
D(
  'coinmagnet',
  'Coin Magnet',
  'utility',
  1,
  't',
  1,
  35,
  0.8,
  'Grabs arena pickups from three times as far away.',
  'Does nothing in a straight fight.',
  ['econ'],
  { k: 'magnet' },
  { coinmag: 1 }
);
D(
  'medic',
  'Field Medic',
  'utility',
  3,
  't',
  1,
  55,
  1.5,
  'After 3 s without taking damage, heals every part 1.5% per second.',
  '400 HP of healing per round.',
  ['def'],
  { k: 'medic' },
  { medic: 1, glow: '#5cc38f' }
);
/* Fifty playable modules. Shapes use local grid cells; rotation is shared by garage and combat. */
const PLAN_ROWS = [
  [
    'tinder',
    'Tinder Nozzle',
    'weap',
    't',
    0,
    { wpn: { kind: 'flame', cls: 'fire', rng: 125, dps: 22 } },
    'Short flame jet for compact fire builds.',
    'Very short range.'
  ],
  [
    'emberwheel',
    'Ember Wheel',
    'move',
    'b',
    0,
    { drive: { p: 5, g: 0.7, top: 370 } },
    'Sharp turns leave a brief trail of burning embers.',
    'Less grip than a standard wheel.'
  ],
  [
    'ashtile',
    'Ash Tile',
    'def',
    'b',
    0,
    {},
    'Breaking this plate leaves a small burning ash patch.',
    'Fragile; activates once.'
  ],
  [
    'furnaceskate',
    'Furnace Skate',
    'move',
    'b',
    1,
    { drive: { p: 3, g: 0.4, top: 350, slide: 1 } },
    'Sliding heats the skid; hot contact burns nearby parts.',
    'Needs movement and time to heat up.'
  ],
  [
    'cinderfan',
    'Cinder Fan',
    'util',
    't',
    1,
    {},
    'Fire pushes nearby fire patches forward.',
    'Almost no direct damage.'
  ],
  [
    'firebreak',
    'Firebreak Rail',
    'def',
    'b',
    1,
    { fireAura: 1, res: { fire: 0.8, expl: -0.2 } },
    'A long fireproof flank clears flames along its cells.',
    'Heavy and vulnerable to blasts.'
  ],
  [
    'popcorn',
    'Popcorn Burner',
    'weap',
    't',
    2,
    { wpn: { kind: 'bounce', cls: 'fire', rng: 380, spd: 420, dmg: 8, rate: 1.3 } },
    'A scatter of hot bouncing kernels.',
    'Wide spread and short range.'
  ],
  [
    'kilnram',
    'Kiln Ram',
    'melee',
    'b',
    2,
    { mel: { dps: 18, reach: 1.4 } },
    'Contact heats the ram until it scorches the enemy.',
    'Heavy nose; needs time to heat.'
  ],
  [
    'dragon',
    'Dragon Bellows',
    'weap',
    't',
    3,
    { wpn: { kind: 'flame', cls: 'fire', rng: 280, dps: 115 } },
    'Charges a broad, short blast of fire.',
    'Visible wind-up and sluggish turning while charging.'
  ],
  [
    'campfork',
    'Campfire Fork',
    'melee',
    'b',
    2,
    { mel: { dps: 12, reach: 1 } },
    'Both arms burn parts touching the occupied corner cells.',
    'Open corner leaves a weak spot.'
  ],
  [
    'frostbead',
    'Frost Bead',
    'chaos',
    'b',
    0,
    {},
    'Drop a single ice bead that trips the first passing wheel.',
    'Small area; one use per bead.'
  ],
  [
    'snowcap',
    'Snowcap Plate',
    'def',
    'b',
    0,
    { res: { fire: 0.3 } },
    'Melts to cancel the first fire hit on this plate.',
    'One fire save per round.'
  ],
  [
    'chilltap',
    'Chill Tap',
    'melee',
    'b',
    0,
    { mel: { dps: 8, reach: 0.8 } },
    'Close contact chills one connection, increasing incoming melee damage.',
    'Very short reach; never stuns the cockpit.'
  ],
  [
    'iceskate',
    'Ice Skate',
    'move',
    'b',
    1,
    { drive: { p: 5, g: 0.45, top: 430, slide: 1 } },
    'A narrow runner for long controlled drifts.',
    'Weak braking.'
  ],
  [
    'slush',
    'Slush Slinger',
    'weap',
    't',
    1,
    { wpn: { kind: 'water', cls: 'cold', rng: 270, dps: 3, push: 10 } },
    'Fire sprays slippery slush and extinguishes flames.',
    'Very little direct damage.'
  ],
  [
    'icicle',
    'Icicle Lance',
    'melee',
    'b',
    1,
    { mel: { hit: 24, cd: 1.2, reach: 1.6 } },
    'A long ice nose shatters into frost on a hard impact.',
    'Consumed by a sufficiently hard ram.'
  ],
  [
    'snowblower',
    'Snowblower',
    'util',
    't',
    2,
    {},
    'Fire blows loose scrap aside and lays a slippery snow lane.',
    'Slow rotation; highly visible.'
  ],
  [
    'frostdrum',
    'Frost Drum',
    'melee',
    'b',
    2,
    { mel: { dps: 12, reach: 1.2 } },
    'Rolling contact chills a broad enemy flank.',
    'Only effective at close range.'
  ],
  [
    'glacier',
    'Glacier Press',
    'melee',
    'b',
    3,
    { mel: { hit: 45, cd: 2.5, reach: 1.5 } },
    'A visible press slam deals extra damage to chilled parts.',
    'Slow wind-up; easy to dodge.'
  ],
  [
    'icetongs',
    'Ice Tongs',
    'melee',
    'b',
    2,
    { mel: { dps: 8, reach: 1 } },
    'Corner arms chill two nearby contact points.',
    'Needs careful corner placement.'
  ],
  [
    'pouch',
    'Salvage Pouch',
    'util',
    'b',
    0,
    {},
    'Stores three world scrap pieces for a capped end-round bonus.',
    'Small capacity; no passive income.'
  ],
  [
    'bottlecap',
    'Bottlecap Shield',
    'def',
    'b',
    0,
    {},
    'Stored world scrap absorbs a small projectile.',
    'Consumes cargo to protect this plate.'
  ],
  [
    'prizebell',
    'Prize Bell',
    'util',
    't',
    0,
    {},
    'Horn near an enemy briefly expands scrap pickup range.',
    'Close pass required; long cooldown.'
  ],
  [
    'basket',
    'Roller Basket',
    'util',
    'b',
    1,
    {},
    'Collects scrap only when you drive across it; capacity six.',
    'Cargo adds weight.'
  ],
  [
    'spitter',
    'Scrap Spitter',
    'weap',
    't',
    1,
    { wpn: { kind: 'bullet', cls: 'ballistic', rng: 410, spd: 580, dmg: 5, rate: 1.8, spr: 0.18 } },
    'Uses collected scrap for stronger, varied shots.',
    'Weak reserve shots without cargo.'
  ],
  [
    'conveyor',
    'Sorting Conveyor',
    'util',
    'b',
    1,
    {},
    'Fire selects ammo or repair processing for one adjacent module.',
    'Exposed line; consumes cargo.'
  ],
  [
    'hopper',
    'Cargo Hopper',
    'util',
    'b',
    2,
    {},
    'Stores twelve world scrap pieces. Heavy hits spill the cargo.',
    'Full cargo weighs more and can be stolen.'
  ],
  [
    'patchbench',
    'Patchwork Bench',
    'util',
    't',
    2,
    {},
    'Stopped and unharmed, turns cargo into nearby part repairs.',
    'No cockpit repairs; damage interrupts work.'
  ],
  [
    'salvageclaw',
    'Salvage Claw',
    'util',
    't',
    3,
    {},
    'Action grabs a loose wreck as a temporary shield.',
    'Weight slows acceleration and turning.'
  ],
  [
    'collectfork',
    'Collection Fork',
    'util',
    'b',
    2,
    {},
    'Three ground contact points collect world scrap; capacity eight.',
    'No magnet; weak structure.'
  ],
  [
    'soap',
    'Soap Pebble',
    'chaos',
    'b',
    0,
    {},
    'Drop a small soap pebble that bursts under the first passing car.',
    'Small, avoidable slick.'
  ],
  [
    'gripstud',
    'Grip Stud',
    'move',
    'b',
    0,
    {},
    'Anchor deploys a pin to brake sideways movement.',
    'Reduces speed while deployed.'
  ],
  [
    'rubberduck',
    'Rubber Duck Decoy',
    'def',
    't',
    0,
    {},
    'Counter launches a squeaking duck with a tiny slippery trail.',
    'Fragile decoy; no damage.'
  ],
  [
    'soaproller',
    'Soap Roller',
    'move',
    'b',
    1,
    { drive: { p: 3, g: 0.65, top: 350 } },
    'At speed, drops a narrow soap trail.',
    'Your own trail can trip you.'
  ],
  [
    'driftfin',
    'Drift Fin',
    'move',
    'b',
    1,
    { turn: 0.18 },
    'Stabilizes angular drift at speed without stopping the slide.',
    'Fragile and ineffective when slow.'
  ],
  [
    'squeegee',
    'Squeegee Rail',
    'def',
    'b',
    1,
    {},
    'Clears oil, soap and slush along its occupied cells.',
    'Does not clear mines.'
  ],
  [
    'curling',
    'Curling Stone',
    'weap',
    't',
    2,
    { wpn: { kind: 'bounce', cls: 'ballistic', rng: 620, spd: 240, dmg: 20, rate: 0.36, knock: 8 } },
    'Fire sends a slow sliding stone that shoves cars aside.',
    'Slow shot; little damage.'
  ],
  [
    'foambath',
    'Foam Bath',
    'chaos',
    'b',
    2,
    {},
    'Drop creates a round soap zone with visible bubbles.',
    'Brief effect; affects you too.'
  ],
  [
    'zamboni',
    'Zamboni Deck',
    'move',
    'b',
    3,
    { drive: { p: 7, g: 0.9, top: 270 } },
    'A large cleaning deck leaves slippery ice behind.',
    'Heavy and slow to accelerate.'
  ],
  [
    'driftcradle',
    'Drift Cradle',
    'move',
    'b',
    2,
    { drive: { p: 3, g: 0.6, top: 350, slide: 1 } },
    'Side impacts become controlled spins around the corner skid.',
    'Little protection from frontal hits.'
  ],
  [
    'cleat',
    'Cable Cleat',
    'def',
    'b',
    0,
    {},
    'Nearby friendly cable roots resist incoming tension.',
    'Only protects its local neighborhood.'
  ],
  [
    'shackle',
    'Snap Shackle',
    'struct',
    'b',
    0,
    {},
    'A break link sacrifices itself to release excessive cable tension.',
    'Lost part stays lost for the round.'
  ],
  [
    'lasso',
    'Lasso Reel',
    'util',
    't',
    0,
    {},
    'Action lassos one small scrap piece and drags it home.',
    'Cannot grab a complete car.'
  ],
  [
    'grapple',
    'Grapple Skate',
    'move',
    'b',
    1,
    {},
    'Action hooks an arena anchor for a sharp swinging turn.',
    'Tension limit breaks the cable.'
  ],
  [
    'towhook',
    'Tow Hook',
    'util',
    'b',
    1,
    {},
    'Action tethers a loose wreck close to your flank.',
    'Towed mass reduces acceleration.'
  ],
  [
    'sweeper',
    'Cable Sweeper',
    'def',
    'b',
    1,
    {},
    'Cuts cables touching its long physical rail.',
    'Only works at contact range.'
  ],
  [
    'yoyo',
    'Yo-Yo Winch',
    'weap',
    't',
    2,
    {},
    'Fire launches a weight; its visible return path strikes a second time.',
    'The cable or returning weight can be blocked.'
  ],
  [
    'rescue',
    'Rescue Crane',
    'util',
    't',
    2,
    {},
    'Anchor plants a ground cable and rights an overturned car.',
    'Requires low speed and a brief stationary pause.'
  ],
  [
    'pendulum',
    'Pendulum Rig',
    'melee',
    'b',
    3,
    {},
    'A big tethered weight swings with steering and inertia.',
    'Difficult to control; weak cable root.'
  ],
  [
    'towyoke',
    'Twin Tow Yoke',
    'weap',
    't',
    2,
    {},
    'Action fires two weak towing lines from the arms.',
    'Both paths must be clear; almost no damage.'
  ]
];
const PLAN_SHAPES = [
  [[0, 0]],
  [[0, 0]],
  [[0, 0]],
  [
    [0, 0],
    [0, -1]
  ],
  [
    [0, 0],
    [0, -1]
  ],
  [
    [0, 0],
    [0, -1],
    [0, -2]
  ],
  [
    [0, 0],
    [1, 0],
    [0, -1],
    [1, -1]
  ],
  [
    [0, 0],
    [1, 0],
    [0, -1],
    [1, -1]
  ],
  [
    [0, 0],
    [1, 0],
    [0, -1],
    [1, -1],
    [0, -2],
    [1, -2]
  ],
  [
    [0, 0],
    [0, -1],
    [1, -1]
  ]
];
const PLAN_COLORS = { fire: '#ff824b', cold: '#8bdeed', econ: '#72d79d', slip: '#e5d06c', hook: '#bbacff' };
PLAN_ROWS.forEach((r, i) => {
  const [id, name, cat, layer, rar, props, desc, con] = r,
    tag = ['fire', 'cold', 'econ', 'slip', 'hook'][Math.floor(i / 10)],
    shape = PLAN_SHAPES[i % 10].map(c => c.slice());
  if (i === 29 || i === 49) shape.splice(0, shape.length, [0, 0], [-1, -1], [0, -1], [1, -1]);
  const cells = shape.length,
    front = !!(props.wpn || props.mel),
    mnt = layer === 't' ? (cells >= 4 ? 2 : 1) : cat === 'move' || cat === 'melee' || cat === 'chaos' ? 0 : 1;
  D(
    id,
    name,
    { weap: 'weapon', def: 'defense', util: 'utility' }[cat] || cat,
    rar,
    layer,
    mnt,
    Math.round((cat === 'def' ? 68 : 48) * Math.sqrt(cells)),
    Math.round((cat === 'move' ? 1.8 : 1.3) * cells * 10) / 10,
    desc,
    con,
    [tag, ...(props.mel ? ['melee'] : cat === 'def' ? ['def'] : [])],
    { k: 'plan', c: PLAN_COLORS[tag] },
    {
      ...props,
      ...(props.wpn ? { wpn: { dt: 'kin', ...props.wpn } } : {}),
      size: cells,
      shape,
      shapeName: i % 10 === 9 ? (i === 29 || i === 49 ? 'T 3×2' : 'L 2×2') : null,
      dir: front ? 1 : 0,
      front: front ? 1 : 0,
      plan: true,
      branch: tag
    }
  );
});

/* Odd parts: strange junk that still makes physical sense. Each has its own shape and glyph. */
const ODD_ROWS = [
  // id, name, cat, rar, layer, props, shape, glyph, color, desc, con
  [
    'kazoo',
    'Kazoo Horn',
    'weapon',
    0,
    't',
    { wpn: { kind: 'bullet', cls: 'ballistic', dt: 'kin', dmg: 2.5, rate: 7, rng: 300, spd: 520, spr: 0.32 } },
    [[0, 0]],
    '🎺',
    '#e5d06c',
    'Sprays tiny brass pellets and an unbearable noise.',
    'Pellets barely scratch armour.'
  ],
  [
    'bubbler',
    'Bubble Blower',
    'weapon',
    0,
    't',
    { wpn: { kind: 'bounce', cls: 'ballistic', dt: 'kin', dmg: 7, rate: 1.6, rng: 360, spd: 200, knock: 3 } },
    [[0, 0]],
    '🫧',
    '#8bdeed',
    'Slow soapy bubbles that bounce around and nudge cars.',
    'Slow enough to dodge while yawning.'
  ],
  [
    'mattress',
    'Mattress Plate',
    'defense',
    0,
    'b',
    { res: { kin: 0.3, melee: 0.35 } },
    [
      [0, 0],
      [1, 0]
    ],
    '🛏',
    '#c9b7ff',
    'A wide springy plate that soaks up rams and bullets.',
    'Burns like, well, a mattress.'
  ],
  [
    'nailbat',
    'Nail Bat',
    'melee',
    1,
    'b',
    { mel: { dps: 22, reach: 1.3 } },
    [
      [0, 0],
      [0, 1],
      [0, 2]
    ],
    '🏏',
    '#ff9a5c',
    'A three-cell bat full of nails. Point it forward.',
    'Long and easy to snap off.'
  ],
  [
    'teapot',
    'Teapot Turret',
    'weapon',
    1,
    't',
    { wpn: { kind: 'flame', cls: 'fire', dt: 'fire', dps: 30, rng: 170 } },
    [[0, 0]],
    '🫖',
    '#ff824b',
    'Scalding steam at close range. Very British.',
    'Short reach; tea time takes a while.'
  ],
  [
    'shopcart',
    'Shopping Cart',
    'move',
    1,
    'b',
    { drive: { p: 5, g: 0.45, top: 440 } },
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1]
    ],
    '🛒',
    '#9fb6c8',
    'A 2×2 cart: fast, light, and one wheel always wobbles.',
    'Poor grip in corners.'
  ],
  [
    'fridge',
    'Fridge Door',
    'defense',
    2,
    'b',
    { res: { fire: 0.7, kin: 0.2 } },
    [
      [0, 0],
      [0, 1],
      [0, 2]
    ],
    '🧊',
    '#8bdeed',
    'A tall 1×3 slab that shrugs off fire. Still cold inside.',
    'Heavy; explosions crack it.'
  ],
  [
    'tuba',
    'Tuba Cannon',
    'weapon',
    2,
    't',
    { wpn: { kind: 'shell', cls: 'ballistic', dt: 'kin', dmg: 36, rate: 0.8, rng: 600, spd: 650, knock: 7 } },
    [
      [0, 0],
      [0, -1],
      [1, 0],
      [1, -1]
    ],
    '📯',
    '#ffb423',
    'A 2×2 brass cannon. Every shot plays one low note.',
    'Needs a heavy socket.'
  ],
  [
    'zipsaw',
    'Zipper Saw',
    'melee',
    2,
    'b',
    { mel: { dps: 38, reach: 1.2 } },
    [
      [0, 0],
      [1, 0],
      [2, 0]
    ],
    '🪚',
    '#cdd6df',
    'A wide 3×1 saw blade that zips across the whole nose.',
    'Wide nose is also a wide target.'
  ],
  [
    'mirrorball',
    'Mirror Ball Turret',
    'weapon',
    3,
    't',
    { wpn: { kind: 'bullet', cls: 'energy', dt: 'kin', dmg: 12, rate: 9, rng: 380, spd: 700, spr: 0.9 } },
    [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1]
    ],
    '🪩',
    '#ff6ad5',
    'Fires light shards in every direction. Party in the arena.',
    'Aim? Never heard of her.'
  ],
  [
    'piano',
    'Piano Dropper',
    'weapon',
    3,
    't',
    { wpn: { kind: 'lob', cls: 'expl', dt: 'expl', dmg: 48, rate: 0.32, rng: 700, min: 180, splash: 66 } },
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, -1]
    ],
    '🎹',
    '#f2f6fc',
    'Lobs a whole upright piano. The landing is out of tune.',
    'Very slow reload; minimum range.'
  ],
  [
    'anvil',
    'Anvil Ballast',
    'defense',
    3,
    'b',
    { res: { expl: 0.45, kin: 0.3 } },
    [
      [0, 0],
      [-1, -1],
      [0, -1],
      [1, -1]
    ],
    '⚒',
    '#7d8896',
    'A T-shaped anvil that eats explosions and anchors the car.',
    'Enormously heavy.'
  ],
  [
    'toaster',
    'Toaster Cannon',
    'weapon',
    4,
    't',
    { wpn: { kind: 'bounce', cls: 'fire', dt: 'fire', dmg: 44, rate: 1.5, rng: 520, spd: 430, knock: 4 } },
    [
      [0, 0],
      [1, 0]
    ],
    '🍞',
    '#ff9a3c',
    'Launches two scorching slices of toast that bounce off walls.',
    'Smells amazing; reveals your position.'
  ],
  [
    'hamster',
    'Hamster Wheel',
    'move',
    4,
    'b',
    { drive: { p: 10, g: 0.85, top: 500 } },
    [
      [0, 0],
      [0, -1],
      [0, 1]
    ],
    '🐹',
    '#ffcf8a',
    'A 1×3 wheel powered by a very motivated hamster.',
    'Hamster demands snacks between rounds.'
  ],
  [
    'gnome',
    'Lucky Gnome',
    'defense',
    4,
    't',
    { res: { kin: 0.25, fire: 0.25, expl: 0.25, melee: 0.25 } },
    [[0, 0]],
    '🧙',
    '#3fe0a0',
    'While the gnome stands, your whole car takes 8% less damage. Nobody knows why.',
    'Tiny, fragile and the first thing everyone shoots.'
  ]
];
ODD_ROWS.forEach(([id, name, cat, rar, layer, props, shape, glyph, col, desc, con]) => {
  const cells = shape.length,
    front = !!props.mel,
    mnt = layer === 't' ? (cells >= 4 ? 2 : 1) : cat === 'move' || cat === 'melee' ? 0 : 1;
  const tags = [
    props.wpn?.cls === 'fire' || id === 'teapot' ? 'fire' : null,
    id === 'fridge' || id === 'bubbler' ? 'cold' : null,
    props.mel ? 'melee' : null,
    cat === 'defense' ? 'def' : null,
    props.wpn?.cls === 'expl' ? 'expl' : null
  ].filter(Boolean);
  D(
    id,
    name,
    cat,
    rar,
    layer,
    mnt,
    Math.round((cat === 'defense' ? 78 : 52) * Math.sqrt(cells)),
    Math.round((id === 'anvil' ? 4 : cat === 'move' ? 1.6 : 1.3) * cells * 10) / 10,
    desc,
    con,
    tags,
    { k: 'plan', c: col },
    {
      ...props,
      size: cells,
      shape: shape.map(c => c.slice()),
      dir: front ? 1 : 0,
      front: front ? 1 : 0,
      plan: true,
      branch: 'odd',
      glyph,
      odd: true
    }
  );
});

/* The four joint modules. Duel/Gauntlet: normal draftable parts with a catch; Sandbox: everything. */
D(
  'hinge',
  'Hinge',
  'struct',
  1,
  'b',
  1,
  55,
  1.4,
  'Hold its action to swing everything beyond the hinge 90°. Flip jaws, slap doors, swat cars.',
  'Weak joint: break it and the whole swinging side falls off.',
  ['joint'],
  { k: 'joint' },
  { dir: 1, joint: 1 }
);
D(
  'rotator',
  'Rotator',
  'struct',
  2,
  'b',
  1,
  60,
  2,
  'Spins everything beyond it nonstop. Hold its action to reverse. Blades on a stick, anyone?',
  'Dizzying: the car turns 10% slower.',
  ['joint'],
  { k: 'joint' },
  { dir: 1, joint: 1, turn: -0.1 }
);
D(
  'hydraulic',
  'Hydraulic Ram',
  'struct',
  1,
  'b',
  1,
  60,
  1.8,
  'Hold its action to shove everything beyond it two cells out. Surprise lunge!',
  'Slow to extend, and the stretched rod is easy to snap.',
  ['joint', 'melee'],
  { k: 'joint' },
  { dir: 1, joint: 1 }
);
D(
  'suspension',
  'Suspension Spring',
  'struct',
  0,
  'b',
  1,
  50,
  1,
  'Springy mount: parts beyond it take 25% less ramming damage and bounce on hits.',
  'Boing. Parts on it wobble a little.',
  ['joint', 'def'],
  { k: 'joint' },
  { dir: 1, joint: 1 }
);

/* Shapes: sloped, thin, rounded and long chassis pieces. Same grid cells, different look and armour. */
D(
  'slopeplate',
  'Wedge Plate',
  'defense',
  0,
  'b',
  0,
  70,
  1.2,
  'Sloped armour: rams glance off (−30%) and blades skid (−20%).',
  'Too slanted to hold a top module.',
  ['def'],
  { k: 'shape', s: 'wedge' },
  { dir: 1, res: { ram: 0.3, melee: 0.2 } }
);
D(
  'halfplate',
  'Half Plate',
  'struct',
  0,
  'b',
  0,
  35,
  0.5,
  'Half the weight of a frame. Light builds and long arms love it.',
  'Paper thin, holds nothing on top.',
  [],
  { k: 'shape', s: 'half' },
  { dir: 1 }
);
D(
  'cornerpiece',
  'Corner Fillet',
  'struct',
  0,
  'b',
  0,
  50,
  0.8,
  'Rounds off a corner so walls and rams slide past (−15% ram).',
  'Fiddly: holds no top module.',
  ['def'],
  { k: 'shape', s: 'corner' },
  { dir: 1, res: { ram: 0.15 } }
);
D(
  'roundbumper',
  'Round Bumper',
  'defense',
  1,
  'b',
  1,
  90,
  1.5,
  'A fat round buffer: rams bounce off (−35% ram damage).',
  'Only room for a light top module.',
  ['def'],
  { k: 'shape', s: 'round' },
  { res: { ram: 0.35 } }
);
for (const L of [1, 2, 3, 4])
  D(
    `beam${L}`,
    `Scrap Beam ×${L}`,
    'struct',
    0,
    'b',
    1,
    45 * L,
    Math.round(0.8 * L * 10) / 10,
    `A straight ${L}-cell beam in one piece. In the garage, [ and ] change its length.`,
    'One piece: snap it anywhere and the whole beam goes.',
    [],
    { k: 'shape', s: 'beam' },
    { size: L, beam: L, dir: 1 }
  );

/* ---------- Scrapyard Expansion (Oct 2026): 18 new parts built on the existing mechanics ---------- */
D(
  'nailstorm',
  'Nail Storm',
  'weapon',
  0,
  't',
  1,
  35,
  1,
  'Sprays five nails at a time. Shreds whatever is right in front of it.',
  'Nails do not fly far.',
  ['gun'],
  { k: 'gun', b: 2, l: 0.9, w: 0.2, c: '#6b5a3a' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'bullet', n: 5, dmg: 4, rate: 2.2, spd: 620, rng: 260, spr: 0.35, dt: 'kin', cls: 'ballistic' })
  }
);
D(
  'bottlerocket',
  'Bottle Rocket Rack',
  'weapon',
  1,
  't',
  1,
  40,
  1.5,
  'Six cheap rockets in a wobbly fan.',
  'They go roughly where you point.',
  ['expl'],
  { k: 'pod', n: 6, c: '#c0392b' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'rocket',
      dmg: 15,
      burst: 6,
      reload: 3.6,
      spd: 300,
      rng: 700,
      spr: 0.26,
      splash: 30,
      dt: 'expl',
      cls: 'expl'
    })
  }
);
D(
  'boltthrower',
  'Bolt Thrower',
  'weapon',
  2,
  't',
  2,
  70,
  3,
  'A giant crossbow for steel bolts. Every hit lands like a door slamming.',
  'Slow to reload and needs a heavy mount.',
  ['gun', 'def'],
  { k: 'gun', b: 1, l: 1.5, w: 0.3, c: '#4a4f57', h: 'box' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'bullet',
      dmg: 48,
      rate: 0.6,
      spd: 1100,
      rng: 760,
      spr: 0.01,
      dt: 'kin',
      recoil: 22,
      cls: 'ballistic'
    })
  }
);
D(
  'pinballcannon',
  'Pinball Cannon',
  'weapon',
  1,
  't',
  1,
  45,
  1.5,
  'Steel balls that ricochet off walls and back into trouble.',
  'Bounces can come back for you.',
  ['pinball', 'gun'],
  { k: 'gun', b: 1, l: 1.1, w: 0.3, c: '#c58bff', v: 'flare' },
  { dir: 1, front: 1, ...W({ kind: 'bounce', dmg: 24, rate: 0.85, spd: 560, rng: 1500, dt: 'kin', cls: 'ballistic' }) }
);
D(
  'twinlaser',
  'Twin Laser',
  'weapon',
  2,
  't',
  1,
  45,
  1.5,
  'Two beams side by side. Burns through light armour.',
  'Hungry for a clear line of sight.',
  ['energy'],
  { k: 'gun', b: 2, l: 1.05, w: 0.12, c: '#2b5b7a', h: 'lens', tip: '#9ff' },
  {
    dir: 1,
    front: 1,
    glow: '#7fe0ff',
    ...W({ kind: 'beam', dps: 28, beams: 2, rng: 480, dt: 'energy', cls: 'energy' })
  }
);
D(
  'sparkplug',
  'Spark Plug',
  'weapon',
  0,
  't',
  1,
  30,
  0.8,
  'A tiny tesla coil that zaps anything close by itself.',
  'Very short reach, jumps to one more target at most.',
  ['energy'],
  { k: 'tesla' },
  { glow: '#bfe9ff', ...W({ kind: 'tesla', dmg: 11, cd: 0.9, rng: 150, chain: 1, dt: 'energy', cls: 'energy' }) }
);
D(
  'seekerdarts',
  'Seeker Darts',
  'weapon',
  1,
  't',
  1,
  40,
  1,
  'Little darts that steer towards the nearest car.',
  'Light hits; flares and smoke fool them.',
  ['expl', 'gun'],
  { k: 'pod', n: 3, c: '#3f6a3a' },
  {
    dir: 1,
    front: 1,
    ...W({ kind: 'homing', dmg: 16, rate: 1.3, spd: 380, rng: 820, splash: 18, dt: 'expl', cls: 'expl' })
  }
);
D(
  'hedgetrimmer',
  'Hedge Trimmer',
  'melee',
  0,
  'b',
  0,
  60,
  1.5,
  'Long buzzing blades with a little extra reach.',
  'Thin blades, easy to snap.',
  ['melee'],
  { k: 'saw' },
  { dir: 1, front: 1, mel: { dps: 52, reach: 1.3 } }
);
D(
  'pilefist',
  'Pile Fist',
  'melee',
  1,
  'b',
  0,
  90,
  2.5,
  'A pneumatic punch: 70 damage, faster than a hammer.',
  'Misses if the target slips away.',
  ['melee', 'flip'],
  { k: 'hammer' },
  { dir: 1, front: 1, mel: { hit: 70, cd: 0.8 } }
);
D(
  'twinsaw',
  'Twin Saw',
  'melee',
  2,
  'b',
  0,
  95,
  3,
  'Two saws on one hub. Very bad news for bumpers.',
  'Heavy, and loud enough that everyone knows you are coming.',
  ['melee'],
  { k: 'saw' },
  { dir: 1, front: 1, mel: { dps: 105 } }
);
D(
  'fender',
  'Rubber Fender',
  'defense',
  0,
  'b',
  1,
  120,
  1.5,
  'Soaks up rams: 45% less ram damage. Holds a light module.',
  'Bullets go straight through rubber.',
  ['def', 'pinball'],
  { k: 'plate', c: '#2b2b2b', p: 'bolts' },
  { res: { ram: 0.45 } }
);
D(
  'ablative',
  'Ablative Tiles',
  'defense',
  1,
  'b',
  1,
  130,
  2.2,
  'Ceramic tiles that flake off instead of melting: 35% less explosive and 25% less fire damage.',
  'Heavy, and no help against bullets.',
  ['def', 'fire'],
  { k: 'plate', c: '#7a6a5a', p: 'bolts' },
  { res: { expl: 0.35, fire: 0.25 } }
);
D(
  'chromeplate',
  'Chrome Shield Plate',
  'defense',
  2,
  'b',
  1,
  110,
  2,
  'Polished chrome: half damage from lasers, arcs and tesla.',
  'Scratches easily under bullets.',
  ['def', 'energy'],
  { k: 'plate', c: '#cfe8ff', p: 'bolts' },
  { res: { energy: 0.5 } }
);
D(
  'mudtyre',
  'Mud Tyre',
  'move',
  0,
  'b',
  0,
  50,
  1.3,
  'Chunky tread: grips on oil, soap and ice.',
  'Slower on a clean floor.',
  ['slip'],
  { k: 'wheel', v: 'road' },
  { drive: { p: 6, g: 1.45, top: 225 }, price: 14 }
);
D(
  'dragwheel',
  'Drag Wheel',
  'move',
  1,
  'b',
  0,
  40,
  0.9,
  'Bald and light: the fastest wheel in the yard.',
  'Slides around corners.',
  ['air'],
  { k: 'wheel', v: 'slick' },
  { drive: { p: 8, g: 0.8, top: 305 } }
);
D(
  'snaphinge',
  'Snap Hinge',
  'struct',
  1,
  'b',
  1,
  55,
  1.4,
  'A fast hinge: flips its arm 60° in a blink. Right click or its key.',
  'Short swing.',
  ['joint', 'flip'],
  { k: 'joint' },
  { dir: 1, joint: 1 }
);
D(
  'longram',
  'Long Ram',
  'struct',
  2,
  'b',
  1,
  70,
  2.2,
  'A three-cell hydraulic lunge. Right click or its key.',
  'Slow to extend; the long rod snaps easily.',
  ['joint', 'melee'],
  { k: 'joint' },
  { dir: 1, joint: 1 }
);
D(
  'quickspin',
  'Spin Plate',
  'struct',
  1,
  'b',
  1,
  60,
  1.6,
  'A rotator that spins twice as fast. Hold its button to reverse.',
  'Dizzying for whatever sits on it.',
  ['joint', 'melee'],
  { k: 'joint' },
  { dir: 1, joint: 1 }
);
// 2.9: Wild Weather parts
D(
  'flaregun',
  'Flare Gun',
  'weapon',
  1,
  't',
  1,
  40,
  1,
  'Fires a burning flare that sets whatever it hits on fire.',
  'One shot, then a reload. Lights you up at night too.',
  ['fire'],
  { k: 'gun', b: 1, l: 0.8, w: 0.26, c: '#b8442a', v: 'flare', tip: '#ffb347' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'rocket',
      dmg: 14,
      burst: 1,
      reload: 1.2,
      spd: 460,
      rng: 800,
      spr: 0.02,
      splash: 50,
      dt: 'fire',
      cls: 'fire'
    })
  }
);
D(
  'stormcoil',
  'Storm Coil',
  'weapon',
  3,
  't',
  2,
  70,
  2.5,
  'Lightning in a jar: one strike jumps through up to five targets.',
  'Needs a heavy mount, and it is the first thing everyone aims at.',
  ['energy'],
  { k: 'tesla' },
  { glow: '#d6c8ff', ...W({ kind: 'tesla', dmg: 18, cd: 1, rng: 260, chain: 5, dt: 'energy', cls: 'energy' }) }
);
D(
  'blunderbuss',
  'Scrap Blunderbuss',
  'weapon',
  0,
  't',
  1,
  45,
  1.6,
  'Loads nine bits of scrap and lets them all go at once.',
  'Wide spread and short reach; it kicks like a mule.',
  ['gun', 'scrap'],
  { k: 'gun', b: 1, l: 0.85, w: 0.3, c: '#6b4a2a', v: 'flare' },
  {
    dir: 1,
    front: 1,
    ...W({
      kind: 'bullet',
      n: 9,
      dmg: 4,
      rate: 0.9,
      spd: 560,
      rng: 240,
      spr: 0.55,
      recoil: 18,
      dt: 'kin',
      cls: 'ballistic'
    })
  }
);
D(
  'snowplow',
  'Snow Plow',
  'melee',
  1,
  'b',
  0,
  190,
  4,
  'A big curved blade: rams hard and shoves junk out of the way.',
  'Heavy at the front, so turning gets slower.',
  ['melee', 'scrap', 'cold'],
  { k: 'plate', c: '#d9a521', p: 'slope' },
  { dir: 1, ram: 6, pusher: 1, front: 1 }
);
D(
  'diamondplate',
  'Diamond Plate',
  'defense',
  2,
  'b',
  1,
  230,
  3.4,
  'Chequered steel: shrugs off bullets and takes the edge off crashes.',
  'Heavier than ordinary armour.',
  ['def'],
  { k: 'plate', c: '#a9b3bc', p: 'bolts' },
  { res: { light: 0.55, ram: 0.8 } }
);
const MOD = Object.fromEntries(MODS.map(m => [m.id, m]));
const STARTER_GUNS = ['mg', 'smg', 'nailgun', 'pulse', 'rivet'];
function starterKit(guns = [pick(STARTER_GUNS), pick(STARTER_GUNS)]) {
  const kit = { frame: 10, wheel: 4, armor: 4, spike: 2 };
  for (const id of guns) kit[id] = (kit[id] || 0) + 1;
  return { kit, guns };
}
