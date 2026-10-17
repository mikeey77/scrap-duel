// Canvas artwork for every module, junk object and themed wall.
/* =================== ART =================== */
const _mx = {};
function mix(hex, a) {
  const k = hex + a;
  if (_mx[k]) return _mx[k];
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  if (a >= 0) {
    r += (255 - r) * a;
    g += (255 - g) * a;
    b += (255 - b) * a;
  } else {
    r *= 1 + a;
    g *= 1 + a;
    b *= 1 + a;
  }
  return (_mx[k] = `rgb(${r | 0},${g | 0},${b | 0})`);
}
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
/** A metal plate: shaded body, a rim light on the top-left edges, shade on the bottom-right and an inset panel seam. */
let HULL_ART = false; // set while a part draws on a hull: its square plate is the hull itself
function bevel(c, h, col, r) {
  if (HULL_ART) {
    // only a faint inset outline of the part's own colour, so it still reads as a separate unit
    rr(c, -h * 0.82, -h * 0.82, h * 1.64, h * 1.64, Math.max(2, r));
    c.fillStyle = col;
    c.globalAlpha *= 0.28;
    c.fill();
    c.globalAlpha /= 0.28;
    c.strokeStyle = 'rgba(0,0,0,.3)';
    c.lineWidth = Math.max(0.8, h * 0.05);
    c.stroke();
    return;
  }
  const g = c.createLinearGradient(-h, -h, h, h);
  g.addColorStop(0, mix(col, 0.3));
  g.addColorStop(0.45, col);
  g.addColorStop(1, mix(col, -0.38));
  rr(c, -h, -h, h * 2, h * 2, r);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = Math.max(1, h * 0.08);
  c.strokeStyle = mix(col, -0.62);
  c.stroke();
  if (h < 5) return;
  const e = h * 0.84,
    lw = Math.max(1, h * 0.07);
  c.lineCap = 'round';
  // rim light along the top and left edge
  c.beginPath();
  c.moveTo(-e, e * 0.6);
  c.lineTo(-e, -e + r * 0.4);
  c.lineTo(e * 0.6, -e);
  c.strokeStyle = mix(col, 0.5);
  c.lineWidth = lw;
  c.globalAlpha *= 0.75;
  c.stroke();
  // shade along the bottom and right edge
  c.beginPath();
  c.moveTo(e, -e * 0.6);
  c.lineTo(e, e);
  c.lineTo(-e * 0.6, e);
  c.strokeStyle = mix(col, -0.55);
  c.stroke();
  c.globalAlpha /= 0.75;
  // inset panel seam
  rr(c, -h * 0.74, -h * 0.74, h * 1.48, h * 1.48, Math.max(1, r * 0.6));
  c.strokeStyle = 'rgba(0,0,0,.16)';
  c.lineWidth = Math.max(0.6, h * 0.035);
  c.stroke();
}
function bolts(c, h, s, col) {
  c.fillStyle = col;
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ]) {
    c.beginPath();
    c.arc(a * h * 0.66, b * h * 0.66, s * 0.045, 0, 7);
    c.fill();
  }
}
function circ(c, x, y, r, fill, stroke, lw) {
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), 0, 7);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}
function line(c, p, col, lw) {
  c.beginPath();
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.stroke();
}
function gradCirc(c, r, col, x = 0, y = 0) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, mix(col, 0.38));
  g.addColorStop(0.6, col);
  g.addColorStop(1, mix(col, -0.42));
  circ(c, x, y, r, g, mix(col, -0.6), Math.max(1, r * 0.12));
  if (r > 4) {
    // a small specular glint
    c.fillStyle = 'rgba(255,255,255,.28)';
    c.beginPath();
    c.ellipse(x - r * 0.32, y - r * 0.38, r * 0.3, r * 0.16, -0.7, 0, 7);
    c.fill();
  }
}
function glowDisc(c, r, col) {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha *= 0.55;
  circ(c, 0, 0, r, g);
  c.globalAlpha /= 0.55;
}
let ANIM = 0;
/** A bolted steel bracket that a weapon is mounted on. */
function mountBar(c, x, y, w, hh, s) {
  c.fillStyle = 'rgba(0,0,0,.3)';
  rr(c, x + s * 0.03, y + s * 0.05, w, hh, s * 0.06);
  c.fill();
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + hh);
  g.addColorStop(0, '#7d868f');
  g.addColorStop(0.5, '#555d65');
  g.addColorStop(1, '#353a40');
  rr(c, x, y, w, hh, s * 0.06);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = '#1f2327';
  c.lineWidth = Math.max(1, s * 0.03);
  c.stroke();
  if (s > 18) {
    c.fillStyle = '#9aa4ad';
    for (const fx of [0.18, 0.82]) {
      c.beginPath();
      c.arc(x + w * fx, y + hh * 0.62, s * 0.035, 0, 7);
      c.fill();
    }
  }
}
/** The turret ring under top-mounted equipment: a soft shadow, a steel ring and six bolts. */
function topMount(c, h, s) {
  c.fillStyle = 'rgba(0,0,0,.32)';
  c.beginPath();
  c.arc(h * 0.08, h * 0.12, h * 0.84, 0, 7);
  c.fill();
  const g = c.createRadialGradient(-h * 0.3, -h * 0.3, h * 0.1, 0, 0, h * 0.8);
  g.addColorStop(0, '#4a525c');
  g.addColorStop(1, '#22272d');
  circ(c, 0, 0, h * 0.78, g, '#121518', s * 0.05);
  circ(c, 0, 0, h * 0.62, null, 'rgba(255,255,255,.1)', s * 0.03);
  if (s > 20) {
    c.fillStyle = '#7d8792';
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.3;
      c.beginPath();
      c.arc(Math.cos(a) * h * 0.7, Math.sin(a) * h * 0.7, s * 0.025, 0, 7);
      c.fill();
    }
  }
}
/** Mood + gaze for a car's cockpit eyes. */
function cockpitFace(v) {
  const won = B && B.seq === 'end' && B.win === v.idx,
    integ = v.dead ? 0 : v.total ? integrity(v) : 1;
  const mood = v.dead
    ? 'dead'
    : won
      ? 'happy'
      : integ < 0.35 || (v.lastHurt && B.time - v.lastHurt < 0.4)
        ? 'hurt'
        : v.fire
          ? 'angry'
          : 'idle';
  const la = Math.atan2((v.aimY ?? v.y - 1) - v.y, (v.aimX ?? v.x) - v.x) - v.a;
  return { mood, lookA: la, seed: v.idx * 1.7, badge: (v.look && v.look.badge) || null };
}
/* ---- sprite cache: parts that look the same every frame are drawn once into a small bitmap ----
   A part qualifies when its art does not move (checked once by drawing it at two moments) and it looks the
   same through the cache as drawn directly. Turning parts, cockpits with eyes, glowing and animated parts and
   anything with live state (recoil, heat, charge…) are always drawn live. */
