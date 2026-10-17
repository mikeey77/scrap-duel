// Input, the bot driver, and the per-frame arena step (host and client).
/* =================== INPUT =================== */
const keys = new Set(),
  mouse = { x: AW / 2, y: AH / 2, down: false, right: false },
  edges = new Set();
const CTRL = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyJ',
  'ShiftLeft',
  'ShiftRight',
  'KeyQ',
  'KeyE',
  'KeyZ',
  'KeyV',
  'KeyC',
  'KeyX',
  'KeyF',
  'KeyH'
];
addEventListener('keydown', e => {
  if (e.target && (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable)) return;
  const code = mappedKey(e.code); // the player's own key bindings
  if (
    (G.phase === 'wait' || G.phase === 'battle' || G.phase === 'world') &&
    B &&
    !B.paused &&
    !Net.reconnecting &&
    ['#ovMenu', '#ovCodex', '#ovSettings', '#ovPause'].every(id => $(id).hidden) &&
    code &&
    CTRL.includes(code)
  ) {
    e.preventDefault();
    if (!e.repeat) edges.add(code);
    keys.add(code);
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'KeyK' && G.phase !== 'intro' && G.phase !== 'menu') {
    $('#ovCodex').hidden ? openCodex() : closeCodex();
    return;
  }
  if (e.code === 'Escape' && !$('#ovCodex').hidden) {
    e.preventDefault(); // one Esc closes the codex; it must not also open the pause menu
    closeCodex();
    return;
  }
  if (building()) {
    if (e.code === 'KeyR') turnBrush(e.shiftKey ? -1 : 1);
    else if (e.code === 'KeyB') setTool('place');
    else if (e.code === 'KeyT') setTool('rotate');
    else if (e.code === 'KeyG') setTool('keys');
    else if ((e.code === 'BracketLeft' || e.code === 'BracketRight') && MOD[G.sel] && MOD[G.sel].beam) {
      const L = clamp(MOD[G.sel].beam + (e.code === 'BracketRight' ? 1 : -1), 1, 4);
      G.sel = 'beam' + L;
      setTool('place');
      renderBin();
      renderInspect();
    } else if (e.code === 'KeyX' || e.code === 'Delete') setTool('remove');
    else if (e.code === 'Equal') setZoom(G.zoom * 1.2);
    else if (e.code === 'Minus') setZoom(G.zoom / 1.2);
  }
});
addEventListener('keyup', e => {
  keys.delete(e.code);
  const code = mappedKey(e.code);
  if (code) keys.delete(code);
});
addEventListener('blur', () => clearArenaInput());
const toWorld = (cx, cy) => {
  const r = ac.getBoundingClientRect(),
    s = view.sc * cam.z;
  const [x, y] = screenVectorToWorld((cx - r.left - view.w / 2) / s, (cy - r.top - view.h / 2) / s);
  return [x + cam.x, y + cam.y];
};
function arenaInputBlocked() {
  return ['#ovMenu', '#ovCodex', '#ovSettings', '#ovPause'].some(id => !$(id).hidden);
}
ac.addEventListener('pointerdown', ev => {
  if (!B || B.paused || B.replay || B.demo || Net.reconnecting || arenaInputBlocked()) return;
  ev.preventDefault();
  mouse.pointerId = ev.pointerId;
  mouse.sx = ev.clientX;
  mouse.sy = ev.clientY;
  if (ev.button === 2) {
    mouse.right = true;
    edges.add('RMB');
  } else mouse.down = true;
  try {
    ac.setPointerCapture(ev.pointerId);
  } catch (e) {}
});
ac.addEventListener('pointermove', ev => {
  if (!B) return;
  mouse.sx = ev.clientX;
  mouse.sy = ev.clientY;
});
const up = ev => {
  if (!B) return;
  if (ev.type === 'lostpointercapture') {
    if (ev.pointerId === mouse.pointerId) mouse.down = mouse.right = false;
    return;
  }
  if (ev.button === 2) mouse.right = false;
  else mouse.down = false;
};
ac.addEventListener('pointerup', up);
ac.addEventListener('pointercancel', up);
ac.addEventListener('lostpointercapture', up);
ac.addEventListener('contextmenu', e => e.preventDefault());
const ZERO_IN = {
  th: 0,
  st: 0,
  sf: 0,
  boost: false,
  aimX: 0,
  aimY: 0,
  fire: false,
  rmb: false,
  drop: false,
  gr: 0,
  edges: new Set()
};
function readLocal() {
  const v = myCar(),
    i = {
      th: 0,
      st: 0,
      sf: 0,
      boost: false,
      aimX: 0,
      aimY: 0,
      fire: mouse.down || keys.has('Space'),
      rmb: mouse.right,
      drop: keys.has('KeyZ'),
      gr: heldGroups(),
      edges: new Set(edges)
    };
  edges.clear();
  if (arenaInputBlocked()) {
    clearArenaInput();
    i.fire = i.rmb = i.drop = false;
    i.edges.clear();
    return i;
  }
  {
    i.th = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    i.st = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  }
  i.sf = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  i.boost = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (mouse.sx !== undefined) [mouse.x, mouse.y] = toWorld(mouse.sx, mouse.sy);
  i.aimX = mouse.x;
  i.aimY = mouse.y;
  if (!G.local2) padBattle(i, v); // in a local duel the controller belongs to player 2
  return i;
}
function applyInput(v, i) {
  if (v.dead || B.seq !== 'play') {
    v.throttle = 0;
    v.steer = 0;
    v.strafe = 0;
    v.fire = false;
    v.boostKey = false;
    v.rmb = false;
    v.groups = 0;
    return;
  }
  v.throttle = i.th;
  v.steer = i.st;
  v.strafe = i.sf;
  v.boostKey = i.boost;
  v.aimX = i.aimX;
  v.aimY = i.aimY;
  v.fire = i.fire;
  v.rmb = i.rmb;
  v.groups = i.gr | 0;
  const E = i.edges;
  if (i.fire && !v.planHeldFire) planActivate(v, 'Space');
  v.planHeldFire = !!i.fire;
  for (const k of E) if (k !== 'Space') planActivate(v, k);
  if (E.has('KeyJ')) jump(v);
  if (E.has('RMB')) action(v);
  if (E.has('KeyV')) counter(v);
  if (E.has('KeyX')) release(v);
  if (E.has('KeyF')) blink(v);
  if (E.has('KeyH')) horn(v);
  if (E.has('KeyC') && v.has.anchor) {
    v.anchored = !v.anchored;
    txt(v.x, v.y - 36, v.anchored ? 'ANCHORED' : 'ANCHOR UP', '#c9ced3', 0.8);
    if (v.anchored) {
      v.w = 0;
      spark(v.x, v.y, 8);
    }
  }
  if (i.drop) drop(v, E.has('KeyZ'));
  if (v.anchored && !v.has.anchor) v.anchored = false;
  boosters(v);
}
function takeRemote() {
  const r = B.remoteIn || ZERO_IN,
    i = { ...r, edges: B.remoteEdges || new Set() };
  B.remoteEdges = new Set();
  return i;
}

