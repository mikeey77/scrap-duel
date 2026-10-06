// Branch synergies: three or five parts of the same branch on your car unlock a bonus.
const SYN_TIERS = [3, 5];
const SYNERGY = {
  fire: {
    t: ['+20% fire damage', '+40% fire damage, burns last twice as long'],
    a: [{ dmg_fire: 0.2 }, { dmg_fire: 0.4, burn: 1 }]
  },
  gun: {
    t: ['+12% bullet and shell damage', '+25% bullet and shell damage, +10% fire rate'],
    a: [{ dmg_ballistic: 0.12 }, { dmg_ballistic: 0.25, rate: 0.1 }]
  },
  expl: {
    t: ['+20% blast radius', '+35% blast radius, +15% blast damage'],
    a: [{ splash: 0.2 }, { splash: 0.35, dmg_expl: 0.15 }]
  },
  energy: {
    t: ['+15% energy damage', '+30% energy damage, lightning chains once more'],
    a: [{ dmg_energy: 0.15 }, { dmg_energy: 0.3, chain: 1 }]
  },
  melee: {
    t: ['+20% melee and crash damage', '+40% melee and crash damage'],
    a: [{ dmg_melee: 0.2 }, { dmg_melee: 0.4 }]
  },
  def: {
    t: ['+10% HP on every part', '+20% HP on every part'],
    a: [{ hp: 0.1 }, { hp: 0.2 }]
  },
  pinball: {
    t: ['+30% knockback', '+60% knockback, crashes hurt you 25% less'],
    a: [{ knock: 0.3 }, { knock: 0.6, ramRes: 0.25 }]
  },
  slip: {
    t: ['Your oil, glue and peels last twice as long', 'Slicks last twice as long and your own never trip you'],
    a: [{ slickLife: 1 }, { slickLife: 1, ownSlick: 1 }]
  },
  hook: {
    t: ['Tethers and tractor beams pull 50% harder', 'Pull twice as hard, tethers last twice as long'],
    a: [{ tether: 0.5 }, { tether: 1 }]
  },
  air: {
    t: ['Jumps and boosters recharge 30% faster', 'Recharge 50% faster, landings never hurt'],
    a: [{ airCd: 0.3 }, { airCd: 0.5, softLand: 1 }]
  },
  scrap: {
    t: ['Junk you hit takes double damage', 'Junk takes triple damage and pays a coin each'],
    a: [{ junk: 1 }, { junk: 2, junkCoin: 1 }]
  },
  cold: {
    t: ['Freezes last 50% longer', 'Freezes last twice as long'],
    a: [{ freeze: 0.5 }, { freeze: 1 }]
  },
  econ: {
    t: ['+10% coins after every round', '+25% coins after every round'],
    a: [{ coins: 0.1 }, { coins: 0.25 }]
  },
  flip: {
    t: ['Flippers 30% stronger, you are harder to flip', 'Flippers 60% stronger, you can’t be flipped'],
    a: [{ flipPow: 0.3 }, { flipPow: 0.6, noFlip: 1 }]
  }
};

/** Counts branch tags over a list of module ids and returns the counts, tier per tag and the merged bonus aura. */
function synergyOf(ids) {
  const counts = {};
  for (const id of ids) for (const t of MOD[id].tags) counts[t] = (counts[t] || 0) + 1;
  const tier = {},
    aura = {};
  for (const t in counts) {
    const lvl = counts[t] >= SYN_TIERS[1] ? 2 : counts[t] >= SYN_TIERS[0] ? 1 : 0;
    if (!lvl || !SYNERGY[t]) continue;
    tier[t] = lvl;
    for (const [k, v] of Object.entries(SYNERGY[t].a[lvl - 1])) aura[k] = (aura[k] || 0) + v;
  }
  return { counts, tier, aura };
}
function mergeAura(a, b) {
  const out = { ...a };
  for (const k in b) out[k] = (out[k] || 0) + b[k];
  return out;
}
