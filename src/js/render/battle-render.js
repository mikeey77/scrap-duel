// Battle rendering: cars, objects, zones, projectiles, effects and HUD.
/* =================== RENDER =================== */
/* ---------- part motion: every part reacts when it is used ----------
   Detected from state changes so it also works on online clients: a cooldown that jumps up,
   a rocket burst that ticks down, a dropper that fires, a car-wide ability that goes on cooldown. */
const CM_IDS = new Set(['smoke', 'decoy', 'flare', 'emp', 'flashbang', 'jammer']);
const FLASHLESS = new Set(['rocket', 'homing', 'lob', 'bounce', 'sticky', 'harpoon', 'tesla', 'arc']);
function partMotion(v) {
  const now = ANIM;
  // wheel roll: distance driven along the car's nose, so treads turn with the car (works from snapshots too)
  if (v._rx !== undefined) {
    const dx = v.x - v._rx,
      dy = v.y - v._ry;
    if (Math.abs(dx) + Math.abs(dy) < 80) v._roll = (v._roll || 0) + dx * Math.sin(v.a) - dy * Math.cos(v.a);
  }
  v._rx = v.x;
  v._ry = v.y;
  const carKick = (k, test) => {
    const val = v[k] || 0;
    if (v['_p' + k] !== undefined && val > v['_p' + k] + 0.05)
      for (const I of v.insts) if (I.alive && test(I)) I.kickT = now;
    v['_p' + k] = val;
  };
  carKick('cmCd', I => CM_IDS.has(I.id));
  carKick('hornCd', I => I.m.horn || I.id === 'airhorn');
  carKick('blinkCd', I => I.m.blink || I.id === 'blink');
  for (const I of v.insts) {
    if (!I.alive) continue;
    let fired = false;
    // (the first frame only records: nothing "fires" just because the round started)
    if (I._pcd !== undefined && I.cd > I._pcd + 0.02) fired = true;
    I._pcd = I.cd || 0;
    if (I._pb !== undefined && I.burst < I._pb) fired = true;
    I._pb = I.burst || 0;
    if (I._psp !== undefined && I.sp > I._psp + 0.05) fired = true;
    I._psp = I.sp || 0;
    if (I._ppc !== undefined && I.planCd > I._ppc + 0.05) fired = true;
    I._ppc = I.planCd || 0;
    if (fired) {
      I.kickT = now;
      const W = I.W;
      if (I.m.wpn && (!W || FLASHLESS.has(W.kind) || I.m.plan) && !SETTINGS.perf) {
        const [px, py] = ipos(v, I),
          a = I.ta !== undefined ? I.ta : v.a - Math.PI / 2 + ((I.rot || 0) * Math.PI) / 2,
          mx = px + Math.cos(a) * S * 0.8,
          my = py + Math.sin(a) * S * 0.8;
        fx({ k: 'flash', x: mx, y: my, life: 0.07, max: 0.07, r: 8, col: W && W.dt === 'energy' ? '#bff' : null });
        for (let i = 0; i < 3; i++)
          fx({
            k: 'smoke',
            x: mx,
            y: my,
            vx: Math.cos(a) * 40 + rnd(-25, 25),
            vy: Math.sin(a) * 40 + rnd(-25, 25),
            life: 0.45,
            max: 0.45,
            r: rnd(3, 5)
          });
      }
    }
    // continuous weapons shudder while they pour out fire, water or a beam
    const W = I.W;
    I.pour = !!((I.beam && I.beam.length) || (W && (W.kind === 'flame' || W.kind === 'water') && v.fire && !I.blocked));
  }
}
/* Parts that do not fill their cell (wheels, spikes, round guns…) must not get the dark hull plate
   behind them, or they sit in a black box. Measured once per part from its own art. */
