// Arena gimmicks for the newer themes: lava, conveyor belts, air vents, pinball bumpers,
// stove plates and mud, plus desert wind and haunted darkness. Physics runs on the host
// (like every other zone); visuals only use the synced round timer so clients match.

/** A gimmick zone centred on (x, y). Rects use x/y as their corner, like the other zones. */
function gimmickZone(kind, x, y) {
  if (kind === 'lava') return { kind, x, y, r: rnd(55, 80), seed: Math.random() * 9 };
  if (kind === 'mud') return { kind, x, y, r: rnd(70, 100), seed: Math.random() * 9 };
  if (kind === 'stove') return { kind, x, y, r: 52, seed: Math.random() * 6 };
  if (kind === 'bumper') return { kind, x, y, r: 28 };
  if (kind === 'belt') {
    const v = Math.random() < 0.5,
      w = v ? 64 : 220,
      h = v ? 220 : 64;
    return { kind, x: x - w / 2, y: y - h / 2, w, h, ang: v ? pick([Math.PI / 2, -Math.PI / 2]) : pick([0, Math.PI]) };
  }
  if (kind === 'vent') return { kind, x: x - 45, y: y - 45, w: 90, h: 90, ang: pick([0, Math.PI / 2, -Math.PI / 2]) };
  return { kind: 'oil', x, y, r: 60 };
}
const gt = () => (B ? B.t || 0 : 0);
const stoveOn = z => Math.sin(gt() * 0.9 + z.seed) > 0.15;
const ventOn = z => (gt() + (z.x % 3)) % 6 < 2.6;
/** Wind for the desert: a slowly turning direction with gusts. Returns [fx, fy] in px/s². */
function windForce() {
  if (!B || !B.theme || !B.theme.wind || B.seq !== 'play') return [0, 0];
  const t = gt(),
    a = t * 0.13 + 1,
    k = Math.max(0, Math.sin(t * 0.55)) * 190 * B.theme.wind;
  return [Math.cos(a) * k, Math.sin(a) * k];
}

/** Host physics for a car. Called from drive() while on the ground. */
function gimmickCar(v, dt) {
  if (B.seq === 'in' || B.seq === 'count') return;
  for (const z of B.zones) {
    switch (z.kind) {
      case 'lava':
      case 'stove':
        if ((z.kind === 'lava' || stoveOn(z)) && inZone(v.x, v.y, z) && !v.c.hoverMode)
          for (const I of v.insts)
            if (I.alive && I.layer === 'b' && Math.random() < dt * 2.5)
              hurtInst(v, I, z.kind === 'lava' ? 7 : 5, 'fire');
        break;
      case 'belt':
        if (inZone(v.x, v.y, z)) {
          v.vx += Math.cos(z.ang) * 380 * dt;
          v.vy += Math.sin(z.ang) * 380 * dt;
        }
        break;
      case 'vent':
        if (ventOn(z) && inZone(v.x, v.y, z)) {
          v.vx += Math.cos(z.ang) * 1300 * dt;
          v.vy += Math.sin(z.ang) * 1300 * dt;
          v.w += rnd(-3, 3) * dt;
        }
        break;
      case 'mud':
        if (inZone(v.x, v.y, z) && !v.c.hoverMode) {
          v.vx *= Math.exp(-2.4 * dt);
          v.vy *= Math.exp(-2.4 * dt);
          if (Math.random() < dt * 4)
            fx({ k: 'smoke', x: v.x + rnd(-15, 15), y: v.y, vx: 0, vy: -10, life: 0.5, max: 0.6, r: 4 });
        }
        break;
      case 'bumper': {
        const dx = v.x - z.x,
          dy = v.y - z.y,
          d = Math.hypot(dx, dy) || 1;
        if (d < z.r + v.rad * 0.55 && (v.bumpT || 0) < B.time) {
          v.bumpT = B.time + 0.25;
          v.vx += (dx / d) * 560;
          v.vy += (dy / d) * 560;
          z.hitT = 0.25;
          txt(z.x, z.y - 30, pick(['PING!', 'BONK!', '+500', 'TILT?']), '#7fe0ff', 0.7);
          sfx('bumper', z.x, z.y);
          B.shake = Math.max(B.shake, 3);
        }
        break;
      }
    }
  }
  const [wx, wy] = windForce();
  if (wx || wy) {
    const k = 1 / Math.max(1, Math.sqrt((v.c.mass || 20) / 20));
    v.vx += wx * k * dt;
    v.vy += wy * k * dt;
  }
}
/** Host physics for loose objects. */
function gimmickObj(o, dt) {
  if (o.fixed || o.z > 0) return;
  for (const z of B.zones) {
    if (z.kind === 'belt' && inZone(o.x, o.y, z)) {
      o.vx += Math.cos(z.ang) * 420 * dt;
      o.vy += Math.sin(z.ang) * 420 * dt;
    } else if (z.kind === 'vent' && ventOn(z) && inZone(o.x, o.y, z)) {
      o.vx += Math.cos(z.ang) * 1500 * dt;
      o.vy += Math.sin(z.ang) * 1500 * dt;
    } else if (z.kind === 'bumper') {
      const dx = o.x - z.x,
        dy = o.y - z.y,
        d = Math.hypot(dx, dy) || 1;
      if (d < z.r + o.r) {
        o.vx = (dx / d) * 480;
        o.vy = (dy / d) * 480;
        z.hitT = 0.2;
      }
    } else if ((z.kind === 'lava' || (z.kind === 'stove' && stoveOn(z))) && inZone(o.x, o.y, z))
      dmgObj(o, 12 * dt, 'fire');
  }
  const [wx, wy] = windForce();
  if ((wx || wy) && o.m < 6) {
    o.vx += wx * 1.6 * dt;
    o.vy += wy * 1.6 * dt;
  }
}

