// Open world, part 4: how it feels. Day turns to night (more raiders, better loot), camps look
// lived-in, crates burst and parts hop out, finds fly into your HUD, a finished mission gets a party,
// and you can travel between camps you have found.

/* ---------- day and night ---------- */
const OW_DAY = 300; // seconds for a whole day
/** How dark it is: 0 in the day, 1 deep in the night. */
function owNight() {
  if (!OW) return 0;
  const p = ((((OW.clock || 0) / OW_DAY) % 1) + 1) % 1;
  if (p < 0.5) return 0;
  if (p < 0.6) return (p - 0.5) / 0.1;
  if (p < 0.9) return 1;
  return 1 - (p - 0.9) / 0.1;
}
const owIsNight = () => owNight() > 0.5;
/** Darkness over the world, with light around cars, camps, raider fires and loot. */
function owSky(c, s) {
  const n = owNight();
  if (n > 0.01)
    drawNight(c, s, 0.66 * n, 1, light => {
      for (const cp of OW.camps) light(cp.x, cp.y, 340, 0.95);
      for (const ch of OW.chunks.values()) if (ch.on && ch.poi) light(ch.poi.x, ch.poi.y, 300, 0.85);
    });
  // dusk and dawn: a warm wash
  const d = 4 * n * (1 - n);
  if (d > 0.02) {
    c.fillStyle = `rgba(255,120,50,${0.11 * d})`;
    c.fillRect(0, 0, view.w, view.h);
  }
}

