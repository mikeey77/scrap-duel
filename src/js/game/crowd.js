// The show around the fight: a commentator duo, a crowd in the stands and its hype meter.
// Everything here watches the battle state (health, parts, airtime, pickups) instead of hooking the damage code,
// so it works the same offline, online (both peers comment on their own screen) and costs almost nothing.
// Crowd gifts change the match, so they only fall in offline matches.

/* ---------- the duo ---------- */
const CASTERS = {
  dash: { name: 'Dash Danvers', col: '#ffb423', pitch: 1.15, rate: 1.1 },
  doc: { name: 'Doc Gasket', col: '#5be7ff', pitch: 0.75, rate: 0.95 }
};
// {a} = the car that did it, {b} = the other car, {p} = a part name. A line is [caster, text] or a short exchange.
const CALLS = {
  start: [
    [['dash', 'Engines hot, tyres bald, and the crowd is already loud!']],
    [
      ['dash', "{a} against {b}. Doc, who's your money on?"],
      ['doc', "Whoever doesn't fall apart first. That's science."]
    ],
    [['doc', 'Remember folks: every bolt you see out there was once a perfectly good toaster.']],
    [
      ['dash', 'Welcome back to the junkyard!'],
      ['doc', 'Mind the oil. And the saws. And everything.']
    ],
    [['dash', 'Lights, rust, action!']]
  ],
  firstblood: [
    [['dash', 'First blood goes to {a}!']],
    [['doc', '{a} draws first. The paint job on {b} will never be the same.']],
    [['dash', 'And {a} opens the scoring with a dent!']]
  ],
  bighit: [
    [['dash', 'OH! What a hit from {a}!']],
    [['doc', 'I felt that one in my fillings. Big hit, {a}.']],
    [['dash', '{b} is going to need a bigger toolbox!']],
    [['dash', 'KA-CHUNK! {a} means business!']]
  ],
  partoff: [
    [['dash', "{b}'s {p} is gone!"]],
    [['doc', 'That {p} belonged to {b}. Past tense.']],
    [['dash', 'There goes the {p}! Somebody catch it!']]
  ],
  weaponoff: [
    [['doc', "{b} just lost the {p}. That's their teeth, Dash."]],
    [['dash', '{a} rips the {p} right off {b}!']]
  ],
  wreck: [
    [['dash', '{b} IS WRECKED! {a} takes it!']],
    [
      ['dash', "That's the end of {b}!"],
      ['doc', 'Scrap value: about four coins and a sad hubcap.']
    ],
    [['doc', 'And {b} has been returned to its natural state: junk.']],
    [['dash', 'Down goes {b}! Down goes {b}!']]
  ],
  lowhp: [
    [['doc', '{b} is held together by hope and one bolt.']],
    [['dash', "{b} is smoking! One more hit and that's it!"]]
  ],
  comeback: [
    [['dash', 'Look at {a} fight back! This is a COMEBACK!']],
    [['doc', 'Never count out a car with nothing left to lose.']]
  ],
  air: [
    [['dash', '{a} is FLYING!']],
    [['doc', 'Airtime! Nobody told {a} that cars stay on the ground.']],
    [['dash', 'Big air from {a}! Ten out of ten, no notes!']]
  ],
  power: [
    [['doc', '{a} grabs a power-up. That changes the maths.']],
    [['dash', 'Power-up for {a}! Here comes trouble!']]
  ],
  boring: [
    [
      ['dash', 'Doc, are they... parking?'],
      ['doc', 'The crowd paid good scrap for this. Get in there!']
    ],
    [['doc', 'I can hear the crowd booing from up here. Somebody hit something!']],
    [['dash', "Come on, this isn't a car show!"]]
  ],
  gift: [
    [['dash', 'The crowd loves {a}! Here comes a gift from the stands!']],
    [['doc', 'Fan mail for {a}! Hopefully not a brick this time.']],
    [['dash', 'They are THROWING THINGS for {a}! Nice things, I think!']]
  ],
  giftgot: [[['dash', '{a} grabs the gift!']], [['doc', 'Never refuse a present from the stands.']]],
  salvage: [
    [['doc', '{a} picks up some salvage. Waste not, want not.']],
    [['dash', '{a} finds a goodie in the scrap!']]
  ],
  stolen: [
    [['dash', 'Cheeky! {a} steals the salvage!']],
    [['doc', 'That crate is gone for good. {a} is a professional thief.']]
  ],
  phase: [
    [['dash', '{a} is getting ANGRY!']],
    [['doc', "Uh oh. When a boss changes phase, it's time to change plans."]]
  ],
  masterwork: [[['doc', 'Look at that golden glow: {a} brought masterwork gear.']]],
  setbonus: [[['dash', '{a} rolls out with a full sticker set! Style AND substance!']]],
  close: [
    [['dash', 'Both cars are hanging by a thread!']],
    [['doc', 'Whoever lands the next hit wins this. Hold your breath.']]
  ]
};
const COMM_PRI = { wreck: 5, phase: 4, start: 3, gift: 3, firstblood: 3, comeback: 3, close: 3, bighit: 2 };

