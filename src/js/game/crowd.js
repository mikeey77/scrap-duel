// The show around the fight: a commentator duo, a crowd in the stands and its hype meter.
// Everything here watches the battle state (health, parts, airtime, pickups) instead of hooking the damage code,
// so it works the same offline, online (both peers comment on their own screen) and costs almost nothing.
// Crowd gifts change the match, so they only fall in offline matches.

/* ---------- the duo ---------- */
// The lines themselves live in data/commentary.js (CASTERS, CALLS, COMM_PRI); each has a recorded voice clip.
let COMM = null; // caption queue + state for the current battle
const commReset = () =>
  (COMM = { q: [], cur: null, t: 0, gap: 1.5, last: {}, used: {}, B: B, firstDone: false, idle: 0, shown: 0 });
/** Queues a call for an event. ctx is kept for callers; the lines themselves name nobody. */
function commentate(kind, ctx = {}) {
  if (!B || B.demo || B.replay || G.mode === 'sandbox' || SETTINGS.comm === false || !CALLS[kind]) return;
  if (!COMM || COMM.B !== B) commReset();
  const now = B.time || 0,
    pri = COMM_PRI[kind] || 1;
  // each kind has its own cooldown so big moments do not get drowned by small ones
  if (COMM.last[kind] && now - COMM.last[kind] < (pri >= 3 ? 4 : 9)) return;
  if (pri < 3 && (COMM.q.length || (COMM.cur && COMM.cur.pri >= pri))) return;
  COMM.last[kind] = now;
  // pick a call that was not used lately in this battle
  const opts = CALLS[kind],
    used = COMM.used[kind] || [],
    fresh = opts.map((_, i) => i).filter(i => !used.includes(i)),
    i = pick(fresh.length ? fresh : opts.map((_, i) => i));
  COMM.used[kind] = [...used, i].slice(-Math.max(1, opts.length - 1));
  const lines = opts[i].map(([who, text]) => ({ who, text, pri }));
  if (pri >= 4) {
    COMM.q = lines; // big moments cut in
    if (COMM.cur) COMM.cur.out = true;
    COMM.t = Math.max(COMM.t, (COMM.cur && COMM.cur.dur) || 0);
    COMM.cut = true;
  } else COMM.q.push(...lines);
  COMM.idle = 0;
}
/** Advances the captions and plays new lines. Long quiet spells get some banter. */
function stepCommentary(rdt) {
  if (!B || B.demo || B.replay) return;
  if (!COMM || COMM.B !== B) {
    commReset();
    Voice.preload(['start', 'firstblood', 'bighit', 'partoff']);
  }
  COMM.t += rdt;
  if (B.seq === 'play' && G.mode !== 'sandbox') {
    COMM.idle += rdt;
    if (COMM.idle > 16 && !COMM.cur && !COMM.q.length && Math.random() < rdt * 0.25) commentate('banter');
  }
  if (COMM.cur && COMM.t > COMM.cur.dur) {
    COMM.cur = null;
    COMM.t = 0;
  }
  if (!COMM.cur && COMM.q.length && COMM.t > (COMM.gap || 0)) {
    const l = COMM.q.shift(),
      spoken = speakLine(l, COMM.cut);
    COMM.cut = false;
    // a recorded line stays up exactly as long as it is spoken; text-only lines by reading speed
    l.dur = spoken ? spoken + 0.45 : clamp(1.6 + l.text.length * 0.055, 2.2, 5.5);
    l.talk = spoken;
    COMM.cur = l;
    COMM.t = 0;
    COMM.shown++;
    COMM.gap = COMM.q.length ? 0.15 : 1.2;
  }
}
/** Speaks a line; returns how long the recording lasts (0 for the system voice or silence). */
function speakLine(l, cut) {
  if (MUTE || SETTINGS.voice === false || SETTINGS.commVoice === false) return 0;
  const len = Voice.play(l.who, l.text, { cut: cut || l.pri >= 4 });
  if (len || Voice.has(l.who, l.text) || !('speechSynthesis' in window)) return len;
  try {
    // fallback for lines that have no recording yet
    const s = speechSynthesis;
    if (s.speaking && l.pri < 4) return 0;
    if (l.pri >= 4) s.cancel();
    const u = new SpeechSynthesisUtterance(l.text);
    u.pitch = l.who === 'doc' ? 0.8 : 1.1;
    u.rate = l.who === 'doc' ? 0.98 : 1.12;
    u.volume = clamp(0.85 * SETTINGS.vol, 0, 1);
    const vs = s.getVoices().filter(v => /^en/i.test(v.lang));
    if (vs.length) u.voice = l.who === 'doc' ? vs[Math.min(1, vs.length - 1)] : vs[0];
    s.speak(u);
  } catch (e) {}
  return 0;
}
/** Caption at the bottom centre: slides up, types along with the voice, and shows who is talking. */
function drawCommentary(c) {
  if (!COMM || COMM.B !== B || !COMM.cur || SETTINGS.comm === false) return;
  const l = COMM.cur,
    who = CASTERS[l.who],
    calm = SETTINGS.motion === false,
    tin = Math.min(1, COMM.t * 5),
    tout = clamp((l.dur - COMM.t) * 4, 0, 1),
    a = Math.min(tin, tout);
  if (a <= 0) return;
  c.save();
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.font = '600 16px "Barlow Semi Condensed", sans-serif';
  const maxW = Math.min(640, view.w - 80),
    words = l.text.split(' '),
    rows = [];
  let row = '';
  for (const w of words) {
    const t = row ? row + ' ' + w : w;
    if (c.measureText(t).width > maxW - 84 && row) {
      rows.push(row);
      row = w;
    } else row = t;
  }
  rows.push(row);
  const ease = 1 - Math.pow(1 - tin, 3),
    w = Math.min(maxW, Math.max(...rows.map(r => c.measureText(r).width)) + 84),
    h = 36 + rows.length * 20,
    x = view.w / 2 - w / 2,
    y = view.h - h - 54 + (calm ? 0 : (1 - ease) * 26 + (1 - tout) * 10),
    shout = /!/.test(l.text) && l.who === 'dash';
  c.globalAlpha = a;
  // a quick shake when Dash shouts
  if (shout && !calm && COMM.t < 0.35) c.translate(Math.sin(COMM.t * 70) * 3 * (1 - COMM.t / 0.35), 0);
  // chamfered glass panel with the caster's colour on the edge
  c.beginPath();
  c.moveTo(x + 10, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w, y + h - 10);
  c.lineTo(x + w - 10, y + h);
  c.lineTo(x, y + h);
  c.lineTo(x, y + 10);
  c.closePath();
  c.fillStyle = 'rgba(10,16,32,.92)';
  c.fill();
  c.strokeStyle = who.col;
  c.globalAlpha = a * 0.75;
  c.lineWidth = 1.5;
  c.stroke();
  c.globalAlpha = a;
  // caster badge: initials in a ring that pulses while the voice is talking
  const bx = x + 30,
    by = y + h / 2,
    talking = l.talk && COMM.t < l.talk,
    pulse = talking && !calm ? 1 + Math.abs(Math.sin(COMM.t * 13)) * 0.08 : 1;
  c.fillStyle = who.col;
  c.globalAlpha = a * 0.18;
  c.beginPath();
  c.arc(bx, by, 19 * pulse + 3, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = a;
  c.beginPath();
  c.arc(bx, by, 17 * pulse, 0, Math.PI * 2);
  c.fillStyle = '#0f1a30';
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = who.col;
  c.stroke();
  c.fillStyle = who.col;
  c.font = '700 14px "Chakra Petch", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(l.who === 'dash' ? 'DD' : 'DG', bx, by + 1);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  // name, a LIVE dot and a little level meter while talking
  const tx = x + 60;
  c.font = '700 12px "Chakra Petch", sans-serif';
  c.fillText(who.name.toUpperCase(), tx, y + 19);
  const nw = c.measureText(who.name.toUpperCase()).width;
  c.fillStyle = '#ff4d5e';
  c.globalAlpha = a * (0.55 + 0.45 * Math.abs(Math.sin(ANIM * 3)));
  c.beginPath();
  c.arc(tx + nw + 11, y + 15, 3.5, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = a;
  if (talking && !calm)
    for (let i = 0; i < 4; i++) {
      const bh = 3 + Math.abs(Math.sin(COMM.t * (11 + i * 3.7) + i)) * 9;
      c.fillStyle = who.col;
      c.fillRect(tx + nw + 22 + i * 5, y + 19 - bh, 3, bh);
    }
  // the words appear as they are spoken
  const total = l.text.length,
    reveal = calm ? total : Math.ceil(total * clamp(COMM.t / Math.max(0.4, (l.talk || l.dur * 0.5) * 0.85), 0, 1));
  c.fillStyle = '#e6f1ff';
  c.font = '600 16px "Barlow Semi Condensed", sans-serif';
  let left = reveal;
  rows.forEach((r, i) => {
    const part = r.slice(0, Math.max(0, left));
    left -= r.length + 1;
    c.fillText(part, tx, y + 40 + i * 20);
  });
  c.restore();
}

/* ---------- crowd and hype ---------- */
const HYPE_GIFT = 100;
const GIFT_KINDS = ['repair', 'coins', 'power'];
const crowdOn = () => B && !B.demo && !B.replay && G.mode !== 'sandbox';
/** Per-battle crowd state; created lazily. */
function crowdState() {
  if (B.crowd) return B.crowd;
  B.crowd = {
    hype: B.cars.map(() => 0),
    seen: B.cars.map(v => ({ hp: carHealth(v), lost: v.lost.length, air: false, powers: v.powers || 0, dead: v.dead })),
    quiet: 0,
    mood: 0, // 0 calm .. 1 roaring, drives the stands animation
    boo: 0,
    started: false,
    lowSaid: B.cars.map(() => false),
    worst: B.cars.map(() => 1),
    clutchT: B.cars.map(() => 0),
    clutchSaid: B.cars.map(() => false),
    flare: 0
  };
  return B.crowd;
}
/** Watches the fight and turns what happens into hype, lines and gifts. Runs on the simulating peer. */
function crowdStep(dt) {
  if (!crowdOn()) return;
  const C = crowdState();
  if (B.seq !== 'play') {
    C.mood = Math.max(0, C.mood - dt * 0.4);
    return;
  }
  if (!C.started) {
    C.started = true;
    commentate('start', { car: B.cars[0], other: B.cars[1] });
    for (const v of B.cars) {
      if (v.insts.some(I => I.mw)) commentate('masterwork', { car: v });
      else if (v.flair && v.flair.set) commentate('setbonus', { car: v });
    }
  }
  let action = false;
  B.cars.forEach((v, i) => {
    const s = C.seen[i],
      hp = carHealth(v),
      other = B.cars.find(c => c !== v),
      oi = B.cars.indexOf(other),
      k = 1 + (other && other.hypeK ? other.hypeK : 0);
    // damage taken by v is hype for the other car
    const lost = s.hp - hp;
    if (lost > 0.003 && other) {
      gainHype(C, oi, lost * 120 * k);
      action = true;
      if (!C.firstDone) {
        C.firstDone = true;
        commentate('firstblood', { car: other, other: v });
      } else if (lost > 0.09) {
        commentate('bighit', { car: other, other: v });
        sfx('ooh');
      }
    }
    if (v.lost.length > s.lost && other) {
      const id = v.lost[v.lost.length - 1],
        m = MOD[id];
      gainHype(C, oi, 4 * k);
      if (m && id !== 'cockpit')
        commentate(m.cat === 'weapon' ? 'weaponoff' : 'partoff', { car: other, other: v, part: m.name });
    }
    if (v.dead && !s.dead && other) {
      gainHype(C, oi, 30 * k);
      C.flare = 1;
      commentate('wreck', { car: other, other: v });
      sfx('cheer');
    }
    const air = (v.z || 0) > 34;
    if (air && !s.air) {
      gainHype(C, i, 6 * (1 + (v.hypeK || 0)));
      commentate('air', { car: v });
    }
    if ((v.powers || 0) > s.powers) {
      gainHype(C, i, 3 * (1 + (v.hypeK || 0)));
      commentate('power', { car: v });
    }
    if (hp < 0.22 && !C.lowSaid[i] && !v.dead) {
      C.lowSaid[i] = true;
      commentate('lowhp', { car: other, other: v });
    }
    // still alive on almost nothing for a few seconds: the clutch call
    C.clutchT[i] = hp < 0.08 && !v.dead ? C.clutchT[i] + dt : 0;
    if (C.clutchT[i] > 2.5 && !C.clutchSaid[i]) {
      C.clutchSaid[i] = true;
      gainHype(C, i, 15);
      commentate('clutch', { car: v });
    }
    // comeback: was nearly dead, now the other car is lower
    C.worst[i] = Math.min(C.worst[i], hp);
    if (C.worst[i] < 0.25 && other && carHealth(other) < hp - 0.05 && !C.cb) {
      C.cb = true;
      commentate('comeback', { car: v });
    }
    Object.assign(s, { hp, lost: v.lost.length, air, powers: v.powers || 0, dead: v.dead });
  });
  if (!C.closeSaid && B.cars.length === 2 && B.cars.every(v => !v.dead && carHealth(v) < 0.3)) {
    C.closeSaid = true;
    commentate('close', {});
  }
  if (!C.lastSaid && B.t > 0 && B.t < 10 && B.cars.every(v => !v.dead)) {
    C.lastSaid = true;
    commentate('lastsecs', {});
  }
  // a quiet arena bores the crowd
  C.quiet = action ? 0 : C.quiet + dt;
  if (C.quiet > 9) {
    C.quiet = 0;
    commentate('boring', {});
    sfx('boo');
    C.boo = 1;
  }
  C.boo = Math.max(0, C.boo - dt * 0.5);
  C.flare = Math.max(0, C.flare - dt * 0.6);
  // gifts land in offline matches only: online both peers must see the same pickups
  if (G.mode !== 'mp')
    C.hype.forEach((h, i) => {
      if (h >= HYPE_GIFT && !B.cars[i].dead) {
        C.hype[i] = 30;
        throwGift(B.cars[i]);
      }
    });
  for (let i = 0; i < C.hype.length; i++) C.hype[i] = Math.max(0, C.hype[i] - dt * (C.quiet > 4 ? 2.5 : 0.6));
  C.mood += (clamp(Math.max(...C.hype) / HYPE_GIFT + C.flare, 0, 1) - C.mood) * Math.min(1, dt * 2);
}
function gainHype(C, i, n) {
  if (i < 0) return;
  C.hype[i] = Math.min(HYPE_GIFT, C.hype[i] + n);
}
/** A present flies out of the nearest stand and lands near the car. */
function throwGift(v) {
  let x = v.x + rnd(-140, 140),
    y = v.y + rnd(-140, 140);
  x = clamp(x, WM + 60, AW - WM - 60);
  y = clamp(y, WM + 60, AH - WM - 60);
  for (let t = 0; t < 30 && (B.st.some(s => circRectDist(x, y, s) < 40) || Math.hypot(x - v.x, y - v.y) < 70); t++) {
    x = clamp(v.x + rnd(-220, 220), WM + 60, AW - WM - 60);
    y = clamp(v.y + rnd(-220, 220), WM + 60, AH - WM - 60);
  }
  const fromTop = y < AH / 2,
    sx = x + rnd(-200, 200),
    sy = fromTop ? -60 : AH + 60;
  B.pk.push({ kind: 'gift', g: pick(GIFT_KINDS), x, y, sx, sy, fly: 0, cd: 0, fan: v.idx, col: v.paint || '#ffb423' });
  commentate('gift', { car: v });
  sfx('cheer');
}
/** Called from the pickup code when a car grabs a gift. */
function crowdGiftTaken(v, p) {
  if (p.fly < 1) {
    p.cd = 0; // still in the air
    return;
  }
  const fl = v.flair || {};
  if (p.g === 'repair') {
    for (const I of v.insts) if (I.alive) I.hp = Math.min(I.max, I.hp + I.max * 0.14 * (1 + (fl.repairK || 0)));
    txt(p.x, p.y - 22, 'FAN REPAIR', '#3fe0a0', 1.2);
    sfx('repair', p.x, p.y);
  } else if (p.g === 'coins') {
    coinPop(p.x, p.y, Math.round(25 * (1 + (fl.coinK || 0))), v);
  } else {
    const id = pick(POWER_IDS.filter(x => x !== 'repair')),
      P = POWERUPS[id];
    v.buff = { p: id, t: P.time * (1 + (fl.powerK || 0)) };
    v.powers = (v.powers || 0) + 1;
    txt(p.x, p.y - 22, P.name.toUpperCase(), P.col, 1.2);
    sfx('power', p.x, p.y);
  }
  if (fl.giftHeal) for (const I of v.insts) if (I.alive) I.hp = Math.min(I.max, I.hp + I.max * fl.giftHeal);
  commentate('giftgot', { car: v });
}
/** Gifts fly in on an arc; called every frame from the arena step. */
function stepGifts(dt) {
  for (const p of B.pk || []) if (p.kind === 'gift' && p.fly < 1) p.fly = Math.min(1, p.fly + dt * 1.1);
  // collected gifts are removed so the list does not grow
  if (B.pk && B.pk.some(p => p.kind === 'gift' && p.cd > 1e8))
    B.pk = B.pk.filter(p => !(p.kind === 'gift' && p.cd > 1e8));
}

/* ---------- drawing: stands, salvage, gifts, hype ---------- */
const STAND = 90; // world px of stands behind every wall
/** Pre-renders the four stands (bleachers and every fan) once per battle at half resolution. */
const SKIN_COLS = ['#c99a74', '#a8764f', '#e0b896', '#7a5236', '#d6a77f'];
const FAN_COLS = ['#7a3d3a', '#36557a', '#7a6a2e', '#3d6a52', '#5e4a7a', '#7a4a62', '#6b6e74', '#7a5434'];
function standsCanvas() {
  if (B.standsImg) return B.standsImg;
  const cv = document.createElement('canvas'),
    W = AW + STAND * 2,
    H = AH + STAND * 2,
    sc = 0.5;
  cv.width = W * sc;
  cv.height = H * sc;
  const c = cv.getContext('2d');
  c.scale(sc, sc);
  c.translate(STAND, STAND); // world coordinates
  c.fillStyle = '#121a2c';
  c.fillRect(-STAND, -STAND, W, H);
  for (let r = 0; r < 4; r++) {
    c.fillStyle = r % 2 ? '#18233a' : '#1c2943';
    const d = -STAND + 8 + r * 20;
    c.fillRect(d, d, AW - d * 2, 12);
    c.fillRect(d, AH - d - 12, AW - d * 2, 12);
    c.fillRect(d, d, 12, AH - d * 2);
    c.fillRect(AW - d - 12, d, 12, AH - d * 2);
  }
  let n = 0;
  const fan = (x, y) => {
    n++;
    c.fillStyle = FAN_COLS[(n * 7) % FAN_COLS.length];
    c.beginPath();
    c.arc(x, y + 7, 6, Math.PI, 0);
    c.fill();
    c.fillStyle = SKIN_COLS[(n * 3) % SKIN_COLS.length];
    c.beginPath();
    c.arc(x, y - 2, 3.6, 0, Math.PI * 2);
    c.fill();
    if (n % 5 === 0) {
      c.fillRect(x - 6, y - 7, 1.8, 8);
      c.fillRect(x + 4.2, y - 7, 1.8, 8);
    }
  };
  for (const [r, d] of [-STAND + 22, -STAND + 46, -STAND + 70].entries()) {
    for (let x = -STAND + 30 + r * 7; x < AW + STAND - 30; x += 22) {
      fan(x, d);
      fan(x, AH - d + 8);
    }
    for (let y = -STAND + 60 + r * 7; y < AH + STAND - 60; y += 22) {
      fan(d, y);
      fan(AW - d, y);
    }
  }
  B.standsImg = cv;
  return cv;
}
const STAND_SEC = 160; // world px per bouncing section
function drawStands(c) {
  if (!B) return;
  const img = standsCanvas(),
    C = B.crowd,
    mood = C ? C.mood : 0.15,
    boo = C ? C.boo : 0,
    t = ANIM,
    s = view.sc * cam.z,
    vx0 = cam.x - view.w / (2 * s),
    vx1 = cam.x + view.w / (2 * s),
    vy0 = cam.y - view.h / (2 * s),
    vy1 = cam.y + view.h / (2 * s);
  const top = vy0 < 0,
    bot = vy1 > AH,
    left = vx0 < 0,
    right = vx1 > AW;
  if (!(top || bot || left || right)) return;
  const k = img.width / (AW + STAND * 2),
    hop = i => Math.max(0, Math.sin(t * (4 + mood * 6) + i * 1.7)) * (1 + mood * 6) * (1 - boo * 0.7);
  // one drawImage per visible section; each section of fans hops on its own beat
  const part = (sx, sy, sw, sh, dx, dy) =>
    c.drawImage(img, (sx + STAND) * k, (sy + STAND) * k, sw * k, sh * k, dx, dy, sw, sh);
  const x0 = Math.max(-STAND, vx0),
    x1 = Math.min(AW + STAND, vx1),
    y0 = Math.max(-STAND, vy0),
    y1 = Math.min(AH + STAND, vy1);
  for (let x = Math.floor((x0 + STAND) / STAND_SEC) * STAND_SEC - STAND; x < x1; x += STAND_SEC) {
    const w = Math.min(STAND_SEC, AW + STAND - x),
      i = Math.round(x / STAND_SEC);
    if (top) part(x, -STAND, w, STAND, x, -STAND + hop(i) * 0.6);
    if (bot) part(x, AH, w, STAND, x, AH - hop(i + 40) * 0.6);
  }
  for (let y = Math.floor((Math.max(y0, 0) + 0) / STAND_SEC) * STAND_SEC; y < Math.min(y1, AH); y += STAND_SEC) {
    const h = Math.min(STAND_SEC, AH - y),
      i = Math.round(y / STAND_SEC);
    if (left) part(-STAND, y, STAND, h, -STAND + hop(i + 80) * 0.6, y);
    if (right) part(AW, y, STAND, h, AW - hop(i + 120) * 0.6, y);
  }
  // flags in the colour of the nearest car, waving harder with hype
  const cars = B.cars || [];
  const fanCol = (x, y) => {
    let best = null,
      bd = 1e9;
    for (const v of cars) {
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < bd) ((bd = d), (best = v));
    }
    return best ? best.paint : '#ffb423';
  };
  c.save();
  for (let q = 0; q < 14; q++) {
    const side = q % 2;
    if (!(side ? bot : top)) continue;
    const x = 100 + (q * (AW - 200)) / 13;
    if (x < vx0 - 30 || x > vx1 + 30) continue;
    const y = side ? AH + STAND - 12 : -STAND + 12,
      w = Math.sin(t * (3 + mood * 5) + q) * (4 + mood * 10),
      fy = y + (side ? -28 : 28);
    c.strokeStyle = '#8b939c';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, fy);
    c.stroke();
    c.fillStyle = fanCol(x, side ? AH : 0);
    c.beginPath();
    c.moveTo(x, fy);
    c.lineTo(x + 18 + w * 0.3, fy + (side ? 6 : -6) + w * 0.4);
    c.lineTo(x, fy + (side ? 12 : -12));
    c.fill();
  }
  c.restore();
}
/** Salvage crate (story) and crowd gift drawing. */
function drawSalvage(c, p) {
  const bob = Math.sin(ANIM * 3 + p.x) * 3;
  c.save();
  if (p.kind === 'gift') {
    let x = p.x,
      y = p.y,
      sc = 1;
    if (p.fly < 1) {
      const t = p.fly;
      x = p.sx + (p.x - p.sx) * t;
      y = p.sy + (p.y - p.sy) * t - Math.sin(t * Math.PI) * 220;
      sc = 0.8 + Math.sin(t * Math.PI) * 0.5;
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath();
      c.ellipse(p.x, p.y + 10, 14 * t, 6 * t, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.translate(x, y + (p.fly >= 1 ? bob : 0));
    c.scale(sc, sc);
    c.rotate(p.fly < 1 ? p.fly * 8 : 0);
    c.fillStyle = p.col;
    c.fillRect(-13, -13, 26, 26);
    c.fillStyle = '#fff';
    c.fillRect(-3, -13, 6, 26);
    c.fillRect(-13, -3, 26, 6);
    c.strokeStyle = '#fff';
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(-6, -16, 6, 4, -0.5, 0, Math.PI * 2);
    c.ellipse(6, -16, 6, 4, 0.5, 0, Math.PI * 2);
    c.stroke();
    if (p.fly >= 1) {
      c.globalAlpha = 0.5 + Math.sin(ANIM * 6) * 0.3;
      c.strokeStyle = '#ffd257';
      c.lineWidth = 2;
      c.strokeRect(-19, -19, 38, 38);
    }
  } else {
    // salvage crate: a wooden box with a cyan beacon, gold for gear
    const col = p.gear ? '#ffd257' : '#5be7ff';
    c.translate(p.x, p.y + bob);
    c.globalAlpha = 0.25 + Math.sin(ANIM * 4 + p.x) * 0.15;
    c.fillStyle = col;
    c.beginPath();
    c.arc(0, 0, 30, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#8a5a2b';
    c.fillRect(-15, -15, 30, 30);
    c.strokeStyle = '#5b3a1a';
    c.lineWidth = 3;
    c.strokeRect(-15, -15, 30, 30);
    c.beginPath();
    c.moveTo(-15, -15);
    c.lineTo(15, 15);
    c.stroke();
    c.fillStyle = col;
    c.font = '700 11px "Chakra Petch", sans-serif';
    c.textAlign = 'center';
    c.fillText(p.gear ? 'GEAR' : 'SALVAGE', 0, -22);
  }
  c.restore();
}
/** One hype meter, drawn right under a health bar (screen space). */
function drawHypeBar(c, x, y, w, car, right) {
  if (!crowdOn() || !B.crowd || G.phase !== 'battle' || G.mode === 'sandbox') return;
  const i = B.cars.indexOf(car);
  if (i < 0) return;
  const f = B.crowd.hype[i] / HYPE_GIFT,
    full = f > 0.85;
  c.save();
  c.fillStyle = 'rgba(20,16,12,.72)';
  c.fillRect(x, y, w, 16);
  c.fillStyle = 'rgba(255,180,35,.18)';
  const bx = right ? x + 8 : x + 44;
  c.fillRect(bx, y + 5, w - 52, 6);
  c.fillStyle = full ? '#ffd257' : '#ffb423';
  const bw = (w - 52) * f;
  c.fillRect(right ? bx + (w - 52) - bw : bx, y + 5, bw, 6);
  c.font = '700 10px "Chakra Petch", sans-serif';
  c.fillStyle = full ? '#ffd257' : '#c9ced3';
  c.textAlign = right ? 'right' : 'left';
  c.textBaseline = 'middle';
  c.fillText(full ? 'GIFT!' : 'HYPE', right ? x + w - 8 : x + 8, y + 8.5);
  c.restore();
}

/* ---------- crowd sounds ---------- */
Object.assign(SFX, {
  cheer: v => {
    noise(1.4, 0.07 * v, 900, 1500, 0.6);
    noise(1.1, 0.05 * v, 2200, 1800, 0.8, 0.05);
    [0, 0.12, 0.26].forEach(d => tone('triangle', 900 + Math.random() * 300, 1200, 0.25, 0.012 * v, d));
  },
  boo: v => {
    noise(1.3, 0.06 * v, 260, 180, 1.2);
    tone('sawtooth', 140, 110, 1.1, 0.02 * v);
  },
  ooh: v => {
    noise(0.7, 0.05 * v, 500, 900, 1.5);
  }
});
Object.assign(THROT, { cheer: 1.2, boo: 2, ooh: 0.8 });
