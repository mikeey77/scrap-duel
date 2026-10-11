// Gear specials: every part gets two milestones.
//   Level 5: pick one of two. The part's own special, or "Steady" (+10%, the safe choice).
//   Level 10: the legendary special, always on.
// A part uses its own entry in GEAR_SPECIAL_PART when it has one, otherwise the defaults of its group.
// Parts in a group without specials (gadgets) only get Steady and a +10% placeholder at level 10:
// those are the ones still to be invented (see gearToInvent()).
//
// fx keys (applied in applyGearFx, js/game/gear.js):
//   dmg ×damage   rate ×fire/use rate   multi +projectiles per shot   burn s of fire on hit
//   shock s of weapon stall on hit   freeze +s of freeze on hit   crit chance of a 2.5× hit
//   splash ×blast radius   splashAdd +px blast on every hit   knock ×knockback   rng ×range   spd ×shot speed
//   bounces +ricochets   chain +arc jumps   volley +rockets per volley   charge ×charge time   push ×water push
//   hp ×part HP   regen part HP/s (fraction)   thorns share of melee/ram damage bounced back
//   res {type: less damage taken by this part}   blast explodes when it breaks
//   speed +car top speed   accel ×acceleration   ram +ram damage dealt   ramIn less ram damage taken
//   knockRes less knockback on the car   hype +crowd hype
const GEAR_STEADY = {
  dmg: { id: 'steady', name: 'Steady', text: '+10% damage. No tricks, just more.', fx: { dmg: 1.1 } },
  hp: { id: 'steady', name: 'Steady', text: '+10% part HP. No tricks, just tougher.', fx: { hp: 1.1 } },
  speed: { id: 'steady', name: 'Steady', text: '+10% acceleration. No tricks, just quicker.', fx: { accel: 1.1 } }
};
const GEAR_PLACEHOLDER = {
  dmg: {
    id: 'tbd',
    name: 'Legendary Tune',
    text: '+10% damage (special still to be invented)',
    fx: { dmg: 1.1 },
    tbd: 1
  },
  hp: {
    id: 'tbd',
    name: 'Legendary Tune',
    text: '+10% part HP (special still to be invented)',
    fx: { hp: 1.1 },
    tbd: 1
  },
  speed: {
    id: 'tbd',
    name: 'Legendary Tune',
    text: '+10% acceleration (special still to be invented)',
    fx: { accel: 1.1 },
    tbd: 1
  }
};
const gsp = (id, name, text, fx) => ({ id, name, text, fx });
// [level 5 special, level 10 special] per group
const GEAR_SPECIAL_GROUP = {
  bullet: [
    gsp('hotrounds', 'Hot Rounds', 'Hits set the part they hit on fire for 1.5 s.', { burn: 1.5 }),
    gsp('doubletap', 'Double Tap', 'Fires two bullets with every shot.', { multi: 1 })
  ],
  shell: [
    gsp('concussion', 'Concussion Shells', 'Knockback ×1.8: hits shove cars around.', { knock: 1.8 }),
    gsp('twinbarrel', 'Twin Barrel', 'Fires two shells at once.', { multi: 1 })
  ],
  bolt: [
    gsp('static', 'Static Bolts', "Hits stall the target's weapons for 0.35 s.", { shock: 0.35 }),
    gsp('twinpulse', 'Twin Pulse', 'Fires two bolts at once.', { multi: 1 })
  ],
  plasma: [
    gsp('plasmaburn', 'Plasma Burn', 'Hits set the part they hit on fire for 2.5 s.', { burn: 2.5 }),
    gsp('supernova', 'Supernova', 'Every shot bursts in a 45 px blast and hits 15% harder.', {
      splashAdd: 45,
      dmg: 1.15
    })
  ],
  rocket: [
    gsp('warheads', 'Bigger Warheads', 'Blast radius +35%.', { splash: 1.35 }),
    gsp('extravolley', 'Extra Volley', 'Two more rockets in every volley.', { volley: 2 })
  ],
  homing: [
    gsp('seekers', 'Sharper Seekers', 'Missiles fly 30% faster.', { spd: 1.3 }),
    gsp('missilepod', 'Missile Pod', 'Twice the missiles.', { multi: 1 })
  ],
  flame: [
    gsp('longnozzle', 'Long Nozzle', 'Range +35%.', { rng: 1.35 }),
    gsp('dragonbreath', 'Dragon Breath', '+50% fire damage.', { dmg: 1.5 })
  ],
  water: [
    gsp('pressure', 'High Pressure', 'Pushes 50% harder.', { push: 1.5 }),
    gsp('firehose', 'Fire Hose', 'Range +40% and pushes 30% harder.', { rng: 1.4, push: 1.3 })
  ],
  arc: [
    gsp('extrajump', 'Extra Jump', 'The arc jumps to one more target.', { chain: 1 }),
    gsp('stormcoil', 'Storm Coil', 'Two more jumps and +25% damage.', { chain: 2, dmg: 1.25 })
  ],
  beam: [
    gsp('focus', 'Focused Lens', 'Range +30%.', { rng: 1.3 }),
    gsp('meltthrough', 'Melt-through', '+50% beam damage.', { dmg: 1.5 })
  ],
  rail: [
    gsp('quickcharge', 'Quick Charge', 'Charges 30% faster.', { charge: 0.7 }),
    gsp('overpen', 'Overpenetrator', '+60% damage.', { dmg: 1.6 })
  ],
  lob: [
    gsp('wideblast', 'Wide Blast', 'Blast radius +35%.', { splash: 1.35 }),
    gsp('doubledrop', 'Double Drop', 'Lobs two shells at once.', { multi: 1 })
  ],
  bounce: [
    gsp('rubber', 'Rubber Rounds', 'Two more ricochets.', { bounces: 2 }),
    gsp('twinlaunch', 'Twin Launch', 'Launches two at once.', { multi: 1 })
  ],
  sticky: [
    gsp('biggercharge', 'Bigger Charges', 'Blast radius +35%.', { splash: 1.35 }),
    gsp('twinlaunch', 'Twin Launch', 'Launches two at once.', { multi: 1 })
  ],
  harpoon: [
    gsp('barbed', 'Barbed Hook', '+50% damage.', { dmg: 1.5 }),
    gsp('longline', 'Long Line', 'Range +50% and +20% damage.', { rng: 1.5, dmg: 1.2 })
  ],
  blade: [
    gsp('serrated', 'Serrated Edge', '+30% melee damage.', { dmg: 1.3 }),
    gsp('berserker', 'Berserker', 'Hits 40% faster and 20% harder.', { rate: 1.4, dmg: 1.2 })
  ],
  ram: [
    gsp('reinforced', 'Reinforced Tip', '+30% ram damage.', { ram: 0.3 }),
    gsp('juggernaut', 'Juggernaut', '+50% ram damage, and you take 30% less from rams.', { ram: 0.5, ramIn: 0.3 })
  ],
  armour: [
    gsp('reactive', 'Reactive Plating', 'Explosions do 40% less damage to this part.', { res: { expl: 0.4 } }),
    gsp('selfrepair', 'Self-Repair', 'Repairs 2.5% of its HP every second.', { regen: 0.025 })
  ],
  move: [
    gsp('tuned', 'Tuned Engine', '+4% top speed and +10% acceleration.', { speed: 0.04, accel: 1.1 }),
    gsp('lowrider', 'Low Rider', '+5% top speed and 35% less knockback.', { speed: 0.05, knockRes: 0.35 })
  ],
  gadget: [null, null]
};
// Parts with their own idea; either slot can be null to fall back to the group.
const GEAR_SPECIAL_PART = {
  sniper: [
    gsp('headshot', 'Headshot', '25% chance to hit for 2.5× damage.', { crit: 0.25 }),
    gsp('armourpiercer', 'Armour Piercer', '+50% damage.', { dmg: 1.5 })
  ],
  scatter: [
    gsp('choke', 'Choke Barrel', 'Range +30%.', { rng: 1.3 }),
    gsp('dragonshells', "Dragon's Breath Shells", 'Every pellet sets parts on fire for 2 s.', { burn: 2 })
  ],
  kazoo: [
    gsp('annoying', 'Annoying Tune', 'The crowd loves it: +60% hype.', { hype: 0.6 }),
    gsp('kazoochoir', 'Kazoo Choir', 'Three notes per toot.', { multi: 2 })
  ],
  mirrorball: [gsp('disco', 'Disco Fever', 'The crowd loves it: +60% hype.', { hype: 0.6 }), null],
  snowball: [
    gsp('packedice', 'Packed Ice', 'Freezes 0.6 s longer.', { freeze: 0.6 }),
    gsp('avalanche', 'Avalanche', 'Three snowballs per throw.', { multi: 2 })
  ],
  bowling: [
    gsp('strike', 'Strike!', 'Knockback ×2.', { knock: 2 }),
    gsp('split', 'Seven-Ten Split', 'Two balls per throw.', { multi: 1 })
  ],
  tuba: [
    gsp('bassdrop', 'Bass Drop', 'Knockback ×2.', { knock: 2 }),
    gsp('brass', 'Brass Section', 'Two blasts at once.', { multi: 1 })
  ],
  piano: [
    gsp('grandpiano', 'Grand Piano', 'Blast radius +50%.', { splash: 1.5 }),
    gsp('encore', 'Encore', 'Drops two pianos.', { multi: 1 })
  ],
  toaster: [
    gsp('extracrispy', 'Extra Crispy', 'Toast sets parts on fire for 2 s.', { burn: 2 }),
    gsp('twoslices', 'Two Slices', 'Two pieces of toast per pop.', { multi: 1 })
  ],
  popcorn: [gsp('butter', 'Extra Butter', 'Kernels set parts on fire for 1 s.', { burn: 1 }), null],
  minigun: [gsp('prespun', 'Pre-spun Barrels', '+25% fire rate.', { rate: 1.25 }), null],
  nailgun: [gsp('rusty', 'Rusty Nails', '20% chance to hit for 2.5× damage.', { crit: 0.2 }), null],
  nailstorm: [gsp('rusty', 'Rusty Nails', '20% chance to hit for 2.5× damage.', { crit: 0.2 }), null],
  cannon: [null, gsp('broadside', 'Broadside', 'Two shells and +20% damage.', { multi: 1, dmg: 1.2 })],
  freeze: [
    gsp('deepfreeze', 'Deep Freeze', 'Range +30%.', { rng: 1.3 }),
    gsp('absolutezero', 'Absolute Zero', '+60% damage.', { dmg: 1.6 })
  ],
  saw: [gsp('diamondteeth', 'Diamond Teeth', '+30% melee damage.', { dmg: 1.3 }), null],
  drill: [gsp('armourbore', 'Armour Bore', '+35% melee damage.', { dmg: 1.35 }), null],
  hammer: [null, gsp('earthquake', 'Earthquake', 'Hits 50% harder.', { dmg: 1.5 })],
  spikeplate: [
    gsp('extraspikes', 'Extra Spikes', 'Bounces 30% of melee and ram damage back.', { thorns: 0.3 }),
    gsp('ironmaiden', 'Iron Maiden', 'Bounces 60% back.', { thorns: 0.6 })
  ],
  fridge: [
    gsp('freezerburn', 'Freezer Burn', 'Fire does 50% less damage to this part.', { res: { fire: 0.5 } }),
    gsp('icebox', 'Ice Box', 'Repairs 3% of its HP every second.', { regen: 0.03 })
  ],
  anvil: [
    gsp('dense', 'Extra Dense', '+40% part HP.', { hp: 1.4 }),
    gsp('immovable', 'Immovable', '50% less knockback on the car.', { knockRes: 0.5 })
  ],
  gnome: [gsp('luckygnome', 'Lucky Gnome', 'The crowd adores it: +60% hype.', { hype: 0.6 }), null],
  rubberduck: [gsp('squeaky', 'Squeaky', 'The crowd adores it: +60% hype.', { hype: 0.6 }), null],
  mirror: [gsp('polished', 'Polished', 'Energy does 40% less damage to this part.', { res: { energy: 0.4 } }), null],
  fireproof: [gsp('asbestos', 'Fire Blanket', 'Fire does 60% less damage to this part.', { res: { fire: 0.6 } }), null],
  ashtile: [gsp('asbestos', 'Fire Blanket', 'Fire does 60% less damage to this part.', { res: { fire: 0.6 } }), null],
  firebreak: [gsp('asbestos', 'Fire Blanket', 'Fire does 60% less damage to this part.', { res: { fire: 0.6 } }), null],
  bumper: [gsp('bouncy', 'Bouncy', 'You take 25% less ram damage.', { ramIn: 0.25 }), null],
  roundbumper: [gsp('bouncy', 'Bouncy', 'You take 25% less ram damage.', { ramIn: 0.25 }), null],
  fender: [gsp('bouncy', 'Bouncy', 'You take 25% less ram damage.', { ramIn: 0.25 }), null],
  tirewall: [gsp('bouncy', 'Bouncy', 'You take 25% less ram damage.', { ramIn: 0.25 }), null],
  heavyplate: [null, gsp('bastion', 'Bastion', '+40% part HP.', { hp: 1.4 })],
  booster: [gsp('afterburner', 'Afterburner', '+6% top speed.', { speed: 0.06 }), null],
  nitro: [gsp('afterburner', 'Afterburner', '+6% top speed.', { speed: 0.06 }), null],
  monster: [null, gsp('crusher', 'Car Crusher', '+40% ram damage.', { ram: 0.4 })],
  spikedwheel: [gsp('spinning', 'Spinning Spikes', '+25% ram damage.', { ram: 0.25 }), null],
  tusk: [null, gsp('mammoth', 'Mammoth', '+60% ram damage.', { ram: 0.6 })],
  batram: [gsp('homerun', 'Home Run', '+40% ram damage.', { ram: 0.4 }), null]
};
/** Which special group a part belongs to. */
function gearGroup(id) {
  const m = MOD[id];
  if (!m) return 'gadget';
  if (m.wpn) {
    const k = m.wpn.kind;
    if (k === 'tesla' || k === 'arc') return 'arc';
    if (GEAR_SPECIAL_GROUP[k]) return k;
    return 'gadget';
  }
  if (m.mel) return 'blade';
  if (m.cat === 'melee') return 'ram';
  if (m.cat === 'struct' || m.cat === 'defense') return 'armour';
  if (m.cat === 'move') return 'move';
  return 'gadget';
}
/** The two specials of a part: [level 5, level 10]. Level 5 can be null (then only Steady is offered). */
function gearSpecials(id) {
  const grp = GEAR_SPECIAL_GROUP[gearGroup(id)] || [null, null],
    own = GEAR_SPECIAL_PART[id] || [null, null],
    k = gearKind(id);
  return [own[0] || grp[0] || null, own[1] || grp[1] || GEAR_PLACEHOLDER[k]];
}
const gearSteady = id => GEAR_STEADY[gearKind(id)];
/** The fx that are switched on for a gear piece at its level and choice. */
function gearActiveSpecials(g) {
  const [s5, s10] = gearSpecials(g.id),
    out = [];
  if (g.lvl >= 5 && g.c5) out.push(g.c5 === 'sp' && s5 ? s5 : gearSteady(g.id));
  if (g.lvl >= 10) out.push(s10);
  return out;
}
/** Parts whose specials are still the placeholder (or missing at level 5). */
function gearToInvent() {
  return MODS.filter(m => m.id !== 'cockpit')
    .map(m => {
      const [s5, s10] = gearSpecials(m.id);
      return { id: m.id, name: m.name, cat: m.cat, need5: !s5, need10: !!s10.tbd };
    })
    .filter(x => x.need5 || x.need10);
}
