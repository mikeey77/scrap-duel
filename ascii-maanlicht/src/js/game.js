// ---------- game state: players, enemies, combat, loot, day/night, weather ----------
const G = {
  time: 0,           // seconds since start (animation clock)
  day: 0.78,         // 0..1 time of day (0 = midnight, .5 = noon)
  dayLen: 480,       // seconds per full day
  dayCount: 1,
  players: [],
  enemies: [],
  villagers: [],
  drops: [],
  particles: [],
  projectiles: [],
  floaters: [],
  cam: { sx: 0, sy: 0, ppu: 40, zoom: 1 },
  env: {},
  weather: { state: 'helder', t: 90, rain: 0, cloud: 0.2, wet: 0, flash: 0, next: 0 },
  raw: false,
  paused: false,
  msg: []
};
const PLAYER_COLORS = [
  { name: 'Wanderer', c1: [0.36, 0.38, 0.46], c2: [0.55, 0.12, 0.1], tag: '#ffd28a' },
  { name: 'Skald', c1: [0.3, 0.42, 0.3], c2: [0.15, 0.3, 0.55], tag: '#9be38a' },
  { name: 'Runa', c1: [0.45, 0.36, 0.3], c2: [0.45, 0.2, 0.5], tag: '#d9a6ff' },
  { name: 'Ivar', c1: [0.42, 0.42, 0.42], c2: [0.6, 0.45, 0.1], tag: '#8ad0ff' }
];
const ENEMY = {
  skeleton: { nl: 'Skelet', type: 2, hp: 38, dmg: [5, 9], spd: 2.5, range: 1.25, cd: 1.3, xp: 24, c1: [0.86, 0.83, 0.74], c2: [0.4, 0.38, 0.33], weapon: 1, wc: [0.5, 0.48, 0.42], scale: 1 },
  slime: { nl: 'Slijmer', type: 3, hp: 26, dmg: [3, 6], spd: 1.7, range: 0.95, cd: 1.1, xp: 14, c1: [0.35, 0.85, 0.4], scale: 1 },
  wisp: { nl: 'Dwaallicht', type: 4, hp: 18, dmg: [3, 5], spd: 3.1, range: 1.1, cd: 1.4, xp: 20, c1: [0.5, 0.75, 1], scale: 1, mana: true },
  warden: { nl: 'Grafwachter', type: 2, hp: 420, dmg: [14, 22], spd: 2.1, range: 1.9, cd: 1.6, xp: 320, c1: [0.75, 0.78, 0.86], c2: [0.25, 0.3, 0.45], weapon: 2, wc: [0.55, 0.85, 1], scale: 1.65, boss: true }
};
const VILLAGER_LINES = [
  'De nachten worden langer, wandelaar.',
  'Blijf bij het vuur als de skeletten lopen.',
  'In de ruïnes ligt nog oud zilver, zegt men.',
  'Dwaallichten drinken je mana. Pas op.',
  'Over de brug ligt het volgende dorp.',
  'Wie bij het vuur rust, heelt sneller.',
  'Mijn opa zag de Grafwachter ooit. Nooit meer.',
  'Regen is goed voor de oogst. Slecht voor je laarzen.'
];

