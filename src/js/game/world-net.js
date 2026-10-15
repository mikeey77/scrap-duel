// Open world, part 3: playing together. The host runs the world; both computers build the same map
// from the shared seed, so only what changes travels: cars, shots, moved or broken props, pickups,
// the mission. New cars (raiders, a rebuilt friend) are announced once with their design.

/* ---------- which car you bring ---------- */
function owChosenDesign() {
  const v = load('sd.owCar') || 't0';
  if (v === 'mine' && G.base && G.base.size > 4) return [{ base: new Map(G.base), top: new Map(G.top) }, 'your car'];
  if (v.startsWith('bp')) {
    const b = brawlSaved()[+v.slice(2)];
    if (b) return [b.d, 'blueprint'];
  }
  const t = BRAWL_TYPES[+v.slice(1)] || BRAWL_TYPES[0];
  return [brawlDesign(t, 1), t.name];
}

/* ---------- starting together ---------- */
function owHostStart() {
  const [d, label] = owChosenDesign(),
    seed = (Date.now() & 0xffffff) ^ 0x3c;
  $('#ovLobby').hidden = true;
  startWorld(d, label, { net: 'host', seed, friend: { name: G.oppName || 'Friend', paint: '#4ea1ff' } });
  Net.send({ t: 'owstart', seed, host: { d: packDesign(d), name: G.name, paint: G.paint } });
}
function owClientStart(m) {
  const [d, label] = owChosenDesign();
  $('#ovLobby').hidden = true;
  startWorld(d, label, {
    net: 'client',
    seed: m.seed,
    friend: { design: unpackDesign(m.host.d), name: m.host.name, paint: m.host.paint }
  });
  Net.send({ t: 'owhello', d: packDesign(d), name: G.name, paint: G.paint === m.host.paint ? '#4ea1ff' : G.paint });
}

/* ---------- messages ---------- */
function owSendCar(v) {
  if (!B || B.net !== 'host' || !Net.conn) return;
  Net.send({
    t: 'owcar',
    i: v.idx,
    gen: v.gen || 0,
    d: packDesign(v.design),
    name: v.name,
    paint: v.paint,
    team: v.team,
    player: !!v.player,
    boss: v.boss ? v.bossGim || 1 : 0,
    convoy: !!v.convoy,
    hunter: !!v.hunter,
    x: Math.round(v.x),
    y: Math.round(v.y),
    a: +v.a.toFixed(2)
  });
}
/** Called by Net.recv for the open-world messages. Returns true when it handled the message. */
function owRecv(d) {
  switch (d.t) {
    case 'owstart':
      if (Net.role === 'client') owClientStart(d);
      return true;
    case 'owhello':
      if (B && B.ow && B.net === 'host' && B.cars[1]) {
        const v = B.cars[1];
        v.name = String(d.name || 'Friend').slice(0, 16);
        v.paint = d.paint || v.paint;
        owRebuild(v, unpackDesign(d.d));
        G.oppName = v.name;
        // the friend has not seen any raiders yet
        for (const c of B.cars) if (c && !c.player && !c.gone) owSendCar(c);
      }
      return true;
    case 'owdesign':
      if (B && B.ow && B.net === 'host' && B.cars[1]) owRebuild(B.cars[1], unpackDesign(d.d));
      return true;
    case 'owcar':
      if (B && B.ow && B.net === 'client') owApplyCar(d);
      return true;
    case 'owaccept':
      if (B && B.ow && B.net === 'host' && !OW.mission) {
        const camp = OW.camps.find(c => c.i === d.camp.i && c.j === d.camp.j);
        if (camp) owStartMission(d.m, camp);
      }
      return true;
    case 'owtravel':
      if (B && B.ow && B.net === 'host' && B.cars[1]) {
        const camp = OW.camps.find(c => c.i === d.i && c.j === d.j && c.seen);
        if (camp && !owCanTravel(B.cars[1])) owTravel(B.cars[1], camp);
      }
      return true;
    case 'owabandon':
      if (B && B.ow && B.net === 'host') owEndMission(false);
      return true;
    case 'owpart':
      if (B && B.ow && OW) owGotPart(d.id, d.mine);
      return true;
  }
  return false;
}
function owApplyCar(d) {
  const old = B.cars[d.i],
    v = makeCar(unpackDesign(d.d), d.i, old ? old.x : d.x, old ? old.y : d.y, old ? old.a : d.a, {
      tune: [],
      name: d.name,
      paint: d.paint
    });
  v.team = d.team;
  v.player = d.player;
  v.gen = d.gen;
  v.design = unpackDesign(d.d);
  v.look = { ...DEFAULT_STYLE };
  if (d.boss) {
    v.boss = true;
    v.bossGim = typeof d.boss === 'string' ? d.boss : null;
  }
  v.convoy = d.convoy ? {} : null;
  v.hunter = d.hunter;
  v.ctrl = d.i === B.me ? 'local' : null;
  if (d.i === B.me) v.look = { ...G.style };
  while (B.cars.length < d.i) B.cars.push(B.cars[B.cars.length - 1]);
  B.cars[d.i] = v;
  if (d.i === B.me && OW) OW.lastCoins = v.coins || 0;
}

