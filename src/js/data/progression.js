// Personal progression data: gear (your own upgraded parts), quirks, stickers and sticker sets.
// Gear and stickers only work in single-player modes (Duel vs bot, Story, Gauntlet); online stays fair.

/* ---------- Gear ---------- */
const GEAR_MAX = 5; // levels 1..5, quirk at 3, masterwork at 5
const GEAR_CAP = 40; // items in the locker
// Bolts needed to reach the next level, scaled by rarity.
const GEAR_COST = [0, 40, 90, 160, 260];
const GEAR_RARK = [1, 1.2, 1.5, 1.9, 2.4];
const gearCost = (g, lvl = g.lvl) => Math.round(GEAR_COST[lvl] * GEAR_RARK[MOD[g.id] ? MOD[g.id].rar : 0]);
const gearScrapValue = g =>
  Math.round(10 + 6 * (MOD[g.id] ? MOD[g.id].rar : 0) + 0.3 * GEAR_COST.slice(1, g.lvl).reduce((a, b) => a + b, 0));

/** What kind of bonus a part's levels give. */
function gearKind(id) {
  const m = MOD[id];
  if (!m) return 'hp';
  if (m.cat === 'move') return 'speed';
  if (m.cat === 'weapon') return 'rate';
  return 'hp';
}
/** Total bonus (fraction) at a level; masterwork adds a final kick. */
function gearBonus(g) {
  const k = gearKind(g.id),
    L = g.lvl,
    mw = L >= GEAR_MAX ? 1 : 0;
  if (k === 'speed') return 0.015 + 0.015 * (L - 1) + 0.02 * mw;
  if (k === 'rate') return 0.04 + 0.06 * (L - 1) + 0.06 * mw;
  return 0.05 + 0.08 * (L - 1) + 0.08 * mw;
}
const GEAR_KIND_TEXT = { hp: 'part HP', rate: 'fire / use rate', speed: 'car top speed' };

/** Quirks: every one is a trade-off, picked at level 3. `fits` limits which parts can roll it. */
const QUIRKS = {
  overclock: {
    name: 'Overclocked',
    pro: '+20% fire rate',
    con: 'This part takes 25% more damage',
    fits: k => k === 'rate'
  },
  bulky: { name: 'Bulky', pro: '+35% part HP', con: 'Car top speed −3%', fits: () => true },
  feather: { name: 'Featherweight', pro: 'Car top speed +3%', con: 'Part HP −20%', fits: () => true },
  spiky: {
    name: 'Spiky',
    pro: 'Rams and melee on this part bounce 25% of the damage back',
    con: 'Part HP −10%',
    fits: k => k === 'hp'
  },
  selfheal: {
    name: 'Self-Healing',
    pro: 'Repairs 2% of its HP every second',
    con: 'Car top speed −2%',
    fits: () => true
  },
  showoff: {
    name: 'Show-off',
    pro: 'The crowd goes wild: +50% hype for your car',
    con: 'Part HP −15%',
    fits: () => true
  },
  magnetic: {
    name: 'Magnetic',
    pro: 'Pickup reach +50%',
    con: 'Car top speed −2%',
    fits: () => true
  },
  tantrum: {
    name: 'Tantrum',
    pro: 'When this part breaks it explodes in a scrap burst',
    con: 'Part HP −10%',
    fits: () => true
  }
};
const QUIRK_IDS = Object.keys(QUIRKS);

/* ---------- Stickers and sets ---------- */
// Each livery belongs to a set. Wear two stickers from the same set as your livery for its set bonus.
const STICKER_SETS = {
  speed: {
    name: 'Speed Demon',
    col: '#ff7a3a',
    bonus: 'Top speed +5%',
    liveries: ['flames', 'stripes', 'racing', 'checker']
  },
  junk: {
    name: 'Junkyard',
    col: '#c9a227',
    bonus: 'Repairs heal 30% more and parts slowly mend',
    liveries: ['rust', 'camo', 'hazard', 'graffiti', 'factory']
  },
  show: {
    name: 'Showtime',
    col: '#ffd257',
    bonus: 'Hype +40%: the crowd throws you more gifts',
    liveries: ['gold', 'chrome', 'holo', 'neon']
  },
  wild: {
    name: 'Wild',
    col: '#3fe0a0',
    bonus: 'All damage dealt +5%',
    liveries: ['tiger', 'dazzle', 'arctic']
  },
  tech: {
    name: 'Tech',
    col: '#5be7ff',
    bonus: 'Power-ups last 30% longer',
    liveries: ['circuit', 'carbon', 'galaxy', 'lava']
  }
};
const liverySet = id => Object.keys(STICKER_SETS).find(s => STICKER_SETS[s].liveries.includes(id)) || null;