function newPlayer(i) {
  const pc = PLAYER_COLORS[i];
  const r = mulberry(W.seed + i * 13);
  const p = {
    idx: i, name: i === 0 ? ME.name : pc.name, netId: i === 0 ? ME.id : ME.id + '-' + i, c1: pc.c1, c2: pc.c2, tag: pc.tag,
    x: W.spawn.x + (i - 0.5) * 1.6, y: W.spawn.y, face: 1, dir: [1, 0], phase: 0, move: 0,
    level: 1, xp: 0, gold: 15, str: 12, dex: 10, int: 9,
    hp: 100, mp: 50, atkT: 0, atkCd: 0, hurt: 0, spellCd: 0, dead: 0,
    bag: [], eq: {}, potions: 2,
    input: null
  };
  p.eq.weapon = makeItem(r, 1, 0, 'sword');
  p.eq.armor = makeItem(r, 1, 0, i % 2 ? 'robe' : 'armor');
  p.bag.push(makeItem(r, 1, 0, 'shield'), makeItem(r, 1, 0, 'hood'));
  const s = stats(p);
  p.hp = s.hpMax;
  p.mp = s.mpMax;
  return p;
}
function stats(p) {
  const s = { str: p.str + p.level * 2, dex: p.dex + p.level, int: p.int + p.level, armor: 0, eva: 0, crit: 5, dmg: [2, 4], spd: 0.55, hpMax: 80 + p.level * 18, mpMax: 40 + p.level * 7, leech: 0, haste: 0 };
  for (const k of SLOTS) {
    const it = p.eq[k];
    if (!it) continue;
    const t = it.stats;
    if (t.dmg) { s.dmg = t.dmg.slice(); s.spd = t.spd; }
    s.armor += t.armor || 0;
    s.eva += t.eva || 0;
    s.crit += t.crit || 0;
    s.int += t.int || 0;
    s.hpMax += t.hp || 0;
    s.mpMax += t.mp || 0;
    for (const rk of it.runes) {
      if (rk === 'leech') s.leech += 0.05;
      if (rk === 'haste') s.haste += 0.12;
      if (rk === 'might') s.str += 6;
      if (rk === 'ward') s.armor += 20;
      if (rk === 'spark') s.mpMax += 20;
      if (rk === 'sight') s.crit += 4;
    }
  }
  s.mpMax += s.int * 2;
  s.spd /= 1 + s.haste;
  const m = p.eq.weapon ? MATERIALS[p.eq.weapon.mat] : null;
  s.fx = m ? m.fx : null;
  s.dps = (((s.dmg[0] + s.dmg[1]) / 2) * (1 + s.str * 0.02)) / s.spd;
  return s;
}
function playerLook(p) {
  const w = p.eq.weapon, sh = p.eq.shield, hm = p.eq.helm, ar = p.eq.armor;
  return {
    c1: ar ? mixc(p.c1, MATERIALS[ar.mat].col, ar.base === 'robe' ? 0.25 : 0.5) : p.c1,
    c2: hm ? MATERIALS[hm.mat].col : p.c2,
    capeCol: p.c2,
    weapon: w ? BASES[w.base].wpn : 0,
    wc: w ? MATERIALS[w.mat].col : [0.7, 0.7, 0.7],
    shield: sh ? 1 : 0,
    helm: hm ? 1 : 0
  };
}
const mixc = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const xpNext = lv => Math.round(80 * Math.pow(lv, 1.45));

function say(text, col = '#cfd8e3') {
  G.msg.push({ text, col, t: 6 });
  if (G.msg.length > 6) G.msg.shift();
}
function floater(x, y, text, col, big = false) {
  G.floaters.push({ x, y, z: 2.2, text, col, t: 1.1, big });
}
function burst(x, y, z, col, n = 10, glyph = GI.SPARK, spd = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = spd * (0.4 + Math.random());
    G.particles.push({ x, y, z, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.3, vz: 1 + Math.random() * 3, col, glyph: glyph + Math.floor(Math.random() * 2), size: 0.22, life: 0.5 + Math.random() * 0.6, grav: 7 });
  }
}