/* ---------- snapshots ---------- */
/** Host: only props that moved, broke or changed travel, plus everything that ever moved now and then. */
function owSnapObjs() {
  OW.snapN = (OW.snapN || 0) + 1;
  const full = OW.snapN % 20 === 0,
    out = [],
    now = new Set();
  for (const o of B.objs) {
    now.add(o.uid);
    const moved = o._sx === undefined || Math.abs(o.x - o._sx) > 1 || Math.abs(o.y - o._sy) > 1 || o.hp !== o._shp;
    if (moved && o._sx !== undefined) o._ever = true;
    if (o._sx === undefined) {
      // first time the host sees it: the client builds the same prop itself
      o._sx = o.x;
      o._sy = o.y;
      o._shp = o.hp;
      if (o.uid < 1e7) o._ever = true; // made during play (thrown junk, debris): the client cannot know it
      if (!o._ever) continue;
    }
    if (!(moved || o.z > 0 || o.hitT > 0 || (full && o._ever))) continue;
    o._sx = o.x;
    o._sy = o.y;
    o._shp = o.hp;
    out.push([
      o.uid,
      o.kind,
      Math.round(o.x),
      Math.round(o.y),
      +o.a.toFixed(2),
      Math.round(o.z),
      Math.round(o.hp),
      Math.round(o.max),
      o.frozen > 0 ? 1 : 0,
      o.id || 0,
      Math.round(o.r),
      0,
      o.hitT > 0 ? 1 : 0
    ]);
  }
  const gone = [];
  for (const u of OW.prevUids || []) if (!now.has(u) && !OW.parked.has(u)) gone.push(u);
  OW.prevUids = now;
  OW.parked.clear();
  return [out, gone];
}
function owSnapExtra() {
  B.pk = B.pk.filter(p => !p.gone);
  return {
    pk: B.pk.map(p => [
      p.uid || 0,
      p.kind,
      Math.round(p.x),
      Math.round(p.y),
      +p.cd.toFixed(1),
      p.kind === 'part' ? p.id : p.p || 0,
      p.val || 0
    ]),
    m: OW.mission,
    ck: Math.round(OW.clock || 0),
    dn: OW.done,
    wr: OW.wrecked,
    gc: B.cars.map(c => (c && c.gone ? 1 : 0))
  };
}
/** Client: merge the host's prop changes into the props this computer generated. */
function owApplySnap(S) {
  const map = new Map(B.objs.map(o => [o.uid, o]));
  for (const [uid, kind, x, y, a, z, hp, max, fr, id, r, , hit] of S.o) {
    let o = map.get(uid);
    if (!o) {
      if (!(JUNK[kind] || PROPS[kind])) continue;
      o = mkObj(kind, x, y, a);
      o.uid = uid;
      B.objs.push(o);
      map.set(uid, o);
    }
    o.tx = x;
    o.ty = y;
    o.tA = a;
    o.z = z;
    o.hp = hp;
    o.max = max;
    o.frozen = fr ? 1 : 0;
    if (hit) o.hitT = 0.1;
  }
  if (S.od && S.od.length) {
    const g = new Set(S.od);
    for (const u of g) OW.gone.add(u);
    B.objs = B.objs.filter(o => !g.has(o.uid));
  }
  const X = S.ow;
  if (!X) return;
  B.pk = X.pk.map(([uid, kind, x, y, cd, extra, val]) => ({
    uid,
    kind,
    x,
    y,
    cd,
    val,
    ...(kind === 'part' ? { id: extra } : kind === 'power' ? { p: extra } : {})
  }));
  const was = OW.mission;
  OW.mission = X.m;
  // the host's mission news, as big text here too
  if (!was && X.m) OW.toast = { text: X.m.title, sub: X.m.text, t: 0 };
  else if (was && !X.m) {
    const won = X.dn > OW.done;
    if (won) cineTitle('Mission complete', was.title, '#5cc38f', 'win', { confetti: 140 });
    else cineTitle('Mission over', was.title, '#ff8268', 'lose');
    const me = myCar();
    if (won && me) owParty(me);
  }
  if (X.ck != null && Math.abs((OW.clock || 0) - X.ck) > 2) OW.clock = X.ck;
  if (X.m && was && X.m.foes && !was.foes)
    cineTitle(
      X.m.type === 'boss' ? 'Boss' : 'Raider camp',
      'Here they come',
      X.m.type === 'boss' ? '#ff5c7a' : '#ff8268',
      X.m.type === 'boss' ? 'boss' : 'info'
    );
  OW.done = X.dn;
  OW.wrecked = X.wr;
  X.gc.forEach((g, i) => {
    if (B.cars[i] && g) {
      B.cars[i].gone = true;
      B.cars[i].dead = true;
    }
  });
}