const SPR = { map: new Map(), ok: {}, hits: 0, miss: 0 };
const SPR_LIVE = [
  'kick',
  'rev',
  'pour',
  'heat',
  'charge',
  'fire',
  'punch',
  'ammo',
  'fired',
  'down',
  'pa',
  'active',
  'spin',
  'cargo',
  'anchored',
  'roll',
  'shine',
  'mood',
  'lookA',
  'badge'
];
function sprStatic(id) {
  if (SPR.ok[id] !== undefined) return SPR.ok[id];
  let ok = false;
  try {
    const m = MOD[id],
      n = 40,
      W = n * 4,
      mk = () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = W;
        const g = cv.getContext('2d');
        g.fillStyle = '#5a6068';
        g.fillRect(0, 0, W, W);
        g.translate(W / 2, W / 2);
        return [cv, g];
      };
    if (m && id !== 'cockpit' && !m.glow && !m.plan && typeof document !== 'undefined') {
      const keep = ANIM,
        [a, ga] = mk(),
        [b, gb] = mk();
      ANIM = 0.37;
      drawModuleCore(ga, id, n, 0, 'p', {});
      ANIM = 2.91;
      drawModuleCore(gb, id, n, 0, 'p', {});
      ANIM = keep;
      const da = ga.getImageData(0, 0, W, W).data,
        db = gb.getImageData(0, 0, W, W).data;
      ok = da.length > 0;
      for (let i = 0; i < da.length && ok; i += 4)
        if (Math.abs(da[i] - db[i]) > 6 || Math.abs(da[i + 1] - db[i + 1]) > 6) ok = false;
      // additive glows look different on a sprite than drawn straight onto the floor
      if (ok) {
        const [sp, gs] = mk(),
          [cv, gc] = mk();
        gs.clearRect(-W / 2, -W / 2, W, W);
        drawModuleCore(gs, id, n, 0, 'p', {});
        ANIM = 0.37;
        gc.drawImage(sp, -W / 2, -W / 2);
        ANIM = keep;
        const dc = gc.getImageData(0, 0, W, W).data;
        for (let i = 0; i < da.length && ok; i += 4)
          if (Math.abs(da[i] - dc[i]) > 10 || Math.abs(da[i + 2] - dc[i + 2]) > 10) ok = false;
      }
    }
  } catch (e) {
    ok = false;
  }
  return (SPR.ok[id] = ok);
}
function drawModule(c, id, s, ang, team, st) {
  const q4 = ang / (Math.PI / 2);
  if (
    typeof c.getTransform === 'function' &&
    !(st && st.builder) &&
    Math.abs(q4 - Math.round(q4)) < 1e-4 &&
    !(st && SPR_LIVE.some(k => (typeof st[k] === 'number' ? st[k] > 0.001 : !!st[k]))) &&
    sprStatic(id)
  ) {
    const T = c.getTransform(),
      sc = T ? Math.hypot(T.a, T.b) : 1,
      q = Math.pow(2, Math.ceil(Math.log2(Math.max(0.25, sc)) * 4) / 4),
      m = MOD[id],
      span = s * Math.max(1, m.size || 1) * 1.7,
      key = [
        id,
        s,
        (Math.round(q4) + 4) % 4,
        team,
        q,
        st && st.hull ? 1 : 0,
        (st && st.nb) || 0,
        st && st.hull ? st.gx + ',' + st.gy : '',
        (st && st.paint) || '',
        st && st.turret ? 1 : 0
      ].join('|');
    let sp = SPR.map.get(key);
    if (!sp) {
      SPR.miss++;
      if (SPR.map.size > 700) SPR.map.clear();
      const px = Math.ceil(span * q);
      sp = document.createElement('canvas');
      sp.width = sp.height = px;
      const g = sp.getContext('2d');
      g.scale(q, q);
      g.translate(span / 2, span / 2);
      drawModuleCore(g, id, s, ang, team, st);
      SPR.map.set(key, sp);
    } else SPR.hits++;
    c.drawImage(sp, -span / 2, -span / 2, span, span);
    return;
  }
  drawModuleCore(c, id, s, ang, team, st);
}
/** Every module: its own artwork, plus a small rarity notch on chassis blocks. */
function drawModuleCore(c, id, s, ang, team, st) {
  drawModuleArt(c, id, s, ang, team, st);
  const m = MOD[id];
  if (
    m &&
    m.layer !== 't' &&
    !(st && st.hull) &&
    m.rar >= 1 &&
    (m.cat === 'struct' || m.cat === 'defense') &&
    cellCount(m) === 1 &&
    !m.wpn &&
    s > 18 &&
    !m.plan
  ) {
    const h = s / 2;
    c.fillStyle = RAR[m.rar].col;
    c.beginPath();
    c.moveTo(-h * 0.92, -h * 0.92);
    c.lineTo(-h * 0.92 + s * 0.2, -h * 0.92);
    c.lineTo(-h * 0.92, -h * 0.92 + s * 0.2);
    c.closePath();
    c.fill();
  }
}
function drawModuleArt(c, id, s, ang, team, st) {
  st = st || {};
  if (st.hull && MOD[id].art && MOD[id].art.k !== 'cockpit' && MOD[id].art.k !== 'frame' && MOD[id].art.k !== 'plate') {
    HULL_ART = true;
    try {
      return drawModuleArtCore(c, id, s, ang, team, st);
    } finally {
      HULL_ART = false;
    }
  }
  return drawModuleArtCore(c, id, s, ang, team, st);
}
function drawModuleArtCore(c, id, s, ang, team, st) {
  const m = MOD[id],
    A = m.art,
    h = s / 2,
    L = m.size || 1;
  st = st || {};
  if (m.plan) {
    planDrawModule(c, m, s, ang, st);
    return;
  }
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (m.layer === 't' && A.k !== 'screen') topMount(c, h, s);
  if (A.k === 'joint') return drawJointArt(c, id, s, ang, st);
  if (A.k === 'shape') return drawShapeArt(c, m, s, ang, st);
  switch (A.k) {
    case 'cockpit': {
      const col = st.paint || (team === 'e' ? '#d6463e' : '#f2b705');
      bevel(c, h * 0.94, col, s * 0.14);
      c.save();
      c.rotate(ang);
      c.save();
      c.beginPath();
      c.rect(-h * 0.9, h * 0.4, h * 1.8, h * 0.5);
      c.clip();
      c.fillStyle = '#1c1c1c';
      for (let i = -4; i < 4; i++) {
        const x = i * s * 0.24;
        c.beginPath();
        c.moveTo(x, h);
        c.lineTo(x + s * 0.11, h);
        c.lineTo(x + s * 0.11 + h * 0.6, h * 0.35);
        c.lineTo(x + h * 0.6, h * 0.35);
        c.closePath();
        c.fill();
      }
      c.restore();
      c.beginPath();
      c.moveTo(-h * 0.62, -h * 0.02);
      c.lineTo(-h * 0.46, -h * 0.7);
      c.lineTo(h * 0.46, -h * 0.7);
      c.lineTo(h * 0.62, -h * 0.02);
      c.closePath();
      c.fillStyle = '#16222a';
      c.fill();
      c.fillStyle = 'rgba(170,215,240,.4)';
      c.beginPath();
      c.moveTo(-h * 0.38, -h * 0.12);
      c.lineTo(-h * 0.28, -h * 0.6);
      c.lineTo(-h * 0.12, -h * 0.6);
      c.lineTo(-h * 0.22, -h * 0.12);
      c.closePath();
      c.fill();
      if (st.eyes !== false && s > 14) drawEyes(c, h, st);
      c.restore();
      if (st.badge && s > 14) drawBadge(c, st.badge, s * 0.34, 0, h * 0.62);
      break;
    }
    case 'frame': {
      if (st.hull) return frameOnHull(c, A, s, h, ang, st);
      const col = A.c,
        dk = mix(col, -0.38),
        lt = mix(col, 0.28);
      bevel(c, h * 0.92, col, s * 0.06);
      if (A.s === 'x') {
        line(c, [-h * 0.6, -h * 0.6, h * 0.6, h * 0.6], dk, s * 0.06);
        line(c, [h * 0.6, -h * 0.6, -h * 0.6, h * 0.6], dk, s * 0.06);
        rr(c, -h * 0.74, -h * 0.74, h * 1.48, h * 1.48, s * 0.04);
        c.strokeStyle = dk;
        c.lineWidth = s * 0.04;
        c.stroke();
        bolts(c, h, s, lt);
      } else if (A.s === 'mesh') {
        c.strokeStyle = dk;
        c.lineWidth = s * 0.035;
        c.beginPath();
        for (let i = -3; i <= 3; i++) {
          c.moveTo(i * h * 0.25, -h * 0.8);
          c.lineTo(i * h * 0.25, h * 0.8);
          c.moveTo(-h * 0.8, i * h * 0.25);
          c.lineTo(h * 0.8, i * h * 0.25);
        }
        c.stroke();
      } else if (A.s === 'beam') {
        c.save();
        c.rotate(ang);
        c.fillStyle = lt;
        c.fillRect(-h * 0.86, -h * 0.86, h * 1.72, h * 0.32);
        c.fillRect(-h * 0.86, h * 0.54, h * 1.72, h * 0.32);
        c.fillStyle = dk;
        c.fillRect(-h * 0.13, -h * 0.56, h * 0.26, h * 1.12);
        c.restore();
      } else if (A.s === 'hub') {
        c.fillStyle = dk;
        c.fillRect(-h * 0.18, -h * 0.92, h * 0.36, h * 1.84);
        c.fillRect(-h * 0.92, -h * 0.18, h * 1.84, h * 0.36);
        gradCirc(c, h * 0.46, col);
        circ(c, 0, 0, h * 0.15, dk);
        bolts(c, h, s, lt);
      } else if (A.s === 'block') {
        c.fillStyle = dk;
        c.fillRect(-h * 0.7, -h * 0.3, h * 1.4, h * 0.14);
        c.fillRect(-h * 0.7, h * 0.16, h * 1.4, h * 0.14);
        rr(c, -h * 0.34, -h * 0.13, h * 0.68, h * 0.26, 2);
        c.fillStyle = '#c9a43a';
        c.fill();
        bolts(c, h, s, lt);
      } else if (A.s === 'spring') {
        const p = [];
        for (let i = 0; i <= 8; i++) p.push((i % 2 ? 1 : -1) * h * 0.4, -h * 0.75 + i * h * 0.1875);
        line(c, p, lt, s * 0.07);
        c.fillStyle = dk;
        c.fillRect(-h * 0.6, -h * 0.86, h * 1.2, h * 0.16);
        c.fillRect(-h * 0.6, h * 0.7, h * 1.2, h * 0.16);
      } else if (A.s === 'nano') {
        c.strokeStyle = '#5fe3c8';
        c.lineWidth = s * 0.04;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          c.lineTo(Math.cos(a) * h * 0.6, Math.sin(a) * h * 0.6);
        }
        c.closePath();
        c.stroke();
        circ(c, 0, 0, h * 0.16 + Math.sin(ANIM * 3) * h * 0.04, '#a8fff0');
      }
      break;
    }
    case 'beam': {
      c.save();
      c.rotate(ang);
      const len = L * s * 0.97;
      const g = c.createLinearGradient(-h * 0.5, 0, h * 0.5, 0);
      g.addColorStop(0, '#3f4f5d');
      g.addColorStop(0.5, '#7c8e9c');
      g.addColorStop(1, '#34414c');
      rr(c, -h * 0.5, -len / 2, h, len, s * 0.08);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = '#26313a';
      c.lineWidth = s * 0.05;
      c.stroke();
      for (let i = 0; i < L; i++) {
        const y = -len / 2 + ((i + 0.5) * len) / L;
        circ(c, 0, y, h * 0.2, '#26313a');
        line(c, [-h * 0.36, y - h * 0.55, h * 0.36, y - h * 0.55], '#26313a', s * 0.03);
      }
      c.restore();
      break;
    }
    case 'coupler': {
      bevel(c, h * 0.92, '#5d6670', s * 0.06);
      c.save();
      c.rotate(ang);
      c.save();
      c.beginPath();
      c.rect(-h * 0.6, -h * 0.45, h * 1.2, h * 0.9);
      c.clip();
      c.fillStyle = '#f2b705';
      c.fillRect(-h * 0.6, -h * 0.45, h * 1.2, h * 0.9);
      c.fillStyle = '#1c1c1c';
      for (let i = -3; i < 3; i++) {
        c.beginPath();
        c.moveTo(i * h * 0.4, -h * 0.45);
        c.lineTo(i * h * 0.4 + h * 0.2, -h * 0.45);
        c.lineTo(i * h * 0.4 + h * 1.1, h * 0.45);
        c.lineTo(i * h * 0.4 + h * 0.9, h * 0.45);
        c.closePath();
        c.fill();
      }
      c.restore();
      circ(c, 0, 0, h * 0.2, '#2b2f33', '#ece8df', s * 0.04);
      c.restore();
      break;
    }
    case 'ring': {
      bevel(c, h * 0.92, '#4c565f', s * 0.08);
      c.strokeStyle = '#c9a43a';
      c.lineWidth = s * 0.12;
      c.beginPath();
      c.arc(0, 0, h * 0.6, 0, 7);
      c.stroke();
      c.fillStyle = '#8a6a2a';
      for (let k = 0; k < 12; k++) {
        c.save();
        c.rotate((k * Math.PI) / 6 + ANIM * 0.3);
        c.fillRect(h * 0.68, -h * 0.06, h * 0.16, h * 0.12);
        c.restore();
      }
      break;
    }
    case 'wheel': {
      c.save();
      c.rotate(ang);
      const big = A.v === 'monster';
      c.fillStyle = '#30353a';
      c.fillRect(-h * 0.95, -h * 0.16, h * 1.9, h * 0.32);
      const tw = big ? 0.78 : A.v === 'slick' ? 0.5 : 0.6;
      rr(c, -h * tw, -h * (big ? 1 : 0.96), h * tw * 2, h * (big ? 2 : 1.92), s * 0.16);
      c.fillStyle = '#17181a';
      c.fill();
      if (A.v === 'slick') {
        line(c, [-h * 0.38, -h * 0.8, -h * 0.38, h * 0.8], '#c0392b', s * 0.04);
        line(c, [h * 0.38, -h * 0.8, h * 0.38, h * 0.8], '#c0392b', s * 0.04);
      } else {
        c.strokeStyle = '#36383c';
        c.lineWidth = s * (big ? 0.1 : 0.06);
        const step = h * 0.26,
          off = ((((st.roll || 0) * 0.5) % step) + step) % step;
        c.beginPath();
        for (let i = -4; i <= 3; i++) {
          const y = i * step + off;
          if (Math.abs(y) > h * 0.86) continue;
          c.moveTo(-h * tw * 0.75, y);
          c.lineTo(h * tw * 0.75, y);
        }
        c.stroke();
      }
      if (A.v === 'spiked') {
        c.fillStyle = '#cfd4d8';
        for (let i = -2; i <= 2; i++)
          for (const sd of [-1, 1]) {
            c.beginPath();
            c.moveTo(sd * h * 0.6, i * h * 0.36 - h * 0.1);
            c.lineTo(sd * h * 0.98, i * h * 0.36);
            c.lineTo(sd * h * 0.6, i * h * 0.36 + h * 0.1);
            c.fill();
          }
      }
      rr(c, -h * 0.22, -h * 0.3, h * 0.44, h * 0.6, s * 0.05);
      c.fillStyle = big ? '#c0392b' : '#7d868e';
      c.fill();
      if (A.v === 'steer') {
        line(c, [0, 0, -h * 0.9, -h * 0.6], '#c0392b', s * 0.07);
        circ(c, -h * 0.9, -h * 0.6, s * 0.06, '#c0392b');
      }
      c.restore();
      break;
    }
    case 'track': {
      c.save();
      c.rotate(ang);
      const len = L * s;
      rr(c, -h * 0.8, -len / 2, h * 1.6, len, s * 0.1);
      c.fillStyle = '#151617';
      c.fill();
      c.strokeStyle = '#3d4045';
      c.lineWidth = s * 0.07;
      c.beginPath();
      const tstep = h * 0.24,
        toff = ((((st.roll || 0) * 0.5) % tstep) + tstep) % tstep;
      for (let y = -len / 2 + h * 0.08 + toff; y < len / 2 - h * 0.05; y += tstep) {
        c.moveTo(-h * 0.68, y);
        c.lineTo(h * 0.68, y);
      }
      c.stroke();
      c.fillStyle = '#5d656c';
      c.fillRect(-h * 0.14, -len / 2 + h * 0.3, h * 0.28, len - h * 0.6);
      for (const y of [-len / 2 + h * 0.45, len / 2 - h * 0.45]) circ(c, 0, y, h * 0.22, '#8a9299');
      c.restore();
      break;
    }
    case 'omni': {
      c.save();
      c.rotate(ang);
      c.fillStyle = '#30353a';
      c.fillRect(-h * 0.95, -h * 0.16, h * 1.9, h * 0.32);
      circ(c, 0, 0, h * 0.75, '#1b1c1e');
      for (let k = 0; k < 8; k++) {
        c.save();
        c.rotate((k * Math.PI) / 4);
        rr(c, h * 0.42, -h * 0.12, h * 0.3, h * 0.24, 2);
        c.fillStyle = '#6f777e';
        c.fill();
        c.restore();
      }
      circ(c, 0, 0, h * 0.25, '#9aa3ab');
      c.restore();
      break;
    }
    case 'hover': {
      circ(c, 0, 0, h * 0.92, '#24292e', '#14171a', s * 0.05);
      const g = c.createRadialGradient(0, 0, h * 0.1, 0, 0, h * 0.8);
      g.addColorStop(0, 'rgba(120,230,255,.9)');
      g.addColorStop(1, 'rgba(120,230,255,0)');
      circ(c, 0, 0, h * 0.75, g);
      circ(c, 0, 0, h * (0.45 + Math.sin(ANIM * 6) * 0.05), null, '#7fe0ff', s * 0.05);
      break;
    }
    case 'engine': {
      bevel(c, h * 0.92, '#a8302a', s * 0.08);
      c.save();
      c.rotate(ang);
      for (const x of [-0.42, 0.42])
        for (let j = 0; j < 3; j++) circ(c, x * h, -h * 0.5 + j * h * 0.45, h * 0.16, '#d9d4c8', '#5a1612', s * 0.03);
      c.fillStyle = '#2b2f33';
      c.fillRect(-h * 0.14, -h * 0.8, h * 0.28, h * 1.6);
      rr(c, -h * 0.3, -h * 0.95, h * 0.6, h * 0.3, 3);
      c.fillStyle = '#8a9299';
      c.fill();
      c.restore();
      break;
    }
    case 'gyro': {
      bevel(c, h * 0.88, '#3a4046', s * 0.08);
      c.strokeStyle = '#c9a43a';
      c.lineWidth = s * 0.06;
      c.beginPath();
      c.ellipse(0, 0, h * 0.62, h * 0.3, ANIM * 1.5, 0, 7);
      c.stroke();
      c.strokeStyle = '#8a9299';
      c.beginPath();
      c.ellipse(0, 0, h * 0.3, h * 0.62, ANIM * 1.5, 0, 7);
      c.stroke();
      circ(c, 0, 0, h * 0.14, '#e6e2d6');
      break;
    }
    case 'jet': {
      bevel(c, h * 0.88, '#4c565f', s * 0.08);
      c.save();
      c.rotate(ang);
      c.beginPath();
      c.moveTo(-h * 0.35, -h * 0.6);
      c.lineTo(h * 0.35, -h * 0.6);
      c.lineTo(h * 0.6, h * 0.9);
      c.lineTo(-h * 0.6, h * 0.9);
      c.closePath();
      const g = c.createLinearGradient(-h * 0.6, 0, h * 0.6, 0);
      g.addColorStop(0, '#3a3f44');
      g.addColorStop(0.5, '#a8afb5');
      g.addColorStop(1, '#2b2f33');
      c.fillStyle = g;
      c.fill();
      c.beginPath();
      c.ellipse(0, h * 0.8, h * 0.5, h * 0.15, 0, 0, 7);
      c.fillStyle = st.fire ? '#ffd27a' : '#ff9a3a';
      c.fill();
      if (st.fire) {
        c.beginPath();
        c.moveTo(-h * 0.4, h * 0.9);
        c.lineTo(0, h * (1.6 + Math.random() * 0.5));
        c.lineTo(h * 0.4, h * 0.9);
        c.fillStyle = 'rgba(255,170,60,.85)';
        c.fill();
      }
      c.restore();
      break;
    }
    case 'jumpjet': {
      bevel(c, h * 0.88, '#4c565f', s * 0.08);
      for (let k = 0; k < 4; k++) {
        c.save();
        c.rotate((k * Math.PI) / 2 + Math.PI / 4);
        c.fillStyle = '#2b2f33';
        c.fillRect(-h * 0.1, h * 0.5, h * 0.2, h * 0.32);
        c.restore();
      }
      gradCirc(c, h * 0.55, '#6f747a');
      circ(c, 0, 0, h * 0.38, '#1d1f22');
      circ(c, 0, 0, h * 0.2, st.fire ? '#ffe9a8' : '#ff9a3a');
      break;
    }
    case 'anchor': {
      bevel(c, h * 0.88, '#4c565f', s * 0.08);
      const e = st.anchored ? 1.25 : 0.8;
      c.strokeStyle = '#c9ced3';
      c.lineWidth = s * 0.09;
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        c.beginPath();
        c.moveTo(Math.cos(a) * h * 0.2, Math.sin(a) * h * 0.2);
        c.lineTo(Math.cos(a) * h * e, Math.sin(a) * h * e);
        c.stroke();
      }
      gradCirc(c, h * 0.35, '#7a5a2a');
      break;
    }
    case 'blink': {
      bevel(c, h * 0.88, '#2a2238', s * 0.08);
      for (let i = 0; i < 3; i++) {
        const r = h * (0.25 + ((ANIM * 0.8 + i / 3) % 1) * 0.55);
        circ(c, 0, 0, r, null, `rgba(197,139,255,${1 - r / (h * 0.8)})`, s * 0.05);
      }
      circ(c, 0, 0, h * 0.18, '#efe0ff');
      break;
    }
    case 'flipper': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.9, -h * 0.9, h * 1.8, h * 1.8, s * 0.06);
      c.fillStyle = '#4a5056';
      c.fill();
      const up = st.punch > 0 ? 0.3 : 0;
      c.beginPath();
      c.moveTo(-h * 0.85, h * 0.2);
      c.lineTo(-h * 0.7, -h * (0.95 + up));
      c.lineTo(h * 0.7, -h * (0.95 + up));
      c.lineTo(h * 0.85, h * 0.2);
      c.closePath();
      c.fillStyle = '#c0392b';
      c.fill();
      c.strokeStyle = '#5a1a14';
      c.lineWidth = s * 0.04;
      c.stroke();
      line(c, [0, h * 0.1, 0, -h * 0.55], '#fff', s * 0.07);
      line(c, [-h * 0.22, -h * 0.32, 0, -h * 0.6, h * 0.22, -h * 0.32], '#fff', s * 0.07);
      c.restore();
      break;
    }
    case 'piston': {
      bevel(c, h * 0.88, '#4c565f', s * 0.08);
      c.save();
      c.rotate(ang);
      const ext = (st.punch || 0) > 0 ? h * 0.9 : 0;
      rr(c, -h * 0.35, -h * 0.2, h * 0.7, h * 0.9, s * 0.05);
      c.fillStyle = '#6f777e';
      c.fill();
      c.fillStyle = '#c9ced3';
      c.fillRect(-h * 0.1, -h * 0.6 - ext, h * 0.2, h * 0.5 + ext);
      circ(c, 0, -h * 0.75 - ext, h * 0.38, '#c0392b', '#5a1a14', s * 0.04);
      c.restore();
      break;
    }
    case 'springpad': {
      bevel(c, h * 0.9, '#3a4046', s * 0.08);
      const p = [];
      for (let i = 0; i <= 10; i++) p.push(-h * 0.65 + i * h * 0.13, (i % 2 ? -1 : 1) * h * 0.32);
      line(c, p, '#f2b705', s * 0.07);
      rr(c, -h * 0.8, -h * 0.8, h * 1.6, h * 0.25, 3);
      c.fillStyle = '#5cc38f';
      c.fill();
      rr(c, -h * 0.8, h * 0.55, h * 1.6, h * 0.25, 3);
      c.fill();
      break;
    }
    case 'sprayer': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.42, -h * 0.3, h * 0.84, h * 1.0, h * 0.3);
      const g = c.createLinearGradient(-h * 0.42, 0, h * 0.42, 0);
      g.addColorStop(0, mix(A.c, -0.3));
      g.addColorStop(0.4, mix(A.c, 0.35));
      g.addColorStop(1, mix(A.c, -0.4));
      c.fillStyle = g;
      c.fill();
      c.fillStyle = '#8a9299';
      c.fillRect(-h * 0.12, -h * 0.9, h * 0.24, h * 0.6);
      c.fillStyle = '#2b2f33';
      c.fillRect(-h * 0.24, -h * 0.98, h * 0.48, h * 0.16);
      c.restore();
      break;
    }
    case 'ballmount': {
      gradCirc(c, h * 0.4, '#8a9299');
      circ(c, 0, 0, h * 0.18, '#2b2f33');
      if (st.builder) {
        c.save();
        c.rotate(ang);
        line(c, [0, 0, 0, -h * 1.1], '#9aa3ab', s * 0.05);
        circ(c, 0, -h * 1.3, h * 0.42, '#2b2f33', '#14171a', s * 0.04);
        c.restore();
      }
      break;
    }
    case 'catapult': {
      c.save();
      c.rotate(ang);
      line(c, [0, h * 0.5, 0, -h * 0.5], '#6b5a3a', s * 0.14);
      circ(c, 0, -h * 0.55, h * 0.35, '#3a2f1a');
      circ(c, 0, -h * 0.55, h * 0.24, '#1d1810');
      if (st.ammo) for (let i = 0; i < st.ammo; i++) circ(c, (i - 1) * h * 0.38, h * 0.55, h * 0.14, '#f2b705');
      c.restore();
      break;
    }
    case 'tractor': {
      c.save();
      c.rotate(ang);
      c.beginPath();
      c.arc(0, h * 0.3, h * 0.8, -Math.PI * 0.8, -Math.PI * 0.2);
      c.strokeStyle = '#c9d4dc';
      c.lineWidth = s * 0.1;
      c.stroke();
      circ(c, 0, -h * 0.35, h * 0.18, st.active ? '#bfffd8' : '#5cc38f');
      c.restore();
      break;
    }
    case 'vacuum': {
      c.save();
      c.rotate(ANIM * 6);
      for (let k = 0; k < 5; k++) {
        c.save();
        c.rotate(k * 1.257);
        c.fillStyle = '#9aa3ab';
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(h * 0.4, -h * 0.1, h * 0.6, h * 0.15);
        c.lineTo(h * 0.15, h * 0.1);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.restore();
      circ(c, 0, 0, h * 0.16, '#2b2f33');
      break;
    }
    case 'horn': {
      c.save();
      c.rotate(-0.6);
      c.beginPath();
      c.moveTo(-h * 0.5, h * 0.15);
      c.lineTo(h * 0.35, -h * 0.15);
      c.lineTo(h * 0.65, -h * 0.55);
      c.lineTo(h * 0.75, h * 0.35);
      c.lineTo(h * 0.35, h * 0.25);
      c.lineTo(-h * 0.5, h * 0.35);
      c.closePath();
      c.fillStyle = '#e2504a';
      c.fill();
      c.restore();
      circ(c, -h * 0.45, h * 0.2, h * 0.18, '#ece8df');
      break;
    }
    case 'disco': {
      for (let k = 0; k < 12; k++) {
        const a = k * 0.52 + ANIM,
          r = h * 0.42;
        c.fillStyle = ['#ff5ad1', '#5ad1ff', '#fff07a', '#7aff9b'][k % 4];
        c.fillRect(Math.cos(a) * r * 0.6 - h * 0.1, Math.sin(a) * r * 0.6 - h * 0.1, h * 0.2, h * 0.2);
      }
      circ(c, 0, 0, h * 0.5, null, '#d6dbdf', s * 0.04);
      break;
    }
    case 'gun': {
      c.save();
      c.rotate(ang);
      if (st.turret) circ(c, 0, 0, h * 0.86, null, '#f2b705', s * 0.04);
      // barrels reach out past the turret, so a gun reads as a gun and not as a box
      const n = A.b || 1,
        w = (A.w || 0.1) * s * 1.2,
        len = (A.l || 1.2) * h * 1.5,
        gap = w + s * 0.05,
        kick = st.kick || 0;
      // barrels slide back when a shot goes off; the housing stays put
      c.save();
      c.translate(0, kick * h * 0.32);
      if (A.v === 'mini') {
        rr(c, -h * 0.3, -len, h * 0.6, len, h * 0.15);
        c.fillStyle = '#1c2024';
        c.fill();
        // the barrel cluster turns as it spools up
        const ph = ((ANIM * 14 * (st.rev || 0)) % 1) * h * 0.16;
        for (let i = -2; i <= 1; i++) {
          const x = i * h * 0.16 + ph;
          if (Math.abs(x) <= h * 0.2) line(c, [x, -len * 0.95, x, -h * 0.15], '#4a5056', s * 0.03);
        }
        c.fillStyle = '#5d656c';
        c.fillRect(-h * 0.34, -len, h * 0.68, h * 0.18);
      } else if (A.v === 'flare') {
        c.beginPath();
        c.moveTo(-h * 0.18, 0);
        c.lineTo(-h * 0.42, -len);
        c.lineTo(h * 0.42, -len);
        c.lineTo(h * 0.18, 0);
        c.closePath();
        c.fillStyle = '#2b2520';
        c.fill();
      } else
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * gap;
          const bg = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
          bg.addColorStop(0, '#5a636c');
          bg.addColorStop(0.45, '#2a3036');
          bg.addColorStop(1, '#15191d');
          c.fillStyle = bg;
          c.fillRect(x - w / 2, -len, w, len);
          c.fillStyle = A.tip || mix(A.c, -0.15);
          c.fillRect(x - w * 0.65, -len, w * 1.3, h * 0.2);
        }
      if (A.v === 'brake') {
        c.fillStyle = '#262b30';
        c.fillRect(-w * 0.9, -len - h * 0.05, w * 1.8, h * 0.25);
      }
      if (kick > 0.45 && !st.builder && !st.pour) {
        // muzzle flash: a short star at every barrel tip
        const fl = (kick - 0.45) / 0.55,
          hot = A.v === 'ice' ? '#e6faff' : A.h === 'lens' ? '#bff' : '#ffe08a';
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * gap;
          c.fillStyle = hot;
          c.globalAlpha = fl;
          c.beginPath();
          for (let k = 0; k < 10; k++) {
            const r = (k % 2 ? 0.18 : 0.5) * h * (0.8 + fl * 0.6),
              a = (k / 10) * Math.PI * 2;
            c.lineTo(x + Math.cos(a) * r, -len - h * 0.25 + Math.sin(a) * r);
          }
          c.closePath();
          c.fill();
        }
        c.restore();
      }
      c.restore();
      if (A.v === 'rail') {
        c.fillStyle = `rgba(120,200,255,${0.3 + (st.charge || 0) * 0.7})`;
        c.fillRect(-gap / 2 + w / 2, -len, gap - w, len);
      }
      if (A.v === 'harpoon' && !st.fired) {
        c.beginPath();
        c.moveTo(0, -len - h * 0.35);
        c.lineTo(h * 0.2, -len + h * 0.02);
        c.lineTo(-h * 0.2, -len + h * 0.02);
        c.closePath();
        c.fillStyle = '#c9ccd0';
        c.fill();
      }
      if (A.v === 'tire') {
        circ(c, 0, -len * 0.7, h * 0.28, '#17181a', '#3a3c40', s * 0.06);
      }
      if (A.v === 'sticky') {
        circ(c, 0, -len, h * 0.2, '#7fdc5a');
      }
      if (A.v === 'ice') {
        c.fillStyle = '#e6faff';
        for (const a of [-0.5, 0, 0.5]) {
          c.save();
          c.translate(0, -len);
          c.rotate(a);
          c.fillRect(-h * 0.04, -h * 0.3, h * 0.08, h * 0.3);
          c.restore();
        }
      }
      if (A.h === 'box') {
        rr(c, -h * 0.48, -h * 0.42, h * 0.96, h * 0.86, s * 0.08);
        const g = c.createLinearGradient(0, -h * 0.42, 0, h * 0.42);
        g.addColorStop(0, mix(A.c, 0.3));
        g.addColorStop(1, mix(A.c, -0.35));
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = mix(A.c, -0.6);
        c.lineWidth = s * 0.04;
        c.stroke();
      } else if (A.h === 'tank') {
        rr(c, -h * 0.42, -h * 0.35, h * 0.84, h * 0.95, h * 0.35);
        const g = c.createLinearGradient(-h * 0.42, 0, h * 0.42, 0);
        g.addColorStop(0, mix(A.c, -0.3));
        g.addColorStop(0.4, mix(A.c, 0.35));
        g.addColorStop(1, mix(A.c, -0.4));
        c.fillStyle = g;
        c.fill();
      } else gradCirc(c, h * 0.5, A.c);
      if (A.h === 'lens') {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, h * 0.3);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, A.tip || '#7fe0ff');
        circ(c, 0, 0, h * 0.26, g);
      }
      if (A.v === 'flame') circ(c, 0, -len, h * 0.14, '#ffb347');
      if (A.v === 'water') circ(c, 0, 0, h * 0.14, '#9fe0ff');
      c.restore();
      break;
    }
    case 'pod': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.62, -h * 0.72, h * 1.24, h * 1.3, s * 0.08);
      const g = c.createLinearGradient(0, -h * 0.7, 0, h * 0.6);
      g.addColorStop(0, mix(A.c, 0.25));
      g.addColorStop(1, mix(A.c, -0.35));
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = mix(A.c, -0.6);
      c.lineWidth = s * 0.04;
      c.stroke();
      const n = A.n,
        cols = Math.ceil(Math.sqrt(n)),
        rows = Math.ceil(n / cols),
        r = Math.min((h * 1.1) / cols, (h * 1.1) / rows) * 0.36;
      for (let i = 0; i < n; i++) {
        const x = ((i % cols) - (cols - 1) / 2) * r * 2.5,
          y = (Math.floor(i / cols) - (rows - 1) / 2) * r * 2.5 - h * 0.06;
        circ(c, x, y, r, '#15181a');
        if (A.v === 'missile') circ(c, x, y, r * 0.55, '#c0392b');
      }
      c.restore();
      break;
    }
    case 'mortar': {
      gradCirc(c, h * 0.66, A.c);
      circ(c, 0, 0, h * 0.44, '#121416', mix(A.c, 0.3), s * 0.05);
      if (A.v === 'napalm') circ(c, 0, 0, h * 0.18, '#ff7a2a');
      if (A.v === 'cluster')
        for (let k = 0; k < 6; k++)
          circ(c, Math.cos(k * 1.047) * h * 0.24, Math.sin(k * 1.047) * h * 0.24, h * 0.07, '#8a9299');
      break;
    }
    case 'arc': {
      c.save();
      c.rotate(ang);
      c.strokeStyle = '#b8743a';
      c.lineWidth = s * 0.1;
      c.beginPath();
      c.moveTo(-h * 0.35, h * 0.3);
      c.lineTo(-h * 0.35, -h * 0.4);
      c.lineTo(-h * 0.12, -h * 0.95);
      c.moveTo(h * 0.35, h * 0.3);
      c.lineTo(h * 0.35, -h * 0.4);
      c.lineTo(h * 0.12, -h * 0.95);
      c.stroke();
      gradCirc(c, h * 0.3, '#4a6d8c');
      if (Math.sin(ANIM * 17) > 0)
        line(c, [-h * 0.12, -h * 0.95, 0, -h * 0.75, h * 0.05, -h * 0.93, h * 0.12, -h * 0.95], '#bfe9ff', s * 0.04);
      c.restore();
      break;
    }
    case 'tesla': {
      for (let k = 0; k < 4; k++) circ(c, 0, 0, h * (0.68 - k * 0.13), null, k % 2 ? '#b8743a' : '#d89a52', s * 0.06);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, h * 0.32);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, 'rgba(150,220,255,.25)');
      circ(c, 0, 0, h * 0.3, g);
      break;
    }
    case 'drone': {
      rr(c, -h * 0.6, -h * 0.6, h * 1.2, h * 1.2, s * 0.08);
      c.fillStyle = '#3a4046';
      c.fill();
      for (const [x, y] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1]
      ])
        circ(c, x * h * 0.32, y * h * 0.32, h * 0.2, st.out ? '#1b1e21' : '#8a9299', '#14171a', s * 0.03);
      circ(c, 0, 0, h * 0.12, '#e2504a');
      break;
    }
    case 'spike': {
      // no bracket box: the spikes are welded straight onto the car, with a slim collar at their roots
      c.save();
      c.rotate(ang);
      const by = h * 0.55,
        spikes = [
          [-h * 0.62, h * 0.2, h * 0.95],
          [h * 0.62, h * 0.2, h * 0.95],
          [0, h * 0.34, h * 1.5]
        ],
        path = (x, w, l) => {
          c.beginPath();
          c.moveTo(x - w, by);
          c.lineTo(x, by - l);
          c.lineTo(x + w, by);
          c.closePath();
        };
      // a soft drop shadow so they stand off the floor
      c.fillStyle = 'rgba(0,0,0,.28)';
      for (const [x, w, l] of spikes) {
        c.save();
        c.translate(s * 0.04, s * 0.05);
        path(x, w, l);
        c.fill();
        c.restore();
      }
      for (const [x, w, l] of spikes) {
        // two facets: the lit left side and the shaded right side meet in a sharp ridge
        c.beginPath();
        c.moveTo(x - w, by);
        c.lineTo(x, by - l);
        c.lineTo(x, by);
        c.closePath();
        const gl = c.createLinearGradient(x - w, by, x, by - l);
        gl.addColorStop(0, '#9aa3ab');
        gl.addColorStop(1, '#f4f7f9');
        c.fillStyle = gl;
        c.fill();
        c.beginPath();
        c.moveTo(x + w, by);
        c.lineTo(x, by - l);
        c.lineTo(x, by);
        c.closePath();
        const gr = c.createLinearGradient(x + w, by, x, by - l);
        gr.addColorStop(0, '#3c4349');
        gr.addColorStop(1, '#8b949c');
        c.fillStyle = gr;
        c.fill();
        path(x, w, l);
        c.strokeStyle = 'rgba(20,23,26,.8)';
        c.lineWidth = Math.max(1, s * 0.025);
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.55)';
        c.lineWidth = Math.max(0.6, s * 0.012);
        c.beginPath();
        c.moveTo(x - w * 0.55, by - l * 0.1);
        c.lineTo(x - w * 0.08, by - l * 0.86);
        c.stroke();
      }
      // the weld collar
      const cg = c.createLinearGradient(0, by - h * 0.1, 0, by + h * 0.1);
      cg.addColorStop(0, '#6b737b');
      cg.addColorStop(1, '#2a2f34');
      rr(c, -h * 0.86, by - h * 0.08, h * 1.72, h * 0.17, h * 0.08);
      c.fillStyle = cg;
      c.fill();
      c.strokeStyle = '#16191c';
      c.lineWidth = Math.max(1, s * 0.02);
      c.stroke();
      // a glint: runs over the steel when you place them, and now and then while you build
      let gp = st.shine != null ? st.shine : -1;
      if (gp < 0 && st.builder && SETTINGS.motion !== false) {
        const ph = (ANIM * 0.3 + hullHash(st.gx || 0, st.gy || 0) * 3) % 4;
        if (ph < 1) gp = ph;
      }
      if (gp >= 0 && gp <= 1) {
        c.save();
        c.beginPath();
        for (const [x, w, l] of spikes) {
          c.moveTo(x - w, by);
          c.lineTo(x, by - l);
          c.lineTo(x + w, by);
          c.closePath();
        }
        c.clip();
        const gx = -h * 1.4 + gp * h * 2.8,
          sg = c.createLinearGradient(gx - h * 0.35, by, gx + h * 0.35, by - h * 0.7);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,.95)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = sg;
        c.fillRect(-h * 1.5, by - h * 1.7, h * 3, h * 1.9);
        c.restore();
        // a four-point star on the main tip
        const tw = Math.sin(Math.PI * gp),
          r = h * 0.45 * tw;
        if (r > 0.5) {
          c.save();
          c.translate(0, by - h * 1.5);
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = `rgba(255,250,225,${0.9 * tw})`;
          c.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4,
              rad = k % 2 ? r * 0.16 : r;
            c.lineTo(Math.sin(a) * rad, -Math.cos(a) * rad);
          }
          c.closePath();
          c.fill();
          c.restore();
        }
      }
      c.restore();
      break;
    }
    case 'saw': {
      c.save();
      c.rotate(ang);
      mountBar(c, -h * 0.35, -h * 0.1, h * 0.7, h, s);
      c.translate(0, -h * 0.35);
      c.rotate(ANIM * 14);
      c.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI) / 6;
        c.lineTo(Math.cos(a) * h * 0.8, Math.sin(a) * h * 0.8);
        c.lineTo(Math.cos(a + 0.26) * h * 0.58, Math.sin(a + 0.26) * h * 0.58);
      }
      c.closePath();
      c.fillStyle = '#d6dbdf';
      c.fill();
      c.strokeStyle = '#6f777e';
      c.lineWidth = s * 0.03;
      c.stroke();
      circ(c, 0, 0, h * 0.16, '#2b2f33');
      c.restore();
      break;
    }
    case 'chain': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.4, -h * 0.1, h * 0.8, h * 0.95, s * 0.05);
      c.fillStyle = '#d36a1f';
      c.fill();
      rr(c, -h * 0.22, -h * 1.3, h * 0.44, h * 1.3, h * 0.2);
      c.fillStyle = '#9aa3ab';
      c.fill();
      c.fillStyle = '#2b2f33';
      for (let i = 0; i < 6; i++) {
        const y = -h * 1.2 + ((i * h * 0.2 + ANIM * 80) % (h * 1.1));
        c.fillRect(-h * 0.3, y, h * 0.08, h * 0.08);
        c.fillRect(h * 0.22, y, h * 0.08, h * 0.08);
      }
      c.restore();
      break;
    }
    case 'drill': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.55, -h * 0.05, h * 1.1, h * 0.9, s * 0.06);
      c.fillStyle = '#4a5056';
      c.fill();
      c.beginPath();
      c.moveTo(-h * 0.45, -h * 0.05);
      c.lineTo(0, -h * 1.15);
      c.lineTo(h * 0.45, -h * 0.05);
      c.closePath();
      c.fillStyle = '#b8a46a';
      c.fill();
      c.strokeStyle = '#6a5a2a';
      c.lineWidth = s * 0.04;
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const y = -h * 0.15 - ((i * h * 0.25 + ANIM * 60) % (h * 0.9)),
          w = h * 0.45 * (1 - (-y - h * 0.05) / (h * 1.1));
        c.moveTo(-w, y + h * 0.08);
        c.lineTo(w, y - h * 0.08);
      }
      c.stroke();
      c.restore();
      break;
    }
    case 'hammer': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.45, -h * 0.1, h * 0.9, h, s * 0.05);
      c.fillStyle = '#4a5056';
      c.fill();
      const e = (st.punch || 0) > 0 ? h * 0.3 : 0;
      c.fillStyle = '#8a9299';
      c.fillRect(-h * 0.12, -h * 0.6 - e, h * 0.24, h * 0.6 + e);
      rr(c, -h * 0.72, -h * 1.02 - e, h * 1.44, h * 0.44, s * 0.04);
      c.fillStyle = '#5d656c';
      c.fill();
      c.strokeStyle = '#2b2f33';
      c.lineWidth = s * 0.04;
      c.stroke();
      c.restore();
      break;
    }
    case 'lance': {
      c.save();
      c.rotate(ang);
      const len = L * s;
      rr(c, -h * 0.5, len / 2 - h * 0.9, h, h * 0.8, s * 0.06);
      c.fillStyle = '#4a5056';
      c.fill();
      const g = c.createLinearGradient(-h * 0.3, 0, h * 0.3, 0);
      g.addColorStop(0, '#7c848b');
      g.addColorStop(0.5, '#e6eaed');
      g.addColorStop(1, '#6f777e');
      c.beginPath();
      c.moveTo(-h * 0.32, len / 2 - h * 0.9);
      c.lineTo(-h * 0.18, -len / 2 + h * 0.4);
      c.lineTo(0, -len / 2 - h * 0.25);
      c.lineTo(h * 0.18, -len / 2 + h * 0.4);
      c.lineTo(h * 0.32, len / 2 - h * 0.9);
      c.closePath();
      c.fillStyle = g;
      c.fill();
      for (let i = 0; i < 3; i++)
        line(
          c,
          [-h * 0.28, len / 2 - h * 1.1 - i * h * 0.5, h * 0.28, len / 2 - h * 1.1 - i * h * 0.5],
          '#c0392b',
          s * 0.04
        );
      c.restore();
      break;
    }
    case 'jaws': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.6, -h * 0.05, h * 1.2, h * 0.9, s * 0.06);
      c.fillStyle = '#4a5056';
      c.fill();
      const o = Math.sin(ANIM * 3) * 0.12 + ((st.punch || 0) > 0 ? -0.2 : 0);
      for (const sd of [-1, 1]) {
        c.beginPath();
        c.moveTo(sd * h * 0.5, 0);
        c.quadraticCurveTo(sd * h * (0.95 + o), -h * 0.6, sd * h * 0.15, -h);
        c.lineTo(sd * h * 0.2, -h * 0.75);
        c.quadraticCurveTo(sd * h * 0.6, -h * 0.45, sd * h * 0.25, 0);
        c.closePath();
        c.fillStyle = '#b8bec3';
        c.fill();
        c.strokeStyle = '#4a5056';
        c.lineWidth = s * 0.03;
        c.stroke();
      }
      c.restore();
      break;
    }
    case 'grinder': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.6, -h * 0.05, h * 1.2, h * 0.9, s * 0.06);
      c.fillStyle = '#4a5056';
      c.fill();
      rr(c, -h, -h * 0.95, h * 2, h * 0.7, h * 0.3);
      c.fillStyle = '#5d656c';
      c.fill();
      c.save();
      rr(c, -h, -h * 0.95, h * 2, h * 0.7, h * 0.3);
      c.clip();
      c.fillStyle = '#dfe3e6';
      for (let i = -6; i <= 6; i++) {
        const x = i * h * 0.3 + ((ANIM * 120) % (h * 0.3));
        c.beginPath();
        c.moveTo(x, -h * 0.95);
        c.lineTo(x + h * 0.12, -h * 0.6);
        c.lineTo(x - h * 0.12, -h * 0.25);
        c.lineTo(x - h * 0.04, -h * 0.6);
        c.closePath();
        c.fill();
      }
      c.restore();
      c.restore();
      break;
    }
    case 'plate': {
      if (st.hull && A.p !== 'tires') return plateOnHull(c, A, s, h, ang, st);
      const col = A.c,
        dk = mix(col, -0.4),
        lt = mix(col, 0.3);
      if (A.p === 'tires') {
        bevel(c, h * 0.94, '#3a3c40', s * 0.08);
        circ(c, -h * 0.38, 0, h * 0.48, '#1a1b1d', '#45484d', s * 0.07);
        circ(c, h * 0.38, 0, h * 0.48, '#1a1b1d', '#45484d', s * 0.07);
        break;
      }
      bevel(c, h * 0.97, col, s * 0.08);
      c.save();
      c.rotate(ang);
      if (A.p === 'bolts') {
        line(c, [-h * 0.5, h * 0.1, h * 0.1, -h * 0.5], lt, s * 0.05);
        line(c, [-h * 0.1, h * 0.5, h * 0.5, -h * 0.1], lt, s * 0.05);
        bolts(c, h, s, dk);
      } else if (A.p === 'heavy') {
        rr(c, -h * 0.7, -h * 0.7, h * 1.4, h * 1.4, s * 0.05);
        c.strokeStyle = dk;
        c.lineWidth = s * 0.1;
        c.stroke();
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) circ(c, i * h * 0.75, j * h * 0.75, s * 0.04, lt);
      } else if (A.p === 'slope') {
        c.beginPath();
        c.moveTo(-h * 0.85, h * 0.35);
        c.lineTo(0, -h * 0.7);
        c.lineTo(h * 0.85, h * 0.35);
        c.lineTo(h * 0.85, -h * 0.05);
        c.lineTo(0, -h * 0.97);
        c.lineTo(-h * 0.85, -h * 0.05);
        c.closePath();
        c.fillStyle = lt;
        c.fill();
        bolts(c, h, s, dk);
      } else if (A.p === 'reactive') {
        for (const [x, y] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1]
        ]) {
          rr(c, x * h * 0.45 - h * 0.38, y * h * 0.45 - h * 0.38, h * 0.76, h * 0.76, 2);
          c.fillStyle = lt;
          c.fill();
          c.strokeStyle = dk;
          c.lineWidth = s * 0.04;
          c.stroke();
          circ(c, x * h * 0.45, y * h * 0.45, s * 0.05, '#f2b705');
        }
      } else if (A.p === 'tile') {
        c.strokeStyle = dk;
        c.lineWidth = s * 0.05;
        c.beginPath();
        c.moveTo(0, -h * 0.9);
        c.lineTo(0, h * 0.9);
        c.moveTo(-h * 0.9, 0);
        c.lineTo(h * 0.9, 0);
        c.stroke();
        c.globalAlpha = 0.6;
        c.fillStyle = '#ffcf8a';
        c.beginPath();
        c.moveTo(0, -h * 0.42);
        c.quadraticCurveTo(h * 0.3, 0, 0, h * 0.4);
        c.quadraticCurveTo(-h * 0.3, 0, 0, -h * 0.42);
        c.fill();
        c.globalAlpha = 1;
      } else if (A.p === 'spikes') {
        c.fillStyle = '#e6eaed';
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) {
            c.beginPath();
            c.moveTo(i * h * 0.55 - h * 0.12, j * h * 0.55 + h * 0.1);
            c.lineTo(i * h * 0.55, j * h * 0.55 - h * 0.2);
            c.lineTo(i * h * 0.55 + h * 0.12, j * h * 0.55 + h * 0.1);
            c.fill();
          }
      }
      c.restore();
      break;
    }
    case 'bumper': {
      bevel(c, h * 0.8, '#4c565f', s * 0.08);
      c.save();
      c.rotate(ang);
      rr(c, -h, -h, h * 2, h * 0.75, h * 0.36);
      c.fillStyle = '#1b1c1e';
      c.fill();
      c.save();
      c.clip();
      c.fillStyle = '#f2b705';
      for (let i = -4; i < 4; i++) c.fillRect(i * h * 0.5, -h, h * 0.22, h * 0.75);
      c.restore();
      c.restore();
      break;
    }
    case 'screen': {
      c.strokeStyle = '#c9ced3';
      c.lineWidth = s * 0.035;
      c.beginPath();
      for (let i = -3; i <= 3; i++) {
        c.moveTo(i * h * 0.26, -h * 0.9);
        c.lineTo(i * h * 0.26, h * 0.9);
        c.moveTo(-h * 0.9, i * h * 0.26);
        c.lineTo(h * 0.9, i * h * 0.26);
      }
      c.stroke();
      rr(c, -h * 0.95, -h * 0.95, h * 1.9, h * 1.9, s * 0.04);
      c.strokeStyle = '#596168';
      c.lineWidth = s * 0.08;
      c.stroke();
      break;
    }
    case 'smoke': {
      for (const x of [-0.4, 0, 0.4]) circ(c, x * h, 0, h * 0.2, '#2b2f33', '#8a9299', s * 0.04);
      break;
    }
    case 'decoy': {
      rr(c, -h * 0.42, -h * 0.58, h * 0.84, h * 1.16, h * 0.25);
      c.fillStyle = '#2b3a48';
      c.fill();
      rr(c, -h * 0.26, -h * 0.36, h * 0.52, h * 0.72, 3);
      c.strokeStyle = '#7fe0ff';
      c.lineWidth = s * 0.04;
      c.stroke();
      break;
    }
    case 'pd': {
      c.save();
      c.rotate(st.pa || 0);
      c.fillStyle = '#1c2024';
      for (const y of [-0.16, 0.16]) c.fillRect(0, y * h - h * 0.05, h * 0.9, h * 0.1);
      c.restore();
      gradCirc(c, h * 0.4, '#5b6670');
      circ(c, 0, 0, h * 0.13, '#e2504a');
      break;
    }
    case 'shield': {
      c.save();
      c.rotate(ang);
      c.beginPath();
      c.arc(0, h * 0.4, h * 1.15, -Math.PI * 0.78, -Math.PI * 0.22);
      c.strokeStyle = st.down ? 'rgba(120,190,255,.25)' : 'rgba(120,190,255,.9)';
      c.lineWidth = s * 0.07;
      c.stroke();
      c.restore();
      const g = c.createRadialGradient(-h * 0.2, -h * 0.2, h * 0.05, 0, 0, h * 0.55);
      g.addColorStop(0, '#e6f6ff');
      g.addColorStop(1, '#3a78c9');
      circ(c, 0, 0, h * 0.46, g, '#1f3f6a', s * 0.04);
      break;
    }
    case 'ammo': {
      bevel(c, h * 0.88, '#5a5a3a', s * 0.08);
      for (const x of [-0.5, -0.17, 0.17, 0.5]) {
        rr(c, x * h - h * 0.12, -h * 0.55, h * 0.24, h * 1.1, h * 0.1);
        c.fillStyle = '#c9a43a';
        c.fill();
        c.fillStyle = '#8a6a2a';
        c.fillRect(x * h - h * 0.12, h * 0.3, h * 0.24, h * 0.25);
      }
      break;
    }
    case 'radar': {
      c.save();
      c.rotate(ANIM * 1.5);
      c.beginPath();
      c.ellipse(0, 0, h * 0.66, h * 0.28, 0, 0, 7);
      c.fillStyle = '#c9d4dc';
      c.fill();
      c.strokeStyle = '#6f7a84';
      c.lineWidth = s * 0.04;
      c.stroke();
      line(c, [0, 0, h * 0.5, 0], '#2b2f33', s * 0.05);
      c.restore();
      circ(c, 0, 0, h * 0.1, '#e2504a');
      break;
    }
    case 'coolant': {
      for (let i = -2; i <= 2; i++) {
        c.fillStyle = i % 2 ? '#9fd8f0' : '#6cb4d6';
        c.fillRect(-h * 0.55, i * h * 0.22 - h * 0.07, h * 1.1, h * 0.14);
      }
      break;
    }
    case 'sensor': {
      gradCirc(c, h * 0.5, '#2b3a48');
      circ(c, 0, 0, h * 0.28, 'rgba(226,80,74,.35)');
      line(c, [-h * 0.5, 0, h * 0.5, 0], '#e2504a', s * 0.03);
      line(c, [0, -h * 0.5, 0, h * 0.5], '#e2504a', s * 0.03);
      break;
    }
    case 'pusher': {
      bevel(c, h * 0.8, '#4c565f', s * 0.08);
      c.save();
      c.rotate(ang);
      c.fillStyle = '#6f777e';
      c.fillRect(-h * 0.12, -h * 0.6, h * 0.24, h * 0.9);
      c.beginPath();
      c.moveTo(-h * 1.05, -h * 0.55);
      c.quadraticCurveTo(0, -h * 1.25, h * 1.05, -h * 0.55);
      c.lineTo(h * 1.05, -h * 0.85);
      c.quadraticCurveTo(0, -h * 1.55, -h * 1.05, -h * 0.85);
      c.closePath();
      c.fillStyle = '#f2b705';
      c.fill();
      c.strokeStyle = '#5a4a10';
      c.lineWidth = s * 0.04;
      c.stroke();
      c.restore();
      break;
    }
    case 'selfright': {
      bevel(c, h * 0.88, '#45524b', s * 0.08);
      line(c, [-h * 0.55, h * 0.45, -h * 0.1, -h * 0.2, h * 0.55, -h * 0.45], '#c9ced3', s * 0.1);
      circ(c, -h * 0.1, -h * 0.2, h * 0.14, '#f2b705');
      circ(c, -h * 0.55, h * 0.45, h * 0.14, '#8a9299');
      break;
    }
    case 'repairarm': {
      c.save();
      c.rotate(ANIM * 0.5);
      line(c, [0, 0, h * 0.5, -h * 0.3, h * 0.2, -h * 0.7], '#c9ced3', s * 0.09);
      circ(c, 0, 0, h * 0.2, '#5cc38f');
      circ(c, h * 0.2, -h * 0.7, h * 0.13, '#f2b705');
      c.restore();
      break;
    }
    case 'recycler': {
      c.save();
      c.rotate(ANIM);
      c.strokeStyle = '#5cc38f';
      c.lineWidth = s * 0.08;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(0, 0, h * 0.42, k * 2.09 + 0.2, k * 2.09 + 1.6);
        c.stroke();
      }
      c.restore();
      circ(c, 0, 0, h * 0.14, '#ffd257');
      break;
    }
    case 'jammer': {
      line(c, [0, h * 0.45, 0, -h * 0.55], '#c9ced3', s * 0.07);
      circ(c, 0, -h * 0.55, h * 0.1, '#e2504a');
      for (let i = 1; i <= 2; i++) {
        c.beginPath();
        c.arc(0, -h * 0.55, h * 0.24 * i, -2.4, -0.74);
        c.strokeStyle = 'rgba(197,139,255,.85)';
        c.lineWidth = s * 0.04;
        c.stroke();
      }
      break;
    }
    case 'magnet': {
      c.beginPath();
      c.arc(0, h * 0.1, h * 0.42, 0, Math.PI);
      c.lineWidth = h * 0.28;
      c.strokeStyle = '#c0392b';
      c.stroke();
      c.fillStyle = '#c0392b';
      c.fillRect(-h * 0.56, -h * 0.5, h * 0.28, h * 0.6);
      c.fillRect(h * 0.28, -h * 0.5, h * 0.28, h * 0.6);
      c.fillStyle = '#d6dbdf';
      c.fillRect(-h * 0.56, -h * 0.64, h * 0.28, h * 0.18);
      c.fillRect(h * 0.28, -h * 0.64, h * 0.28, h * 0.18);
      break;
    }
    case 'chip': {
      bevel(c, h * 0.88, '#3a2f4a', s * 0.08);
      c.fillStyle = '#c9a43a';
      for (let i = -2; i <= 2; i++) {
        c.fillRect(i * h * 0.24 - h * 0.04, -h * 0.82, h * 0.08, h * 0.22);
        c.fillRect(i * h * 0.24 - h * 0.04, h * 0.6, h * 0.08, h * 0.22);
        c.fillRect(-h * 0.82, i * h * 0.24 - h * 0.04, h * 0.22, h * 0.08);
        c.fillRect(h * 0.6, i * h * 0.24 - h * 0.04, h * 0.22, h * 0.08);
      }
      rr(c, -h * 0.55, -h * 0.55, h * 1.1, h * 1.1, s * 0.04);
      c.fillStyle = '#1d1a24';
      c.fill();
      const g = c.createRadialGradient(0, 0, 0, 0, 0, h * 0.4);
      g.addColorStop(0, '#ffd27a');
      g.addColorStop(1, 'rgba(245,165,36,0)');
      circ(c, 0, 0, h * 0.4, g);
      break;
    }
    case 'chute': {
      rr(c, -h * 0.6, -h * 0.5, h * 1.2, h * 1, h * 0.25);
      c.fillStyle = '#e2504a';
      c.fill();
      c.save();
      c.beginPath();
      rr(c, -h * 0.6, -h * 0.5, h * 1.2, h * 1, h * 0.25);
      c.clip();
      c.fillStyle = '#ece8df';
      for (let i = -2; i <= 2; i += 2) c.fillRect(i * h * 0.24 - h * 0.12, -h * 0.5, h * 0.24, h);
      c.restore();
      line(c, [-h * 0.5, h * 0.5, 0, h * 0.85, h * 0.5, h * 0.5], '#3a3f44', s * 0.04);
      break;
    }
    case 'banana': {
      c.save();
      c.rotate(ang);
      c.beginPath();
      c.arc(0, h * 0.55, h * 0.8, -Math.PI * 0.85, -Math.PI * 0.15);
      c.lineWidth = h * 0.32;
      c.strokeStyle = '#f2d03c';
      c.stroke();
      c.beginPath();
      c.arc(0, h * 0.55, h * 0.8, -Math.PI * 0.85, -Math.PI * 0.15);
      c.lineWidth = h * 0.06;
      c.strokeStyle = '#a8861a';
      c.stroke();
      circ(c, -h * 0.64, h * 0.1, h * 0.08, '#5a4410');
      c.restore();
      break;
    }
    case 'mine': {
      gradCirc(c, h * 0.6, '#4f5a3a');
      for (let k = 0; k < 6; k++) {
        c.save();
        c.rotate((k * Math.PI) / 3);
        c.fillStyle = '#2b2f33';
        c.fillRect(-h * 0.06, -h * 0.82, h * 0.12, h * 0.24);
        c.restore();
      }
      circ(c, 0, 0, h * 0.16, Math.sin(ANIM * 6) > 0 ? '#ff4d4d' : '#7a1e18');
      break;
    }
    case 'bombbay': {
      bevel(c, h * 0.88, '#3d4247', s * 0.08);
      rr(c, -h * 0.6, -h * 0.6, h * 1.2, h * 1.2, s * 0.05);
      c.fillStyle = '#1b1e21';
      c.fill();
      for (const x of [-0.3, 0.3])
        for (const y of [-0.3, 0.3]) circ(c, x * h, y * h, h * 0.18, '#5a5f52', '#14171a', s * 0.03);
      c.strokeStyle = '#f2b705';
      c.lineWidth = s * 0.04;
      c.strokeRect(-h * 0.6, -h * 0.6, h * 1.2, h * 1.2);
      break;
    }
    case 'bowl': {
      c.save();
      c.rotate(ang);
      rr(c, -h * 0.55, -h * 0.2, h * 1.1, h * 0.9, s * 0.06);
      c.fillStyle = '#3a3f44';
      c.fill();
      rr(c, -h * 0.32, -h * 1.05, h * 0.64, h * 0.95, h * 0.12);
      c.fillStyle = '#2b2f33';
      c.fill();
      c.restore();
      gradCirc(c, h * 0.42, '#2a3a8a');
      for (const [x, y] of [
        [-0.12, -0.14],
        [0.1, -0.18],
        [0, 0.02]
      ])
        circ(c, x * h, y * h, h * 0.06, '#0e1430');
      break;
    }
    case 'flare': {
      const fl = A.v === 'flash';
      rr(c, -h * 0.62, -h * 0.5, h * 1.24, h, s * 0.06);
      c.fillStyle = fl ? '#d6dbdf' : '#5a3d2a';
      c.fill();
      for (const x of [-0.36, 0, 0.36])
        circ(c, x * h, 0, h * 0.14, fl ? '#ffffff' : '#ff7a2a', fl ? '#8a9299' : '#2b1a10', s * 0.03);
      break;
    }
    case 'bubble': {
      const g = c.createRadialGradient(-h * 0.2, -h * 0.2, h * 0.05, 0, 0, h * 0.75);
      g.addColorStop(0, 'rgba(220,245,255,.95)');
      g.addColorStop(1, st.down ? 'rgba(120,190,255,.15)' : 'rgba(120,190,255,.55)');
      circ(c, 0, 0, h * 0.7, g, '#9fd8ff', s * 0.04);
      circ(
        c,
        0,
        0,
        h * 0.9 * (1 + Math.sin(ANIM * 3) * 0.04),
        null,
        st.down ? 'rgba(159,216,255,.2)' : 'rgba(159,216,255,.7)',
        s * 0.03
      );
      break;
    }
    case 'emp': {
      gradCirc(c, h * 0.55, '#2b3a48');
      for (let i = 0; i < 3; i++) {
        const r = h * (0.2 + ((ANIM * 1.2 + i / 3) % 1) * 0.6);
        circ(c, 0, 0, r, null, `rgba(127,224,255,${0.9 - r / h})`, s * 0.04);
      }
      circ(c, 0, 0, h * 0.14, '#e6faff');
      break;
    }
    case 'medic': {
      rr(c, -h * 0.62, -h * 0.62, h * 1.24, h * 1.24, h * 0.2);
      c.fillStyle = '#e9ecee';
      c.fill();
      c.strokeStyle = '#1b1e21';
      c.lineWidth = s * 0.04;
      c.stroke();
      c.fillStyle = '#5cc38f';
      c.fillRect(-h * 0.14, -h * 0.42, h * 0.28, h * 0.84);
      c.fillRect(-h * 0.42, -h * 0.14, h * 0.84, h * 0.28);
      break;
    }
    case 'horseshoe': {
      c.beginPath();
      c.arc(0, -h * 0.05, h * 0.42, Math.PI * 0.15, Math.PI * 0.85, true);
      c.lineWidth = h * 0.24;
      c.strokeStyle = '#e8b830';
      c.stroke();
      for (const a of [0.4, 1.1, 1.6, 2.1, 2.75])
        circ(c, Math.cos(a + Math.PI) * h * 0.42, -h * 0.05 + Math.sin(a + Math.PI) * h * 0.42, h * 0.05, '#7a5a08');
      break;
    }
  }
}
const JUNKDRAW = {
  duck: (c, r, col = '#f6d33c') => {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(-r * 0.15, 0, r * 0.9, r * 0.7, 0, 0, 7);
    c.fill();
    circ(c, r * 0.45, 0, r * 0.45, col);
    c.fillStyle = '#f08a24';
    c.beginPath();
    c.moveTo(r * 0.8, -r * 0.12);
    c.lineTo(r * 1.15, 0);
    c.lineTo(r * 0.8, r * 0.12);
    c.fill();
    circ(c, r * 0.55, -r * 0.18, r * 0.08, '#111');
    circ(c, r * 0.55, r * 0.18, r * 0.08, '#111');
  },
  goldduck: (c, r) => {
    JUNKDRAW.duck(c, r, '#ffd257');
    circ(c, -r * 0.2, -r * 0.2, r * 0.15, 'rgba(255,255,255,.7)');
  },
  couch: (c, r) => {
    rr(c, -r, -r * 0.6, r * 2, r * 1.2, r * 0.2);
    c.fillStyle = '#8a3b2e';
    c.fill();
    c.fillStyle = '#a5483a';
    rr(c, -r * 0.75, -r * 0.3, r * 0.72, r * 0.8, 4);
    c.fill();
    rr(c, r * 0.03, -r * 0.3, r * 0.72, r * 0.8, 4);
    c.fill();
    c.fillStyle = '#6e2e24';
    c.fillRect(-r, -r * 0.6, r * 2, r * 0.3);
  },
  piano: (c, r) => {
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, r * 0.15);
    c.fillStyle = '#16171a';
    c.fill();
    c.fillStyle = '#f2efe8';
    c.fillRect(-r * 0.9, r * 0.25, r * 1.8, r * 0.35);
    c.fillStyle = '#16171a';
    for (let i = 0; i < 8; i++) c.fillRect(-r * 0.85 + i * r * 0.23, r * 0.25, r * 0.08, r * 0.2);
  },
  fridge: (c, r) => {
    rr(c, -r * 0.8, -r, r * 1.6, r * 2, r * 0.2);
    c.fillStyle = '#e9eef0';
    c.fill();
    c.strokeStyle = '#9aa3ab';
    c.lineWidth = 2;
    c.stroke();
    line(c, [-r * 0.8, -r * 0.2, r * 0.8, -r * 0.2], '#9aa3ab', 2);
    c.fillStyle = '#6f777e';
    c.fillRect(r * 0.5, -r * 0.8, r * 0.12, r * 0.45);
    circ(c, -r * 0.3, r * 0.4, r * 0.12, '#e2504a');
  },
  bathtub: (c, r) => {
    rr(c, -r, -r * 0.6, r * 2, r * 1.2, r * 0.55);
    c.fillStyle = '#f2efe8';
    c.fill();
    rr(c, -r * 0.78, -r * 0.4, r * 1.56, r * 0.8, r * 0.4);
    c.fillStyle = '#7fc7e6';
    c.fill();
    circ(c, r * 0.4, -r * 0.1, r * 0.15, '#f6d33c');
  },
  cart: (c, r) => {
    rr(c, -r * 0.8, -r * 0.75, r * 1.6, r * 1.5, 3);
    c.fillStyle = 'rgba(180,190,200,.25)';
    c.fill();
    c.strokeStyle = '#b8c0c6';
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    for (let i = -2; i <= 2; i++) {
      c.moveTo(i * r * 0.3, -r * 0.75);
      c.lineTo(i * r * 0.3, r * 0.75);
    }
    c.lineWidth = 1;
    c.stroke();
    line(c, [-r * 0.9, r * 0.75, r * 0.9, r * 0.75], '#e2504a', 3);
  },
  cone: (c, r) => {
    circ(c, 0, 0, r, '#f07a1f');
    circ(c, 0, 0, r * 0.6, '#f2efe8');
    circ(c, 0, 0, r * 0.35, '#f07a1f');
  },
  vending: (c, r) => {
    rr(c, -r * 0.9, -r, r * 1.8, r * 2, 4);
    c.fillStyle = '#c0392b';
    c.fill();
    c.fillStyle = '#1d2a33';
    c.fillRect(-r * 0.7, -r * 0.8, r * 0.9, r * 1.3);
    c.fillStyle = '#f2b705';
    for (let i = 0; i < 4; i++)
      c.fillRect(-r * 0.6 + (i % 2) * r * 0.4, -r * 0.7 + Math.floor(i / 2) * r * 0.5, r * 0.25, r * 0.3);
  },
  donut: (c, r) => {
    circ(c, 0, 0, r, '#d8a05a');
    circ(c, 0, 0, r * 0.85, '#ff8fc7');
    for (let i = 0; i < 12; i++) {
      const a = i * 0.52,
        q = r * (0.5 + ((i * 7) % 3) * 0.1);
      c.fillStyle = ['#fff', '#5cc38f', '#4ea1ff', '#f2b705'][i % 4];
      c.fillRect(Math.cos(a) * q - 2, Math.sin(a) * q - 1, 4, 2);
    }
    circ(c, 0, 0, r * 0.32, '#3a2f24');
  },
  toilet: (c, r) => {
    c.fillStyle = '#f2efe8';
    c.fillRect(-r * 0.9, -r, r * 1.8, r * 0.6);
    c.beginPath();
    c.ellipse(0, r * 0.25, r * 0.75, r * 0.8, 0, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(0, r * 0.3, r * 0.45, r * 0.5, 0, 0, 7);
    c.fillStyle = '#bfe2f0';
    c.fill();
  },
  gnome: (c, r) => {
    circ(c, 0, r * 0.2, r * 0.8, '#ece8df');
    circ(c, 0, -r * 0.1, r * 0.7, '#d6463e');
    circ(c, 0, -r * 0.1, r * 0.25, '#a8302a');
    circ(c, r * 0.4, r * 0.5, r * 0.18, '#f2c7a0');
  },
  washer: (c, r) => {
    rr(c, -r, -r, r * 2, r * 2, 4);
    c.fillStyle = '#e9eef0';
    c.fill();
    circ(c, 0, r * 0.1, r * 0.6, '#6f8fa0', '#c9ced3', 3);
  },
  flamingo: (c, r) => {
    circ(c, 0, 0, r, '#ff6fae');
    circ(c, 0, 0, r * 0.45, '#3a2f24');
    c.fillStyle = '#ff6fae';
    c.beginPath();
    c.moveTo(r * 0.6, -r * 0.6);
    c.quadraticCurveTo(r * 1.3, -r * 1.2, r * 0.9, -r * 1.4);
    c.lineTo(r * 0.8, -r * 1.2);
    c.quadraticCurveTo(r, -r * 0.9, r * 0.4, -r * 0.5);
    c.fill();
  },
  pin: (c, r) => {
    circ(c, 0, 0, r, '#f2efe8', '#c9ced3', 1.5);
    circ(c, 0, 0, r * 0.6, null, '#d6463e', 2.5);
    circ(c, 0, 0, r * 0.25, '#f2efe8');
  },
  beachball: (c, r) => {
    const cols = ['#e2504a', '#f2efe8', '#4ea1ff', '#f2b705', '#f2efe8', '#5cc38f'];
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r, i * 1.047, (i + 1) * 1.047);
      c.closePath();
      c.fillStyle = cols[i];
      c.fill();
    }
  },
  tv: (c, r) => {
    rr(c, -r, -r * 0.75, r * 2, r * 1.5, 4);
    c.fillStyle = '#3a2f24';
    c.fill();
    rr(c, -r * 0.8, -r * 0.55, r * 1.25, r * 1.1, 6);
    c.fillStyle = '#2d3e33';
    c.fill();
    line(c, [0, -r * 0.75, -r * 0.5, -r * 1.4], '#9aa3ab', 1.5);
    line(c, [0, -r * 0.75, r * 0.5, -r * 1.4], '#9aa3ab', 1.5);
  },
  hay: (c, r) => {
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, 4);
    c.fillStyle = '#d8b25a';
    c.fill();
    c.strokeStyle = '#a8823a';
    c.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(-r, i * r * 0.2);
      c.lineTo(r, i * r * 0.2 + 2);
      c.stroke();
    }
    line(c, [-r * 0.4, -r * 0.7, -r * 0.4, r * 0.7], '#8a3b2e', 2);
    line(c, [r * 0.4, -r * 0.7, r * 0.4, r * 0.7], '#8a3b2e', 2);
  },
  potty: (c, r) => {
    rr(c, -r * 0.85, -r, r * 1.7, r * 2, 4);
    c.fillStyle = '#3a8a5a';
    c.fill();
    c.fillStyle = '#2a6a42';
    c.fillRect(-r * 0.85, -r, r * 1.7, r * 0.35);
    circ(c, r * 0.45, r * 0.2, r * 0.1, '#ece8df');
  },
  booth: (c, r) => {
    rr(c, -r * 0.85, -r, r * 1.7, r * 2, 3);
    c.fillStyle = '#c0392b';
    c.fill();
    c.fillStyle = 'rgba(180,220,240,.5)';
    for (let i = 0; i < 3; i++) c.fillRect(-r * 0.6, -r * 0.75 + i * r * 0.55, r * 1.2, r * 0.4);
  },
  mattress: (c, r) => {
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, r * 0.3);
    c.fillStyle = '#e8e2f0';
    c.fill();
    c.fillStyle = '#b8a8d0';
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) circ(c, i * r * 0.4, j * r * 0.4, 1.6, '#b8a8d0');
  },
  mower: (c, r) => {
    rr(c, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, 4);
    c.fillStyle = '#3a8a3a';
    c.fill();
    circ(c, 0, 0, r * 0.45, '#2b2f33');
    line(c, [-r * 0.5, r * 0.8, -r * 0.5, r * 1.5, r * 0.5, r * 1.5, r * 0.5, r * 0.8], '#9aa3ab', 2);
  },
  chair: (c, r) => {
    c.save();
    c.rotate(ANIM * 2);
    for (let k = 0; k < 5; k++) {
      c.save();
      c.rotate(k * 1.257);
      line(c, [0, 0, r * 0.95, 0], '#2b2f33', 3);
      circ(c, r * 0.95, 0, 2.5, '#111');
      c.restore();
    }
    c.restore();
    circ(c, 0, 0, r * 0.6, '#3a4a6a');
  },
  arcade: (c, r) => {
    rr(c, -r * 0.9, -r, r * 1.8, r * 2, 3);
    c.fillStyle = '#2a1f4a';
    c.fill();
    c.fillStyle = `hsl(${(ANIM * 120) % 360},80%,60%)`;
    c.fillRect(-r * 0.6, -r * 0.7, r * 1.2, r * 0.7);
    circ(c, -r * 0.3, r * 0.45, r * 0.12, '#e2504a');
    circ(c, r * 0.25, r * 0.45, r * 0.1, '#f2b705');
  },
  chicken: (c, r) => {
    c.fillStyle = '#f6e04a';
    c.beginPath();
    c.ellipse(0, 0, r, r * 0.4, 0, 0, 7);
    c.fill();
    circ(c, r * 0.9, 0, r * 0.3, '#f6e04a');
    c.fillStyle = '#e2504a';
    c.fillRect(r * 0.85, -r * 0.45, r * 0.15, r * 0.2);
  },
  snowman: (c, r) => {
    circ(c, 0, 0, r, '#f4f8fb', '#c9d4dc', 1.5);
    circ(c, 0, 0, r * 0.6, '#ffffff');
    circ(c, 0, 0, r * 0.3, '#1d1d1d');
    c.fillStyle = '#f07a1f';
    c.fillRect(r * 0.25, -2, r * 0.4, 4);
  },
  cactus: (c, r) => {
    circ(c, 0, 0, r, '#3a8a4a', '#2a6a3a', 2);
    for (let k = 0; k < 8; k++) {
      const a = k * 0.785;
      line(
        c,
        [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2],
        '#f2efe8',
        1
      );
    }
    circ(c, 0, 0, r * 0.25, '#ff7ab0');
  },
  pinata: (c, r) => {
    const cols = ['#ff5ad1', '#5ad1ff', '#fff07a', '#7aff9b', '#ff9a3a'];
    for (let i = 0; i < 5; i++) {
      c.fillStyle = cols[i];
      c.fillRect(-r + i * r * 0.4, -r * 0.6, r * 0.4, r * 1.2);
    }
    c.fillStyle = '#ff5ad1';
    c.beginPath();
    c.moveTo(r, -r * 0.4);
    c.lineTo(r * 1.4, -r);
    c.lineTo(r * 1.3, 0);
    c.fill();
  },
  hydrant: (c, r) => {
    circ(c, 0, 0, r, '#d6463e', '#7a1e18', 2);
    circ(c, 0, 0, r * 0.45, '#f2b705');
    c.fillStyle = '#d6463e';
    c.fillRect(-r * 1.3, -r * 0.25, r * 2.6, r * 0.5);
  },
  melon: (c, r) => {
    circ(c, 0, 0, r, '#3a8a3a');
    c.strokeStyle = '#2a5a2a';
    c.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.ellipse(0, 0, Math.abs(i) * r * 0.3 + 1, r, 0, 0, 7);
      c.stroke();
    }
  },
  pumpkin: (c, r) => {
    circ(c, 0, 0, r, '#f0841f', '#a8501a', 2);
    c.strokeStyle = '#c0661a';
    for (const a of [0.4, 0.8]) {
      c.beginPath();
      c.ellipse(0, 0, r * a, r, 0, 0, 7);
      c.stroke();
    }
    c.fillStyle = '#3a6a2a';
    c.fillRect(-2, -r - 3, 4, 6);
  },
  mailbox: (c, r) => {
    rr(c, -r, -r * 0.6, r * 2, r * 1.2, r * 0.5);
    c.fillStyle = '#4e6ac9';
    c.fill();
    c.fillStyle = '#e2504a';
    c.fillRect(r * 0.5, -r * 1.1, r * 0.2, r * 0.6);
  },
  trophy: (c, r) => {
    circ(c, 0, 0, r, '#d8a520', '#8a6a08', 2);
    circ(c, 0, 0, r * 0.55, '#ffe07a');
    circ(c, 0, 0, r * 0.2, '#d8a520');
  },
  bumpercar: (c, r) => {
    rr(c, -r, -r * 0.75, r * 2, r * 1.5, r * 0.6);
    c.fillStyle = '#1b1c1e';
    c.fill();
    rr(c, -r * 0.8, -r * 0.55, r * 1.6, r * 1.1, r * 0.4);
    c.fillStyle = '#4ea1ff';
    c.fill();
    line(c, [0, 0, 0, -r * 1.2], '#9aa3ab', 2);
    circ(c, 0, -r * 1.2, 3, '#f2b705');
  },
  crate: (c, r) => {
    bevel(c, r * 0.95, '#8a6a3a', 2);
    line(c, [-r * 0.7, -r * 0.7, r * 0.7, r * 0.7], '#5a4422', 2);
    line(c, [r * 0.7, -r * 0.7, -r * 0.7, r * 0.7], '#5a4422', 2);
  },
  barrel: (c, r) => {
    gradCirc(c, r, '#b8322a');
    circ(c, 0, 0, r * 0.65, null, '#f2b705', 2.5);
    circ(c, 0, 0, r * 0.2, '#3a1210');
  },
  tires: (c, r) => {
    for (let k = 0; k < 3; k++) circ(c, 0, -k * 2, r - k * 2, '#1a1b1d', '#3e4146', 3);
    circ(c, 0, -4, r * 0.4, '#5b4935');
  },
  barrier: (c, r) => {
    rr(c, -r * 1.25, -r * 0.5, r * 2.5, r, 4);
    const g = c.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
    g.addColorStop(0, '#c9ccc6');
    g.addColorStop(1, '#7f827e');
    c.fillStyle = g;
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = '#e2504a';
    for (let i = -4; i < 4; i++) c.fillRect(i * r * 0.6, -r * 0.5, r * 0.25, r);
    c.restore();
  },
  dummy: (c, r) => {
    rr(c, -r, -r * 0.7, r * 2, r * 1.4, 6);
    c.fillStyle = '#6f777e';
    c.fill();
    c.strokeStyle = '#3a4046';
    c.lineWidth = 2;
    c.stroke();
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        c.fillStyle = '#1b1c1e';
        c.fillRect(sx * r * 0.7 - 5, sy * r * 0.7 - 3, 10, 6);
      }
    circ(c, 0, 0, r * 0.55, '#ece8df');
    circ(c, 0, 0, r * 0.38, '#e2504a');
    circ(c, 0, 0, r * 0.2, '#ece8df');
    circ(c, 0, 0, r * 0.08, '#e2504a');
  }
};
function drawJunk(c, k, r) {
  (JUNKDRAW[k] || JUNKDRAW.crate)(c, r);
}
const _icon = {};
function iconURL(id, size = 96) {
  const k = id + size;
  if (_icon[k]) return _icon[k];
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.translate(size / 2, size / 2);
  const m = MOD[id],
    L = m.size || 1;
  const s = (size * 0.62) / Math.max(1, Math.max(shapeBounds(m).w, shapeBounds(m).h) * 0.72);
  if (m.glow) {
    c.save();
    glowDisc(c, s * 0.95, m.glow);
    c.restore();
  }
  drawModule(c, id, s, 0, 'p', { builder: 1 });
  return (_icon[k] = cv.toDataURL());
}
function junkURL(k, size = 64) {
  const kk = 'J' + k + size;
  if (_icon[kk]) return _icon[kk];
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.translate(size / 2, size / 2);
  const d = JUNK[k] || PROPS[k];
  drawJunk(c, k, size * 0.3 * Math.min(1.2, (20 / Math.max(12, d.r)) * 1.1));
  return (_icon[kk] = cv.toDataURL());
}
function crateURL() {
  if (_icon.crateBox) return _icon.crateBox;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.translate(64, 64);
  bevel(c, 44, '#8a6a3a', 6);
  line(c, [-34, -34, 34, 34], '#5a4422', 5);
  line(c, [34, -34, -34, 34], '#5a4422', 5);
  rr(c, -46, -8, 92, 16, 3);
  c.fillStyle = '#c9a43a';
  c.fill();
  c.font = '700 40px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffd257';
  c.fillText('?', 0, 2);
  return (_icon.crateBox = cv.toDataURL());
}
function drawStaticThemed(c, s, theme) {
  c.fillStyle = 'rgba(20,12,4,.35)';
  c.fillRect(s.x + 5, s.y + 6, s.w, s.h);
  if (drawWallExtra(c, s, theme)) return;
  const v = s.h > s.w;
  if (theme === 'fence') {
    c.fillStyle = '#8a5a32';
    c.fillRect(s.x, s.y, s.w, s.h);
    c.fillStyle = '#a8703f';
    const n = Math.floor((v ? s.h : s.w) / 14);
    for (let i = 0; i < n; i++) {
      if (v) c.fillRect(s.x + 3, s.y + i * 14 + 2, s.w - 6, 10);
      else c.fillRect(s.x + i * 14 + 2, s.y + 3, 10, s.h - 6);
    }
    c.strokeStyle = '#5a3a1f';
    c.lineWidth = 2;
    c.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
  } else if (theme === 'shelf') {
    c.fillStyle = '#d8dde2';
    c.fillRect(s.x, s.y, s.w, s.h);
    const cols = ['#e2504a', '#f2b705', '#4ea1ff', '#5cc38f', '#ff8fc7', '#c58bff'];
    const n = Math.floor((v ? s.h : s.w) / 12);
    for (let i = 0; i < n; i++) {
      c.fillStyle = cols[(i * 7 + Math.floor(s.x)) % cols.length];
      if (v) {
        c.fillRect(s.x + 4, s.y + i * 12 + 2, s.w / 2 - 6, 9);
        c.fillRect(s.x + s.w / 2 + 2, s.y + i * 12 + 2, s.w / 2 - 6, 9);
      } else {
        c.fillRect(s.x + i * 12 + 2, s.y + 4, 9, s.h / 2 - 6);
        c.fillRect(s.x + i * 12 + 2, s.y + s.h / 2 + 2, 9, s.h / 2 - 6);
      }
    }
    c.strokeStyle = '#6f777e';
    c.lineWidth = 2;
    c.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
  } else if (theme === 'boards') {
    c.fillStyle = '#f4f8fb';
    c.fillRect(s.x, s.y, s.w, s.h);
    c.fillStyle = '#e2504a';
    if (v) c.fillRect(s.x, s.y, s.w, 6);
    else c.fillRect(s.x, s.y, 6, s.h);
    c.strokeStyle = '#9fb6c9';
    c.lineWidth = 2;
    c.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
  } else {
    const g = c.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
    g.addColorStop(0, '#a9aca8');
    g.addColorStop(1, '#6f726e');
    c.fillStyle = g;
    c.fillRect(s.x, s.y, s.w, s.h);
    c.strokeStyle = '#4e514d';
    c.lineWidth = 2;
    c.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    c.strokeStyle = 'rgba(60,62,58,.6)';
    c.lineWidth = 1.5;
    for (let t = 40; t < (v ? s.h : s.w); t += 40) {
      c.beginPath();
      if (v) {
        c.moveTo(s.x + 2, s.y + t);
        c.lineTo(s.x + s.w - 2, s.y + t);
      } else {
        c.moveTo(s.x + t, s.y + 2);
        c.lineTo(s.x + t, s.y + s.h - 2);
      }
      c.stroke();
    }
  }
}
/* Render a design (for VS cards, blueprint thumbnails) */
function designURL(design, size, paint, livery, overlay) {
  const cells = [];
  for (const [, e] of design.base) cells.push(...footprint(e.id, e.rot, e.x, e.y));
  let x0 = 0,
    x1 = 0,
    y0 = 0,
    y1 = 0;
  for (const [x, y] of cells) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const cols = x1 - x0 + 1,
    rows = y1 - y0 + 1,
    cs = Math.min(size / cols, size / rows) * 0.92,
    cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const ox = (size - cols * cs) / 2 - x0 * cs,
    oy = (size - rows * cs) / 2 - y0 * cs;
  // one hull under every solid chassis cell, so the preview reads as one vehicle
  const hc = [],
    ax = [];
  for (const [, e] of design.base)
    for (const [x, y] of footprint(e.id, e.rot, e.x, e.y))
      if (hullPart(MOD[e.id])) hc.push({ x, y, part: e });
      else if (MOD[e.id].drive) ax.push({ x, y });
  c.save();
  c.translate(ox + cs / 2, oy + cs / 2);
  drawHull(c, hc, cs, 0, { paint, shadow: [cs * 0.08, cs * 0.12], axles: ax });
  c.restore();
  for (const [, e] of design.base) {
    const [ccx, ccy] = instCenter(e),
      onHull = hullPart(MOD[e.id]);
    c.save();
    c.translate(ox + (ccx + 0.5) * cs, oy + (ccy + 0.5) * cs);
    drawModule(c, e.id, onHull ? cs : cs * 0.96, (e.rot * Math.PI) / 2, 'p', {
      builder: 1,
      paint,
      hull: onHull,
      gx: e.x,
      gy: e.y,
      nb: onHull ? nbMask(e.x, e.y, (x, y) => (design.base.get(key(x, y)) || {}).id === e.id) : 0
    });
    c.restore();
  }
  if (livery && livery !== 'factory') {
    const cells = [],
      solid = [];
    for (const [, e] of design.base)
      if (hullPart(MOD[e.id]))
        for (const [x, y] of footprint(e.id, e.rot, e.x, e.y))
          (liveryPart(e.id) && e.id !== 'cockpit' ? cells : solid).push({ x, y });
    c.save();
    c.translate(ox + cs / 2, oy + cs / 2);
    drawLiveryHull(c, livery, paint || '#f2b705', cells, cs, y0, solid);
    c.restore();
  }
  for (const [, e] of design.top) {
    c.save();
    c.translate(ox + (e.x + 0.5) * cs, oy + (e.y + 0.5) * cs);
    drawModule(c, e.id, cs * 0.82, (e.rot * Math.PI) / 2, 'p', { builder: 1 });
    c.restore();
  }
  if (overlay) overlay(c, ox, oy, cs);
  return cv.toDataURL();
}

