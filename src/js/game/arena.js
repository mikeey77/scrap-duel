// Arena state (B), arena generation, cars, damage and death.
/* =================== ARENA CORE (two cars) =================== */
const ac = $('#ac'),
  ax = ac.getContext('2d', { alpha: false });
const AW = 2000,
  AH = 1250,
  WM = 22,
  S = 20;
let B = null,
  view = { w: 0, h: 0, sc: 1, worldW: 0, worldH: 0 },
  ground = null,
  gx = null;
const cam = { x: AW / 2, y: AH / 2, z: 1, tx: AW / 2, ty: AH / 2, tz: 1 };
const CT = (car, id) => car.tune.has(id);
function screenVectorToWorld(x, y) {
  return [x, y];
}
function worldToScreen(x, y, s = view.sc * cam.z) {
  return [view.w / 2 + (x - cam.x) * s, view.h / 2 + (y - cam.y) * s];
}
function sizeArena() {
  const r = ac.getBoundingClientRect(),
    d = dprOf();
  view.w = r.width;
  view.h = r.height;
  view.worldW = r.width;
  view.worldH = r.height;
  ac.width = Math.round(r.width * d);
  ac.height = Math.round(r.height * d);
  view.sc = Math.min(view.worldW / AW, view.worldH / AH);
}
let presentationKey = '';
function syncPresentation() {
  const active = !!B && !B.demo && ['wait', 'battle', 'replay'].includes(G.phase);
  document.body.classList.toggle('reduced-motion', SETTINGS.motion === false);
  document.body.classList.toggle('arena-battle', active && G.phase === 'battle');
  const key = active + ' ' + G.phase + ' ' + innerWidth + ' ' + innerHeight;
  if (key === presentationKey) return;
  presentationKey = key;
  document.body.classList.toggle('in-arena', active);
  if (active) {
    const r = $('#hud').getBoundingClientRect();
    document.documentElement.style.setProperty('--arena-top', Math.ceil(r.bottom + 6) + 'px');
    sizeArena();
  } else if (building())
    requestAnimationFrame(() => {
      sizeBP();
      drawBP();
    });
}
function clearArenaInput() {
  keys.clear();
  edges.clear();
  mouse.down = mouse.right = false;
}
/** Fullscreen: the desktop app asks its window; a browser falls back to the Fullscreen API. */
async function toggleFullscreen() {
  try {
    if (window.desktop && window.desktop.toggleFullscreen) await window.desktop.toggleFullscreen();
    else if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
  } catch (e) {
    toast('Fullscreen was unavailable.');
  }
  clearArenaInput();
  presentationKey = '';
  syncPresentation();
}
$('#btnFS').onclick = () => {
  sfx('ui');
  toggleFullscreen();
};
document.addEventListener('fullscreenchange', () => {
  $('#btnFS').setAttribute('aria-pressed', !!document.fullscreenElement);
  presentationKey = '';
  syncPresentation();
});
addEventListener('resize', () => {
  presentationKey = '';
  syncPresentation();
});
function makeGround(th, kind) {
  ground = document.createElement('canvas');
  ground.width = AW;
  ground.height = AH;
  gx = ground.getContext('2d');
  const g = gx,
    tint = kind === 'wait' ? ['#4a5058', '30,34,40', '120,128,140'] : th.ground;
  g.fillStyle = tint[0];
  g.fillRect(0, 0, AW, AH);
  if (th.id === 'market' && kind !== 'wait') {
    g.strokeStyle = 'rgba(60,64,68,.35)';
    g.lineWidth = 2;
    for (let x = 0; x < AW; x += 60) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, AH);
      g.stroke();
    }
    for (let y = 0; y < AH; y += 60) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(AW, y);
      g.stroke();
    }
  }
  for (let i = 0; i < 80; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? tint[1] : tint[2]},${rnd(0.04, 0.1)})`;
    g.beginPath();
    g.ellipse(rnd(0, AW), rnd(0, AH), rnd(40, 180), rnd(30, 120), rnd(0, 3), 0, 7);
    g.fill();
  }
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? tint[1] : tint[2]},${rnd(0.08, 0.25)})`;
    g.fillRect(rnd(0, AW), rnd(0, AH), rnd(1, 3), rnd(1, 3));
  }
  decorateGround(g, th, kind);
  if (th.id === 'carpark' && kind !== 'wait') {
    // painted parking bays along both long walls
    g.strokeStyle = 'rgba(240,240,230,.55)';
    g.lineWidth = 4;
    for (const [y0, dir] of [
      [WM, 1],
      [AH - WM, -1]
    ])
      for (let x = 120; x < AW - 100; x += 90) {
        g.beginPath();
        g.moveTo(x, y0);
        g.lineTo(x, y0 + dir * 150);
        g.stroke();
      }
    g.fillStyle = 'rgba(242,183,5,.5)';
    g.font = 'bold 54px sans-serif';
    g.textAlign = 'center';
    for (const x of [AW * 0.3, AW * 0.7]) g.fillText('P', x, AH / 2 + 18);
  }
  if (th.id === 'beach' && kind !== 'wait') {
    // wet sand along the top, boardwalk planks along the bottom
    const wet = g.createLinearGradient(0, 0, 0, 220);
    wet.addColorStop(0, 'rgba(90,150,170,.55)');
    wet.addColorStop(1, 'rgba(90,150,170,0)');
    g.fillStyle = wet;
    g.fillRect(0, 0, AW, 220);
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      for (let x = 0; x <= AW; x += 20) g.lineTo(x, 40 + i * 34 + Math.sin(x / 70 + i) * 8);
      g.stroke();
    }
    g.fillStyle = 'rgba(120,80,40,.55)';
    g.fillRect(0, AH - 150, AW, 128);
    g.strokeStyle = 'rgba(60,40,20,.5)';
    g.lineWidth = 2;
    for (let x = 0; x < AW; x += 34) {
      g.beginPath();
      g.moveTo(x, AH - 150);
      g.lineTo(x, AH - 22);
      g.stroke();
    }
  }
  if (th.id === 'ice' && kind !== 'wait') {
    g.strokeStyle = 'rgba(226,80,74,.5)';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(AW / 2, 0);
    g.lineTo(AW / 2, AH);
    g.stroke();
    g.strokeStyle = 'rgba(78,161,255,.5)';
    for (const x of [AW * 0.3, AW * 0.7]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, AH);
      g.stroke();
    }
    g.beginPath();
    g.arc(AW / 2, AH / 2, 140, 0, 7);
    g.stroke();
  } else if (kind !== 'wait') {
    g.strokeStyle = 'rgba(235,225,200,.12)';
    g.lineWidth = 6;
    g.setLineDash([26, 18]);
    g.beginPath();
    g.arc(AW / 2, AH / 2, 200, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(AW / 2, WM);
    g.lineTo(AW / 2, AH - WM);
    g.stroke();
    g.setLineDash([]);
  }
  for (const sx of [260, AW - 260]) {
    g.strokeStyle = 'rgba(255,255,255,.18)';
    g.lineWidth = 4;
    g.strokeRect(sx - 80, AH / 2 - 80, 160, 160);
  }
  g.fillStyle = '#8a8f93';
  g.fillRect(0, 0, AW, WM);
  g.fillRect(0, AH - WM, AW, WM);
  g.fillRect(0, 0, WM, AH);
  g.fillRect(AW - WM, 0, WM, AH);
  g.save();
  g.beginPath();
  g.rect(0, 0, AW, WM);
  g.rect(0, AH - WM, AW, WM);
  g.rect(0, 0, WM, AH);
  g.rect(AW - WM, 0, WM, AH);
  g.clip();
  g.fillStyle = kind === 'wait' ? '#5cc38f' : '#f2b705';
  for (let x = -AH; x < AW + AH; x += 44) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 22, 0);
    g.lineTo(x + 22 + AH, AH);
    g.lineTo(x + AH, AH);
    g.closePath();
    g.fill();
  }
  g.restore();
}
function circRectDist(x, y, s) {
  const cx = clamp(x, s.x, s.x + s.w),
    cy = clamp(y, s.y, s.y + s.h);
  return Math.hypot(x - cx, y - cy);
}
const inRect = (x, y, z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
const inZone = (x, y, z) => (z.r !== undefined ? Math.hypot(x - z.x, y - z.y) < z.r : inRect(x, y, z));
function mkObj(kind, x, y, a) {
  const d = JUNK[kind] || PROPS[kind];
  const o = {
    uid: B ? ++B.uidc : 0,
    kind,
    x,
    y,
    z: 0,
    vz: 0,
    vx: 0,
    vy: 0,
    a: a ?? rnd(0, 6.28),
    w: 0,
    r: d.r,
    m: d.m,
    h: d.h,
    hp: d.hp,
    max: d.hp,
    bounce: d.bounce || 0.3,
    explode: d.explode,
    heavy: d.heavy,
    target: d.target,
    fixed: d.fixed,
    acc: 0,
    accT: 0,
    hitT: 0,
    burn: 0,
    frozen: 0,
    junk: !!JUNK[kind],
    d
  };
  if (kind === 'dummy') {
    o.hp = o.max = 400;
  }
  if (kind === 'sentry') {
    o.st = 'gun';
    o.cd = rnd(1.5, 3);
    o.ha = Math.PI;
    o.jam = 0;
    o.burst = 0;
    o.a = 0;
  }
  if (kind === 'barrier' && a === undefined) o.a = pick([0, Math.PI / 2]);
  return o;
}
function genArena(kind, th) {
  const st = [],
    ob = [],
    zn = [],
    pk = [];
  if (kind === 'wait') {
    const sp = [[300, AH / 2, Math.PI / 2]];
    const z = o => zn.push(o);
    z({ kind: 'ramp', x: 760, y: AH / 2 - 35, w: 110, h: 70, ang: 0 });
    z({ kind: 'ramp', x: 1240, y: 250, w: 70, h: 110, ang: Math.PI / 2 });
    z({ kind: 'tramp', x: 1000, y: 780, w: 80, h: 80 });
    z({ kind: 'oil', x: 1000, y: 220, r: 60 });
    st.push({ x: 1450, y: 520, w: 36, h: 220 });
    for (const [x, y] of [
      [1700, AH / 2],
      [1650, 300],
      [1650, 950]
    ])
      ob.push(mkObj('dummy', x, y, 0));
    ob.push(mkObj('sentry', 1820, AH / 2));
    ob.push(mkObj('barrier', 1100, 980, 0), mkObj('barrier', 1160, 1040, Math.PI / 2));
    for (let i = 0; i < 3; i++) ob.push(mkObj('crate', 560 + i * 28, 240));
    ob.push(mkObj('barrel', 1300, 880), mkObj('barrel', 1340, 900), mkObj('tires', 600, 980));
    const js = ['duck', 'couch', 'cart', 'gnome', 'beachball', 'piano', 'pinata', 'chair'];
    js.forEach((k, i) => ob.push(mkObj(k, 520 + (i % 4) * 130, 620 + Math.floor(i / 4) * 160)));
    return { st, ob, zn, pk, sp };
  }
  const sp = [
      [260, AH / 2, Math.PI / 2],
      [AW - 260, AH / 2, -Math.PI / 2]
    ],
    L = AW / 2 - 80;
  const freeL = (x, y, r) =>
    x - r > WM + 20 &&
    x + r < L &&
    y - r > WM + 20 &&
    y + r < AH - WM - 20 &&
    Math.hypot(x - sp[0][0], y - sp[0][1]) > r + 200 &&
    st.every(s => circRectDist(x, y, s) > r + 26) &&
    ob.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + 8) &&
    zn.every(
      z =>
        !inZone(
          x,
          y,
          z.r !== undefined
            ? { x: z.x, y: z.y, r: z.r + r }
            : { x: z.x - r, y: z.y - r, w: z.w + 2 * r, h: z.h + 2 * r }
        )
    );
  const nW = 2 + Math.floor(Math.random() * 2);
  for (let i = 0, t = 0; i < nW && t < 200; t++) {
    const v = Math.random() < 0.55,
      len = rnd(160, 320),
      a = { w: v ? 36 : len, h: v ? len : 36 };
    a.x = rnd(WM + 140, L - 40 - a.w);
    a.y = rnd(WM + 100, AH - WM - 100 - a.h);
    if (
      st.every(s => a.x + a.w + 110 < s.x || s.x + s.w + 110 < a.x || a.y + a.h + 110 < s.y || s.y + s.h + 110 < a.y) &&
      circRectDist(sp[0][0], sp[0][1], a) > 240
    ) {
      st.push(a);
      i++;
    }
  }
  const zfree = (x, y, r) =>
    Math.hypot(x - sp[0][0], y - sp[0][1]) > 260 &&
    x < L - r &&
    st.every(s => circRectDist(x, y, s) > r + 40) &&
    zn.every(z => Math.hypot(z.x + (z.w || 0) / 2 - x, z.y + (z.h || 0) / 2 - y) > r + 120);
  const addZ = (n, f) => {
    for (let i = 0, t = 0; i < n && t < 200; t++) {
      const x = rnd(WM + 140, L - 80),
        y = rnd(WM + 140, AH - WM - 140);
      if (zfree(x, y, 70)) {
        zn.push(f(x, y));
        i++;
      }
    }
  };
  addZ(th.ramps, (x, y) => {
    const ang = pick([0, Math.PI / 2, -Math.PI / 2]),
      v = Math.abs(Math.sin(ang)) > 0.5,
      w = v ? 70 : 110,
      h = v ? 110 : 70;
    return { kind: 'ramp', x: x - w / 2, y: y - h / 2, w, h, ang };
  });
  addZ(th.tramp, (x, y) => ({ kind: 'tramp', x: x - 40, y: y - 40, w: 80, h: 80 }));
  addZ(th.oil, (x, y) => ({ kind: 'oil', x, y, r: rnd(45, 80) }));
  addZ(th.spikes, (x, y) =>
    Math.random() < 0.5
      ? { kind: 'spikes', x: x - 11, y: y - 75, w: 22, h: 150 }
      : { kind: 'spikes', x: x - 75, y: y - 11, w: 150, h: 22 }
  );
  addZ(th.pads, (x, y) => ({ kind: 'pad', x: x - 45, y: y - 30, w: 90, h: 60, ang: 0 }));
  for (const [k, n] of Object.entries(th.extra || {})) addZ(n, (x, y) => gimmickZone(k, x, y));
  const place = (k, n) => {
    const r = (JUNK[k] || PROPS[k]).r;
    for (let i = 0, t = 0; i < n && t < 300; t++) {
      const x = rnd(WM, L),
        y = rnd(WM, AH - WM);
      if (freeL(x, y, r)) {
        ob.push(mkObj(k, x, y));
        i++;
      }
    }
  };
  const nJ = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < nJ; i++) place(pick(th.junk), 1);
  if (Math.random() < 0.5) place('barrel', 2);
  place('barrier', 1);
  // mirror the left half to the right half
  const st2 = st.map(s => ({ x: AW - s.x - s.w, y: s.y, w: s.w, h: s.h }));
  st.push(...st2);
  const zn2 = zn.map(z =>
    z.r !== undefined
      ? { ...z, x: AW - z.x }
      : { ...z, x: AW - z.x - z.w, ang: z.ang !== undefined ? Math.PI - z.ang : undefined }
  );
  zn.push(...zn2);
  const ob2 = ob.map(o => {
    const n = mkObj(o.kind, AW - o.x, o.y, Math.PI - o.a);
    return n;
  });
  ob.push(...ob2);
  // contested middle
  if (Math.random() < 0.5) zn.push({ kind: 'tramp', x: AW / 2 - 40, y: AH / 2 - 40, w: 80, h: 80 });
  else {
    zn.push(
      { kind: 'ramp', x: AW / 2 - 55, y: AH / 2 - 35 - 170, w: 110, h: 70, ang: 0 },
      { kind: 'ramp', x: AW / 2 - 55, y: AH / 2 - 35 + 170, w: 110, h: 70, ang: Math.PI }
    );
  }
  pk.push(
    { kind: 'coins', x: AW / 2, y: AH * 0.18, val: 30, cd: 0 },
    { kind: 'coins', x: AW / 2, y: AH * 0.82, val: 30, cd: 0 },
    { kind: 'repair', x: AW / 2, y: AH / 2, val: 0.25, cd: 0 },
    { kind: 'power', x: AW / 2, y: AH * 0.34, p: pick(POWER_IDS), cd: 8 },
    { kind: 'power', x: AW / 2, y: AH * 0.66, p: pick(POWER_IDS), cd: 8 }
  );
  if (Math.random() < 0.25) ob.push(mkObj('goldduck', AW / 2, AH / 2 + 90));
  return { st, ob, zn, pk, sp };
}
function serializeField(f) {
  return {
    st: f.st,
    zn: f.zn,
    pk: f.pk,
    sp: f.sp,
    ob: f.ob.map(o => [o.kind, Math.round(o.x), Math.round(o.y), +o.a.toFixed(2), o.uid])
  };
}
function deserializeField(d) {
  return {
    st: d.st,
    zn: d.zn,
    pk: d.pk,
    sp: d.sp,
    ob: d.ob.map(([k, x, y, a, uid]) => {
      const o = mkObj(k, x, y, a);
      o.uid = uid;
      return o;
    })
  };
}

