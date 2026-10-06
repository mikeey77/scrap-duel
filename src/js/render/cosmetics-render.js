// Drawing for cosmetics: liveries painted over body parts, movement trails and wreck effects.
const LIVERY_CATS = new Set(['struct', 'defense']);
const liveryPart = id => id === 'cockpit' || (LIVERY_CATS.has(MOD[id].cat) && !(MOD[id].size > 1));
const cellHash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
/**
 * Paints one grid cell of a livery. The context is already translated to the cell centre and rotated with the car.
 * s = cell size, gx/gy = grid position (patterns line up across cells), ctx = {minY, edge}.
 */
function drawLivery(c, livery, paint, gx, gy, s, ctx = {}) {
  if (!livery || livery === 'factory') return;
  const h = s / 2;
  c.save();
  c.beginPath();
  c.rect(-h * 0.92, -h * 0.92, h * 1.84, h * 1.84);
  c.clip();
  switch (livery) {
    case 'stripes':
      if (gx === 0) {
        c.fillStyle = 'rgba(255,255,255,.75)';
        c.fillRect(-h * 0.5, -h, h * 0.28, s);
        c.fillRect(h * 0.22, -h, h * 0.28, s);
      }
      break;
    case 'hazard':
      if (ctx.edge) {
        c.globalAlpha = 0.6;
        c.fillStyle = '#1b1b1b';
        c.fillRect(-h, -h, s, s);
        c.fillStyle = '#f2b705';
        for (let i = -3; i < 3; i++) {
          c.beginPath();
          c.moveTo(i * h * 0.7, -h);
          c.lineTo(i * h * 0.7 + h * 0.35, -h);
          c.lineTo(i * h * 0.7 + h * 0.35 + s, h);
          c.lineTo(i * h * 0.7 + s, h);
          c.closePath();
          c.fill();
        }
      }
      break;
    case 'camo':
      for (let k = 0; k < 3; k++) {
        const r = cellHash(gx * 3 + k, gy * 5 - k);
        c.fillStyle = k % 2 ? mix(paint, -0.45) : mix(paint, 0.25);
        c.globalAlpha = 0.6;
        c.beginPath();
        c.ellipse((r - 0.5) * s, (cellHash(gy + k, gx) - 0.5) * s, h * (0.35 + r * 0.4), h * 0.3, r * 3, 0, 7);
        c.fill();
      }
      break;
    case 'flames':
      if (gy <= (ctx.minY ?? -1) + 1) {
        const g = c.createLinearGradient(0, -h, 0, h);
        g.addColorStop(0, 'rgba(255,240,120,.9)');
        g.addColorStop(0.5, 'rgba(255,120,30,.85)');
        g.addColorStop(1, 'rgba(200,40,20,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-h, -h);
        for (let i = 0; i <= 4; i++)
          c.quadraticCurveTo(
            -h + (i + 0.5) * h * 0.5,
            h * (0.2 + cellHash(gx, i) * 0.8),
            -h + (i + 1) * h * 0.5,
            -h * 0.2
          );
        c.lineTo(h, -h);
        c.closePath();
        c.fill();
      }
      break;
    case 'tiger':
      c.fillStyle = mix(paint, -0.6);
      c.globalAlpha = 0.75;
      for (let i = -1; i <= 1; i++) {
        const o = (cellHash(gx, gy + i) - 0.5) * h * 0.6;
        c.beginPath();
        c.moveTo(-h, i * h * 0.7 + o);
        c.lineTo(0, i * h * 0.7 + h * 0.18 + o);
        c.lineTo(h, i * h * 0.7 + o * 0.5);
        c.lineTo(0, i * h * 0.7 + h * 0.34 + o);
        c.closePath();
        c.fill();
      }
      break;
    case 'checker':
      c.globalAlpha = 0.55;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          c.fillStyle = (i + j + gx + gy) % 2 ? '#111' : '#f4f4f4';
          c.fillRect(-h + i * h, -h + j * h, h, h);
        }
      break;
    case 'chrome': {
      const g = c.createLinearGradient(-h, -h, h, h),
        t = ((ANIM * 0.4 + (gx + gy) * 0.12) % 1.6) - 0.3;
      g.addColorStop(0, 'rgba(255,255,255,.1)');
      g.addColorStop(clamp(t, 0, 1), 'rgba(255,255,255,.75)');
      g.addColorStop(1, 'rgba(120,130,140,.2)');
      c.fillStyle = g;
      c.fillRect(-h, -h, s, s);
      break;
    }
    case 'gold': {
      const g = c.createLinearGradient(-h, -h, h, h);
      g.addColorStop(0, 'rgba(255,236,140,.75)');
      g.addColorStop(0.5, 'rgba(214,160,30,.65)');
      g.addColorStop(1, 'rgba(255,220,110,.75)');
      c.fillStyle = g;
      c.fillRect(-h, -h, s, s);
      break;
    }
    case 'rust':
      for (let k = 0; k < 4; k++) {
        const r = cellHash(gx * 7 + k, gy * 3 + k * 2);
        c.fillStyle = k % 2 ? 'rgba(120,60,20,.55)' : 'rgba(170,95,35,.45)';
        c.beginPath();
        c.ellipse(
          (r - 0.5) * s,
          (cellHash(gy * 5 + k, gx) - 0.5) * s,
          h * (0.15 + r * 0.35),
          h * (0.1 + r * 0.25),
          r * 4,
          0,
          7
        );
        c.fill();
      }
      if (cellHash(gx, gy) > 0.6) {
        c.strokeStyle = 'rgba(30,20,10,.5)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-h * 0.5, -h * 0.2);
        c.quadraticCurveTo(0, h * 0.2, h * 0.5, -h * 0.1);
        c.stroke();
      }
      break;
    case 'neon':
      if (ctx.edge) {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `hsla(${(300 + Math.sin(ANIM * 2 + gx * 0.3) * 40) % 360},100%,62%,${0.65 + Math.sin(ANIM * 5) * 0.25})`;
        c.lineWidth = s * 0.12;
        c.strokeRect(-h * 0.8, -h * 0.8, h * 1.6, h * 1.6);
      }
      break;
    case 'holo':
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `hsla(${(ANIM * 70 + gx * 35 + gy * 25) % 360},90%,60%,.35)`;
      c.fillRect(-h, -h, s, s);
      break;
    case 'carbon': {
      c.fillStyle = 'rgba(18,20,24,.82)';
      c.fillRect(-h, -h, s, s);
      const q = s / 6;
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) {
          c.fillStyle = (i + j) % 2 ? 'rgba(70,76,86,.75)' : 'rgba(38,42,50,.75)';
          if ((i + j) % 2) c.fillRect(-h + i * q, -h + j * q + q * 0.15, q, q * 0.7);
          else c.fillRect(-h + i * q + q * 0.15, -h + j * q, q * 0.7, q);
        }
      const g = c.createLinearGradient(-h, -h, h, h),
        t = ((ANIM * 0.25 + (gx - gy) * 0.08) % 1.4) - 0.2;
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(clamp(t, 0, 1), 'rgba(255,255,255,.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(-h, -h, s, s);
      c.fillStyle = paint;
      c.globalAlpha = 0.9;
      if (ctx.edge) c.fillRect(-h, -h, s, s * 0.12);
      break;
    }
    case 'arctic': {
      const q = s / 4;
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const r = cellHash(gx * 4 + i, gy * 4 + j);
          c.fillStyle =
            r < 0.35
              ? 'rgba(240,246,250,.85)'
              : r < 0.6
                ? 'rgba(170,185,200,.8)'
                : r < 0.8
                  ? 'rgba(110,125,140,.75)'
                  : 'rgba(0,0,0,0)';
          c.fillRect(-h + i * q, -h + j * q, q + 0.5, q + 0.5);
        }
      break;
    }
    case 'circuit': {
      c.fillStyle = 'rgba(10,70,40,.82)';
      c.fillRect(-h, -h, s, s);
      c.strokeStyle = 'rgba(214,160,60,.9)';
      c.lineWidth = Math.max(1, s * 0.05);
      const r = cellHash(gx, gy);
      c.beginPath();
      c.moveTo(-h, -h * 0.3 + r * h * 0.4);
      c.lineTo(-h * 0.2, -h * 0.3 + r * h * 0.4);
      c.lineTo(h * 0.2, h * 0.4);
      c.lineTo(h, h * 0.4);
      c.moveTo(-h * 0.5, h);
      c.lineTo(-h * 0.5, h * 0.3);
      c.moveTo(h * 0.45, -h);
      c.lineTo(h * 0.45, -h * 0.4);
      c.lineTo(h * 0.1, -h * 0.1);
      c.stroke();
      const on = Math.sin(ANIM * 4 + gx * 1.7 + gy * 2.3) > 0.2;
      for (const [x, y] of [
        [-h * 0.2, -h * 0.3 + r * h * 0.4],
        [h * 0.45, -h * 0.4],
        [-h * 0.5, h * 0.3]
      ]) {
        c.globalCompositeOperation = on ? 'lighter' : 'source-over';
        circ(c, x, y, s * 0.07, on ? '#6dffb0' : '#c9a040');
      }
      break;
    }
    case 'racing': {
      if (gx === 0) {
        c.fillStyle = 'rgba(250,250,250,.88)';
        c.fillRect(-h * 0.55, -h, h * 1.1, s);
        c.fillStyle = 'rgba(20,20,20,.5)';
        c.fillRect(-h * 0.55, -h, h * 0.08, s);
        c.fillRect(h * 0.47, -h, h * 0.08, s);
      }
      if (gx === 0 && gy === 0) {
        circ(c, 0, 0, h * 0.62, '#fafafa', '#151515', s * 0.05);
        c.fillStyle = '#151515';
        c.font = `700 ${Math.round(s * 0.42)}px "Chakra Petch", Impact, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('77', 0, s * 0.03);
      }
      break;
    }
    case 'graffiti': {
      const cols = ['#ff4fa3', '#38e1ff', '#ffe23d', '#7bff5a', '#b56bff'];
      for (let k = 0; k < 2; k++) {
        const r = cellHash(gx * 9 + k, gy * 7 - k);
        if (r < 0.35) continue;
        const x = (cellHash(gy + k * 3, gx) - 0.5) * s,
          y = (r - 0.5) * s,
          rad = h * (0.25 + r * 0.35);
        c.fillStyle = cols[Math.floor(r * 50) % cols.length];
        c.globalAlpha = 0.85;
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2,
            rr2 = rad * (0.7 + cellHash(i + gx, k + gy) * 0.5);
          c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
        }
        c.closePath();
        c.fill();
        c.fillRect(x - rad * 0.12, y, rad * 0.24, rad * (1 + r));
      }
      break;
    }
    case 'lava': {
      c.fillStyle = 'rgba(25,14,10,.85)';
      c.fillRect(-h, -h, s, s);
      const pulse = 0.55 + Math.sin(ANIM * 2.2 + gx + gy * 0.7) * 0.35;
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(255,${120 + pulse * 80},30,${0.5 + pulse * 0.5})`;
      c.lineWidth = Math.max(1.2, s * 0.06);
      c.shadowColor = '#ff6a1a';
      c.shadowBlur = s * 0.3;
      c.beginPath();
      let x = -h,
        y = (cellHash(gx, gy) - 0.5) * s;
      c.moveTo(x, y);
      for (let i = 1; i <= 4; i++) {
        x = -h + (i * s) / 4;
        y += (cellHash(gx * 3 + i, gy) - 0.5) * h;
        c.lineTo(x, y);
      }
      c.moveTo((cellHash(gy, gx) - 0.5) * s, -h);
      c.lineTo((cellHash(gy * 2, gx) - 0.5) * h, 0);
      c.stroke();
      break;
    }
    case 'dazzle': {
      c.fillStyle = 'rgba(240,240,240,.85)';
      c.fillRect(-h, -h, s, s);
      c.fillStyle = 'rgba(20,22,26,.9)';
      const off = ((gx * 3 + gy * 5) % 4) * h * 0.25;
      for (let i = -3; i < 4; i++) {
        c.beginPath();
        c.moveTo(-h + i * h * 0.6 + off, -h);
        c.lineTo(-h + i * h * 0.6 + h * 0.3 + off, -h);
        c.lineTo(-h + i * h * 0.6 + h * 0.9 + off, h);
        c.lineTo(-h + i * h * 0.6 + h * 0.6 + off, h);
        c.closePath();
        c.fill();
      }
      break;
    }
    case 'galaxy': {
      const g = c.createRadialGradient(-h * 0.3, -h * 0.2, 0, 0, 0, s);
      g.addColorStop(0, 'rgba(160,80,220,.8)');
      g.addColorStop(0.5, 'rgba(40,30,110,.85)');
      g.addColorStop(1, 'rgba(8,10,35,.9)');
      c.fillStyle = g;
      c.fillRect(-h, -h, s, s);
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const r = cellHash(gx * 11 + k, gy * 13 + k),
          tw = 0.5 + Math.sin(ANIM * 3 + k * 2 + gx) * 0.5;
        circ(
          c,
          (r - 0.5) * s,
          (cellHash(gy * 7 + k, gx * 5) - 0.5) * s,
          s * (0.02 + tw * 0.03),
          `rgba(255,255,255,${0.4 + tw * 0.6})`
        );
      }
      break;
    }
    case 'jackpot': {
      const g = c.createLinearGradient(-h, -h, h, h);
      g.addColorStop(0, 'rgba(255,240,170,.92)');
      g.addColorStop(0.5, 'rgba(220,160,20,.9)');
      g.addColorStop(1, 'rgba(255,215,90,.92)');
      c.fillStyle = g;
      c.fillRect(-h, -h, s, s);
      c.strokeStyle = 'rgba(150,100,0,.55)';
      c.lineWidth = Math.max(1, s * 0.035);
      const q = s / 3;
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const x = -h + q * (i + 0.5),
            y = -h + q * (j + 0.5);
          c.beginPath();
          c.moveTo(x - q * 0.3, y + q * 0.1);
          c.lineTo(x + q * 0.1, y - q * 0.3);
          c.stroke();
        }
      const t = (ANIM * 0.8 + gx * 0.37 + gy * 0.21) % 3;
      if (t < 0.35) {
        c.globalCompositeOperation = 'lighter';
        const k = Math.sin((t / 0.35) * Math.PI);
        c.fillStyle = `rgba(255,255,255,${k})`;
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4,
            rr2 = i % 2 ? s * 0.06 : s * 0.3 * k;
          c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
        }
        c.closePath();
        c.fill();
      }
      break;
    }
  }
  c.restore();
}
/** Livery context for a car: front row (for flames) and which cells sit on the edge (for hazard tape). */
function liveryCtx(grid, gx, gy, minY) {
  const edge = DIRS.some(([dx, dy]) => !grid.has(key(gx + dx, gy + dy)));
  return { edge, minY };
}