let COMM = null; // caption queue + state for the current battle
const commReset = () =>
  (COMM = { q: [], cur: null, t: 0, gap: 1.5, last: {}, used: {}, B: B, firstDone: false, sayAt: 0 });
/** Queues a line for an event. ctx.car is the car that did it; its rival becomes {b}. */
function commentate(kind, ctx = {}) {
  if (!B || B.demo || B.replay || SETTINGS.comm === false || !CALLS[kind]) return;
  if (!COMM || COMM.B !== B) commReset();
  const now = B.time || 0,
    pri = COMM_PRI[kind] || 1;
  // each kind has its own cooldown so big moments do not get drowned by small ones
  if (COMM.last[kind] && now - COMM.last[kind] < (pri >= 3 ? 4 : 9)) return;
  if (pri < 3 && (COMM.q.length || (COMM.cur && COMM.cur.pri >= pri))) return;
  COMM.last[kind] = now;
  const a = ctx.car || null,
    b = ctx.other || (a && B.cars.find(c => c !== a)) || null,
    names = { a: a ? a.name : 'someone', b: b ? b.name : 'the other car', p: ctx.part || 'part' };
  const opts = CALLS[kind],
    used = COMM.used[kind] || [];
  let i = Math.floor(Math.random() * opts.length);
  if (opts.length > 1 && used.includes(i)) i = (i + 1 + Math.floor(Math.random() * (opts.length - 1))) % opts.length;
  COMM.used[kind] = [...used.slice(-1), i];
  const lines = opts[i].map(([who, t]) => ({ who, text: t.replace(/\{(\w)\}/g, (_, k) => names[k] || ''), pri }));
  if (pri >= 4) {
    COMM.q = lines; // big moments cut in
    COMM.cur = null;
    COMM.t = 0;
  } else COMM.q.push(...lines);
}
/** Advances the captions and speaks new lines. */
function stepCommentary(rdt) {
  if (!B || B.demo || B.replay) return;
  if (!COMM || COMM.B !== B) commReset();
  COMM.t += rdt;
  if (COMM.cur && COMM.t > COMM.cur.dur) {
    COMM.cur = null;
    COMM.t = 0;
  }
  if (!COMM.cur && COMM.q.length && COMM.t > (COMM.gap || 0)) {
    const l = COMM.q.shift();
    l.dur = clamp(1.6 + l.text.length * 0.055, 2.2, 5.5);
    COMM.cur = l;
    COMM.t = 0;
    COMM.gap = COMM.q.length ? 0.25 : 1.2;
    speakLine(l);
  }
}
function speakLine(l) {
  if (MUTE || SETTINGS.voice === false || SETTINGS.commVoice === false || !('speechSynthesis' in window)) return;
  try {
    const s = speechSynthesis;
    if (s.speaking && COMM.cur && COMM.cur.pri < 4) return; // never talk over the announcer
    if (l.pri >= 4) s.cancel();
    const c = CASTERS[l.who],
      u = new SpeechSynthesisUtterance(l.text);
    u.pitch = c.pitch;
    u.rate = c.rate;
    u.volume = clamp(0.85 * SETTINGS.vol, 0, 1);
    const vs = s.getVoices().filter(v => /^en/i.test(v.lang));
    if (vs.length) u.voice = l.who === 'doc' ? vs[Math.min(1, vs.length - 1)] : vs[0];
    s.speak(u);
  } catch (e) {}
}
/** Caption box at the bottom centre of the arena. */
function drawCommentary(c) {
  if (!COMM || COMM.B !== B || !COMM.cur || SETTINGS.comm === false) return;
  const l = COMM.cur,
    who = CASTERS[l.who],
    a = Math.min(1, COMM.t * 6, (l.dur - COMM.t) * 3);
  if (a <= 0) return;
  c.save();
  c.globalAlpha = a;
  c.font = '600 15px "Barlow Semi Condensed", sans-serif';
  const maxW = Math.min(620, view.w - 80),
    words = l.text.split(' '),
    rows = [];
  let row = '';
  for (const w of words) {
    const t = row ? row + ' ' + w : w;
    if (c.measureText(t).width > maxW - 28 && row) {
      rows.push(row);
      row = w;
    } else row = t;
  }
  rows.push(row);
  const w = Math.min(maxW, Math.max(...rows.map(r => c.measureText(r).width)) + 28),
    h = 30 + rows.length * 19,
    x = view.w / 2 - w / 2,
    y = view.h - h - 54;
  // chamfered glass panel with the caster's colour on the edge
  c.beginPath();
  c.moveTo(x + 8, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w, y + h - 8);
  c.lineTo(x + w - 8, y + h);
  c.lineTo(x, y + h);
  c.lineTo(x, y + 8);
  c.closePath();
  c.fillStyle = 'rgba(10,16,32,.88)';
  c.fill();
  c.strokeStyle = who.col;
  c.globalAlpha = a * 0.7;
  c.lineWidth = 1;
  c.stroke();
  c.globalAlpha = a;
  c.fillStyle = who.col;
  c.fillRect(x, y + 8, 3, h - 16);
  c.font = '700 12px "Chakra Petch", sans-serif';
  c.textBaseline = 'top';
  c.fillText(who.name.toUpperCase(), x + 14, y + 8);
  c.fillStyle = '#e6f1ff';
  c.font = '600 15px "Barlow Semi Condensed", sans-serif';
  rows.forEach((r, i) => c.fillText(r, x + 14, y + 25 + i * 19));
  c.restore();
}

