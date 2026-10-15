// Driving, collisions (walls, junk, car vs car), objects, hazards and pickups.
/* =================== PHYSICS =================== */
function zoneAt(x, y, kind) {
  return B.zones.find(z => z.kind === kind && inZone(x, y, z));
}
const SF_CACHE = new WeakMap();
const SURF_MARK = {
  ice: 'rgba(140,170,190,.08)',
  snow: 'rgba(150,170,195,.16)',
  sand: 'rgba(140,105,55,.13)',
  mud: 'rgba(35,24,10,.16)',
  grass: 'rgba(40,60,20,.1)',
  carpet: 'rgba(60,30,70,.07)'
};
function drive(v, dt) {
  const C = v.c,
    s = Math.sin(v.a),
    c = Math.cos(v.a),
    fx_ = s,
    fy = -c,
    rx = c,
    ry = s;
  // the floor: each tyre class gets its own speed and grip on this surface (see data/surfaces.js)
  const S = surfaceAt(v) || SURFACES.asphalt;
  let sf = SF_CACHE.get(C);
  if (!sf || sf.s !== S) SF_CACHE.set(C, (sf = { s: S, ...surfaceFit(C.tyreW, S) }));
  const bg = B.ow ? owThemeAt(v.x, v.y).grip : B.grip,
    ground = (v.iceT > B.time ? Math.min(bg, 0.3) : bg) * sf.grip; // ice patches
  const grip = C.hoverMode ? 1 : C.studs ? Math.max(ground, 0.9) : Math.min(1.2, ground);
  let trac = C.trac * grip,
    latF = C.latF * grip;
  const air = v.z > 0,
    flipped = v.flip > 0;
  if (v.frozen > 0) {
    v.frozen -= dt;
    trac *= 0.35;
  }
  if (!C.hoverMode && !air) {
    const slick = k => {
      const z = zoneAt(v.x, v.y, k);
      return z && !(z.own === v.idx && v.aura.ownSlick);
    };
    if (slick('oil')) {
      trac *= C.studs ? 0.8 : 0.3 + 0.35 * sf.off;
      latF *= C.studs ? 0.8 : 0.25 + 0.35 * sf.off;
    }
    if (slick('glue')) {
      trac *= 0.35;
      latF *= 1.5;
    }
  }
  let fv = v.vx * fx_ + v.vy * fy,
    lv = v.vx * rx + v.vy * ry;
  const chute = v.has.parachute && v.throttle < 0 && fv > 140;
  if (chute) {
    fv *= Math.exp(-3.5 * dt);
    if (Math.random() < dt * 10)
      fx({ k: 'smoke', x: v.x, y: v.y, vx: -v.vx * 0.2, vy: -v.vy * 0.2, life: 0.4, max: 0.5, r: 5 });
  }
  const rush = buffOf(v, 'speed') ? 1.5 : 1;
  if (!air && !flipped && !v.anchored && !chute) {
    const acc = C.accel * (trac / (C.trac || 1)) * rush * (C.hoverMode ? 1 : sf.spd);
    fv += v.throttle * acc * dt * (v.throttle < 0 ? 0.65 : 1);
    if (C.strafe) lv += v.strafe * acc * 0.8 * dt;
    const cap =
      C.topCap *
      (C.hoverMode ? 1 : sf.spd) *
      (rush > 1 ? 1.35 : 1) *
      (zoneAt(v.x, v.y, 'glue') && !C.hoverMode ? 0.4 : 1);
    if (Math.abs(fv) > cap) fv *= Math.exp(-4 * dt);
  }
  if (!air) {
    fv *= Math.exp(-(flipped ? 3 : 1.2 * Math.max(0.4, B.grip)) * dt);
    lv *= Math.exp(-(flipped ? 3 : latF) * dt);
  }
  v.vx = fx_ * fv + rx * lv;
  v.vy = fy * fv + ry * lv;
  if (v.anchored) {
    v.vx *= Math.exp(-14 * dt);
    v.vy *= Math.exp(-14 * dt);
    v.w *= Math.exp(-14 * dt);
  } else if (!air && !flipped) {
    const tw = v.steer * C.turnR * (v.frozen > 0 ? 0.5 : 1);
    v.w += (tw - v.w) * Math.min(1, 6 * dt * Math.max(0.3, trac));
  } else if (!air) v.w *= Math.exp(-4 * dt);
  if (!air) {
    gimmickCar(v, dt);
    const pad = zoneAt(v.x, v.y, 'pad');
    if (pad) {
      v.vx += Math.cos(pad.ang) * 1100 * dt;
      v.vy += Math.sin(pad.ang) * 1100 * dt;
    }
    const rp = zoneAt(v.x, v.y, 'ramp');
    if (rp) {
      const along = v.vx * Math.cos(rp.ang) + v.vy * Math.sin(rp.ang);
      if (along > 110) {
        v.vz = along * 0.85;
        v.z = 1;
        txt(v.x, v.y - 30, 'AIR!', '#ece8df', 0.8);
        sfx('whoosh', v.x, v.y);
      }
    }
    if (zoneAt(v.x, v.y, 'tramp')) {
      v.vz = 520;
      v.z = 1;
      txt(v.x, v.y - 30, 'BOING', '#ff8fc7', 0.8);
      sfx('boing', v.x, v.y);
    }
    if (zoneAt(v.x, v.y, 'geyser')) {
      v.vz = 380;
      v.z = 1;
      v.w += rnd(-2, 2);
    }
  }
  if (v.z > 0) {
    v.vz -= (B.grav || 950) * dt;
    v.z += v.vz * dt;
    if (v.z <= 0) {
      v.z = 0;
      land(v, -v.vz);
      v.vz = 0;
    }
  }
  v.a += v.w * dt;
  v.x += v.vx * dt;
  v.y += v.vy * dt;
  const sp = Math.hypot(v.vx, v.vy);
  v.top = Math.max(v.top || 0, sp);
  if (sp > 35 && gx && !C.hoverMode && !air && !flipped) {
    const S = surfaceAt(v) || SURFACES.asphalt;
    gx.fillStyle = SURF_MARK[B.kind === 'wait' ? '' : S.id] || 'rgba(28,20,12,.07)';
    // loose floors kick up a spray behind the tyres
    if (S.dust && B.kind !== 'wait' && Math.random() < dt * S.dust * Math.min(1, sp / 220) * 9) {
      const I = v.insts.find(I => I.alive && I.m.drive);
      if (I) {
        const [px, py] = ipos(v, I);
        fx({
          k: 'smoke',
          x: px,
          y: py,
          vx: -v.vx * 0.15 + rnd(-20, 20),
          vy: -v.vy * 0.15 + rnd(-20, 20),
          life: 0.5,
          max: 0.5,
          r: rnd(4, 7),
          col: S.col
        });
      }
    }
    for (const I of v.insts)
      if (I.alive && I.m.drive)
        for (const b of I.cells) {
          const [px, py] = bpos(v, b);
          gx.fillRect(px - 3, py - 3, 6, 6);
        }
  }
  if (!C.hoverMode && !air)
    for (const z of B.zones)
      if (z.kind === 'spikes')
        for (const I of v.insts) {
          if (!I.alive || !I.m.drive || I.m.spikeproof) continue;
          const [px, py] = ipos(v, I);
          if (inRect(px, py, z)) {
            hurtInst(v, I, 35 * dt, 'ram');
            if (Math.random() < 0.2) spark(px, py, 1);
          }
        }
  if (CT(v, 'burntrail') && sp > 210 && !air && v.has.flamer && Math.random() < dt * 14)
    B.zones.push({
      kind: 'fire',
      x: v.x - fx_ * S * 2,
      y: v.y - fy * S * 2,
      r: 22,
      life: 2.5,
      dps: 18,
      own: v.idx
    });
}
function land(v, speed) {
  for (let i = 0; i < 10; i++)
    fx({
      k: 'smoke',
      x: v.x + rnd(-v.rad, v.rad) * 0.6,
      y: v.y + rnd(-v.rad, v.rad) * 0.6,
      vx: rnd(-60, 60),
      vy: rnd(-60, 60),
      life: 0.8,
      max: 1,
      r: rnd(5, 9)
    });
  B.shake = Math.max(B.shake, speed / 120);
  sfx('thud', v.x, v.y);
  const chute = !!v.has.parachute,
    hard = speed * (CT(v, 'moonboots') ? 1.3 : 1) * (chute ? 0.35 : 1);
  if (hard > 380 && !v.aura.softLand)
    for (const I of v.insts) if (I.alive && I.m.drive) hurtInst(v, I, (hard - 380) * 0.08, 'ram');
  if (!chute && (Math.abs(v.w) > 2.4 || hard > 720) && !v.c.flipRes && Math.random() < 0.65) flipCar(v);
}
const WALLS = () => [
  { x: -1e4, y: -1e4, w: 1e4 + WM, h: 2e4 + AH },
  { x: AW - WM, y: -1e4, w: 1e4, h: 2e4 + AH },
  { x: -1e4, y: -1e4, w: 2e4 + AW, h: 1e4 + WM },
  { x: -1e4, y: AH - WM, w: 2e4 + AW, h: 1e4 },
  ...B.st
];
function collideStatic(v) {
  if (v.z > 60) return;
  const h = S * 0.5,
    walls = WALLS();
  for (let pass = 0; pass < 2; pass++) {
    let best = 0,
      hitB = null,
      nx = 0,
      ny = 0;
    for (const b of v.blocks) {
      if (!b.inst.alive) continue;
      const [x, y] = bpos(v, b);
      for (const s of walls) {
        const cx = clamp(x, s.x, s.x + s.w),
          cy = clamp(y, s.y, s.y + s.h),
          dx = x - cx,
          dy = y - cy,
          d = Math.hypot(dx, dy);
        if (d >= h) continue;
        let ux, uy;
        if (d > 1e-3) {
          ux = dx / d;
          uy = dy / d;
        } else {
          const l = x - s.x,
            r = s.x + s.w - x,
            t = y - s.y,
            bt = s.y + s.h - y,
            mn = Math.min(l, r, t, bt);
          ux = mn === l ? -1 : mn === r ? 1 : 0;
          uy = mn === t ? -1 : mn === bt ? 1 : 0;
        }
        if (h - d > best) {
          best = h - d;
          nx = ux;
          ny = uy;
          hitB = b;
        }
      }
    }
    if (!hitB) break;
    v.x += nx * best;
    v.y += ny * best;
    const vn = v.vx * nx + v.vy * ny;
    if (vn < 0) {
      const m = hitB.inst.m,
        e = m.bumper || m.spring ? 1.1 : m.bouncy ? 0.8 : 0.25;
      v.vx -= (1 + e) * vn * nx;
      v.vy -= (1 + e) * vn * ny;
      const [bx, by] = bpos(v, hitB);
      v.w += (((bx - v.x) * (-vn * ny) - (by - v.y) * (-vn * nx)) / v.I) * v.c.mass * 0.4;
      if (-vn > 170) {
        hurtInst(v, hitB.inst, (-vn - 170) * 0.12, 'ram');
        spark(bx, by, 6);
        sfx('clang', bx, by);
      }
    }
  }
}
function collideObjs(v) {
  if (v.dead) return;
  const h = S * 0.5,
    skipLow = v.c.hoverMode || v.c.monster;
  const pos = v.blocks.filter(b => b.inst.alive).map(b => [b, ...bpos(v, b)]);
  for (const s of v.stuck) {
    const [x, y] = lpos(v, s.gx, s.gy);
    pos.push([{ inst: { alive: true, m: {}, id: 'stuck', cells: [] }, stuck: s }, x, y]);
  }
  for (const o of B.objs) {
    if (o.heldBy === v.idx || (buffOf(v, 'ghost') && o.junk) || o.dead || o.z > 20) continue;
    if (v.z > o.h) continue;
    if (skipLow && o.h <= 12) {
      if (v.c.monster && !v.c.hoverMode && Math.hypot(o.x - v.x, o.y - v.y) < v.rad && !(o.crushCd > B.time)) {
        o.crushCd = B.time + 0.3;
        dmgObj(o, 25, 'ram', v.idx);
      }
      continue;
    }
    if (Math.hypot(o.x - v.x, o.y - v.y) > v.rad + o.r + 4) continue;
    let best = 0,
      bb = null,
      nx = 0,
      ny = 0;
    for (const p of pos) {
      const dx = o.x - p[1],
        dy = o.y - p[2],
        d = Math.hypot(dx, dy),
        ov = h + o.r - d;
      if (ov > best) {
        best = ov;
        bb = p;
        nx = dx / (d || 1);
        ny = dy / (d || 1);
      }
    }
    if (!bb) continue;
    const I = bb[0].inst,
      m = I.m,
      pushing = m.pusher && !I.blocked;
    const M = v.c.mass * (v.anchored ? 10 : 1),
      om = o.fixed ? 1e6 : o.m * (pushing ? 0.2 : 1),
      tot = M + om;
    v.x -= (nx * best * om) / tot;
    v.y -= (ny * best * om) / tot;
    if (!o.fixed) {
      o.x += (nx * best * M) / tot;
      o.y += (ny * best * M) / tot;
    }
    const rv = (o.vx - v.vx) * nx + (o.vy - v.vy) * ny;
    if (rv < 0) {
      const e = m.spring ? 1.7 : m.bumper || m.bouncy ? 1.1 : o.bounce;
      const j = (-(1 + e) * rv) / (1 / M + 1 / om);
      impulse(v, -j * nx, -j * ny, bb[1], bb[2]);
      if (!o.fixed) {
        o.vx += (j / om) * nx;
        o.vy += (j / om) * ny;
        o.w += rnd(-3, 3) * (o.d.spinny ? 6 : 1);
        if (m.spring) {
          o.vx += (nx * 700) / Math.max(1, o.m);
          o.vy += (ny * 700) / Math.max(1, o.m);
        }
      }
      const sp = -rv;
      if (!(bb[0].cc > B.time) && (sp > 50 || m.thorns || o.d.thorny)) {
        bb[0].cc = B.time + 0.2;
        let mult = m.ram || 1;
        if (m.lance && !I.blocked) {
          const tip = I.cells[I.cells.length - 1];
          const fa = faceAng(v, I);
          if (bb[0] === tip && Math.cos(fa) * nx + Math.sin(fa) * ny > 0.8 && sp > 120)
            mult = m.lance * I.mount * (CT(v, 'tungsten') ? 1.5 : 1);
        }
        if (sp > 50)
          dmgObj(o, sp * 0.07 * mult * Math.min(1, (M / tot) * 2) * (1 + (v.aura.dmg_melee || 0)), 'ram', v.idx);
        if (m.thorns) dmgObj(o, 8 + sp * 0.08, 'melee', v.idx);
        if (o.d.thorny && !bb[0].stuck) hurtInst(v, I, 10, 'melee');
        if (bb[0].stuck) bb[0].stuck.hp -= sp * 0.05;
        else if (!pushing && sp > 50) hurtInst(v, I, ((sp * 0.015 * Math.min(om, 60)) / tot) * 6, 'ram');
        if (o.kind === 'duck' || o.kind === 'goldduck' || o.kind === 'chicken') {
          txt(o.x, o.y - 20, o.kind === 'chicken' ? 'SQUEAK' : 'QUACK', '#ffe27a', 0.7);
          sfx('squeak', o.x, o.y);
        }
        if (sp > 140) sfx('clang', o.x, o.y);
        spark((bb[1] + o.x) / 2, (bb[2] + o.y) / 2, mult > 1 ? 14 : 3);
      }
    }
  }
}
/* Car vs car: block circles, deepest contact resolves the push; every contact can deal ram damage */
function collideCars(U, V) {
  if (U.dead || V.dead || Math.abs(U.z - V.z) > 30) return;
  const dx = V.x - U.x,
    dy = V.y - U.y;
  if (dx * dx + dy * dy > (U.rad + V.rad) ** 2) return;
  const pu = U.blocks.filter(b => b.inst.alive).map(b => [b, ...bpos(U, b)]),
    pv = V.blocks.filter(b => b.inst.alive).map(b => [b, ...bpos(V, b)]);
  const R = S * 0.95;
  let best = null,
    bo = 0;
  for (const a of pu)
    for (const b of pv) {
      const ex = b[1] - a[1],
        ey = b[2] - a[2],
        d2 = ex * ex + ey * ey;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 0.01,
        o = R - d,
        nx = ex / d,
        ny = ey / d;
      if (o > bo) {
        bo = o;
        best = { nx, ny, a, b };
      }
      const sp = -((V.vx - U.vx) * nx + (V.vy - U.vy) * ny);
      {
        const wa = a[0].inst.m.wedge && !a[0].inst.blocked,
          wb = b[0].inst.m.wedge && !b[0].inst.blocked;
        if ((wa || wb) && sp > 70) {
          const Y = wa ? V : U;
          if (Y.z === 0 && !Y.anchored) {
            Y.vz = Math.min(460, sp * 1.3);
            Y.z = 1;
            Y.w += rnd(-2, 2);
            txt(Y.x, Y.y - Y.rad - 12, 'LAUNCHED', '#f2b705', 0.9);
            sfx('spring', Y.x, Y.y);
          }
        }
      }
      if (!(a[0].cc > B.time) && !(b[0].cc > B.time) && (sp > 45 || a[0].inst.m.thorns || b[0].inst.m.thorns)) {
        a[0].cc = b[0].cc = B.time + 0.25;
        const tot = U.mass + V.mass || 1;
        const hit = (X, Y, xa, xb, dirx, diry) => {
          if (teamOf(X) === teamOf(Y)) return; // teammates bump, they do not hurt each other
          const ma = xa[0].inst.m;
          let mult = ma.ram || 1;
          if (ma.lance && !xa[0].inst.blocked) {
            const I = xa[0].inst,
              tip = I.cells[I.cells.length - 1],
              fa = faceAng(X, I);
            if (xa[0] === tip && Math.cos(fa) * dirx + Math.sin(fa) * diry > 0.8 && sp > 120)
              mult = ma.lance * I.mount * (CT(X, 'tungsten') ? 1.5 : 1);
          }
          let dmg = Math.max(0, sp - 45) * 0.05 * mult * (X.c.mass / (X.c.mass + Y.c.mass)) * 2;
          if (ma.thorns) dmg += 8;
          dmg *= 1 + (X.aura.dmg_melee || 0);
          B.hitSrc = ma.ram || ma.lance || ma.thorns || ma.wedge ? xa[0].inst.id : 'crash';
          if (dmg > 0) hurtInst(Y, xb[0].inst, dmg, 'ram', xa[1], xa[2], dirx, diry, X.idx);
          B.hitSrc = null;
        };
        hit(U, V, a, b, nx, ny);
        hit(V, U, b, a, -nx, -ny);
        const mx = (a[1] + b[1]) / 2,
          my = (a[2] + b[2]) / 2;
        spark(mx, my, sp > 140 ? 14 : 6);
        if (sp > 120) {
          B.shake = Math.max(B.shake, 5);
          sfx('crash', mx, my);
          if (sp > 220) B.hitstop = Math.max(B.hitstop || 0, 0.05);
        }
      }
    }
  if (best) {
    const { nx, ny, a, b } = best,
      ma = U.c.mass * (U.anchored ? 10 : 1),
      mb = V.c.mass * (V.anchored ? 10 : 1),
      tot = ma + mb;
    U.x -= (nx * bo * mb) / tot;
    U.y -= (ny * bo * mb) / tot;
    V.x += (nx * bo * ma) / tot;
    V.y += (ny * bo * ma) / tot;
    const rv = (V.vx - U.vx) * nx + (V.vy - U.vy) * ny;
    if (rv < 0) {
      const bouncy = a[0].inst.m.bumper || b[0].inst.m.bumper || a[0].inst.m.spring || b[0].inst.m.spring,
        e = bouncy ? 1.1 : 0.3,
        j = (-(1 + e) * rv) / (1 / ma + 1 / mb);
      impulse(U, -j * nx, -j * ny, a[1], a[2]);
      impulse(V, j * nx, j * ny, b[1], b[2]);
    }
  }
}
function stepObjs(dt) {
  const L = B.objs;
  for (const o of L) {
    if (o.dead) continue;
    if (o.fixed) {
      o.hitT -= dt;
      tickObj(o, dt);
      continue;
    }
    if (o.d.motor && o.z === 0 && o.frozen <= 0) {
      o.a += rnd(-1, 1) * dt * 2;
      o.vx += Math.cos(o.a) * 120 * dt;
      o.vy += Math.sin(o.a) * 120 * dt;
    }
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.a += o.w * dt;
    if (o.z > 0 || o.vz > 0) {
      o.vz -= (B.grav || 950) * dt;
      o.z += o.vz * dt;
      if (o.z <= 0) {
        o.z = 0;
        if (o.vz < -250) {
          dmgObj(o, (-o.vz - 250) * 0.12 * Math.pow(o.m, 0.3), 'ram');
          spark(o.x, o.y, 4);
        }
        o.vz = 0;
      }
    }
    if (o.z === 0) {
      const fr =
        (o.frozen > 0 ? 12 : o.heavy ? 7 : zoneAt(o.x, o.y, 'oil') ? 0.6 : zoneAt(o.x, o.y, 'glue') ? 8 : 2.6) *
        (o.frozen > 0 || o.heavy ? 1 : B.grip);
      const f = Math.exp(-fr * dt);
      o.vx *= f;
      o.vy *= f;
      o.w *= Math.exp(-(o.d.spinny ? 0.6 : 3) * dt);
      gimmickObj(o, dt);
      const rp = zoneAt(o.x, o.y, 'ramp');
      if (rp) {
        const along = o.vx * Math.cos(rp.ang) + o.vy * Math.sin(rp.ang);
        if (along > 120) {
          o.vz = along * 0.8;
          o.z = 1;
        }
      }
      if (zoneAt(o.x, o.y, 'tramp')) {
        o.vz = 460;
        o.z = 1;
      }
      if (zoneAt(o.x, o.y, 'geyser')) {
        o.vz = 420;
        o.z = 1;
      }
    }
    o.hitT -= dt;
    if (o.x - o.r < WM) {
      o.x = WM + o.r;
      o.vx = Math.abs(o.vx) * o.bounce;
      if (o.d.motor) o.a = rnd(-1, 1);
    }
    if (o.x + o.r > AW - WM) {
      o.x = AW - WM - o.r;
      o.vx = -Math.abs(o.vx) * o.bounce;
      if (o.d.motor) o.a = Math.PI + rnd(-1, 1);
    }
    if (o.y - o.r < WM) {
      o.y = WM + o.r;
      o.vy = Math.abs(o.vy) * o.bounce;
      if (o.d.motor) o.a = Math.PI / 2;
    }
    if (o.y + o.r > AH - WM) {
      o.y = AH - WM - o.r;
      o.vy = -Math.abs(o.vy) * o.bounce;
      if (o.d.motor) o.a = -Math.PI / 2;
    }
    if (o.z < 60)
      for (const s of B.st) {
        const cx = clamp(o.x, s.x, s.x + s.w),
          cy = clamp(o.y, s.y, s.y + s.h),
          dx = o.x - cx,
          dy = o.y - cy,
          d = Math.hypot(dx, dy);
        if (d < o.r && d > 0) {
          const ux = dx / d,
            uy = dy / d;
          o.x += ux * (o.r - d);
          o.y += uy * (o.r - d);
          const vn = o.vx * ux + o.vy * uy;
          if (vn < 0) {
            o.vx -= (1 + o.bounce) * vn * ux;
            o.vy -= (1 + o.bounce) * vn * uy;
            if (-vn > 220) dmgObj(o, (-vn - 220) * 0.05, 'ram');
          }
          if (o.d.motor) o.a += Math.PI * 0.7;
        }
      }
    tickObj(o, dt);
  }
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (a.dead || a.z > 20) continue;
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j];
      if (b.dead || b.z > 20) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy),
        o = a.r + b.r - d;
      if (o > 0 && d > 0) {
        const nx = dx / d,
          ny = dy / d,
          am = a.fixed ? 1e6 : a.m,
          bm = b.fixed ? 1e6 : b.m,
          tot = am + bm;
        if (!a.fixed) {
          a.x -= (nx * o * bm) / tot;
          a.y -= (ny * o * bm) / tot;
        }
        if (!b.fixed) {
          b.x += (nx * o * am) / tot;
          b.y += (ny * o * am) / tot;
        }
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const e = Math.max(a.bounce, b.bounce),
            j_ = (-(1 + e) * rv) / (1 / am + 1 / bm);
          if (!a.fixed) {
            a.vx -= (j_ / am) * nx;
            a.vy -= (j_ / am) * ny;
          }
          if (!b.fixed) {
            b.vx += (j_ / bm) * nx;
            b.vy += (j_ / bm) * ny;
          }
          if (-rv > 250) {
            dmgObj(a, (-rv - 250) * 0.04, 'ram');
            dmgObj(b, (-rv - 250) * 0.04, 'ram');
          }
        }
      }
    }
  }
  if (L.some(o => o.dead)) B.objs = L.filter(o => !o.dead);
}
function tickObj(o, dt) {
  if (o.frozen > 0) o.frozen -= dt;
  if (o.burn > 0) {
    o.burn -= dt;
    dmgObj(o, 10 * dt, 'none');
    if (Math.random() < dt * 12)
      fx({
        k: 'fire',
        x: o.x + rnd(-o.r, o.r) * 0.6,
        y: o.y + rnd(-o.r, o.r) * 0.6,
        vx: rnd(-10, 10),
        vy: rnd(-40, -10),
        life: 0.4,
        max: 0.5,
        r: 4
      });
  }
  for (const z of B.zones) if (z.kind === 'fire' && inZone(o.x, o.y, z)) dmgObj(o, z.dps * dt, 'fire', z.own);
  o.accT -= dt;
  if (o.accT <= 0 && o.acc >= 1) {
    B.nums.push({ x: o.x + rnd(-6, 6), y: o.y - o.r - 6, v: Math.round(o.acc), life: 0.9 });
    if (B.rec) B.ev.push(['n', o.x | 0, (o.y - o.r - 6) | 0, Math.round(o.acc)]);
    o.acc = 0;
    o.accT = 0.3;
  }
  if (o.kind === 'sentry' && B.seq === 'play') sentryAI(o, dt);
}
function stepCarHazards(v, dt) {
  for (const z of B.zones)
    if (z.kind === 'fire' && z.own !== v.idx && inZone(v.x, v.y, z) && !v.c.hoverMode && v.z === 0)
      for (const I of v.insts)
        if (I.alive && I.layer === 'b' && Math.random() < dt * 2)
          hurtInst(v, I, z.dps * 0.5, 'fire', undefined, undefined, undefined, undefined, z.own);
  for (let i = B.zones.length - 1; i >= 0; i--) {
    const z = B.zones[i];
    if (
      ['bead', 'soapbead'].includes(z.kind) &&
      z.own !== v.idx &&
      v.z < 20 &&
      Math.hypot(z.x - v.x, z.y - v.y) < v.rad * 0.5 + z.r
    ) {
      B.zones.splice(i, 1);
      if (z.kind === 'bead') v.frozen = Math.max(v.frozen, 0.7);
      else planZone(v, z.x, z.y, 'oil', 32, 2);
      sfx('squeak', z.x, z.y);
      continue;
    }
    if (
      z.kind === 'banana' &&
      v.z === 0 &&
      !v.c.hoverMode &&
      !(z.own === v.idx && z.life > 23) &&
      Math.hypot(z.x - v.x, z.y - v.y) < v.rad * 0.7 + z.r
    ) {
      B.zones.splice(i, 1);
      v.w += (Math.random() < 0.5 ? -1 : 1) * rnd(6, 9);
      v.vx *= 0.8;
      v.vy *= 0.8;
      txt(v.x, v.y - v.rad - 10, 'WHOOPS', '#f2d03c', 1);
      sfx('squeak', v.x, v.y);
    } else if (
      z.kind === 'mine' &&
      z.own !== v.idx &&
      z.life < 39 &&
      v.z < 20 &&
      Math.hypot(z.x - v.x, z.y - v.y) < v.rad * 0.6 + 30
    ) {
      B.zones.splice(i, 1);
      explode(z.x, z.y, 75, 70, 'expl', z.own);
    }
  }
  const reach = (v.has.coinmag ? 3 : 1) * (1 + (v.reach || 0)),
    fl = v.flair || {};
  for (const p of B.pk || []) {
    if (p.cd > 0) continue;
    if (Math.hypot(p.x - v.x, p.y - v.y) < (v.rad * 0.6 + 22) * reach) {
      if (p.kind === 'gift') {
        p.cd = 1e9;
        crowdGiftTaken(v, p);
        continue;
      }
      p.cd = p.kind === 'power' ? POWER_RESPAWN : 25;
      if (p.kind === 'power') {
        const P = POWERUPS[p.p];
        if (p.p === 'repair') {
          for (const I of v.insts) if (I.alive && I.id !== 'cockpit') I.hp = Math.min(I.max, I.hp + I.max * 0.2);
        } else v.buff = { p: p.p, t: P.time * (1 + (fl.powerK || 0)) };
        v.powers = (v.powers || 0) + 1;
        txt(p.x, p.y - 22, P.name.toUpperCase(), P.col, 1.2);
        fx({ k: 'ring', x: v.x, y: v.y, life: 0.5, max: 0.5, r: 70, col: '255,255,255' });
        sfx('power', p.x, p.y);
        p.p = pick(POWER_IDS);
      } else if (p.kind === 'coins') {
        coinPop(p.x, p.y, Math.round(p.val * (1 + (fl.coinK || 0))), v);
      } else {
        for (const I of v.insts) if (I.alive) I.hp = Math.min(I.max, I.hp + I.max * p.val * (1 + (fl.repairK || 0)));
        txt(p.x, p.y - 20, 'REPAIRED', '#5cc38f', 1);
        sfx('repair', p.x, p.y);
      }
    }
  }
  if (B.ring && !v.dead && Math.hypot(v.x - AW / 2, v.y - AH / 2) > B.ring.r) {
    v.ringT = (v.ringT || 0) + dt;
    if (v.ringT > 0.5) {
      v.ringT = 0;
      const al = v.insts.filter(I => I.alive && I.layer === 'b');
      const I = pick(al);
      if (I) {
        hurtInst(v, I, B.special === 'sumo' ? 40 : 18, 'fire');
        spark(...ipos(v, I), 6, '#ff6a3a');
      }
    }
  }
}
function losClear(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1),
    n = Math.ceil(d / 12);
  for (let i = 1; i < n; i++) {
    const x = x1 + ((x2 - x1) * i) / n,
      y = y1 + ((y2 - y1) * i) / n;
    if (B.st.some(s => inRect(x, y, s))) return false;
  }
  return true;
}
const inSmoke = (x, y) => B.clouds.some(c => Math.hypot(c.x - x, c.y - y) < c.r * 0.85);
function sentryAI(o, dt) {
  o.jam -= dt;
  o.cd -= dt;
  if (o.stun > 0) {
    o.stun -= dt;
    return;
  }
  let tx = null,
    ty = null,
    tvx = 0,
    tvy = 0;
  const dec = B.decoys.find(d => Math.hypot(d.x - o.x, d.y - o.y) < 700);
  const v = B.cars.find(
    c => !c.dead && !inSmoke(c.x, c.y) && Math.hypot(c.x - o.x, c.y - o.y) < 700 && losClear(o.x, o.y, c.x, c.y)
  );
  if (dec) {
    tx = dec.x;
    ty = dec.y;
    tvx = dec.vx;
    tvy = dec.vy;
  } else if (v) {
    tx = v.x;
    ty = v.y;
    tvx = v.vx;
    tvy = v.vy;
  }
  if (tx === null) {
    o.ha += dt * 0.6;
    return;
  }
  const want = Math.atan2(ty - o.y, tx - o.x);
  o.ha += clamp(wrap(want - o.ha), -3 * dt, 3 * dt);
  const spr = o.jam > 0 ? 0.7 : 0.06;
  if (o.burst > 0) {
    o.bt -= dt;
    if (o.bt <= 0) {
      o.burst--;
      o.bt = 0.1;
      const a = o.ha + rnd(-spr, spr);
      B.shots.push({
        own: -1,
        kind: 'bullet',
        x: o.x + Math.cos(a) * 22,
        y: o.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 650,
        vy: Math.sin(a) * 650,
        life: 1.1,
        dmg: 6,
        dt: 'light'
      });
      fx({ k: 'flash', x: o.x + Math.cos(a) * 22, y: o.y + Math.sin(a) * 22, life: 0.06, max: 0.06, r: 6 });
    }
    return;
  }
  if (o.cd > 0 || Math.abs(wrap(want - o.ha)) > 0.25) return;
  o.burst = 5;
  o.bt = 0;
  o.cd = 2.6;
}
