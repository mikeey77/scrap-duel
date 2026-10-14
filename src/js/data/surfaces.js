// Arena floors. Every arena has a surface, and every kind of tyre feels it differently:
// sand slows everyone but off-road tyres and tracks float over it, spikes bite on ice, slicks love asphalt.
// Each entry: spd = base speed on this floor, t[class] = [speed, grip] multipliers for that tyre class.
const TYRE_NAME = {
  road: 'Road tyres',
  slick: 'Slicks',
  offroad: 'Off-road tyres',
  spiked: 'Spiked tyres',
  track: 'Tracks',
  hover: 'Hover pads'
};
const TYRE_TIP = {
  road: 'All-rounder: fine everywhere, best nowhere.',
  slick: 'Fastest on asphalt, wood and steel. Bogs down in sand, mud and snow.',
  offroad: 'Chunky tread: best on sand, mud, dirt and snow; keeps more grip in oil. A bit slower on smooth floors.',
  spiked: 'Bites into ice and snow. Skids on tiles, steel and wood.',
  track: 'Floats over sand and mud, pushes hard everywhere.',
  hover: 'Ignores the floor completely.'
};
const SURFACES = {
  asphalt: {
    name: 'Asphalt',
    spd: 1,
    col: '120,124,130',
    t: { slick: [1.06, 1], offroad: [0.94, 1], spiked: [0.96, 0.9] },
    tip: 'Smooth and fast. Slicks are at home here.'
  },
  dirt: {
    name: 'Dirt',
    spd: 0.95,
    col: '120,95,65',
    dust: 1,
    t: { slick: [0.92, 0.85], offroad: [1.05, 1.12], spiked: [1, 1.1], track: [1.05, 1.1] },
    tip: 'Loose dirt. Chunky tread digs in, slicks skate.'
  },
  grass: {
    name: 'Grass',
    spd: 0.95,
    col: '90,120,60',
    dust: 0.5,
    t: { slick: [0.92, 0.8], offroad: [1.04, 1.1], spiked: [1, 1.12], track: [1.03, 1.05] },
    tip: 'Soft lawn. Slicks slide on it, spikes and tread hold on.'
  },
  sand: {
    name: 'Sand',
    spd: 0.82,
    col: '230,205,150',
    dust: 1.4,
    t: { road: [1, 0.95], slick: [0.82, 0.75], offroad: [1.18, 1.2], spiked: [0.95, 1], track: [1.2, 1.25] },
    tip: 'Soft sand slows everyone. Off-road tyres and tracks float over it, slicks dig in.'
  },
  wetsand: {
    name: 'Wet sand',
    spd: 0.95,
    col: '170,150,110',
    dust: 0.3,
    t: { slick: [0.95, 0.9], offroad: [1.05, 1.1], track: [1.05, 1.1] },
    tip: 'Firm, wet sand by the water. Faster than the dry stuff.'
  },
  mud: {
    name: 'Mud',
    spd: 0.8,
    col: '90,70,40',
    dust: 1.2,
    t: { slick: [0.8, 0.65], offroad: [1.2, 1.3], spiked: [1, 1.1], track: [1.2, 1.3] },
    tip: 'Thick mud. Off-road tyres and tracks power through, slicks drown.'
  },
  snow: {
    name: 'Snow',
    spd: 0.9,
    col: '240,246,255',
    dust: 1.2,
    t: { slick: [0.9, 0.7], offroad: [1.08, 1.25], spiked: [1.05, 1.6], track: [1.1, 1.3] },
    tip: 'Packed snow. Spikes and tread grip, slicks wander.'
  },
  ice: {
    name: 'Ice',
    spd: 1,
    col: '220,240,255',
    dust: 0.4,
    t: { slick: [1.05, 0.8], offroad: [1, 1.15], spiked: [1.05, 1.9], track: [1, 1.1] },
    tip: 'Almost no grip. Spiked tyres bite, everything else slides.'
  },
  tile: {
    name: 'Wet tiles',
    spd: 1.02,
    col: '200,215,225',
    t: { slick: [1.05, 0.85], offroad: [0.96, 1], spiked: [0.95, 0.8], track: [1, 0.95] },
    tip: 'Polished and slippery. Spikes skid, slicks slide.'
  },
  metal: {
    name: 'Steel deck',
    spd: 1,
    col: '150,160,170',
    t: { slick: [1.05, 1], offroad: [0.96, 1], spiked: [0.95, 0.85], track: [1, 1.05] },
    tip: 'Hard steel. Fast for slicks, spikes skitter.'
  },
  wood: {
    name: 'Polished wood',
    spd: 1.03,
    col: '170,120,70',
    t: { slick: [1.08, 0.95], offroad: [0.96, 1], spiked: [0.95, 0.85] },
    tip: 'A fast, polished floor. Slicks fly, spikes skid.'
  },
  carpet: {
    name: 'Carpet',
    spd: 0.92,
    col: '160,120,170',
    t: { slick: [0.95, 1.05], offroad: [0.98, 1.05], spiked: [0.9, 1.15], track: [1, 1.05] },
    tip: 'Thick pile. Everyone rolls a little slower.'
  },
  rock: {
    name: 'Basalt',
    spd: 0.97,
    col: '90,80,75',
    dust: 0.6,
    t: { slick: [0.95, 0.9], offroad: [1.05, 1.1], spiked: [1, 1.05], track: [1.05, 1.1] },
    tip: 'Rough rock. Tread and tracks like it.'
  }
};
const THEME_SURFACE = {
  junkyard: 'dirt',
  backyard: 'grass',
  market: 'tile',
  construction: 'dirt',
  ice: 'ice',
  carpark: 'asphalt',
  beach: 'sand',
  chess: 'wood',
  scrapfactory: 'metal',
  stormroof: 'asphalt',
  volcano: 'rock',
  space: 'metal',
  carwash: 'tile',
  desert: 'sand',
  haunted: 'mud',
  toyroom: 'carpet',
  factory: 'asphalt',
  pinball: 'metal',
  kitchen: 'tile',
  swamp: 'mud',
  crusheryard: 'dirt',
  frozenlot: 'snow',
  neonstrip: 'asphalt',
  warpzone: 'metal',
  funfair: 'asphalt',
  glacier: 'snow'
};
const surfaceOf = th => SURFACES[(th && (th.surface || THEME_SURFACE[th.id])) || 'asphalt'] || SURFACES.asphalt;
/** Which tyre class a drive part belongs to. */
function tyreOf(m) {
  if (!m || !m.drive) return null;
  if (m.id === 'mudtyre') return 'offroad';
  if (m.hover) return 'hover';
  if (m.art && m.art.k === 'track') return 'track';
  if (m.monster) return 'offroad';
  if (m.studs || (m.art && m.art.v === 'spiked')) return 'spiked';
  if (m.art && m.art.v === 'slick') return 'slick';
  return 'road';
}
/** Speed and grip multipliers for a car's tyre mix (weights by drive power) on a surface. */
function surfaceFit(tyreW, S) {
  let w = 0,
    spd = 0,
    grip = 0,
    off = 0;
  for (const k in tyreW || {}) {
    const n = tyreW[k];
    if (!n) continue;
    const t = k === 'hover' ? [1 / S.spd, 1] : S.t[k] || [1, 1];
    w += n;
    spd += n * S.spd * t[0];
    grip += n * t[1];
    if (k === 'offroad' || k === 'track') off += n;
  }
  if (!w) return { spd: S.spd, grip: 1, off: 0 };
  return { spd: spd / w, grip: grip / w, off: off / w };
}
/** Short verdict for the garage: which tyres do well on this floor. */
function surfaceAdvice(S) {
  const sc = k => (k === 'hover' ? 1 : S.spd * (S.t[k] || [1, 1])[0] * 0.5 + (S.t[k] || [1, 1])[1] * 0.5);
  const ks = ['road', 'slick', 'offroad', 'spiked', 'track'].sort((a, b) => sc(b) - sc(a));
  const best = ks.filter(k => sc(k) >= sc(ks[0]) - 0.04);
  return { best: ks[0], top: best.map(k => TYRE_NAME[k].toLowerCase()).join(' or '), worst: ks[ks.length - 1] };
}
for (const k in SURFACES) SURFACES[k].id = k;