/* ---------- every frame (both computers) ---------- */
function owFxStep(dt) {
  const v = myCar();
  if (!v) return;
  // a big jump (respawn, travel): cut the camera there behind a quick fade instead of a long swoop
  if (OW.lp && Math.hypot(v.x - OW.lp[0], v.y - OW.lp[1]) > 1500) {
    cam.x = cam.tx = v.x;
    cam.y = cam.ty = v.y;
    OW.fade = 1;
  }
  OW.lp = [v.x, v.y];
  // the clock; the host's clock wins in co-op (it travels with the snapshot)
  const was = owIsNight();
  OW.clock = (OW.clock || OW_DAY * 0.12) + dt;
  if (was !== owIsNight())
    OW.toast = owIsNight()
      ? { text: 'Night falls', sub: 'More raiders on the road, and the crates hold better parts', t: 0, col: '#8fb4ff' }
      : { text: 'Morning', sub: 'The raiders crawl back to their camps', t: 0, col: '#ffd257' };
  // parts hopping out of a crate
  for (const p of B.pk) if (p.pop && (p.pop.t += dt) > 0.55) p.pop = null;
  // loot drifts toward you when you are close (the host moves it; the client sees it in the snapshot)
  if (B.net !== 'client')
    for (const p of B.pk) {
      if (p.kind !== 'part' || p.gone || p.pop || p.cd > 0) continue;
      for (const c of B.cars) {
        if (!c || !c.player || c.dead) continue;
        const dx = c.x - p.x,
          dy = c.y - p.y,
          d = Math.hypot(dx, dy);
        if (d < 150 && d > 1) {
          const k = Math.min(d, (520 - d * 2) * dt);
          p.x += (dx / d) * k;
          p.y += (dy / d) * k;
          break;
        }
      }
    }
  // finds flying into the HUD
  OW.fly = (OW.fly || []).filter(f => (f.t += dt) < 0.8);
  OW.pulse = Math.max(0, (OW.pulse || 0) - dt * 2.5);
  OW.fade = Math.max(0, (OW.fade || 0) - dt * 1.6);
  // the scrap counter runs up instead of jumping
  OW.shown = OW.shown == null ? OW.scrap : OW.shown + (OW.scrap - OW.shown) * Math.min(1, dt * 6);
  if (Math.abs(OW.shown - OW.scrap) < 0.5) OW.shown = OW.scrap;
  // life at camps and raider camps near you: welding sparks, a fire, smoke
  for (const cp of OW.camps) {
    if (Math.abs(cp.x - v.x) > 1300 || Math.abs(cp.y - v.y) > 900) continue;
    if (Math.random() < dt * 1.4) {
      const a = rnd(0, 7);
      owSpark(cp.x + Math.cos(a) * 96, cp.y + Math.sin(a) * 96, 6, '#ffe28a');
    }
  }
  for (const ch of OW.chunks.values()) {
    const P = ch.on && ch.poi;
    if (!P || Math.abs(P.x - v.x) > 1300 || Math.abs(P.y - v.y) > 900) continue;
    if (Math.random() < dt * 14)
      B.fx.push({
        k: 'fire',
        x: P.x + rnd(-10, 10),
        y: P.y + rnd(-10, 10),
        vx: rnd(-15, 15),
        vy: rnd(-60, -25),
        life: rnd(0.3, 0.6),
        max: 0.6,
        r: rnd(4, 8)
      });
    if (Math.random() < dt * 3)
      B.fx.push({
        k: 'smoke',
        x: P.x,
        y: P.y - 10,
        vx: rnd(-10, 10) + 14,
        vy: rnd(-40, -20),
        life: rnd(1.4, 2.2),
        max: 2.2,
        r: rnd(8, 14)
      });
  }
}
/** Local sparks (not replicated: both computers make their own). */
function owSpark(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 7),
      sp = rnd(50, 170);
    B.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.15, 0.35), max: 0.35, col });
  }
}
/** A shower of confetti around a spot. */
function owConfetti(x, y, n = 60) {
  const cols = ['#ffd257', '#5be7ff', '#ff5c7a', '#5cc38f', '#b78bff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2),
      sp = rnd(120, 420);
    B.fx.push({
      k: 'conf',
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 180,
      life: rnd(1.1, 1.9),
      max: 1.9,
      a: rnd(0, 7),
      r: rnd(4, 8),
      col: pick(cols)
    });
  }
}
/** A crate or safe bursts: splinters, a glint, a little kick. */
function owCrateBurst(o) {
  const wood = o.d.loot === 2 ? ['#6f7780', '#9aa3ac', '#3d434a'] : ['#b8834a', '#8a5a2b', '#d9a35f'];
  for (let i = 0; i < 12; i++) {
    const a = rnd(0, 7),
      sp = rnd(80, 260);
    B.fx.push({
      k: 'chip',
      x: o.x,
      y: o.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: rnd(0.4, 0.8),
      max: 0.8,
      a: rnd(0, 7),
      r: rnd(4, 9),
      col: pick(wood)
    });
  }
  owSpark(o.x, o.y, 10, '#ffe28a');
  B.fx.push({ k: 'ring', x: o.x, y: o.y, life: 0.4, max: 0.4, r: 50, col: '255,226,138' });
  B.shake = Math.max(B.shake || 0, o.d.loot === 2 ? 6 : 3);
  sfx(o.d.loot === 2 ? 'jackpot' : 'reveal', o.x, o.y);
}