/* Cars */
function makeCar(design, idx, sx, sy, ang, opt) {
  const tune = new Set(opt.tune || []);
  const insts = [],
    blocks = [],
    grid = new Map(),
    tops = new Map();
  const mk = (id, rot, gcx, gcy, layer) => {
    const m = MOD[id];
    return {
      id,
      m,
      rot,
      L: m.size || 1,
      gcx,
      gcy,
      layer,
      hp: m.hp,
      max: m.hp,
      alive: true,
      cells: [],
      cd: rnd(0, 0.3),
      charge: 0,
      burst: 0,
      bt: 0,
      hitT: 0,
      burn: 0,
      used: 0,
      mass: m.mass + (id === 'lance' && tune.has('tungsten') ? 2 : 0),
      punch: 0,
      spin: tune.has('minispool') ? 1 : 0,
      ta: 0
    };
  };
  for (const [k, e] of design.base) {
    const [gcx, gcy] = instCenter(e),
      I = mk(e.id, e.rot, gcx, gcy, 'b');
    I.k = k;
    I.g = e.g | 0;
    for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) {
      const b = { inst: I, gx: x, gy: y };
      I.cells.push(b);
      blocks.push(b);
      grid.set(key(x, y), b);
    }
    insts.push(I);
  }
  for (const [k, e] of design.top) {
    const b = grid.get(k);
    if (
      !b ||
      !footprint(e.id, e.rot, e.x, e.y).every(([x, y]) => {
        const support = grid.get(key(x, y));
        return support && support.inst.m.mnt >= MOD[e.id].mnt;
      })
    )
      continue;
    const [cx, cy] = instCenter(e),
      I = mk(e.id, e.rot, cx, cy, 't');
    I.g = e.g | 0;
    I.anchorX = e.x;
    I.anchorY = e.y;
    I.k = k;
    I.base = b.inst;
    I.turret = b.inst.id === 'ring' && cellCount(I.m) === 1;
    for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) tops.set(key(x, y), I);
    insts.push(I);
  }
  insts.forEach((I, i) => (I.n = i));
  for (const I of insts)
    if (I.m.hubAura)
      for (const b of I.cells)
        for (const [dx, dy] of DIRS) {
          const n = grid.get(key(b.gx + dx, b.gy + dy));
          if (n && n.inst !== I && !n.inst.hubbed) {
            n.inst.hubbed = 1;
            n.inst.max *= 1.2;
            n.inst.hp = n.inst.max;
          }
        }
  const v = {
    idx,
    name: opt.name,
    paint: opt.paint,
    tune,
    x: sx,
    y: sy,
    a: ang,
    vx: 0,
    vy: 0,
    w: 0,
    z: 0,
    vz: 0,
    insts,
    blocks,
    grid,
    tops,
    dead: false,
    in: {
      th: 0,
      st: 0,
      sf: 0,
      boost: false,
      aimX: sx + 300,
      aimY: sy,
      fire: false,
      rmb: false,
      edges: new Set()
    },
    throttle: 0,
    steer: 0,
    strafe: 0,
    fire: false,
    aimX: sx,
    aimY: sy,
    comX: 0,
    comY: 0,
    stuck: [],
    shields: [],
    flip: 0,
    flipAnim: 0,
    anchored: false,
    jumpCd: 0,
    cmCd: 0,
    blinkCd: 0,
    hornCd: 0,
    glue: 3,
    repairPool: 300,
    lastHit: -9,
    hopper: [],
    tether: null,
    ball: null,
    drones: [],
    frozen: 0,
    jam: 0,
    emp: 0,
    blind: 0,
    medPool: 400,
    dealt: 0,
    dealtBy: {},
    dealtSrc: {},
    coins: 0,
    lost: []
  };
  for (const I of insts) I.ta = v.a - Math.PI / 2 + (I.rot * Math.PI) / 2;
  recalc(v, true);
  const hpBonus = 1 + (v.aura.hp || 0); // Defense synergy
  for (const I of insts) {
    I.max *= hpBonus;
    I.hp = I.max;
  }
  v.total = insts.reduce((s, I) => s + I.max, 0);
  for (const I of insts) {
    if (I.m.shield) {
      I.sh = I.m.bubble ? 100 : tune.has('capshield') ? 280 : 140;
      I.shMax = I.sh;
      I.shCd = 0;
    }
    if (I.m.drones)
      for (let i = 0; i < I.m.drones + (tune.has('hive') ? 1 : 0); i++)
        v.drones.push({ bay: I, a: i * 2.4, x: sx, y: sy, hp: tune.has('hive') ? 12 : 24, cd: rnd(0, 0.5) });
  }
  setupJoints(v);
  setupLogic(v, design);
  const bI = insts.find(I => I.m.ball);
  if (bI) {
    const [wx, wy] = ipos(v, bI);
    v.ball = { x: wx - 60, y: wy, vx: 0, vy: 0, inst: bI };
  }
  return v;
}
function recalc(v, init) {
  const alive = v.insts.filter(I => I.alive);
  const items = alive.map(I => ({ m: I.m, x: I.gcx, y: I.gcy, mass: I.mass }));
  for (const s of v.stuck) items.push({ m: {}, x: s.gx / S, y: s.gy / S, mass: s.m });
  if (v.cargoMass) items.push({ m: {}, x: 0, y: 0, mass: v.cargoMass });
  const C = calc(items, v.tune),
    ncx = C.cx * S,
    ncy = C.cy * S;
  if (!init) {
    const dx = ncx - v.comX,
      dy = ncy - v.comY,
      c = Math.cos(v.a),
      s = Math.sin(v.a);
    v.x += dx * c - dy * s;
    v.y += dx * s + dy * c;
  }
  v.comX = ncx;
  v.comY = ncy;
  v.c = C;
  let I_ = C.mass * S * S * 0.6,
    rad = S;
  for (const it of items) {
    const dx = it.x * S - ncx,
      dy = it.y * S - ncy;
    I_ += it.mass * (dx * dx + dy * dy);
    rad = Math.max(rad, Math.hypot(dx, dy) + S);
  }
  v.I = I_;
  for (const b of v.blocks) if (b.inst.alive) rad = Math.max(rad, Math.hypot(b.gx * S - ncx, b.gy * S - ncy) + S);
  v.rad = rad;
  v.radBase = rad;
  if (v.moving) placeJointParts(v);
  v.shields = alive.filter(I => I.m.shield);
  v.has = {};
  for (const I of alive) v.has[I.id] = (v.has[I.id] || 0) + 1;
  v.syn = synergyOf(alive.map(I => I.id));
  v.aura = mergeAura(auraOf(alive.map(I => I.id)), v.syn.aura);
  v.fragile = alive.some(I => I.m.fragile) ? 0.1 : 0;
  for (const I of alive) {
    if (I.m.wpn) I.W = wstat(I.id, v.aura, v.tune);
    I.blocked = false;
    if (I.m.front && I.layer === 'b') {
      const e = { id: I.id, rot: I.rot, x: I.cells[0].gx, y: I.cells[0].gy },
        [fx, fy] = frontCell(e),
        b = v.grid.get(key(fx, fy));
      if (
        frontCells(e).some(([x, y]) => {
          const b = v.grid.get(key(x, y));
          return b && b.inst.alive && b.inst !== I;
        })
      )
        I.blocked = true;
    }
    if (I.m.front && I.layer === 't' && !I.turret) {
      const e = { id: I.id, rot: I.rot, x: I.anchorX ?? I.gcx, y: I.anchorY ?? I.gcy };
      I.blocked = frontCells(e).some(([x, y]) => {
        const t = v.tops.get(key(x, y));
        return t && t !== I && t.alive;
      });
    }
    if (I.m.mel || I.m.lance) {
      let best = 0.5;
      for (const b of I.cells)
        for (const [dx, dy] of DIRS) {
          const n = v.grid.get(key(b.gx + dx, b.gy + dy));
          if (n && n.inst.alive && n.inst !== I)
            best = Math.max(
              best,
              {
                frame: 0.6,
                mesh: 0.4,
                beam: 0.85,
                coupler: 0.5,
                junction: 1.3,
                ballast: 1.25,
                armor: 1.1,
                heavyplate: 1.3,
                track: 1.2,
                girder: 1.15,
                cockpit: 1
              }[n.inst.id] ?? 0.9
            );
        }
      I.mount = best;
    }
  }
}
const lpos = (v, gxp, gyp) => {
  const c = Math.cos(v.a),
    s = Math.sin(v.a),
    dx = gxp - v.comX,
    dy = gyp - v.comY;
  return [v.x + dx * c - dy * s, v.y + dx * s + dy * c];
};
// cells and parts on moving joints carry their own local position (lx, ly) and angle (la)
const bpos = (v, b) => (b.chain ? lpos(v, b.lx, b.ly) : lpos(v, b.gx * S, b.gy * S));
const ipos = (v, I) => (I.chain ? lpos(v, I.lx, I.ly) : lpos(v, I.gcx * S, I.gcy * S));
const faceAng = (v, I) => v.a - Math.PI / 2 + (I.rot * Math.PI) / 2 + (I.la || 0);
function impulse(v, jx, jy, px, py, noSpin) {
  if (v.joints) kickSprings(v, jx, jy);
  if (v.anchored) return;
  const M = v.c.mass;
  v.vx += jx / M;
  v.vy += jy / M;
  if (!noSpin) {
    const rx = px - v.x,
      ry = py - v.y;
    v.w += (rx * jy - ry * jx) / v.I;
  }
}
const integrity = v => v.insts.reduce((s, I) => s + (I.alive ? Math.max(0, I.hp) : 0), 0) / v.total;
const enemyOf = v => B.cars.find(c => c !== v && !c.dead);
const others = v => B.cars.filter(c => c !== v);
const isHost = () => !B || B.net !== 'client';