/** Draws a gimmick zone. Returns false for zones it does not know. */
function drawGimmickZone(c, z) {
  const t = gt(),
    A = typeof ANIM === 'number' ? ANIM : 0;
  switch (z.kind) {
    case 'lava': {
      const p = 0.85 + Math.sin(A * 2 + z.seed) * 0.15;
      circ(c, z.x, z.y, z.r + 8, 'rgba(30,14,10,.85)');
      const g = c.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
      g.addColorStop(0, '#fff3a0');
      g.addColorStop(0.35, '#ffa31a');
      g.addColorStop(0.8, '#e2401a');
      g.addColorStop(1, '#7a1a0a');
      c.save();
      c.globalAlpha = p;
      circ(c, z.x, z.y, z.r, g);
      c.restore();
      for (let i = 0; i < 4; i++) {
        const k = (A * 0.6 + i * 0.27 + z.seed) % 1,
          a = z.seed * 3 + i * 1.7;
        circ(
          c,
          z.x + Math.cos(a) * z.r * 0.5,
          z.y + Math.sin(a) * z.r * 0.5,
          3 + k * 6,
          `rgba(255,240,160,${0.6 * (1 - k)})`
        );
      }
      return true;
    }
    case 'mud': {
      circ(c, z.x, z.y, z.r, 'rgba(70,52,30,.85)', 'rgba(40,28,14,.6)', 4);
      circ(c, z.x - z.r * 0.25, z.y - z.r * 0.2, z.r * 0.45, 'rgba(95,72,44,.6)');
      for (let i = 0; i < 3; i++) {
        const k = (A * 0.4 + i * 0.33 + z.seed) % 1;
        circ(
          c,
          z.x + Math.cos(i * 2.1 + z.seed) * z.r * 0.5,
          z.y + Math.sin(i * 2.1 + z.seed) * z.r * 0.5,
          2 + k * 7,
          null,
          `rgba(140,110,70,${1 - k})`,
          2
        );
      }
      return true;
    }
    case 'stove': {
      const on = stoveOn(z);
      circ(c, z.x, z.y, z.r, '#2a2a2e', '#55555c', 4);
      for (let i = 1; i <= 3; i++)
        circ(
          c,
          z.x,
          z.y,
          (z.r * i) / 3.6,
          null,
          on ? `rgba(255,${80 + i * 30},40,${0.6 + Math.sin(A * 6 + i) * 0.2})` : '#3d3d44',
          5
        );
      if (on) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        circ(c, z.x, z.y, z.r * 1.2, 'rgba(255,90,30,.12)');
        c.restore();
      }
      return true;
    }
    case 'bumper': {
      const h = z.hitT > 0 ? z.hitT * 4 : 0;
      c.save();
      c.shadowColor = '#5be7ff';
      c.shadowBlur = 14 + h * 20;
      circ(c, z.x, z.y, z.r + h * 6, '#ff5c7a', '#ffe27a', 4);
      c.restore();
      circ(c, z.x, z.y, z.r * 0.55, '#fff3f6');
      circ(c, z.x, z.y, z.r * 0.3, '#ff5c7a');
      return true;
    }
    case 'belt': {
      c.save();
      c.fillStyle = '#26282c';
      c.fillRect(z.x, z.y, z.w, z.h);
      c.beginPath();
      c.rect(z.x, z.y, z.w, z.h);
      c.clip();
      const v = Math.abs(Math.sin(z.ang)) > 0.5,
        L = v ? z.h : z.w,
        dir = (v ? Math.sin(z.ang) : Math.cos(z.ang)) > 0 ? 1 : -1,
        off = (((t * 90 * dir) % 30) + 30) % 30;
      c.strokeStyle = 'rgba(242,183,5,.75)';
      c.lineWidth = 5;
      for (let s = -30; s < L + 30; s += 30) {
        const p = s + off,
          m = (v ? z.w : z.h) / 2;
        c.beginPath();
        if (v) {
          const y = z.y + p;
          c.moveTo(z.x + 10, y - 10 * dir);
          c.lineTo(z.x + m, y);
          c.lineTo(z.x + z.w - 10, y - 10 * dir);
        } else {
          const x = z.x + p;
          c.moveTo(x - 10 * dir, z.y + 10);
          c.lineTo(x, z.y + m);
          c.lineTo(x - 10 * dir, z.y + z.h - 10);
        }
        c.stroke();
      }
      c.restore();
      c.strokeStyle = '#6c7076';
      c.lineWidth = 3;
      c.strokeRect(z.x, z.y, z.w, z.h);
      return true;
    }
    case 'vent': {
      const on = ventOn(z);
      c.fillStyle = '#1d232c';
      c.fillRect(z.x, z.y, z.w, z.h);
      c.strokeStyle = '#4a5666';
      c.lineWidth = 3;
      for (let i = 1; i < 6; i++) {
        c.beginPath();
        c.moveTo(z.x + 6, z.y + (z.h * i) / 6);
        c.lineTo(z.x + z.w - 6, z.y + (z.h * i) / 6);
        c.stroke();
      }
      c.strokeRect(z.x, z.y, z.w, z.h);
      if (on) {
        const cx = z.x + z.w / 2,
          cy = z.y + z.h / 2,
          ca = Math.cos(z.ang),
          sa = Math.sin(z.ang);
        c.strokeStyle = 'rgba(200,240,255,.45)';
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const k = (A * 1.8 + i / 6) % 1,
            o = (i - 2.5) * 13,
            d = k * 170;
          c.beginPath();
          c.moveTo(cx + ca * d - sa * o, cy + sa * d + ca * o);
          c.lineTo(cx + ca * (d + 26) - sa * o, cy + sa * (d + 26) + ca * o);
          c.stroke();
        }
      } else {
        c.fillStyle = 'rgba(255,92,122,.8)';
        c.fillRect(z.x + z.w / 2 - 4, z.y - 8, 8, 4);
      }
      return true;
    }
  }
  return false;
}

