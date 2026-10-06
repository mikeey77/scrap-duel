// Special rounds at runtime: arena changes, rules and win checks, respawns, bot hints and drawing.
const CENTER = { x: AW / 2, y: AH / 2 };
const zoneCenter = z => (z.r !== undefined ? [z.x, z.y] : [z.x + z.w / 2, z.y + z.h / 2]);

/** Host/solo only: adjust a freshly generated arena for the special round (result is serialized to the client). */
function applySpecialField(f, id) {
  if (!id) return f;
  const clearAround = (x, y, r) => {
    f.ob = f.ob.filter(o => Math.hypot(o.x - x, o.y - y) > r + o.r);
    f.zn = f.zn.filter(z => {
      const [zx, zy] = zoneCenter(z);
      return Math.hypot(zx - x, zy - y) > r;
    });
    f.pk = f.pk.filter(p => Math.hypot(p.x - x, p.y - y) > r);
  };
  const free = (x, y, r) =>
    x > WM + r + 20 &&
    x < AW - WM - r - 20 &&
    y > WM + r + 20 &&
    y < AH - WM - r - 20 &&
    f.sp.every(s => Math.hypot(s[0] - x, s[1] - y) > 230) &&
    f.st.every(s => circRectDist(x, y, s) > r + 20) &&
    f.ob.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + 10);
  const mirrored = (k, n) => {
    for (let i = 0, t = 0; i < n && t < 300; t++) {
      const x = rnd(WM + 60, AW / 2 - 60),
        y = rnd(WM + 60, AH - WM - 60);
      if (!free(x, y, 16) || !free(AW - x, y, 16)) continue;
      f.ob.push(mkObj(k, x, y), mkObj(k, AW - x, y));
      i++;
    }
  };
  if (SPECIALS[id].kind === 'objective') {
    f.ob = f.ob.filter(o => o.kind !== 'piano' && o.kind !== 'goldduck');
    clearAround(CENTER.x, CENTER.y, id === 'hill' ? 200 : 160);
  }
  if (id === 'piano') {
    // a clear lane between the goals, so the piano can actually travel
    f.st = f.st.filter(s => !(s.y < CENTER.y + 120 && s.y + s.h > CENTER.y - 120));
    f.ob = f.ob.filter(o => Math.abs(o.y - CENTER.y) > 100 || o.m < 5);
    f.zn = f.zn.filter(
      z => !['spikes', 'oil', 'tramp', 'ramp'].includes(z.kind) || Math.abs(zoneCenter(z)[1] - CENTER.y) > 130
    );
    f.ob.push(mkObj('piano', CENTER.x, CENTER.y, 0));
    f.zn.push(
      { kind: 'goal', team: 0, x: WM, y: CENTER.y - 170, w: 80, h: 340 },
      { kind: 'goal', team: 1, x: AW - WM - 80, y: CENTER.y - 170, w: 80, h: 340 }
    );
  }
  if (id === 'duck') {
    f.ob.push(mkObj('goldduck', CENTER.x, CENTER.y, 0));
    f.sp.forEach((s, i) => f.zn.push({ kind: 'base', team: i, x: s[0] - 90, y: s[1] - 90, w: 180, h: 180 }));
  }
  if (id === 'scrap') {
    f.sp.forEach((sp, i) => f.zn.push({ kind: 'base', team: i, x: sp[0] - 100, y: sp[1] - 100, w: 200, h: 200 }));
    mirrored('crate', 24);
  }
  if (id === 'hill') f.zn.push({ kind: 'hill', x: CENTER.x, y: CENTER.y, r: 150 });
  if (id === 'mayhem') mirrored('barrel', 11);
  if (id === 'lowgrav')
    for (const [x, y] of [
      [AW * 0.3, AH * 0.25],
      [AW * 0.3, AH * 0.75]
    ])
      if (free(x, y, 50))
        f.zn.push(
          { kind: 'tramp', x: x - 40, y: y - 40, w: 80, h: 80 },
          { kind: 'tramp', x: AW - x - 40, y: y - 40, w: 80, h: 80 }
        );
  return f;
}

/** Runs on every machine (host, client, replay) after the arena is built. */
function setupSpecial(id) {
  B.special = id || null;
  B.obj = null;
  const S = id && SPECIALS[id];
  if (!S) return;
  if (S.dmg) B.dmgScale = DMG_SCALE * S.dmg;
  if (S.grav) B.grav = S.grav;
  if (S.kind === 'objective') {
    B.t = S.time;
    B.noRing = true;
    B.obj = { score: [0, 0], carrier: -1, carryDmg: 0, still: 0, owner: -1 };
  }
  for (const o of B.objs)
    if ((id === 'piano' && o.kind === 'piano') || (id === 'duck' && o.kind === 'goldduck')) {
      o.hp = o.max = 1e9;
      o.objective = true;
      if (id === 'piano') o.m = 12; // heavy, but a car can shove it
    }
}
const objectiveObj = kind => B.objs.find(o => o.kind === kind && !o.dead);