const ART_COVER = {};
function solidPart(m) {
  if (ART_COVER[m.id] !== undefined) return ART_COVER[m.id];
  let cover = 1;
  try {
    const s = 32,
      n = 6,
      cv = document.createElement('canvas');
    cv.width = cv.height = s * n;
    const g = cv.getContext('2d');
    g.translate((s * n) / 2, (s * n) / 2);
    drawModule(g, m.id, s, 0, 'p', { builder: 1 });
    const d = g.getImageData(0, 0, s * n, s * n).data;
    let on = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 160) on++;
    if (d.length >= s * n * s * n * 4) cover = on / (cellCount(m) * s * s);
  } catch (e) {}
  return (ART_COVER[m.id] = cover > 0.82);
}
function kickOf(I) {
  if (I.pour) return 0.35 + Math.sin(ANIM * 70) * 0.2;
  return I.kickT !== undefined ? Math.max(0, 1 - (ANIM - I.kickT) / 0.14) : 0;
}
function drawVehicle(c, v, alpha) {
  const alive = v.insts.filter(I => I.alive);
  if (!alive.length) return;
  partMotion(v);
  const lift = 1 + v.z / 260,
    sh = 4 + v.z * 0.45 + (v.c.hoverMode ? 8 : 0),
    team = v.idx === B.me ? 'p' : 'e';
  if (alpha > 0.5) trailFx(v);
  const look = v.look || DEFAULT_STYLE;
  if (v.minGy === undefined) v.minGy = Math.min(...v.blocks.map(b => b.gy));
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(20,12,4,.3)';
  for (const b of v.blocks) {
    if (!b.inst.alive || !solidPart(b.inst.m)) continue;
    const [x, y] = bpos(v, b);
    c.save();
    c.translate(x + sh, y + sh);
    c.rotate(v.a);
    c.fillRect(-S / 2, -S / 2, S, S);
    c.restore();
  }
  // team ring under the car so you always know which one is yours
  if (B.cars.length > 1) {
    c.save();
    c.globalAlpha = alpha * 0.55;
    c.strokeStyle = v.paint;
    c.lineWidth = 3;
    c.setLineDash([8, 6]);
    c.lineDashOffset = -ANIM * 30;
    c.beginPath();
    c.arc(v.x, v.y, v.rad + 10, 0, 7);
    c.stroke();
    c.restore();
  }
  if (v.buff && v.buff.t > 0) {
    const P = POWERUPS[v.buff.p];
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = alpha * (0.35 + Math.sin(ANIM * 10) * 0.15) * Math.min(1, v.buff.t);
    c.strokeStyle = P.col;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(v.x, v.y, v.rad + 16, 0, 7);
    c.stroke();
    c.restore();
  }
  c.translate(v.x, v.y);
  c.scale(lift, lift);
  c.translate(-v.x, -v.y);
  const flipS = v.flip > 0 ? Math.cos(Math.min(1, v.flipAnim) * Math.PI) : 1,
    under = v.flip > 0 && flipS < 0;
  if (!under) drawJointRods(c, v);
  // one hull: a soft shadow under the whole car and a dark outline around its chassis
  if (!under && !SETTINGS.perf) {
    for (const [dx, dy, col, k] of [
      [5, 7, 'rgba(0,0,0,.26)', 1.02],
      [0, 0, '#0a0d12', 1.14]
    ]) {
      c.fillStyle = col;
      for (const I of alive) {
        if (I.layer !== 'b' || !solidPart(I.m)) continue;
        const [x, y] = ipos(v, I);
        c.save();
        c.translate(x + dx, y + dy);
        c.rotate(v.a + (I.la || 0) + (I.rot * Math.PI) / 2);
        c.scale(k, k);
        planShapeFill(c, I.m, S);
        c.restore();
      }
    }
  }
  for (const layer of ['b', 't'])
    for (const I of alive) {
      if (I.layer !== layer) continue;
      if (under && layer === 't') continue;
      const [x, y] = ipos(v, I);
      c.save();
      c.translate(x, y);
      c.rotate(v.a + (I.la || 0));
      if (v.flip > 0) c.scale(1, flipS);
      if (under) {
        c.save();
        c.rotate((I.rot * Math.PI) / 2);
        rr(c, -S / 2, (-I.L * S) / 2, S, I.L * S, 3);
        c.fillStyle = '#2f343a';
        c.fill();
        if (I.m.drive) {
          c.fillStyle = '#17181a';
          c.fillRect(-S * 0.3, -I.L * S * 0.45, S * 0.6, I.L * S * 0.9);
        }
        c.restore();
      } else {
        const rotA =
          I.W && I.W.kind !== 'lob' && I.W.kind !== 'tesla'
            ? I.ta - v.a - (I.la || 0) + Math.PI / 2
            : (I.rot * Math.PI) / 2;
        if (I.mw) {
          c.save();
          c.globalCompositeOperation = 'lighter';
          glowDisc(c, S * (0.95 + Math.sin(ANIM * 5) * 0.12), '#ffd257');
          c.restore();
        }
        if (I.m.glow || I.m.rar >= 3) {
          c.save();
          c.globalCompositeOperation = 'lighter';
          glowDisc(c, S * (0.8 + Math.sin(ANIM * 4) * 0.1), I.m.glow || RAR[I.m.rar].col);
          c.restore();
        }
        const kick = kickOf(I),
          pop = kick > 0 && !(I.m.art && I.m.art.k === 'gun') && !I.m.drive;
        if (pop) {
          c.save();
          c.scale(1 + 0.13 * kick, 1 + 0.13 * kick);
        }
        drawModule(c, I.id, layer === 't' ? S * 0.84 : S, rotA, team, {
          kick,
          rev: I.spin || 0,
          pour: I.pour,
          roll: v._roll || 0,
          paint: v.paint,
          ...(I.id === 'cockpit' ? cockpitFace(v) : null),
          turret: I.turret,
          charge: I.charge / ((I.W && I.W.charge) || 1),
          heat: I.heat || 0,
          cargo: v.cargo || 0,
          fire: (I.m.booster && I.bon > 0) || (I.m.jump && v.z > 0 && v.vz > 0),
          anchored: v.anchored,
          punch: I.punch,
          ammo: I.m.catapult ? v.hopper.length : 0,
          fired: v.tether && v.tether.inst === I,
          down: I.m.shield && I.sh <= 0,
          pa: I.pa,
          active: I.active,
          spin: isJoint(I.id) && jtype(I) === 'rotator' ? I.s : 0
        });
        if (pop) c.restore();
        if (layer === 'b' && look.livery !== 'factory' && liveryPart(I.id))
          drawLivery(c, look.livery, v.paint, I.gcx, I.gcy, S, liveryCtx(v.grid, I.gcx, I.gcy, v.minGy));
        if (layer === 'b' && look.stickers && look.stickers.length) {
          const si = stickerCells(v).indexOf(I);
          if (si >= 0 && look.stickers[si]) {
            c.save();
            c.rotate(-0.3 + si * 0.35);
            drawSticker(c, look.stickers[si], S * 0.28);
            c.restore();
          }
        }
        if (I.gear) drawGearPip(c, I);
        const r = I.hp / I.max;
        if (r < 0.5) {
          c.fillStyle = `rgba(25,12,4,${(0.5 - r) * 1.1})`;
          c.save();
          c.rotate((I.rot * Math.PI) / 2);
          planShapeFill(c, I.m, S);
          c.restore();
          if (r < 0.25 && Math.random() < 0.04)
            B.fx.push({ k: 'smoke', x, y, vx: rnd(-10, 10), vy: rnd(-30, -10), life: 0.8, max: 1, r: 4 });
        }
        if (I.hitT > 0) {
          c.fillStyle = `rgba(255,255,255,${I.hitT * 5})`;
          c.save();
          c.rotate((I.rot * Math.PI) / 2);
          planShapeFill(c, I.m, S);
          c.restore();
        }
        if (I.burn > 0 && Math.random() < 0.4)
          B.fx.push({ k: 'fire', x, y, vx: rnd(-10, 10), vy: rnd(-30, -10), life: 0.3, max: 0.4, r: 4 });
      }
      c.restore();
    }
  for (const s of v.stuck) {
    const [x, y] = lpos(v, s.gx, s.gy);
    c.save();
    c.translate(x, y);
    c.rotate(v.a + s.a);
    if (s.kind === 'part') drawModule(c, s.id, S, 0, 'p');
    else drawJunk(c, s.kind, s.r);
    c.restore();
  }
  if (v.emp > 0 && Math.random() < 0.3)
    B.fx.push({
      k: 'spark',
      x: v.x + rnd(-v.rad, v.rad),
      y: v.y + rnd(-v.rad, v.rad),
      vx: rnd(-80, 80),
      vy: rnd(-80, 80),
      life: 0.2,
      max: 0.2,
      col: '#7fe0ff'
    });
  if (v.frozen > 0) {
    c.fillStyle = 'rgba(190,240,255,.25)';
    c.beginPath();
    c.arc(v.x, v.y, v.rad, 0, 7);
    c.fill();
  }
  c.restore();
  planDrawLinks(c, v);
  for (const I of v.shields)
    if (I.alive && I.sh > 0 && I.m.bubble) {
      c.beginPath();
      c.arc(v.x, v.y, v.rad + 14, 0, 7);
      c.fillStyle = `rgba(120,190,255,${0.08 + (I.shT > 0 ? I.shT : 0)})`;
      c.fill();
      c.strokeStyle = `rgba(159,216,255,${0.4 + (I.shT > 0 ? I.shT * 2 : 0)})`;
      c.lineWidth = 2;
      c.stroke();
    }
  for (const I of v.shields)
    if (I.alive && I.sh > 0 && !I.m.bubble) {
      const [x, y] = ipos(v, I),
        fa = faceAng(v, I);
      c.beginPath();
      c.arc(x, y, S * 3.4, fa - 1.05, fa + 1.05);
      c.strokeStyle = `rgba(120,190,255,${0.25 + (I.shT > 0 ? I.shT * 2 : 0)})`;
      c.lineWidth = I.shT > 0 ? 4 : 2;
      c.stroke();
    }
  if (v.has.disco && !v.dead) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const a = ANIM * 1.3 + i * 0.63,
        r = v.rad + 30 + Math.sin(ANIM * 2 + i) * 20;
      circ(
        c,
        v.x + Math.cos(a) * r,
        v.y + Math.sin(a) * r,
        9,
        ['rgba(255,90,209,.3)', 'rgba(90,209,255,.3)', 'rgba(255,240,122,.3)', 'rgba(122,255,155,.3)'][i % 4]
      );
    }
    c.restore();
  }
  for (const I of alive) {
    if (I.beam) {
      const [x, y] = ipos(v, I);
      for (const bm of I.beam) {
        c.save();
        c.translate(x, y);
        c.rotate(bm.a);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.4;
        c.fillStyle = I.m.glow || '#7fe0ff';
        c.fillRect(S * 0.6, -4, bm.l, 8);
        c.globalAlpha = 1;
        c.fillStyle = '#f0ffff';
        c.fillRect(S * 0.6, -1.2, bm.l, 2.4);
        c.restore();
      }
    }
    if (I.m.tractor && I.active && I.tgt) {
      const [x, y] = ipos(v, I);
      c.save();
      c.globalCompositeOperation = 'lighter';
      line(c, [x, y, I.tgt.x, I.tgt.y], 'rgba(127,255,176,.45)', 8 + Math.sin(ANIM * 20) * 2);
      c.restore();
    }
    if (I.W && I.W.kind === 'rail' && I.charge > 0) {
      const [x, y] = ipos(v, I);
      c.save();
      c.translate(x, y);
      c.rotate(I.ta);
      c.fillStyle = `rgba(140,210,255,${I.charge * 0.5})`;
      c.fillRect(0, -1, 1200, 2);
      c.restore();
    }
  }
  for (const d of v.drones) {
    c.save();
    c.translate(d.x, d.y);
    c.rotate(ANIM * 20);
    for (let k = 0; k < 4; k++) {
      c.rotate(Math.PI / 2);
      c.fillStyle = 'rgba(200,210,220,.5)';
      c.fillRect(2, -1, 7, 2);
    }
    c.restore();
    circ(c, d.x, d.y, 4, '#3a4046', v.paint, 1.5);
  }
  if (v.ball) {
    const [ax_, ay_] = ipos(v, v.ball.inst);
    c.strokeStyle = '#8a9299';
    c.lineWidth = 2.5;
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(ax_, ay_);
    c.lineTo(v.ball.x, v.ball.y);
    c.stroke();
    c.setLineDash([]);
    c.save();
    c.translate(v.ball.x, v.ball.y);
    gradCirc(c, 11, '#3a3f44');
    c.restore();
  }
  if (v.tether) {
    const t = v.tether.car || v.tether.obj;
    if (t) {
      const [px, py] = ipos(v, v.tether.inst);
      line(c, [px, py, t.x, t.y], '#d9cfa8', 2);
    }
  }
  if (v.flip > 0) {
    c.fillStyle = '#f2b705';
    c.font = '600 12px "Barlow Semi Condensed", sans-serif';
    c.textAlign = 'center';
    c.fillText(`ON ITS ROOF · ${v.flip.toFixed(1)} s`, v.x, v.y - v.rad - 8);
  }
  if (B.cars.length > 1 && !v.dead && alpha > 0.5) {
    const w = Math.max(54, v.rad * 1.4),
      y = v.y - v.rad - (v.flip > 0 ? 30 : 16) - v.z * 0.3;
    c.fillStyle = 'rgba(0,0,0,.55)';
    c.fillRect(v.x - w / 2, y, w, 5);
    c.fillStyle = v.paint;
    c.fillRect(v.x - w / 2, y, w * clamp(integrity(v), 0, 1), 5);
    c.font = '700 11px "Barlow Semi Condensed", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillStyle = 'rgba(0,0,0,.6)';
    c.fillText(v.name, v.x + 1, y - 1);
    c.fillStyle = '#ece8df';
    c.fillText(v.name, v.x, y - 2);
    if (B.cars.length > 2) {
      // team marker: blue for your side, red for the other side
      const mine = teamOf(v) === myTeam();
      c.fillStyle = mine ? '#4ea1ff' : '#ff5c5c';
      c.beginPath();
      c.moveTo(v.x - w / 2 - 10, y + 2.5);
      c.lineTo(v.x - w / 2 - 4, y - 2);
      c.lineTo(v.x - w / 2 - 4, y + 7);
      c.fill();
    }
    if (look.title !== 'rookie') {
      c.font = '600 9px "Barlow Semi Condensed", sans-serif';
      c.fillStyle = '#ffd257';
      c.fillText(titleName(look.title).toUpperCase(), v.x, y - 14);
    }
    c.textBaseline = 'alphabetic';
  }
}
function drawObj(c, o) {
  const lift = 1 + o.z / 200;
  c.save();
  c.translate(o.x + 4 + o.z * 0.4, o.y + 5 + o.z * 0.4);
  c.fillStyle = 'rgba(20,12,4,.3)';
  c.beginPath();
  c.arc(0, 0, o.r, 0, 7);
  c.fill();
  c.restore();
  c.save();
  c.translate(o.x, o.y);
  c.scale(lift, lift);
  c.rotate(o.a);
  if (o.kind === 'goldduck') {
    c.save();
    c.globalCompositeOperation = 'lighter';
    glowDisc(c, o.r * 2, 'rgba(255,210,87,.7)');
    c.restore();
  }
  if (o.kind === 'part') drawModule(c, o.id, S, 0, 'p');
  else if (o.kind === 'sentry') {
    c.rotate(-o.a);
    circ(c, 0, 0, o.r, '#3a3f44', '#1b1e21', 3);
    for (let k = 0; k < 6; k++) {
      c.save();
      c.rotate(k * 1.047);
      c.fillStyle = '#f2b705';
      c.fillRect(o.r * 0.7, -3, o.r * 0.3, 6);
      c.restore();
    }
    c.rotate(o.ha || 0);
    c.fillStyle = '#1c2024';
    c.fillRect(0, -5, o.r * 1.3, 4);
    c.fillRect(0, 2, o.r * 1.3, 4);
    gradCirc(c, o.r * 0.55, '#8a3a32');
    circ(
      c,
      o.r * 0.15,
      0,
      4,
      o.stun > 0 ? '#ffe27a' : o.jam > 0 ? '#c58bff' : Math.sin(ANIM * 8) > 0 ? '#ff4d4d' : '#7a1e18'
    );
  } else drawJunk(c, o.kind, o.r);
  if (o.frozen > 0) {
    c.fillStyle = 'rgba(190,240,255,.45)';
    c.beginPath();
    c.arc(0, 0, o.r + 2, 0, 7);
    c.fill();
    c.strokeStyle = '#e6faff';
    c.lineWidth = 1.5;
    c.stroke();
  }
  if (o.hitT > 0) {
    c.fillStyle = `rgba(255,255,255,${o.hitT * 4})`;
    c.beginPath();
    c.arc(0, 0, o.r, 0, 7);
    c.fill();
  }
  c.restore();
  if (o.target || (o.hp < o.max && o.kind !== 'barrel')) {
    const w = o.r * 2;
    c.fillStyle = 'rgba(0,0,0,.5)';
    c.fillRect(o.x - w / 2, o.y - o.r - 10 - o.z, w, 4);
    c.fillStyle = o.target ? '#e2504a' : '#f2b705';
    c.fillRect(o.x - w / 2, o.y - o.r - 10 - o.z, w * clamp(o.hp / o.max, 0, 1), 4);
  }
}
function drawZone(c, z) {
  if (drawGimmickZone(c, z)) return;
  if (z.kind === 'goal' || z.kind === 'base' || z.kind === 'hill') return drawSpecialZone(c, z);
  if (['bead', 'soapbead'].includes(z.kind)) {
    circ(c, z.x + 2, z.y + 3, z.r, 'rgba(0,0,0,.3)');
    circ(c, z.x, z.y, z.r, z.kind === 'bead' ? '#9ce8ff' : '#b5efd4', '#fff', 2);
    if (z.kind === 'bead') {
      line(c, [z.x - z.r * 0.6, z.y, z.x + z.r * 0.6, z.y], '#fff', 2);
      line(c, [z.x, z.y - z.r * 0.6, z.x, z.y + z.r * 0.6], '#fff', 2);
    } else circ(c, z.x - 3, z.y - 3, 3, '#fff');
  } else if (z.kind === 'oil') {
    const g = c.createRadialGradient(z.x - z.r * 0.2, z.y - z.r * 0.2, 2, z.x, z.y, z.r);
    g.addColorStop(0, 'rgba(70,70,100,.95)');
    g.addColorStop(0.7, 'rgba(18,18,24,.9)');
    g.addColorStop(1, 'rgba(18,18,24,0)');
    circ(c, z.x, z.y, z.r, g);
  } else if (z.kind === 'glue') {
    const g = c.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
    g.addColorStop(0, 'rgba(240,225,120,.9)');
    g.addColorStop(0.75, 'rgba(210,190,80,.8)');
    g.addColorStop(1, 'rgba(210,190,80,0)');
    circ(c, z.x, z.y, z.r, g);
  } else if (z.kind === 'fire') {
    const g = c.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
    g.addColorStop(0, `rgba(255,140,40,${0.5 * Math.min(1, z.life)})`);
    g.addColorStop(1, 'rgba(255,80,20,0)');
    circ(c, z.x, z.y, z.r, g);
  } else if (z.kind === 'geyser') {
    const g = c.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
    g.addColorStop(0, 'rgba(160,220,255,.8)');
    g.addColorStop(1, 'rgba(80,160,220,0)');
    circ(c, z.x, z.y, z.r * (1 + Math.sin(ANIM * 10) * 0.08), g);
  } else if (z.kind === 'pad') {
    c.save();
    c.translate(z.x + z.w / 2, z.y + z.h / 2);
    c.fillStyle = 'rgba(30,30,30,.7)';
    c.fillRect(-z.w / 2, -z.h / 2, z.w, z.h);
    c.rotate(z.ang);
    const t = (ANIM * 2) % 1;
    c.fillStyle = '#f2b705';
    for (let i = -1; i <= 1; i++) {
      const x = (i + t - 0.5) * 22;
      c.globalAlpha = 0.4 + 0.6 * ((i + 1) / 2);
      c.beginPath();
      c.moveTo(x - 6, -14);
      c.lineTo(x + 6, 0);
      c.lineTo(x - 6, 14);
      c.lineTo(x - 12, 14);
      c.lineTo(x, 0);
      c.lineTo(x - 12, -14);
      c.closePath();
      c.fill();
    }
    c.globalAlpha = 1;
    c.restore();
  } else if (z.kind === 'spikes') {
    c.fillStyle = '#2a2c30';
    c.fillRect(z.x, z.y, z.w, z.h);
    c.fillStyle = '#cfd4d8';
    const v = z.h > z.w,
      n = Math.floor((v ? z.h : z.w) / 10);
    for (let i = 0; i < n; i++) {
      c.beginPath();
      if (v) {
        const y = z.y + i * 10 + 5;
        c.moveTo(z.x + 3, y + 4);
        c.lineTo(z.x + z.w / 2, y - 4);
        c.lineTo(z.x + z.w - 3, y + 4);
      } else {
        const x = z.x + i * 10 + 5;
        c.moveTo(x - 4, z.y + z.h - 3);
        c.lineTo(x, z.y + 3);
        c.lineTo(x + 4, z.y + z.h - 3);
      }
      c.fill();
    }
  } else if (z.kind === 'tramp') {
    const cx = z.x + z.w / 2,
      cy = z.y + z.h / 2;
    circ(c, cx + 5, cy + 6, z.w / 2, 'rgba(20,12,4,.35)');
    circ(c, cx, cy, z.w / 2, '#3a4ac9', '#1b1e21', 4);
    circ(c, cx, cy, z.w / 2 - 8, '#1b1e21');
    circ(c, cx, cy, (z.w / 2 - 12) * (1 + Math.sin(ANIM * 6) * 0.04), '#2a2f3a');
  } else if (z.kind === 'banana') {
    c.save();
    c.translate(z.x, z.y);
    c.rotate(z.a || 0);
    circ(c, 3, 4, z.r, 'rgba(20,12,4,.3)');
    c.beginPath();
    c.arc(0, z.r * 0.6, z.r, -Math.PI * 0.9, -Math.PI * 0.1);
    c.lineWidth = z.r * 0.5;
    c.strokeStyle = '#f2d03c';
    c.stroke();
    for (const a of [-2.2, -1.6, -1])
      line(c, [0, 0, Math.cos(a) * z.r * 0.9, Math.sin(a) * z.r * 0.9 + z.r * 0.3], '#d9b52a', 3);
    c.restore();
  } else if (z.kind === 'mine') {
    const armed = z.life < 39,
      mine = z.own === B.me;
    circ(c, z.x + 2, z.y + 3, z.r, 'rgba(20,12,4,.35)');
    circ(c, z.x, z.y, z.r, '#4f5a3a', '#1b1e21', 2);
    circ(c, z.x, z.y, 4, armed ? (Math.sin(ANIM * 8) > 0 ? (mine ? '#5cc38f' : '#ff4d4d') : '#3a1210') : '#8a9299');
    if (armed && !mine) {
      c.strokeStyle = 'rgba(255,77,77,.25)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(z.x, z.y, 30, 0, 7);
      c.stroke();
    }
  } else if (z.kind === 'ramp') {
    c.save();
    c.translate(z.x + z.w / 2, z.y + z.h / 2);
    c.rotate(z.ang);
    const L = Math.max(z.w, z.h),
      W = Math.min(z.w, z.h);
    c.fillStyle = 'rgba(20,12,4,.35)';
    c.fillRect(-L / 2 + 6, -W / 2 + 6, L, W);
    const g = c.createLinearGradient(-L / 2, 0, L / 2, 0);
    g.addColorStop(0, '#7f827e');
    g.addColorStop(1, '#d0d3cd');
    c.fillStyle = g;
    c.fillRect(-L / 2, -W / 2, L, W);
    c.fillStyle = '#f2b705';
    for (let i = 0; i < 4; i++) {
      const x = -L / 2 + 12 + (i * L) / 4;
      c.beginPath();
      c.moveTo(x, -W * 0.3);
      c.lineTo(x + 12, 0);
      c.lineTo(x, W * 0.3);
      c.lineTo(x - 6, W * 0.3);
      c.lineTo(x + 6, 0);
      c.lineTo(x - 6, -W * 0.3);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#4e514d';
    c.fillRect(L / 2 - 6, -W / 2, 6, W);
    c.restore();
  }
}
function drawPickup(c, p) {
  if (p.kind === 'gift') return p.cd > 0 ? undefined : drawSalvage(c, p);
  const ready = p.cd <= 0,
    bob = Math.sin(ANIM * 3 + p.x) * 3;
  c.save();
  c.translate(p.x, p.y);
  circ(c, 3, 5, 20, 'rgba(20,12,4,.3)');
  if (ready) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    glowDisc(
      c,
      30 + Math.sin(ANIM * 4) * 3,
      p.kind === 'coins' ? 'rgba(255,210,87,.55)' : p.kind === 'power' ? POWERUPS[p.p].col : 'rgba(92,195,143,.55)'
    );
    c.restore();
  }
  c.globalAlpha = ready ? 1 : 0.35;
  c.translate(0, bob * (ready ? 1 : 0));
  if (p.kind === 'power') {
    const P = POWERUPS[p.p];
    c.rotate(ANIM * 1.5);
    c.beginPath();
    for (let k = 0; k < 6; k++) c.lineTo(Math.cos((k * Math.PI) / 3) * 15, Math.sin((k * Math.PI) / 3) * 15);
    c.closePath();
    c.fillStyle = '#1b1e21';
    c.fill();
    c.strokeStyle = P.col;
    c.lineWidth = 3;
    c.stroke();
    c.rotate(-ANIM * 1.5);
    c.fillStyle = P.col;
    c.font = '700 14px "Chakra Petch", Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(P.icon, 0, 1);
  } else if (p.kind === 'coins') {
    for (let i = 0; i < 4; i++) {
      c.save();
      c.translate(0, 6 - i * 5);
      c.scale(1, 0.45);
      circ(c, 0, 0, 13, '#ffd257', '#8a6a08', 2);
      c.restore();
    }
    c.fillStyle = '#8a6a08';
    c.font = '700 10px "Chakra Petch", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(p.val, 0, -10);
  } else {
    rr(c, -14, -14, 28, 28, 6);
    c.fillStyle = '#e9ecee';
    c.fill();
    c.strokeStyle = '#1b1e21';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#5cc38f';
    c.fillRect(-3.5, -9, 7, 18);
    c.fillRect(-9, -3.5, 18, 7);
  }
  c.restore();
  if (!ready) {
    c.strokeStyle = 'rgba(236,232,223,.6)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.cd / 25));
    c.stroke();
  }
}
function drawTele(c, v, t, out) {
  const x = v.x,
    y = v.y,
    R = v.rad + 20;
  const g = c.createLinearGradient(x - R, 0, x + R, 0);
  g.addColorStop(0, 'rgba(120,230,255,0)');
  g.addColorStop(0.5, `rgba(200,250,255,${0.55 * Math.sin(Math.PI * Math.min(1, t * 1.2))})`);
  g.addColorStop(1, 'rgba(120,230,255,0)');
  c.fillStyle = g;
  c.fillRect(x - R, y - AH, R * 2, AH * 2);
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.5 + i / 3) % 1;
    c.beginPath();
    c.arc(x, y, R * (0.6 + p * 0.9), 0, 7);
    c.strokeStyle = `rgba(160,240,255,${0.6 * (1 - p)})`;
    c.lineWidth = 2;
    c.stroke();
  }
  if (Math.random() < 0.8)
    B.fx.push({
      k: 'spark',
      x: x + rnd(-R, R),
      y: y + rnd(-R, R),
      vx: 0,
      vy: out ? -260 : 260,
      life: 0.35,
      max: 0.35,
      col: '#bff'
    });
}
function carAlpha(v) {
  if (B.seq === 'in') return clamp(B.seqT / 1.1, 0, 1);
  if (B.seq === 'out') return 1 - clamp(B.seqT / 1.2, 0, 1);
  return v.ghostA ?? 1; // Ghost Rider Gus fades out between shots
}
function drawShots(c) {
  for (const sh of B.shots) {
    if (sh.delay > 0) continue;
    const a = Math.atan2(sh.vy, sh.vx),
      mine = sh.own === B.me;
    c.save();
    c.translate(sh.x, sh.y);
    c.rotate(a);
    if (sh.kind === 'bullet') {
      c.fillStyle = sh.own < 0 ? '#ff8a7a' : mine ? '#ffe27a' : '#ffb0a0';
      c.fillRect(-9, -1.2, 12, 2.4);
    } else if (sh.kind === 'shell' && sh.freeze) {
      circ(c, 0, 0, 6, '#f4fbff', '#9fc8dc', 1.5);
    } else if (sh.kind === 'shell' && sh.knock) {
      c.rotate(ANIM * 10);
      gradCirc(c, 9, '#2a3a8a');
    } else if (sh.kind === 'shell') {
      c.fillStyle = '#2b2520';
      c.beginPath();
      c.arc(0, 0, 4, 0, 7);
      c.fill();
      c.fillStyle = 'rgba(255,190,90,.6)';
      c.fillRect(-14, -1.5, 10, 3);
    } else if (sh.kind === 'bolt') {
      c.fillStyle = '#8ff4ff';
      c.fillRect(-10, -1.6, 14, 3.2);
    } else if (sh.kind === 'plasma') {
      const r = sh.big ? 10 : 6,
        g = c.createRadialGradient(0, 0, 1, 0, 0, r * 1.6);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.4, sh.big ? '#9fb6ff' : '#c79bff');
      g.addColorStop(1, 'rgba(120,80,255,0)');
      circ(c, 0, 0, r * 1.6, g);
    } else if (sh.kind === 'harpoon') {
      c.fillStyle = '#c9ccd0';
      c.fillRect(-14, -1.5, 18, 3);
      c.beginPath();
      c.moveTo(4, -4);
      c.lineTo(10, 0);
      c.lineTo(4, 4);
      c.fill();
    } else if (sh.kind === 'flame') {
      const t = sh.life / (sh.max || 1);
      c.globalCompositeOperation = 'lighter';
      circ(c, 0, 0, 4 + (1 - t) * 10, `rgba(255,${Math.round(90 + 120 * t)},30,${0.25 + 0.4 * t})`);
    } else if (sh.kind === 'water') {
      const t = sh.life / (sh.max || 1);
      circ(c, 0, 0, 3 + (1 - t) * 7, `rgba(140,210,255,${0.35 + 0.4 * t})`);
    } else if (sh.kind === 'bounce' && sh.saw) {
      c.rotate(ANIM * 30);
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5;
        c.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
        c.lineTo(Math.cos(a + 0.3) * 6, Math.sin(a + 0.3) * 6);
      }
      c.closePath();
      c.fillStyle = '#cfd4d8';
      c.fill();
      circ(c, 0, 0, 2.5, '#3a3f44');
    } else if (sh.kind === 'bounce') {
      c.rotate(sh.ang || 0);
      circ(c, 0, 0, 7, '#17181a', '#3a3c40', 3);
    } else if (sh.kind === 'sticky') {
      circ(c, 0, 0, 5, '#3f6a3a', '#7fdc5a', 2);
    } else if (sh.kind === 'junk') {
      c.rotate(sh.ang || 0);
      const it = sh.item || { kind: 'crate', r: 12 };
      if (it.kind === 'part') drawModule(c, it.id, S, 0, 'p');
      else drawJunk(c, JUNK[it.kind] || PROPS[it.kind] ? it.kind : 'crate', it.r);
    } else {
      c.fillStyle = '#ffb347';
      c.beginPath();
      c.moveTo(-6, -2.5);
      c.lineTo(-13 - rnd(0, 5), 0);
      c.lineTo(-6, 2.5);
      c.fill();
      c.fillStyle = mine ? '#d9dcd6' : '#e2504a';
      c.fillRect(-6, -2, 10, 4);
    }
    c.restore();
  }
  for (const l of B.lobs) {
    const t = l.t / l.T,
      x = l.sx + (l.tx - l.sx) * t,
      y = l.sy + (l.ty - l.sy) * t,
      hgt = Math.sin(Math.PI * t) * Math.hypot(l.tx - l.sx, l.ty - l.sy) * 0.22;
    circ(c, x, y, 4, 'rgba(0,0,0,.3)');
    if (!l.small) {
      c.strokeStyle = l.own === B.me ? 'rgba(242,183,5,.4)' : 'rgba(226,80,74,.6)';
      c.lineWidth = 1.5;
      c.setLineDash([5, 4]);
      c.beginPath();
      c.arc(l.tx, l.ty, l.splash * 0.8, 0, 7);
      c.stroke();
      c.setLineDash([]);
    }
    circ(c, x, y - hgt, (l.small ? 3 : 5) * (1 + Math.sin(Math.PI * t) * 0.5), l.col || '#555', '#111', 1.2);
  }
}
function drawFx(c) {
  for (const f of B.fx) {
    const t = f.life / f.max;
    if (drawCosmeticFx(c, f, t)) continue;
    if (f.k === 'fire') {
      c.fillStyle = `rgba(255,${Math.round(120 + 120 * t)},40,${t})`;
      c.beginPath();
      c.arc(f.x, f.y, f.r * (0.5 + t), 0, 7);
      c.fill();
    } else if (f.k === 'smoke') {
      c.fillStyle = `rgba(${f.col || '80,74,68'},${Math.min(0.6, t * (f.col ? 0.4 : 0.55))})`;
      c.beginPath();
      c.arc(f.x, f.y, f.r * (2 - t), 0, 7);
      c.fill();
    } else if (f.k === 'water') {
      c.fillStyle = `rgba(160,220,255,${t * 0.8})`;
      c.beginPath();
      c.arc(f.x, f.y, f.r, 0, 7);
      c.fill();
    } else if (f.k === 'coin') {
      c.globalAlpha = t;
      circ(c, f.x, f.y, 4, '#ffd257', '#8a6a08', 1);
      c.globalAlpha = 1;
    } else if (f.k === 'spark') {
      c.strokeStyle = f.col || '#ffdc78';
      c.globalAlpha = t;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(f.x, f.y);
      c.lineTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03);
      c.stroke();
      c.globalAlpha = 1;
    } else if (f.k === 'flash') {
      c.globalAlpha = t;
      circ(c, f.x, f.y, f.r, f.col || '#ffeba0');
      c.globalAlpha = 1;
    } else if (f.k === 'ring') {
      c.strokeStyle = `rgba(${f.col || '255,220,160'},${t * 0.6})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(f.x, f.y, f.r * (1.6 - t), 0, 7);
      c.stroke();
    } else if (f.k === 'chip') {
      c.save();
      c.translate(f.x, f.y);
      c.rotate(f.a + ANIM * 6);
      c.globalAlpha = t;
      c.fillStyle = f.col;
      c.fillRect(-f.r / 2, -f.r / 2, f.r, f.r);
      c.restore();
    } else if (f.k === 'arc') {
      c.strokeStyle = 'rgba(190,235,255,.9)';
      c.lineWidth = 2.5;
      c.beginPath();
      for (let i = 0; i < f.pts.length - 1; i++) {
        const [a, b] = f.pts[i],
          [x2, y2] = f.pts[i + 1];
        c.moveTo(a, b);
        for (let kk = 1; kk < 6; kk++) {
          const u = kk / 6;
          c.lineTo(a + (x2 - a) * u + rnd(-8, 8), b + (y2 - b) * u + rnd(-8, 8));
        }
        c.lineTo(x2, y2);
      }
      c.stroke();
    } else if (f.k === 'rail') {
      c.save();
      c.translate(f.x, f.y);
      c.rotate(f.a);
      c.fillStyle = `rgba(140,210,255,${t * 0.5})`;
      c.fillRect(0, -7 * t, f.l, 14 * t);
      c.fillStyle = `rgba(255,255,255,${t})`;
      c.fillRect(0, -1.5, f.l, 3);
      c.restore();
    } else if (f.k === 'tracer') line(c, [f.x, f.y, f.x2, f.y2], 'rgba(255,240,160,.9)', 1.5);
    else if (f.k === 'text') {
      c.globalAlpha = Math.min(1, t * 2);
      c.font = '700 13px "Barlow Semi Condensed", sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#111';
      c.fillText(f.txt, f.x + 1, f.y + 1);
      c.fillStyle = f.col;
      c.fillText(f.txt, f.x, f.y);
      c.globalAlpha = 1;
    }
  }
}
function drawRing(c) {
  if (!B.ring) return;
  const r = B.ring.r;
  c.save();
  c.beginPath();
  c.rect(0, 0, AW, AH);
  c.arc(AW / 2, AH / 2, r, 0, Math.PI * 2, true);
  c.fillStyle = `rgba(200,50,30,${0.18 + Math.sin(ANIM * 5) * 0.05})`;
  c.fill('evenodd');
  c.strokeStyle = 'rgba(255,120,80,.85)';
  c.lineWidth = 4;
  c.setLineDash([16, 10]);
  c.lineDashOffset = ANIM * 40;
  c.beginPath();
  c.arc(AW / 2, AH / 2, r, 0, 7);
  c.stroke();
  c.restore();
}
/** 2v2: a slim bar for your teammate under your bars, and for the second rival under theirs. */
function drawTeamBars(c, me, lead, W, pw, yL) {
  const ally = B.cars.find(x => x !== me && teamOf(x) === teamOf(me)),
    foe2 = B.cars.find(x => x !== lead && teamOf(x) !== teamOf(me));
  const slim = (car, x, right) => {
    if (!car) return;
    const y = right ? 74 : yL,
      w = pw * 0.8,
      f = car.dead ? 0 : clamp(integrity(car), 0, 1);
    c.save();
    c.fillStyle = 'rgba(10,16,32,.8)';
    c.fillRect(x, y, w, 22);
    c.fillStyle = right ? '#ff5c5c' : '#4ea1ff';
    c.fillRect(right ? x + w - 3 : x, y, 3, 22);
    c.font = '700 10px "Chakra Petch", sans-serif';
    c.textBaseline = 'top';
    c.textAlign = right ? 'right' : 'left';
    c.fillStyle = car.dead ? '#8b939c' : '#e6f1ff';
    c.fillText((car.dead ? 'OUT · ' : '') + car.name.toUpperCase(), right ? x + w - 9 : x + 9, y + 3);
    c.fillStyle = 'rgba(255,255,255,.1)';
    c.fillRect(x + 9, y + 15, w - 18, 4);
    c.fillStyle = car.paint;
    c.fillRect(right ? x + 9 + (w - 18) * (1 - f) : x + 9, y + 15, (w - 18) * f, 4);
    c.restore();
  };
  slim(ally, 12, false);
  slim(foe2, W - 12 - pw * 0.8, true);
}
/** Small level chevrons on a gear part, in the colour of its level. */
function drawGearPip(c, I) {
  const n = Math.min(4, Math.ceil((I.gear.lvl - 1) / 2)),
    col = lvCol(I.gear.lvl);
  c.save();
  c.translate(-S * 0.32, S * 0.3);
  c.strokeStyle = col;
  c.lineWidth = 1.6;
  for (let i = 0; i <= n; i++) {
    c.beginPath();
    c.moveTo(-3, -i * 3.2 + 1.5);
    c.lineTo(0, -i * 3.2 - 1.5);
    c.lineTo(3, -i * 3.2 + 1.5);
    c.stroke();
  }
  c.restore();
}
function drawArena() {
  const c = ax,
    d = dprOf();
  c.setTransform(d, 0, 0, d, 0, 0);
  c.fillStyle = '#1b1712';
  c.fillRect(0, 0, view.w, view.h);
  const shk = SETTINGS.shake && SETTINGS.motion !== false && !REDUCED.on ? Math.min(5, B.shake) : 0,
    sh = shk ? rnd(-shk, shk) : 0,
    sh2 = shk ? rnd(-shk, shk) : 0,
    s = view.sc * cam.z;
  c.save();
  c.translate(view.w / 2 + sh, view.h / 2 + sh2);
  c.scale(s, s);
  c.translate(-cam.x, -cam.y);
  if (B.ow) owDrawGround(c);
  else {
    drawStands(c);
    c.drawImage(ground, 0, 0);
  }
  planAmbient(c);
  for (const z of B.zones) if (z.kind !== 'ramp' && z.kind !== 'tramp') drawZone(c, z);
  for (const z of B.zones) if (z.kind === 'ramp' || z.kind === 'tramp') drawZone(c, z);
  for (const p of B.pk || []) drawPickup(c, p);
  for (const st of B.st) drawStaticThemed(c, st, st.wall || B.theme.wall);
  for (const o of B.objs) if (o.z <= 0) drawObj(c, o);
  for (const db of B.debris) {
    c.save();
    c.globalAlpha = Math.min(1, db.life);
    c.translate(db.x, db.y - (db.z || 0));
    c.rotate(db.a);
    drawModule(c, db.id, S, 0, 'p');
    c.fillStyle = 'rgba(20,12,4,.5)';
    c.fillRect(-S / 2, -S / 2, S, S);
    c.restore();
  }
  for (const dc of B.decoys) {
    c.save();
    c.globalAlpha = 0.55 + Math.sin(ANIM * 20) * 0.1;
    c.translate(dc.x, dc.y);
    c.rotate(dc.a);
    rr(c, -26, -30, 52, 60, 6);
    c.fillStyle = 'rgba(127,224,255,.3)';
    c.fill();
    c.strokeStyle = '#7fe0ff';
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }
  for (const b of B.bombs) {
    if (b.x === undefined) continue;
    circ(c, b.x, b.y, 6, '#3f6a3a', '#7fdc5a', 2);
    if (Math.sin(ANIM * (20 - b.t * 8)) > 0) circ(c, b.x, b.y, 2.5, '#ff4d4d');
  }
  drawBossWorld(c);
  const order = [...B.cars].sort((a, b) => a.z - b.z);
  for (const v of order) {
    const va = carAlpha(v);
    if (!v.dead || (B.seq === 'death' && B.deadIdx === v.idx)) drawVehicle(c, v, va);
    if (B.seq === 'in') drawTele(c, v, B.seqT / 1.1, false);
    if (B.seq === 'out') drawTele(c, v, B.seqT / 1.3, true);
  }
  for (const o of B.objs) if (o.z > 0) drawObj(c, o);
  drawSpecialWorld(c);
  drawShots(c);
  drawFx(c);
  drawCockpitMarker(c);
  drawBubbles(c);
  if (SETTINGS.marks) drawHitMarks(c);
  for (const cl of B.clouds) {
    const a = Math.min(1, cl.life / 1.2, (cl.max - cl.life + 0.3) / 0.6);
    for (let i = 0; i < 5; i++) {
      const o = i * 1.256 + ANIM * 0.2;
      circ(
        c,
        cl.x + Math.cos(o) * cl.r * 0.35,
        cl.y + Math.sin(o) * cl.r * 0.35,
        cl.r * 0.6,
        `rgba(150,148,140,${0.42 * a})`
      );
    }
  }
  drawRing(c);
  c.font = '600 13px "Chakra Petch", sans-serif';
  c.textAlign = 'center';
  for (const n of SETTINGS.nums ? B.nums : []) {
    c.globalAlpha = Math.min(1, n.life * 1.5);
    c.fillStyle = '#111';
    c.fillText(n.v, n.x + 1, n.y + 1);
    c.fillStyle = n.col || '#ffe27a';
    c.fillText(n.v, n.x, n.y);
  }
  c.globalAlpha = 1;
  const v = myCar();
  if (v && v.has && (v.has.mortar || v.has.napalm || v.has.cluster) && B.seq === 'play') {
    c.strokeStyle = 'rgba(242,183,5,.5)';
    c.setLineDash([3, 4]);
    c.beginPath();
    c.arc(mouse.x, mouse.y, 40, 0, 7);
    c.stroke();
    c.setLineDash([]);
  }
  if (B.replay && B.replayLesson && B.replayLesson.until > B.time) {
    const l = B.replayLesson;
    c.strokeStyle = '#ff8a6a';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(l.x, l.y, 42, 0, Math.PI * 2);
    c.stroke();
  }
  if (v && !v.dead && B.seq === 'play' && !B.demo && !B.replay) {
    c.strokeStyle = 'rgba(242,183,5,.85)';
    c.lineWidth = 2 / cam.z;
    const m = mouse;
    c.beginPath();
    c.arc(m.x, m.y, 9, 0, 7);
    c.moveTo(m.x - 15, m.y);
    c.lineTo(m.x - 5, m.y);
    c.moveTo(m.x + 5, m.y);
    c.lineTo(m.x + 15, m.y);
    c.moveTo(m.x, m.y - 15);
    c.lineTo(m.x, m.y - 5);
    c.moveTo(m.x, m.y + 5);
    c.lineTo(m.x, m.y + 15);
    c.stroke();
  }
  c.restore();
  // off-screen arrows: the objective, then the rival
  const op = objectivePos();
  if (op && !B.demo) edgeArrow(c, op.x, op.y, s, SPECIALS[B.special].col, SPECIALS[B.special].icon);
  if (v && B.cars.length > 1 && !B.demo && !B.ow) {
    const e = B.cars.find(x => x !== v);
    if (e && !e.dead) {
      const [ex, ey] = worldToScreen(e.x, e.y, s),
        m = 34;
      if (ex < 0 || ey < 0 || ex > view.w || ey > view.h) {
        const a = Math.atan2(ey - view.h / 2, ex - view.w / 2),
          px = clamp(ex, m, view.w - m),
          py = clamp(ey, m, view.h - m);
        c.save();
        c.translate(px, py);
        c.rotate(a);
        c.fillStyle = e.paint;
        c.beginPath();
        c.moveTo(14, 0);
        c.lineTo(-8, -10);
        c.lineTo(-4, 0);
        c.lineTo(-8, 10);
        c.closePath();
        c.fill();
        c.restore();
        c.font = '700 11px "Barlow Semi Condensed", sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#ece8df';
        c.fillText(`${Math.round(Math.hypot(e.x - v.x, e.y - v.y) / S)} m`, px, py + 24);
      }
    }
  }
  if (B.flash > 0) {
    c.fillStyle = `rgba(${B.flashCol || '230,250,255'},${B.flash})`;
    c.fillRect(0, 0, view.w, view.h);
  }
  if (v && v.blind > 0) {
    c.fillStyle = `rgba(255,255,255,${Math.min(0.92, v.blind * 0.5)})`;
    c.fillRect(0, 0, view.w, view.h);
  }
  if (v && !B.demo && !B.photo) drawHitArrows(c, v, s);
  if (B.special === 'night') drawNight(c, s);
  drawGimmickOverlay(c, s);
  drawVignette(c);
  if (v && !B.demo && !B.replay && !B.photo) lowHealth(c, v);
  if (B.ring && v && !v.dead && Math.hypot(v.x - AW / 2, v.y - AH / 2) > B.ring.r) {
    c.strokeStyle = `rgba(255,80,40,${0.35 + Math.sin(ANIM * 10) * 0.2})`;
    c.lineWidth = 14;
    c.strokeRect(0, 0, view.w, view.h);
  }
  if (B.demo) {
    // behind the menu the hangar has its own scoreboard; nothing should show through other screens either
  } else if (B.ow) {
    if (!B.photo) owHUD(c);
  } else if (!B.photo) drawHUD(c);
}
/** Pulsing diamond over the rival's cockpit: the thing you are trying to destroy. */
function drawCockpitMarker(c) {
  if (B.demo || B.seq !== 'play') return;
  for (const e of B.cars) {
    if (e.idx === B.me || e.dead || inSmoke(e.x, e.y)) continue;
    const I = e.insts.find(I => I.id === 'cockpit' && I.alive);
    if (!I) continue;
    const [x, y] = ipos(e, I),
      r = 13 + Math.sin(ANIM * 6) * 2;
    c.save();
    c.translate(x, y);
    c.rotate(Math.PI / 4);
    c.strokeStyle = 'rgba(255,77,77,.9)';
    c.lineWidth = 2;
    c.strokeRect(-r / 2, -r / 2, r, r);
    c.restore();
  }
}
/** Arrow on the screen edge pointing at a world position that is off screen. */
function edgeArrow(c, wx, wy, s, col, label) {
  const [ex, ey] = worldToScreen(wx, wy, s),
    m = 40;
  if (ex > 0 && ey > 0 && ex < view.w && ey < view.h) return;
  const a = Math.atan2(ey - view.h / 2, ex - view.w / 2),
    px = clamp(ex, m, view.w - m),
    py = clamp(ey, m, view.h - m);
  c.save();
  c.translate(px, py);
  circ(c, 0, 0, 13, 'rgba(20,16,12,.8)', col, 2);
  c.font = '700 12px "Chakra Petch", Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = col;
  c.fillText(label, 0, 1);
  c.rotate(a);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(24, 0);
  c.lineTo(15, -6);
  c.lineTo(15, 6);
  c.closePath();
  c.fill();
  c.restore();
}
/** Red wedges around your car showing where recent hits came from. */
function drawHitArrows(c, v, s) {
  if (!B.hitDirs.length || v.dead) return;
  const [cx, cy] = worldToScreen(v.x, v.y, s),
    R = v.rad * s + 26;
  for (const h of B.hitDirs) {
    c.save();
    c.translate(cx, cy);
    c.rotate(h.a);
    c.globalAlpha = Math.min(1, h.t * 1.6);
    c.fillStyle = '#ff4d3a';
    c.beginPath();
    c.moveTo(R + 16, 0);
    c.lineTo(R, -11);
    c.lineTo(R + 4, 0);
    c.lineTo(R, 11);
    c.closePath();
    c.fill();
    c.restore();
  }
}
/** Menu background battle: names, health and a LIVE badge only. */
function drawDemoHUD(c) {
  const W = view.w;
  B.cars.forEach((v, i) => {
    const pw = Math.min(220, W * 0.3);
    bars(c, i ? W - 12 - pw : 12, view.h - 52, pw, [[v.name.toUpperCase(), v.dead ? 0 : integrity(v), v.paint]], !!i);
  });
  c.textAlign = 'right';
  c.textBaseline = 'top';
  c.font = '700 14px "Chakra Petch", Impact, sans-serif';
  c.fillStyle = Math.sin(ANIM * 4) > 0 ? '#ff4d4d' : '#a33';
  c.fillText('● LIVE', W - 16, 14);
  if (B.banner) {
    const t = B.banner.t;
    c.save();
    c.globalAlpha = Math.min(1, t * 3) * 0.85;
    c.textAlign = 'right';
    c.font = `700 ${Math.min(40, W * 0.05)}px "Chakra Petch", Impact, sans-serif`;
    c.fillStyle = B.banner.col;
    c.fillText(B.banner.text, W - 16, 38);
    c.restore();
  }
}
/** Stacked labelled bars. `inset` leaves room on the first row for the cockpit portrait. */
function bars(c, x, y, w, rows, right, inset = 0) {
  c.fillStyle = 'rgba(14,18,28,.88)';
  c.fillRect(x, y, w, 8 + rows.length * 26);
  rows.forEach(([l, val, col], i) => {
    const yy = y + 6 + i * 26,
      ins = i ? 0 : inset;
    c.fillStyle = '#c9ced3';
    c.font = '700 11px "Barlow Semi Condensed", sans-serif';
    c.textBaseline = 'top';
    c.textAlign = right ? 'right' : 'left';
    // long names and power-up lines are cut short instead of running into the percentage
    let lab = String(l);
    const room = w - 16 - ins - 34;
    if (c.measureText(lab).width > room) {
      while (lab.length > 2 && c.measureText(lab + '…').width > room) lab = lab.slice(0, -1);
      lab += '…';
    }
    c.fillText(lab, right ? x + w - 8 - ins : x + 8 + ins, yy);
    c.textAlign = right ? 'left' : 'right';
    c.fillStyle = '#97a0a8';
    c.fillText(Math.round(clamp(val, 0, 1) * 100) + '%', right ? x + 8 : x + w - 8, yy);
    const bx = x + 8 + (right ? 0 : ins),
      bw = w - 16 - ins;
    c.fillStyle = 'rgba(255,255,255,.1)';
    c.fillRect(bx, yy + 14, bw, 6);
    c.fillStyle = col;
    const fw = bw * clamp(val, 0, 1);
    c.fillRect(right ? bx + bw - fw : bx, yy + 14, fw, 6);
  });
}
function abilityCooldown(v, k) {
  const live = v.insts.filter(I => I.alive && I[k] > B.time);
  return live.length ? Math.max(0, Math.min(...live.map(I => I[k] - B.time))) : 0;
}
function drawHUD(c) {
  const W = view.w,
    H = view.h,
    v = myCar();
  if (!v) return;
  const h = v.has || {};
  const rows = [[v.name.toUpperCase(), integrity(v), v.paint]];
  for (const I of v.shields)
    if (I.alive) {
      rows.push(['SHIELD', I.sh / I.shMax, '#4ea1ff']);
      break;
    }
  if (planCapacity(v))
    rows.push([`SCRAP ${v.cargo || 0}/${planCapacity(v)}`, (v.cargo || 0) / planCapacity(v), '#72d79d']);
  if (h.repairarm) rows.push(['REPAIRS', v.repairPool / 300, '#5cc38f']);
  if (v.buff && v.buff.t > 0) {
    const P = POWERUPS[v.buff.p];
    rows.push([`${P.name.toUpperCase()} · ${P.desc}`, v.buff.t / P.time, P.col]);
  }
  const narrow = W < 640,
    pw = Math.min(250, W * (narrow ? 0.44 : 0.4));
  const fragile = v.insts.find(
    I => I.alive && I.layer === 'b' && ['frame', 'girder', 'junction', 'shackle'].includes(I.id) && I.hp / I.max < 0.25
  );
  if (fragile) rows.push(['CONNECTION NEAR BREAKING', fragile.hp / fragile.max, '#ff8268']);
  bars(c, 12, 12, pw, rows, false, 26);
  planPortrait(c, v, 32, 28);
  drawHypeBar(c, 12, 12 + 8 + rows.length * 26 + 3, pw, v, false);
  const e = B.cars[1 - myTeam()] && B.cars[1 - myTeam()] !== v ? B.cars[1 - myTeam()] : others(v)[0];
  if (e) {
    const r2 = [[e.name.toUpperCase(), e.dead ? 0 : integrity(e), e.paint]];
    bars(c, W - 12 - pw, 12, pw, r2, true, 26);
    planPortrait(c, e, W - 32, 28);
    drawHypeBar(c, W - 12 - pw, 12 + 8 + 26 + 3, pw, e, true);
  }
  if (B.cars.length > 2) {
    // under the hype meter and the synergy chips, so nothing overlaps
    const synRow = !narrow && v.syn && v.syn.tier && Object.keys(v.syn.tier).length ? 20 : 0;
    drawTeamBars(
      c,
      v,
      e,
      W,
      pw,
      12 + 8 + rows.length * 26 + 4 + (B.crowd && G.phase === 'battle' ? 20 : 0) + synRow + 4
    );
  }
  drawBossBar(c);
  drawCommentary(c);
  drawTelemetry(c, v, W, H);
  drawChatWheel(c, 1 / 60);
  c.textAlign = 'center';
  c.textBaseline = 'top';
  if (G.phase === 'battle' || B.replay) {
    // timer on a plate so it never melts into the arena behind it
    const ty = narrow ? Math.max(52, rows.length * 24 + 8) : 8; // narrow windows: the timer sits under the health bars
    c.fillStyle = 'rgba(20,16,12,.78)';
    rr(c, W / 2 - 92, ty, 184, 50, 8);
    c.fill();
    c.font = '700 22px "Chakra Petch", Impact, sans-serif';
    c.fillStyle = B.t < 30 && !B.obj ? '#ff8a6a' : '#ece8df';
    c.fillText(fmt(Math.max(0, B.t)), W / 2, ty + 4);
    c.font = '600 12px "Barlow Semi Condensed", sans-serif';
    c.fillStyle = '#ffd257';
    c.fillText(
      G.run
        ? `Wave ${G.round} · ${'♥'.repeat(Math.max(0, G.run.hearts))}${G.run.boss ? ' · BOSS' : ''}`
        : `Round ${G.round} · ${stakeLine(G.round)} · ${G.score[0]}–${G.score[1]}`,
      W / 2,
      ty + 31
    );
    let y = ty + 56;
    y = drawSpecialHUD(c, W, y);
    if (B.ring && B.seq === 'play' && B.special !== 'sumo') {
      c.font = '700 12px "Barlow Semi Condensed", sans-serif';
      c.fillStyle = '#ff8a6a';
      c.fillText('SUDDEN DEATH · the ring is closing', W / 2, y);
    }
    if (B.replay && RP) {
      c.textAlign = 'left';
      c.font = '700 16px "Chakra Petch", Impact, sans-serif';
      c.fillStyle = Math.sin(ANIM * 5) > 0 ? '#ff4d4d' : '#ece8df';
      c.fillText(`● ${RP.mode === 'kill' ? 'KILL-CAM' : 'REPLAY'} ${RP.speed}×`, 16, H - 120);
      c.textAlign = 'center';
    }
  }
  // active synergies under your health bar
  const syn = Object.entries((v.syn && v.syn.tier) || {});
  if (syn.length && !narrow) {
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.font = '700 10px "Barlow Semi Condensed", sans-serif';
    let sx = 12;
    const sy = 12 + 8 + rows.length * 26 + 4 + (B.crowd && G.phase === 'battle' ? 20 : 0); // under the hype meter
    for (const [t, lvl] of syn) {
      const label = `${TAGS[t].toUpperCase()} ${'★'.repeat(lvl)}`,
        w = c.measureText(label).width + 12;
      c.fillStyle = 'rgba(20,16,12,.72)';
      c.fillRect(sx, sy, w, 16);
      c.fillStyle = lvl > 1 ? '#ffd257' : '#ece8df';
      c.fillText(label, sx + 6, sy + 3);
      sx += w + 4;
    }
    c.textAlign = 'center';
  }
  const ctl = [
    ['WASD/↑↓←→', 'drive'],
    ['LMB/Space', 'fire']
  ];
  if (h.piston || h.catapult || h.harpoon || h.flipper || h.tractor || PLAN_ACTION.some(id => h[id]))
    ctl.push([
      'RMB',
      `${h.harpoon ? 'reel / ' : ''}action${Math.max(abilityCooldown(v, 'pcd'), abilityCooldown(v, 'ccd')) > 0 ? ' ' + Math.max(abilityCooldown(v, 'pcd'), abilityCooldown(v, 'ccd')).toFixed(1) + 's' : ''}`
    ]);
  if (h.booster || h.nitro)
    ctl.push([
      'Shift',
      `boost${abilityCooldown(v, 'bcd') > 0 ? ' ' + abilityCooldown(v, 'bcd').toFixed(1) + 's' : ''}`
    ]);
  const rmbJoints = (v.joints || []).filter(J => J.alive && !J.g && J.id !== 'suspension');
  if (rmbJoints.length && !ctl.some(c => c[0] === 'RMB'))
    ctl.push([
      'RMB',
      [
        ...new Set(
          rmbJoints.map(J => (jtype(J) === 'rotator' ? 'reverse spin' : jtype(J) === 'hinge' ? 'swing' : 'extend'))
        )
      ].join(' / ')
    ]);
  for (const [g, names] of groupHints(v)) ctl.push([g, names]);
  if (h.jump) ctl.push(['J', `jump${v.jumpCd > 0 ? ' ' + v.jumpCd.toFixed(1) : ''}`]);
  if (h.omni) ctl.push(['Q/E', 'strafe']);
  if (h.oil || h.glue || h.banana || h.mines || PLAN_DROP.some(id => h[id]))
    ctl.push(['Z', `drop${h.glue ? ' · glue ' + v.glue : ''}`]);
  if (h.smoke || h.decoy || h.jammer || h.flare || h.emp || h.flashbang || h.rubberduck)
    ctl.push(['V', `counter${v.cmCd > 0 ? ' ' + v.cmCd.toFixed(0) + 's' : ''}`]);
  if (h.blink) ctl.push(['F', `blink${v.blinkCd > 0 ? ' ' + v.blinkCd.toFixed(0) + 's' : ''}`]);
  if (h.horn || h.prizebell) ctl.push(['H', 'horn']);
  if (h.anchor || h.gripstud || h.rescue) ctl.push(['C', v.anchored ? 'anchor up' : 'anchor']);
  if (h.coupler) ctl.push(['X', 'release']);
  {
    c.textAlign = 'left';
    c.textBaseline = 'bottom';
    c.font = '600 12px "Barlow Semi Condensed", sans-serif';
    let x = 14;
    let y = H - 14;
    for (const [k, l] of ctl) {
      const t = `${k} ${l}`,
        w = c.measureText(t).width + 14;
      if (x + w > W - 14) {
        x = 14;
        y -= 28;
      }
      c.fillStyle = 'rgba(20,16,12,.7)';
      c.fillRect(x, y - 20, w, 22);
      c.fillStyle = '#ece8df';
      c.fillText(t, x + 7, y - 4);
      x += w + 6;
    }
  }
  if (B.seq === 'count') {
    const n = B.seqT < 0.9 ? '3' : B.seqT < 1.8 ? '2' : B.seqT < 2.7 ? '1' : 'GO';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const sc = n === 'GO' ? 1.15 + (B.seqT - 2.7) * 0.5 : 1.35 - Math.min(1, (B.seqT % 0.9) / 0.25) * 0.35;
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(sc, sc);
    c.font = `700 ${Math.min(110, W * 0.16)}px "Chakra Petch", Impact, sans-serif`;
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.fillText(n, 4, 4);
    c.fillStyle = '#f2b705';
    c.fillText(n, 0, 0);
    c.restore();
  }
  if (B.seq === 'in' && G.phase === 'battle') {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '600 18px "Barlow Semi Condensed", sans-serif';
    c.fillStyle = '#bff';
    c.fillText(`${G.run ? 'Wave' : 'Round'} ${G.round} · ${B.theme.name}`, W / 2, H * 0.78);
  }
  if (B.seq === 'out' && $('#ovVS').hidden) {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '600 18px "Barlow Semi Condensed", sans-serif';
    c.fillStyle = '#bff';
    c.fillText('Locking coordinates…', W / 2, H * 0.78);
  }
  if (B.banner) {
    const t = B.banner.t,
      sc = t < 0.25 ? 3 - 8 * t : 1;
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(sc, sc);
    c.globalAlpha = Math.min(1, t * 4);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${Math.min(84, W * 0.11)}px "Chakra Petch", Impact, sans-serif`;
    c.fillStyle = 'rgba(0,0,0,.5)';
    c.fillText(B.banner.text, 5, 5);
    c.fillStyle = B.banner.col;
    c.fillText(B.banner.text, 0, 0);
    if (B.banner.sub) {
      c.font = '600 18px "Barlow Semi Condensed", sans-serif';
      c.fillStyle = '#ece8df';
      c.fillText(B.banner.sub, 0, Math.min(60, W * 0.08));
    }
    c.restore();
  }
  if (B.net === 'client' && B.lag > 1.5) {
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.font = '600 13px "Barlow Semi Condensed", sans-serif';
    c.fillStyle = '#ff8a6a';
    c.fillText('Connection hiccup… waiting for host', W / 2, H - 60);
  }
}

