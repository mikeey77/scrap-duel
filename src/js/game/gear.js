// Personal gear and sticker flair: your own upgraded parts (found again in matches) and sticker perks.
// Only single-player cars carry gear or flair; online configs never include them.

let GEAR = { bolts: 0, items: [], next: 1, loadout: [], locked: [] };
function loadGear() {
  try {
    const g = JSON.parse(load('sd.gear') || 'null');
    if (g && Array.isArray(g.items)) {
      GEAR = {
        bolts: Math.max(0, g.bolts | 0),
        items: g.items.filter(x => x && MOD[x.id] && x.lvl >= 1).map(sanitizeGear),
        next: Math.max(1, g.next | 0),
        loadout: [],
        locked: []
      };
      for (const x of GEAR.items) GEAR.next = Math.max(GEAR.next, x.u + 1);
      const has = u => GEAR.items.some(x => x.u === u);
      GEAR.loadout = (Array.isArray(g.loadout) ? g.loadout : []).filter(has).slice(0, 4);
      GEAR.locked = (Array.isArray(g.locked) ? g.locked : []).filter(has);
      return;
    }
  } catch (e) {}
  // first time: three starter pieces so the Workbench is never empty
  GEAR = { bolts: 60, items: [], next: 1, loadout: [], locked: [] };
  for (const id of ['wheel', 'frame', 'mg']) if (MOD[id]) addGear(id, 1, true);
  GEAR.loadout = GEAR.items.filter(g => g.id === 'mg').map(g => g.u);
  saveGear();
}
const saveGear = () => store('sd.gear', GEAR);
function sanitizeGear(x) {
  const g = { u: x.u | 0, id: x.id, lvl: clamp(x.lvl | 0, 1, GEAR_MAX), xp: Math.max(0, x.xp | 0) };
  if (x.q && QUIRKS[x.q]) g.q = x.q;
  if (x.c5 === 'sp' || x.c5 === 'st') g.c5 = x.c5;
  if (Array.isArray(x.qo)) g.qo = x.qo.filter(q => QUIRKS[q]).slice(0, 3);
  if (x.from) g.from = String(x.from).slice(0, 40);
  if (x.isNew) g.isNew = 1;
  return g;
}
const gearName = g => `${MOD[g.id].name} Lv ${g.lvl}`;
const gearById = u => GEAR.items.find(g => g.u === u);

