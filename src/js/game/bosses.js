// Boss cars (Scrap Gauntlet): a health bar across the top and three phases.
// At 2/3 and 1/3 health a boss gets angrier: faster weapons, more speed.
const carHealth = v => {
  let a = 0;
  for (const I of v.insts) if (I.alive) a += Math.max(0, I.hp);
  return v.total ? a / v.total : 0;
};
function bossTick(dt = 1 / 60) {
  if (!B || B.seq !== 'play' || B.demo || B.replay) return;
  const v = B.cars.find(c => c.boss);
  if (!v || v.dead) return;
  const hp = carHealth(v);
  v.phase = v.phase || 1;
  if (v.bossGim) bossGimmick(v, dt);
  const want = hp < 0.34 ? 3 : hp < 0.67 ? 2 : 1;
  if (want > v.phase) {
    v.phase = want;
    v.rateMul = (v.rateMul || 1) * 1.25;
    v.c.topCap *= 1.08;
    v.c.accel *= 1.12;
    B.banner = {
      text: want === 3 ? 'FINAL PHASE' : 'PHASE 2',
      col: '#ff5c7a',
      t: 2.2,
      sub: v.name + ' is getting angry'
    };
    sfx('alarm');
    B.shake = Math.max(B.shake || 0, 8);
    commentate('phase', { car: v, n: want });
  }
}
function drawBossBar(c) {
  if (!B) return;
  const v = B.cars.find(x => x.boss);
  if (!v) return;
  const w = Math.min(560, view.w * 0.5),
    x = view.w / 2 - w / 2,
    y = 92,
    hp = v.dead ? 0 : carHealth(v);
  c.save();
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(10,16,32,.86)';
  c.fillRect(x - 10, y - 22, w + 20, 40);
  c.font = '700 13px "Chakra Petch", sans-serif';
  c.fillStyle = '#ff5c7a';
  c.textAlign = 'left';
  c.fillText(`BOSS · PHASE ${v.phase || 1}/3`, x, y - 6);
  c.fillStyle = '#e6f1ff';
  c.textAlign = 'right';
  c.fillText(v.name, x + w, y - 6);
  for (let i = 0; i < 3; i++) {
    const sx = x + (i * w) / 3 + (i ? 3 : 0),
      sw = w / 3 - 3,
      seg = clamp((hp - (2 - i) / 3) * 3, 0, 1);
    c.fillStyle = '#2b1b22';
    c.fillRect(sx, y, sw, 9);
    c.fillStyle = '#ff5c7a';
    c.fillRect(sx, y, sw * seg, 9);
  }
  c.restore();
}

/* ---------- boss gimmicks ----------
   Each runs on the host inside bossTick. Telegraphs (red lines, circles, rings) always come first, so every
   attack can be dodged. Drawn in world space by drawBossWorld. */
