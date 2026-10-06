// Weapons, melee, abilities, countermeasures and projectiles.
/* =================== TARGETING HELPERS =================== */
function toLocal(v, x, y) {
  const dx = x - v.x,
    dy = y - v.y,
    c = Math.cos(-v.a),
    s = Math.sin(-v.a);
  return [dx * c - dy * s + v.comX, dx * s + dy * c + v.comY];
}
function carBlockAt(v, x, y, r) {
  let best = null,
    bd = 1e9;
  for (const b of v.blocks) {
    if (!b.inst.alive) continue;
    const [px, py] = bpos(v, b),
      d = Math.hypot(px - x, py - y);
    if (d < S * 0.55 + r && d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}
function nearestBlock(v, x, y) {
  let best = null,
    bd = 1e9;
  for (const b of v.blocks) {
    if (!b.inst.alive) continue;
    const [px, py] = bpos(v, b),
      d = Math.hypot(px - x, py - y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best ? { b: best, d: bd, p: bpos(v, best) } : null;
}
function hitCarBlock(v, b, dmg, type, sx, sy, dx, dy, att) {
  if (shieldBlock(v, sx, sy, dmg)) return;
  const t = v.tops.get(key(b.gx, b.gy));
  hurtInst(v, t && t.alive && Math.random() < 0.6 ? t : b.inst, dmg, type, sx, sy, dx, dy, att);
}
function rayHit(x, y, a, rng, pierce, own) {
  const dx = Math.cos(a),
    dy = Math.sin(a),
    hits = [];
  let end = rng;
  for (let t = 0; t < rng; t += 6) {
    const px = x + dx * t,
      py = y + dy * t;
    if (px < WM || px > AW - WM || py < WM || py > AH - WM || B.st.some(s => inRect(px, py, s))) {
      end = t;
      break;
    }
    for (const v of B.cars) {
      if (v.idx === own || v.dead || v.z > 40 || hits.some(h => h.car === v)) continue;
      const b = carBlockAt(v, px, py, 0);
      if (b) {
        hits.push({ car: v, b });
        if (!pierce) return { hits, end: t };
      }
    }
    for (const o of B.objs) {
      if (o.dead || o.z > 30 || hits.some(h => h.o === o)) continue;
      if (Math.hypot(o.x - px, o.y - py) < o.r) {
        hits.push({ o });
        if (!pierce) return { hits, end: t };
      }
    }
  }
  return { hits, end };
}
function applyHit(h, dmg, type, sx, sy, a, att) {
  if (h.o) dmgObj(h.o, dmg, type, att);
  else hitCarBlock(h.car, h.b, dmg, type, sx, sy, Math.cos(a || 0), Math.sin(a || 0), att);
}
function nearestObj(x, y, max, ex, filter) {
  let best = null,
    bd = max;
  for (const o of B.objs) {
    if (o.dead || (ex && ex.includes(o)) || (filter && !filter(o))) continue;
    const d = Math.hypot(o.x - x, o.y - y) - o.r;
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}
/* Auto-aimed weapons pick the enemy car (or its decoy) first, then targets, then junk */
function autoTarget(v, x, y, max, ex) {
  for (const e of others(v)) {
    if (e.dead) continue;
    const dec = B.decoys.find(d => d.own === e.idx && Math.hypot(d.x - x, d.y - y) < max);
    if (dec) return { x: dec.x, y: dec.y, vx: dec.vx, vy: dec.vy, decoy: dec };
    if (inSmoke(e.x, e.y)) continue;
    const nb = nearestBlock(e, x, y);
    if (nb && nb.d < max && !(ex && ex.includes(e)))
      return { x: nb.p[0], y: nb.p[1], vx: e.vx, vy: e.vy, car: e, b: nb.b };
  }
  const o = nearestObj(x, y, max, ex, o => o.target) || nearestObj(x, y, max * 0.7, ex);
  return o ? { x: o.x, y: o.y, vx: o.vx, vy: o.vy, o } : null;
}
function damageTarget(t, dmg, type, sx, sy, att) {
  if (t.o) dmgObj(t.o, dmg, type, att);
  else if (t.car) hitCarBlock(t.car, t.b, dmg, type, sx, sy, undefined, undefined, att);
  else if (t.decoy) t.decoy.life = Math.min(t.decoy.life, 0.2);
}
function stuckBlocks(v, x, y) {
  return v.stuck.some(s => {
    const [sx, sy] = lpos(v, s.gx, s.gy);
    return Math.hypot(sx - x, sy - y) < s.r + 4;
  });
}
const small = o => (o.junk || o.kind === 'crate' || o.kind === 'barrel') && o.m <= 8 && o.z === 0;

/* New module mechanics run only on the authoritative simulation. */
const PLAN_DROP = ['frostbead', 'soap', 'foambath'];
const PLAN_ACTION = ['lasso', 'grapple', 'towhook', 'salvageclaw', 'towyoke'];
const PLAN_FIRE = [
  'tinder',
  'popcorn',
  'dragon',
  'slush',
  'spitter',
  'curling',
  'cinderfan',
  'snowblower',
  'conveyor',
  'yoyo'
];
function planCapacity(v) {
  return Math.min(
    24,
    (B.special === 'scrap' ? 5 : 0) +
      (v.has.pouch || 0) * 3 +
      (v.has.basket || 0) * 6 +
      (v.has.hopper || 0) * 12 +
      (v.has.collectfork || 0) * 8 +
      (v.has.bottlecap || 0) * 2 +
      (v.has.spitter || 0) * 3 +
      (v.has.conveyor || 0) * 2 +
      (v.has.patchbench || 0) * 3 +
      (v.has.prizebell || 0) * 2 +
      (v.has.lasso || 0) * 2
  );
}
function planEligible(o, v) {
  return (
    !o.dead &&
    !o.fixed &&
    !o.objective &&
    o.z < 20 &&
    o.kind !== 'part' &&
    (o.junk || o.kind === 'crate') &&
    o.m <= 8 &&
    o.own !== v.idx
  );
}
function planTakeScrap(v, o) {
  if (!planEligible(o, v) || (v.cargo || 0) >= planCapacity(v)) return false;
  const origin = o.scrapOrigin ?? o.uid;
  B.scrapSeen ??= new Set();
  v.cargo = (v.cargo || 0) + 1;
  o.dead = true;
  if (!B.scrapSeen.has(origin)) {
    B.scrapSeen.add(origin);
    const earned = Math.min(2, 40 - (v.scrapEarned || 0));
    v.scrapEarned = (v.scrapEarned || 0) + earned;
    v.coins += earned;
  }
  spark(o.x, o.y, 3, '#72d79d');
  sfx('coin', o.x, o.y);
  return true;
}
function planSpill(v, x, y) {
  const n = v.cargo || 0;
  v.cargo = 0;
  for (let i = 0; i < n; i++) {
    const o = mkObj('crate', x + rnd(-22, 22), y + rnd(-22, 22));
    Object.assign(o, {
      uid: ++B.uidc,
      r: 8,
      m: 0.5,
      hp: 12,
      max: 12,
      own: v.idx,
      scrapOrigin: 'spill-' + v.idx + '-' + i + '-' + B.time
    });
    B.scrapSeen ??= new Set();
    B.scrapSeen.add(o.scrapOrigin);
    B.objs.push(o);
  }
}
function planZone(v, x, y, kind, r = 24, life = 5) {
  const recent = B.zones.find(
    z => z.plan && z.kind === kind && z.own === v.idx && Math.hypot(z.x - x, z.y - y) < r * 0.7 && z.life > life * 0.7
  );
  if (recent) return recent;
  if (B.zones.filter(z => z.plan && z.own === v.idx).length >= 55) return null;
  const z = {
    kind,
    x,
    y,
    r,
    life: life * (1 + (v.aura.slickLife || 0)),
    own: v.idx,
    dps: kind === 'fire' ? 12 : 0,
    plan: true
  };
  B.zones.push(z);
  return z;
}
function planReady(I, time) {
  if ((I.planCd || 0) > B.time) return false;
  I.planCd = B.time + time;
  return true;
}
function planShot(v, I, a, kind, dmg, spd, range, extras = {}) {
  const [x, y] = ipos(v, I),
    cs = I.layer === 'b' ? I.cells : footprint(I.id, I.rot, I.anchorX, I.anchorY).map(([gx, gy]) => ({ gx, gy }));
  const front = cs
    .map(b => bpos(v, b))
    .sort((p, q) => (q[0] - p[0]) * Math.cos(a) + (q[1] - p[1]) * Math.sin(a))[0] || [x, y];
  B.shots.push({
    own: v.idx,
    kind,
    x: front[0] + Math.cos(a) * S * 0.7,
    y: front[1] + Math.sin(a) * S * 0.7,
    vx: Math.cos(a) * spd + v.vx * 0.3,
    vy: Math.sin(a) * spd + v.vy * 0.3,
    life: range / spd,
    max: range / spd,
    dmg,
    dt: 'kin',
    src: I.id,
    ...extras
  });
}
function planContact(v, I, range, fn) {
  for (const e of others(v)) {
    if (e.dead || e.z > 25) continue;
    const hits = new Set();
    const cs = I.layer === 'b' ? I.cells : footprint(I.id, I.rot, I.anchorX, I.anchorY).map(([gx, gy]) => ({ gx, gy }));
    for (const cell of cs) {
      const [x, y] = bpos(v, cell),
        b = carBlockAt(e, x, y, range);
      if (b && !hits.has(b.inst)) {
        hits.add(b.inst);
        fn(e, b, x, y);
      }
    }
  }
}
function planWeapon(v, I, dt) {
  if (!I.m.plan) return false;
  if (I.id === 'glacier') {
    if (I.planCd > B.time || I.blocked) {
      I.charge = 0;
      return true;
    }
    if (!I.charge && !v.fire) return true;
    if (!I.charge) sfx('charge', ...ipos(v, I));
    I.charge = (I.charge || 0) + dt;
    I.punch = 0.15;
    if (I.charge >= 1) {
      const a = faceAng(v, I);
      B.hitSrc = I.id;
      planContact(v, I, S * 1.05, (e, b, x, y) => {
        hitCarBlock(e, b, b.inst.chilledUntil > B.time ? 70 : 45, 'melee', x, y, Math.cos(a), Math.sin(a), v.idx);
        impulse(e, Math.cos(a) * 350, Math.sin(a) * 350, x, y);
      });
      I.charge = 0;
      I.planCd = B.time + 2.5;
      I.punch = 0.3;
      sfx('punch', ...ipos(v, I));
    }
    return true;
  }
  if (I.id === 'dragon') {
    I.planBurst = Math.max(0, (I.planBurst || 0) - dt);
    if (I.planBurst > 0) return false;
    if (!v.fire || I.planCd > B.time) {
      I.charge = 0;
      return true;
    }
    if (!I.charge) sfx('charge', ...ipos(v, I));
    I.charge += dt;
    v.w *= Math.exp(-2 * dt);
    if (I.charge >= 1.2) {
      I.charge = 0;
      I.planBurst = 0.8;
      I.planCd = B.time + 3;
      sfx('flame', ...ipos(v, I));
      return false;
    }
    return true;
  }
  if (I.id === 'popcorn' || I.id === 'curling') {
    if (v.fire && !I.blocked && planReady(I, I.id === 'popcorn' ? 0.75 : 2.8)) {
      const a = faceAng(v, I),
        n = I.id === 'popcorn' ? 3 : 1;
      for (let i = 0; i < n; i++)
        planShot(
          v,
          I,
          a + rnd(-0.26, 0.26),
          'bounce',
          I.id === 'popcorn' ? 8 * (1 + (v.aura.dmg_fire || 0)) : 20,
          I.id === 'popcorn' ? 420 : 240,
          I.id === 'popcorn' ? 380 : 620,
          { bounces: 2, ang: 0, dt: I.id === 'popcorn' ? 'fire' : 'kin', knock: I.id === 'curling' ? 8 : 1 }
        );
      sfx('thump', ...ipos(v, I));
    }
    return true;
  }
  if (I.id === 'spitter') {
    I.W.dmg = 5;
    if (v.fire && !I.blocked && I.cd <= 0 && (v.cargo || 0) > 0) {
      v.cargo--;
      I.W.dmg = 17;
      I.W.knock = 2;
      I.W.spr = rnd(0.1, 0.3);
    }
    return false;
  }
  return false;
}
function planLinkRoot(v, I, l) {
  const [x, y] = ipos(v, I),
    a = faceAng(v, I) + Math.PI / 2;
  return [x + Math.cos(a) * (l.off || 0), y + Math.sin(a) * (l.off || 0)];
}
function planTick(v, dt) {
  v.planLinks ??= [];
  v.cargo ??= 0;
  const capacity = planCapacity(v),
    speed = Math.hypot(v.vx, v.vy);
  if (v.cargo > capacity) planSpill(v, v.x, v.y);
  const cargoMass = v.cargo * 0.4 + (v.planLinks.some(l => l.grab) ? 4 : 0);
  if (v.cargoMass !== cargoMass) {
    v.cargoMass = cargoMass;
    recalc(v);
  }
  if (capacity > 0)
    for (const o of B.objs) {
      if (!planEligible(o, v)) continue;
      if (Math.hypot(o.x - v.x, o.y - v.y) > v.rad + 50) continue;
      const pickRadius = v.has.pouch ? 26 : 18,
        contact = v.blocks.some(b => b.inst.alive && Math.hypot(bpos(v, b)[0] - o.x, bpos(v, b)[1] - o.y) < pickRadius);
      if (contact || ((v.bellUntil || 0) > B.time && Math.hypot(o.x - v.x, o.y - v.y) < v.rad + 45))
        planTakeScrap(v, o);
    }
  if (buffOf(v, 'magnet'))
    for (const o of B.objs) {
      if (!planEligible(o, v)) continue;
      const d = Math.hypot(o.x - v.x, o.y - v.y);
      if (d < 220 && d > 12) {
        o.vx += ((v.x - o.x) / d) * 500 * dt;
        o.vy += ((v.y - o.y) / d) * 500 * dt;
      }
    }
  for (const I of v.insts) {
    if (!I.alive || !I.m.plan) continue;
    const [x, y] = ipos(v, I),
      a = faceAng(v, I),
      cs = I.cells.length ? I.cells : [{ gx: I.gcx, gy: I.gcy }];
    I.heat = clamp((I.heat || 0) + dt * (speed > 75 || v.fire ? 0.4 : -0.25), 0, 1);
    if (
      ['emberwheel', 'soaproller', 'zamboni'].includes(I.id) &&
      speed > 90 &&
      (I.id !== 'emberwheel' || Math.abs(v.steer) > 0.4) &&
      planReady(I, 0.35)
    )
      planZone(
        v,
        x - Math.cos(a) * 24,
        y - Math.sin(a) * 24,
        I.id === 'emberwheel' ? 'fire' : 'oil',
        I.id === 'zamboni' ? 38 : 18,
        I.id === 'emberwheel' ? 2 : 4
      );
    if (I.id === 'firebreak' || I.id === 'squeegee')
      B.zones = B.zones.filter(
        z =>
          !(['firebreak'].includes(I.id) ? z.kind === 'fire' : ['oil', 'glue', 'bead', 'soapbead'].includes(z.kind)) ||
          !cs.some(b => {
            const p = bpos(v, b);
            return Math.hypot(z.x - p[0], z.y - p[1]) < z.r + S * 0.45;
          })
      );
    if (['furnaceskate', 'kilnram', 'campfork'].includes(I.id))
      planContact(v, I, S * 0.55, (e, b, px, py) => {
        if (I.heat > 0.55) {
          B.hitSrc = I.id;
          hitCarBlock(
            e,
            b,
            (I.id === 'kilnram' ? 24 : 12) * dt * (1 + (v.aura.dmg_fire || 0)),
            'fire',
            px,
            py,
            Math.cos(a),
            Math.sin(a),
            v.idx
          );
        }
      });
    if (['chilltap', 'frostdrum', 'icetongs'].includes(I.id))
      planContact(v, I, S * 0.58, (e, b) => {
        if (b.inst.id !== 'cockpit') b.inst.chilledUntil = B.time + 2;
        e.frozen = Math.max(e.frozen, 0.25 * (1 + (v.aura.freeze || 0)));
      });
    if (I.id === 'driftfin' && speed > 80) v.w *= Math.exp(-0.65 * dt);
    if (I.id === 'driftcradle' && speed > 80 && Math.abs(v.steer) > 0.4) v.w += v.steer * 0.25 * dt;
    if (I.id === 'gripstud' && I.deployed) {
      v.vx *= Math.exp(-3 * dt);
      v.vy *= Math.exp(-3 * dt);
      v.w *= Math.exp(-4 * dt);
    }
    if (I.id === 'rescue' && I.rescueUntil > B.time && speed < 55) {
      v.vx *= Math.exp(-10 * dt);
      v.vy *= Math.exp(-10 * dt);
      if (v.flip > 0) v.flip = Math.max(0.01, v.flip - 3 * dt);
      I.active = 1;
    } else if (I.id === 'rescue') I.active = 0;
    if (I.id === 'patchbench' && v.cargo > 0 && speed < 20 && B.time - v.lastHit > 3 && planReady(I, 1)) {
      const J = v.insts
        .filter(j => j.alive && j.id !== 'cockpit' && j.hp < j.max && Math.hypot(j.gcx - I.gcx, j.gcy - I.gcy) < 3)
        .sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (J) {
        v.cargo--;
        J.hp = Math.min(J.max, J.hp + 22);
        spark(...ipos(v, J), 4, '#72d79d');
      }
    }
    if (I.id === 'conveyor' && v.cargo > 0 && planReady(I, 1.5)) {
      const J = v.insts.find(
        j => j !== I && j.alive && j.id !== 'cockpit' && Math.hypot(j.gcx - I.gcx, j.gcy - I.gcy) < 2
      );
      if (J && (I.ammoMode ? J.W && J.cd > 0 : J.hp < J.max)) {
        v.cargo--;
        if (I.ammoMode) J.cd = 0;
        else J.hp = Math.min(J.max, J.hp + 15);
        I.active = 1;
      } else I.active = 0;
    }
    if (I.id === 'cinderfan' && v.fire && !I.blocked)
      for (const z of B.zones) {
        if (z.kind === 'fire' && Math.hypot(z.x - x, z.y - y) < 170) {
          z.x = clamp(z.x + Math.cos(a) * 100 * dt, WM, AW - WM);
          z.y = clamp(z.y + Math.sin(a) * 100 * dt, WM, AH - WM);
        }
      }
    if (['slush', 'snowblower'].includes(I.id) && v.fire && !I.blocked && planReady(I, 0.3)) {
      const tx = x + Math.cos(a) * 135,
        ty = y + Math.sin(a) * 135;
      if (losClear(x, y, tx, ty)) {
        B.zones = B.zones.filter(z => z.kind !== 'fire' || Math.hypot(z.x - tx, z.y - ty) > z.r + 30);
        planZone(v, tx, ty, 'oil', I.id === 'snowblower' ? 42 : 25, 3);
        for (const e of others(v))
          if (Math.hypot(e.x - tx, e.y - ty) < e.rad + 25) {
            e.frozen = Math.max(e.frozen, 0.3);
            for (const J of e.insts) J.burn = 0;
          }
      }
      if (I.id === 'snowblower')
        for (const o of B.objs)
          if (!o.dead && !o.fixed && Math.hypot(o.x - tx, o.y - ty) < 100) {
            o.vx += Math.cos(a) * 90;
            o.vy += Math.sin(a) * 90;
          }
    }
    if (I.id === 'sweeper')
      for (const e of B.cars) {
        if (e === v) continue;
        const cut = (sx, sy, tx, ty) =>
          cs.some(b => {
            const [px, py] = bpos(v, b),
              dx = tx - sx,
              dy = ty - sy,
              t = clamp(((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy || 1), 0, 1);
            return Math.hypot(px - sx - dx * t, py - sy - dy * t) < S * 0.6;
          });
        if (e.tether) {
          const [sx, sy] = ipos(e, e.tether.inst),
            t = e.tether.car || e.tether.obj;
          if (cut(sx, sy, t.x, t.y)) e.tether = null;
        }
        e.planLinks = (e.planLinks || []).filter(l => {
          const [sx, sy] = ipos(e, e.insts[l.n]),
            t = l.obj || (l.car != null ? B.cars[l.car] : l);
          return !cut(sx, sy, t.x, t.y);
        });
      }
    if (I.id === 'yoyo' && v.fire && planReady(I, 2.5)) I.yoyoUntil = B.time + 1.3;
    if (['yoyo', 'pendulum'].includes(I.id)) {
      const phase = I.id === 'pendulum' ? B.time * 2.2 + v.w * 0.8 : (I.yoyoUntil || 0) - B.time;
      if (I.id === 'pendulum' || phase > 0) {
        const r = I.id === 'pendulum' ? 90 : 120 * Math.sin(clamp(phase / 1.3, 0, 1) * Math.PI),
          fa = I.id === 'pendulum' ? a + Math.sin(phase) * 1.3 : a;
        I.weight = { x: x + Math.cos(fa) * r, y: y + Math.sin(fa) * r };
        if (losClear(x, y, I.weight.x, I.weight.y)) {
          for (const e of others(v)) {
            const b = carBlockAt(e, I.weight.x, I.weight.y, 18);
            if (b && planReady(I, 0.3)) {
              B.hitSrc = I.id;
              hitCarBlock(e, b, I.id === 'pendulum' ? 22 : 15, 'melee', x, y, Math.cos(fa), Math.sin(fa), v.idx);
              impulse(e, Math.cos(fa) * 350, Math.sin(fa) * 350, I.weight.x, I.weight.y);
            }
          }
        } else I.weight = null;
      } else I.weight = null;
    }
  }
  for (const l of v.planLinks) {
    const I = v.insts[l.n],
      t = l.obj || (l.car != null ? B.cars[l.car] : l);
    if (!I?.alive || t.dead || l.until <= B.time) {
      l.dead = true;
      continue;
    }
    const [x, y] = planLinkRoot(v, I, l),
      d = Math.hypot(t.x - x, t.y - y),
      ex = d - l.len;
    if (ex > 110) {
      const snap = v.insts.find(j => j.alive && j.id === 'shackle' && Math.hypot(j.gcx - I.gcx, j.gcy - I.gcy) < 2);
      if (snap) killInst(v, snap);
      l.dead = true;
      continue;
    }
    if (ex > 55) {
      const cleat = v.insts.some(j => j.alive && j.id === 'cleat' && Math.hypot(j.gcx - I.gcx, j.gcy - I.gcy) < 2);
      hurtInst(v, I, dt * (cleat ? 2 : 4), 'none');
    }
    if (l.grab) {
      t.heldBy = v.idx;
      t.x = x + Math.cos(faceAng(v, I)) * 45;
      t.y = y + Math.sin(faceAng(v, I)) * 45;
      t.vx = v.vx;
      t.vy = v.vy;
    } else if (ex > 0) {
      const force = Math.min(1300, ex * 18) * (I.id === 'towyoke' ? 0.5 : 1) * (1 + (v.aura.tether || 0)) * dt;
      impulse(v, ((t.x - x) / d) * force, ((t.y - y) / d) * force, x, y, true);
      if (l.car != null) impulse(t, (-(t.x - x) / d) * force, (-(t.y - y) / d) * force, t.x, t.y, true);
      else if (l.obj && !t.fixed) {
        t.vx -= (((t.x - x) / d) * force) / Math.max(1, t.m);
        t.vy -= (((t.y - y) / d) * force) / Math.max(1, t.m);
      }
    }
    if (I.id === 'towhook') l.len = Math.max(65, l.len - dt * 80);
    if (v.rmb && !l.grab) l.len = Math.max(I.id === 'grapple' ? 90 : 45, l.len - dt * 65);
  }
  for (const l of v.planLinks) if (l.dead && l.obj?.heldBy === v.idx) delete l.obj.heldBy;
  v.planLinks = v.planLinks.filter(l => !l.dead);
  if (v.tether) {
    const root = v.tether.inst,
      protect = v.insts.some(j => j.alive && j.id === 'cleat' && Math.hypot(j.gcx - root.gcx, j.gcy - root.gcy) <= 2);
    if (protect) v.tether.life += dt * 0.4;
  }
}
function planActivate(v, k) {
  for (const I of v.insts) {
    if (!I.alive || !I.m.plan) continue;
    const [x, y] = ipos(v, I),
      a = faceAng(v, I);
    if (k === 'KeyZ' && PLAN_DROP.includes(I.id) && planReady(I, I.id === 'foambath' ? 5 : 2))
      planZone(
        v,
        x - Math.cos(a) * 35,
        y - Math.sin(a) * 35,
        I.id === 'frostbead' ? 'bead' : I.id === 'soap' ? 'soapbead' : 'oil',
        I.id === 'foambath' ? 65 : 12,
        I.id === 'foambath' ? 4 : 8
      );
    if (k === 'KeyV' && I.id === 'rubberduck' && planReady(I, 6)) {
      B.decoys.push({ x, y, a, vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 120, life: 3, own: v.idx });
      planZone(v, x, y, 'oil', 20, 3);
      sfx('squeak', x, y);
    }
    if (
      k === 'KeyH' &&
      I.id === 'prizebell' &&
      others(v).some(e => !e.dead && Math.hypot(e.x - x, e.y - y) < e.rad + v.rad + 70) &&
      planReady(I, 8)
    ) {
      v.bellUntil = B.time + 2;
      sfx('horn', x, y);
    }
    if (k === 'KeyC' && I.id === 'gripstud') I.deployed = !I.deployed;
    if (k === 'KeyC' && I.id === 'rescue' && Math.hypot(v.vx, v.vy) < 55 && planReady(I, 5)) I.rescueUntil = B.time + 2;
    if (k === 'Space' && I.id === 'conveyor') I.ammoMode = !I.ammoMode;
    if (k === 'Space' && I.id === 'yoyo' && planReady(I, 2.5)) {
      I.yoyoUntil = B.time + 1.3;
      sfx('thump', x, y);
    }
    if (k === 'RMB' && PLAN_ACTION.includes(I.id) && !I.blocked && planReady(I, 2.5)) {
      v.planLinks ??= [];
      v.planLinks = v.planLinks.filter(l => l.n !== I.n);
      if (I.id === 'grapple') {
        const angle = Math.atan2(v.aimY - y, v.aimX - x),
          r = rayHit(x, y, angle, 600, false, v.idx);
        if (r.end < 600 && !r.hits[0]?.car)
          v.planLinks.push({
            n: I.n,
            x: x + Math.cos(angle) * r.end,
            y: y + Math.sin(angle) * r.end,
            len: r.end,
            until: B.time + 5 * (1 + (v.aura.tether || 0))
          });
      } else {
        const candidates =
          I.id === 'towyoke'
            ? others(v).filter(e => !e.dead)
            : B.objs.filter(o => !o.dead && !o.fixed && !o.objective && o.m <= (I.id === 'lasso' ? 3 : 12));
        candidates.sort((a, b) => Math.hypot(a.x - v.aimX, a.y - v.aimY) - Math.hypot(b.x - v.aimX, b.y - v.aimY));
        const target = candidates[0];
        if (target && Math.hypot(target.x - x, target.y - y) < 400 && losClear(x, y, target.x, target.y)) {
          if (I.id === 'towyoke') {
            for (const off of [-20, 20]) {
              const sx = x + Math.cos(a + Math.PI / 2) * off,
                sy = y + Math.sin(a + Math.PI / 2) * off;
              if (losClear(sx, sy, target.x, target.y))
                v.planLinks.push({
                  n: I.n,
                  off,
                  car: target.idx,
                  x: target.x,
                  y: target.y,
                  len: Math.hypot(target.x - sx, target.y - sy),
                  until: B.time + 4
                });
            }
          } else
            v.planLinks.push({
              n: I.n,
              obj: target,
              len: Math.hypot(target.x - x, target.y - y),
              until: B.time + 6 * (1 + (v.aura.tether || 0)),
              grab: I.id === 'salvageclaw'
            });
        }
      }
    }
  }
}
function planHurt(v, I, amt, type) {
  if (I.id === 'snowcap' && type === 'fire' && !I.used) {
    I.used = 1;
    I.burn = 0;
    spark(...ipos(v, I), 5, '#8bdeed');
    return 0;
  }
  if (I.id === 'bottlecap' && ['light', 'kin'].includes(type) && amt < 24 && (v.cargo || 0) > 0) {
    v.cargo--;
    return 0;
  }
  if (I.chilledUntil > B.time && ['melee', 'ram'].includes(type)) amt *= 1.3;
  if (I.id === 'hopper' && amt > 18 && v.cargo > 0) planSpill(v, ...ipos(v, I));
  if (I.id === 'icicle' && type === 'ram' && amt > 25) {
    amt = Math.max(amt, I.hp / DMG_SCALE);
    planZone(v, ...ipos(v, I), 'oil', 55, 3);
  }
  if (I.id === 'driftcradle' && type === 'ram') v.w += v.steer * 2;
  if (I.id === 'shackle' && type === 'ram' && v.tether) {
    v.tether = null;
    amt = Math.max(amt, I.hp / DMG_SCALE);
  }
  if (I.id === 'glacier' && I.punch > 0) I.active = 1;
  return amt;
}
function planDrawLinks(c, v) {
  c.save();
  c.lineWidth = 3;
  c.strokeStyle = '#c7b6ff';
  for (const l of v.planLinks || []) {
    const I = v.insts[l.n];
    if (!I?.alive) continue;
    const [x, y] = planLinkRoot(v, I, l),
      t = l.obj || (l.car != null && B.cars[l.car]) || l;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(t.x, t.y);
    c.stroke();
    circ(c, t.x, t.y, 5, '#d8ccff');
  }
  for (const I of v.insts)
    if (I.alive && I.weight) {
      const [x, y] = ipos(v, I);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(I.weight.x, I.weight.y);
      c.stroke();
      circ(c, I.weight.x, I.weight.y, I.id === 'pendulum' ? 18 : 12, '#655c80', '#c7b6ff', 2);
    }
  c.restore();
}
function planDrawModule(c, m, s, ang, st) {
  const b = shapeBounds(m),
    col = m.art.c,
    t = SETTINGS?.motion === false || matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : ANIM;
  c.save();
  c.rotate(ang);
  for (const [x, y] of moduleCells(m)) {
    c.save();
    c.translate((x - b.cx) * s, (y - b.cy) * s);
    bevel(c, s * 0.46, m.layer === 't' ? '#313e4c' : col, s * 0.08);
    c.strokeStyle = col;
    c.lineWidth = s * 0.035;
    c.strokeRect(-s * 0.37, -s * 0.37, s * 0.74, s * 0.74);
    c.restore();
  }
  circ(c, 0, 0, s * 0.28, '#172332', col, s * 0.04);
  c.save();
  c.rotate(t * (m.cat === 'move' || m.branch === 'hook' ? 2 : 0.5));
  if (m.branch === 'cold') {
    for (let i = 0; i < 3; i++) {
      c.rotate(Math.PI / 3);
      line(c, [-s * 0.22, 0, s * 0.22, 0], col, s * 0.04);
    }
  } else if (m.branch === 'hook') {
    for (let i = 0; i < 3; i++) circ(c, 0, 0, s * (0.08 + i * 0.05), null, col, s * 0.025);
    line(c, [0, 0, 0, -s * 0.43], col, s * 0.035);
  } else if (m.branch === 'econ') {
    rr(c, -s * 0.21, -s * 0.15, s * 0.42, s * 0.3, s * 0.04);
    c.fillStyle = col;
    c.fill();
    line(c, [-s * 0.15, -s * 0.2, s * 0.15, -s * 0.2], col, s * 0.04);
  } else if (m.branch === 'slip') {
    for (let i = 0; i < 3; i++)
      circ(c, Math.cos(i * 2.1) * s * 0.12, Math.sin(i * 2.1) * s * 0.12, s * 0.07, null, col, s * 0.025);
  } else if (m.glyph) {
    c.rotate(-t * 0.5 - ang);
    c.font = `${s * 0.36}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(m.glyph, 0, s * 0.02);
  } else {
    c.beginPath();
    c.moveTo(-s * 0.15, s * 0.15);
    c.quadraticCurveTo(-s * 0.22, -s * 0.05, 0, -s * 0.25);
    c.quadraticCurveTo(s * 0.25, s * 0.05, s * 0.1, s * 0.15);
    c.closePath();
    c.fillStyle = col;
    c.fill();
  }
  c.restore();
  if (m.wpn || m.mel) {
    line(c, [0, -s * 0.18, 0, -s * 0.48], col, s * 0.12);
  }
  if (m.cat === 'move' && m.drive) {
    c.save();
    c.rotate(t * 4);
    circ(c, 0, 0, s * 0.23, '#15202a', col, s * 0.07);
    line(c, [-s * 0.2, 0, s * 0.2, 0], '#f2f6fc', s * 0.025);
    c.restore();
  }
  if (['cinderfan', 'snowblower'].includes(m.id)) {
    c.save();
    c.rotate(t * 3);
    for (let i = 0; i < 3; i++) {
      c.rotate((Math.PI * 2) / 3);
      line(c, [0, 0, s * 0.2, -s * 0.12], col, s * 0.1);
    }
    c.restore();
  }
  if (['pouch', 'basket', 'hopper', 'patchbench'].includes(m.id) && st.cargo) {
    c.font = `bold ${s * 0.23}px sans-serif`;
    c.textAlign = 'center';
    c.fillStyle = '#fff';
    c.fillText(st.cargo, 0, s * 0.09);
  }
  if (st.heat > 0.5 && m.branch === 'fire') {
    c.globalAlpha = (st.heat - 0.5) * 0.6;
    circ(c, 0, 0, s * 0.45, '#ff8c42');
    c.globalAlpha = 1;
  }
  if (st.charge > 0) {
    c.strokeStyle = '#fff2a0';
    c.lineWidth = s * 0.06;
    c.beginPath();
    c.arc(0, 0, s * 0.34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * st.charge);
    c.stroke();
  }
  c.restore();
}

/* =================== WEAPONS =================== */
function weapons(v, dt) {
  if (v.emp > 0) v.emp -= dt;
  if (v.blind > 0) v.blind -= dt;
  const emp = v.emp > 0;
  const fireK = (buffOf(v, 'overdrive') ? 1.6 : 1) * (v.rateMul || 1);
  if (v.regen && !v.dead && B.seq === 'play')
    for (const I of v.insts) if (I.alive && I.hp < I.max) I.hp = Math.min(I.max, I.hp + I.max * v.regen * dt);
  const jam = v.jam > 0,
    sensor = !!v.has.sensor && !jam,
    cone = sensor ? 0.44 : 0.14,
    track = sensor ? 10 : 5;
  if (v.jam > 0) v.jam -= dt;
  for (const I of v.insts) {
    if (!I.alive) continue;
    I.hitT -= dt;
    I.punch -= dt;
    if (I.burn > 0) {
      I.burn -= dt;
      hurtInst(v, I, 8 * dt, 'none');
    }
    if (I.m.regen && I.hp < I.max) I.hp = Math.min(I.max, I.hp + I.m.regen * dt);
    if (I.m.shield) {
      if (I.shCd > 0) {
        I.shCd -= dt;
        if (I.shCd <= 0) I.sh = I.shMax;
      }
      I.shT = (I.shT || 0) - dt;
    }
  }
  if (v.flip > 0) return;
  const foes = others(v).filter(e => !e.dead);
  for (const I of v.insts) {
    if (!I.alive) continue;
    B.curSrc = B.hitSrc = I.id; // anything this part fires or hits is credited to it
    const m = I.m,
      [px, py] = ipos(v, I);
    if (emp && (I.W || m.mel || m.flipper || m.pd || m.tractor)) {
      if (Math.random() < dt * 3) spark(px, py, 1, '#7fe0ff');
      continue;
    }
    if (planWeapon(v, I, dt)) continue;
    if (m.medic && B.time - v.lastHit > 3 && v.medPool > 0) {
      for (const J of v.insts) {
        if (!J.alive || J.hp >= J.max) continue;
        const amt = Math.min(J.max * 0.015 * dt, v.medPool, J.max - J.hp);
        J.hp += amt;
        v.medPool -= amt;
      }
      if (Math.random() < dt * 3)
        fx({
          k: 'spark',
          x: px,
          y: py,
          vx: rnd(-20, 20),
          vy: rnd(-60, -20),
          life: 0.5,
          max: 0.5,
          col: '#5cc38f'
        });
    }
    if (m.bombbay) {
      I.cd -= dt * fireK;
      if (v.z > 25 && I.cd <= 0) {
        I.cd = 0.35;
        B.lobs.push({
          own: v.idx,
          sx: px,
          sy: py,
          tx: px + v.vx * 0.25,
          ty: py + v.vy * 0.25,
          t: 0,
          T: 0.3,
          dmg: 40,
          splash: 55,
          dt: 'expl',
          col: '#3a3f44',
          small: 1
        });
        sfx('thump', px, py);
      }
    }
    if (m.repair && B.time - v.lastHit > 2 && v.repairPool > 0) {
      let worst = null,
        wr = 1;
      const nb = I.layer === 't' ? [I.base] : [];
      for (const b of I.cells.length ? I.cells : [v.grid.get(I.k)])
        for (const [dx, dy] of DIRS) {
          const n = v.grid.get(key(b.gx + dx, b.gy + dy));
          if (n && n.inst.alive) nb.push(n.inst);
        }
      for (const J of nb) {
        if (J === I || !J.alive) continue;
        const r = J.hp / J.max;
        if (r < wr) {
          wr = r;
          worst = J;
        }
      }
      if (worst) {
        const amt = Math.min(20 * dt, v.repairPool, worst.max - worst.hp);
        worst.hp += amt;
        v.repairPool -= amt;
        if (Math.random() < dt * 6) {
          const [x, y] = ipos(v, worst);
          fx({ k: 'spark', x, y, vx: rnd(-30, 30), vy: rnd(-60, -20), life: 0.4, max: 0.4, col: '#5cc38f' });
        }
      }
    }
    if (m.pd && !jam) {
      I.cd -= dt * fireK;
      I.pa = (I.pa || 0) + dt * 2;
      if (I.cd <= 0) {
        let tgt = null,
          bd = 170;
        for (const s of B.shots)
          if (s.own !== v.idx && (s.kind === 'rocket' || s.kind === 'homing') && !(s.delay > 0)) {
            const d = Math.hypot(s.x - px, s.y - py);
            if (d < bd) {
              bd = d;
              tgt = s;
            }
          }
        for (const l of B.lobs)
          if (l.own !== v.idx && l.t / l.T > 0.4) {
            const t = l.t / l.T,
              lx = l.sx + (l.tx - l.sx) * t,
              ly = l.sy + (l.ty - l.sy) * t,
              d = Math.hypot(lx - px, ly - py);
            if (d < bd) {
              bd = d;
              tgt = l;
            }
          }
        if (tgt) {
          I.cd = 0.7;
          const lob = tgt.tx !== undefined,
            tx = lob ? tgt.sx + ((tgt.tx - tgt.sx) * tgt.t) / tgt.T : tgt.x,
            ty = lob ? tgt.sy + ((tgt.ty - tgt.sy) * tgt.t) / tgt.T : tgt.y;
          I.pa = Math.atan2(ty - py, tx - px) - v.a;
          fx({ k: 'tracer', x: px, y: py, x2: tx, y2: ty, life: 0.1, max: 0.1 });
          sfx('pd', px, py);
          if (Math.random() < 0.75) {
            tgt.dead = 1;
            boom(tx, ty, 0.4);
          }
        }
      }
    }
    if (m.magnet)
      for (const o of B.objs) {
        if (!small(o)) continue;
        const d = Math.hypot(o.x - px, o.y - py);
        if (d < 240 && d > 10) {
          o.vx += ((((px - o.x) / d) * 3200) / Math.max(1, o.m)) * dt;
          o.vy += ((((py - o.y) / d) * 3200) / Math.max(1, o.m)) * dt;
        }
        if (v.stuck.length < 6 && Math.hypot(o.x - v.x, o.y - v.y) < v.rad + o.r * 0.5) {
          const [gxp, gyp] = toLocal(v, o.x, o.y);
          v.stuck.push({
            kind: o.kind,
            id: o.id,
            gx: gxp,
            gy: gyp,
            r: o.r,
            m: o.m,
            hp: Math.max(30, o.hp),
            a: o.a - v.a
          });
          o.dead = true;
          recalc(v);
          txt(o.x, o.y - 20, '+cover', '#9aa3ab', 0.7);
        }
      }
    if (m.vacuum)
      for (const o of B.objs) {
        if (!small(o) || o.m > 4) continue;
        const d = Math.hypot(o.x - px, o.y - py);
        if (d < 150) {
          o.vx += ((px - o.x) / (d || 1)) * 900 * dt;
          o.vy += ((py - o.y) / (d || 1)) * 900 * dt;
          o.w += dt * 8;
          if (d < 22) {
            o.dead = true;
            let w = null,
              wr = 1;
            for (const J of v.insts)
              if (J.alive && J.hp / J.max < wr) {
                wr = J.hp / J.max;
                w = J;
              }
            if (w) w.hp = Math.min(w.max, w.hp + 25);
            txt(px, py - 22, '+25 HP', '#5cc38f', 0.8);
          }
        }
      }
    if (m.catapult && v.hopper.length < 3) {
      const o = nearestObj(px, py, S * 2.4, null, small);
      if (o) {
        o.dead = true;
        v.hopper.push({ kind: o.kind, id: o.id, m: o.m, r: o.r, hp: o.hp, explode: o.explode });
        txt(o.x, o.y - 14, 'scooped', '#f2b705', 0.6);
      }
    }
    if (m.tractor && v.rmb) {
      I.active = 1;
      let tg = null;
      for (const e of foes) if (Math.hypot(e.x - v.aimX, e.y - v.aimY) < e.rad + 40) tg = { car: e };
      if (!tg) {
        const o = nearestObj(v.aimX, v.aimY, 90, null, o => !o.fixed);
        if (o) tg = { o };
      }
      I.tgt = null;
      if (tg) {
        const t = tg.car || tg.o,
          d = Math.hypot(t.x - px, t.y - py) || 1;
        if (d < 420) {
          I.tgt = t;
          if (tg.o) {
            t.vx += ((((px - t.x) / d) * 2400) / Math.max(1, t.m)) * dt;
            t.vy += ((((py - t.y) / d) * 2400) / Math.max(1, t.m)) * dt;
          } else impulse(t, ((px - t.x) / d) * 900 * dt * 60, ((py - t.y) / d) * 900 * dt * 60, t.x, t.y, true);
        }
      }
    } else I.active = 0;
    if (m.mel && !I.blocked) {
      const fa = faceAng(v, I),
        reach = m.mel.reach || 1,
        cx = px + Math.cos(fa) * S * 0.6 * reach,
        cy = py + Math.sin(fa) * S * 0.6 * reach;
      I.cd -= dt * fireK;
      let target = null;
      for (const e of foes) {
        const b = carBlockAt(e, cx, cy, S * 0.45 * reach);
        if (b) {
          target = { car: e, b };
          break;
        }
      }
      if (!target)
        for (const o of B.objs) {
          if (o.dead || o.z > 20 || (buffOf(v, 'ghost') && o.junk)) continue;
          if (Math.hypot(o.x - cx, o.y - cy) <= o.r + S * 0.5 * reach) {
            target = { o };
            break;
          }
        }
      if (target) {
        const melK = 1 + (v.aura.dmg_melee || 0),
          dps = m.mel.dps * (I.id === 'saw' && CT(v, 'diamond') ? 1.4 : 1) * I.mount * melK;
        if (m.mel.dps) {
          applyHit(target, dps * dt, 'melee', cx, cy, fa, v.idx);
          if (Math.random() < dt * 25) {
            spark(cx, cy, 2);
            sfx('grind', cx, cy);
          }
        } else if (I.cd <= 0) {
          I.cd = m.mel.cd;
          I.punch = 0.2;
          applyHit(target, m.mel.hit * I.mount * melK, 'melee', cx, cy, fa, v.idx);
          spark(cx, cy, 12);
          B.shake = Math.max(B.shake, 3);
          sfx('clang', cx, cy);
        }
      }
    }
    if (m.flipper && !I.blocked) {
      I.cd -= dt * fireK;
      if (I.cd <= 0) {
        const fa = faceAng(v, I),
          cx = px + Math.cos(fa) * S * 0.9,
          cy = py + Math.sin(fa) * S * 0.9,
          k = (CT(v, 'springsteel') ? 1.6 : 1) * (1 + (v.aura.flipPow || 0));
        let fired = false;
        for (const e of foes) {
          if (e.z > 0 || !carBlockAt(e, cx, cy, S * 0.4)) continue;
          fired = true;
          const res = e.c.flipRes ? 0.15 : clamp(1.4 - e.c.mass / 40, 0.15, 1) * k;
          e.vz = 320 * k;
          e.z = 1;
          impulse(e, Math.cos(fa) * 1600, Math.sin(fa) * 1600, cx, cy);
          if (Math.random() < res) flipCar(e);
          hitCarBlock(e, carBlockAt(e, cx, cy, S * 0.4), 25, 'melee', cx, cy, Math.cos(fa), Math.sin(fa), v.idx);
          break;
        }
        if (!fired) {
          const o = nearestObj(cx, cy, S * 0.5, null, o => !o.fixed && o.z === 0);
          if (o) {
            fired = true;
            o.vz = clamp((900 * k * (o.r > 24 ? 0.5 : 1)) / Math.sqrt(Math.max(1, o.m)), 80, 700);
            o.vx += Math.cos(fa) * 200;
            o.vy += Math.sin(fa) * 200;
            o.w += rnd(-10, 10);
            dmgObj(o, 25, 'melee', v.idx);
            txt(o.x, o.y - 24, 'FLIP!', '#f2b705', 0.8);
          }
        }
        if (fired) {
          I.cd = 2.4 * (CT(v, 'springsteel') ? 1.3 : 1);
          I.punch = 0.25;
          spark(cx, cy, 8);
          sfx('spring', cx, cy);
        }
      }
    }
    const W = I.W;
    if (!W) continue;
    const fa = faceAng(v, I);
    let aimA = fa;
    const want = Math.atan2(v.aimY - py, v.aimX - px);
    if (W.kind === 'tesla') {
      I.cd -= dt * fireK;
      if (I.cd <= 0 && v.fire && !jam) {
        const first = autoTarget(v, px, py, W.rng);
        if (first) {
          const pts = [[px, py]],
            hit = [];
          let cur = first;
          for (let i = 0; i <= W.chain && cur; i++) {
            damageTarget(cur, W.dmg * (i ? 0.7 : 1), 'energy', px, py, v.idx);
            pts.push([cur.x, cur.y]);
            hit.push(cur.car || cur.o);
            const o = nearestObj(cur.x, cur.y, 140, hit);
            cur = o ? { x: o.x, y: o.y, o } : null;
          }
          fx({ k: 'arc', pts, life: 0.16, max: 0.16 });
          sfx('zap', px, py);
          I.cd = W.cd;
        }
      }
      continue;
    }
    if (I.turret) {
      I.ta += clamp(wrap(want - I.ta), -track * dt, track * dt);
      aimA = I.ta;
    } else if (W.kind !== 'lob') {
      aimA = fa + clamp(wrap(want - fa), -cone, cone);
      I.ta = aimA;
    }
    I.cd -= dt * fireK;
    if (W.spin) I.spin = clamp(I.spin + (v.fire ? dt : -dt * 1.5), CT(v, 'minispool') ? 1 : 0, 1);
    const spr = (W.spr || 0) * (v.anchored ? 0.5 : 1),
      mx = px + Math.cos(aimA) * S * 0.85,
      my = py + Math.sin(aimA) * S * 0.85;
    if (I.blocked || (W.kind !== 'lob' && stuckBlocks(v, mx, my))) {
      if (v.fire && Math.random() < dt * 4) spark(mx, my, 1);
      continue;
    }
    const recoil = k => {
      if (k && !v.anchored) impulse(v, -Math.cos(aimA) * k * 30, -Math.sin(aimA) * k * 30, px, py);
    };
    if (W.kind === 'rail') {
      if (v.fire && I.cd <= 0) {
        if (I.charge === 0) sfx('charge', px, py);
        I.charge += dt;
        if (I.charge >= W.charge) {
          I.charge = 0;
          I.cd = W.cd;
          const r = rayHit(mx, my, aimA, W.rng, true, v.idx);
          for (const h of r.hits) applyHit(h, W.dmg, W.dt, mx, my, aimA, v.idx);
          fx({ k: 'rail', x: mx, y: my, a: aimA, l: r.end, life: 0.3, max: 0.3 });
          B.shake = Math.max(B.shake, 5);
          sfx('rail', px, py);
          recoil(W.recoil);
        }
      } else I.charge = Math.max(0, I.charge - dt * 2);
      continue;
    }
    if (W.kind === 'beam') {
      I.beam = null;
      if (!v.fire) continue;
      const n = W.beams || 1;
      I.beam = [];
      for (let i = 0; i < n; i++) {
        const a = aimA + (i - (n - 1) / 2) * 0.13,
          r = rayHit(mx, my, a, W.rng, false, v.idx);
        const h = r.hits[0];
        if (h) {
          applyHit(h, W.dps * dt, W.dt, mx, my, a, v.idx);
          if (W.freeze) {
            if (h.o) {
              h.o.frozen = Math.max(h.o.frozen, (CT(v, 'cryo') ? 3 : 1.5) * (1 + (v.aura.freeze || 0)));
              h.o.burn = 0;
            } else h.car.frozen = Math.max(h.car.frozen, (CT(v, 'cryo') ? 2 : 1) * (1 + (v.aura.freeze || 0)));
          }
          if (Math.random() < 0.3)
            spark(mx + Math.cos(a) * r.end, my + Math.sin(a) * r.end, 1, W.freeze ? '#e6faff' : '#bff');
        }
        I.beam.push({ a, l: r.end });
      }
      if (Math.random() < dt * 8) sfx('hum', px, py);
      continue;
    }
    if (W.kind === 'flame' || W.kind === 'water') {
      if (!v.fire) continue;
      I.fl = (I.fl || 0) + dt * 36;
      while (I.fl >= 1) {
        I.fl--;
        const a = aimA + rnd(-0.16, 0.16),
          sp = rnd(320, 420);
        B.shots.push({
          own: v.idx,
          kind: W.kind,
          x: mx,
          y: my,
          vx: Math.cos(a) * sp + v.vx,
          vy: Math.sin(a) * sp + v.vy,
          life: W.rng / 370,
          max: W.rng / 370,
          dmg: W.kind === 'flame' ? W.dps / 36 : 0.4,
          dt: W.kind === 'flame' ? 'fire' : 'kin',
          push: W.push
        });
      }
      if (Math.random() < dt * 6) sfx(W.kind === 'flame' ? 'flame' : 'water', px, py);
      if (W.kind === 'water') recoil(0.25);
      continue;
    }
    if (W.kind === 'rocket' && I.burst > 0) {
      I.bt -= dt;
      if (I.bt <= 0) {
        I.burst--;
        I.bt = W.fast ? 0.05 : 0.12;
        const a = aimA + rnd(-1, 1) * W.spr;
        B.shots.push({
          own: v.idx,
          kind: 'rocket',
          x: mx,
          y: my,
          vx: Math.cos(a) * W.spd,
          vy: Math.sin(a) * W.spd,
          life: (W.rng / W.spd) * 1.4,
          dmg: W.dmg,
          dt: W.dt,
          splash: W.splash
        });
        sfx('rocket', px, py);
        if (I.burst === 0) I.cd = W.reload;
      }
      continue;
    }
    if (!v.fire || I.cd > 0) continue;
    switch (W.kind) {
      case 'bullet':
      case 'shell':
      case 'bolt':
      case 'plasma': {
        const rate = W.rate * (W.spin ? 0.25 + 0.75 * I.spin : 1);
        for (let i = 0; i < (W.n || 1); i++) {
          const a = aimA + rnd(-1, 1) * spr;
          B.shots.push({
            own: v.idx,
            kind: W.kind,
            x: mx,
            y: my,
            vx: Math.cos(a) * W.spd * rnd(0.95, 1.05) + v.vx * 0.4,
            vy: Math.sin(a) * W.spd * rnd(0.95, 1.05) + v.vy * 0.4,
            life: W.rng / W.spd,
            dmg: W.dmg,
            dt: W.dt,
            splash: W.splash || 0,
            big: W.big,
            freeze: W.freeze ? W.freeze * (1 + (v.aura.freeze || 0)) : 0,
            knockK: 1 + (v.aura.knock || 0),
            knock: W.knock
          });
        }
        I.cd = (1 / rate) * rnd(0.92, 1.08);
        fx({
          k: 'flash',
          x: mx,
          y: my,
          life: 0.06,
          max: 0.06,
          r: W.kind === 'bullet' ? 5 : 10,
          col: W.dt === 'energy' ? '#bff' : null
        });
        sfx(W.kind === 'bullet' ? (W.n ? 'shotgun' : 'gun') : W.kind === 'shell' ? 'cannon' : 'laser', px, py);
        recoil(W.recoil);
        break;
      }
      case 'bounce':
        B.shots.push({
          own: v.idx,
          kind: 'bounce',
          x: mx,
          y: my,
          vx: Math.cos(aimA) * W.spd,
          vy: Math.sin(aimA) * W.spd,
          life: 4,
          dmg: W.dmg,
          dt: 'kin',
          bounces: W.bounces || (CT(v, 'ricochet') ? 5 : 3),
          ang: 0,
          saw: W.dt === 'melee'
        });
        I.cd = 1 / W.rate;
        recoil(6);
        sfx('thump', px, py);
        break;
      case 'sticky':
        B.shots.push({
          own: v.idx,
          kind: 'sticky',
          x: mx,
          y: my,
          vx: Math.cos(aimA) * W.spd,
          vy: Math.sin(aimA) * W.spd,
          life: W.rng / W.spd,
          dmg: W.dmg,
          dt: 'expl',
          splash: W.splash
        });
        I.cd = 1 / W.rate;
        sfx('thump', px, py);
        break;
      case 'homing': {
        const tgt = jam ? null : autoTarget(v, v.aimX, v.aimY, 320);
        for (let i = 0; i < 2; i++) {
          const a = aimA + (i ? 0.25 : -0.25);
          B.shots.push({
            own: v.idx,
            kind: 'homing',
            x: mx,
            y: my,
            vx: Math.cos(a) * W.spd,
            vy: Math.sin(a) * W.spd,
            life: (W.rng / W.spd) * 1.5,
            dmg: W.dmg,
            dt: W.dt,
            splash: W.splash,
            tgt
          });
        }
        I.cd = 1 / W.rate;
        sfx('rocket', px, py);
        break;
      }
      case 'rocket':
        I.burst = W.burst;
        I.bt = 0;
        break;
      case 'lob': {
        const d = Math.hypot(v.aimX - px, v.aimY - py),
          dd = clamp(d, W.min, W.rng);
        const tx = px + ((v.aimX - px) / (d || 1)) * dd,
          ty = py + ((v.aimY - py) / (d || 1)) * dd;
        B.lobs.push({
          own: v.idx,
          sx: mx,
          sy: my,
          tx,
          ty,
          t: 0,
          T: (dd / 360 + 0.35) * (W.slow ? 1.4 : 1),
          dmg: W.dmg,
          splash: W.splash,
          dt: W.dt,
          cluster: W.cluster,
          napalm: W.napalm,
          col: I.m.art.c
        });
        I.cd = 1 / W.rate;
        fx({ k: 'flash', x: mx, y: my, life: 0.08, max: 0.08, r: 10 });
        sfx('mortar', px, py);
        break;
      }
      case 'arc': {
        let first = null;
        for (const e of foes) {
          const nb = nearestBlock(e, px, py);
          if (
            nb &&
            nb.d < W.rng &&
            Math.abs(wrap(Math.atan2(nb.p[1] - py, nb.p[0] - px) - fa)) < 0.7 &&
            !inSmoke(e.x, e.y)
          ) {
            first = { x: nb.p[0], y: nb.p[1], car: e, b: nb.b };
            break;
          }
        }
        if (!first) {
          let bd = W.rng;
          for (const o of B.objs) {
            const d = Math.hypot(o.x - px, o.y - py) - o.r;
            if (d < bd && Math.abs(wrap(Math.atan2(o.y - py, o.x - px) - fa)) < 0.7) {
              bd = d;
              first = { x: o.x, y: o.y, o };
            }
          }
        }
        if (!first) break;
        const pts = [[mx, my]],
          hit = [];
        let cur = first;
        for (let i = 0; i <= W.chain && cur; i++) {
          damageTarget(cur, W.dmg * (i ? 0.75 : 1), W.dt, mx, my, v.idx);
          pts.push([cur.x, cur.y]);
          hit.push(cur.car || cur.o);
          const o = nearestObj(cur.x, cur.y, 130, hit);
          cur = o ? { x: o.x, y: o.y, o } : null;
        }
        fx({ k: 'arc', pts, life: 0.18, max: 0.18 });
        sfx('zap', px, py);
        I.cd = W.cd;
        break;
      }
      case 'harpoon':
        if (v.tether && v.tether.inst === I) break;
        B.shots.push({
          own: v.idx,
          kind: 'harpoon',
          x: mx,
          y: my,
          vx: Math.cos(aimA) * W.spd,
          vy: Math.sin(aimA) * W.spd,
          life: W.rng / W.spd,
          dmg: W.dmg,
          dt: 'kin',
          inst: I.n
        });
        I.cd = W.cd;
        sfx('thump', px, py);
        break;
    }
  }
  for (const d of v.drones) {
    d.a += dt * 1.6;
    const r = v.rad + 30,
      tx = v.x + Math.cos(d.a) * r,
      ty = v.y + Math.sin(d.a) * r;
    d.x += (tx - d.x) * Math.min(1, dt * 5);
    d.y += (ty - d.y) * Math.min(1, dt * 5);
    d.cd -= dt;
    if (d.cd <= 0 && !jam && !emp) {
      const t = autoTarget(v, d.x, d.y, 320);
      if (t) {
        d.cd = 0.55;
        const a = Math.atan2(t.y - d.y, t.x - d.x);
        B.shots.push({
          own: v.idx,
          kind: 'bolt',
          x: d.x,
          y: d.y,
          vx: Math.cos(a) * 800,
          vy: Math.sin(a) * 800,
          life: 0.5,
          dmg: 7,
          dt: 'energy',
          src: 'hive'
        });
      }
    }
  }
  B.curSrc = B.hitSrc = null;
}

/* =================== ACTIVE ABILITIES =================== */
function action(v) {
  if (v.dead || v.flip > 0) return;
  const foes = others(v).filter(e => !e.dead);
  for (const I of v.insts) {
    if (!I.alive || I.blocked) continue;
    B.curSrc = B.hitSrc = I.id;
    const fa = faceAng(v, I),
      [px, py] = ipos(v, I);
    if (I.m.piston && !(I.pcd > B.time)) {
      I.pcd = B.time + 1.4 * (CT(v, 'pneumatic') ? 0.6 : 1);
      I.punch = 0.2;
      const cx = px + Math.cos(fa) * S * 1.2,
        cy = py + Math.sin(fa) * S * 1.2;
      sfx('punch', cx, cy);
      for (const e of foes) {
        const b = carBlockAt(e, cx, cy, S * 0.9);
        if (b) {
          hitCarBlock(e, b, 35, 'melee', cx, cy, Math.cos(fa), Math.sin(fa), v.idx);
          impulse(e, Math.cos(fa) * 3200, Math.sin(fa) * 3200, cx, cy);
          spark(cx, cy, 12);
          B.shake = Math.max(B.shake, 5);
        }
      }
      for (const o of B.objs) {
        if (o.dead || o.z > 20 || (buffOf(v, 'ghost') && o.junk)) continue;
        if (Math.hypot(o.x - cx, o.y - cy) < o.r + S * 0.9) {
          dmgObj(o, 35, 'melee', v.idx);
          if (!o.fixed) {
            o.vx += (Math.cos(fa) * 3300) / Math.max(1, o.m);
            o.vy += (Math.sin(fa) * 3300) / Math.max(1, o.m);
          }
          spark(cx, cy, 10);
          B.shake = Math.max(B.shake, 4);
        }
      }
      const k = 1400 * (CT(v, 'pneumatic') ? 1.5 : 1);
      impulse(v, -Math.cos(fa) * k, -Math.sin(fa) * k, px, py);
    }
    if (I.m.flipper && I.cd > 0 && I.cd < 1) I.cd = 0;
    if (I.m.catapult && v.hopper.length && !(I.ccd > B.time)) {
      I.ccd = B.time + 0.8;
      const it = v.hopper.shift(),
        a = Math.atan2(v.aimY - py, v.aimX - px),
        sp = 520 / Math.sqrt(Math.max(1, it.m * 0.5));
      B.shots.push({
        own: v.idx,
        kind: 'junk',
        item: it,
        x: px,
        y: py,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1.6,
        dmg: 14 + it.m * 7,
        dt: 'kin',
        curve: rnd(-1, 1) * (it.r > 15 ? 2.5 : 1),
        spin: rnd(-12, 12),
        ang: 0
      });
      impulse(v, -Math.cos(a) * 300, -Math.sin(a) * 300, px, py);
      sfx('thump', px, py);
    }
  }
  B.curSrc = B.hitSrc = null;
}
function drop(v, edge) {
  if (v.dead || v.flip > 0 || v.z > 0) return;
  for (const I of v.insts) {
    if (!I.alive || I.blocked) continue;
    const fa = faceAng(v, I),
      [px, py] = ipos(v, I),
      ox = px + Math.cos(fa) * S * 0.9,
      oy = py + Math.sin(fa) * S * 0.9;
    if (I.m.spray === 'oil' && !(I.sp > B.time)) {
      I.sp = B.time + 0.1;
      B.zones.push({
        kind: 'oil',
        x: ox + Math.cos(fa) * 14,
        y: oy + Math.sin(fa) * 14,
        r: rnd(20, 28),
        life: 20 * (1 + (v.aura.slickLife || 0)),
        own: v.idx
      });
    }
    if (edge && I.m.spray === 'banana' && !(I.sp > B.time)) {
      I.sp = B.time + 1;
      B.zones.push({
        kind: 'banana',
        x: ox + Math.cos(fa) * 16,
        y: oy + Math.sin(fa) * 16,
        r: 14,
        life: 25,
        a: rnd(0, 6),
        own: v.idx
      });
      sfx('splat', ox, oy);
    }
    if (
      edge &&
      I.m.spray === 'mine' &&
      !(I.sp > B.time) &&
      B.zones.filter(z => z.kind === 'mine' && z.own === v.idx).length < 4
    ) {
      I.sp = B.time + 0.6;
      B.zones.push({
        kind: 'mine',
        x: ox + Math.cos(fa) * 16,
        y: oy + Math.sin(fa) * 16,
        r: 14,
        life: 40,
        own: v.idx
      });
      sfx('thump', ox, oy);
    }
    if (edge && I.m.spray === 'glue' && v.glue > 0) {
      v.glue--;
      B.zones.push({
        kind: 'glue',
        x: ox + Math.cos(fa) * 24,
        y: oy + Math.sin(fa) * 24,
        r: 36,
        life: 25 * (1 + (v.aura.slickLife || 0)),
        own: v.idx
      });
      sfx('splat', ox, oy);
    }
  }
}
function counter(v) {
  if (v.dead || v.cmCd > 0) return;
  let used = false;
  if (v.has.smoke) {
    used = true;
    for (let i = 0; i < 3; i++)
      B.clouds.push({
        x: v.x + rnd(-30, 30),
        y: v.y + rnd(-30, 30),
        r: 110,
        life: CT(v, 'thicksmoke') ? 10 : 5,
        max: CT(v, 'thicksmoke') ? 10 : 5
      });
    sfx('smoke', v.x, v.y);
  }
  if (v.has.decoy) {
    used = true;
    const fa = v.a - Math.PI / 2;
    B.decoys.push({
      own: v.idx,
      x: v.x,
      y: v.y,
      a: v.a,
      vx: Math.cos(fa) * 240 + v.vx,
      vy: Math.sin(fa) * 240 + v.vy,
      life: 5
    });
  }
  if (v.has.jammer) {
    used = true;
    for (const e of others(v))
      if (Math.hypot(e.x - v.x, e.y - v.y) < 350) {
        e.jam = 4;
        txt(e.x, e.y - e.rad - 10, 'JAMMED', '#c58bff', 1.2);
      }
    for (const o of B.objs) if (o.kind === 'sentry' && Math.hypot(o.x - v.x, o.y - v.y) < 350) o.jam = 4;
    fx({ k: 'ring', x: v.x, y: v.y, life: 0.6, max: 0.6, r: 240, col: '197,139,255' });
    sfx('zap', v.x, v.y);
  }
  if (v.has.flare) {
    used = true;
    for (let k = 0; k < 3; k++) {
      const a = v.a + Math.PI / 2 + rnd(-0.8, 0.8),
        fl = { x: v.x + Math.cos(a) * 120, y: v.y + Math.sin(a) * 120 };
      for (let j = 0; j < 8; j++)
        fx({ k: 'fire', x: fl.x, y: fl.y, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 1.2, max: 1.2, r: 5 });
      for (const s of B.shots)
        if (
          s.own !== v.idx &&
          (s.kind === 'homing' || s.kind === 'rocket') &&
          Math.hypot(s.x - v.x, s.y - v.y) < 700 &&
          Math.random() < 0.7
        ) {
          s.kind = 'homing';
          s.tgt = { o: fl };
          s.life = Math.min(s.life, 1.6);
        }
    }
    txt(v.x, v.y - v.rad - 10, 'FLARES', '#ff8a3a', 0.9);
    sfx('whoosh', v.x, v.y);
  }
  if (v.has.emp) {
    used = true;
    for (const e of others(v))
      if (Math.hypot(e.x - v.x, e.y - v.y) < 330) {
        e.emp = 2.5;
        for (const I of e.shields)
          if (I.sh > 0) {
            I.sh = 0;
            I.shCd = 4;
          }
        txt(e.x, e.y - e.rad - 10, 'EMP', '#7fe0ff', 1.2);
      }
    for (const o of B.objs) if (o.kind === 'sentry' && Math.hypot(o.x - v.x, o.y - v.y) < 330) o.stun = 2.5;
    fx({ k: 'ring', x: v.x, y: v.y, life: 0.6, max: 0.6, r: 230, col: '127,224,255' });
    sfx('zap', v.x, v.y);
  }
  if (v.has.flashbang) {
    used = true;
    for (const e of others(v))
      if (Math.hypot(e.x - v.x, e.y - v.y) < 380) {
        e.blind = 2.5;
        txt(e.x, e.y - e.rad - 10, 'BLINDED', '#ffffff', 1.2);
      }
    fx({ k: 'flash', x: v.x, y: v.y, life: 0.25, max: 0.25, r: 300, col: '#ffffff' });
    sfx('boom', v.x, v.y);
  }
  if (used) v.cmCd = 10 + (CT(v, 'thicksmoke') ? 5 : 0) + (v.has.emp ? 4 : 0);
}
function horn(v) {
  if (v.dead || !v.has.horn || v.hornCd > 0) return;
  v.hornCd = 8;
  fx({ k: 'ring', x: v.x, y: v.y, life: 0.5, max: 0.5, r: 220, col: '255,230,120' });
  txt(v.x, v.y - v.rad - 10, 'HONK!', '#ffe27a', 1);
  sfx('horn', v.x, v.y);
  for (const e of others(v))
    if (Math.hypot(e.x - v.x, e.y - v.y) < 320) {
      e.jam = Math.max(e.jam, 1.5);
      txt(e.x, e.y - e.rad - 10, '?!', '#ffe27a', 1);
    }
  for (const o of B.objs) {
    const d = Math.hypot(o.x - v.x, o.y - v.y);
    if (o.kind === 'sentry' && d < 320) o.stun = 1.5;
    if ((o.kind === 'duck' || o.kind === 'goldduck') && d < 500) txt(o.x, o.y - 18, 'QUACK', '#f6d33c', 1);
    if (!o.fixed && d < 160 && o.m < 3) {
      o.vx += ((o.x - v.x) / (d || 1)) * 200;
      o.vy += ((o.y - v.y) / (d || 1)) * 200;
    }
  }
}
function blink(v) {
  if (v.dead || !v.has.blink || v.blinkCd > 0 || v.flip > 0) return;
  const fa = v.a - Math.PI / 2,
    nx = v.x + Math.cos(fa) * 180,
    ny = v.y + Math.sin(fa) * 180;
  if (
    nx < WM + v.rad ||
    nx > AW - WM - v.rad ||
    ny < WM + v.rad ||
    ny > AH - WM - v.rad ||
    B.st.some(s => circRectDist(nx, ny, s) < v.rad * 0.6)
  ) {
    txt(v.x, v.y - 30, 'BLOCKED', '#c58bff', 0.6);
    return;
  }
  for (const [x, y] of [
    [v.x, v.y],
    [nx, ny]
  ]) {
    fx({ k: 'ring', x, y, life: 0.4, max: 0.4, r: 50, col: '197,139,255' });
    spark(x, y, 10, '#e0c8ff');
  }
  v.x = nx;
  v.y = ny;
  v.blinkCd = 6;
  v.w += rnd(-1, 1);
  sfx('tele', nx, ny);
}
function boosters(v) {
  if (!v.boostKey || v.flip > 0) return;
  for (const I of v.insts) {
    if (!I.alive || !I.m.booster) continue;
    if (!(I.bcd > B.time)) {
      I.bcd = B.time + (I.m.nitro ? 9 : 2.5) * (1 - (v.aura.airCd || 0));
      I.bon = I.m.nitro ? 1.4 : CT(v, 'afterburner') ? 0.7 : 0.35;
      sfx('boost', v.x, v.y);
    }
  }
}
function tickBoost(v, dt) {
  for (const I of v.insts) {
    if (!I.alive || !I.m.booster || !(I.bon > 0)) continue;
    I.bon -= dt;
    const fa = faceAng(v, I),
      [px, py] = ipos(v, I),
      F = I.m.nitro ? 8000 : 5200,
      spinK = CT(v, 'afterburner') ? 1.5 : 1;
    v.vx += ((Math.cos(fa) * F) / v.c.mass) * dt;
    v.vy += ((Math.sin(fa) * F) / v.c.mass) * dt;
    const rx = px - v.x,
      ry = py - v.y;
    v.w += (((rx * Math.sin(fa) - ry * Math.cos(fa)) * F) / v.I) * dt * spinK;
    B.fx.push({
      k: 'fire',
      x: px - Math.cos(fa) * S * 0.8,
      y: py - Math.sin(fa) * S * 0.8,
      vx: -Math.cos(fa) * 220 + rnd(-30, 30),
      vy: -Math.sin(fa) * 220 + rnd(-30, 30),
      life: 0.22,
      max: 0.3,
      r: 5
    });
  }
}
function jump(v) {
  if (v.z > 0 || v.flip > 0 || v.jumpCd > 0 || !v.has.jump || v.anchored) return;
  let off = 0;
  for (const I of v.insts) if (I.alive && I.m.jump) off += I.gcx * S - v.comX;
  v.vz =
    Math.min(560, (330 + 70 * (v.has.jump - 1)) * Math.sqrt(25 / Math.max(10, v.c.mass))) *
    (CT(v, 'moonboots') ? 1.5 : 1);
  v.z = 1;
  v.w += off * 0.004;
  v.jumpCd = 3.5 * (1 - (v.aura.airCd || 0));
  sfx('jump', v.x, v.y);
  for (const I of v.insts)
    if (I.alive && I.m.jump) {
      const [px, py] = ipos(v, I);
      for (let i = 0; i < 8; i++)
        fx({ k: 'fire', x: px, y: py, vx: rnd(-90, 90), vy: rnd(-90, 90), life: 0.3, max: 0.4, r: 6 });
    }
}
function release(v) {
  for (const I of v.insts.filter(I => I.alive && I.m.coupler)) {
    const [x, y] = ipos(v, I);
    spark(x, y, 12, '#f2b705');
    txt(x, y - 20, 'RELEASED', '#f2b705', 0.8);
    killInst(v, I, true);
  }
}
function ballStep(v, dt) {
  const b = v.ball;
  if (!b || !b.inst.alive) return;
  const [ax_, ay_] = ipos(v, b.inst),
    L = S * 2.8,
    bm = 5;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.vx *= Math.exp(-0.8 * dt);
  b.vy *= Math.exp(-0.8 * dt);
  const dx = b.x - ax_,
    dy = b.y - ay_,
    d = Math.hypot(dx, dy);
  if (d > L) {
    const nx = dx / d,
      ny = dy / d;
    b.x = ax_ + nx * L;
    b.y = ay_ + ny * L;
    const rv = (b.vx - v.vx) * nx + (b.vy - v.vy) * ny;
    if (rv > 0) {
      const M = v.c.mass,
        j = ((rv * bm * M) / (bm + M)) * (CT(v, 'heavyball') ? 1.4 : 1);
      b.vx -= (nx * j) / bm;
      b.vy -= (ny * j) / bm;
      impulse(v, nx * j, ny * j, ax_, ay_);
    }
  }
  if (b.x < WM + 10 || b.x > AW - WM - 10) {
    b.vx *= -0.6;
    b.x = clamp(b.x, WM + 10, AW - WM - 10);
  }
  if (b.y < WM + 10 || b.y > AH - WM - 10) {
    b.vy *= -0.6;
    b.y = clamp(b.y, WM + 10, AH - WM - 10);
  }
  const sp = Math.hypot(b.vx - v.vx, b.vy - v.vy),
    dmgK = CT(v, 'heavyball') ? 1.6 : 1;
  for (const e of others(v)) {
    if (e.dead) continue;
    const bl = carBlockAt(e, b.x, b.y, 11);
    if (bl && sp > 90 && !(b.cd > B.time)) {
      b.cd = B.time + 0.25;
      hitCarBlock(e, bl, sp * 0.16 * dmgK, 'melee', b.x, b.y, undefined, undefined, v.idx);
      impulse(e, b.vx * bm, b.vy * bm, b.x, b.y);
      spark(b.x, b.y, 10);
      sfx('clang', b.x, b.y);
      b.vx *= -0.4;
      b.vy *= -0.4;
      B.shake = Math.max(B.shake, 4);
    }
  }
  for (const o of B.objs) {
    if (o.dead || o.z > 20) continue;
    const ex = o.x - b.x,
      ey = o.y - b.y,
      dd = Math.hypot(ex, ey);
    if (dd < o.r + 11) {
      const nx = ex / (dd || 1),
        ny = ey / (dd || 1);
      if (sp > 90 && !(o.ballCd > B.time)) {
        o.ballCd = B.time + 0.25;
        dmgObj(o, sp * 0.16 * dmgK, 'melee', v.idx);
        spark(b.x + nx * 11, b.y + ny * 11, 8);
        B.shake = Math.max(B.shake, 3);
      }
      if (!o.fixed) {
        o.vx += (nx * sp * bm) / (o.m + bm);
        o.vy += (ny * sp * bm) / (o.m + bm);
      }
      b.vx -= nx * sp * 0.5;
      b.vy -= ny * sp * 0.5;
      b.x = o.x - nx * (o.r + 11);
      b.y = o.y - ny * (o.r + 11);
    }
  }
}
function tetherStep(v, dt) {
  const t = v.tether;
  if (!t) return;
  const tgt = t.car || t.obj;
  if (!t.inst.alive || tgt.dead || (t.life -= dt) <= 0) {
    v.tether = null;
    return;
  }
  const [px, py] = ipos(v, t.inst);
  if (v.rmb) t.len = Math.max(40, t.len - dt * 260 * (CT(v, 'winch') ? 2 : 1) * (1 + (v.aura.tether || 0)));
  const dx = tgt.x - px,
    dy = tgt.y - py,
    d = Math.hypot(dx, dy);
  if (d > t.len) {
    const nx = dx / d,
      ny = dy / d,
      ex = d - t.len,
      M = v.c.mass * (v.anchored ? 10 : 1),
      om = t.car ? t.car.c.mass * (t.car.anchored ? 10 : 1) : tgt.fixed ? 1e6 : tgt.m,
      tot = M + om;
    if (!tgt.fixed) {
      tgt.x -= (nx * ex * M) / tot;
      tgt.y -= (ny * ex * M) / tot;
    }
    v.x += (nx * ex * om) / tot;
    v.y += (ny * ex * om) / tot;
    const rv = (tgt.vx - v.vx) * nx + (tgt.vy - v.vy) * ny;
    if (rv > 0) {
      const j = rv / (1 / M + 1 / om);
      if (t.car) impulse(t.car, -nx * j, -ny * j, tgt.x, tgt.y, true);
      else if (!tgt.fixed) {
        tgt.vx -= (nx * j) / om;
        tgt.vy -= (ny * j) / om;
      }
      impulse(v, nx * j, ny * j, px, py);
    }
  }
}

/* =================== PROJECTILES =================== */
function hitCar(v, s) {
  if (s.kind === 'rocket' || s.kind === 'homing')
    for (const I of v.insts) {
      if (!I.alive || !I.m.screen) continue;
      const [x, y] = ipos(v, I);
      if (Math.hypot(x - s.x, y - s.y) < S * 1.7) {
        hurtInst(v, I, s.dmg, 'expl', undefined, undefined, undefined, undefined, s.own);
        boom(s.x, s.y, 0.7);
        return true;
      }
    }
  const dC = Math.hypot(v.x - s.x, v.y - s.y);
  if (dC > v.rad + 16) return false;
  if (dC > v.rad - 4 && v.shields.some(I => I.alive && I.m.bubble && I.sh > 0) && s.kind !== 'water') {
    shieldBlock(v, s.x, s.y, s.dmg);
    return true;
  }
  if (dC > v.rad + 8) return false;
  const hb = carBlockAt(v, s.x, s.y, s.kind === 'flame' || s.kind === 'water' ? 5 : 1);
  let hs = null;
  if (!hb)
    for (const st of v.stuck) {
      const [x, y] = lpos(v, st.gx, st.gy);
      if (Math.hypot(x - s.x, y - s.y) < st.r) {
        hs = st;
        break;
      }
    }
  if (!hb && !hs) return false;
  const sp = Math.hypot(s.vx, s.vy) || 1;
  if (s.kind === 'water') {
    impulse(v, (s.vx / sp) * s.push * 6, (s.vy / sp) * s.push * 6, s.x, s.y);
    for (const I of v.insts) I.burn = 0;
    return true;
  }
  if (s.kind === 'sticky' && hb) {
    const [gxp, gyp] = toLocal(v, s.x, s.y);
    B.bombs.push({ car: v.idx, gx: gxp, gy: gyp, t: 1.6, dmg: s.dmg, splash: s.splash, own: s.own });
    sfx('splat', s.x, s.y);
    return true;
  }
  if (shieldBlock(v, s.x, s.y, s.dmg)) {
  } else if (s.splash) explode(s.x, s.y, s.splash, s.dmg, s.dt, s.own, s.big);
  else if (hs) {
    hs.hp -= s.dmg;
    spark(s.x, s.y, 3);
  } else {
    hitCarBlock(v, hb, s.dmg, s.dt, s.x, s.y, s.vx / sp, s.vy / sp, s.own);
    if (s.kind !== 'flame') spark(s.x, s.y, s.kind === 'shell' ? 7 : 3, s.dt === 'energy' ? '#bff' : null);
    if (s.kind === 'shell' || s.kind === 'bounce')
      impulse(
        v,
        (s.vx / sp) * s.dmg * 4 * (s.knock || 1) * (s.knockK || 1),
        (s.vy / sp) * s.dmg * 4 * (s.knock || 1) * (s.knockK || 1),
        s.x,
        s.y
      );
    if (s.freeze) {
      v.frozen = Math.max(v.frozen, s.freeze);
      txt(v.x, v.y - v.rad - 8, 'FROZEN', '#cfefff', 0.6);
    }
    if (s.kind === 'harpoon') {
      const o = B.cars[s.own];
      const I = o && o.insts[s.inst];
      if (I && I.alive) {
        o.tether = {
          inst: I,
          car: v,
          len: Math.hypot(v.x - o.x, v.y - o.y),
          life: 6 * (1 + (o.aura.tether || 0))
        };
        txt(v.x, v.y - v.rad - 10, 'HOOKED', '#f2b705', 0.8);
      }
    }
  }
  return true;
}
function stepShots(dt) {
  for (let i = B.shots.length - 1; i >= 0; i--) {
    const s = B.shots[i];
    B.hitSrc = s.src || null;
    if (s.dead) {
      B.shots.splice(i, 1);
      continue;
    }
    if (s.delay > 0) {
      s.delay -= dt;
      continue;
    }
    let dead = false;
    if (s.kind === 'rocket' || s.kind === 'homing') {
      const sp = Math.hypot(s.vx, s.vy),
        ns = Math.min(680, sp * (1 + 1.4 * dt));
      const tg = s.tgt;
      let tx = null,
        ty = null;
      if (tg) {
        if (tg.car && !tg.car.dead && !inSmoke(tg.car.x, tg.car.y)) {
          const dec = B.decoys.find(d => d.own === tg.car.idx);
          if (dec) {
            tx = dec.x;
            ty = dec.y;
          } else {
            tx = tg.car.x;
            ty = tg.car.y;
          }
        } else if (tg.o && !tg.o.dead) {
          tx = tg.o.x;
          ty = tg.o.y;
        }
      }
      if (s.kind === 'homing' && tx !== null) {
        const a = Math.atan2(s.vy, s.vx),
          w = Math.atan2(ty - s.y, tx - s.x),
          na = a + clamp(wrap(w - a), -3.2 * dt, 3.2 * dt);
        s.vx = Math.cos(na) * ns;
        s.vy = Math.sin(na) * ns;
      } else {
        s.vx *= ns / sp;
        s.vy *= ns / sp;
      }
      if (Math.random() < 0.6)
        fx({ k: 'smoke', x: s.x, y: s.y, vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.5, max: 0.6, r: 4 });
    }
    if (s.kind === 'junk') {
      const a = Math.atan2(s.vy, s.vx) + s.curve * dt,
        sp = Math.hypot(s.vx, s.vy);
      s.vx = Math.cos(a) * sp;
      s.vy = Math.sin(a) * sp;
      s.ang += s.spin * dt;
    }
    if (s.kind === 'bounce') s.ang += dt * 14;
    for (let k = 0; k < 2 && !dead; k++) {
      const ox = s.x,
        oy = s.y;
      s.x += (s.vx * dt) / 2;
      s.y += (s.vy * dt) / 2;
      const wall = s.x < WM || s.x > AW - WM || s.y < WM || s.y > AH - WM || B.st.some(t => inRect(s.x, s.y, t));
      if (wall) {
        if (s.kind === 'bounce' && s.bounces > 0) {
          s.bounces--;
          const hx = s.x < WM || s.x > AW - WM || B.st.some(t => inRect(s.x, oy, t)),
            hy = s.y < WM || s.y > AH - WM || B.st.some(t => inRect(ox, s.y, t));
          s.x = ox;
          s.y = oy;
          if (hx) s.vx *= -1;
          if (hy) s.vy *= -1;
          if (!hx && !hy) {
            s.vx *= -1;
            s.vy *= -1;
          }
          spark(s.x, s.y, 4);
          s.ignore = null;
          continue;
        }
        dead = true;
        hitGround(s);
        break;
      }
      for (const v of B.cars) {
        if (v.dead || v.idx === s.own || v.z >= 30 || v === s.ignore) continue;
        if (hitCar(v, s)) {
          if (s.kind === 'bounce' && s.bounces-- > 0) {
            s.vx *= -0.8;
            s.vy *= -0.8;
            s.ignore = v;
            break;
          }
          dead = true;
          break;
        }
      }
      if (dead) break;
      for (const o of B.objs) {
        if (o.dead || o.z > 30 || o === s.ignore) continue;
        if (
          Math.hypot(o.x - s.x, o.y - s.y) <
          o.r + (s.kind === 'flame' || s.kind === 'water' ? 6 : s.kind === 'bounce' ? 7 : 2)
        ) {
          if (s.kind === 'water') {
            if (!o.fixed) {
              const sp = Math.hypot(s.vx, s.vy) || 1;
              o.vx += ((s.vx / sp) * s.push * 5) / Math.max(0.5, o.m);
              o.vy += ((s.vy / sp) * s.push * 5) / Math.max(0.5, o.m);
            }
            o.burn = 0;
            dmgObj(o, s.dmg, 'kin', s.own);
            dead = true;
            break;
          }
          if (s.kind === 'sticky') {
            B.bombs.push({
              obj: o,
              ox: s.x - o.x,
              oy: s.y - o.y,
              t: 1.6,
              dmg: s.dmg,
              splash: s.splash,
              own: s.own
            });
            dead = true;
            break;
          }
          if (s.kind === 'bounce') {
            dmgObj(o, s.dmg, 'kin', s.own);
            if (!o.fixed) {
              o.vx += ((s.vx * 0.5) / Math.max(0.6, o.m)) * 3;
              o.vy += ((s.vy * 0.5) / Math.max(0.6, o.m)) * 3;
            }
            spark(s.x, s.y, 5);
            s.ignore = o;
            if (s.bounces-- > 0) {
              s.vx *= -0.8;
              s.vy *= -0.8;
              break;
            }
            dead = true;
            break;
          }
          dead = true;
          if (s.splash) explode(s.x, s.y, s.splash, s.dmg, s.dt, s.own, s.big);
          else {
            dmgObj(o, s.dmg, s.dt, s.own);
            if (s.kind !== 'flame') spark(s.x, s.y, s.kind === 'shell' ? 7 : 3, s.dt === 'energy' ? '#bff' : null);
            if (s.kind === 'harpoon') {
              const c = B.cars[s.own],
                I = c && c.insts[s.inst];
              if (I && I.alive) {
                c.tether = {
                  inst: I,
                  obj: o,
                  len: Math.hypot(o.x - c.x, o.y - c.y),
                  life: 6 * (1 + (c.aura.tether || 0))
                };
                txt(o.x, o.y - 24, 'HOOKED', '#f2b705', 0.8);
              }
            }
            if (s.kind === 'junk') hitGround(s);
            if (s.freeze) o.frozen = Math.max(o.frozen, s.freeze * 1.5);
            if (s.kind !== 'flame' && !o.fixed) {
              const k = (s.dmg * 1.5 * (s.knock || 1)) / Math.max(0.5, o.m),
                sp = Math.hypot(s.vx, s.vy) || 1;
              o.vx += (s.vx / sp) * k;
              o.vy += (s.vy / sp) * k;
            }
          }
          break;
        }
      }
    }
    s.life -= dt;
    if (s.life <= 0 && !dead) {
      dead = true;
      hitGround(s);
    }
    if (dead) B.shots.splice(i, 1);
  }
  for (let i = B.bombs.length - 1; i >= 0; i--) {
    const b = B.bombs[i];
    B.hitSrc = 'sticky';
    b.t -= dt;
    if (b.obj && !b.obj.dead) {
      b.x = b.obj.x + b.ox;
      b.y = b.obj.y + b.oy;
    }
    if (b.car != null) {
      const c = B.cars[b.car];
      if (c && !c.dead) {
        [b.x, b.y] = lpos(c, b.gx, b.gy);
      }
    }
    if (b.t <= 0) {
      B.bombs.splice(i, 1);
      explode(b.x, b.y, b.splash, b.dmg, 'expl', b.own);
    }
  }
  for (let i = B.lobs.length - 1; i >= 0; i--) {
    const l = B.lobs[i];
    B.hitSrc = l.src || null;
    if (l.dead) {
      B.lobs.splice(i, 1);
      continue;
    }
    l.t += dt;
    if (l.t >= l.T) {
      B.lobs.splice(i, 1);
      let screened = false;
      for (const v of B.cars) {
        if (v.dead || v.idx === l.own) continue;
        const sc = v.insts.find(
          I => I.alive && I.m.screen && Math.hypot(ipos(v, I)[0] - l.tx, ipos(v, I)[1] - l.ty) < S * 2.2
        );
        if (sc) {
          hurtInst(v, sc, l.dmg, 'expl', undefined, undefined, undefined, undefined, l.own);
          boom(l.tx, l.ty, 0.8);
          screened = true;
          break;
        }
      }
      if (screened) continue;
      if (l.cluster) {
        explode(l.tx, l.ty, l.splash * 0.7, l.dmg, l.dt, l.own);
        for (let k = 0; k < l.cluster; k++) {
          const a = rnd(0, 7),
            r = rnd(30, 90);
          B.lobs.push({
            own: l.own,
            sx: l.tx,
            sy: l.ty,
            tx: l.tx + Math.cos(a) * r,
            ty: l.ty + Math.sin(a) * r,
            t: 0,
            T: rnd(0.25, 0.45),
            dmg: l.dmg,
            splash: l.splash,
            dt: l.dt,
            col: '#8a9299',
            small: 1
          });
        }
      } else {
        explode(l.tx, l.ty, l.splash, l.dmg, l.dt, l.own);
        if (l.napalm) B.zones.push({ kind: 'fire', x: l.tx, y: l.ty, r: l.splash * 1.3, life: 5, dps: 28, own: l.own });
      }
    }
  }
  for (let i = B.zones.length - 1; i >= 0; i--) {
    const z = B.zones[i];
    if (z.life === undefined) continue;
    z.life -= dt;
    if (z.kind === 'fire' && Math.random() < dt * 14)
      B.fx.push({
        k: 'fire',
        x: z.x + rnd(-z.r, z.r) * 0.7,
        y: z.y + rnd(-z.r, z.r) * 0.7,
        vx: rnd(-10, 10),
        vy: rnd(-40, -10),
        life: 0.5,
        max: 0.6,
        r: rnd(4, 8)
      });
    if (z.kind === 'geyser' && Math.random() < dt * 30)
      B.fx.push({
        k: 'water',
        x: z.x + rnd(-12, 12),
        y: z.y + rnd(-12, 12),
        vx: rnd(-80, 80),
        vy: rnd(-180, -60),
        life: 0.6,
        max: 0.6,
        r: rnd(3, 6)
      });
    if (z.life <= 0) B.zones.splice(i, 1);
  }
  B.hitSrc = null;
}
function hitGround(s) {
  if (s.splash && s.kind !== 'sticky') explode(s.x, s.y, s.splash, s.dmg, s.dt, s.own, s.big);
  else if (s.kind === 'sticky') B.bombs.push({ x: s.x, y: s.y, t: 1.6, dmg: s.dmg, splash: s.splash, own: s.own });
  else if (s.kind === 'junk') {
    const it = s.item;
    if (it.explode) {
      explode(s.x, s.y, it.explode.r, it.explode.dmg, 'expl', s.own);
      return;
    }
    const o = mkObj(JUNK[it.kind] || PROPS[it.kind] ? it.kind : 'crate', s.x, s.y);
    if (it.kind === 'part') {
      o.kind = 'part';
      o.id = it.id;
    }
    o.hp = o.max = Math.max(10, it.hp * 0.7);
    o.vx = s.vx * 0.2;
    o.vy = s.vy * 0.2;
    B.objs.push(o);
  } else if (s.kind !== 'flame' && s.kind !== 'water') spark(s.x, s.y, 3);
}
