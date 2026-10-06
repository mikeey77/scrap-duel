// Bot rival garage: profile, draft picks, shopping and auto-building a car.
/* =================== BOT RIVAL: draft, shop, build =================== */
function newProfile() {
  const starter = starterKit();
  return {
    inv: { ...starter.kit, cockpit: 1 },
    found: new Set(['cockpit', ...Object.keys(starter.kit)]),
    tune: new Set(),
    aff: {},
    coins: 100,
    ws: (() => {
      const w = new Set();
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) w.add(key(x, y));
      return w;
    })(),
    log: []
  };
}
function makeBot(diff) {
  const b = pick(BOTS);
  return Object.assign(newProfile(), {
    name: b.name,
    style: b.style,
    likes: b.likes,
    paint: b.paint,
    say: b.say,
    diff
  });
}
function gainP(P, id, n) {
  if (MOD[id].plan && MOD[id].layer === 't') gainP(P, MOD[id].mnt > 1 ? 'girder' : 'frame', cellCount(MOD[id]) * n);
  if (MOD[id].plan && cellCount(MOD[id]) > 1) {
    const m = MOD[id],
      b = shapeBounds(m),
      maxX = Math.max(...[...P.ws].map(k => unkey(k)[0]));
    for (let x = maxX; x <= maxX + b.w * n + 1; x++)
      for (let y = -Math.max(3, b.h); y <= Math.max(3, b.h); y++) P.ws.add(key(x, y));
  }

  P.inv[id] = (P.inv[id] || 0) + n;
  if (!P.found.has(id)) {
    P.found.add(id);
    for (const t of MOD[id].tags) P.aff[t] = (P.aff[t] || 0) + 1;
  }
}
function botScore(P, o) {
  const likes = t => (P.likes.includes(t) ? 1 : 0);
  if (o.type === 'module') {
    const m = MOD[o.id];
    let s = 1 + m.tags.reduce((a, t) => a + likes(t) * 2 + (P.aff[t] || 0) * 0.4, 0) + m.rar * 0.25;
    if (m.drive && !(P.inv.wheel >= 4)) s += 2;
    if ((m.wpn || m.mel) && P.style !== 'rammer') s += 0.8;
    if (m.mel && P.style === 'rammer') s += 2;
    if (m.layer === 'b' && m.mnt === 2 && !P.inv.girder) s += 1.2;
    return s;
  }
  if (o.type === 'tune') return 2.4;
  if (o.type === 'ws') return P.ws.size < 45 + G.round * 6 ? 3 : 1.2;
  if (o.type === 'salvage') return 2.2;
  return 1.4;
}
function botDraft(P) {
  const opts = draftOptions(P);
  const o = opts.map(o => ({ o, s: botScore(P, o) + Math.random() })).sort((a, b) => b.s - a.s)[0].o;
  if (o.type === 'module') {
    gainP(P, o.id, o.n);
    for (const t of MOD[o.id].tags) P.aff[t] = (P.aff[t] || 0) + 0.5;
  } else if (o.type === 'tune') P.tune.add(o.id);
  else if (o.type === 'ws') {
    for (const k of o.cells) P.ws.add(k);
  } else if (o.type === 'salvage') {
    for (const id in o.items) gainP(P, id, o.items[id]);
  } else P.coins += o.n;
  return o;
}
function botShop(P) {
  for (let n = 0; n < 10 && P.coins > 50; n++) {
    if ((P.inv.wheel || 0) + (P.inv.track || 0) * 2 + (P.inv.monster || 0) < 4 && P.coins >= MOD.wheel.price) {
      P.coins -= MOD.wheel.price;
      gainP(P, 'wheel', 1);
      continue;
    }
    if (P.ws.size < 45 + G.round * 7) {
      const sh = SHAPES.map(s => ({ s, c: shapeCells(s, P.ws) }))
        .filter(x => x.c.size && shapePrice(x.c.size) <= P.coins)
        .sort((a, b) => a.c.size - b.c.size)[0];
      if (sh) {
        P.coins -= shapePrice(sh.c.size);
        for (const k of sh.c) P.ws.add(k);
        continue;
      }
    }
    const wants = MODS.filter(
      m =>
        P.found.has(m.id) &&
        m.id !== 'cockpit' &&
        m.price <= P.coins &&
        (m.wpn || m.mel || m.cat === 'defense' || m.cat === 'struct' || m.drive)
    )
      .map(m => ({
        m,
        s:
          m.tags.reduce((a, t) => a + (P.likes.includes(t) ? 2 : 0), 0) +
          (m.wpn || m.mel ? 1.5 : 0) +
          (m.id === 'girder' || m.id === 'frame' ? 1 : 0) +
          Math.random()
      }))
      .sort((a, b) => b.s - a.s);
    if (!wants.length) break;
    P.coins -= wants[0].m.price;
    gainP(P, wants[0].m.id, 1);
  }
}
const BOT_FRONT = [
  'tusk',
  'lance',
  'blender',
  'shears',
  'batram',
  'wedge',
  'grinder',
  'jaws',
  'drill',
  'saw',
  'chainblade',
  'hammer',
  'flipper',
  'spike',
  'piston',
  'pusher',
  'bumper',
  'sloped'
];
const BOT_MOB = [
  'track',
  'monster',
  'offroad',
  'racing',
  'studded',
  'wheel',
  'spikedwheel',
  'slick',
  'omni',
  'hover',
  'steer'
];
const BOT_IN = [
  'titanframe',
  'girder',
  'capacitor',
  'autoloader',
  'stabilizer',
  'bombbay',
  'rollcage',
  'honeycomb',
  'ring',
  'junction',
  'engine',
  'gyro',
  'ammorack',
  'selfright',
  'overclock',
  'frame',
  'alloy',
  'mesh',
  'strut',
  'nanoframe',
  'ballast',
  'armor',
  'heavyplate',
  'fireproof',
  'spikeplate',
  'coupler'
];
const BOT_PERIM = [
  'composite',
  'heavyplate',
  'mirror',
  'foam',
  'armor',
  'spikeplate',
  'reactive',
  'fireproof',
  'tirewall',
  'girder',
  'junction',
  'frame',
  'alloy',
  'mesh',
  'strut',
  'ballast',
  'nanoframe'
];
function botBuild(P) {
  const inv = { ...P.inv },
    ws = P.ws,
    base = new Map([[key(0, 0), { id: 'cockpit', rot: 0, x: 0, y: 0 }]]),
    top = new Map();
  inv.cockpit = 0;
  const take = list => {
    for (const id of list)
      if ((inv[id] || 0) > 0) {
        inv[id]--;
        return id;
      }
    return null;
  };
  const occ = () => occupancy(base);
  const canBase = (id, rot, x, y) => {
    const o = occ(),
      cells = footprint(id, rot, x, y);
    return cells.every(([a, b]) => ws.has(key(a, b)) && !o.has(key(a, b))) && touchesDesign(cells, o);
  };
  const putB = (list, rot, x, y) => {
    for (const id of list) {
      if (!(inv[id] > 0)) continue;
      if (!canBase(id, rot, x, y)) return false;
      inv[id]--;
      base.set(key(x, y), { id, rot, x, y });
      return true;
    }
    return false;
  };
  let nStruct = 0;
  for (const id of BOT_IN) nStruct += inv[id] || 0;
  const bw = nStruct >= 18 ? 2 : 1,
    bh = nStruct >= 12 ? 2 : 1;
  const body = [];
  for (let y = -bh; y <= bh; y++) for (let x = -bw; x <= bw; x++) if (x || y) body.push([x, y]);
  body.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
  for (let pass = 0; pass < 3; pass++)
    for (const [x, y] of body) {
      if (base.has(key(x, y))) continue;
      const per = Math.abs(x) === bw || Math.abs(y) === bh;
      putB(per ? BOT_PERIM : BOT_IN, 0, x, y);
    }
  // mobility on the flanks
  const rows = [];
  for (let y = -bh; y <= bh; y++) rows.push(y);
  rows.sort((a, b) => Math.abs(b) - Math.abs(a));
  for (const y of rows)
    for (const sx of [-1, 1]) {
      const x = sx * (bw + 1);
      if ((inv.track || 0) > 0 && y === bh && canBase('track', 0, x, y)) {
        inv.track--;
        base.set(key(x, y), { id: 'track', rot: 0, x, y });
        continue;
      }
      putB(
        BOT_MOB.filter(i => i !== 'track'),
        0,
        x,
        y
      );
    }
  // front row
  const fy = -bh - 1,
    fr = [];
  for (let x = -bw; x <= bw; x++) fr.push(x);
  fr.sort((a, b) => Math.abs(a) - Math.abs(b));
  for (const x of fr) {
    if ((inv.lance || 0) > 0 && canBase('lance', 0, x, fy)) {
      inv.lance--;
      base.set(key(x, fy), { id: 'lance', rot: 0, x, y: fy });
      continue;
    }
    putB(
      BOT_FRONT.filter(i => i !== 'lance'),
      0,
      x,
      fy
    );
  }
  // rear row: boosters push forward, jump thrusters, leftover structure
  for (const x of fr) {
    const y = bh + 1;
    if (!putB(['nitro', 'booster'], 0, x, y))
      if (!putB(['jump', 'gyro', 'engine'], 0, x, y)) putB(BOT_IN.concat('scaffold'), 0, x, y);
  }
  // special base parts: a few of each, so huge inventories (sandbox, late game) still leave room for guns
  let planBudget = 10;
  for (const m of MODS.filter(m => m.plan && m.layer === 'b')) {
    let perId = 4;
    while (inv[m.id] > 0 && perId > 0 && planBudget > 0) {
      perId--;
      planBudget--;
      let placed = false;
      for (const k of ws) {
        const [x, y] = unkey(k);
        for (const rot of [0, 1, 3, 2])
          if (canBase(m.id, rot, x, y)) {
            const was = blockedFor(base, top).length;
            base.set(k, { id: m.id, rot, x, y });
            if (blockedFor(base, top).length > was) {
              base.delete(k);
              continue;
            }
            inv[m.id]--;
            placed = true;
            break;
          }
        if (placed) break;
      }
      if (!placed) break;
    }
  }
  let bigBudget = 4;
  for (const m of MODS.filter(m => m.plan && m.layer === 't' && cellCount(m) > 1)) {
    let perBig = 2;
    while (inv[m.id] > 0 && perBig-- > 0 && bigBudget > 0) {
      let done = false;
      for (const k of ws) {
        const [x, y] = unkey(k);
        for (const rot of [0, 1, 3, 2]) {
          const cells = footprint(m.id, rot, x, y),
            o = occ(),
            sid = m.mnt > 1 ? 'girder' : 'frame';
          if (
            !cells.every(
              ([a, b]) =>
                ws.has(key(a, b)) &&
                !topAt(key(a, b), top) &&
                (!o.has(key(a, b)) || MOD[base.get(o.get(key(a, b))).id].mnt >= m.mnt)
            )
          )
            continue;
          const missing = cells.filter(([a, b]) => !o.has(key(a, b)));
          if ((inv[sid] || 0) < missing.length) continue;
          for (const [a, b] of missing) base.set(key(a, b), { id: sid, rot: 0, x: a, y: b });
          top.set(k, { id: m.id, rot, x, y });
          if (!designConnected(base) || blockedFor(base, top).length) {
            for (const [a, b] of missing) base.delete(key(a, b));
            top.delete(k);
            continue;
          }
          inv[sid] -= missing.length;
          inv[m.id]--;
          bigBudget--;
          done = true;
          break;
        }
        if (done) break;
      }
      if (!done) break;
    }
  }
  // tops
  const o = occ(),
    mountAt = k => {
      const a = o.get(k);
      return a ? MOD[base.get(a).id].mnt : 0;
    };
  const cells = [...o.keys()].map(unkey).sort((a, b) => a[1] - b[1] || Math.abs(a[0]) - Math.abs(b[0]));
  const weapons = MODS.filter(m => m.layer === 't' && (m.wpn || m.drones) && inv[m.id] > 0).sort(
    (a, b) => dpsOf(b.id, {}, P.tune) - dpsOf(a.id, {}, P.tune)
  );
  const ring = [...base.values()].find(e => e.id === 'ring');
  const putT = (id, x, y) => {
    const k = key(x, y);
    const topsOcc = occupancy(top);
    if (
      !(inv[id] > 0) ||
      !footprint(id, 0, x, y).every(([a, b]) => !topsOcc.has(key(a, b)) && mountAt(key(a, b)) >= MOD[id].mnt)
    )
      return false;
    const m = MOD[id];
    if (m.front) {
      if (frontCells({ id, rot: 0, x, y }).some(([a, b]) => topsOcc.has(key(a, b)))) return false;
    }
    const behind = top.get(key(x, y + 1));
    if (behind && MOD[behind.id].front) return false;
    const was = blockedFor(base, top).length;
    inv[id]--;
    top.set(k, { id, rot: 0, x, y });
    if (blockedFor(base, top).length > was) {
      top.delete(k);
      inv[id]++;
      return false;
    }
    return true;
  };
  if (ring) {
    const w = weapons.find(m => m.front && m.mnt <= 2 && inv[m.id] > 0);
    if (w) putT(w.id, ring.x, ring.y);
  }
  for (const m of weapons)
    while (inv[m.id] > 0) {
      let done = false;
      for (const [x, y] of cells)
        if (putT(m.id, x, y)) {
          done = true;
          break;
        }
      if (!done) break;
    }
  const utils = MODS.filter(m => m.layer === 't' && !m.wpn && !m.drones && inv[m.id] > 0);
  for (const m of utils)
    while (inv[m.id] > 0) {
      let done = false;
      for (const [x, y] of [...cells].reverse())
        if (putT(m.id, x, y)) {
          done = true;
          break;
        }
      if (!done) break;
    }
  return { base, top };
}