/** Screen overlay: sand streaks in the wind, a lightning flash in the haunted house. */
function drawGimmickOverlay(c, s) {
  if (!B || !B.theme) return;
  if (B.theme.dark && B.special !== 'night') drawNight(c, s, 0.72, Math.sin(gt() * 7.3) > 0.985 ? 0.2 : 1);
  const [wx, wy] = windForce(),
    k = Math.hypot(wx, wy);
  if (k > 20 && SETTINGS.motion !== false) {
    const a = Math.atan2(wy, wx) + view.rot,
      ca = Math.cos(a),
      sa = Math.sin(a),
      W = view.w,
      H = view.h;
    c.save();
    c.strokeStyle = `rgba(240,210,160,${Math.min(0.45, k / 450)})`;
    c.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137.5 + ANIM * k * 1.4 * (0.6 + (i % 5) * 0.1)) % (W + 200)) - 100,
        sy = (i * 61.8) % H;
      const x = ca >= 0 ? sx : W - sx;
      c.beginPath();
      c.moveTo(x, sy);
      c.lineTo(x - ca * 30, sy - sa * 30);
      c.stroke();
    }
    c.fillStyle = `rgba(200,150,90,${Math.min(0.18, k / 1200)})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

/** Floor decoration for each new theme, painted once into the ground canvas. */
function decorateGround(g, th, kind) {
  if (kind === 'wait') return;
  const lines = (col, w, step, vert, horz) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    if (vert) for (let x = 0; x < AW; x += step) (g.beginPath(), g.moveTo(x, 0), g.lineTo(x, AH), g.stroke());
    if (horz) for (let y = 0; y < AH; y += step) (g.beginPath(), g.moveTo(0, y), g.lineTo(AW, y), g.stroke());
  };
  switch (th.id) {
    case 'volcano':
      g.strokeStyle = 'rgba(255,120,30,.35)';
      g.lineWidth = 3;
      for (let i = 0; i < 26; i++) {
        let x = rnd(0, AW),
          y = rnd(0, AH);
        g.beginPath();
        g.moveTo(x, y);
        for (let j = 0; j < 6; j++) g.lineTo((x += rnd(-60, 60)), (y += rnd(-60, 60)));
        g.stroke();
      }
      break;
    case 'space':
      lines('rgba(140,170,210,.18)', 2, 80, true, true);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = 'rgba(160,190,230,.25)';
        g.fillRect(Math.floor(rnd(0, AW / 80)) * 80 + 6, Math.floor(rnd(0, AH / 80)) * 80 + 6, 6, 6);
      }
      break;
    case 'carwash':
      lines('rgba(255,255,255,.22)', 2, 40, true, true);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = 'rgba(120,190,230,.25)';
        g.beginPath();
        g.ellipse(rnd(0, AW), rnd(0, AH), rnd(40, 110), rnd(20, 50), rnd(0, 3), 0, 7);
        g.fill();
      }
      break;
    case 'desert':
      g.strokeStyle = 'rgba(150,100,50,.25)';
      g.lineWidth = 3;
      for (let y = 30; y < AH; y += 46) {
        g.beginPath();
        for (let x = 0; x <= AW; x += 30) g.lineTo(x, y + Math.sin(x / 90 + y) * 10);
        g.stroke();
      }
      break;
    case 'haunted':
      lines('rgba(15,8,18,.45)', 3, 46, false, true);
      g.fillStyle = 'rgba(120,20,40,.35)';
      g.fillRect(AW / 2 - 260, AH / 2 - 160, 520, 320);
      g.strokeStyle = 'rgba(220,180,90,.35)';
      g.lineWidth = 6;
      g.strokeRect(AW / 2 - 240, AH / 2 - 140, 480, 280);
      break;
    case 'toyroom': {
      g.strokeStyle = 'rgba(60,60,64,.55)';
      g.lineWidth = 70;
      g.beginPath();
      g.ellipse(AW / 2, AH / 2, AW * 0.33, AH * 0.3, 0, 0, 7);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 4;
      g.setLineDash([24, 20]);
      g.beginPath();
      g.ellipse(AW / 2, AH / 2, AW * 0.33, AH * 0.3, 0, 0, 7);
      g.stroke();
      g.setLineDash([]);
      break;
    }
    case 'factory':
      lines('rgba(242,183,5,.25)', 6, 240, true, false);
      break;
    case 'pinball':
      for (let i = 0; i < 120; i++) {
        g.fillStyle = `rgba(255,255,255,${rnd(0.1, 0.5)})`;
        g.fillRect(rnd(0, AW), rnd(0, AH), 2, 2);
      }
      g.strokeStyle = 'rgba(255,92,200,.35)';
      g.lineWidth = 5;
      for (const x of [AW * 0.25, AW * 0.75]) {
        g.beginPath();
        g.moveTo(x - 60, AH / 2 + 50);
        g.lineTo(x, AH / 2 - 30);
        g.lineTo(x + 60, AH / 2 + 50);
        g.stroke();
      }
      break;
    case 'kitchen':
      for (let y = 0; y < AH; y += 70)
        for (let x = 0; x < AW; x += 70)
          if (((x + y) / 70) % 2 === 0) {
            g.fillStyle = 'rgba(30,30,40,.16)';
            g.fillRect(x, y, 70, 70);
          }
      break;
    case 'swamp':
      for (let i = 0; i < 18; i++) {
        g.fillStyle = 'rgba(40,70,60,.45)';
        g.beginPath();
        g.ellipse(rnd(0, AW), rnd(0, AH), rnd(60, 150), rnd(40, 90), rnd(0, 3), 0, 7);
        g.fill();
      }
      for (let i = 0; i < 30; i++) {
        const x = rnd(0, AW),
          y = rnd(0, AH),
          r = rnd(8, 16);
        g.fillStyle = 'rgba(90,150,70,.7)';
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, r, 0.4, Math.PI * 2);
        g.fill();
      }
      break;
  }
}

/** Wall styles for the new themes. Returns false to fall back to the default walls. */
function drawWallExtra(c, s, theme) {
  const v = s.h > s.w,
    n = Math.floor((v ? s.h : s.w) / 18);
  const segs = f => {
    for (let i = 0; i < n; i++) f(v ? s.x : s.x + i * 18, v ? s.y + i * 18 : s.y, i);
  };
  switch (theme) {
    case 'basalt':
      c.fillStyle = '#26201f';
      c.fillRect(s.x, s.y, s.w, s.h);
      c.strokeStyle = 'rgba(255,120,30,.6)';
      c.lineWidth = 2;
      segs((x, y, i) => {
        if (i % 2) return;
        c.beginPath();
        c.moveTo(x + 4, y + 4);
        c.lineTo(x + (v ? s.w - 4 : 14), y + (v ? 14 : s.h - 4));
        c.stroke();
      });
      break;
    case 'metal':
      c.fillStyle = '#5b6878';
      c.fillRect(s.x, s.y, s.w, s.h);
      c.fillStyle = '#8796a8';
      segs((x, y) => c.fillRect(x + 2, y + 2, v ? s.w - 4 : 14, v ? 14 : s.h - 4));
      c.fillStyle = '#f2b705';
      if (v) c.fillRect(s.x, s.y, s.w, 6);
      else c.fillRect(s.x, s.y, 6, s.h);
      break;
    case 'tile':
      c.fillStyle = '#f2f5f7';
      c.fillRect(s.x, s.y, s.w, s.h);
      c.strokeStyle = '#b9c4cc';
      c.lineWidth = 1.5;
      segs((x, y) => c.strokeRect(x + 1, y + 1, v ? s.w - 2 : 16, v ? 16 : s.h - 2));
      break;
    case 'rocks':
      c.fillStyle = '#7d6a55';
      c.fillRect(s.x, s.y, s.w, s.h);
      segs((x, y, i) =>
        circ(c, x + (v ? s.w / 2 : 9), y + (v ? 9 : s.h / 2), 8 + (i % 3) * 2, i % 2 ? '#9a8468' : '#6a5946')
      );
      break;
    case 'toy':
      segs((x, y, i) => {
        c.fillStyle = ['#e2504a', '#f2b705', '#4ea1ff', '#5cc38f'][i % 4];
        c.fillRect(x, y, v ? s.w : 18, v ? 18 : s.h);
        circ(c, x + (v ? s.w / 2 : 9), y + (v ? 9 : s.h / 2), 4, 'rgba(255,255,255,.35)');
      });
      break;
    case 'neon':
      c.fillStyle = '#0b1030';
      c.fillRect(s.x, s.y, s.w, s.h);
      c.save();
      c.shadowColor = '#ff5cc8';
      c.shadowBlur = 12;
      c.strokeStyle = '#ff8fe0';
      c.lineWidth = 3;
      c.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      c.restore();
      break;
    default:
      return false;
  }
  c.strokeStyle = 'rgba(0,0,0,.35)';
  c.lineWidth = 2;
  c.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
  return true;
}

/* Art for the new junk. */
Object.assign(JUNKDRAW, {
  rock: (c, r) => {
    c.fillStyle = '#7d7468';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        k = r * (0.82 + ((i * 37) % 7) / 30);
      c.lineTo(Math.cos(a) * k, Math.sin(a) * k);
    }
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.beginPath();
    c.ellipse(-r * 0.3, -r * 0.3, r * 0.35, r * 0.2, -0.5, 0, 7);
    c.fill();
  },
  block: (c, r) => {
    const s = r * 1.4;
    c.fillStyle = '#4ea1ff';
    c.fillRect(-s / 2, -s / 2, s, s);
    c.fillStyle = '#ffe27a';
    c.font = `bold ${s * 0.7}px "Chakra Petch", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('B', 0, 1);
    c.strokeStyle = '#2a5fa0';
    c.lineWidth = 2;
    c.strokeRect(-s / 2, -s / 2, s, s);
  },
  teddy: (c, r) => {
    circ(c, -r * 0.55, -r * 0.6, r * 0.32, '#a8703f');
    circ(c, r * 0.55, -r * 0.6, r * 0.32, '#a8703f');
    circ(c, 0, 0, r * 0.85, '#b57d48');
    circ(c, 0, r * 0.2, r * 0.35, '#e0b98a');
    circ(c, -r * 0.3, -r * 0.15, r * 0.09, '#1a1a1a');
    circ(c, r * 0.3, -r * 0.15, r * 0.09, '#1a1a1a');
  },
  grave: (c, r) => {
    c.fillStyle = '#8a8f96';
    c.beginPath();
    c.moveTo(-r * 0.7, r * 0.6);
    c.lineTo(-r * 0.7, -r * 0.2);
    c.arc(0, -r * 0.2, r * 0.7, Math.PI, 0);
    c.lineTo(r * 0.7, r * 0.6);
    c.closePath();
    c.fill();
    c.fillStyle = '#55595f';
    c.fillRect(-r * 0.08, -r * 0.55, r * 0.16, r * 0.6);
    c.fillRect(-r * 0.3, -r * 0.35, r * 0.6, r * 0.14);
  },
  toaster: (c, r) => {
    c.fillStyle = '#c9d1d9';
    c.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
    c.fillStyle = '#3a3f46';
    c.fillRect(-r * 0.7, -r * 0.45, r * 0.5, r * 0.9);
    c.fillRect(r * 0.2, -r * 0.45, r * 0.5, r * 0.9);
    c.fillStyle = '#d8a35a';
    c.fillRect(-r * 0.62, -r * 0.35, r * 0.34, r * 0.25);
  },
  satellite: (c, r) => {
    circ(c, 0, 0, r * 0.9, '#d8dde2', '#8a96a3', 2);
    circ(c, 0, 0, r * 0.55, '#eef2f5');
    line(c, [0, 0, r * 0.7, -r * 0.7], '#5b6878', 3);
    circ(c, r * 0.7, -r * 0.7, r * 0.15, '#ff5c7a');
  }
});