/* =================== BOT DRIVER =================== */
function botProfile(v) {
  let mel = 0,
    gun = 0,
    rng = 0,
    spd = 0,
    n = 0,
    lob = false,
    tur = 0;
  for (const I of v.insts) {
    if (!I.alive) continue;
    const m = I.m;
    if (m.mel || m.lance || m.piston || m.flipper || (m.ram || 1) > 1) mel++;
    if (I.W) {
      gun++;
      rng += I.W.rng || 300;
      spd += I.W.spd || 900;
      n++;
      if (I.W.kind === 'lob') lob = true;
      if (I.turret || I.W.kind === 'lob' || I.W.kind === 'tesla' || I.W.kind === 'homing') tur++;
    }
  }
  return {
    fixed: gun > 0 && tur / gun < 0.5,
    melee: mel > 0 && (gun === 0 || v.style === 'rammer' || mel >= gun),
    range: n ? clamp(rng / n, 160, 700) : 200,
    spd: n ? spd / n : 900,
    lob
  };
}
function botThink(v, dt) {
  const e = enemyOf(v),
    D = DIFF[v.diff ?? 1],
    inp = {
      th: 0,
      st: 0,
      sf: 0,
      boost: false,
      aimX: v.x,
      aimY: v.y - 100,
      fire: false,
      rmb: false,
      drop: false,
      edges: new Set()
    };
  if (!e || B.seq !== 'play') return inp;
  const ai =
    v.ai || (v.ai = { t: 0, jx: 0, jy: 0, stuck: 0, rev: 0, orbit: Math.random() < 0.5 ? 1 : -1, hp: 1, pt: 0 });
  ai.pt -= dt;
  if (ai.pt <= 0 || !ai.P) {
    ai.P = botProfile(v);
    ai.pt = 2;
  }
  const P = ai.P;
  ai.t -= dt;
  if (ai.t <= 0) {
    ai.t = D.react + rnd(0, 0.35);
    ai.jx = rnd(-1, 1) * D.jitter;
    ai.jy = rnd(-1, 1) * D.jitter;
    if (Math.random() < 0.03) ai.orbit *= -1;
  }
  if (!ai.saidLow && integrity(v) < 0.25) {
    ai.saidLow = true;
    botSay(v, 'low');
  }
  const dx = e.x - v.x,
    dy = e.y - v.y,
    dist = Math.hypot(dx, dy),
    integ = integrity(v),
    fwd = v.a - Math.PI / 2;
  const rep = (B.pk || []).find(p => p.kind === 'repair' && p.cd <= 0),
    coin = (B.pk || []).find(
      p =>
        (p.kind === 'coins' || (p.kind === 'power' && !v.buff)) && p.cd <= 0 && Math.hypot(p.x - v.x, p.y - v.y) < 420
    );
  let tx, ty;
  const goal = objectiveTarget(v, e);
  if (goal && !(rep && integ < 0.35)) {
    tx = goal.x;
    ty = goal.y;
  } else if (B.ring && Math.hypot(v.x - AW / 2, v.y - AH / 2) > B.ring.r * 0.75) {
    tx = AW / 2;
    ty = AH / 2;
  } else if (rep && integ < 0.55 && Math.hypot(rep.x - v.x, rep.y - v.y) < Math.hypot(rep.x - e.x, rep.y - e.y) + 120) {
    tx = rep.x;
    ty = rep.y;
  } else if (P.melee) {
    tx = e.x + e.vx * 0.35;
    ty = e.y + e.vy * 0.35;
  } else if (coin && dist > P.range * 0.5) {
    tx = coin.x;
    ty = coin.y;
  } else if (dist > P.range * 1.3) {
    tx = e.x;
    ty = e.y;
  } else {
    const a = Math.atan2(v.y - e.y, v.x - e.x) + ai.orbit * 0.55,
      r = P.range * (P.lob ? 0.9 : 0.7);
    tx = e.x + Math.cos(a) * r;
    ty = e.y + Math.sin(a) * r;
  }
  tx = clamp(tx, WM + 70, AW - WM - 70);
  ty = clamp(ty, WM + 70, AH - WM - 70);
  let want = Math.atan2(ty - v.y, tx - v.x);
  const dd = Math.hypot(tx - v.x, ty - v.y),
    look = Math.min(dd, v.rad + 130);
  const probe = (ang, len) => {
    for (let t = 24; t < len; t += 18) {
      const px = v.x + Math.cos(ang) * t,
        py = v.y + Math.sin(ang) * t;
      if (
        px < WM + v.rad * 0.6 ||
        px > AW - WM - v.rad * 0.6 ||
        py < WM + v.rad * 0.6 ||
        py > AH - WM - v.rad * 0.6 ||
        stNear(px, py, v.rad).some(s => circRectDist(px, py, s) < v.rad * 0.7) ||
        B.zones.some(z => z.kind === 'spikes' && circRectDist(px, py, z) < v.rad * 0.5) ||
        B.objs.some(o => (o.fixed || o.m >= 8) && o.z === 0 && Math.hypot(o.x - px, o.y - py) < o.r + v.rad * 0.5)
      )
        return t;
    }
    return len;
  };
  if (ai.det > 0) {
    ai.det -= dt;
    want += ai.detOff;
  }
  if (probe(want, look) < look)
    for (const off of [0.6, -0.6, 1.1, -1.1, 1.7, -1.7, 2.4, -2.4])
      if (probe(want + off, look) >= look) {
        want += off;
        break;
      }
  const night = B.special === 'night' && dist > 320 ? 3 : 1,
    tof = dist / (P.spd || 900),
    bl = v.blind > 0 ? 220 : 0;
  inp.aimX = e.x + e.vx * tof * D.lead + ai.jx * night + rnd(-bl, bl);
  inp.aimY = e.y + e.vy * tof * D.lead + ai.jy * night + rnd(-bl, bl);
  const dec = B.decoys.find(d => d.own === e.idx);
  if (dec && Math.random() < 0.6) {
    inp.aimX = dec.x;
    inp.aimY = dec.y;
  }
  const smoke = inSmoke(e.x, e.y),
    los = P.lob || losClear(v.x, v.y, e.x, e.y);
  let diff = wrap(want - fwd),
    th = 1;
  if (Math.abs(diff) > 2.3 && dd < 240) {
    th = -1;
    diff = wrap(diff + Math.PI);
  } else if (Math.abs(diff) > 1.2) th = 0.35;
  if (!P.melee && dd < 50) th = 0;
  const busy =
    (goal && !goal.fight) ||
    (B.ring && Math.hypot(v.x - AW / 2, v.y - AH / 2) > B.ring.r * 0.75) ||
    (rep && integ < 0.55);
  if (P.fixed && !P.melee && !busy && los && dist < P.range * 1.05) {
    // fixed guns: point the nose at the target and hold range
    diff = wrap(Math.atan2(inp.aimY - v.y, inp.aimX - v.x) - fwd);
    th = dist < P.range * 0.4 ? -0.7 : dist > P.range * 0.8 ? 0.7 : Math.abs(diff) < 0.4 ? 0.25 : 0;
    if (probe(fwd + (th < 0 ? Math.PI : 0), v.rad + 60) < v.rad + 60) th = -th * 0.5;
  }
  const sp = Math.hypot(v.vx, v.vy);
  if (Math.abs(th) > 0.3 && sp < 28 && v.z === 0 && v.flip <= 0 && !v.anchored) ai.stuck += dt;
  else ai.stuck = Math.max(0, ai.stuck - dt * 2);
  if (ai.stuck > 1) {
    ai.stuck = 0;
    ai.rev = 0.9;
    ai.rs = Math.random() < 0.5 ? 1 : -1;
    ai.det = 2.1;
    ai.detOff = -ai.rs * 1.3;
    if (v.has.blink && v.blinkCd <= 0) inp.edges.add('KeyF');
    else if (v.has.jump) inp.edges.add('KeyJ');
  }
  if (ai.rev > 0) {
    ai.rev -= dt;
    th = -th || -1;
    diff = ai.rs;
  }
  inp.th = th;
  inp.st = clamp(diff * 3, -1, 1);
  if (v.has.omni && !P.melee) inp.sf = ai.orbit * 0.8;
  inp.fire = los && dist < P.range * 1.15 && (!smoke || Math.random() < 0.3);
  if (P.melee && dist < v.rad + e.rad + 60) inp.fire = true;
  if (v.has.booster && Math.abs(diff) < 0.3 && th > 0 && (P.melee ? dist > 160 : dd > 420) && Math.random() < dt * 2)
    inp.boost = true;
  const facing = Math.abs(wrap(Math.atan2(dy, dx) - fwd));
  if ((v.has.piston || v.has.flipper) && dist < v.rad + e.rad + 30 && facing < 0.7) inp.edges.add('RMB');
  if (v.has.catapult && v.hopper.length && dist < 520 && Math.random() < dt * 1.5) inp.edges.add('RMB');
  if (v.has.tractor && dist < 380 && P.melee) inp.rmb = true;
  // moving parts: swing/lunge when close, rest otherwise (rotators spin on their own)
  if (v.joints && v.joints.some(J => jtype(J) === 'hinge' || jtype(J) === 'hydraulic') && dist < 240)
    inp.rmb = (B.time * 1.6) % 2 < 1.1;
  if (v.has.harpoon && v.tether) inp.rmb = P.melee;
  if (PLAN_ACTION.some(id => v.has[id]) && dist < 450 && Math.random() < dt * 0.8) inp.edges.add('RMB');
  if (PLAN_DROP.some(id => v.has[id]) && dist < 280 && Math.random() < dt) inp.edges.add('KeyZ');
  if (v.has.prizebell && dist < 250 && Math.random() < dt) inp.edges.add('KeyH');
  if (v.has.rescue && v.flip > 0) inp.edges.add('KeyC');
  const hasCM = v.has.smoke || v.has.decoy || v.has.jammer || v.has.flare || v.has.emp || v.has.flashbang;
  if ((v.has.emp || v.has.flashbang) && v.cmCd <= 0 && dist < 300 && Math.random() < dt * 2) inp.edges.add('KeyV');
  if (ai.hp - integ > 0.12 && v.cmCd <= 0 && hasCM) {
    inp.edges.add('KeyV');
    ai.hp = integ;
  }
  ai.hp += (integ - ai.hp) * Math.min(1, dt * 0.3);
  if (
    v.cmCd <= 0 &&
    hasCM &&
    B.shots.some(s => s.kind === 'homing' && s.own !== v.idx && Math.hypot(s.x - v.x, s.y - v.y) < 260)
  )
    inp.edges.add('KeyV');
  if (v.has.horn && dist < 300 && Math.random() < dt * 0.3) inp.edges.add('KeyH');
  if ((v.has.oil || v.has.glue || v.has.banana || v.has.mines) && dist < 280 && facing > 2.2) {
    inp.drop = true;
    if (Math.random() < dt * 0.8) inp.edges.add('KeyZ');
  }
  if (
    v.has.jump &&
    v.jumpCd <= 0 &&
    B.lobs.some(l => l.own !== v.idx && Math.hypot(l.tx - v.x, l.ty - v.y) < l.splash && l.T - l.t < 0.5)
  )
    inp.edges.add('KeyJ');
  if (v.has.anchor && v.anchored && (dist > P.range * 1.2 || P.melee)) inp.edges.add('KeyC');
  return inp;
}