const bossFx = () => (B.bossFx = B.bossFx || []);
function bossGimmick(v, dt) {
  const foe = enemyOf(v);
  if (!foe || foe.dead) return;
  const gim = v.bossGim,
    rage = v.phase || 1;
  v.gimT = (v.gimT ?? 3) - dt * (0.8 + 0.2 * rage); // angrier bosses use their trick more often
  const dx = foe.x - v.x,
    dy = foe.y - v.y,
    d = Math.hypot(dx, dy) || 1;
  const L = bossFx();
  const ready = () => {
    if (v.gimT > 0) return false;
    return true;
  };
  if (gim === 'charge') {
    if (v.chargeT > 0) {
      v.chargeT -= dt;
      if (v.chargeT <= 0) {
        v.vx = (v.chargeDx || 0) * 950;
        v.vy = (v.chargeDy || 0) * 950;
        v.gRamOut = (v.gRamOut || 0) + 0.3;
        v.chargeEnd = B.time + 0.9;
        sfx('boost', v.x, v.y);
        B.shake = Math.max(B.shake || 0, 6);
      }
    } else if (v.chargeEnd && B.time > v.chargeEnd) {
      v.gRamOut = Math.max(0, (v.gRamOut || 0) - 0.3);
      v.chargeEnd = 0;
    } else if (ready()) {
      v.gimT = 7;
      v.chargeT = 0.9;
      v.chargeDx = dx / d;
      v.chargeDy = dy / d;
      L.push({ k: 'line', x: v.x, y: v.y, tx: v.x + (dx / d) * 900, ty: v.y + (dy / d) * 900, t: 0.9, max: 0.9 });
      txt(v.x, v.y - 40, 'CHARGE!', '#ff5c7a', 0.9);
    }
  } else if (gim === 'shield') {
    if (v.shieldEnd && B.time > v.shieldEnd) {
      v.dmgIn = v.baseDmgIn ?? 1;
      v.shieldEnd = 0;
      txt(v.x, v.y - 40, 'SHIELD DOWN', '#5be7ff', 0.8);
    } else if (!v.shieldEnd && ready()) {
      v.gimT = 10;
      v.baseDmgIn = v.dmgIn ?? 1;
      v.dmgIn = (v.baseDmgIn || 1) * 0.15;
      v.shieldEnd = B.time + 3;
      txt(v.x, v.y - 40, 'SHIELD UP', '#5be7ff', 0.8);
      sfx('charge', v.x, v.y);
    }
  } else if (gim === 'magnet') {
    if (v.pullEnd && B.time < v.pullEnd) {
      if (d < 700) {
        foe.vx -= (dx / d) * 520 * dt;
        foe.vy -= (dy / d) * 520 * dt;
      }
    } else if (ready()) {
      v.gimT = 8;
      v.pullEnd = B.time + 1.8;
      L.push({ k: 'pull', car: v, t: 1.8, max: 1.8 });
      txt(v.x, v.y - 40, 'MAGNET', '#ff8a3a', 0.8);
      sfx('hum', v.x, v.y);
    }
  } else if (gim === 'barrage') {
    if (ready()) {
      v.gimT = 9;
      for (let i = 0; i < 2 + rage; i++)
        L.push({ k: 'strike', x: foe.x + foe.vx * 0.8 + rnd(-140, 140), y: foe.y + foe.vy * 0.8 + rnd(-140, 140), r: 80, t: 1.3 + i * 0.15, max: 1.3 + i * 0.15, own: v.idx });
      txt(v.x, v.y - 40, 'INCOMING!', '#4ea1ff', 0.9);
      sfx('alarm', foe.x, foe.y);
    }
  } else if (gim === 'pyro') {
    v.dropT = (v.dropT || 0) - dt;
    if (v.dropT <= 0 && Math.hypot(v.vx, v.vy) > 60) {
      v.dropT = 0.9 / rage;
      L.push({ k: 'fire', x: v.x - (v.vx / (Math.hypot(v.vx, v.vy) || 1)) * v.rad, y: v.y - (v.vy / (Math.hypot(v.vx, v.vy) || 1)) * v.rad, r: 42, t: 6, max: 6, own: v.idx });
    }
  } else if (gim === 'quake') {
    if (ready()) {
      v.gimT = 8;
      L.push({ k: 'quake', car: v, r: 320, t: 1.1, max: 1.1, own: v.idx });
      txt(v.x, v.y - 40, 'GROUND SLAM', '#c9ced3', 0.9);
    }
  } else if (gim === 'ghost') {
    if (v.fire || (v.lastHitT && B.time - v.lastHitT < 1)) v.seenT = B.time;
    v.ghostA = clamp(1 - (B.time - (v.seenT || 0) - 0.6) / 0.5, 0.12, 1);
  } else if (gim === 'regen') {
    if (!v.lastHitT || B.time - v.lastHitT > 2)
      for (const I of v.insts) if (I.alive && I.hp < I.max) I.hp = Math.min(I.max, I.hp + I.max * 0.015 * dt);
  } else if (gim === 'mines') {
    if (ready()) {
      v.gimT = 6;
      for (let i = 0; i < 2 + rage; i++) {
        const a = Math.random() * Math.PI * 2,
          r = rnd(120, 260);
        L.push({ k: 'mine', x: clamp(foe.x + Math.cos(a) * r, 60, AW - 60), y: clamp(foe.y + Math.sin(a) * r, 60, AH - 60), r: 70, t: 14, max: 14, arm: 1, own: v.idx });
      }
      txt(v.x, v.y - 40, 'MINES!', '#ffd257', 0.8);
    }
  } else if (gim === 'storm') {
    if (ready()) {
      v.gimT = 6;
      for (let i = 0; i < 1 + rage; i++) {
        const side = Math.floor(Math.random() * 4),
          x = side === 0 ? 40 : side === 1 ? AW - 40 : rnd(80, AW - 80),
          y = side === 2 ? 40 : side === 3 ? AH - 40 : rnd(80, AH - 80);
        try {
          const o = mkObj(pick(['couch', 'piano', 'fridge', 'tire', 'barrel'].filter(k => JUNK[k] || PROPS[k])), x, y, 0);
          const tx = foe.x - x,
            ty = foe.y - y,
            td = Math.hypot(tx, ty) || 1;
          o.vx = (tx / td) * 760;
          o.vy = (ty / td) * 760;
          B.objs.push(o);
        } catch (e) {}
      }
      txt(v.x, v.y - 40, 'INCOMING JUNK', '#5be7ff', 0.8);
      sfx('whoosh', v.x, v.y);
    }
  } else if (gim === 'enrage') {
    v.dmgOut = (v.enrageBase ??= v.dmgOut || 1) * (1 + (1 - carHealth(v)) * 0.7);
  }
  // effects that land
  for (const f of L) {
    f.t -= dt;
    if (f.k === 'strike' && f.t <= 0 && !f.done) {
      f.done = 1;
      explode(f.x, f.y, f.r, 38, 'expl', f.own, true);
    } else if (f.k === 'quake' && f.t <= 0 && !f.done) {
      f.done = 1;
      B.shake = Math.max(B.shake || 0, 14);
      sfx('bigboom', f.car.x, f.car.y);
      for (const c of B.cars) {
        if (c === f.car || c.dead || teamOf(c) === teamOf(f.car)) continue;
        const qx = c.x - f.car.x,
          qy = c.y - f.car.y,
          qd = Math.hypot(qx, qy) || 1;
        if (qd > f.r) continue;
        c.vx += (qx / qd) * 760;
        c.vy += (qy / qd) * 760;
        const parts = c.insts.filter(I => I.alive && I.id !== 'cockpit');
        for (let i = 0; i < 3 && parts.length; i++) hurtInst(c, pick(parts), 26, 'kin', undefined, undefined, undefined, undefined, f.own);
      }
    } else if (f.k === 'fire') {
      for (const c of B.cars)
        if (!c.dead && teamOf(c) !== teamOf(B.cars[f.own] || c) && Math.hypot(c.x - f.x, c.y - f.y) < f.r && Math.random() < dt * 3) {
          const parts = c.insts.filter(I => I.alive && I.layer === 'b');
          if (parts.length) hurtInst(c, pick(parts), 6, 'fire', undefined, undefined, undefined, undefined, f.own);
        }
    } else if (f.k === 'mine' && !f.done) {
      f.arm -= dt;
      if (f.arm <= 0)
        for (const c of B.cars)
          if (!c.dead && teamOf(c) !== teamOf(B.cars[f.own] || c) && Math.hypot(c.x - f.x, c.y - f.y) < 46) {
            f.done = 1;
            explode(f.x, f.y, f.r, 42, 'expl', f.own, true);
            break;
          }
    }
  }
  B.bossFx = L.filter(f => f.t > -0.3 && !(f.done && f.k !== 'strike' && f.k !== 'quake'));
}
/** Telegraphs and hazards of the boss, drawn on the arena floor (world space). */
function drawBossWorld(c) {
  if (!B || !B.bossFx || !B.bossFx.length) return;
  c.save();
  for (const f of B.bossFx) {
    const k = clamp(1 - f.t / f.max, 0, 1);
    if (f.k === 'line' && f.t > 0) {
      c.strokeStyle = `rgba(255,92,122,${0.3 + 0.5 * k})`;
      c.lineWidth = 6 + 10 * k;
      c.setLineDash([18, 12]);
      c.beginPath();
      c.moveTo(f.x, f.y);
      c.lineTo(f.tx, f.ty);
      c.stroke();
      c.setLineDash([]);
    } else if (f.k === 'strike' && f.t > 0) {
      c.fillStyle = `rgba(255,70,70,${0.12 + 0.2 * k})`;
      c.beginPath();
      c.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ff5c5c';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(f.x, f.y, f.r * (1 - k * 0.9), 0, Math.PI * 2);
      c.stroke();
    } else if (f.k === 'quake' && f.t > 0) {
      c.strokeStyle = `rgba(230,236,245,${0.25 + 0.5 * k})`;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(f.car.x, f.car.y, f.r * k, 0, Math.PI * 2);
      c.stroke();
    } else if (f.k === 'pull' && f.t > 0) {
      c.strokeStyle = `rgba(255,138,58,${0.4 * Math.sin(ANIM * 20) + 0.4})`;
      c.lineWidth = 3;
      for (let i = 1; i <= 3; i++) {
        c.beginPath();
        c.arc(f.car.x, f.car.y, ((ANIM * 220 + i * 90) % 300) + 40, 0, Math.PI * 2);
        c.stroke();
      }
    } else if (f.k === 'fire') {
      const a = Math.min(1, f.t / 1.2);
      const g = c.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255,210,90,${0.55 * a})`);
      g.addColorStop(0.6, `rgba(255,90,30,${0.4 * a})`);
      g.addColorStop(1, 'rgba(255,60,20,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(f.x, f.y, f.r * (0.9 + 0.1 * Math.sin(ANIM * 9 + f.x)), 0, Math.PI * 2);
      c.fill();
    } else if (f.k === 'mine' && !f.done) {
      const blink = f.arm > 0 || Math.sin(ANIM * 10) > 0;
      c.fillStyle = '#3a3f46';
      c.beginPath();
      c.arc(f.x, f.y, 10, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = blink ? '#ff4d4d' : '#5a2020';
      c.beginPath();
      c.arc(f.x, f.y, 4, 0, Math.PI * 2);
      c.fill();
    }
  }
  // Grandma Tank's bubble
  for (const v of B.cars)
    if (v.boss && v.shieldEnd && B.time < v.shieldEnd) {
      c.strokeStyle = `rgba(91,231,255,${0.5 + 0.3 * Math.sin(ANIM * 8)})`;
      c.fillStyle = 'rgba(91,231,255,.08)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(v.x, v.y, v.rad + 18, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  c.restore();
}