// ---------- day / night + weather ----------
function realDay() {
  const d = new Date();
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000) / 86400;
}
function updateEnv(dt) {
  if (G.timeOverride == null) G.day = realDay();
  else G.day = G.timeOverride;
  G.dayCount = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5) - 20300;
  const d = G.day;
  const sunE = Math.sin((d - 0.25) * TAU); // >0 day
  const az = (d - 0.25) * Math.PI; // east -> west
  let sunDir, sunCol;
  const night = smooth(0.08, -0.12, sunE);
  const w = G.weather;
  const dim = 1 - w.cloud * 0.45 - w.rain * 0.25;
  if (sunE > -0.05) {
    sunDir = [Math.cos(az) * 0.85, 0.45, Math.max(0.08, sunE)];
    const warm = smooth(0.45, 0.02, sunE);
    sunCol = [lerp(1.35, 1.5, warm), lerp(1.28, 0.75, warm), lerp(1.12, 0.35, warm)].map(v => v * smooth(-0.05, 0.12, sunE) * dim);
  } else {
    const maz = (d + 0.25) * Math.PI;
    sunDir = [Math.cos(maz) * 0.7, 0.5, 0.55];
    sunCol = [0.28, 0.38, 0.62].map(v => v * dim * smooth(-0.05, -0.2, sunE));
  }
  const dayAmb = [0.5, 0.56, 0.66], nightAmb = [0.05, 0.068, 0.12], duskAmb = [0.42, 0.28, 0.3];
  let amb = mixc(nightAmb, dayAmb, smooth(-0.18, 0.25, sunE));
  amb = mixc(amb, duskAmb, smooth(0.35, 0.05, Math.abs(sunE)) * 0.35);
  amb = amb.map(v => v * (1 - w.rain * 0.25));
  const sky = mixc([0.05, 0.08, 0.16], [0.45, 0.6, 0.8], smooth(-0.1, 0.3, sunE)).map(v => v * (1 - w.cloud * 0.3));
  // weather state machine
  // weather follows real time in 15-minute slots, the same for everyone in the same world
  if (!w.forced) {
    const slot = Math.floor(Date.now() / 900000), r = hf(slot, 7, W.seed);
    w.state = r < 0.45 ? 'helder' : r < 0.72 ? 'bewolkt' : r < 0.92 ? 'regen' : 'onweer';
  }
  const tgt = { helder: [0, 0.1], bewolkt: [0, 0.6], regen: [0.7, 0.8], onweer: [1, 1] }[w.state];
  w.rain = lerp(w.rain, tgt[0], dt * 0.15);
  w.cloud = lerp(w.cloud, tgt[1], dt * 0.15);
  w.wet = clamp(w.wet + (w.rain > 0.3 ? dt * 0.05 : -dt * 0.012), 0, 1);
  w.flash = Math.max(0, w.flash - dt * 3);
  if (w.state === 'onweer' && Math.random() < dt * 0.12) {
    w.flash = 1.2;
    setTimeout(() => sfx('thunder'), 300 + Math.random() * 900);
  }
  const mist = clamp(smooth(0.18, 0.0, Math.abs(d - 0.24)) + night * 0.35 + w.rain * 0.3, 0, 1);
  G.env = {
    sunDir, sunCol, amb, sky, night, mist,
    rain: w.rain, cloud: w.cloud, wet: w.wet, flash: w.flash,
    exposure: lerp(1.25, 2.6, night),
    sunE
  };
}
function clockText() {
  const m = Math.floor(G.day * 1440), h = Math.floor(m / 60), mm = m % 60;
  const d = new Date();
  const date = `${['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][d.getDay()]} ${d.getDate()} ${['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()]}`;
  return `${date} · ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ---------- movement with collision ----------
function tryMove(e, dx, dy, r = 0.3) {
  const nx = e.x + dx, ny = e.y + dy;
  if (!blocked(nx, e.y, r)) e.x = nx;
  if (!blocked(e.x, ny, r)) e.y = ny;
}

// ---------- players ----------
function updatePlayer(p, dt) {
  const s = stats(p);
  p.hurt = Math.max(0, p.hurt - dt * 4);
  p.atkCd -= dt;
  p.spellCd -= dt;
  if (p.dead > 0) {
    p.dead -= dt;
    if (p.dead <= 0) {
      const v = nearestVillage(p.x, p.y);
      p.x = v.x + (Math.random() - 0.5) * 2;
      p.y = v.y - 3.5;
      p.hp = s.hpMax * 0.6;
      p.mp = s.mpMax * 0.5;
      say(`${p.name} ontwaakt bij het vuur van ${v.name}.`, p.tag);
    }
    return;
  }
  const inp = p.inp;
  let mx = inp.mx, my = inp.my;
  const m = Math.hypot(mx, my);
  const ui = UI.open[p.idx];
  if (m > 0.15 && !ui) {
    const sp = (inp.sprint ? 6.8 : 4.6) * dt * Math.min(1, m);
    tryMove(p, (mx / m) * sp, (my / m) * sp);
    p.dir = [mx / m, my / m];
    if (Math.abs(mx) > 0.2) p.face = Math.sign(mx);
    p.phase += dt * (inp.sprint ? 12 : 9);
    p.move = Math.min(1, p.move + dt * 6);
  } else p.move = Math.max(0, p.move - dt * 6);
  // leash: keep local players on one screen
  for (const o of G.players)
    if (o !== p && o.dead <= 0) {
      const d = dist(p.x, p.y, o.x, o.y);
      if (d > 24) tryMove(p, ((o.x - p.x) / d) * (d - 24), ((o.y - p.y) / d) * (d - 24));
    }
  if (p.atkT > 0) p.atkT += dt / (s.spd * 0.9);
  if (p.atkT > 1) p.atkT = 0;
  if (!ui && inp.attack && p.atkCd <= 0) {
    p.atkT = 0.001;
    p.atkCd = s.spd;
    sfx('swing');
    setTimeout(() => meleeHit(p), s.spd * 0.35 * 1000);
  }
  if (!ui && inp.spell && p.spellCd <= 0 && p.mp >= 12) {
    p.mp -= 12;
    p.spellCd = 0.6;
    const dmg = 8 + s.int * 1.3;
    G.projectiles.push({ x: p.x + p.dir[0] * 0.6, y: p.y + p.dir[1] * 0.6, z: 1.2, vx: p.dir[0] * 13, vy: p.dir[1] * 13, life: 0.9, dmg, owner: p });
    sfx('spell');
  }
  if (!ui && inp.potion && p.potions > 0 && p.hp < s.hpMax) {
    p.potions--;
    p.hp = Math.min(s.hpMax, p.hp + s.hpMax * 0.45);
    floater(p.x, p.y, '+' + Math.round(s.hpMax * 0.45), '#7dff8a');
    burst(p.x, p.y, 1, [0.4, 1, 0.5], 8, GI.SPARK);
    sfx('pickup');
  }
  if (!ui && inp.interact) interact(p);
  // regen, fire rest
  let regen = 0.6, mregen = 0.8;
  for (const l of W.lights)
    if (l.type === 1 && dist(l.x, l.y, p.x, p.y) < 5) { regen = 6; mregen = 4; }
  p.hp = Math.min(s.hpMax, p.hp + regen * dt);
  p.mp = Math.min(s.mpMax, p.mp + mregen * dt);
  // pick up drops
  for (const d of G.drops) {
    if (d.taken || dist(d.x, d.y, p.x, p.y) > 0.9) continue;
    if (isClient()) { if (!d.pending && (!d.item || p.bag.length < 40)) { d.pending = true; netSend({ t: 'take', id: d.id, pid: p.netId }); } continue; }
    if (d.gold) { p.gold += d.gold; floater(p.x, p.y, `+${d.gold}g`, '#ffd76a'); d.taken = true; sfx('coin'); continue; }
    if (d.potion) { p.potions++; floater(p.x, p.y, '+drankje', '#ff7d8a'); d.taken = true; sfx('pickup'); continue; }
    if (p.bag.length < 40) { p.bag.push(d.item); d.taken = true; say(`${p.name} vindt ${d.item.name}.`, RARITY[d.item.rarity].col); sfx('pickup'); UI.dirty = true; }
  }
  explore(p.x, p.y);
}
function nearestVillage(x, y) {
  let b = W.villages[0];
  for (const v of W.villages) if (dist(v.x, v.y, x, y) < dist(b.x, b.y, x, y)) b = v;
  return b || { x: W.spawn.x, y: W.spawn.y + 3.5, name: 'het kamp' };
}
function interact(p) {
  for (const c of W.chests) {
    if (c.open || dist(c.x, c.y, p.x, p.y) > 1.6) continue;
    if (isClient()) { netSend({ t: 'chest', i: W.chests.indexOf(c), lv: p.level }); sfx('chest'); return; }
    say(`${p.name} opent een kist.`, '#ffd76a');
    openChest(c, p.level);
    return;
  }
  for (const v of G.villagers)
    if (dist(v.x, v.y, p.x, p.y) < 2) {
      v.talk = 4.5;
      v.line = pickR(Math.random, VILLAGER_LINES);
      sfx('blip');
      return;
    }
}
function openChest(c, level) {
  {
    c.open = true;
    const r = mulberry((Math.random() * 1e9) | 0);
    const n = 1 + c.tier;
    for (let i = 0; i < n; i++) dropItem(c.x + (Math.random() - 0.5) * 1.6, c.y - 0.8 - Math.random(), makeItem(r, Math.max(1, level + c.tier - 1), c.tier));
    addDrop({ x: c.x + 0.6, y: c.y - 0.9, gold: 10 + Math.floor(Math.random() * 25 * c.tier) });
    burst(c.x, c.y, 0.8, [1, 0.85, 0.4], 14, GI.SPARK);
    sfx('chest');
  }
}
function addDrop(d) {
  d.id = NID++;
  G.drops.push(d);
}
function dropItem(x, y, item) {
  addDrop({ x, y, item });
}
function receiveDrop(p, d) {
  if (d.gold) { p.gold += d.gold; floater(p.x, p.y, `+${d.gold}g`, '#ffd76a'); sfx('coin'); return; }
  if (d.potion) { p.potions++; floater(p.x, p.y, '+drankje', '#ff7d8a'); sfx('pickup'); return; }
  if (d.item) { p.bag.push(d.item); ITEM_ID = Math.max(ITEM_ID, d.item.id + 1); say(`${p.name} vindt ${d.item.name}.`, RARITY[d.item.rarity].col); sfx('pickup'); UI.dirty = true; }
}
function meleeHit(p) {
  if (p.dead > 0) return;
  const s = stats(p);
  const reach = 1.7 + (p.eq.weapon && p.eq.weapon.base === 'staff' ? 0.3 : 0);
  let hit = false;
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    if (d > reach * e.def.scale ** 0.5) continue;
    if ((dx * p.dir[0] + dy * p.dir[1]) / (d || 1) < -0.1 && d > 0.6) continue;
    hit = true;
    let dmg = (s.dmg[0] + Math.random() * (s.dmg[1] - s.dmg[0])) * (1 + s.str * 0.02);
    if (s.fx === 'moon' && G.env.night > 0.5) dmg *= 1.25;
    const crit = Math.random() * 100 < s.crit;
    if (crit) dmg *= 1.8;
    if (isClient()) {
      netSend({ t: 'hit', id: e.id, dmg: Math.round(dmg), crit, fx: s.fx, by: p.netId });
      floater(e.x, e.y, (crit ? '!' : '') + Math.round(dmg), crit ? '#ffcf4a' : '#ffffff', crit);
      burst(e.x, e.y, 1, [1, 0.95, 0.8], 5, GI.SPARK + 1, 2.5);
      e.hurt = 1;
    } else damageEnemy(e, dmg, p, crit);
    if (s.fx === 'fire') e.burn = 3;
    if (s.fx === 'ice') e.slow = 2.5;
    if (s.leech) p.hp = Math.min(s.hpMax, p.hp + dmg * s.leech);
    const k = 0.55 / (d || 1) / e.def.scale;
    tryMove(e, dx * k, dy * k, 0.3);
  }
  if (hit) sfx('hit');
}
function damageEnemy(e, dmg, p, crit, remote) {
  dmg = Math.round(dmg);
  e.hp -= dmg;
  e.hurt = 1;
  if (p) e.aggro = p;
  if (!remote) floater(e.x, e.y, (crit ? '!' : '') + dmg, crit ? '#ffcf4a' : '#ffffff', crit);
  burst(e.x, e.y, 1, e.def.type === 3 ? [0.4, 1, 0.45] : [1, 0.95, 0.8], 5, GI.SPARK + 1, 2.5);
  if (e.hp <= 0) killEnemy(e, p);
}
function killEnemy(e, p) {
  const def = e.def;
  burst(e.x, e.y, 1, def.c1, def.boss ? 40 : 16, def.type === 2 ? GI.BODY + 3 : GI.SPARK, 4);
  sfx(def.boss ? 'boss' : 'die');
  const xp = Math.round(def.xp * (1 + e.level * 0.15));
  for (const q of G.players) if (q.dead <= 0 && dist(q.x, q.y, e.x, e.y) < 30) gainXp(q, q === p ? xp : Math.round(xp * 0.7));
  for (const r of NET.remotes.values()) if (!r.dead && dist(r.rx, r.ry, e.x, e.y) < 30) hostXpRemote(r, p && p.remote === r ? xp : Math.round(xp * 0.7));
  const r = Math.random;
  if (def.boss) {
    for (let i = 0; i < 3; i++) dropItem(e.x + (r() - 0.5) * 2, e.y + (r() - 0.5) * 2, makeItem(mulberry((r() * 1e9) | 0), e.level + 2, 4));
    say('De Grafwachter is gevallen!', '#c58bff');
  } else if (r() < 0.28) dropItem(e.x, e.y, makeItem(mulberry((r() * 1e9) | 0), e.level, 1));
  if (r() < 0.5) addDrop({ x: e.x + 0.4, y: e.y - 0.3, gold: 2 + Math.floor(r() * 6 * e.level) });
  if (r() < 0.08) addDrop({ x: e.x - 0.4, y: e.y - 0.2, potion: 1 });
}
function gainXp(p, xp) {
  p.xp += xp;
  floater(p.x, p.y + 0.5, `+${xp} xp`, '#a8c8ff');
  while (p.xp >= xpNext(p.level)) {
    p.xp -= xpNext(p.level);
    p.level++;
    const s = stats(p);
    p.hp = s.hpMax;
    p.mp = s.mpMax;
    say(`${p.name} bereikt level ${p.level}!`, '#ffd76a');
    burst(p.x, p.y, 1.2, [1, 0.9, 0.5], 30, GI.SPARK, 5);
    sfx('level');
  }
}
function hurtPlayer(p, dmg, e, fromNet) {
  if (p.dead > 0) return;
  const s = stats(p);
  if (Math.random() * 100 < s.eva * 0.25) { floater(p.x, p.y, 'mis', '#9aa7b5'); return; }
  dmg = Math.round(dmg * (100 / (100 + s.armor)));
  p.hp -= dmg;
  p.hurt = 1;
  floater(p.x, p.y, '-' + dmg, '#ff6a5a');
  if (e.def.mana) p.mp = Math.max(0, p.mp - 8);
  sfx('hurt');
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = 4;
    const lost = Math.floor(p.gold * 0.2);
    p.gold -= lost;
    say(`${p.name} is gevallen${lost ? ` en verliest ${lost}g` : ''}.`, '#ff6a5a');
    burst(p.x, p.y, 1, [0.8, 0.2, 0.2], 20);
  }
}

// ---------- enemies ----------
function spawnEnemies(dt) {
  const alive = G.enemies.filter(e => e.hp > 0).length;
  const night = G.env.night;
  const cap = Math.round(5 + night * 9 + G.players.length * 2);
  // the boss guards the first ruin
  const br = W.ruins[0];
  if (br && !G.bossSpawned) {
    G.bossSpawned = true;
    G.enemies.push(makeEnemy('warden', br.x, br.y + 1.5, 6, br));
  }
  if (alive >= cap || Math.random() > dt * 1.5) return;
  const p = pickR(Math.random, G.players.filter(q => q.dead <= 0));
  if (!p) return;
  const a = Math.random() * TAU, d = 15 + Math.random() * 10;
  const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  if (blocked(x, y, 0.4)) return;
  for (const v of W.villages) if (dist(v.x, v.y, x, y) < 24) return;
  const m = matAt(x, y);
  const nearRuin = W.ruins.some(r => dist(r.x, r.y, x, y) < 28);
  let kind = 'slime';
  if (nearRuin || (night > 0.5 && Math.random() < 0.55)) kind = 'skeleton';
  if (night > 0.6 && Math.random() < 0.3) kind = 'wisp';
  if (m === M.FOREST && night < 0.5 && Math.random() < 0.5) kind = 'slime';
  const dv = dist(W.spawn.x, W.spawn.y, x, y);
  const lvl = Math.max(1, Math.round(1 + dv / 38 + (nearRuin ? 1 : 0)));
  G.enemies.push(makeEnemy(kind, x, y, lvl));
}
function makeEnemy(kind, x, y, level, home) {
  const def = ENEMY[kind];
  const hp = Math.round(def.hp * (1 + (level - 1) * 0.35));
  return { id: NID++, def, kind, x, y, hx: x, hy: y, home, level, hp, hpMax: hp, face: 1, phase: Math.random() * 9, move: 0, atkT: 0, cd: 0, hurt: 0, wander: null, aggro: null, burn: 0, slow: 0 };
}
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    const def = e.def;
    e.hurt = Math.max(0, e.hurt - dt * 5);
    e.cd -= dt;
    e.phase += dt * (e.move > 0.1 ? 8 : 2);
    if (e.burn > 0) {
      e.burn -= dt;
      if (Math.random() < dt * 3) { e.hp -= 2; burst(e.x, e.y, 1, [1, 0.5, 0.1], 2, GI.FIRE, 1); if (e.hp <= 0) killEnemy(e, e.aggro || G.players[0]); }
    }
    e.slow = Math.max(0, e.slow - dt);
    // daylight weakens the undead away from ruins
    if (def.type !== 3 && !def.boss && G.env.night < 0.2 && !W.ruins.some(r => dist(r.x, r.y, e.x, e.y) < 26)) {
      e.hp -= dt * 6;
      if (Math.random() < dt * 4) burst(e.x, e.y, 1.2, [0.6, 0.6, 0.6], 1, GI.SMOKE, 1);
      if (e.hp <= 0) { e.hp = 0; continue; }
    }
    let target = null, td = def.boss ? 11 : 9;
    for (const p of [...G.players, ...remoteTargets()]) {
      if (p.dead > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < td || p === e.aggro) { target = p; td = Math.min(td, d); }
    }
    if (target && target.dead > 0) target = null;
    if (target && target.remote) target = { ...target, x: target.remote.rx, y: target.remote.ry };
    const spd = def.spd * (e.slow > 0 ? 0.5 : 1);
    if (e.atkT > 0) {
      e.atkT += dt / 0.55;
      if (e.atkT > 0.45 && !e.struck) {
        e.struck = true;
        const dm = () => (def.dmg[0] + Math.random() * (def.dmg[1] - def.dmg[0])) * (1 + (e.level - 1) * 0.25);
        for (const p of G.players) if (p.dead <= 0 && dist(p.x, p.y, e.x, e.y) < def.range * 1.3) hurtPlayer(p, dm(), e);
        for (const r of NET.remotes.values()) if (!r.dead && dist(r.rx, r.ry, e.x, e.y) < def.range * 1.3) hostHurtRemote(r, Math.round(dm()), !!def.mana);
      }
      if (e.atkT > 1) e.atkT = 0;
      e.move = 0;
    } else if (target) {
      const d = dist(target.x, target.y, e.x, e.y);
      if (d < def.range) {
        if (e.cd <= 0) { e.atkT = 0.001; e.struck = false; e.cd = def.cd; }
        e.move = 0;
      } else {
        const hop = def.type === 3 ? Math.max(0, Math.sin(e.phase)) * 1.8 : 1;
        tryMove(e, ((target.x - e.x) / d) * spd * dt * hop, ((target.y - e.y) / d) * spd * dt * hop, 0.3);
        e.move = 1;
      }
      e.face = target.x > e.x ? 1 : -1;
    } else {
      if (!e.wander || dist(e.wander[0], e.wander[1], e.x, e.y) < 0.5 || Math.random() < dt * 0.1) e.wander = [e.hx + (Math.random() - 0.5) * 10, e.hy + (Math.random() - 0.5) * 10];
      const dx = e.wander[0] - e.x, dy = e.wander[1] - e.y, d = Math.hypot(dx, dy);
      if (d > 0.3) { tryMove(e, (dx / d) * spd * 0.4 * dt, (dy / d) * spd * 0.4 * dt, 0.3); e.face = dx > 0 ? 1 : -1; e.move = 0.6; }
    }
    // separation
    for (const o of G.enemies)
      if (o !== e && o.hp > 0) {
        const d = dist(o.x, o.y, e.x, e.y);
        if (d < 0.8 && d > 0) tryMove(e, ((e.x - o.x) / d) * dt, ((e.y - o.y) / d) * dt, 0.3);
      }
  }
  // despawn far / dead
  G.enemies = G.enemies.filter(e => e.hp > 0 && (e.def.boss || G.players.some(p => dist(p.x, p.y, e.x, e.y) < 45) || remoteTargets().some(p => dist(p.x, p.y, e.x, e.y) < 45)));
}

// ---------- villagers ----------
function spawnVillagers() {
  G.villagers = [];
  const cols = [[0.55, 0.4, 0.25], [0.35, 0.4, 0.5], [0.5, 0.25, 0.25], [0.4, 0.45, 0.3]];
  W.villages.forEach((v, vi) => {
    for (let k = 0; k < 3; k++) G.villagers.push({ v, x: v.x + Math.cos(k * 2) * 4, y: v.y + Math.sin(k * 2) * 4, c1: cols[(vi + k) % 4], c2: cols[(vi + k + 1) % 4], face: 1, phase: Math.random() * 9, move: 0, tgt: null, talk: 0, hat: k % 2 });
  });
}
function updateVillagers(dt) {
  for (const n of G.villagers) {
    n.talk = Math.max(0, n.talk - dt);
    if (n.talk > 0) { n.move = 0; continue; }
    const night = G.env.night > 0.6;
    if (!n.tgt || Math.random() < dt * 0.15) {
      const a = Math.random() * TAU, r = night ? 3 + Math.random() * 2 : 4 + Math.random() * 9;
      n.tgt = [n.v.x + Math.cos(a) * r, n.v.y + Math.sin(a) * r];
    }
    const dx = n.tgt[0] - n.x, dy = n.tgt[1] - n.y, d = Math.hypot(dx, dy);
    if (d > 0.4) { tryMove(n, (dx / d) * 1.4 * dt, (dy / d) * 1.4 * dt); n.face = dx > 0 ? 1 : -1; n.move = 1; n.phase += dt * 7; }
    else n.move = 0;
  }
}

// ---------- particles / projectiles ----------
function updateFx(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z = Math.max(0, p.z + p.vz * dt);
    p.vz -= (p.grav || 0) * dt;
  }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const q of G.projectiles) {
    q.life -= dt;
    const nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
    if (rockAt(nx, ny) > 1 || bldAt(nx, ny) > 1) q.life = 0;
    q.x = nx;
    q.y = ny;
    if (Math.random() < 0.8) G.particles.push({ x: q.x, y: q.y, z: q.z, vx: 0, vy: 0, vz: 0.4, col: [0.5, 0.7, 1], glyph: GI.SPARK + 3, size: 0.2, life: 0.3 });
    for (const e of G.enemies)
      if (e.hp > 0 && q.life > 0 && dist(e.x, e.y, q.x, q.y) < 0.8 * e.def.scale) {
        damageEnemy(e, q.dmg, q.owner, false);
        e.slow = 1.5;
        q.life = 0;
        burst(q.x, q.y, q.z, [0.6, 0.8, 1], 10);
        sfx('hit');
      }
  }
  G.projectiles = G.projectiles.filter(q => q.life > 0);
  G.drops = G.drops.filter(d => !d.taken);
  for (const f of G.floaters) { f.t -= dt; f.z += dt * 1.2; }
  G.floaters = G.floaters.filter(f => f.t > 0);
  for (const m of G.msg) m.t -= dt;
  G.msg = G.msg.filter(m => m.t > 0);
}

// ---------- camera: frame all living players ----------
function updateCamera(dt, instant) {
  const ps = G.players.filter(p => p.dead <= 0);
  const list = ps.length ? ps : G.players;
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const p of list) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2 + 0.8;
  const base = Math.sqrt(Rn.W * Rn.H) / 18;
  const spanX = (maxx - minx + 12) * base, spanY = (maxy - miny + 10) * YS * base;
  const zoom = Math.min(1, Rn.W / spanX, Rn.H / spanY);
  const k = instant ? 1 : Math.min(1, dt * 4);
  const c = G.cam;
  c.sx = lerp(c.sx, cx, k);
  c.sy = lerp(c.sy, cy * YS, k);
  c.ppu = lerp(c.ppu, base * zoom * G.cam.zoom, instant ? 1 : Math.min(1, dt * 2));
}

// ---------- gather render state ----------
function collectScene() {
  const figs = [], lights = [], parts = [];
  const cx = G.cam.sx, cy = G.cam.sy / YS;
  const viewR = Math.max(Rn.W, Rn.H) / G.cam.ppu * 0.75 + 4;
  const near = (x, y) => Math.abs(x - cx) < viewR && Math.abs(y - cy) < viewR;
  for (const p of G.players) {
    if (p.dead > 0) continue;
    const lk = playerLook(p);
    figs.push({ x: p.x, y: p.y, face: p.face, type: 0, phase: p.phase, atk: p.atkT, hurt: p.hurt, c1: lk.c1, scale: 1, c2: lk.capeCol, weapon: lk.weapon, wc: lk.wc, shield: lk.shield, move: p.move, helm: lk.helm });
    if (G.env.night > 0.25) lights.push({ x: p.x + p.face * 0.5, y: p.y - 0.2, z: 1.2, r: 8, col: [1, 0.78, 0.5].map(v => v * G.env.night * 0.5), type: 4 });
  }
  for (const r of NET.remotes.values()) {
    if (r.dead || !near(r.rx, r.ry)) continue;
    const lk = r.lk || {};
    figs.push({ x: r.rx, y: r.ry, face: r.face, type: 0, phase: r.phase, atk: r.atk, hurt: r.hurt, c1: lk.c1 || [0.4, 0.4, 0.4], scale: 1, c2: lk.capeCol || [0.3, 0.3, 0.5], weapon: lk.weapon, wc: lk.wc, shield: lk.shield, move: r.move, helm: lk.helm });
    if (G.env.night > 0.25) lights.push({ x: r.rx + r.face * 0.5, y: r.ry - 0.2, z: 1.2, r: 8, col: [1, 0.78, 0.5].map(v => v * G.env.night * 0.5), type: 4 });
  }
  for (const n of G.villagers) if (near(n.x, n.y)) figs.push({ x: n.x, y: n.y, face: n.face, type: 1, phase: n.phase, c1: n.c1, c2: n.c2, scale: 0.95, move: n.move, helm: n.hat });
  for (const e of G.enemies) {
    if (!near(e.x, e.y)) continue;
    const d = e.def;
    figs.push({ x: e.x, y: e.y, z: 0, face: e.face, type: d.type, phase: e.phase, atk: e.atkT, hurt: e.hurt, c1: e.burn > 0 ? [1, 0.6, 0.3] : e.slow > 0 ? mixc(d.c1, [0.6, 0.85, 1], 0.5) : d.c1, scale: d.scale, c2: d.c2, weapon: d.weapon, wc: d.wc, move: e.move });
    if (d.type === 4) lights.push({ x: e.x, y: e.y, z: 1.4, r: 5, col: [0.4, 0.6, 1], type: 3 });
  }
  for (const c of W.chests) if (near(c.x, c.y)) figs.push({ x: c.x, y: c.y, face: 1, type: 5, phase: 0, atk: c.open ? 1 : 0, c1: [1, 0.82, 0.35], scale: 1 });
  for (const d of G.drops) {
    if (!near(d.x, d.y)) continue;
    const col = d.gold ? [1, 0.82, 0.3] : d.potion ? [1, 0.35, 0.45] : (() => { const c = RARITY[d.item.rarity].col; return [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255]; })();
    figs.push({ x: d.x, y: d.y, face: 1, type: 6, phase: G.time * 3 + d.x, c1: col, scale: 1 });
  }
  figs.sort((a, b) => a.y - b.y);
  // static lights near the camera, closest first
  const st = W.lights.filter(l => near(l.x, l.y)).map(l => ({ ...l, col: l.night ? l.col.map(v => v * (0.15 + 0.85 * G.env.night)) : l.col }));
  st.sort((a, b) => dist(a.x, a.y, cx, cy) - dist(b.x, b.y, cx, cy));
  lights.push(...st);
  for (const q of G.projectiles) lights.push({ x: q.x, y: q.y, z: q.z, r: 5, col: [0.5, 0.7, 1], type: 3 });
  for (const q of G.projectiles) parts.push({ x: q.x, y: q.y, z: q.z, size: 0.32, col: [0.8, 0.9, 1.4], glyph: GI.SPARK });
  for (const p of G.particles) parts.push({ x: p.x, y: p.y, z: p.z, size: p.size, col: p.col, glyph: p.glyph });
  return { figures: figs.slice(0, 64), lights: lights.slice(0, 32), particles: parts.slice(-128) };
}