/* ---------- drawing in the world ---------- */
function owInView(x, y, pad = 200) {
  const s = view.sc * cam.z;
  return Math.abs(x - cam.x) < view.w / (2 * s) + pad && Math.abs(y - cam.y) < view.h / (2 * s) + pad;
}
/** Camps: a turning ring, a flag in the wind and a beacon; raider camps: a flickering fire. */
function owDrawLife(c) {
  const me = myCar();
  for (const cp of OW.camps) {
    if (!owInView(cp.x, cp.y, 260)) continue;
    const home = cp === OW.home,
      col = home ? '63,224,160' : '242,183,5',
      near = me && !me.dead && Math.hypot(me.x - cp.x, me.y - cp.y) < 300;
    c.save();
    c.strokeStyle = `rgba(${col},.55)`;
    c.lineWidth = 5;
    c.setLineDash([30, 22]);
    c.lineDashOffset = -ANIM * 40;
    c.beginPath();
    c.arc(cp.x, cp.y, 132, 0, 7);
    c.stroke();
    c.setLineDash([]);
    if (near) {
      const k = (ANIM * 1.2) % 1;
      c.strokeStyle = `rgba(${col},${0.6 * (1 - k)})`;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(cp.x, cp.y, 120 + k * 70, 0, 7);
      c.stroke();
    }
    // flag pole with a waving flag
    const fx = cp.x + 92,
      fy = cp.y - 92;
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.beginPath();
    c.ellipse(fx + 4, fy + 4, 7, 4, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#d8dde3';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(fx, fy);
    c.lineTo(fx, fy - 50);
    c.stroke();
    c.fillStyle = `rgb(${col})`;
    c.beginPath();
    c.moveTo(fx, fy - 50);
    for (let i = 0; i <= 8; i++) c.lineTo(fx + i * 4.5, fy - 50 + Math.sin(ANIM * 7 - i * 0.8) * 3 * (i / 8));
    for (let i = 8; i >= 0; i--) c.lineTo(fx + i * 4.5, fy - 32 + Math.sin(ANIM * 7 - i * 0.8) * 3 * (i / 8));
    c.closePath();
    c.fill();
    // beacon on top of the pole
    c.globalCompositeOperation = 'lighter';
    c.translate(fx, fy - 52);
    glowDisc(c, 16 + Math.sin(ANIM * 5) * 4, home ? '#3fe0a0' : '#f2b705');
    c.restore();
  }
  for (const ch of OW.chunks.values()) {
    const P = ch.on && ch.poi;
    if (!P || !owInView(P.x, P.y)) continue;
    c.save();
    c.translate(P.x, P.y);
    // stones around the fire
    c.fillStyle = '#5a5550';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.arc(Math.cos(a) * 22, Math.sin(a) * 22, 6, 0, 7);
      c.fill();
    }
    c.globalCompositeOperation = 'lighter';
    glowDisc(c, 46 + Math.sin(ANIM * 13) * 5 + Math.sin(ANIM * 7.3) * 4, '#ff8a2a');
    glowDisc(c, 20 + Math.sin(ANIM * 17) * 3, '#ffd257');
    c.restore();
  }
}
/** A part on the ground: hops out of its crate, bobs, glows in its rarity; rare ones send up a beam. */
function drawPartPickup(c, p) {
  if (p.gone) return;
  const m = MOD[p.id];
  if (!m) return;
  const col = RAR[m.rar].col;
  let x = p.x,
    y = p.y,
    h = 0,
    spin = 0;
  if (p.pop) {
    const u = Math.min(1, p.pop.t / 0.55),
      e = 1 - (1 - u) * (1 - u);
    x = p.pop.x + (p.x - p.pop.x) * e;
    y = p.pop.y + (p.y - p.pop.y) * e;
    h = Math.sin(u * Math.PI) * 70 * (1 - u * 0.3);
    spin = (1 - u) * 8;
  }
  const bob = p.pop ? 0 : Math.sin(ANIM * 3 + p.x) * 3;
  c.save();
  c.translate(x, y);
  // shadow on the ground
  c.fillStyle = `rgba(0,0,0,${0.3 - h / 400})`;
  c.beginPath();
  c.ellipse(0, 4, 16 - h / 10, 6 - h / 30, 0, 0, 7);
  c.fill();
  c.globalCompositeOperation = 'lighter';
  if (m.rar >= 2 && !p.pop) {
    // a light beam you can spot from far away
    const tall = 120 + m.rar * 40,
      g = c.createLinearGradient(0, 0, 0, -tall);
    g.addColorStop(0, col + 'aa');
    g.addColorStop(1, col + '00');
    c.fillStyle = g;
    const w = 7 + Math.sin(ANIM * 5 + p.x) * 2;
    c.fillRect(-w, -tall, w * 2, tall);
  }
  c.translate(0, bob - h);
  glowDisc(c, 30 + Math.sin(ANIM * 4) * 4, col);
  c.globalCompositeOperation = 'source-over';
  c.rotate(spin);
  circ(c, 0, 0, 17, 'rgba(10,14,24,.85)', col, 2);
  const im = owIconImg(p.id);
  if (im.complete) c.drawImage(im, -14, -14, 28, 28);
  if (m.rar >= 3) {
    // twinkle
    const t = (ANIM * 1.3 + p.x * 0.01) % 1;
    c.globalAlpha = Math.sin(t * Math.PI);
    c.fillStyle = '#fff';
    c.translate(12, -12);
    c.rotate(ANIM * 2);
    c.fillRect(-6, -1, 12, 2);
    c.fillRect(-1, -6, 2, 12);
  }
  c.restore();
}