/* FX that also replicate to a remote client */
function fx(o) {
  B.fx.push(o);
  if (B.rec) B.ev.push(['f', o]);
}
function boom(x, y, sc, big) {
  if (B.rec) B.ev.push(['b', x | 0, y | 0, +sc.toFixed(2), big ? 1 : 0]);
  sfx(big || sc > 1.4 ? 'bigboom' : 'boom', x, y);
  for (let i = 0; i < 14 * sc; i++) {
    const a = rnd(0, 7),
      s = rnd(40, 240) * sc;
    B.fx.push({
      k: 'fire',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rnd(0.25, 0.6),
      max: 0.6,
      r: rnd(3, 7) * sc
    });
  }
  for (let i = 0; i < 8 * sc; i++) {
    const a = rnd(0, 7),
      s = rnd(10, 60);
    B.fx.push({
      k: 'smoke',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rnd(0.8, 1.6),
      max: 1.6,
      r: rnd(6, 12) * sc
    });
  }
  B.fx.push({ k: 'ring', x, y, life: 0.35, max: 0.35, r: 40 * sc });
  B.shake = Math.max(B.shake, (big ? 14 : 4) * Math.min(2, sc));
  if (big || sc >= 1.6) B.hitstop = Math.max(B.hitstop || 0, 0.07);
}
function spark(x, y, n, col) {
  if (B.rec) B.ev.push(['s', x | 0, y | 0, n, col || 0]);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 7),
      s = rnd(60, 220);
    B.fx.push({
      k: 'spark',
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rnd(0.1, 0.3),
      max: 0.3,
      col
    });
  }
}
const txt = (x, y, t, col, life = 0.9) => fx({ k: 'text', x, y, txt: t, life, max: life, col });
const HIT_QUIPS = [
  'CRUNCH!',
  'OOF!',
  'KER-PLUNK!',
  'BONK!',
  'That will buff out',
  'Ouchie',
  'Bolts everywhere!',
  'RIP paint job',
  'CLONK!',
  'Insurance denied'
];
const DUMMY_QUIPS = [
  'Ow!',
  'Not the face!',
  'I have a family!',
  'Is that all?',
  'I am just a dummy!',
  'Union break!',
  'Tickles.'
];
function coinPop(x, y, n, car) {
  if (car) car.coins += n;
  txt(x, y - 18, `+${n} coins`, '#ffd257', 1.2);
  sfx('coin', x, y);
  for (let i = 0; i < Math.min(12, n); i++)
    B.fx.push({ k: 'coin', x, y, vx: rnd(-120, 120), vy: rnd(-200, -60), life: rnd(0.6, 1), max: 1 });
}