/** Host/solo: objective rules, called every play frame. */
function stepSpecial(dt) {
  const O = B.obj;
  if (!O) return;
  if (B.special === 'scrap') {
    for (const v of B.cars) {
      if (v.dead || !(v.cargo > 0)) continue;
      const depot = B.zones.find(z => z.kind === 'base' && z.team === v.idx);
      if (depot && inRect(v.x, v.y, depot)) {
        O.score[v.idx] += v.cargo;
        v.cargo = 0;
        sfx('coin', v.x, v.y);
        if (O.score[v.idx] >= SPECIALS.scrap.target)
          return endRound(v.idx, `${v.name} delivered ${SPECIALS.scrap.target} scrap!`);
      }
    }
    return;
  }
  if (B.special === 'piano') {
    const p = objectiveObj('piano');
    if (!p) return;
    for (const z of B.zones)
      if (z.kind === 'goal' && inRect(p.x, p.y, z)) {
        const w = 1 - z.team;
        boom(p.x, p.y, 1.6);
        sfx('legend');
        return endRound(w, `${B.cars[w].name} shoved the piano into the goal!`);
      }
    O.score = [p.x / AW, 1 - p.x / AW];
    O.still = Math.hypot(p.vx, p.vy) < 6 ? O.still + dt : 0;
    if (O.still > 15) {
      Object.assign(p, { x: CENTER.x, y: CENTER.y, vx: 0, vy: 0, w: 0 });
      O.still = 0;
      txt(p.x, p.y - 40, 'PIANO RESET', '#c58bff', 1.2);
    }
  } else if (B.special === 'duck') {
    if (O.carrier < 0) {
      const d = objectiveObj('goldduck');
      if (!d) return;
      for (const v of B.cars)
        if (
          !v.dead &&
          !(v.spawnT > 0) &&
          v.z < 30 &&
          (nearestBlock(v, d.x, d.y) || { d: 1e9 }).d < S * 0.5 + d.r + 10
        ) {
          O.carrier = v.idx;
          O.carryDmg = 0;
          d.dead = true;
          txt(v.x, v.y - v.rad - 16, 'GOT THE DUCK!', '#ffd257', 1.3);
          sfx('coin', v.x, v.y);
          break;
        }
    } else {
      const v = B.cars[O.carrier];
      if (v.dead || O.carryDmg > 140) return dropDuck(v);
      v.vx *= Math.exp(-0.5 * dt);
      v.vy *= Math.exp(-0.5 * dt);
      const base = B.zones.find(z => z.kind === 'base' && z.team === v.idx);
      if (base && inRect(v.x, v.y, base)) {
        sfx('legend');
        return endRound(v.idx, `${v.name} brought the golden duck home!`);
      }
    }
  } else if (B.special === 'hill') {
    const hz = B.zones.find(z => z.kind === 'hill'),
      inside = B.cars.filter(v => !v.dead && v.z < 40 && Math.hypot(v.x - hz.x, v.y - hz.y) < hz.r);
    O.owner = inside.length === 1 ? inside[0].idx : inside.length > 1 ? -2 : -1;
    if (inside.length === 1) {
      const v = inside[0];
      O.score[v.idx] += dt;
      if (O.score[v.idx] >= SPECIALS.hill.hold)
        return endRound(v.idx, `${v.name} held the hill for ${SPECIALS.hill.hold} seconds!`);
    }
  }
}
function dropDuck(v) {
  const O = B.obj;
  O.carrier = -1;
  const d = mkObj('goldduck', v.x, v.y, 0);
  Object.assign(d, {
    uid: ++B.uidc,
    hp: 1e9,
    max: 1e9,
    objective: true,
    vx: rnd(-220, 220),
    vy: rnd(-220, 220),
    vz: 280,
    z: 1
  });
  B.objs.push(d);
  txt(v.x, v.y - v.rad - 16, 'DROPPED THE DUCK', '#ffd257', 1.2);
  sfx('squeak', v.x, v.y);
}
/** When time runs out in an objective round: the leader on the objective wins, otherwise fall back to car health. */
function specialTimeout() {
  const O = B.obj;
  if (!O) return null;
  if (B.special === 'piano') {
    const p = objectiveObj('piano');
    if (!p || Math.abs(p.x - CENTER.x) < 40) return null;
    const w = p.x > CENTER.x ? 0 : 1;
    return [w, `Time! The piano ended up on ${B.cars[1 - w].name}'s side.`];
  }
  if (B.special === 'duck' && O.carrier >= 0)
    return [O.carrier, `Time! ${B.cars[O.carrier].name} was holding the duck.`];
  if (B.special === 'scrap' && O.score[0] !== O.score[1]) {
    const w = O.score[0] > O.score[1] ? 0 : 1;
    return [w, `Time! ${B.cars[w].name} delivered more scrap.`];
  }
  if (B.special === 'hill' && Math.abs(O.score[0] - O.score[1]) > 0.5) {
    const w = O.score[0] > O.score[1] ? 0 : 1;
    return [w, `Time! ${B.cars[w].name} held the hill longer (${Math.round(O.score[w])} s).`];
  }
  return null;
}
/** Objective rounds: a wrecked car comes back at its spawn after a short pause. */
function respawnCar(i) {
  const old = B.cars[i],
    v = carFromCfg(B.cfg.cars[i], i);
  Object.assign(v, {
    ctrl: old.ctrl,
    gen: (old.gen || 0) + 1,
    dealt: old.dealt,
    dealtBy: old.dealtBy,
    coins: old.coins,
    lost: old.lost,
    spawnT: 2,
    ai: null
  });
  B.cars[i] = v;
  Object.assign(B, { seq: 'play', seqT: 0, ts: 1, banner: null, bigBoom: 0, chain: [] });
  fx({ k: 'ring', x: v.x, y: v.y, life: 0.6, max: 0.6, r: 90, col: '160,240,255' });
  txt(v.x, v.y - v.rad - 14, 'RESPAWNED', '#bff', 1);
  sfx('tele', v.x, v.y);
}