/* ---------- drawing on the HUD ---------- */
/** Finds fly from where you picked them up into the My parts counter. */
function owDrawFly(c, tx, ty) {
  for (const f of OW.fly || []) {
    if (f.sx == null) [f.sx, f.sy] = worldToScreen(f.x, f.y);
    const u = Math.min(1, f.t / 0.7),
      e = u * u * (3 - 2 * u),
      x = f.sx + (tx - f.sx) * e,
      y = f.sy + (ty - f.sy) * e - Math.sin(u * Math.PI) * 120,
      sz = 34 - 16 * e;
    if (u >= 1 && !f.hit) {
      f.hit = true;
      OW.pulse = 1;
      sfx('tick');
    }
    if (u >= 1) continue;
    c.save();
    c.globalAlpha = 1 - Math.max(0, u - 0.85) * 6;
    c.translate(x, y);
    const m = MOD[f.id];
    c.globalCompositeOperation = 'lighter';
    glowDisc(c, sz, RAR[m.rar].col);
    c.globalCompositeOperation = 'source-over';
    const im = owIconImg(f.id);
    if (im.complete) c.drawImage(im, -sz / 2, -sz / 2, sz, sz);
    c.restore();
  }
}
/** Sun or moon with the time of day, drawn at x, y. */
function owDrawClock(c, x, y) {
  const n = owNight(),
    p = ((((OW.clock || 0) / OW_DAY) % 1) + 1) % 1;
  c.save();
  c.translate(x, y);
  c.strokeStyle = 'rgba(255,255,255,.18)';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, 11, 0, 7);
  c.stroke();
  c.strokeStyle = n > 0.5 ? '#8fb4ff' : '#ffd257';
  c.beginPath();
  c.arc(0, 0, 11, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  c.stroke();
  if (n > 0.5) {
    c.fillStyle = '#cfe0ff';
    c.beginPath();
    c.arc(0, 0, 6, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(6,10,20,1)';
    c.beginPath();
    c.arc(3, -2, 5, 0, 7);
    c.fill();
  } else {
    c.fillStyle = '#ffd257';
    c.beginPath();
    c.arc(0, 0, 5, 0, 7);
    c.fill();
  }
  c.restore();
}
/** A rounded panel with a coloured edge on the left. */
function owPanel(c, x, y, w, h, edge) {
  c.fillStyle = 'rgba(6,10,20,.82)';
  c.beginPath();
  c.roundRect ? c.roundRect(x, y, w, h, 8) : c.rect(x, y, w, h);
  c.fill();
  c.strokeStyle = 'rgba(91,231,255,.18)';
  c.lineWidth = 1;
  c.stroke();
  if (edge) {
    c.fillStyle = edge;
    c.fillRect(x, y + 8, 3, h - 16);
  }
}

/* ---------- travelling between camps ---------- */
function owCanTravel(v) {
  if (!v || v.dead) return 'Your car is wrecked';
  if (OW.mission && OW.mission.carrying === v.idx) return 'Not with the crate on board';
  if (B.cars.some(r => r && !r.player && !r.dead && r.aggro && Math.hypot(r.x - v.x, r.y - v.y) < 900))
    return 'Raiders are on your tail';
  return '';
}
function owTravel(v, camp) {
  if (!v || !camp) return;
  if (B.net === 'client' && v.idx === B.me) return Net.send({ t: 'owtravel', i: camp.i, j: camp.j });
  v.x = camp.x + (v.idx ? 60 : -40);
  v.y = camp.y + 40;
  v.vx = v.vy = 0;
  if (v.idx === B.me) {
    OW.home = camp;
    cam.x = cam.tx = v.x;
    cam.y = cam.ty = v.y;
  }
  OW.homes[v.idx] = camp;
  sfx('tele', v.x, v.y);
  fx({ k: 'ring', x: v.x, y: v.y, life: 0.6, max: 0.6, r: 90, col: '91,231,255' });
}