/* Damage */
function dmgObj(o, amt, type, att) {
  if (o.dead || amt <= 0) return;
  if (o.frozen > 0) amt *= 1.25;
  if (o.kind === 'dummy' && amt > 8 && (o.quipT || 0) < (B.time || 0) && Math.random() < 0.25) {
    o.quipT = (B.time || 0) + 2.5;
    txt(o.x, o.y - o.r - 18, pick(DUMMY_QUIPS), '#ece8df', 1.2);
  }
  if (o.d.flammable && type === 'fire') amt *= 3;
  const byCar = att != null && att >= 0 ? B.cars[att] : null;
  if (byCar && o.junk) amt *= 1 + (byCar.aura.junk || 0); // Scrap synergy
  o.hp -= amt;
  o.acc += amt;
  o.hitT = 0.1;
  const car = att != null ? B.cars[att] : null;
  if (car && o.target) car.dealt += Math.min(amt, o.hp + amt);
  if (type === 'fire') o.burn = Math.max(o.burn, car && CT(car, 'napalmmix') ? 3 : 1.5);
  if (o.kind === 'chair') o.w += rnd(-1, 1) * amt * 0.4;
  if (o.hp <= 0) {
    if (byCar && o.junk && byCar.aura.junkCoin) coinPop(o.x, o.y, 1, byCar);
    o.dead = true;
    boom(o.x, o.y, o.target ? 1.6 : 0.6);
    const col =
      {
        crate: '#8a6a3a',
        duck: '#f6d33c',
        goldduck: '#ffd257',
        melon: '#e2504a',
        pumpkin: '#f0841f',
        snowman: '#ffffff',
        hay: '#d8b25a',
        pinata: '#ff5ad1'
      }[o.kind] || '#6f777e';
    for (let i = 0; i < (o.target ? 10 : 6); i++)
      fx({
        k: 'chip',
        x: o.x,
        y: o.y,
        vx: rnd(-160, 160),
        vy: rnd(-160, 160),
        life: rnd(0.6, 1.2),
        max: 1.2,
        r: rnd(3, 6),
        col,
        a: rnd(0, 6)
      });
    if (o.d.coins && car) coinPop(o.x, o.y, o.d.coins, car);
    if (car && car.has.recycler) coinPop(o.x, o.y, o.target ? 5 : 1, car);
    if (o.d.geyser) B.zones.push({ kind: 'geyser', x: o.x, y: o.y, r: 46, life: 5 });
    if (o.explode) {
      const e = o.explode;
      setTimeout(() => {
        if (B) explode(o.x, o.y, e.r, e.dmg, 'expl', -1);
      }, 90);
    }
  }
}
/* Fights should last 30-60 s: all part damage is scaled, and the cockpit is shielded by the parts around it. */
const DMG_SCALE = 0.4;
const COCKPIT_GUARD = [1, 0.7, 0.5, 0.35, 0.25]; // damage multiplier by number of intact neighbours
function cockpitGuard(v) {
  let n = 0;
  for (const [dx, dy] of DIRS) {
    const b = v.grid.get(key(dx, dy));
    if (b && b.inst.alive) n++;
  }
  return COCKPIT_GUARD[n];
}
function noteHit(v, sx, sy, att) {
  if ((v.hitNoteT || 0) > B.time) return;
  v.hitNoteT = B.time + 0.12;
  const a = Math.atan2(sy - v.y, sx - v.x);
  if (B.rec) B.ev.push(['h', v.idx, +a.toFixed(2), att, sx | 0, sy | 0]);
  if (v.idx === B.me) B.hitDirs.push({ a, t: 0.9 });
  if (att === B.me) hitMarker(sx, sy);
}
/** Little X where your shots land, with a tick sound: the "I'm actually hitting them" feedback. */
function hitMarker(x, y) {
  B.hitMarks.push({ x, y, t: 0.3 });
  if (B.hitMarks.length > 12) B.hitMarks.shift();
  playSfx('tick');
}
const SRC_NAMES = {
  crash: 'a crash',
  expl: 'an explosion',
  fire: 'fire',
  melee: 'a blade',
  light: 'gunfire',
  kin: 'a heavy hit',
  energy: 'an energy weapon',
  none: 'damage'
};
function killText(v) {
  const by = v.lastBy && B.cars[v.lastBy.att];
  if (!by) return `${v.name} fell apart`;
  const src = v.lastBy.src,
    m = MOD[src];
  const w = m ? 'the ' + m.name : SRC_NAMES[src] || src;
  return pick([
    `${by.name} wrecked ${v.name} with ${w}`,
    `${by.name} turned ${v.name} into a coffee table with ${w}`,
    `${v.name} was recycled by ${by.name}'s ${m ? m.name : w}`,
    `${by.name} filed ${v.name} under "scrap" using ${w}`,
    `${v.name} met ${w}. It did not go well.`
  ]);
}
function hurtInst(v, I, amt, type, sx, sy, dirX, dirY, att) {
  if (!I.alive || v.dead || amt <= 0 || B.seq === 'in' || B.seq === 'count' || v.spawnT > 0) return;
  amt = planHurt(v, I, amt, type);
  if (amt <= 0) return;
  v.lastHurt = B.time;
  const m = I.m;
  let a = amt * (1 + v.fragile);
  const attacker = att != null && att >= 0 ? B.cars[att] : null;
  if (attacker && attacker.dmgOut) a *= attacker.dmgOut;
  if (v.dmgIn) a *= v.dmgIn;
  if (m.res && m.res[type] !== undefined && !(type === 'light' && attacker && CT(attacker, 'apround')))
    a *= 1 - m.res[type];
  if (v.has.gnome && v.insts.some(g => g.id === 'gnome' && g.alive)) a *= 0.92;
  if (I.sprung && type === 'ram') a *= 0.75;
  if (I.gFrag || I.gSpiky || v.flair || (attacker && attacker.flair)) a = flairHurt(v, I, a, type, attacker);
  if (a >= 70 && Math.random() < 0.3 && SETTINGS.nums !== false)
    txt(v.x + rnd(-30, 30), v.y - v.rad - 20, pick(HIT_QUIPS), '#ffd257', 1.1);
  if (type === 'fire') {
    for (const b of I.cells.length ? I.cells : [v.grid.get(I.k)])
      if (b)
        for (const [dx, dy] of DIRS) {
          const n = v.grid.get(key(b.gx + dx, b.gy + dy));
          if (n && n.inst.alive && n.inst.m.fireAura && n.inst !== I) {
            a *= 0.5;
            break;
          }
        }
    if (!m.fireAura) I.burn = attacker && attacker.aura.burn ? 3 : 1.5;
  }
  if (m.sloped) {
    if (type === 'expl') a *= 1.25;
    else if (dirX !== undefined) {
      const fa = faceAng(v, I),
        d = Math.abs(Math.cos(fa) * dirX + Math.sin(fa) * dirY);
      if (d < 0.6) a *= 0.3;
    }
  }
  if (m.reactive && type === 'expl' && a >= 20 && !I.used) {
    I.used = 1;
    const [x, y] = ipos(v, I);
    boom(x, y, 0.7);
    killInst(v, I);
    return;
  }
  if (I.id === 'saw' && CT(v, 'diamond')) a *= 1.3;
  a *= B.dmgScale ?? DMG_SCALE;
  if (type === 'ram') a *= 1 - (v.aura.ramRes || 0);
  if (buffOf(v, 'armor')) a *= 0.5;
  if (attacker && attacker !== v) attacker.dealtBy[type] = (attacker.dealtBy[type] || 0) + a;
  if (I.id === 'cockpit') a *= cockpitGuard(v);
  if (attacker && attacker !== v) {
    v.lastBy = { att: attacker.idx, src: B.hitSrc || (type === 'ram' ? 'crash' : type) };
    if (sx !== undefined) noteHit(v, sx, sy, attacker.idx);
    attacker.dealtSrc[v.lastBy.src] = (attacker.dealtSrc[v.lastBy.src] || 0) + a;
  }
  if (attacker && attacker !== v) attacker.dealt += Math.min(a, Math.max(0, I.hp));
  v.damageMap ??= {};
  v.damageMap[I.layer + '|' + I.k] = (v.damageMap[I.layer + '|' + I.k] || 0) + Math.min(a, Math.max(0, I.hp));
  I.hp -= a;
  v.acc = (v.acc || 0) + a;
  if (B.obj && B.obj.carrier === v.idx) B.obj.carryDmg += a;
  I.hitT = 0.12;
  v.lastHit = B.time;
  if (I.hp <= 0) killInst(v, I);
}
function partObj(v, I) {
  const [x, y] = ipos(v, I);
  B.objs.push({
    uid: ++B.uidc,
    kind: 'part',
    id: I.id,
    x,
    y,
    z: 0,
    vz: 0,
    vx: v.vx + rnd(-80, 80),
    vy: v.vy + rnd(-80, 80),
    a: faceAng(v, I) + Math.PI / 2,
    w: rnd(-5, 5),
    r: S * 0.55 * Math.sqrt(I.L),
    m: I.mass,
    h: 16,
    hp: Math.max(25, I.max * 0.5),
    max: Math.max(25, I.max * 0.5),
    bounce: 0.3,
    acc: 0,
    accT: 0,
    hitT: 0,
    burn: 0,
    frozen: 0,
    junk: true,
    d: {}
  });
}
function killInst(v, I, quiet) {
  if (!I.alive) return;
  if (!quiet && !v.firstBreak) v.firstBreak = { id: I.id, k: I.k, layer: I.layer };
  if (I.id === 'ashtile' && !quiet) planZone(v, ...ipos(v, I), 'fire', 28, 3);
  if (I.id === 'cockpit' && (v.cargo || 0) > 0) planSpill(v, ...ipos(v, I));
  I.alive = false;
  v.lost.push(I.id);
  if (I.gBurst && !quiet) gearBreak(v, I);
  const [x, y] = ipos(v, I);
  if (B.rec && !quiet) B.ev.push(['lesson', v.idx, x, y, `${MOD[I.id].name} destroyed`]);
  if (!quiet) boom(x, y, I.id === 'cockpit' ? 2 : 0.8);
  if (I.m.boom && !quiet)
    setTimeout(() => {
      if (B) explode(x, y, I.m.boom.r, I.m.boom.dmg, 'expl', -1);
    }, 60);
  if (I.id === 'cockpit') {
    B.killInfo = killText(v);
    startDeath(v);
    return;
  }
  let detachedCount = 0;
  const detach = J => {
    detachedCount++;
    J.alive = false;
    v.lost.push(J.id);
    partObj(v, J);
    if (v.ball && v.ball.inst === J) v.ball = null;
    if (v.tether && v.tether.inst === J) v.tether = null;
  };
  if (v.tether && v.tether.inst === I) v.tether = null;
  if (v.ball && v.ball.inst === I) v.ball = null;
  if (I.layer === 'b') {
    for (const b of I.cells) {
      const t = v.tops.get(key(b.gx, b.gy));
      if (t && t.alive) detach(t);
    }
    const core = v.grid.get(key(0, 0)),
      seen = new Set([core]),
      q = [core];
    while (q.length) {
      const c = q.pop();
      for (const [dx, dy] of DIRS) {
        const n = v.grid.get(key(c.gx + dx, c.gy + dy));
        if (n && n.inst.alive && !seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
    for (const J of v.insts.filter(J => J.alive && J.layer === 'b' && !J.cells.some(b => seen.has(b)))) {
      detach(J);
      for (const b of J.cells) {
        const t = v.tops.get(key(b.gx, b.gy));
        if (t && t.alive) detach(t);
      }
    }
  }
  if (B.rec && !quiet) {
    if (detachedCount)
      B.ev.push([
        'lesson',
        v.idx,
        x,
        y,
        `${MOD[I.id].name} broke: ${detachedCount} attached part${detachedCount > 1 ? 's' : ''} lost`
      ]);
    if (v.insts.filter(J => J.alive && J.layer === 'b' && J.id !== 'cockpit').length <= 2)
      B.ev.push(['lesson', v.idx, v.x, v.y, 'Cockpit exposed — almost no chassis protection remains']);
  }
  v.drones = v.drones.filter(d => d.bay.alive);
  if (!quiet) botSay(v, 'hurt', 0.12);
  recalc(v);
}
function startDeath(v) {
  v.dead = true;
  v.drones = [];
  if (B.seq === 'death' || B.seq === 'end') return;
  B.ts = 0.22;
  B.seq = 'death';
  B.seqT = 0;
  B.deadIdx = v.idx;
  cam.tx = v.x;
  cam.ty = v.y;
  cam.tz = 2;
  B.flash = 0.6;
  B.flashCol = '226,80,74';
  const rest = v.insts
    .filter(I => I.alive)
    .map(I => {
      const [x, y] = ipos(v, I);
      return { n: I.n, x, y, d: Math.hypot(x - v.x, y - v.y) };
    })
    .sort((a, b) => a.d - b.d);
  B.chain = rest.map((r, i) => ({ ...r, t: 0.04 + i * 0.03, car: v.idx }));
  sfx('wreck');
}
function shieldBlock(v, x, y, amt) {
  for (const I of v.shields) {
    if (!I.alive || I.sh <= 0) continue;
    const [sx, sy] = I.m.bubble ? [v.x, v.y] : ipos(v, I),
      dx = x - sx,
      dy = y - sy,
      d = Math.hypot(dx, dy);
    if (d > (I.m.bubble ? v.rad + 24 : S * 3.4)) continue;
    const fa = faceAng(v, I);
    if (!I.m.bubble && Math.abs(wrap(Math.atan2(dy, dx) - fa)) > 1.05) continue;
    I.sh -= amt;
    I.shT = 0.3;
    if (I.sh <= 0) {
      I.sh = 0;
      I.shCd = I.m.bubble ? 5 : CT(v, 'capshield') ? 7 : 4;
      spark(x, y, 10, '#9cf');
    } else spark(x, y, 4, '#9cf');
    return true;
  }
  return false;
}
function explode(x, y, r, dmg, type, own, big) {
  for (const o of B.objs) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < r + o.r) {
      const f = 1 - Math.min(1, d / (r + o.r)) * 0.6;
      if (o.kind !== 'barrier' || type === 'expl') dmgObj(o, dmg * f, type, own >= 0 ? own : null);
      if (!o.fixed) {
        const k = (dmg * 4) / o.m,
          n = d || 1;
        o.vx += ((o.x - x) / n) * k;
        o.vy += ((o.y - y) / n) * k;
        o.w += rnd(-4, 4);
        if (o.m < 6 && o.z === 0) o.vz = Math.min(380, (dmg * 3) / o.m);
      }
    }
  }
  for (const v of B.cars) {
    if (v.dead || v.z >= 40 || (own >= 0 && v.idx === own)) continue;
    if (!shieldBlock(v, x, y, dmg * 0.6))
      for (const I of v.insts.filter(I => I.alive)) {
        const [px, py] = ipos(v, I),
          d = Math.hypot(px - x, py - y);
        if (d < r) hurtInst(v, I, dmg * (1 - (d / r) * 0.6), type, x, y, undefined, undefined, own);
      }
    const d = Math.hypot(v.x - x, v.y - y) || 1;
    if (d < r * 1.5) {
      impulse(v, ((v.x - x) / d) * dmg * 6, ((v.y - y) / d) * dmg * 6, x, y);
      if (dmg >= 50 && d < r * 0.6 && v.c.mass < 26 && !v.c.flipRes && Math.random() < 0.3) flipCar(v);
    }
  }
  boom(x, y, clamp(r / 60, 0.6, big ? 4 : 2), big);
}
function flipCar(v) {
  if (v.flip > 0 || v.dead || v.aura.noFlip) return;
  v.flip = v.has.selfright ? 1.2 : 5;
  v.flipAnim = 0;
  txt(v.x, v.y - 40, 'FLIPPED', '#f2b705', 1.2);
}