/* ---------- chassis parts on a hull: details only, the hull is the plate ---------- */
const hullHash = (x, y) => {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
/** A panel tinted toward the part's own colour, so special frames keep their look. */
function hullTint(c, s, col, a) {
  c.fillStyle = col;
  c.globalAlpha *= a;
  c.fillRect(-s / 2 - 0.5, -s / 2 - 0.5, s + 1, s + 1);
  c.globalAlpha /= a;
}
function frameOnHull(c, A, s, h, ang, st) {
  const col = A.c,
    dk = 'rgba(0,0,0,.34)',
    lt = 'rgba(255,255,255,.16)',
    pick = hullHash(st.gx || 0, st.gy || 0);
  if (!/^#(5|6|4)/.test(col) || A.s !== 'x') hullTint(c, s, col, A.s === 'block' ? 0.18 : 0.38);
  if (s < 12) return;
  const inset = (w, hh, rad) => {
    rr(c, -w / 2, -hh / 2, w, hh, rad);
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.fill();
    c.strokeStyle = lt;
    c.lineWidth = Math.max(0.8, s * 0.025);
    c.stroke();
  };
  if (A.s === 'x') {
    // plain scrap plating: most cells stay clean, some get a vent, a hatch or a weld scar
    if (pick < 0.22) {
      c.save();
      c.rotate(ang);
      for (let i = -1; i <= 1; i++) {
        rr(c, -h * 0.42, i * h * 0.3 - h * 0.07, h * 0.84, h * 0.14, h * 0.07);
        c.fillStyle = 'rgba(0,0,0,.42)';
        c.fill();
      }
      c.restore();
    } else if (pick < 0.36) {
      inset(h * 1.05, h * 1.05, h * 0.16);
      circ(c, h * 0.28, 0, s * 0.045, lt);
    } else if (pick < 0.46) {
      line(
        c,
        [-h * 0.5, h * 0.2, -h * 0.1, h * 0.05, h * 0.25, h * 0.32, h * 0.5, h * 0.1],
        'rgba(255,190,120,.22)',
        s * 0.035
      );
    }
  } else if (A.s === 'mesh') {
    inset(h * 1.3, h * 1.3, h * 0.14);
    c.strokeStyle = 'rgba(255,255,255,.12)';
    c.lineWidth = s * 0.03;
    c.beginPath();
    for (let i = -2; i <= 2; i++) {
      c.moveTo(i * h * 0.24, -h * 0.55);
      c.lineTo(i * h * 0.24, h * 0.55);
    }
    c.stroke();
  } else if (A.s === 'beam') {
    c.save();
    c.rotate(ang);
    c.fillStyle = lt;
    c.fillRect(-h, -h * 0.62, s, h * 0.14);
    c.fillRect(-h, h * 0.48, s, h * 0.14);
    c.fillStyle = dk;
    c.fillRect(-h * 0.08, -h * 0.42, h * 0.16, h * 0.84);
    c.restore();
  } else if (A.s === 'hub') {
    gradCirc(c, h * 0.42, col);
    circ(c, 0, 0, h * 0.13, mix(col, -0.5));
  } else if (A.s === 'block') {
    inset(h * 1.36, h * 0.62, h * 0.08);
    c.fillStyle = '#c9a43a';
    rr(c, -h * 0.32, -h * 0.1, h * 0.64, h * 0.2, 2);
    c.fill();
  } else if (A.s === 'spring') {
    inset(h * 0.8, h * 1.4, h * 0.12);
    const p = [];
    for (let i = 0; i <= 8; i++) p.push((i % 2 ? 1 : -1) * h * 0.24, -h * 0.58 + i * h * 0.145);
    line(c, p, '#c9d2da', s * 0.05);
  } else if (A.s === 'nano') {
    c.strokeStyle = 'rgba(95,227,200,.75)';
    c.lineWidth = s * 0.035;
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      c.lineTo(Math.cos(a) * h * 0.42, Math.sin(a) * h * 0.42);
    }
    c.closePath();
    c.stroke();
  }
}
/** Armour on a hull: a raised plate with chamfered corners, bolted down. Plates of the same kind
    next to each other (st.nb: up 1, right 2, down 4, left 8) join into one bigger plate. */
function plateOnHull(c, A, s, h, ang, st) {
  const col = A.c,
    nb = st.nb || 0,
    e = h * 0.86,
    ch = h * 0.24,
    U = nb & 1,
    R = nb & 2,
    D = nb & 4,
    L = nb & 8;
  // edges reach the cell border where the next plate continues
  const x0 = L ? -h - 0.5 : -e,
    x1 = R ? h + 0.5 : e,
    y0 = U ? -h - 0.5 : -e,
    y1 = D ? h + 0.5 : e;
  const cTL = !U && !L ? ch : 0,
    cTR = !U && !R ? ch : 0,
    cBR = !D && !R ? ch : 0,
    cBL = !D && !L ? ch : 0;
  const path = (ox, oy) => {
    c.beginPath();
    c.moveTo(x0 + cTL + ox, y0 + oy);
    c.lineTo(x1 - cTR + ox, y0 + oy);
    c.lineTo(x1 + ox, y0 + cTR + oy);
    c.lineTo(x1 + ox, y1 - cBR + oy);
    c.lineTo(x1 - cBR + ox, y1 + oy);
    c.lineTo(x0 + cBL + ox, y1 + oy);
    c.lineTo(x0 + ox, y1 - cBL + oy);
    c.lineTo(x0 + ox, y0 + cTL + oy);
    c.closePath();
  };
  c.fillStyle = 'rgba(0,0,0,.26)';
  path(2, 3);
  c.fill();
  const g = c.createLinearGradient(-h, -h, h, h);
  g.addColorStop(0, mix(col, 0.28));
  g.addColorStop(0.5, col);
  g.addColorStop(1, mix(col, -0.26));
  path(0, 0);
  c.fillStyle = g;
  c.fill();
  // outline only on the plate's open sides
  c.strokeStyle = mix(col, -0.55);
  c.lineWidth = Math.max(1, s * 0.045);
  c.lineCap = 'round';
  c.beginPath();
  if (!U) (c.moveTo(x0 + cTL, y0), c.lineTo(x1 - cTR, y0));
  if (!U && !R) c.lineTo(x1, y0 + cTR);
  if (!R) (c.moveTo(x1, y0 + cTR), c.lineTo(x1, y1 - cBR));
  if (!D && !R) c.lineTo(x1 - cBR, y1);
  if (!D) (c.moveTo(x1 - cBR, y1), c.lineTo(x0 + cBL, y1));
  if (!D && !L) c.lineTo(x0, y1 - cBL);
  if (!L) (c.moveTo(x0, y1 - cBL), c.lineTo(x0, y0 + cTL));
  if (!U && !L) c.lineTo(x0 + cTL, y0);
  c.stroke();
  // a light edge on top and left, where they are open
  c.strokeStyle = 'rgba(255,255,255,.28)';
  c.lineWidth = Math.max(0.8, s * 0.03);
  c.beginPath();
  if (!U) (c.moveTo(x0 + cTL + 2, y0 + 2), c.lineTo(x1 - cTR - 1, y0 + 2));
  if (!L) (c.moveTo(x0 + 2, y0 + cTL + 2), c.lineTo(x0 + 2, y1 - cBL - 1));
  c.stroke();
  if (s < 14) return;
  c.save();
  c.rotate(ang);
  if (A.p === 'slope') {
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath();
    c.moveTo(-e * 0.8, e * 0.3);
    c.lineTo(0, -e * 0.6);
    c.lineTo(e * 0.8, e * 0.3);
    c.lineTo(e * 0.8, -e * 0.05);
    c.lineTo(0, -e * 0.9);
    c.lineTo(-e * 0.8, -e * 0.05);
    c.closePath();
    c.fill();
  } else if (A.p === 'heavy') {
    rr(c, -e * 0.55, -e * 0.55, e * 1.1, e * 1.1, s * 0.04);
    c.strokeStyle = mix(col, -0.4);
    c.lineWidth = s * 0.05;
    c.stroke();
  } else if (A.p === 'reactive') {
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1]
    ]) {
      rr(c, x * e * 0.45 - e * 0.36, y * e * 0.45 - e * 0.36, e * 0.72, e * 0.72, 2);
      c.strokeStyle = mix(col, -0.5);
      c.lineWidth = s * 0.03;
      c.stroke();
      circ(c, x * e * 0.45, y * e * 0.45, s * 0.04, '#f2b705');
    }
  } else if (A.p === 'tile') {
    c.globalAlpha *= 0.55;
    c.fillStyle = '#ffcf8a';
    c.beginPath();
    c.moveTo(0, -e * 0.42);
    c.quadraticCurveTo(e * 0.3, 0, 0, e * 0.4);
    c.quadraticCurveTo(-e * 0.3, 0, 0, -e * 0.42);
    c.fill();
    c.globalAlpha /= 0.55;
  } else if (A.p === 'spikes') {
    c.fillStyle = '#e6eaed';
    for (let i = -1; i <= 1; i += 2)
      for (let j = -1; j <= 1; j += 2) {
        c.beginPath();
        c.moveTo(i * e * 0.42 - e * 0.13, j * e * 0.42 + e * 0.12);
        c.lineTo(i * e * 0.42, j * e * 0.42 - e * 0.22);
        c.lineTo(i * e * 0.42 + e * 0.13, j * e * 0.42 + e * 0.12);
        c.fill();
      }
  }
  c.restore();
  // bolts only in open corners
  c.fillStyle = mix(col, -0.5);
  for (const [a, b, open] of [
    [-1, -1, !U && !L],
    [1, -1, !U && !R],
    [-1, 1, !D && !L],
    [1, 1, !D && !R]
  ])
    if (open) {
      c.beginPath();
      c.arc(a * e * 0.68, b * e * 0.68, s * 0.04, 0, 7);
      c.fill();
    }
}