/** Local-only trail particles behind fast cars. */
function trailFx(v) {
  const t = v.look && v.look.trail;
  if (!t || t === 'none' || v.dead || v.z > 20) return;
  const sp = Math.hypot(v.vx, v.vy);
  if (sp < 140 || Math.random() > 0.55) return;
  const bx = v.x - (v.vx / sp) * v.rad * 0.8 + rnd(-6, 6),
    by = v.y - (v.vy / sp) * v.rad * 0.8 + rnd(-6, 6),
    vx = -v.vx * 0.15 + rnd(-30, 30),
    vy = -v.vy * 0.15 + rnd(-30, 30);
  if (t === 'sparks')
    B.fx.push({ k: 'spark', x: bx, y: by, vx: vx * 3, vy: vy * 3, life: 0.3, max: 0.3, col: '#ffd27a' });
  else if (t === 'smoke') B.fx.push({ k: 'smoke', x: bx, y: by, vx, vy, life: 0.9, max: 1, r: rnd(5, 8) });
  else if (t === 'ember') B.fx.push({ k: 'fire', x: bx, y: by, vx, vy: vy - 20, life: 0.6, max: 0.6, r: 3 });
  else if (t === 'bubbles')
    B.fx.push({
      k: 'bubble',
      x: bx,
      y: by,
      vx: vx * 0.5,
      vy: vy * 0.5 - 20,
      life: 1.2,
      max: 1.2,
      r: rnd(3, 7)
    });
  else if (t === 'rainbow') B.fx.push({ k: 'rib', x: bx, y: by, life: 0.8, max: 0.8, r: 6, hue: (ANIM * 300) % 360 });
  else if (t === 'zap')
    B.fx.push({
      k: 'spark',
      x: bx,
      y: by,
      vx: vx * 5 + rnd(-90, 90),
      vy: vy * 5 + rnd(-90, 90),
      life: 0.18,
      max: 0.18,
      col: '#bff4ff'
    });
  else if (t === 'notes')
    B.fx.push({ k: 'note', x: bx, y: by, vx: vx * 0.4, vy: -30, life: 1.1, max: 1.1, col: v.paint });
  else if (t === 'hearts')
    B.fx.push({ k: 'note', glyph: '♥', x: bx, y: by, vx: vx * 0.3, vy: -26, life: 1.1, max: 1.1, col: '#ff5c9a' });
  else if (t === 'pixels')
    B.fx.push({
      k: 'pixel',
      x: bx,
      y: by,
      vx: vx * 0.4,
      vy: vy * 0.4,
      life: 0.7,
      max: 0.7,
      r: rnd(4, 7),
      col: Math.random() < 0.5 ? v.paint : '#ffffff'
    });
  else if (t === 'comet') {
    B.fx.push({ k: 'rib', x: bx, y: by, life: 0.9, max: 0.9, r: 9, hue: 190 + Math.sin(ANIM * 3) * 20 });
    B.fx.push({ k: 'spark', x: bx, y: by, vx: vx * 2, vy: vy * 2, life: 0.4, max: 0.4, col: '#dffaff' });
  } else if (t === 'coins')
    B.fx.push({
      k: 'note',
      glyph: '●',
      x: bx,
      y: by,
      vx: vx * 0.5,
      vy: vy * 0.5 - 10,
      life: 0.9,
      max: 0.9,
      col: '#ffd257'
    });
}
/** Extra burst on top of the normal explosion when a car is wrecked. Local on every machine. */
function wreckFx(v) {
  const w = v.look && v.look.wreck;
  if (!w || w === 'classic') return;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 7),
      s = rnd(80, 380),
      base = {
        x: v.x,
        y: v.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(1, 2),
        max: 2,
        a: rnd(0, 6)
      };
    if (w === 'confetti')
      B.fx.push({
        ...base,
        k: 'chip',
        r: rnd(4, 7),
        col: pick(['#ff5ad1', '#5ad1ff', '#fff07a', '#7aff9b', '#ff8a3a'])
      });
    else if (w === 'glitter')
      B.fx.push({ ...base, k: 'chip', r: rnd(2, 4), col: pick(['#ffd257', '#fff2b0', '#e8b830']) });
    else if (w === 'pixels')
      B.fx.push({ ...base, k: 'pixel', r: rnd(5, 9), col: pick([v.paint, mix(v.paint, -0.4), '#2b2f33']) });
    else if (w === 'ducks' && i % 2) B.fx.push({ ...base, k: 'duckfx', r: rnd(6, 10) });
    else if (w === 'notes' && i % 2)
      B.fx.push({ ...base, k: 'note', vy: base.vy - 60, col: pick(['#c58bff', '#fff', v.paint]) });
  }
}
/** Draws the cosmetic particle kinds; returns true if it handled the particle. */
function drawCosmeticFx(c, f, t) {
  if (f.k === 'bubble') {
    c.strokeStyle = `rgba(200,240,255,${t})`;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(f.x, f.y, f.r * (1.4 - t * 0.4), 0, 7);
    c.stroke();
  } else if (f.k === 'rib') circ(c, f.x, f.y, f.r * t, `hsla(${f.hue},90%,60%,${t * 0.8})`);
  else if (f.k === 'note') {
    c.globalAlpha = t;
    c.font = '700 16px "Barlow Semi Condensed", serif';
    c.fillStyle = f.col || '#fff';
    c.fillText(f.glyph || '♪', f.x, f.y);
    c.globalAlpha = 1;
  } else if (f.k === 'pixel') {
    c.globalAlpha = t;
    c.fillStyle = f.col;
    c.fillRect(f.x - f.r / 2, f.y - f.r / 2, f.r, f.r);
    c.globalAlpha = 1;
  } else if (f.k === 'duckfx') {
    c.save();
    c.globalAlpha = Math.min(1, t * 2);
    c.translate(f.x, f.y);
    c.rotate(f.a + ANIM * 3);
    drawJunk(c, 'duck', f.r);
    c.restore();
  } else return false;
  return true;
}
const titleName = id => (COSMETICS.title.find(t => t.id === id) || COSMETICS.title[0]).name;
/** Bots get a believable look: harder bots show off rarer cosmetics. */
function randomLook(diff = 1) {
  const pickFrom = (slot, n) => pick(COSMETICS[slot].slice(0, Math.max(1, n))).id;
  const n = 2 + diff * 3;
  return {
    livery: pickFrom('livery', n),
    trail: pickFrom('trail', n - 1),
    wreck: pickFrom('wreck', n - 2),
    title: pickFrom('title', n),
    badge: `${pick(Object.keys(BADGE_SHAPES))}.${pick(Object.keys(BADGE_SYMBOLS))}.${Math.floor(Math.random() * BADGE_COLS.length)}`
  };
}
/** Only accept cosmetic ids we know (data from the other player). */
function sanitizeLook(l) {
  const out = { ...DEFAULT_STYLE };
  if (l && typeof l === 'object')
    for (const [slot] of STYLE_SLOTS) if (COSMETICS[slot].some(i => i.id === l[slot])) out[slot] = l[slot];
  if (l && l.badge) out.badge = validBadge(l.badge);
  return out;
}
