// Open world, part 2: what there is to do. Buildings with loot crates, parts you pick up into My parts,
// the camp menu (missions, garage, save), raider camps, scrap convoys, bounty hunters and boss fights.

/* ---------- props ---------- */
Object.assign(JUNK, {
  lootcrate: { name: 'Loot crate', r: 15, m: 6, h: 22, hp: 60, loot: 1, note: 'Something rattles inside.' },
  safe: { name: 'Old safe', r: 15, m: 40, h: 24, hp: 260, loot: 2, heavy: 1, note: 'Heavy. Worth it.' },
  tent: { name: 'Raider tent', r: 22, m: 3, h: 20, hp: 80 },
  truck: { name: 'Wrecked truck', r: 26, m: 30, h: 22, hp: 300 }
});
Object.assign(JUNKDRAW, {
  lootcrate: (c, r) => {
    rr(c, -r, -r, r * 2, r * 2, 3);
    c.fillStyle = '#7a5a2e';
    c.fill();
    c.fillStyle = '#f2b705';
    c.fillRect(-r, -r * 0.2, r * 2, r * 0.4);
    c.fillRect(-r * 0.2, -r, r * 0.4, r * 2);
    c.fillStyle = '#2a1e10';
    c.font = `700 ${r * 0.9}px "Chakra Petch", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('?', 0, 1);
    c.strokeStyle = 'rgba(0,0,0,.35)';
    c.lineWidth = 1.5;
    rr(c, -r, -r, r * 2, r * 2, 3);
    c.stroke();
  },
  safe: (c, r) => {
    rr(c, -r, -r, r * 2, r * 2, 4);
    c.fillStyle = '#3f4a55';
    c.fill();
    circ(c, 0, 0, r * 0.55, '#8a96a3', '#2a323a', 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(
        c,
        [Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5],
        '#2a323a',
        1.5
      );
    }
    circ(c, 0, 0, r * 0.14, '#f2b705');
  },
  tent: (c, r) => {
    c.fillStyle = '#6a3a2a';
    c.beginPath();
    c.moveTo(-r, r * 0.8);
    c.lineTo(0, -r);
    c.lineTo(r, r * 0.8);
    c.closePath();
    c.fill();
    c.fillStyle = '#8a4a32';
    c.beginPath();
    c.moveTo(0, -r);
    c.lineTo(r, r * 0.8);
    c.lineTo(0, r * 0.8);
    c.closePath();
    c.fill();
    c.fillStyle = '#e2504a';
    c.fillRect(-r * 0.15, -r * 1.25, r * 0.5, r * 0.25);
  },
  truck: (c, r) => {
    rr(c, -r, -r * 0.5, r * 2, r, 4);
    c.fillStyle = '#5a6a4a';
    c.fill();
    rr(c, r * 0.35, -r * 0.45, r * 0.6, r * 0.9, 3);
    c.fillStyle = '#3a4a55';
    c.fill();
    c.fillStyle = 'rgba(60,30,15,.5)';
    c.beginPath();
    c.ellipse(-r * 0.3, 0, r * 0.4, r * 0.3, 0.3, 0, 7);
    c.fill();
  }
});

/* ---------- buildings and points of interest (called from chunk generation, seeded) ---------- */
const OW_BUILDINGS = ['Warehouse', 'Workshop', 'Depot', 'Garage', 'Old store', 'Pump station'];
function owGenBuildings(ch, x0, y0, free, mid) {
  const town = [
    'junkyard',
    'carpark',
    'construction',
    'market',
    'factory',
    'crusheryard',
    'scrapfactory',
    'stormroof',
    'carwash'
  ];
  const chance = town.includes(mid.id) ? 0.6 : 0.3;
  ch.bld = [];
  if (Math.random() > chance) return;
  for (let t = 0; t < 30; t++) {
    const w = Math.round(rnd(480, 700)),
      h = Math.round(rnd(400, 560)),
      x = x0 + rnd(60, OW_CH - 60 - w),
      y = y0 + rnd(60, OW_CH - 60 - h);
    // the whole footprint (plus a margin) must be clear
    const ok = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
      [x + w / 2, y + h / 2]
    ].every(([px, py]) => free(px, py, 40));
    if (!ok) continue;
    const T = 24,
      gap = 170,
      wall = pick(['concrete', 'metal', mid.wall]);
    // two doors on random sides; every side is one or two wall pieces around its door
    const doors = new Set();
    while (doors.size < 2) doors.add(Math.floor(Math.random() * 4));
    const side = (sx, sy, len, horiz, door) => {
      if (!door) return [horiz ? { x: sx, y: sy, w: len, h: T } : { x: sx, y: sy, w: T, h: len }];
      const a = rnd(0.2, 0.8) * (len - gap);
      return horiz
        ? [
            { x: sx, y: sy, w: a, h: T },
            { x: sx + a + gap, y: sy, w: len - a - gap, h: T }
          ]
        : [
            { x: sx, y: sy, w: T, h: a },
            { x: sx, y: sy + a + gap, w: T, h: len - a - gap }
          ];
    };
    const parts = [
      ...side(x, y, w, true, doors.has(0)),
      ...side(x, y + h - T, w, true, doors.has(1)),
      ...side(x, y + T, h - 2 * T, false, doors.has(2)),
      ...side(x + w - T, y + T, h - 2 * T, false, doors.has(3))
    ];
    for (const p of parts) if (p.w > 4 && p.h > 4) ch.st.push({ ...p, wall });
    const b = { x, y, w, h, name: pick(OW_BUILDINGS), guard: Math.random() < 0.35, i: ch.bld.length };
    ch.bld.push(b);
    // shelves or a partition inside, so it is not one empty box
    if (w > 560) ch.st.push({ x: x + w * 0.5 - 12, y: y + T + 90, w: 24, h: h - 2 * T - 180, wall });
    // inside: loot crates, sometimes a safe, a little junk
    const inside = (r, n, kind) => {
      for (let i = 0, tt = 0; i < n && tt < 40; tt++) {
        const px = x + rnd(T + r + 8, w - T - r - 8),
          py = y + rnd(T + r + 8, h - T - r - 8);
        if (ch.objs.some(o => Math.hypot(o.x - px, o.y - py) < o.r + r + 12)) continue;
        if (ch.st.some(s => circRectDist(px, py, s) < r + 6)) continue;
        const o = mkObj(kind, px, py, 0);
        o.ow = ch.k;
        o.bld = b.i;
        ch.objs.push(o);
        i++;
      }
    };
    inside(15, 3 + Math.floor(Math.random() * 3), 'lootcrate');
    if (Math.random() < 0.3) inside(15, 1, 'safe');
    inside(16, 2 + Math.floor(Math.random() * 3), pick(['crate', 'barrel', 'tires', ...mid.junk]));
    return;
  }
}
/** Raider camps: tents, barricades, a loot pile and guards that show up when you come close. */
function owGenPOI(ch, spot, x0, y0) {
  ch.poi = null;
  if (Math.random() > 0.12) return;
  const p = spot(170);
  if (!p) return;
  const [x, y] = p;
  ch.poi = { kind: 'raidcamp', x, y, k: ch.k };
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rnd(-0.3, 0.3),
      o = mkObj('tent', x + Math.cos(a) * 110, y + Math.sin(a) * 110, 0);
    o.ow = ch.k;
    ch.objs.push(o);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4,
      o = mkObj('barrier', x + Math.cos(a) * 165, y + Math.sin(a) * 165, a + Math.PI / 2);
    o.ow = ch.k;
    ch.objs.push(o);
  }
  for (let i = 0; i < 3; i++) {
    const o = mkObj(i ? 'lootcrate' : 'safe', x + rnd(-30, 30), y + rnd(-30, 30), 0);
    o.ow = ch.k;
    ch.objs.push(o);
  }
}
/** Building floors on the chunk picture: concrete slab, tiles, a stencilled name. */
function owDrawFloors(g, ch) {
  for (const b of ch.bld || []) {
    const x = b.x - ch.cx * OW_CH,
      y = b.y - ch.cy * OW_CH;
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(x + 8, y + 10, b.w, b.h);
    g.fillStyle = '#8e9296';
    g.fillRect(x, y, b.w, b.h);
    g.strokeStyle = 'rgba(60,64,68,.35)';
    g.lineWidth = 2;
    for (let tx = x + 40; tx < x + b.w; tx += 40) {
      g.beginPath();
      g.moveTo(tx, y);
      g.lineTo(tx, y + b.h);
      g.stroke();
    }
    for (let ty = y + 40; ty < y + b.h; ty += 40) {
      g.beginPath();
      g.moveTo(x, ty);
      g.lineTo(x + b.w, ty);
      g.stroke();
    }
    g.fillStyle = 'rgba(40,44,48,.35)';
    g.font = '700 26px "Chakra Petch", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(b.name.toUpperCase(), x + b.w / 2, y + b.h / 2);
  }
  if (ch.poi) {
    const x = ch.poi.x - ch.cx * OW_CH,
      y = ch.poi.y - ch.cy * OW_CH;
    g.fillStyle = 'rgba(60,30,15,.35)';
    g.beginPath();
    g.arc(x, y, 150, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(30,20,10,.55)';
    g.beginPath();
    g.arc(x, y, 26, 0, 7);
    g.fill();
  }
}

/* ---------- loot ---------- */
const OW_LOOT = () => MODS.filter(m => m.id !== 'cockpit' && !m.boss && !m.hidden && RAR[m.rar]);
/** A part for a crate: rarer the further you are from the start, and better from safes and bosses. */
function owRollPart(x, y, bonus = 0) {
  const far = OW ? Math.hypot(x - OW.home0.x, y - OW.home0.y) / 1000 : 0,
    lvl = Math.min(4, far / 3 + bonus + (owIsNight() ? 0.6 : 0)),
    roll = Math.random() * 10 + lvl * 1.6;
  const rar = roll > 13 ? 4 : roll > 10.5 ? 3 : roll > 7.5 ? 2 : roll > 4 ? 1 : 0;
  const pool = OW_LOOT();
  let list = pool.filter(m => m.rar === rar);
  if (!list.length) list = pool;
  // a quarter of the loot is structure, so there is always something to build with
  if (Math.random() < 0.25) {
    const s = list.filter(m => m.cat === 'struct' || m.cat === 'move');
    if (s.length) list = s;
  }
  return pick(list).id;
}
function owLootDrop(o, att) {
  const n = o.d.loot === 2 ? 2 : 1;
  owCrateBurst(o);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2),
      r = rnd(45, 80);
    owDropPart(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, owRollPart(o.x, o.y, o.d.loot === 2 ? 1.2 : 0), o);
  }
  if (Math.random() < 0.5)
    B.pk.push({ kind: 'coins', x: o.x + rnd(-20, 20), y: o.y + rnd(-20, 20), val: 10, cd: 0, uid: owUid() });
  if (OW.mission) owMissionEvent('loot', o);
}
const owUid = () => (OW.uidc = (OW.uidc || 5e8) + 1);
/** A part on the ground; with `from` it hops there out of a crate or wreck first. */
function owDropPart(x, y, id, from) {
  B.pk.push({
    kind: 'part',
    id,
    x: clamp(x, 60, AW - 60),
    y: clamp(y, 60, AH - 60),
    cd: from ? 0.55 : 0,
    uid: owUid(),
    pop: from ? { x: from.x, y: from.y, t: 0 } : null
  });
}
/** A part pickup: it goes into My parts of whoever drove over it; your friend gets one too. */
function owTakePart(v, p) {
  p.cd = 1e9;
  p.gone = true;
  const m = MOD[p.id];
  txt(p.x, p.y - 22, `+ ${m.name.toUpperCase()}`, RAR[m.rar].col, 1.4);
  sfx('coin', p.x, p.y);
  owSpark(p.x, p.y, 8, RAR[m.rar].col);
  owGivePart(v.idx, p.id, true, p.x, p.y);
  // co-op: the other player gets a part of the same rarity, so nobody has to fight over crates
  for (const c of B.cars)
    if (c !== v && c.player && !c.dead) {
      const same = OW_LOOT().filter(x => x.rar === m.rar);
      owGivePart(c.idx, pick(same.length ? same : OW_LOOT()).id, false);
    }
}
function owGivePart(idx, id, mine, x, y) {
  if (idx === B.me) owGotPart(id, mine, x, y);
  else if (B.net === 'host') Net.send({ t: 'owpart', id, mine });
}
/** A part lands in My parts on this computer: it flies into the HUD, and big finds get a moment. */
function owGotPart(id, mine, x, y) {
  const m = MOD[id],
    me = myCar();
  OW.inv[id] = (OW.inv[id] || 0) + 1;
  owNote(`${mine ? '' : 'Shared find: '}${m.name} → My parts`, RAR[m.rar].col);
  if (x == null && me) ((x = me.x), (y = me.y - 30));
  if (x != null) OW.fly.push({ id, x, y, t: mine ? 0 : -0.3 });
  if (m.rar >= 3) {
    cineTitle(`${RAR[m.rar].name} find`, m.name, RAR[m.rar].col, 'win', { confetti: m.rar >= 4 ? 160 : 70, dur: 2.2 });
    sfx('legend');
    if (me) owConfetti(me.x, me.y, m.rar >= 4 ? 90 : 45);
  }
}
function owNote(text, col) {
  OW.notes = OW.notes || [];
  OW.notes.push({ text, col: col || '#dfe9f5', t: 0 });
  if (OW.notes.length > 5) OW.notes.shift();
}
const _owIcon = {};
function owIconImg(id) {
  if (_owIcon[id]) return _owIcon[id];
  const im = new Image();
  im.src = iconURL(id, 64);
  return (_owIcon[id] = im);
}

/* ---------- camp menu: missions, garage, save ---------- */
function owAtCamp(v) {
  return OW.camps.find(c => Math.hypot(c.x - v.x, c.y - v.y) < 130) || null;
}
function owCampButton() {
  let b = $('#owCampBtn');
  if (!b) {
    b = document.createElement('button');
    b.id = 'owCampBtn';
    b.className = 'btn';
    b.innerHTML = 'Open camp <span class="kbd">Enter</span>';
    b.onclick = () => owOpenCamp();
    document.body.appendChild(b);
  }
  return b;
}
function owCampUI() {
  const v = myCar(),
    b = owCampButton(),
    open = $('#ovCamp') && !$('#ovCamp').hidden;
  b.hidden = !(v && !v.dead && G.phase === 'world' && owAtCamp(v) && !open);
}
addEventListener('keydown', e => {
  if (e.key !== 'Enter' || G.phase !== 'world' || !OW) return;
  const ov = $('#ovCamp');
  if (ov && !ov.hidden) return owCloseCamp();
  const v = myCar();
  if (v && !v.dead && owAtCamp(v)) {
    e.preventDefault();
    owOpenCamp();
  }
});
function owOpenCamp() {
  const v = myCar(),
    camp = v && owAtCamp(v);
  if (!camp) return;
  sfx('ui');
  let ov = $('#ovCamp');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'ovCamp';
    ov.className = 'overlay';
    ov.innerHTML = '<div class="card owcamp" id="owCampCard"></div>';
    document.body.appendChild(ov);
  }
  ov.hidden = false;
  clearArenaInput();
  owRenderCamp(camp);
}
function owCloseCamp() {
  const ov = $('#ovCamp');
  if (ov) ov.hidden = true;
  sfx('ui');
}
function owRenderCamp(camp) {
  const board = owBoard(camp),
    M = OW.mission,
    th = owThemeAt(camp.x, camp.y),
    loose = Object.values(OW.inv).reduce((a, b) => a + b, 0);
  $('#owCampCard').innerHTML =
    `<span class="label">Camp · ${esc(th.name)}</span><h2>Camp ${camp.i + 1}-${camp.j + 1}</h2>
    <p class="small">Repaired. This is your respawn point now.${B.net ? ' Missions are shared: you both get the reward.' : ' The world is saved here.'}</p>
    ${
      M
        ? `<div class="owm cur"><b>${esc(M.title)}</b><span>${esc(M.text)}</span><em>${M.reward} scrap${M.part ? ' + a part' : ''}</em><button class="btn ghost sm" id="owAbandon">Give up</button></div>`
        : `<span class="mlab">Mission board</span><div class="owboard">${board
            .map(
              (m, i) =>
                `<button class="owm d${m.diff}" data-m="${i}" style="--i:${i}"><i class="owic">${{ fetch: '📦', clear: '⚔', race: '🏁', boss: '☠' }[m.type]}</i><b>${esc(m.title)}</b><span>${esc(m.text)}</span><em>${m.reward} scrap${m.part ? ' + a part' : ''} · ${['easy', 'medium', 'hard', 'boss'][m.diff]}</em></button>`
            )
            .join('')}</div>`
    }
    ${owTravelHTML(camp)}
    <div class="owrow"><button class="btn" id="owGarage">Garage · ${loose} loose part${loose === 1 ? '' : 's'}</button><button class="btn ghost" id="owClose">Back on the road <span class="kbd">Enter</span></button></div>
    <p class="small owstat">Scrap ${OW.scrap} · missions done ${OW.done} · raiders wrecked ${OW.wrecked}</p>`;
  $$('#owCampCard [data-m]').forEach(b =>
    b.addEventListener('click', () => {
      owStartMission(board[+b.dataset.m], camp);
      owRenderCamp(camp);
    })
  );
  const ab = $('#owAbandon');
  if (ab)
    ab.onclick = () => {
      owEndMission(false);
      owRenderCamp(camp);
    };
  $$('#owCampCard [data-go]').forEach(b =>
    b.addEventListener('click', () => {
      const [i, j] = b.dataset.go.split(',').map(Number),
        to = OW.camps.find(c => c.i === i && c.j === j),
        v = myCar(),
        why = owCanTravel(v);
      if (why) return toast(why);
      owCloseCamp();
      owTravel(v, to);
    })
  );
  $('#owGarage').onclick = () => owOpenGarage();
  $('#owClose').onclick = () => owCloseCamp();
  if (!B.net) owSave();
}

/** Other camps you have found: drive there in an instant. */
function owTravelHTML(camp) {
  const list = OW.camps
    .filter(c => c.seen && c !== camp)
    .map(c => [c, Math.hypot(c.x - camp.x, c.y - camp.y)])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 6);
  if (!list.length) return '';
  return `<span class="mlab">Travel to a camp you found</span><div class="owtravel">${list
    .map(
      ([c, d], i) =>
        `<button class="owgo" data-go="${c.i},${c.j}" style="--i:${i}"><b>Camp ${c.i + 1}-${c.j + 1}</b><span>${esc(owThemeAt(c.x, c.y).name)} · ${Math.round(d / S)} m</span></button>`
    )
    .join('')}</div>`;
}

/* ---------- garage in the field ---------- */
function owOpenGarage() {
  const v = myCar();
  if (!v || v.dead || !owAtCamp(v)) return;
  owCloseCamp();
  // the normal garage state is set aside and comes back when you leave
  OW.keepG = {
    base: G.base,
    top: G.top,
    inv: G.inv,
    coins: G.coins,
    ws: G.ws,
    found: G.found,
    leftTab: G.leftTab
  };
  const inv = { ...OW.inv };
  for (const e of [...OW.design.base.values(), ...OW.design.top.values()]) inv[e.id] = (inv[e.id] || 0) + 1;
  G.inv = inv;
  G.base = new Map(OW.design.base);
  G.top = new Map(OW.design.top);
  G.coins = OW.scrap;
  G.found = new Set([...G.found, ...Object.keys(inv)]);
  const ws = new Set(G.ws);
  for (const e of [...G.base.values()]) for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) ws.add(key(x, y));
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) ws.add(key(x, y));
  G.ws = ws;
  G.leftTab = 'bin';
  G.owGarage = true;
  v.inGarage = true;
  G.phase = 'build';
  $('#arena').hidden = true;
  $('#build').hidden = false;
  $('#btnReady').innerHTML = 'Back to the world';
  sizeBP();
  refreshUI();
  garageEnter();
  toast('Field garage: rebuild with what you found. Your car waits at the camp.', true);
}
function owLeaveGarage() {
  const d = { base: new Map(G.base), top: new Map(G.top) };
  if (![...d.base.values()].some(e => e.id === 'cockpit')) return toast('Your car needs its cockpit');
  // what is not on the car stays in My parts
  const used = {};
  for (const e of [...d.base.values(), ...d.top.values()]) used[e.id] = (used[e.id] || 0) + 1;
  const inv = {};
  for (const [id, n] of Object.entries(G.inv)) if (n - (used[id] || 0) > 0) inv[id] = n - (used[id] || 0);
  OW.inv = inv;
  OW.scrap = G.coins;
  OW.design = d;
  const k = OW.keepG;
  Object.assign(G, {
    base: k.base,
    top: k.top,
    inv: k.inv,
    coins: k.coins,
    ws: k.ws,
    found: k.found,
    leftTab: k.leftTab
  });
  G.owGarage = false;
  G.phase = 'world';
  $('#build').hidden = true;
  $('#arena').hidden = false;
  $('#btnReady').innerHTML = 'Ready · to the arena';
  sizeArena();
  const v = myCar();
  if (B.net === 'client') Net.send({ t: 'owdesign', d: packDesign(d) });
  else {
    const n = owRebuild(v, d);
    n.inGarage = false;
    OW.lastCoins = n.coins;
  }
  if (!B.net) owSave();
  OW.toast = {
    text: 'Back on the road',
    sub: `${Object.values(OW.inv).reduce((a, b) => a + b, 0)} loose parts in My parts`,
    t: 0
  };
}
/** A car rebuilt from a new design in the same spot (field garage, camp repair). */
function owRebuild(v, d) {
  const n = makeCar(d, v.idx, v.x, v.y, v.a, {
    tune: v.idx === B.me ? [...(G.tune || [])] : [],
    name: v.name,
    paint: v.paint
  });
  n.ctrl = v.ctrl;
  n.team = v.team;
  n.player = v.player;
  n.look = v.look;
  n.coins = v.coins;
  n.gen = (v.gen || 0) + 1;
  n.design = d;
  B.cars[v.idx] = n;
  if (B.net === 'host') owSendCar(n);
  return n;
}

/* ---------- missions ---------- */
/** Three missions per camp, the same for everyone in this world until one is done. */
function owBoard(camp) {
  const r = owRng(owHash(camp.i * 7 + camp.j, OW.done, OW.seed));
  const others = OW.camps
    .filter(c => c !== camp)
    .sort((a, b) => Math.hypot(a.x - camp.x, a.y - camp.y) - Math.hypot(b.x - camp.x, b.y - camp.y));
  const far = Math.hypot(camp.x - OW.home0.x, camp.y - OW.home0.y),
    tier = far > 7000 ? 2 : far > 3000 ? 1 : 0;
  const list = [];
  // delivery: a crate from a building to the next camp
  const dest = others[Math.floor(r() * Math.min(3, others.length))];
  list.push({
    type: 'fetch',
    diff: tier,
    title: 'Special delivery',
    text: `Pick up a crate out in the ${owThemeAt(camp.x + (dest.x - camp.x) / 2, camp.y + (dest.y - camp.y) / 2).name} and bring it to camp ${dest.i + 1}-${dest.j + 1}.`,
    reward: 60 + tier * 40,
    part: tier >= 1,
    dest: { x: dest.x, y: dest.y, i: dest.i, j: dest.j },
    from: {
      x: camp.x + (dest.x - camp.x) * 0.5 + (r() - 0.5) * 1200,
      y: camp.y + (dest.y - camp.y) * 0.5 + (r() - 0.5) * 1200
    }
  });
  // clear a raider camp
  const a = r() * Math.PI * 2,
    d = 1600 + r() * 1400;
  list.push({
    type: 'clear',
    diff: Math.min(2, tier + 1),
    title: 'Clear the raider camp',
    text: 'Raiders dug in out there. Wreck all of them.',
    reward: 90 + tier * 50,
    part: true,
    at: { x: clamp(camp.x + Math.cos(a) * d, 600, AW - 600), y: clamp(camp.y + Math.sin(a) * d, 600, AH - 600) },
    n: 3 + tier
  });
  // a race along the road, or the boss when it is time
  if (OW.done > 0 && OW.done % 4 === 3)
    list.push({
      type: 'boss',
      diff: 3,
      title: 'The big one',
      text: 'A boss has taken over this region. Find it and wreck it.',
      reward: 250 + tier * 100,
      part: true,
      at: {
        x: clamp(camp.x + Math.cos(a + 2) * 2200, 800, AW - 800),
        y: clamp(camp.y + Math.sin(a + 2) * 2200, 800, AH - 800)
      }
    });
  else {
    const pts = [];
    let x = camp.x,
      y = camp.y,
      dir = Math.floor(r() * 4);
    for (let i = 0; i < 5; i++) {
      // follow the roads: checkpoints on the road out of this camp
      const step = 700 + r() * 300;
      if (dir === 0) x += step;
      else if (dir === 1) x -= step;
      else if (dir === 2) y += step;
      else y -= step;
      x = clamp(x, 400, AW - 400);
      y = clamp(y, 400, AH - 400);
      if (dir < 2) y = owRoadY(Math.round((y / OW_CH - 2) / OW_ROAD), x);
      else x = owRoadX(Math.round((x / OW_CH - 2) / OW_ROAD), y);
      pts.push({ x, y });
      if (r() < 0.3) dir = dir < 2 ? 2 + Math.floor(r() * 2) : Math.floor(r() * 2);
    }
    list.push({
      type: 'race',
      diff: tier,
      title: 'Road race',
      text: `Five checkpoints along the road, ${45 + tier * 5} seconds.`,
      reward: 50 + tier * 30,
      part: false,
      pts,
      time: 45 + tier * 5
    });
  }
  return list;
}
function owStartMission(m, camp) {
  if (B.net === 'client') return Net.send({ t: 'owaccept', m, camp: { i: camp.i, j: camp.j } });
  OW.mission = { ...m, camp: { i: camp.i, j: camp.j }, t: 0, step: 0, spawned: false, carrying: false };
  if (m.type === 'fetch') OW.mission.cargo = { x: clamp(m.from.x, 500, AW - 500), y: clamp(m.from.y, 500, AH - 500) };
  cineTitle(m.title, m.text, '#5be7ff', 'info');
  sfx('vs');
}
function owEndMission(won) {
  const M = OW.mission;
  if (!M) return;
  if (B.net === 'client') return Net.send({ t: 'owabandon' });
  OW.mission = null;
  const me = myCar();
  if (won) {
    OW.done++;
    for (const c of B.cars)
      if (c.player && !c.dead) {
        c.coins += M.reward;
        if (M.part) owGivePart(c.idx, owRollPart(c.x, c.y, M.diff >= 3 ? 2.5 : 0.8 + M.diff * 0.3), true, c.x, c.y);
      }
    OW.toast = null;
    cineTitle('Mission complete', `+${M.reward} scrap${M.part ? ' and a part' : ''}`, '#5cc38f', 'win', {
      confetti: 140
    });
    sfx('win');
    if (me) {
      txt(me.x, me.y - 50, `+${M.reward} SCRAP`, '#ffd257', 1.6);
      owParty(me);
    }
  } else cineTitle('Mission failed', M.title, '#ff8268', 'lose');
  if (!B.net) owSave();
}
/** Confetti, a coin fountain and a kick of the camera when a mission is done. */
function owParty(me) {
  owConfetti(me.x, me.y, 80);
  for (let i = 0; i < 18; i++)
    B.fx.push({ k: 'coin', x: me.x, y: me.y, vx: rnd(-160, 160), vy: rnd(-320, -120), life: rnd(0.8, 1.3), max: 1.3 });
  B.fx.push({ k: 'ring', x: me.x, y: me.y, life: 0.7, max: 0.7, r: 140, col: '92,195,143' });
  B.shake = Math.max(B.shake || 0, 6);
  sfx('cheer');
}
function owMissionTarget() {
  const M = OW.mission;
  if (!M) return null;
  if (M.type === 'fetch')
    return M.carrying ? { x: M.dest.x, y: M.dest.y, label: 'Deliver' } : { ...M.cargo, label: 'Crate' };
  if (M.type === 'clear') return { ...M.at, label: 'Raider camp' };
  if (M.type === 'boss') return { ...M.at, label: 'Boss' };
  if (M.type === 'race') return M.pts[M.step] ? { ...M.pts[M.step], label: `Checkpoint ${M.step + 1}/5` } : null;
  return null;
}
/** Host: mission progress every frame. */
function owMissionTick(dt) {
  const M = OW.mission;
  if (!M) return;
  M.t += dt;
  const players = B.cars.filter(c => c.player && !c.dead);
  const near = (p, r) => players.find(c => Math.hypot(c.x - p.x, c.y - p.y) < r);
  if (M.type === 'fetch') {
    if (!M.carrying) {
      const c = near(M.cargo, 70);
      if (c) {
        M.carrying = c.idx;
        owNote('Crate loaded. It is heavy: drive it to the camp.', '#ffd257');
        sfx('clank');
      }
    } else {
      const c = B.cars[M.carrying];
      if (!c || c.dead) {
        // the crate drops where the carrier was wrecked
        M.cargo = { x: c ? c.x : M.cargo.x, y: c ? c.y : M.cargo.y };
        M.carrying = false;
        owNote('The crate fell off! Go back for it.', '#ff8268');
      } else {
        c.vx *= Math.exp(-0.25 * dt);
        c.vy *= Math.exp(-0.25 * dt);
        M.cargo = { x: c.x, y: c.y };
        if (Math.hypot(c.x - M.dest.x, c.y - M.dest.y) < 130) owEndMission(true);
      }
    }
  } else if (M.type === 'clear' || M.type === 'boss') {
    if (!M.spawned && near(M.at, 900)) {
      M.spawned = true;
      M.foes = [];
      const n = M.type === 'boss' ? 1 : M.n;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2,
          v = owSpawnRaider(
            M.at.x + Math.cos(a) * 160,
            M.at.y + Math.sin(a) * 160,
            Math.min(2, M.diff),
            M.type === 'boss'
          );
        if (v) {
          v.aggro = true;
          v.mission = true;
          M.foes.push(v.idx);
        }
      }
      if (M.type === 'boss') cineTitle('Boss', B.cars[M.foes[0]]?.name || '', '#ff5c7a', 'boss');
      else cineTitle('Raider camp', `${n} raiders`, '#ff8268', 'info');
      sfx(M.type === 'boss' ? 'vs' : 'alarm');
    }
    if (M.spawned && M.foes.every(i => !B.cars[i] || B.cars[i].dead || !B.cars[i].mission)) owEndMission(true);
  } else if (M.type === 'race') {
    if (M.t > M.time) return owEndMission(false);
    const p = M.pts[M.step];
    if (p && near(p, 110)) {
      M.step++;
      fx({ k: 'ring', x: p.x, y: p.y, life: 0.5, max: 0.5, r: 120, col: '91,231,255' });
      sfx('coin');
      if (M.step >= M.pts.length) owEndMission(true);
    }
  }
}
function owMissionEvent() {}

/* ---------- raiders, convoys, bounty hunters, bosses ---------- */
/** A raider car at a spot. Boss: a Gauntlet boss with its own trick. */
function owSpawnRaider(x, y, diff, boss, opt = {}) {
  const { t: type, d } = owRaiderDesign(Math.min(2, diff)),
    bot = boss ? pick(BOSSES) : pick(BOTS);
  let idx = B.cars.findIndex((c, i) => i >= OW.players && c.gone);
  if (idx < 0) idx = Math.max(OW.players, B.cars.length);
  const me = myCar(),
    v = makeCar(d, idx, x, y, me ? Math.atan2(me.y - y, me.x - x) + Math.PI / 2 : 0, {
      tune: [],
      name: opt.name || bot.name,
      paint: opt.paint || bot.paint
    });
  v.ctrl = opt.ctrl || 'raider';
  v.team = 1;
  v.style = boss ? bot.style : type.style;
  v.diff = Math.min(2, diff);
  v.look = { ...DEFAULT_STYLE };
  v.raider = { tx: x, ty: y, t: 0 };
  v.design = d;
  if (boss) applyCarMods(v, { boss: { hp: 2.2, dmg: 1.2, gim: bot.gim, name: bot.name } });
  if (opt.tough) applyCarMods(v, { tough: opt.tough });
  B.cars[idx] = v;
  if (B.net === 'host') owSendCar(v);
  return v;
}
/** Scrap convoys drive the roads; wreck one for a pile of parts. */
function owConvoy(dt, me) {
  OW.convoyT = (OW.convoyT ?? 40) - dt;
  if (OW.convoyT > 0) return;
  OW.convoyT = rnd(70, 110);
  if (owRoadDist(me.x, me.y) > 900) return;
  // start on the nearest road, a good distance ahead or behind
  for (let t = 0; t < 12; t++) {
    const a = rnd(0, Math.PI * 2),
      x = me.x + Math.cos(a) * 1200,
      y = me.y + Math.sin(a) * 1200;
    if (owRoadDist(x, y) > OW_ROADW * 2.5 || x < 300 || y < 300 || x > AW - 300 || y > AH - 300) continue;
    const v = owSpawnRaider(x, y, 1, false, { ctrl: 'convoy', name: 'Scrap convoy', paint: '#c9a43a', tough: 1.6 });
    if (v) {
      v.convoy = {
        dir: Math.random() < 0.5 ? 1 : -1,
        horiz: Math.abs(y - owRoadY(Math.round((y / OW_CH - 2) / OW_ROAD), x)) < OW_ROADW * 2.5
      };
      owNote('A scrap convoy is on the road nearby!', '#ffd257');
      sfx('horn');
    }
    return;
  }
}
function convoyThink(v, dt) {
  if (v.lastBy && v.lastBy.att != null && B.cars[v.lastBy.att]?.player) {
    // it fights back once you hit it
    v.aggro = true;
    return botThink(v, dt);
  }
  const C = v.convoy;
  let tx, ty;
  if (C.horiz) {
    tx = v.x + C.dir * 300;
    ty = owRoadY(Math.round((v.y / OW_CH - 2) / OW_ROAD), tx);
  } else {
    ty = v.y + C.dir * 300;
    tx = owRoadX(Math.round((v.x / OW_CH - 2) / OW_ROAD), ty);
  }
  if (tx < 300 || ty < 300 || tx > AW - 300 || ty > AH - 300) C.dir *= -1;
  const head = v.a - Math.PI / 2,
    diffA = wrap(Math.atan2(ty - v.y, tx - v.x) - head);
  return { ...ZERO_IN, edges: new Set(), th: 0.55, st: clamp(diffA * 2, -1, 1), aimX: tx, aimY: ty };
}
/** Every few raiders a bounty hunter comes for you. */
function owBounty(me) {
  const due = Math.floor(OW.wrecked / 6);
  if (due <= (OW.bounties || 0)) return;
  OW.bounties = due;
  const a = rnd(0, Math.PI * 2),
    v = owSpawnRaider(me.x + Math.cos(a) * 1100, me.y + Math.sin(a) * 1100, 2, false, {
      name: 'Bounty Hunter ' + pick(BOTS).name.split(' ')[0],
      paint: '#ff4d3a',
      tough: 1.8
    });
  if (v) {
    v.aggro = true;
    v.hunter = true;
    OW.toast = { text: 'Bounty hunter', sub: 'Someone put a price on your bumper.', t: 0 };
    sfx('alarm');
  }
}
/** Raider camps (points of interest) wake up when you come close. */
function owWakePOIs(players) {
  for (const ch of OW.chunks.values()) {
    const p = ch.poi;
    if (!p || p.awake || !ch.on) continue;
    if (!players.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 750)) continue;
    p.awake = true;
    const far = Math.hypot(p.x - OW.home0.x, p.y - OW.home0.y),
      diff = far > 7000 ? 2 : far > 3000 ? 1 : 0;
    for (let i = 0; i < 2 + diff; i++) {
      const a = (i / (2 + diff)) * Math.PI * 2;
      const v = owSpawnRaider(p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, diff, false);
      if (v) v.aggro = true;
    }
    owNote('Raider camp! Guards incoming.', '#ff8268');
  }
  // guarded buildings: one guard steps out when you come near
  for (const ch of OW.chunks.values()) {
    if (!ch.on) continue;
    for (const b of ch.bld || []) {
      if (!b.guard || b.woke) continue;
      const cx = b.x + b.w / 2,
        cy = b.y + b.h / 2;
      if (!players.some(c => Math.hypot(c.x - cx, c.y - cy) < 520)) continue;
      b.woke = true;
      const v = owSpawnRaider(cx, cy, 1, false);
      if (v) v.aggro = true;
    }
  }
}

/* ---------- saving ---------- */
function owSave() {
  if (!OW || B?.net === 'client') return;
  try {
    store(
      'sd.world',
      JSON.stringify({
        v: 1,
        seed: OW.seed,
        seen: [...OW.seen],
        inv: OW.inv,
        design: packDesign(OW.design),
        scrap: OW.scrap,
        done: OW.done,
        wrecked: OW.wrecked,
        home: OW.home ? [OW.home.i, OW.home.j] : null,
        label: OW.label,
        clock: Math.round(OW.clock || 0),
        camps: OW.camps.filter(c => c.seen).map(c => [c.i, c.j]),
        at: Date.now()
      })
    );
  } catch (e) {}
}
function owSaved() {
  try {
    const s = JSON.parse(load('sd.world'));
    return s && s.v === 1 ? s : null;
  } catch (e) {
    return null;
  }
}
