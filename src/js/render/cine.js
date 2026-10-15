// Big moments: a full-screen effects layer on top of everything (arena, overlays, menus).
// Titles slam in letter by letter with light rays, a shockwave, a flash and sparks; wins rain
// confetti, losses smoulder; entering an arena opens two hazard doors. It runs its own frame loop
// only while something is playing, and stays quiet with "Animate menus" off.

const CINE = { cv: null, g: null, fx: [], parts: [], raf: 0, last: 0, w: 0, h: 0 };

function cineCanvas() {
  if (CINE.cv) return CINE.cv;
  const cv = document.createElement('canvas');
  cv.id = 'cineFx';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  CINE.cv = cv;
  CINE.g = cv.getContext('2d');
  return cv;
}
function cineSize() {
  const cv = cineCanvas(),
    d = dprOf(),
    w = innerWidth,
    h = innerHeight;
  if (CINE.w !== w || CINE.h !== h || cv.width !== Math.round(w * d)) {
    cv.width = Math.round(w * d);
    cv.height = Math.round(h * d);
    CINE.w = w;
    CINE.h = h;
  }
  CINE.g.setTransform(d, 0, 0, d, 0, 0);
}
const cineCalm = () => REDUCED.on;
function cineStart() {
  if (CINE.raf) return;
  cineSize();
  CINE.cv.hidden = false;
  CINE.last = performance.now();
  CINE.raf = requestAnimationFrame(cineFrame);
}
function cineFrame(now) {
  const dt = Math.min(0.05, (now - CINE.last) / 1000);
  CINE.last = now;
  cineSize();
  const g = CINE.g,
    W = CINE.w,
    H = CINE.h;
  g.clearRect(0, 0, W, H);
  // layers in order: washes and rays, doors, titles, particles, flashes on top
  CINE.fx.sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const f of CINE.fx) {
    f.t += dt;
    CINE_DRAW[f.k](g, f, W, H, dt);
  }
  CINE.fx = CINE.fx.filter(f => f.t < f.dur);
  cineParts(g, dt, W, H);
  if (CINE.fx.length || CINE.parts.length) CINE.raf = requestAnimationFrame(cineFrame);
  else {
    CINE.raf = 0;
    g.clearRect(0, 0, W, H);
    CINE.cv.hidden = true;
  }
}
const easeOutBack = u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2);
const easeOut = u => 1 - Math.pow(1 - u, 3);