/* ---------- crowd and hype ---------- */
const HYPE_GIFT = 100;
const GIFT_KINDS = ['repair', 'coins', 'power'];
const crowdOn = () => B && !B.demo && !B.replay;
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
/** Pre-renders the four stands once per battle; heads are drawn per section with a bounce. */
function standsCanvas() {
  if (B.standsImg) return B.standsImg;
  const cv = document.createElement('canvas'),
    W = AW + STAND * 2,
    H = AH + STAND * 2,
    sc = 0.5; // half resolution is plenty for a blurry crowd
  cv.width = W * sc;
  cv.height = H * sc;
  const c = cv.getContext('2d');
  c.scale(sc, sc);
  c.fillStyle = '#121a2c';
  c.fillRect(0, 0, W, H);
  // bleacher steps
  for (let r = 0; r < 4; r++) {
    c.fillStyle = r % 2 ? '#18233a' : '#1c2943';
    const d = 8 + r * 20;
    c.fillRect(d, d, W - d * 2, 12);
    c.fillRect(d, H - d - 12, W - d * 2, 12);
    c.fillRect(d, d, 12, H - d * 2);
    c.fillRect(W - d - 12, d, 12, H - d * 2);
  }
  B.standsImg = cv;
  return cv;
}
const SKIN_COLS = ['#c99a74', '#a8764f', '#e0b896', '#7a5236', '#d6a77f'];
const FAN_COLS = ['#7a3d3a', '#36557a', '#7a6a2e', '#3d6a52', '#5e4a7a', '#7a4a62', '#6b6e74', '#7a5434'];
function drawStands(c) {
  if (!crowdOn() && !(B && B.demo)) return;
  const img = standsCanvas(),
    C = B.crowd,
    mood = C ? C.mood : 0.15,
    boo = C ? C.boo : 0,
    t = ANIM;
  c.drawImage(img, -STAND, -STAND, AW + STAND * 2, AH + STAND * 2);
  // heads: rows along each side, bouncing with the mood. Sections near a car cheer for that car's colour.
  const rowsAt = [-STAND + 22, -STAND + 46, -STAND + 70];
  // only the heads on screen are drawn (the stands are mostly hidden behind the camera clamp)
  const s = view.sc * cam.z,
    vx0 = cam.x - view.w / (2 * s) - 20,
    vx1 = cam.x + view.w / (2 * s) + 20,
    vy0 = cam.y - view.h / (2 * s) - 20,
    vy1 = cam.y + view.h / (2 * s) + 20;
  c.save();
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
  const head = (x, y, seed) => {
    const amp = (1.5 + mood * 7) * (0.6 + 0.4 * Math.sin(seed * 7.1)),
      j = Math.max(0, Math.sin(t * (5 + mood * 6) + seed * 3.3)) * amp * (1 - boo * 0.7);
    c.fillStyle = FAN_COLS[Math.abs(Math.floor(seed * 13)) % FAN_COLS.length];
    c.beginPath();
    c.arc(x, y - j + 7, 6, Math.PI, 0);
    c.fill();
    c.fillStyle = SKIN_COLS[Math.abs(Math.floor(seed * 7)) % SKIN_COLS.length];
    c.beginPath();
    c.arc(x, y - j - 2, 3.6, 0, Math.PI * 2);
    c.fill();
    if (mood > 0.5 && Math.abs(Math.floor(seed)) % 4 === 0) {
      // arms up
      c.fillRect(x - 6, y - j - 7, 1.8, 8);
      c.fillRect(x + 4.2, y - j - 7, 1.8, 8);
    }
  };
  // first seat at or after the visible edge, on the row's own 22 px grid so seats never shift
  const snap = (base, from) => base + Math.max(0, Math.ceil((from - base) / 22)) * 22;
  const top = vy0 < 0,
    bot = vy1 > AH,
    left = vx0 < 0,
    right = vx1 > AW;
  for (let r = 0; r < 3; r++) {
    const d = rowsAt[r];
    if (top || bot)
      for (let x = snap(-STAND + 30 + r * 7, vx0); x < Math.min(AW + STAND - 30, vx1); x += 22) {
        if (top) head(x, d, x * 0.37 + r);
        if (bot) head(x, AH - d + 8, x * 0.53 + r + 9);
      }
    if (left || right)
      for (let y = snap(-STAND + 60 + r * 7, vy0); y < Math.min(AH + STAND - 60, vy1); y += 22) {
        if (left) head(d, y, y * 0.41 + r + 3);
        if (right) head(AW - d, y, y * 0.29 + r + 5);
      }
  }
  // flags in the colour of the nearest car, waving harder with hype
  for (let k = 0; k < 14; k++) {
    if (!(k % 2 ? bot : top)) continue;
    const side = k % 2,
      x = 100 + (k * (AW - 200)) / 13,
      y = side ? AH + STAND - 12 : -STAND + 12,
      col = fanCol(x, side ? AH : 0),
      w = Math.sin(t * (3 + mood * 5) + k) * (4 + mood * 10);
    c.strokeStyle = '#8b939c';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y + (side ? -28 : 28));
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    const fy = y + (side ? -28 : 28);
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