// unlock: {lvl} | {ach} | {story: missionId} — story stickers are earned on the Scrap Road.
const STICKERS = [
  { id: 'flag', set: 'speed', name: 'Checker Flag', perk: 'Top speed +3%', fx: { speedK: 0.03 }, unlock: null },
  {
    id: 'flame',
    set: 'speed',
    name: 'Flame Decal',
    perk: 'Fire damage taken −15%',
    fx: { res: { fire: 0.15 } },
    unlock: { lvl: 4 }
  },
  {
    id: 'lightning',
    set: 'speed',
    name: 'Lightning',
    perk: 'Start every round with a 4 s speed boost',
    fx: { quick: 1 },
    unlock: { story: 'r1b' }
  },
  {
    id: 'wrench',
    set: 'junk',
    name: 'Grease Monkey',
    perk: 'Repair pickups heal 30% more',
    fx: { repairK: 0.3 },
    unlock: null
  },
  {
    id: 'skull',
    set: 'junk',
    name: 'Skull & Bolts',
    perk: 'Ram damage taken −10%',
    fx: { res: { ram: 0.1 } },
    unlock: { lvl: 6 }
  },
  { id: 'rat', set: 'junk', name: 'Junk Rat', perk: 'Coin pickups +30%', fx: { coinK: 0.3 }, unlock: { story: 'r1a' } },
  { id: 'star', set: 'show', name: 'Gold Star', perk: 'Hype +20%', fx: { hypeK: 0.2 }, unlock: { lvl: 2 } },
  { id: 'crown', set: 'show', name: 'Tiny Crown', perk: 'Max HP +4%', fx: { hpK: 0.04 }, unlock: { ach: 'match_win' } },
  {
    id: 'heart',
    set: 'show',
    name: 'Fan Mail',
    perk: 'Crowd gifts you grab also repair 6%',
    fx: { giftHeal: 0.06 },
    unlock: { story: 'r2c' }
  },
  {
    id: 'paw',
    set: 'wild',
    name: 'Tiger Paw',
    perk: 'Ram damage dealt +8%',
    fx: { ramOut: 0.08 },
    unlock: { story: 'r2a' }
  },
  {
    id: 'cat',
    set: 'wild',
    name: 'Lucky Cat',
    perk: 'Pickup reach +40%',
    fx: { reach: 0.4 },
    unlock: { lvl: 8 }
  },
  {
    id: 'duck',
    set: 'wild',
    name: 'Rubber Duck',
    perk: 'Explosive damage taken −10%',
    fx: { res: { expl: 0.1 } },
    unlock: { ach: 'duck' }
  },
  {
    id: 'atom',
    set: 'tech',
    name: 'Atom',
    perk: 'Power-ups last 20% longer',
    fx: { powerK: 0.2 },
    unlock: { lvl: 10 }
  },
  {
    id: 'chip',
    set: 'tech',
    name: 'Overclock Chip',
    perk: 'Fire rate +4%',
    fx: { rateK: 0.04 },
    unlock: { story: 'r3b' }
  },
  {
    id: 'eye',
    set: 'tech',
    name: 'Watchful Eye',
    perk: 'Bullet damage taken −8%',
    fx: { res: { light: 0.08 } },
    unlock: { story: 'r3d' }
  }
];
const STICKER = Object.fromEntries(STICKERS.map(s => [s.id, s]));
const STICKER_SLOTS = 3;
const SET_FX = {
  speed: { speedK: 0.05 },
  junk: { repairK: 0.3, mend: 0.004 },
  show: { hypeK: 0.4 },
  wild: { dmgK: 0.05 },
  tech: { powerK: 0.3 }
};