/* =================== STEP =================== */
const myCar = () => (B && B.cars ? B.cars[B.me] : null);
function debris(x, y, id, a) {
  if (B.rec) B.ev.push(['d', x | 0, y | 0, id, +a.toFixed(2)]);
  B.debris.push({
    x,
    y,
    vx: rnd(-260, 260),
    vy: rnd(-260, 260),
    a,
    w: rnd(-9, 9),
    id,
    life: 2.6,
    z: 0,
    vz: rnd(150, 420)
  });
}
function stepArena(rdt) {
  if (B.hitstop > 0) {
    B.hitstop -= rdt;
    rdt *= 0.2;
  }
  B.time += rdt;
  const dt = rdt * B.ts;
  ANIM += dt;
  B.seqT += rdt;
  if (B.flash > 0) B.flash = Math.max(0, B.flash - rdt * 1.6);
  if (B.banner) B.banner.t += rdt;
  const sim = B.net !== 'client',
    ref = B;
  if (sim) seqHost(rdt);
  else seqClient(rdt);
  if (B !== ref) return;
  updateCam(rdt);
  if (sim) simulate(dt);
  else clientStep(dt);
  wreckFxStep(dt);
  if (B.ow) {
    owStep(dt);
    stepFx(dt);
    B.shake *= Math.exp(-8 * rdt);
    return;
  }
  if (sim && !B.demo && !B.replay) {
    bossTick(dt);
    stepGifts(dt);
  }
  // both peers watch the fight for the commentators; only the offline host throws gifts
  if (!B.demo && !B.replay) crowdStep(dt);
  stepCommentary(rdt);
  stepFx(dt);
  B.shake *= Math.exp(-8 * rdt);
}
const COUNT_T = 3.2; // 3, 2, 1 at 0.9 s each, then GO
function seqHost(rdt) {
  if (B.seq === 'in') {
    if (B.seqT > 1.1) {
      B.seq = G.phase === 'battle' || B.demo ? 'count' : 'play';
      B.seqT = 0;
      if (B.seq === 'count') sfx('count');
    }
  } else if (B.seq === 'count') {
    if (B.seqT > COUNT_T) {
      B.seq = 'play';
      B.seqT = 0;
      sfx('go');
      for (const v of B.cars) botSay(v, 'start', 0.6);
    }
  } else if (B.seq === 'out') {
    if (B.seqT > 1.3 && B.onOut) {
      const f = B.onOut;
      B.onOut = null;
      f();
    }
  } else if (B.seq === 'death') deathSeq(rdt);
  else if (B.seq === 'respawn') {
    if (B.seqT > 0.4) {
      const sp = B.sp[0],
        c = makeCar(B.ow ? OW.design : myDesign(), 0, sp[0], sp[1], sp[2], {
          tune: [...G.tune],
          name: G.name,
          paint: G.paint
        });
      c.ctrl = 'local';
      c.team = 0;
      c.look = { ...G.style };
      B.cars[0] = c;
      B.seq = 'in';
      B.seqT = 0;
      B.ts = 1;
      B.bigBoom = 0;
      B.banner = null;
      B.chain = [];
    }
  } else if (B.seq === 'end') {
    if (B.seqT > 2.4) finishBattle();
  }
}
function seqClient(rdt) {
  if (B.seq === 'death') {
    const v = B.cars[B.deadIdx];
    if (B.seqT > 0.9) B.ts = Math.min(1, B.ts + rdt * 0.8);
    if (v && B.seqT > 0.25 && !B.bigBoom) {
      B.bigBoom = 1;
      B.flash = 0.8;
      B.flashCol = '255,200,120';
      B.banner = { text: 'WRECKED', col: '#e2504a', t: 0, sub: B.killInfo || v.name };
      wreckFx(v);
    }
  } else if (B.seq === 'end') {
    if (B.result && B.seqT > 2.4 && !B.replay) finishBattle();
  }
}
function onSeqClient(seq) {
  if (seq === 'death') {
    const v = B.cars[B.deadIdx];
    B.ts = B.obj ? 0.5 : 0.22;
    B.flash = 0.6;
    B.flashCol = '226,80,74';
    B.bigBoom = 0;
    if (v) v.dead = true;
  } else B.ts = 1;
}
function deathSeq(rdt) {
  const v = B.cars[B.deadIdx],
    respawns = B.obj && SPECIALS[B.special].respawn;
  if (B.seqT > (respawns ? 0.5 : 0.9)) B.ts = Math.min(1, B.ts + rdt * 0.8);
  for (const c of B.chain) {
    if (!c.done && B.seqT > c.t * 4) {
      c.done = 1;
      const I = v.insts[c.n];
      if (I) I.alive = false;
      boom(c.x, c.y, 0.9);
      debris(c.x, c.y, I ? I.id : 'frame', v.a + (I ? (I.rot * Math.PI) / 2 : 0));
    }
  }
  if (B.seqT > 0.25 && !B.bigBoom) {
    B.bigBoom = 1;
    boom(v.x, v.y, 3, true);
    B.flash = 0.8;
    B.flashCol = '255,200,120';
    B.banner = { text: 'WRECKED', col: '#e2504a', t: 0, sub: B.killInfo || v.name };
    wreckFx(v);
    if (v.lastBy) botSay(B.cars[v.lastBy.att], 'wreck');
    if (B.demo) demoFeed(B.killInfo || `${v.name} fell apart`);
    if (B.obj && B.obj.carrier === v.idx) dropDuck(v);
  }
  // once the chain of explosions is over, what is left becomes a wreck on the floor
  if (B.seqT > 1.5 && !v.wreckMade && !respawns) {
    v.wreckMade = true;
    makeWreck(v);
  }
  if (respawns && B.seqT > 1.7) return respawnCar(v.idx);
  if (B.seqT > 2.8) {
    if (G.phase === 'battle' || B.demo) {
      // the round goes to the other team (its leader is car 0 or 1, which is also the team number)
      const ot = 1 - teamOf(v),
        alive = teamAlive(ot);
      endRound(
        alive ? ot : null,
        G.teamSize === 2 && B.cars.length > 2
          ? `${v.name} was the last one standing on that team.`
          : `${v.name}'s cockpit was destroyed.`
      );
    } else {
      B.seq = 'respawn';
      B.seqT = 0;
    }
  }
}
function updateCam(rdt) {
  const v = myCar();
  if (!v) return;
  if (B.ow && B.seq === 'play' && !v.dead) owCam(v);
  else if (B.seq === 'in' || B.seq === 'out') {
    cam.tx = v.x;
    cam.ty = v.y;
    cam.tz = 1.8;
  } else if (B.seq === 'death') {
    const d = B.cars[B.deadIdx] || v;
    cam.tx = d.x;
    cam.ty = d.y;
    cam.tz = 2;
  } else if (B.seq !== 'respawn') {
    const al = B.cars.filter(c => !c.dead);
    if (al.length >= 2) {
      const m = v.dead ? al[0] : v,
        e = al.find(c => c !== m);
      const dx = Math.abs(m.x - e.x),
        dy = Math.abs(m.y - e.y);
      const wMe = 0.6; // keep both cars in view
      cam.tx = m.x * wMe + e.x * (1 - wMe);
      cam.ty = m.y * wMe + e.y * (1 - wMe);
      cam.tz = clamp(
        Math.min(view.worldW / (view.sc * (dx / 0.8 + 520)), view.worldH / (view.sc * (dy / 0.8 + 400))),
        1,
        1.6
      );
    } else {
      const f = al[0] || v;
      cam.tx = f.x;
      cam.ty = f.y;
      cam.tz = G.phase === 'wait' ? 1.3 : 1.15;
    }
  }
  // trailer capture: a scripted camera (B.cinema.cam returns where to look)
  if (B.cinema && B.cinema.cam) {
    const o = B.cinema.cam(B, cam, rdt);
    if (o) {
      cam.tx = o.x;
      cam.ty = o.y;
      cam.tz = o.z;
      if (o.snap) ((cam.x = o.x), (cam.y = o.y), (cam.z = o.z));
    }
  }
  // keep the camera inside the arena
  const k = 1 - Math.exp(-4 * rdt);
  cam.z += (cam.tz - cam.z) * k;
  const s = view.sc * cam.z,
    hw = view.worldW / (2 * s),
    hh = view.worldH / (2 * s);
  // the camera may peek a little past the walls so the crowd in the stands is visible near the edges
  const pk = B.demo ? 0 : STAND * 0.75,
    cx = hw * 2 >= AW + pk * 2 ? AW / 2 : clamp(cam.tx, hw - pk, AW - hw + pk),
    cy = hh * 2 >= AH + pk * 2 ? AH / 2 : clamp(cam.ty, hh - pk, AH - hh + pk);
  // behind the hangar menu the fight sits in the open top left, above your car and left of the panels
  const hang = B.demo && hangarOn(),
    sx = hang && view.w > 1100 ? (view.w * 0.2) / s : 0,
    sy = hang && view.w > 1100 ? (view.h * 0.1) / s : 0;
  if (hang) {
    // zoom out far enough that both bots fit in the open part of the screen
    const al = B.cars.filter(c => !c.dead);
    const dx = al.length > 1 ? Math.abs(al[0].x - al[1].x) : 0,
      dy = al.length > 1 ? Math.abs(al[0].y - al[1].y) : 0;
    cam.tz = clamp(
      Math.min((view.w * 0.5) / (view.sc * (dx + 260)), (view.h * 0.6) / (view.sc * (dy + 220))),
      0.55,
      1.25
    );
    if (al.length > 1) {
      cam.tx = (al[0].x + al[1].x) / 2;
      cam.ty = (al[0].y + al[1].y) / 2;
    }
  }
  cam.x += (cx + sx - cam.x) * k;
  cam.y += (cy + sy - cam.y) * k;
}
function simulate(dt) {
  for (const v of B.cars) {
    const i =
      v.ctrl === 'local'
        ? G.owGarage
          ? ZERO_IN
          : readLocal()
        : v.ctrl === 'local2'
          ? readPad2(v)
          : v.ctrl === 'bot'
            ? botThink(v, dt)
            : v.ctrl === 'raider'
              ? raiderThink(v, dt)
              : v.ctrl === 'convoy'
                ? convoyThink(v, dt)
                : v.ctrl === 'remote'
                  ? takeRemote()
                  : ZERO_IN;
    applyInput(v, i);
  }
  for (const v of B.cars) {
    if (v.dead) continue;
    v.jumpCd -= dt;
    v.cmCd -= dt;
    v.blinkCd -= dt;
    v.hornCd -= dt;
    if (v.spawnT > 0) v.spawnT -= dt;
    if (v.buff && (v.buff.t -= dt) <= 0) v.buff = null;
    // floating damage numbers over cars, batched so they stay readable
    v.accT = (v.accT || 0) - dt;
    if (v.accT <= 0 && v.acc >= 1) {
      const n = {
        x: v.x + rnd(-12, 12),
        y: v.y - v.rad - 10,
        v: Math.round(v.acc),
        life: 0.9,
        col: v.acc >= 60 ? '#ff4d3a' : '#ffb07a'
      };
      B.nums.push(n);
      if (B.rec) B.ev.push(['n', n.x | 0, n.y | 0, n.v, n.col]);
      v.acc = 0;
      v.accT = 0.35;
    }
    if (v.flip > 0) {
      v.flip -= dt;
      v.flipAnim = Math.min(1, v.flipAnim + dt * 4);
      if (v.flip <= 0) {
        v.flipAnim = 0;
        txt(v.x, v.y - 36, 'BACK ON WHEELS', '#5cc38f', 0.8);
      }
    }
    planTick(v, dt);
    stepJoints(v, dt);
    drive(v, dt);
    tickBoost(v, dt);
    collideStatic(v);
    collideObjs(v);
    weapons(v, dt);
    ballStep(v, dt);
    tetherStep(v, dt);
    for (let i = v.stuck.length - 1; i >= 0; i--)
      if (v.stuck[i].hp <= 0) {
        const s = v.stuck[i],
          [x, y] = lpos(v, s.gx, s.gy);
        spark(x, y, 6);
        v.stuck.splice(i, 1);
        recalc(v);
      }
    stepCarHazards(v, dt);
  }
  for (let i = 0; i < B.cars.length; i++) for (let j = i + 1; j < B.cars.length; j++) collideCars(B.cars[i], B.cars[j]);
  for (const p of B.pk) p.cd = Math.max(0, p.cd - dt);
  for (const d of B.decoys) {
    d.life -= dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= Math.exp(-0.6 * dt);
    d.vy *= Math.exp(-0.6 * dt);
    d.x = clamp(d.x, WM + 20, AW - WM - 20);
    d.y = clamp(d.y, WM + 20, AH - WM - 20);
  }
  B.decoys = B.decoys.filter(d => d.life > 0);
  for (const c of B.clouds) c.life -= dt;
  B.clouds = B.clouds.filter(c => c.life > 0);
  stepObjs(dt);
  stepShots(dt);
  if ((G.phase === 'battle' || B.demo) && B.seq === 'play') {
    B.t -= dt;
    stepSpecial(dt);
    if (B.seq !== 'play') return;
    if (B.special === 'sumo') {
      // Sumo Ring: the ring is there from the first second and closes over the whole round
      const R0 = 840;
      if (!B.ring) B.ring = { r: R0 };
      B.ring.r = 210 + (R0 - 210) * clamp((B.t - 15) / 70, 0, 1);
    } else if (B.t < 30 && !B.noRing) {
      const R0 = Math.hypot(AW, AH) / 2;
      if (!B.ring) {
        B.ring = { r: R0 };
        txt(AW / 2, AH / 2 - 40, 'SUDDEN DEATH', '#ff8a6a', 2.2);
        sfx('alarm');
      }
      B.ring.r = 230 + (R0 - 230) * clamp(B.t / 30, 0, 1);
    }
    if (B.t <= 0) {
      const sp = specialTimeout();
      if (sp) return endRound(sp[0], sp[1]);
      // team integrity: the average of each team's cars (a wrecked car counts as zero)
      const teamInt = t => {
          const cs = B.cars.filter(c => teamOf(c) === t);
          return cs.reduce((s, c) => s + (c.dead ? 0 : integrity(c)), 0) / (cs.length || 1);
        },
        ia = teamInt(0),
        ib = teamInt(1),
        w = Math.abs(ia - ib) < 0.005 ? null : ia > ib ? 0 : 1;
      endRound(
        w,
        w == null
          ? ia > 0.99 && ib > 0.99
            ? 'Time ran out and neither car took real damage. Nobody scores.'
            : 'Time ran out with both cars equally battered.'
          : `Time! ${B.cars.length > 2 ? `${B.cars[w].name}'s team` : B.cars[w].name} had more car left (${Math.round(Math.max(ia, ib) * 100)}% vs ${Math.round(Math.min(ia, ib) * 100)}%).`
      );
    }
  }
}
function clientStep(dt) {
  B.lag = (B.lag || 0) + dt;
  const k = 1 - Math.exp(-14 * dt);
  for (const v of B.cars) {
    if (v.tx === undefined) continue;
    v.tx += v.vx * dt;
    v.ty += v.vy * dt;
    v.tA += v.w * dt;
    v.x += (v.tx - v.x) * k;
    v.y += (v.ty - v.y) * k;
    v.a += wrap(v.tA - v.a) * k;
    for (const I of v.insts) {
      I.hitT -= dt;
      I.punch -= dt;
    }
    if (v.flip > 0) v.flipAnim = Math.min(1, v.flipAnim + dt * 4);
  }
  for (const o of B.objs) {
    if (o.tx === undefined) continue;
    o.x += (o.tx - o.x) * k;
    o.y += (o.ty - o.y) * k;
    o.a += wrap(o.tA - o.a) * k;
    o.hitT -= dt;
  }
  for (const s of B.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.kind === 'bounce' || s.kind === 'junk') s.ang = (s.ang || 0) + dt * 12;
  }
  for (const l of B.lobs) l.t = Math.min(l.T, l.t + dt);
  for (const c of B.clouds) c.life -= dt;
  for (const b of B.bombs) b.t -= dt;
  if (Net.conn && !B.replay) Net.tickClient();
}
function stepFx(dt) {
  // in-place compaction: no splicing in the middle of a long list
  const L = B.fx;
  let n = 0;
  for (let i = 0; i < L.length; i++) {
    const f = L[i];
    f.life -= dt;
    if (f.life <= 0) continue;
    if (f.vx !== undefined) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const kk = f.k === 'smoke' ? 1.2 : f.k === 'coin' || f.k === 'water' ? 0 : f.k === 'conf' ? 1.6 : 4;
      f.vx *= Math.exp(-kk * dt);
      f.vy *= Math.exp(-kk * dt);
      if (f.k === 'coin' || f.k === 'water') f.vy += 500 * dt;
      else if (f.k === 'conf') f.vy += 240 * dt;
    }
    if (f.k === 'text') f.y -= 30 * dt;
    L[n++] = f;
  }
  L.length = n;
  const cap = SETTINGS.perf ? 450 : 1500;
  if (L.length > cap) L.splice(0, L.length - cap);
  for (const h of B.hitDirs) h.t -= dt;
  if (B.hitDirs.length) B.hitDirs = B.hitDirs.filter(h => h.t > 0);
  stepBubbles(dt);
  for (const h of B.hitMarks) h.t -= dt;
  if (B.hitMarks.length) B.hitMarks = B.hitMarks.filter(h => h.t > 0);
  for (let i = B.debris.length - 1; i >= 0; i--) {
    const d = B.debris[i];
    d.life -= dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.a += d.w * dt;
    d.vx *= Math.exp(-1.6 * dt);
    d.vy *= Math.exp(-1.6 * dt);
    d.w *= Math.exp(-1.5 * dt);
    d.vz -= (B.grav || 950) * dt;
    d.z += d.vz * dt;
    if (d.z < 0) {
      d.z = 0;
      d.vz = -d.vz * 0.3;
    }
    if (d.life <= 0) B.debris.splice(i, 1);
  }
  for (let i = B.nums.length - 1; i >= 0; i--) {
    const n = B.nums[i];
    n.life -= dt;
    n.y -= 30 * dt;
    if (n.life <= 0) B.nums.splice(i, 1);
  }
}
