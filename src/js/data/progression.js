// Personal progression data: gear (your own upgraded parts), quirks, stickers and sticker sets.
// Gear and stickers only work in single-player modes (Duel vs bot, Gauntlet); online stays fair.

/* ---------- Gear ---------- */
const GEAR_MAX = 10; // levels 1..10: quirk at 3, first special at 5, legendary special at 10
const GEAR_CAP = 40; // items in the locker
// Each level has its own colour, from scrap grey to legendary gold.
const LV_COLS = [
  '#9aa3ab',
  '#5fd38a',
  '#2fd6c3',
  '#4ea1ff',
  '#7a7dff',
  '#b06bff',
  '#ff5ec4',
  '#ff5c5c',
  '#ff9a3a',
  '#ffd257'
];
const lvCol = l => LV_COLS[clamp((l | 0) - 1, 0, LV_COLS.length - 1)];
// Upgrading needs both: XP (the part earns it by riding along in your matches) and bolts (earned by winning).
const gearNeed = lvl => 40 + 30 * lvl; // XP to fill the bar at this level
const GEAR_COST = [0, 30, 50, 75, 110, 150, 200, 260, 330, 420]; // bolts to go from level i to i+1
const GEAR_RARK = [1, 1.15, 1.35, 1.6, 2];
const gearCost = (g, lvl = g.lvl) =>
  Math.round(GEAR_COST[Math.min(lvl, GEAR_COST.length - 1)] * GEAR_RARK[MOD[g.id] ? MOD[g.id].rar : 0]);
const gearReady = g => g.lvl < GEAR_MAX && (g.xp || 0) >= gearNeed(g.lvl);
const gearScrapValue = g =>
  Math.round(10 + 6 * (MOD[g.id] ? MOD[g.id].rar : 0) + 0.3 * GEAR_COST.slice(1, g.lvl).reduce((a, b) => a + b, 0));

/** What every level adds: weapons hit harder, armour and gadgets get tougher, movement gets faster. */
function gearKind(id) {
  const m = MOD[id];
  if (!m) return 'hp';
  if (m.cat === 'move') return 'speed';
  if (m.cat === 'weapon' || m.cat === 'melee') return 'dmg';
  return 'hp';
}
/** Total level bonus (fraction) at a level, before specials. */
function gearBonus(g) {
  const k = gearKind(g.id),
    L = g.lvl - 1,
    st = starBonus(g, k);
  if (k === 'speed') return 0.01 * L + st;
  if (k === 'dmg') return 0.03 * L + st;
  return 0.05 * L + st;
}
const GEAR_KIND_TEXT = { hp: 'part HP', dmg: 'damage', speed: 'car top speed' };

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

// unlock: {lvl} | {ach}
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
    unlock: { lvl: 3 }
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
  { id: 'rat', set: 'junk', name: 'Junk Rat', perk: 'Coin pickups +30%', fx: { coinK: 0.3 }, unlock: { lvl: 2 } },
  { id: 'star', set: 'show', name: 'Gold Star', perk: 'Hype +20%', fx: { hypeK: 0.2 }, unlock: { lvl: 2 } },
  { id: 'crown', set: 'show', name: 'Tiny Crown', perk: 'Max HP +4%', fx: { hpK: 0.04 }, unlock: { ach: 'match_win' } },
  {
    id: 'heart',
    set: 'show',
    name: 'Fan Mail',
    perk: 'Crowd gifts you grab also repair 6%',
    fx: { giftHeal: 0.06 },
    unlock: { lvl: 7 }
  },
  {
    id: 'paw',
    set: 'wild',
    name: 'Tiger Paw',
    perk: 'Ram damage dealt +8%',
    fx: { ramOut: 0.08 },
    unlock: { lvl: 5 }
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
    unlock: { lvl: 9 }
  },
  {
    id: 'eye',
    set: 'tech',
    name: 'Watchful Eye',
    perk: 'Bullet damage taken −8%',
    fx: { res: { light: 0.08 } },
    unlock: { lvl: 12 }
  }
];
STICKERS.push(
  { id: 'nut', set: 'junk', name: 'Hex Nut', perk: 'Part HP +3%', fx: { hpK: 0.03 }, unlock: { lvl: 12 } },
  { id: 'cog', set: 'tech', name: 'Big Cog', perk: 'Fire rate +3%', fx: { rateK: 0.03 }, unlock: { lvl: 14 } },
  {
    id: 'bomb',
    set: 'wild',
    name: 'Cartoon Bomb',
    perk: 'Explosive damage taken −8%',
    fx: { res: { expl: 0.08 } },
    unlock: { ach: 'road2' }
  },
  {
    id: 'snow',
    set: 'speed',
    name: 'Snowflake',
    perk: 'Top speed +2%, fire damage taken −8%',
    fx: { speedK: 0.02, res: { fire: 0.08 } },
    unlock: { ach: 'kingslayer' }
  }
);
const STICKER = Object.fromEntries(STICKERS.map(s => [s.id, s]));
const STICKER_SLOTS = 3;
const SET_FX = {
  speed: { speedK: 0.05 },
  junk: { repairK: 0.3, mend: 0.004 },
  show: { hypeK: 0.4 },
  wild: { dmgK: 0.05 },
  tech: { powerK: 0.3 }
};