/** Art for the shape pieces (wedge, half plate, corner fillet, round bumper, beams). */
function drawShapeArt(c, m, s, ang, st) {
  const h = s / 2,
    L = m.size || 1,
    steel = (st && st.cellPaint) || '#8d99a6',
    dk = mix(steel, -0.35),
    lt = mix(steel, 0.25);
  c.save();
  c.rotate(ang);
  c.lineJoin = 'round';
  const shape = () => {
    c.beginPath();
    switch (m.art.s) {
      case 'wedge':
        c.moveTo(-h * 0.92, h * 0.92);
        c.lineTo(h * 0.92, h * 0.92);
        c.lineTo(h * 0.92, -h * 0.92);
        c.closePath();
        break;
      case 'half':
        c.rect(-h * 0.92, 0, h * 1.84, h * 0.92);
        break;
      case 'corner':
        c.moveTo(-h * 0.92, h * 0.92);
        c.lineTo(h * 0.92, h * 0.92);
        c.lineTo(h * 0.92, -h * 0.92);
        c.arc(h * 0.92, h * 0.92, h * 1.84, -Math.PI / 2, Math.PI, true);
        c.closePath();
        break;
      case 'round':
        c.arc(0, 0, h * 0.95, 0, Math.PI * 2);
        break;
      default: {
        const y0 = -h * L,
          hh = s * L;
        rr(c, -h * 0.62, y0 + h * 0.08, h * 1.24, hh - h * 0.16, h * 0.2);
      }
    }
  };
  shape();
  const g = c.createLinearGradient(-h, -h * L, h, h * L);
  g.addColorStop(0, lt);
  g.addColorStop(1, steel);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = dk;
  c.lineWidth = s * 0.06;
  c.stroke();
  if (m.art.s === 'beam') {
    for (let i = 0; i < L; i++) {
      const y = -h * L + s * (i + 0.5);
      circ(c, 0, y - h * 0.45, s * 0.06, dk);
      circ(c, 0, y + h * 0.45, s * 0.06, dk);
      line(c, [-h * 0.35, y, h * 0.35, y], dk, s * 0.04);
    }
  } else if (m.art.s === 'round') {
    circ(c, 0, 0, h * 0.55, null, dk, s * 0.05);
    circ(c, 0, 0, h * 0.18, dk);
  } else if (m.art.s === 'wedge') {
    for (let i = 1; i < 4; i++)
      line(c, [h * 0.92 - (i * h) / 2.2, h * 0.92, h * 0.92, h * 0.92 - (i * h) / 2.2], lt, s * 0.03);
  } else if (m.art.s === 'half') {
    line(c, [-h * 0.7, h * 0.45, h * 0.7, h * 0.45], dk, s * 0.04);
  }
  c.restore();
}
