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
  const g = { u: x.u | 0, id: x.id, lvl: clamp(x.lvl | 0, 1, GEAR_MAX) };
  if (x.q && QUIRKS[x.q]) g.q = x.q;
  if (Array.isArray(x.qo)) g.qo = x.qo.filter(q => QUIRKS[q]).slice(0, 3);
  if (x.from) g.from = String(x.from).slice(0, 40);
  if (x.isNew) g.isNew = 1;
  return g;
}
const gearName = g => `${MOD[g.id].name}${g.lvl > 1 ? ' +' + (g.lvl - 1) : ''}`;
const gearById = u => GEAR.items.find(g => g.u === u);

/** Adds a gear item. A full locker turns the drop into bolts instead. */
function addGear(id, lvl = 1, quiet, from) {
  if (!MOD[id] || id === 'cockpit') return null;
  if (GEAR.items.length >= GEAR_CAP) {
    const b = gearScrapValue({ id, lvl });
    GEAR.bolts += b;
    saveGear();
    if (!quiet) toast(`Locker full: ${MOD[id].name} scrapped for ${b} bolts`);
    return null;
  }
  const g = { u: GEAR.next++, id, lvl: clamp(lvl, 1, GEAR_MAX), isNew: 1 };
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
function gearUpgrade(g) {
  if (g.lvl >= GEAR_MAX) return false;
  const c = gearCost(g);
  if (GEAR.bolts < c) return false;
  GEAR.bolts -= c;
  g.lvl++;
  if (g.lvl === 3 && !g.q) g.qo = quirkOffers(g);
  saveGear();
  return true;
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
  if (keep.lvl < GEAR_MAX) {
    keep.lvl++;
    if (keep.lvl === 3 && !keep.q) keep.qo = quirkOffers(keep);
  } else GEAR.bolts += gearScrapValue(lose);
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
  { id: 'melee', name: 'Melee crate', cost: 120, cats: ['melee'], desc: 'Saws, rams, flippers and other close friends.' },
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
const gearActive = () => G.mode === 'solo';
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
    .map(g => ({ id: g.id, lvl: g.lvl, q: g.q || null }));
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
    if (k === 'rate') I.gRate = 1 + b;
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
/** Bolts and a possible gear drop at the end of a single-player match. Returns what was earned. */
function matchSpoils(won, roundsWon, extra = {}) {
  if (!gearActive()) return null;
  let bolts = (won ? 50 : 20) + roundsWon * 6 + (extra.bolts || 0);
  bolts = Math.round(bolts * [0.8, 1, 1.3][G.diff ?? 1]);
  addBolts(bolts);
  const drops = [];
  if (Math.random() < (won ? 0.55 : 0.25) || extra.drop) {
    const used = [...new Set([...G.base.values(), ...G.top.values()].map(e => e.id))].filter(
      id => id !== 'cockpit' && MOD[id]
    );
    const id = extra.drop || (used.length ? pick(used) : pick(MODS.filter(m => m.rar <= 1)).id);
    const g = addGear(id, extra.dropLvl || 1, true, extra.from || 'Match salvage');
    if (g) drops.push(g);
  }
  return { bolts, drops };
}
function spoilsHtml(s) {
  if (!s) return '';
  return `<div class="spoils"><div class="sp-b"><i class="boltico" aria-hidden="true"></i><b>+${s.bolts} bolts</b><span>${GEAR.bolts} in the Workbench</span></div>${s.drops
    .map(
      g =>
        `<div class="sp-g"><img alt="" src="${iconURL(g.id, 64)}"><span>New gear · <b>${esc(gearName(g))}</b></span></div>`
    )
    .join('')}</div>`;
}