/** Bot hint: where to drive in an objective round (null in normal rounds). */
function objectiveTarget(v, e) {
  const O = B.obj;
  if (!O || B.seq !== 'play') return null;
  if (B.special === 'scrap') {
    if ((v.cargo || 0) >= 3) {
      const z = B.zones.find(z => z.kind === 'base' && z.team === v.idx),
        [x, y] = zoneCenter(z);
      return { x, y };
    }
    const o = nearestObj(v.x, v.y, 3000, null, o => planEligible(o, v));
    return o ? { x: o.x, y: o.y } : null;
  }
  if (B.special === 'piano') {
    const p = objectiveObj('piano'),
      goal = B.zones.find(z => z.kind === 'goal' && z.team === 1 - v.idx);
    if (!p || !goal) return null;
    const [gx, gy] = zoneCenter(goal),
      a = Math.atan2(gy - p.y, gx - p.x),
      off = p.r + v.rad + 14,
      bx = p.x - Math.cos(a) * off,
      by = p.y - Math.sin(a) * off;
    if (Math.hypot(v.x - gx, v.y - gy) < Math.hypot(p.x - gx, p.y - gy) + 10) {
      // wrong side of the piano: swing around it
      const side = Math.sign((v.x - p.x) * Math.sin(a) - (v.y - p.y) * Math.cos(a)) || 1;
      return { x: p.x + Math.sin(a) * side * (off + 50), y: p.y - Math.cos(a) * side * (off + 50) };
    }
    return Math.hypot(v.x - bx, v.y - by) < 55 ? { x: gx, y: gy, push: true } : { x: bx, y: by };
  }
  if (B.special === 'duck') {
    if (O.carrier === v.idx) {
      const base = B.zones.find(z => z.kind === 'base' && z.team === v.idx),
        [x, y] = zoneCenter(base);
      return { x, y };
    }
    if (O.carrier === e.idx) return { x: e.x, y: e.y, fight: true };
    const d = objectiveObj('goldduck');
    return d ? { x: d.x, y: d.y } : null;
  }
  if (B.special === 'hill') {
    const hz = B.zones.find(z => z.kind === 'hill'),
      a = B.time * 0.7 + v.idx * Math.PI;
    return { x: hz.x + Math.cos(a) * 45, y: hz.y + Math.sin(a) * 45, fight: true };
  }
  return null;
}