/** Adds a gear item. A full locker turns the drop into bolts instead. */
function addGear(id, lvl = 1, quiet, from) {
  if (!MOD[id] || id === 'cockpit') return null;
  if (GEAR.items.length >= GEAR_CAP) {
    const b = gearScrapValue({ id, lvl });
    GEAR.bolts += b;
    saveGear();
    if (!quiet) toast(`Gear storage full: ${MOD[id].name} scrapped for ${b} bolts`);
    return null;
  }
  const g = { u: GEAR.next++, id, lvl: clamp(lvl, 1, GEAR_MAX), xp: 0, isNew: 1 };
  if (from) g.from = from;
  if (g.lvl >= 3) g.qo = quirkOffers(g);
  GEAR.items.push(g);
  saveGear();
  return g;
}
function addBolts(n) {
  GEAR.bolts = Math.max(0, GEAR.bolts + Math.round(n));
  saveGear();
}
/** Three random quirks that fit this part. */
function quirkOffers(g) {
  const k = gearKind(g.id),
    pool = QUIRK_IDS.filter(q => QUIRKS[q].fits(k));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
/** Upgrading needs a full XP bar (play matches with the part) and bolts (win matches). */
function gearUpgrade(g) {
  if (g.lvl >= GEAR_MAX || !gearReady(g)) return false;
  const c = gearCost(g);
  if (GEAR.bolts < c) return false;
  GEAR.bolts -= c;
  g.xp -= gearNeed(g.lvl);
  g.lvl++;
  if (g.lvl === 3 && !g.q) g.qo = quirkOffers(g);
  saveGear();
  return true;
}
/** Level 5: the part's own special ('sp') or Steady ('st'). Can be changed later for bolts. */
const SPECIAL_SWAP = 40;
function gearPickSpecial(g, c) {
  if (g.lvl < 5 || (c !== 'sp' && c !== 'st')) return false;
  if (c === 'sp' && !gearSpecials(g.id)[0]) return false;
  if (g.c5 && g.c5 !== c) {
    if (GEAR.bolts < SPECIAL_SWAP) return false;
    GEAR.bolts -= SPECIAL_SWAP;
  }
  g.c5 = c;
  saveGear();
  return true;
}
/** XP for every gear piece that rode along in a match. Returns [{g, xp, ready}]. */
function gearGainXp(n) {
  const out = [];
  for (const u of new Set(Object.values(G.gearFound || {}))) {
    const g = gearById(u);
    if (!g || g.lvl >= GEAR_MAX) continue;
    const was = gearReady(g);
    g.xp = Math.min((g.xp || 0) + n, gearNeed(g.lvl) * 2);
    out.push({ g, xp: n, ready: !was && gearReady(g) });
  }
  saveGear();
  return out;
}
function gearPickQuirk(g, q) {
  if (!g.qo || !g.qo.includes(q)) return false;
  g.q = q;
  delete g.qo;
  saveGear();
  return true;
}
/** Reroll costs bolts; keeps the level. */
const QUIRK_REROLL = 25;
function gearRerollQuirk(g) {
  if (g.lvl < 3 || GEAR.bolts < QUIRK_REROLL) return false;
  GEAR.bolts -= QUIRK_REROLL;
  g.qo = quirkOffers(g);
  delete g.q;
  saveGear();
  return true;
}
/** Two copies of the same part fuse into one, one level above the better copy. */
function gearFuse(a, b) {
  if (!a || !b || a === b || a.id !== b.id) return false;
  const keep = a.lvl >= b.lvl ? a : b,
    lose = keep === a ? b : a;
  GEAR.items = GEAR.items.filter(x => x !== lose);
  if (GEAR.loadout.includes(lose.u)) GEAR.loadout = GEAR.loadout.map(u => (u === lose.u ? keep.u : u));
  GEAR.loadout = [...new Set(GEAR.loadout)];
  GEAR.locked = GEAR.locked.filter(u => u !== lose.u);
  // the spare copy becomes experience for the one you keep
  if (keep.lvl < GEAR_MAX) keep.xp = Math.min((keep.xp || 0) + (lose.xp || 0) + 50 * lose.lvl, gearNeed(keep.lvl) * 2);
  else GEAR.bolts += gearScrapValue(lose);
  if (!keep.q && lose.q) keep.q = lose.q;
  saveGear();
  return keep;
}
function gearScrap(g) {
  if (gearLocked(g)) return false;
  GEAR.items = GEAR.items.filter(x => x !== g);
  GEAR.loadout = GEAR.loadout.filter(u => u !== g.u);
  GEAR.bolts += gearScrapValue(g);
  for (const k in G.gearFound || {}) if (G.gearFound[k] === g.u) delete G.gearFound[k];
  saveGear();
}

/* ---------- loadout, locks and fabrication ---------- */
/** Loadout slots: 3, a fourth at Scrap Cred level 10. Loadout gear is in your bin from round 1. */
const loadoutSlots = () => (levelInfo().lvl >= 10 ? 4 : 3);
const gearEquipped = g => GEAR.loadout.includes(g.u);
const gearLocked = g => GEAR.locked.includes(g.u);
function gearEquip(g) {
  if (gearEquipped(g)) {
    GEAR.loadout = GEAR.loadout.filter(u => u !== g.u);
    saveGear();
    return 'off';
  }
  if (GEAR.loadout.length >= loadoutSlots()) return 'full';
  GEAR.loadout.push(g.u);
  saveGear();
  return 'on';
}
function gearLock(g) {
  GEAR.locked = gearLocked(g) ? GEAR.locked.filter(u => u !== g.u) : [...GEAR.locked, g.u];
  saveGear();
}
/** Fabricator: bolts in, a random level-1 part of the chosen kind out. */
const FAB = [
  { id: 'weapon', name: 'Gun crate', cost: 140, cats: ['weapon'], desc: 'A random gun, launcher or beam.' },
  {
    id: 'melee',
    name: 'Melee crate',
    cost: 120,
    cats: ['melee'],
    desc: 'Saws, rams, flippers and other close friends.'
  },
  { id: 'armour', name: 'Armour crate', cost: 90, cats: ['struct', 'defense'], desc: 'Plates, frames and shields.' },
  { id: 'move', name: 'Engine crate', cost: 90, cats: ['move'], desc: 'Wheels, tracks, boosters and legs.' },
  { id: 'gadget', name: 'Gadget crate', cost: 110, cats: ['utility', 'chaos'], desc: 'Odd tools and dirty tricks.' }
];
const FAB_RAR = [55, 30, 12, 3, 0];
function fabricate(kind) {
  const F = FAB.find(f => f.id === kind);
  if (!F || GEAR.bolts < F.cost || GEAR.items.length >= GEAR_CAP) return null;
  const pool = MODS.filter(m => F.cats.includes(m.cat) && m.id !== 'cockpit' && m.rar <= 3);
  if (!pool.length) return null;
  let roll = Math.random() * FAB_RAR.reduce((a, b) => a + b, 0),
    rar = 0;
  while (rar < 3 && (roll -= FAB_RAR[rar]) > 0) rar++;
  const of = pool.filter(m => m.rar === rar),
    m = pick(of.length ? of : pool);
  GEAR.bolts -= F.cost;
  return addGear(m.id, 1, true, 'Fabricator');
}
/** At the start of a single-player match: every loadout piece goes straight into your bin. */
function applyLoadout() {
  if (!gearActive()) return;
  for (const u of GEAR.loadout) {
    const g = gearById(u);
    if (g) findGear(g);
  }
}

/* ---------- gear in a match ---------- */
const gearActive = () => G.mode === 'solo' && G.format !== 'brawl';
/** Gear you have that is not yet found in this match. */
const gearMissing = () =>
  GEAR.items.filter(g => !Object.values(G.gearFound || {}).includes(g.u) && !(G.gearFound || {})[g.id]);
/** Taking a gear card: one copy of the part, upgraded while it is on your car. */
function findGear(g) {
  G.gearFound = G.gearFound || {};
  G.gearFound[g.id] = g.u;
  gainWithSupport(g.id, 1);
}
/** Config payload: the found gear (single player only). */
function gearCfg() {
  if (!gearActive() || !G.gearFound) return null;
  const list = Object.values(G.gearFound)
    .map(gearById)
    .filter(Boolean)
    .map(g => ({ id: g.id, lvl: g.lvl, q: g.q || null, c5: g.c5 || null }));
  return list.length ? list : null;
}
/** Sticker and set perks for your car config. */
function flairCfg() {
  if (!gearActive()) return null;
  const st = (G.style.stickers || []).filter(id => STICKER[id]);
  if (!st.length) return null;
  const fx = { res: {} };
  const add = f => {
    for (const k in f)
      if (k === 'res') for (const t in f.res) fx.res[t] = (fx.res[t] || 0) + f.res[t];
      else fx[k] = (fx[k] || 0) + f[k];
  };
  for (const id of st) add(STICKER[id].fx);
  const set = activeSet();
  if (set) {
    add(SET_FX[set]);
    fx.set = set;
  }
  return fx;
}
/** The set bonus is on when the livery's set has at least two matching stickers. */
function activeSet(style = G.style) {
  const s = liverySet(style.livery);
  if (!s) return null;
  const n = (style.stickers || []).filter(id => STICKER[id] && STICKER[id].set === s).length;
  return n >= 2 ? s : null;
}

const speedMul = (v, k) => {
  v.c.topCap *= 1 + k;
  v.c.accel *= 1 + k * 0.6;
};
/** Applies gear to a freshly built car: the first matching part of each gear entry is upgraded. */
function applyGear(v, list) {
  if (!list) return;
  for (const g of list) {
    const I = v.insts.find(x => x.id === g.id && !x.gear);
    if (!I) continue;
    I.gear = g;
    const b = gearBonus(g),
      k = gearKind(g.id);
    let hpK = k === 'hp' ? 1 + b : 1;
    if (k === 'dmg') applyGearFx(v, I, { dmg: 1 + b });
    if (k === 'speed') speedMul(v, b);
    const q = g.q;
    if (q === 'overclock') {
      I.gRate = (I.gRate || 1) * 1.2;
      I.gFrag = 0.25;
    } else if (q === 'bulky') {
      hpK *= 1.35;
      speedMul(v, -0.03);
    } else if (q === 'feather') {
      hpK *= 0.8;
      speedMul(v, 0.03);
    } else if (q === 'spiky') {
      hpK *= 0.9;
      I.gSpiky = 0.25;
    } else if (q === 'selfheal') {
      I.gRegen = 0.02;
      speedMul(v, -0.02);
    } else if (q === 'showoff') {
      hpK *= 0.85;
      v.hypeK = (v.hypeK || 0) + 0.5;
    } else if (q === 'magnetic') {
      v.reach = (v.reach || 0) + 0.5;
      speedMul(v, -0.02);
    } else if (q === 'tantrum') {
      hpK *= 0.9;
      I.gBurst = 1;
    }
    for (const S of gearActiveSpecials(g)) if (S) hpK *= applyGearFx(v, I, S.fx);
    if (g.lvl >= GEAR_MAX) {
      I.mw = true;
      v.hypeK = (v.hypeK || 0) + 0.25;
    }
    if (hpK !== 1) {
      v.total += I.max * (hpK - 1);
      I.max *= hpK;
      I.hp *= hpK;
    }
  }
  if (v.insts.some(I => I.gRegen)) v.gearHeal = true;
}
/** One special's effects on its part (and the car). Returns the HP multiplier for the caller to apply. */
function applyGearFx(v, I, fx) {
  const W = I.W;
  let hpK = 1;
  for (const [key, val] of Object.entries(fx)) {
    if (key === 'dmg') {
      if (W) {
        if (W.dmg) W.dmg *= val;
        if (W.dps) W.dps *= val;
      }
      I.gDmg = (I.gDmg || 1) * val;
      if (!W && !I.m.mel && I.m.cat === 'melee') v.gRamOut = (v.gRamOut || 0) + (val - 1); // rams hit with the car
    } else if (key === 'rate') I.gRate = (I.gRate || 1) * val;
    else if (key === 'hp') hpK *= val;
    else if (key === 'regen') I.gRegen = (I.gRegen || 0) + val;
    else if (key === 'thorns') I.gSpiky = (I.gSpiky || 0) + val;
    else if (key === 'res') {
      I.gRes = I.gRes || {};
      for (const t in val) I.gRes[t] = (I.gRes[t] || 0) + val[t];
    } else if (key === 'blast') I.gBurst = 1;
    else if (key === 'speed') speedMul(v, val);
    else if (key === 'accel') v.c.accel *= val;
    else if (key === 'ram') v.gRamOut = (v.gRamOut || 0) + val;
    else if (key === 'ramIn') v.gRamIn = Math.min(0.6, (v.gRamIn || 0) + val);
    else if (key === 'knockRes') v.knockRes = Math.min(0.7, (v.knockRes || 0) + val);
    else if (key === 'hype') v.hypeK = (v.hypeK || 0) + val;
    else if (W) {
      // weapon tuning: these change this part's own weapon stats
      if (key === 'splash') W.splash = (W.splash || 0) * val;
      else if (key === 'rng' && W.rng) W.rng *= val;
      else if (key === 'spd' && W.spd) W.spd *= val;
      else if (key === 'knock') W.knock = (W.knock || 1) * val;
      else if (key === 'bounces') W.bounces = (W.bounces || 3) + val;
      else if (key === 'chain') W.chain = (W.chain || 0) + val;
      else if (key === 'charge' && W.charge) W.charge *= val;
      else if (key === 'push' && W.push) W.push *= val;
      else if (key === 'freeze') W.freeze = (W.freeze || 0) + val;
      else if (key === 'volley') {
        if (W.burst) W.burst += val;
        else I.gx = { ...(I.gx || {}), multi: ((I.gx && I.gx.multi) || 0) + 1 };
      } else if (['multi', 'burn', 'shock', 'crit', 'splashAdd'].includes(key))
        I.gx = { ...(I.gx || {}), [key]: ((I.gx && I.gx[key]) || 0) + val };
    }
  }
  return hpK;
}
/** Shot specials: called for the shots and lobs a gear part just fired. */
function gearShots(v, I, n0, l0) {
  const x = I.gx;
  for (let i = n0, n = B.shots.length; i < n; i++) {
    const s = B.shots[i];
    if (s.own !== v.idx) continue;
    if (x.burn) s.burn = x.burn;
    if (x.shock) s.shock = x.shock;
    if (x.splashAdd) s.splash = Math.max(s.splash || 0, x.splashAdd);
    if (x.crit && Math.random() < x.crit) {
      s.dmg *= 2.5;
      s.crit = 1;
    }
    for (let k = 1; k <= (x.multi || 0); k++) {
      const a = (k % 2 ? 1 : -1) * 0.09 * Math.ceil(k / 2),
        c = Math.cos(a),
        si = Math.sin(a);
      B.shots.push({ ...s, vx: s.vx * c - s.vy * si, vy: s.vx * si + s.vy * c, tgt: s.tgt });
    }
  }
  if (x.multi)
    for (let i = l0, n = B.lobs.length; i < n; i++) {
      const l = B.lobs[i];
      if (l.own !== v.idx) continue;
      for (let k = 1; k <= x.multi; k++) B.lobs.push({ ...l, tx: l.tx + rnd(-40, 40), ty: l.ty + rnd(-40, 40) });
    }
}
function applyFlair(v, fx) {
  if (!fx) return;
  v.flair = fx;
  if (fx.speedK) speedMul(v, fx.speedK);
  if (fx.hpK)
    for (const I of v.insts) {
      I.max *= 1 + fx.hpK;
      I.hp *= 1 + fx.hpK;
    }
  if (fx.hpK) v.total *= 1 + fx.hpK;
  if (fx.rateK) v.rateMul = (v.rateMul || 1) * (1 + fx.rateK);
  if (fx.dmgK) v.dmgOut = (v.dmgOut || 1) * (1 + fx.dmgK);
  if (fx.hypeK) v.hypeK = (v.hypeK || 0) + fx.hypeK;
  if (fx.reach) v.reach = (v.reach || 0) + fx.reach;
  if (fx.quick) v.buff = { p: 'speed', t: 7 };
}
/** Extra damage rules from gear and stickers, called from hurtInst. */
function flairHurt(v, I, a, type, attacker) {
  if (I.gFrag) a *= 1 + I.gFrag;
  if (I.gRes && I.gRes[type]) a *= 1 - Math.min(0.7, I.gRes[type]);
  if (type === 'ram' && attacker && attacker !== v) {
    if (attacker.gRamOut) a *= 1 + attacker.gRamOut;
    if (v.gRamIn) a *= 1 - v.gRamIn;
  }
  if (v.flair && v.flair.res[type]) a *= 1 - Math.min(0.5, v.flair.res[type]);
  if (type === 'ram' && attacker && attacker.flair && attacker.flair.ramOut) a *= 1 + attacker.flair.ramOut;
  if (I.gSpiky && attacker && attacker !== v && (type === 'ram' || type === 'melee' || type === 'kin')) {
    const t = attacker.insts.filter(x => x.alive && x.layer === 'b' && x.id !== 'cockpit');
    if (t.length) hurtInst(attacker, pick(t), a * I.gSpiky, 'light', undefined, undefined, undefined, undefined, v.idx);
  }
  return a;
}
/** Per-tick healing from gear and the Junkyard set. */
function gearRegen(v, dt) {
  const mend = v.flair && v.flair.mend;
  for (const I of v.insts)
    if (I.alive && I.hp < I.max) {
      const r = (I.gRegen || 0) + (mend || 0);
      if (r) I.hp = Math.min(I.max, I.hp + I.max * r * dt);
    }
}
/** Tantrum quirk: a broken gear part goes out with a scrap burst. */
function gearBreak(v, I) {
  if (!I.gBurst) return;
  const [x, y] = ipos(v, I);
  setTimeout(() => {
    if (B) explode(x, y, 70, 45, 'expl', v.idx);
  }, 80);
}

/* ---------- rewards ---------- */
/** End of a single-player match. Bolts come from winning (every round you win, more for the match),
 *  XP from playing: every gear piece that rode along gets it. A gear drop is a bonus. */
function matchSpoils(won, roundsWon, extra = {}) {
  if (!gearActive()) return null;
  let bolts = (won ? 40 : 0) + roundsWon * 5 + (extra.bolts || 0);
  bolts = Math.max(0, Math.round(bolts * [0.8, 1, 1.3][G.diff ?? 1]));
  addBolts(bolts);
  const played = extra.rounds ?? (G.log ? G.log.length : G.round || 1),
    xp = gearGainXp(Math.round(20 + 6 * played + (won ? 10 : 0)));
  const drops = [];
  if (Math.random() < (won ? 0.55 : 0.25) || extra.drop) {
    const used = [...new Set([...G.base.values(), ...G.top.values()].map(e => e.id))].filter(
      id => id !== 'cockpit' && MOD[id]
    );
    const id = extra.drop || (used.length ? pick(used) : pick(MODS.filter(m => m.rar <= 1)).id);
    const g = addGear(id, extra.dropLvl || 1, true, extra.from || 'Match salvage');
    if (g) drops.push(g);
  }
  return { bolts, drops, xp };
}
function spoilsHtml(s) {
  if (!s) return '';
  return `<div class="spoils"><div class="sp-b"><i class="boltico" aria-hidden="true"></i><b>+${s.bolts} bolts</b><span>${s.bolts ? 'for your wins' : 'win rounds to earn bolts'} · ${GEAR.bolts} in the Garage</span></div>${(
    s.xp || []
  )
    .map(
      ({ g, xp, ready }) =>
        `<div class="sp-x${ready ? ' ready' : ''}"><img alt="" src="${iconURL(g.id, 48)}"><span><b>${esc(gearName(g))}</b> +${xp} XP</span>${xpBar(g)}${ready ? '<em>Ready to upgrade</em>' : ''}</div>`
    )
    .join('')}${s.drops
    .map(
      g =>
        `<div class="sp-g"><img alt="" src="${iconURL(g.id, 64)}"><span>New gear · <b>${esc(gearName(g))}</b></span></div>`
    )
    .join('')}</div>`;
}
/** A small XP bar in the colour of the part's level. */
function xpBar(g) {
  if (g.lvl >= GEAR_MAX)
    return `<span class="xpbar2 max" style="--lc:${lvCol(g.lvl)}"><i style="width:100%"></i><b>Max level</b></span>`;
  const need = gearNeed(g.lvl),
    f = clamp((g.xp || 0) / need, 0, 1);
  return `<span class="xpbar2${f >= 1 ? ' full' : ''}" style="--lc:${lvCol(g.lvl)}"><i style="width:${Math.round(f * 100)}%"></i><b>${Math.min(g.xp || 0, need)} / ${need} XP</b></span>`;
}

/* ---------- the wallet: every currency side by side ---------- */
/** Coins (this match), bolts (kept, from wins) and Scrap Cred (your level), with a "?" that explains them. */
function walletHtml(opt = {}) {
  const L = levelInfo(),
    coins =
      opt.coins != null
        ? `<span class="wl coins" title="Coins: spend them in the shop during a match. Every match starts fresh."><i class="coinico" aria-hidden="true"></i><b>${opt.coins}</b><small>coins</small></span>`
        : '';
  return `<div class="wallet" role="group" aria-label="Your currencies">${coins}
    <span class="wl bolts" title="Bolts: earned by winning rounds and matches. Spend them on gear upgrades and the Fabricator."><i class="boltico" aria-hidden="true"></i><b>${GEAR.bolts}</b><small>bolts</small></span>
    <span class="wl cred" title="Scrap Cred: your player level. Playing anything fills it and unlocks skins, stickers and a 4th loadout slot."><b class="lvn">${L.lvl}</b><span class="xpb"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></span><small>Scrap Cred</small></span>
    <button class="wl-help" type="button" aria-label="What are coins, bolts and XP?" title="What are these?">?</button></div>`;
}
/** A one-card explanation of the currencies and gear XP. */
function showWalletHelp() {
  let ov = $('#ovWallet');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'ovWallet';
    ov.hidden = true;
    document.body.appendChild(ov);
  }
  ov.innerHTML = `<div class="card walletcard"><span class="label">How you earn things</span><h2>Coins, bolts and XP</h2>
    <dl>
      <dt><i class="coinico" aria-hidden="true"></i> Coins</dt><dd>Only inside a match. Spend them in the shop and on crates between rounds. Every match starts fresh.</dd>
      <dt><i class="boltico" aria-hidden="true"></i> Bolts</dt><dd>Kept forever. You earn them by <b>winning</b>: every round you win, and more for winning the match. Spend them on gear upgrades and in the Fabricator.</dd>
      <dt><span class="xpdot" aria-hidden="true"></span> Gear XP</dt><dd>Every gear piece in your car earns XP by <b>playing</b>, win or lose. When its bar is full, you can upgrade it with bolts.</dd>
      <dt><b class="lvn">3</b> Scrap Cred</dt><dd>Your player level. Everything you play fills it and unlocks skins, stickers, titles and a fourth loadout slot.</dd>
    </dl>
    <button class="btn" id="wlDone">Got it</button></div>`;
  ov.hidden = false;
  $('#wlDone').onclick = () => {
    ov.hidden = true;
    store('sd.walletSeen', '1');
    sfx('ui');
  };
}
addEventListener('click', e => {
  if (e.target.closest && e.target.closest('.wl-help')) {
    sfx('ui');
    showWalletHelp();
  }
});