/* ---------- Loadout sets ---------- */
// The family a gear piece counts for. Sets look at the pieces in your loadout.
function gearFamily(id) {
  const g = gearGroup(id);
  if (['bullet', 'bolt', 'plasma', 'rail', 'harpoon', 'bounce'].includes(g)) return 'gun';
  if (['shell', 'rocket', 'homing', 'lob', 'sticky'].includes(g)) return 'boom';
  if (['flame', 'arc', 'beam', 'water'].includes(g)) return 'element';
  if (g === 'blade' || g === 'ram') return 'melee';
  if (g === 'armour') return 'armour';
  if (g === 'move') return 'move';
  return 'gadget';
}
const FAMILY_NAME = {
  gun: 'Guns',
  boom: 'Explosives',
  element: 'Elements',
  melee: 'Melee',
  armour: 'Armour',
  move: 'Movement',
  gadget: 'Gadgets'
};
// need: {family: count}. 'mix' counts different families.
const GEAR_SETS = [
  {
    id: 'leadstorm',
    name: 'Lead Storm',
    col: '#ffd257',
    need: { gun: 3 },
    text: 'Every gun fires 12% faster.'
  },
  {
    id: 'demolition',
    name: 'Demolition Crew',
    col: '#ff8a3a',
    need: { boom: 2 },
    text: 'Explosives: +20% blast radius and +10% damage.'
  },
  {
    id: 'stormfront',
    name: 'Storm Front',
    col: '#5be7ff',
    need: { element: 2 },
    text: 'Flame, arc, beam and water weapons: +20% damage.'
  },
  { id: 'bunker', name: 'Bunker', col: '#9fb4c8', need: { armour: 3 }, text: 'Every part of your car: +10% HP.' },
  {
    id: 'berserker',
    name: 'Berserker',
    col: '#ff5c5c',
    need: { melee: 2, move: 1 },
    text: '+20% ram and melee damage.'
  },
  { id: 'hotrod', name: 'Hot Rod', col: '#ff5ec4', need: { move: 2 }, text: '+5% top speed and +10% acceleration.' },
  {
    id: 'allround',
    name: 'Jack of All Trades',
    col: '#5fd38a',
    need: { mix: 3 },
    text: 'Three different families: +6% damage and +6% HP.'
  }
];
/** Counts per family for a list of gear pieces. */
function familyCount(list) {
  const n = {};
  for (const g of list) {
    const f = gearFamily(g.id);
    n[f] = (n[f] || 0) + 1;
  }
  n.mix = Object.keys(n).filter(f => f !== 'gadget').length;
  return n;
}
/** Every set with how far along a loadout is: [{set, have, need, on}]. */
function setProgress(list) {
  const n = familyCount(list);
  return GEAR_SETS.map(S => {
    let have = 0,
      need = 0;
    for (const [f, c] of Object.entries(S.need)) {
      have += Math.min(n[f] || 0, c);
      need += c;
    }
    return { set: S, have, need, on: have >= need };
  });
}

/* ---------- Mod chips ---------- */
// Chips go into the sockets of a gear piece: one opens at level 3, 6 and 9. Mk I, II and III; three of a kind fuse up.
const CHIP_SOCKETS = [3, 6, 9];
const CHIP_MK = ['', 'Mk I', 'Mk II', 'Mk III'];
const CHIPS = {
  power: {
    name: 'Power',
    col: '#ff5c5c',
    text: t => `+${[0, 8, 12, 18][t]}% damage`,
    fx: t => ({ dmg: 1 + [0, 0.08, 0.12, 0.18][t] })
  },
  plate: {
    name: 'Plating',
    col: '#9fb4c8',
    text: t => `+${[0, 12, 18, 26][t]}% part HP`,
    fx: t => ({ hp: 1 + [0, 0.12, 0.18, 0.26][t] })
  },
  turbo: { name: 'Turbo', col: '#4ea1ff', text: t => `+${t}% car top speed`, fx: t => ({ speed: 0.01 * t }) },
  crit: {
    name: 'Lucky',
    col: '#ffd257',
    text: t => `${[0, 8, 12, 18][t]}% chance on a 2.5× hit (shots)`,
    fx: t => ({ crit: [0, 0.08, 0.12, 0.18][t] })
  },
  fire: {
    name: 'Ember',
    col: '#ff8a3a',
    text: t => `Shots burn for ${[0, 0.6, 1, 1.5][t]} s; fire does ${[0, 15, 25, 35][t]}% less to it`,
    fx: t => ({ burn: [0, 0.6, 1, 1.5][t], res: { fire: [0, 0.15, 0.25, 0.35][t] } })
  },
  shock: {
    name: 'Static',
    col: '#5be7ff',
    text: t => `Shots stall weapons for ${[0, 0.15, 0.25, 0.35][t]} s`,
    fx: t => ({ shock: [0, 0.15, 0.25, 0.35][t] })
  },
  mend: {
    name: 'Mender',
    col: '#5fd38a',
    text: t => `Repairs ${[0, 1, 1.5, 2][t]}% of its HP every second`,
    fx: t => ({ regen: [0, 0.01, 0.015, 0.02][t] })
  },
  star: {
    name: 'Crowd',
    col: '#ff5ec4',
    text: t => `+${[0, 20, 30, 45][t]}% hype`,
    fx: t => ({ hype: [0, 0.2, 0.3, 0.45][t] })
  }
};
const CHIP_IDS = Object.keys(CHIPS);
const chipKey = (c, t) => `${c}${t}`;
const chipParse = k => (k && CHIPS[k.slice(0, -1)] ? { c: k.slice(0, -1), t: clamp(+k.slice(-1) || 1, 1, 3) } : null);
const chipName = k => {
  const p = chipParse(k);
  return p ? `${CHIPS[p.c].name} ${CHIP_MK[p.t]}` : '';
};

/* ---------- Prestige ---------- */
// A level-10 piece can be reforged: back to level 1 with a permanent star. Each star adds to its level bonus.
const GEAR_STARS = 5;
const REFORGE_COST = 150;
const starBonus = (g, kind) => (g.s || 0) * (kind === 'speed' ? 0.005 : 0.02);