/* ---------- drawing ---------- */
function drawSpecialZone(c, z) {
  if (z.kind === 'goal' || z.kind === 'base') {
    const car = B.cars[z.team],
      col = car ? car.paint : '#ece8df';
    c.save();
    c.globalAlpha = 0.28 + Math.sin(ANIM * 3) * 0.06;
    c.fillStyle = col;
    c.fillRect(z.x, z.y, z.w, z.h);
    c.globalAlpha = 1;
    c.strokeStyle = col;
    c.lineWidth = 4;
    c.setLineDash([14, 8]);
    c.lineDashOffset = -ANIM * 30;
    c.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
    c.setLineDash([]);
    c.translate(z.x + z.w / 2, z.y + z.h / 2);
    if (z.kind === 'goal') c.rotate(-Math.PI / 2);
    c.font = '700 18px "Chakra Petch", Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.fillText(z.kind === 'goal' ? 'GOAL' : 'HOME', 2, 2);
    c.fillStyle = '#fff';
    c.fillText(z.kind === 'goal' ? 'GOAL' : 'HOME', 0, 0);
    c.restore();
  } else if (z.kind === 'hill') {
    const O = B.obj || {},
      own = O.owner >= 0 ? B.cars[O.owner] : null,
      col = own ? own.paint : O.owner === -2 ? '#ff8a6a' : '#ece8df';
    c.save();
    c.globalAlpha = 0.16 + Math.sin(ANIM * 4) * 0.05;
    circ(c, z.x, z.y, z.r, col);
    c.globalAlpha = 1;
    c.strokeStyle = col;
    c.lineWidth = 5;
    c.setLineDash([18, 10]);
    c.lineDashOffset = ANIM * 40;
    c.beginPath();
    c.arc(z.x, z.y, z.r, 0, 7);
    c.stroke();
    c.setLineDash([]);
    c.font = '700 20px "Chakra Petch", Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.globalAlpha = 0.5;
    c.fillStyle = '#fff';
    c.fillText(O.owner === -2 ? 'CONTESTED' : 'HILL', z.x, z.y);
    c.restore();
  }
}
/** World-space extras: the carried duck and a spawn shield. */
function drawSpecialWorld(c) {
  const O = B.obj;
  if (O && O.carrier >= 0) {
    const v = B.cars[O.carrier];
    if (v && !v.dead) {
      c.save();
      c.translate(v.x, v.y - v.rad * 0.4 - 10 - Math.sin(ANIM * 5) * 3);
      c.globalCompositeOperation = 'lighter';
      glowDisc(c, 34, 'rgba(255,210,87,.6)');
      c.globalCompositeOperation = 'source-over';
      drawJunk(c, 'goldduck', 14);
      c.restore();
    }
  }
  for (const v of B.cars)
    if (v.spawnT > 0 && !v.dead) {
      c.strokeStyle = `rgba(160,240,255,${0.35 + Math.sin(ANIM * 12) * 0.2})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(v.x, v.y, v.rad + 16, 0, 7);
      c.stroke();
    }
}
/** Point an arrow at the objective when it is off screen. */
function objectivePos() {
  const O = B.obj;
  if (!O) return null;
  if (B.special === 'piano') return objectiveObj('piano');
  if (B.special === 'hill') return B.zones.find(z => z.kind === 'hill');
  if (B.special === 'duck') {
    if (O.carrier === B.me) {
      const [x, y] = zoneCenter(B.zones.find(z => z.kind === 'base' && z.team === B.me));
      return { x, y };
    }
    return O.carrier >= 0 ? B.cars[O.carrier] : objectiveObj('goldduck');
  }
  return null;
}
/** HUD line under the timer describing the objective from this player's point of view. */
function drawSpecialHUD(c, W, y) {
  const S = B.special && SPECIALS[B.special];
  if (!S) return y;
  if (B.special === 'scrap') {
    c.fillStyle = '#72d79d';
    c.textAlign = 'center';
    c.font = 'bold 12px sans-serif';
    c.fillText(
      `♻ DELIVER SCRAP · ${B.obj.score[B.me]}/20 · cargo ${myCar().cargo || 0}/${planCapacity(myCar())}`,
      W / 2,
      y
    );
    return y + 24;
  }
  const O = B.obj,
    me = B.me,
    my = B.cars[me],
    op = B.cars[1 - me];
  c.textAlign = 'center';
  c.textBaseline = 'top';
  c.font = '700 13px "Barlow Semi Condensed", sans-serif';
  c.fillStyle = S.col;
  let line = `${S.name.toUpperCase()}`;
  if (B.special === 'piano') line += ' · push it into the other goal';
  else if (B.special === 'duck')
    line +=
      O.carrier === me
        ? ' · YOU HAVE THE DUCK, GET HOME!'
        : O.carrier >= 0
          ? ` · ${op.name} has the duck!`
          : ' · grab the duck';
  else if (B.special === 'hill') line += O.owner === -2 ? ' · contested!' : ' · hold the circle alone';
  else line += ' · ' + S.blurb.split('.')[0].toLowerCase();
  c.fillText(line, W / 2, y);
  y += 18;
  if (B.special === 'hill' || B.special === 'piano') {
    const bw = Math.min(260, W * 0.4),
      x0 = W / 2 - bw / 2;
    const val = i =>
      B.special === 'hill' ? O.score[i] / S.hold : B.special === 'scrap' ? O.score[i] / S.target : O.score[i];
    [me, 1 - me].forEach((i, row) => {
      const car = B.cars[i];
      c.fillStyle = 'rgba(0,0,0,.5)';
      c.fillRect(x0, y + row * 9, bw, 6);
      c.fillStyle = car.paint;
      c.fillRect(x0, y + row * 9, bw * clamp(val(i), 0, 1), 6);
    });
    y += 22;
  }
  return y;
}