/** World-space hit markers where your shots landed. */
function drawHitMarks(c) {
  c.save();
  c.lineWidth = 2.5 / cam.z;
  for (const h of B.hitMarks) {
    const r = 5 + (0.3 - h.t) * 14;
    c.strokeStyle = `rgba(255,255,255,${Math.min(1, h.t * 5)})`;
    c.beginPath();
    c.moveTo(h.x - r, h.y - r);
    c.lineTo(h.x - r / 2.5, h.y - r / 2.5);
    c.moveTo(h.x + r, h.y - r);
    c.lineTo(h.x + r / 2.5, h.y - r / 2.5);
    c.moveTo(h.x - r, h.y + r);
    c.lineTo(h.x - r / 2.5, h.y + r / 2.5);
    c.moveTo(h.x + r, h.y + r);
    c.lineTo(h.x + r / 2.5, h.y + r / 2.5);
    c.stroke();
  }
  c.restore();
}
/** Red pulsing edges and a heartbeat when your car is nearly scrap. */
function lowHealth(c, v) {
  if (v.dead || G.phase !== 'battle' || B.seq !== 'play') return;
  const hp = integrity(v);
  if (hp > 0.3) return;
  const k = (0.3 - hp) / 0.3,
    pulse = 0.5 + Math.sin(ANIM * (6 + k * 6)) * 0.5,
    g = c.createRadialGradient(
      view.w / 2,
      view.h / 2,
      Math.min(view.w, view.h) * 0.3,
      view.w / 2,
      view.h / 2,
      Math.max(view.w, view.h) * 0.7
    );
  g.addColorStop(0, 'rgba(200,20,10,0)');
  g.addColorStop(1, `rgba(200,20,10,${0.25 + k * 0.35 * pulse})`);
  c.fillStyle = g;
  c.fillRect(0, 0, view.w, view.h);
  if ((B.heartT = (B.heartT || 0) - 1 / 60) <= 0) {
    B.heartT = 1.1 - k * 0.5;
    playSfx('heart');
  }
}
let nightCv = null;
/** Night Shift: darkness everywhere except headlights, fires, explosions and pickups. */
function drawNight(c, s, dark = 0.9, flash = 1) {
  const W = view.w,
    H = view.h,
    d = dprOf();
  if (!nightCv) nightCv = document.createElement('canvas');
  if (nightCv.width !== Math.round(W * d) || nightCv.height !== Math.round(H * d)) {
    nightCv.width = Math.round(W * d);
    nightCv.height = Math.round(H * d);
  }
  const n = nightCv.getContext('2d');
  n.setTransform(d, 0, 0, d, 0, 0);
  n.globalCompositeOperation = 'source-over';
  n.clearRect(0, 0, W, H);
  n.fillStyle = `rgba(4,6,18,${dark * flash})`;
  n.fillRect(0, 0, W, H);
  n.globalCompositeOperation = 'destination-out';
  const toS = (x, y) => worldToScreen(x, y, s);
  const light = (x, y, r, a = 1) => {
    const [sx, sy] = toS(x, y),
      R = r * s,
      g = n.createRadialGradient(sx, sy, 0, sx, sy, R);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    n.fillStyle = g;
    n.fillRect(sx - R, sy - R, R * 2, R * 2);
  };
  for (const v of B.cars) {
    if (v.dead) continue;
    light(v.x, v.y, v.rad + 90, 0.95);
    // headlight cone
    const fa = v.a - Math.PI / 2,
      [sx, sy] = toS(v.x, v.y),
      L = 460 * s,
      g = n.createRadialGradient(sx, sy, v.rad * s, sx, sy, L);
    g.addColorStop(0, 'rgba(0,0,0,.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    n.fillStyle = g;
    n.beginPath();
    n.moveTo(sx, sy);
    n.arc(sx, sy, L, fa - 0.42, fa + 0.42);
    n.closePath();
    n.fill();
  }
  for (const f of B.fx) {
    if (f.k === 'fire') light(f.x, f.y, f.r * 9, 0.5 * (f.life / f.max));
    else if (f.k === 'flash' || f.k === 'ring') light(f.x, f.y, (f.r || 40) * 2.2, 0.8 * (f.life / f.max));
  }
  for (const z of B.zones) if (z.kind === 'fire') light(z.x, z.y, z.r * 2, 0.7);
  for (const p of B.pk) if (p.cd <= 0) light(p.x, p.y, 70, 0.8);
  for (const sh of B.shots) if (sh.kind !== 'bullet') light(sh.x, sh.y, 60, 0.5);
  c.drawImage(nightCv, 0, 0, W, H);
}

/** Telemetry plate (bottom right): speed, damage per second out and in, parts left, and a DPS trace. */
function drawTelemetry(c, v, W, H) {
  if (G.phase !== 'battle' || B.replay || W < 760) return;
  const T = (B.tele = B.tele || { t: 0, hist: [], dealt: v.dealt || 0, hp: 0, inHist: [] });
  const hpNow = v.insts.reduce((a, I) => a + (I.alive ? Math.max(0, I.hp) : 0), 0);
  if (!T.hp) T.hp = hpNow;
  T.t += 1 / 60;
  if (T.t >= 0.25) {
    T.t = 0;
    T.hist.push(Math.max(0, (v.dealt || 0) - T.dealt) * 4);
    T.inHist.push(Math.max(0, T.hp - hpNow) * 4);
    T.dealt = v.dealt || 0;
    T.hp = hpNow;
    if (T.hist.length > 40) (T.hist.shift(), T.inHist.shift());
  }
  const avg = a => (a.length ? a.slice(-12).reduce((x, y) => x + y, 0) / Math.min(12, a.length) : 0),
    dps = Math.round(avg(T.hist)),
    din = Math.round(avg(T.inHist)),
    kmh = Math.round(Math.hypot(v.vx || 0, v.vy || 0) * 0.4),
    alive = v.insts.filter(I => I.alive).length,
    w = 230,
    h = 92,
    x = W - w - 14,
    y = H - h - 64;
  c.save();
  c.fillStyle = 'rgba(10,16,32,.82)';
  c.beginPath();
  c.moveTo(x + 8, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w, y + h - 8);
  c.lineTo(x + w - 8, y + h);
  c.lineTo(x, y + h);
  c.lineTo(x, y + 8);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(91,231,255,.35)';
  c.stroke();
  c.font = '700 10px "Chakra Petch", sans-serif';
  c.textBaseline = 'top';
  c.textAlign = 'left';
  const cell = (lx, label, val, col) => {
    c.fillStyle = '#7fb8d6';
    c.font = '700 10px "Chakra Petch", sans-serif';
    c.fillText(label, x + lx, y + 8);
    c.fillStyle = col;
    c.font = '700 18px "Chakra Petch", sans-serif';
    c.fillText(String(val), x + lx, y + 20);
  };
  cell(10, 'KM/H', kmh, '#e6f1ff');
  cell(66, 'DPS OUT', dps, '#3fe0a0');
  cell(130, 'DPS IN', din, din > dps ? '#ff8a9c' : '#e6f1ff');
  cell(190, 'PARTS', alive, '#ffd257');
  // trace of the last 10 s: out (green) over in (red)
  const gx = x + 10,
    gy = y + 48,
    gw = w - 20,
    gh = 34,
    mx = Math.max(40, ...T.hist, ...T.inHist);
  c.strokeStyle = 'rgba(91,231,255,.12)';
  for (let i = 0; i <= 2; i++) {
    c.beginPath();
    c.moveTo(gx, gy + (gh * i) / 2);
    c.lineTo(gx + gw, gy + (gh * i) / 2);
    c.stroke();
  }
  const trace = (a, col) => {
    if (a.length < 2) return;
    c.strokeStyle = col;
    c.lineWidth = 1.6;
    c.beginPath();
    a.forEach((val, i) => {
      const px = gx + (i / 39) * gw,
        py = gy + gh - (val / mx) * gh;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    });
    c.stroke();
  };
  trace(T.inHist, 'rgba(255,92,122,.8)');
  trace(T.hist, '#3fe0a0');
  c.restore();
}

/** Soft vignette and a cool top light: frames the arena like a broadcast camera. Cached per screen size. */
let _vig = null;
function drawVignette(c) {
  if (SETTINGS.perf) return;
  const W = view.w,
    H = view.h;
  if (!_vig || _vig.w !== W || _vig.h !== H) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(W / 2));
    cv.height = Math.max(1, Math.round(H / 2));
    const x = cv.getContext('2d'),
      g = x.createRadialGradient(
        cv.width / 2,
        cv.height * 0.45,
        Math.min(cv.width, cv.height) * 0.35,
        cv.width / 2,
        cv.height / 2,
        Math.hypot(cv.width, cv.height) * 0.62
      );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(4,8,18,.42)');
    x.fillStyle = g;
    x.fillRect(0, 0, cv.width, cv.height);
    const t = x.createLinearGradient(0, 0, 0, cv.height * 0.35);
    t.addColorStop(0, 'rgba(91,231,255,.06)');
    t.addColorStop(1, 'rgba(91,231,255,0)');
    x.fillStyle = t;
    x.fillRect(0, 0, cv.width, cv.height * 0.35);
    _vig = { w: W, h: H, cv };
  }
  c.drawImage(_vig.cv, 0, 0, W, H);
}