/* ---------- the effects ---------- */
const CINE_DRAW = {
  /** Spinning light rays from the centre. */
  rays(g, f, W, H) {
    const u = f.t / f.dur,
      a = Math.min(1, f.t * 4) * Math.min(1, (f.dur - f.t) * 2) * (f.a || 0.35),
      R = Math.hypot(W, H),
      n = 18;
    g.save();
    g.translate(f.x ?? W / 2, f.y ?? H / 2);
    g.rotate(f.t * 0.35 + (f.r0 || 0));
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.6);
    grad.addColorStop(0, hexA(f.col, a));
    grad.addColorStop(1, hexA(f.col, 0));
    g.fillStyle = grad;
    for (let i = 0; i < n; i++) {
      const w = (Math.PI / n) * (0.55 + 0.3 * Math.sin(i * 1.7 + u * 6));
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, (i / n) * Math.PI * 2, (i / n) * Math.PI * 2 + w);
      g.closePath();
      g.fill();
    }
    g.restore();
  },
  /** A full-screen colour flash that fades fast. */
  flash(g, f, W, H) {
    const a = (1 - f.t / f.dur) ** 2 * (f.a || 0.8);
    g.fillStyle = hexA(f.col || '#ffffff', a);
    g.fillRect(0, 0, W, H);
  },
  /** An expanding ring. */
  shock(g, f, W, H) {
    const u = easeOut(f.t / f.dur),
      r = (f.r || Math.max(W, H) * 0.6) * u;
    g.save();
    g.strokeStyle = hexA(f.col || '#ffffff', (1 - u) * 0.9);
    g.lineWidth = 3 + (1 - u) * 22;
    g.beginPath();
    g.arc(f.x ?? W / 2, f.y ?? H / 2, r, 0, 7);
    g.stroke();
    g.restore();
  },
  /** A coloured vignette (red for a loss, gold for a win). */
  vig(g, f, W, H) {
    const a = Math.min(1, f.t * 3) * Math.min(1, (f.dur - f.t) * 1.5) * (f.a || 0.5);
    const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    grad.addColorStop(0, hexA(f.col, 0));
    grad.addColorStop(1, hexA(f.col, a * (0.8 + 0.2 * Math.sin(f.t * 8))));
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  },
  /** Cinema bars that slide in and out. */
  bars(g, f, W, H) {
    const inn = easeOut(Math.min(1, f.t * 3)),
      out = Math.min(1, (f.dur - f.t) * 3),
      h = H * 0.11 * inn * out;
    g.fillStyle = '#04060c';
    g.fillRect(0, 0, W, h);
    g.fillRect(0, H - h, W, h);
    g.fillStyle = hexA(f.col || '#f2b705', 0.9 * out);
    g.fillRect(0, h - 3, W * inn, 3);
    g.fillRect(W * (1 - inn), H - h, W * inn, 3);
  },
  /** Hazard doors that start closed and slam open (entering an arena). */
  doors(g, f, W, H) {
    const hold = f.hold || 0.45,
      u = f.t < hold ? 0 : easeOut(Math.min(1, (f.t - hold) / 0.55)),
      off = (W / 2) * u;
    if (u >= 1) return;
    const half = (x0, dir) => {
      g.save();
      g.translate(x0 + dir * off, 0);
      g.fillStyle = '#0d1424';
      g.fillRect(dir < 0 ? -W / 2 : 0, 0, W / 2, H);
      // hazard stripes along the meeting edge
      g.save();
      g.beginPath();
      g.rect(dir < 0 ? -48 : 0, 0, 48, H);
      g.clip();
      for (let y = -60; y < H + 60; y += 36) {
        g.fillStyle = '#f2b705';
        g.beginPath();
        g.moveTo(dir < 0 ? -48 : 0, y);
        g.lineTo(dir < 0 ? 0 : 48, y + 24);
        g.lineTo(dir < 0 ? 0 : 48, y + 42);
        g.lineTo(dir < 0 ? -48 : 0, y + 18);
        g.fill();
      }
      g.restore();
      // panel lines and bolts
      g.strokeStyle = 'rgba(91,231,255,.12)';
      g.lineWidth = 2;
      for (let y = H * 0.2; y < H; y += H * 0.2) {
        g.beginPath();
        g.moveTo(dir < 0 ? -W / 2 : 60, y);
        g.lineTo(dir < 0 ? -60 : W / 2, y);
        g.stroke();
      }
      g.restore();
    };
    half(W / 2, -1);
    half(W / 2, 1);
    if (f.t < hold + 0.05) {
      // the title on the closed doors
      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 ${Math.min(64, W * 0.06)}px "Chakra Petch", Impact, sans-serif`;
      // a lit plate across the seam, so the title is not lost in the stripes
      const pw = Math.max(g.measureText(f.text || '').width + 120, 360),
        pulse = 0.6 + 0.4 * Math.sin(f.t * 18);
      g.fillStyle = 'rgba(6,10,20,.96)';
      g.fillRect(W / 2 - pw / 2, H / 2 - 62, pw, 124);
      g.strokeStyle = hexA('#f2b705', 0.5 + 0.5 * pulse);
      g.lineWidth = 3;
      g.strokeRect(W / 2 - pw / 2, H / 2 - 62, pw, 124);
      g.fillStyle = '#ff4d3a';
      g.globalAlpha = pulse;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.arc(W / 2 + sx * (pw / 2 - 22), H / 2 - 40, 6, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#f2b705';
      g.shadowColor = '#f2b705';
      g.shadowBlur = 24;
      g.fillText(f.text || '', W / 2, H / 2 - 10);
      g.shadowBlur = 0;
      g.font = '600 18px "Barlow Semi Condensed", sans-serif';
      g.fillStyle = '#cfe0f5';
      g.fillText(f.sub || '', W / 2, H / 2 + 34);
      g.restore();
    }
    if (!f.boomed && f.t >= hold) {
      f.boomed = true;
      cineSparks(W / 2, H * 0.5, 60, ['#ffe28a', '#ffffff', '#f2b705'], H * 0.9);
      CINE.fx.push({ k: 'flash', t: 0, dur: 0.35, col: '#ffffff', a: 0.5, z: 9 });
      sfx('whoosh');
    }
  },
  /** The big title: letters slam in, light rays and a band behind it, a shine sweeps over it. */
  title(g, f, W, H) {
    const t = f.t,
      dur = f.dur,
      text = f.text,
      size = Math.min(f.size || 110, W * (f.small ? 0.07 : 0.11)),
      cx = W / 2,
      cy = H * (f.y || 0.42),
      out = Math.max(0, (t - (dur - 0.45)) / 0.45),
      n = text.length,
      stag = Math.min(0.05, 0.4 / Math.max(1, n));
    g.save();
    g.font = `700 ${size}px "Chakra Petch", Impact, sans-serif`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const widths = [...text].map(ch => g.measureText(ch).width),
      tw = widths.reduce((a, b) => a + b, 0),
      land = n * stag + 0.22;
    // the band behind the text
    const bandH = size * 1.55 * easeOut(Math.min(1, t * 5)) * (1 - out),
      bandA = 0.62 * (1 - out);
    if (bandH > 1) {
      const grad = g.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(4,6,12,0)');
      grad.addColorStop(0.2, `rgba(4,6,12,${bandA})`);
      grad.addColorStop(0.8, `rgba(4,6,12,${bandA})`);
      grad.addColorStop(1, 'rgba(4,6,12,0)');
      g.fillStyle = grad;
      g.fillRect(0, cy - bandH / 2, W, bandH);
      g.fillStyle = hexA(f.col, 0.9 * (1 - out));
      const lw = W * easeOut(Math.min(1, t * 3));
      g.fillRect(cx - lw / 2, cy - bandH / 2, lw, 3);
      g.fillRect(cx - lw / 2, cy + bandH / 2 - 3, lw, 3);
    }
    // letters
    let x = cx - tw / 2;
    for (let i = 0; i < n; i++) {
      const ch = text[i],
        w = widths[i],
        lt = t - i * stag,
        u = Math.max(0, Math.min(1, lt / 0.22));
      if (u <= 0) {
        x += w;
        continue;
      }
      const s = (f.calm ? 1 : 2.4 - 1.4 * easeOutBack(u)) * (1 + out * 0.3),
        yOff = (1 - u) * -size * 0.4 - out * (size * 0.6 + i * 6) * (i % 2 ? 1 : 0.6),
        a = Math.min(1, u * 2) * (1 - out),
        lx = x + w / 2,
        rot = (1 - u) * (i % 2 ? 0.25 : -0.25) + out * (i % 2 ? 0.3 : -0.3);
      g.save();
      g.globalAlpha = a;
      g.translate(lx, cy + yOff);
      g.rotate(rot);
      g.scale(s, s);
      // chromatic ghosts while it lands
      const ab = Math.max(0, 1 - lt / 0.5) * 9;
      if (ab > 0.3 && !f.calm) {
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = 'rgba(255,40,90,.55)';
        g.fillText(ch, -w / 2 - ab, 0);
        g.fillStyle = 'rgba(40,220,255,.55)';
        g.fillText(ch, -w / 2 + ab, 0);
        g.globalCompositeOperation = 'source-over';
      }
      g.lineJoin = 'round';
      g.lineWidth = size * 0.09;
      g.strokeStyle = 'rgba(4,6,12,.9)';
      g.strokeText(ch, -w / 2, 0);
      const fill = g.createLinearGradient(0, -size / 2, 0, size / 2);
      fill.addColorStop(0, '#ffffff');
      fill.addColorStop(0.45, f.col);
      fill.addColorStop(1, shade(f.col, -0.35));
      g.fillStyle = fill;
      g.shadowColor = f.col;
      g.shadowBlur = 26;
      g.fillText(ch, -w / 2, 0);
      g.shadowBlur = 0;
      // the shine passing over
      const sh = (t - land - 0.15) / 0.5;
      if (sh > 0 && sh < 1) {
        const p = -tw / 2 + sh * (tw + size) - (lx - cx);
        g.globalCompositeOperation = 'source-atop';
        const sg = g.createLinearGradient(p - size * 0.4, 0, p + size * 0.4, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,.85)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sg;
        g.fillRect(-w, -size, w * 2, size * 2);
        g.globalCompositeOperation = 'source-over';
      }
      g.restore();
      x += w;
    }
    // the impact once every letter is down
    if (!f.hit && t >= land) {
      f.hit = true;
      if (!f.calm) {
        CINE.fx.push({ k: 'shock', t: 0, dur: 0.7, col: f.col, y: cy, x: cx, z: 3 });
        CINE.fx.push({ k: 'flash', t: 0, dur: 0.3, col: f.flashCol || '#ffffff', a: f.small ? 0.25 : 0.55, z: 9 });
        cineSparks(cx, cy, f.small ? 30 : 70, [f.col, '#ffffff', '#ffe28a'], tw * 0.6);
        if (B && !B.demo) B.shake = Math.max(B.shake || 0, f.small ? 6 : 14);
      }
      if (f.onHit) f.onHit();
    }
    // the line under it
    if (f.sub) {
      const su = Math.max(0, Math.min(1, (t - land) / 0.35));
      g.globalAlpha = su * (1 - out);
      g.textAlign = 'center';
      g.font = `600 ${Math.max(16, size * 0.22)}px "Barlow Semi Condensed", sans-serif`;
      g.fillStyle = '#eef3fa';
      g.shadowColor = 'rgba(0,0,0,.8)';
      g.shadowBlur = 8;
      g.fillText(f.sub, cx, cy + size * 0.62 + (1 - easeOut(su)) * 24);
    }
    g.restore();
  }
};

/* ---------- particles (screen space) ---------- */
function cineSparks(x, y, n, cols, spread = 200) {
  if (cineCalm()) n = Math.round(n * 0.3);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2),
      s = rnd(250, 900);
    CINE.parts.push({
      k: Math.random() < 0.25 ? 'star' : 'spark',
      x: x + rnd(-spread, spread) * 0.5,
      y: y + rnd(-20, 20),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 200,
      life: rnd(0.5, 1.1),
      max: 1.1,
      col: pick(cols),
      r: rnd(2, 5)
    });
  }
  cineStart();
}
function cineConfetti(n = 160, burstFrom = null) {
  if (cineCalm()) n = Math.round(n * 0.3);
  const cols = ['#ffd257', '#5be7ff', '#ff5c7a', '#5cc38f', '#b78bff', '#ffffff', '#f2b705'];
  cineSize();
  for (let i = 0; i < n; i++) {
    const fromTop = !burstFrom || i % 2;
    CINE.parts.push({
      k: 'conf',
      x: fromTop ? rnd(0, CINE.w) : burstFrom[0],
      y: fromTop ? rnd(-CINE.h * 0.6, -10) : burstFrom[1],
      vx: fromTop ? rnd(-60, 60) : rnd(-700, 700),
      vy: fromTop ? rnd(120, 320) : rnd(-900, -300),
      life: rnd(2.4, 4),
      max: 4,
      col: pick(cols),
      a: rnd(0, 7),
      va: rnd(-8, 8),
      r: rnd(7, 13)
    });
  }
  cineStart();
}
function cineEmbers(n = 70, col = '#ff6a3a') {
  if (cineCalm()) n = Math.round(n * 0.3);
  cineSize();
  for (let i = 0; i < n; i++)
    CINE.parts.push({
      k: 'ember',
      x: rnd(0, CINE.w),
      y: CINE.h + rnd(0, 120),
      vx: rnd(-30, 30),
      vy: rnd(-220, -80),
      life: rnd(1.5, 3),
      max: 3,
      col,
      r: rnd(2, 5)
    });
  cineStart();
}
function cineParts(g, dt, W, H) {
  for (const p of CINE.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.k === 'conf') {
      p.vx *= Math.exp(-1.8 * dt);
      p.vy = Math.min(p.vy + 900 * dt, 260);
      p.vx += Math.sin(p.life * 5 + p.a) * 40 * dt;
      p.a += p.va * dt;
    } else if (p.k === 'ember') {
      p.vx += Math.sin(p.life * 3 + p.x) * 30 * dt;
    } else {
      p.vx *= Math.exp(-2.2 * dt);
      p.vy = p.vy * Math.exp(-2.2 * dt) + 700 * dt;
    }
    const t = Math.max(0, p.life / p.max);
    g.save();
    g.globalAlpha = Math.min(1, t * 3);
    if (p.k === 'conf') {
      g.translate(p.x, p.y);
      g.rotate(p.a);
      g.scale(1, Math.abs(Math.sin(p.a * 1.7)) * 0.9 + 0.1);
      g.fillStyle = p.col;
      g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
    } else if (p.k === 'ember') {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = hexA(p.col, 0.8 * t);
      g.beginPath();
      g.arc(p.x, p.y, p.r * (0.6 + t), 0, 7);
      g.fill();
    } else if (p.k === 'star') {
      g.globalCompositeOperation = 'lighter';
      g.translate(p.x, p.y);
      g.rotate(p.life * 6);
      g.fillStyle = p.col;
      const r = p.r * 2.2 * t + 1;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? r * 0.3 : r,
          a = (i / 8) * Math.PI * 2;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.fill();
    } else {
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = p.col;
      g.lineWidth = p.r * 0.7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      g.stroke();
    }
    g.restore();
  }
  CINE.parts = CINE.parts.filter(p => p.life > 0 && p.y < H + 200);
}

/* ---------- colour helpers ---------- */
function hexA(col, a) {
  if (col.startsWith('rgba') || col.startsWith('rgb'))
    return col.replace(/rgba?\(([^)]+?)(,\s*[\d.]+)?\)/, `rgba($1,${a})`);
  let h = col.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
function shade(col, k) {
  let h = col.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const n = parseInt(h, 16),
    f = v => Math.round(Math.max(0, Math.min(255, v + v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/* ---------- the moments ---------- */
/**
 * A big title. kind: 'win' (rays, confetti), 'lose' (red vignette, embers), 'boss', 'info' (smaller).
 * Returns nothing; safe to call from anywhere, also on top of overlays.
 */
function cineTitle(text, sub, col, kind = 'info', opt = {}) {
  const calm = cineCalm(),
    dur = opt.dur || (kind === 'info' ? 1.9 : 2.6);
  CINE.fx = CINE.fx.filter(f => f.k !== 'title');
  CINE.fx.push({
    k: 'title',
    t: 0,
    dur,
    text: text.toUpperCase(),
    sub,
    col,
    small: kind === 'info',
    calm,
    z: 5,
    ...opt
  });
  if (kind !== 'info' && !calm)
    CINE.fx.push({ k: 'rays', t: 0, dur: dur + 0.4, col, a: kind === 'lose' ? 0.18 : 0.32, z: 0 });
  if (kind !== 'info') CINE.fx.push({ k: 'bars', t: 0, dur: dur + 0.2, col, z: 1 });
  if (kind === 'win') {
    CINE.fx.push({ k: 'vig', t: 0, dur: dur + 0.5, col: '#f2b705', a: 0.25, z: 0 });
    setTimeout(() => cineConfetti(opt.confetti || 140), 250);
  } else if (kind === 'lose') {
    CINE.fx.push({ k: 'vig', t: 0, dur: dur + 0.6, col: '#b0182c', a: 0.55, z: 0 });
    setTimeout(() => cineEmbers(60), 200);
  } else if (kind === 'boss') {
    CINE.fx.push({ k: 'vig', t: 0, dur: dur + 0.6, col: '#ff2a4a', a: 0.5, z: 0 });
    CINE.fx.push({ k: 'flash', t: 0, dur: 0.5, col: '#ff2a4a', a: 0.35, z: 9 });
  }
  cineStart();
}
/** Entering an arena: doors with the round and arena name, then they slam open. */
function cineDoors(text, sub) {
  if (cineCalm()) return;
  CINE.fx = CINE.fx.filter(f => f.k !== 'doors');
  CINE.fx.push({ k: 'doors', t: 0, dur: 1.2, text: String(text).toUpperCase(), sub, hold: 0.5, z: 8 });
  cineStart();
}
/** The 3, 2, 1, GO countdown beats. */
function cineCount(n) {
  const go = n === 'GO';
  CINE.fx = CINE.fx.filter(f => f.k !== 'title');
  CINE.fx.push({
    k: 'title',
    t: 0,
    dur: go ? 1 : 0.85,
    text: go ? 'FIGHT!' : n,
    col: go ? '#5be7ff' : '#f2b705',
    size: go ? 150 : 170,
    calm: cineCalm(),
    small: !go,
    y: 0.45,
    z: 5
  });
  if (go && !cineCalm()) {
    CINE.fx.push({ k: 'rays', t: 0, dur: 1.1, col: '#5be7ff', a: 0.3, z: 0 });
    CINE.fx.push({ k: 'shock', t: 0, dur: 0.8, col: '#ffffff', z: 3 });
  }
  cineStart();
}
/** Battle banners (round won, wrecked, boss…) as big moments. */
function cineBanner(b) {
  const t = b.text,
    kind = /WON|WINS|CLEARED/.test(t) ? 'win' : /LOST/.test(t) ? 'lose' : /BOSS/.test(t) ? 'boss' : 'info';
  cineTitle(t, b.sub || '', b.col || '#ffffff', kind, { confetti: 90 });
}
/** Stop everything (leaving to the menu). */
function cineClear() {
  CINE.fx = [];
  CINE.parts = [];
}
