// Match flow: profile setup, waiting arena, battle start, round end, results and the final screen.
const THEME_BLURB = {
  carpark: 'Painted bays, shopping trolleys and ramps between the levels.',
  beach: 'Soft sand, deck chairs and trampolines on the boardwalk.',
  junkyard: 'Heavy junk everywhere. Watch the oil slicks.',
  backyard: 'Trampolines and garden chaos. Expect air time.',
  market: 'Speed pads between the aisles, spills on the floor.',
  construction: 'Ramps and spike strips. Mind your tyres.',
  ice: 'Half the grip. Momentum is everything.',
  volcano: 'Lava pools burn your chassis. Do not park there.',
  space: 'Low gravity and air vents that blast you across the deck.',
  carwash: 'Soap everywhere and blowers that push. Free rinse included.',
  desert: 'Sandstorm gusts shove light cars around. Hold on to your hubcaps.',
  haunted: 'Lights out. Something keeps flickering. Probably fine.',
  toyroom: 'Giant toys and trampolines. Mind the Lego. Ouch.',
  factory: 'Conveyor belts move everything. Including you.',
  pinball: 'Bumpers launch you back. TILT does not exist here.',
  kitchen: 'Stove plates heat up in turns. Spills on the floor.',
  swamp: 'Mud slows you to a crawl. The ducks think it is hilarious.'
};

/* ---------- arena state ---------- */
/** An array whose push() stamps the part that is currently firing onto each projectile (for kill credits). */
function srcList() {
  const a = [];
  a.push = function (...xs) {
    for (const x of xs) if (x && x.src == null && B && B.curSrc) x.src = B.curSrc;
    return Array.prototype.push.apply(this, xs);
  };
  return a;
}
function newB(o) {
  return Object.assign(
    {
      time: 0,
      ts: 1,
      seq: 'in',
      seqT: 0,
      flash: 0,
      flashCol: null,
      shake: 0,
      hitstop: 0,
      chain: [],
      banner: null,
      ev: [],
      cars: [],
      shots: srcList(),
      lobs: srcList(),
      bombs: [],
      fx: [],
      debris: [],
      nums: [],
      clouds: [],
      decoys: [],
      zones: [],
      objs: [],
      st: [],
      pk: [],
      hitDirs: [],
      hitMarks: [],
      tape: [],
      uidc: 0,
      ring: null,
      t: 0,
      net: null,
      me: 0,
      lag: 0,
      rec: false,
      theme: THEMES[0],
      grip: 1
    },
    o
  );
}
function setupField(kind, f) {
  f = f || genArena(kind, B.theme);
  makeGround(B.theme, kind);
  Object.assign(B, {
    kind,
    st: f.st,
    objs: f.ob,
    zones: f.zn,
    pk: f.pk || [],
    sp: f.sp,
    grip: kind === 'wait' ? 1 : B.theme.grip
  });
  B.uidc = Math.max(B.uidc, 0, ...B.objs.map(o => o.uid || 0));
}

/* ---------- designs and car configs ---------- */
const myDesign = () => ({ base: G.base, top: G.top });
// extra per-part settings (key group, later paint/logic) travel with the design
const packEntry = e => {
  const o = { id: e.id, rot: e.rot, x: e.x, y: e.y };
  if (e.g) o.g = e.g;
  return o;
};
const packDesign = d => ({
  base: [...d.base].map(([k, e]) => [k, packEntry(e)]),
  top: [...d.top].map(([k, e]) => [k, packEntry(e)])
});
const unpackDesign = p => ({ base: new Map(p.base), top: new Map(p.top) });
const MATCH_FORMATS = {
  balanced: { name: 'Balanced rounds', desc: 'One point per round; double-point finale.' },
  lives: { name: 'Scrap Lives', desc: '20 lives each. A loss costs 2 + round number. Zero lives ends the match.' },
  bounty: {
    name: 'Bounty',
    desc: 'Beating the leader pays up to 2 bonus points (never more than the gap) and 45 bonus coins.'
  },
  finalehill: { name: 'Hill finale', desc: 'Balanced scoring with a King of the Hill final round.' }
};
let chosenFormat = 'balanced';
const formatSelect = (id, value = chosenFormat) =>
  `<label class="format-picker">Match format<select id="${id}" aria-label="Match format">${Object.entries(MATCH_FORMATS)
    .map(([k, f]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${f.name}</option>`)
    .join('')}</select><small>${esc(MATCH_FORMATS[value].desc)}</small></label>`;
const roundPoints = r => (G.format === 'lives' || G.format === 'bounty' ? 1 : r === ROUNDS ? 2 : 1);
/** Bounty: beating the leader pays 1 point plus up to 2 more for a long leader streak,
    but never more than the gap, so one upset can catch you up without erasing a string of losses. */
function bountyFor(gap) {
  return gap <= 0 ? 1 : Math.max(1, Math.min(1 + Math.min(2, Math.floor((G.bountyStreak || 1) / 2)), gap));
}
function formatAwards() {
  if (G.format !== 'bounty') return [roundPoints(G.round), roundPoints(G.round)];
  return [bountyFor(G.score[1] - G.score[0]), bountyFor(G.score[0] - G.score[1])];
}

function stakeLine(r) {
  return G.format === 'lives'
    ? `Defeat costs ${2 + r} lives`
    : G.format === 'bounty'
      ? `Bounty · you ${formatAwards()[0]} / rival ${formatAwards()[1]} pts`
      : `worth ${roundPoints(r)} pt${roundPoints(r) > 1 ? 's' : ''}`;
}

const pointsRemaining = r =>
  Array.from({ length: Math.max(0, ROUNDS - r) }, (_, i) => roundPoints(r + i + 1)).reduce((a, b) => a + b, 0);
const ptsLeft = () => pointsRemaining(G.round);
const myCarCfg = () => ({
  ...(G.run ? { run: runMods() } : {}),
  design: packDesign(myDesign()),
  tune: [...G.tune],
  name: G.name,
  paint: G.paint,
  ctrl: 'local',
  look: { ...G.style }
});
/** Builds one car from a config entry at its spawn point. */
function carFromCfg(c, i) {
  const sp = B.sp[i],
    v = makeCar(unpackDesign(c.design), i, sp[0], sp[1], sp[2], {
      tune: c.tune,
      name: c.name,
      paint: c.paint
    });
  v.style = c.style;
  v.diff = c.diff;
  v.look = { ...DEFAULT_STYLE, ...(c.look || {}) };
  applyCarMods(v, c);
  return v;
}
function carsFromCfg(cfg) {
  return cfg.cars.map((c, i) => {
    const v = carFromCfg(c, i);
    v.ctrl = cfg.net === 'client' ? null : i === cfg.me ? 'local' : c.ctrl === 'bot' ? 'bot' : 'remote';
    return v;
  });
}
/** A full battle config: theme, special round, arena layout and both cars. Built by the solo player or the host. */
function makeCfg(opp) {
  const ti = G.nextTheme != null ? G.nextTheme : pickTheme(),
    special = specialOf(G.round),
    f = applySpecialField(genArena('battle', THEMES[ti]), special);
  G.nextTheme = null;
  return {
    round: G.round,
    format: G.format,
    awards: formatAwards(),
    theme: ti,
    special,
    field: serializeField(f),
    cars: [myCarCfg(), opp]
  };
}

/** The starter car uses every starter part, so nobody begins the match behind. */
function defaultCar(guns = G.starterGuns || ['mg', 'mg']) {
  const b = new Map(),
    put = (id, x, y) => b.set(key(x, y), { id, rot: 0, x, y });
  put('cockpit', 0, 0);
  for (const [x, y] of [
    [0, -2],
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [0, 2]
  ])
    put('frame', x, y);
  for (const [x, y] of [
    [-2, -1],
    [2, -1],
    [-2, 1],
    [2, 1]
  ])
    put('wheel', x, y);
  for (const [x, y] of [
    [-2, 0],
    [2, 0],
    [-1, 2],
    [1, 2]
  ])
    put('armor', x, y);
  put('spike', -1, -2);
  put('spike', 1, -2);
  G.base = b;
  G.top = new Map([
    [key(-1, -1), { id: guns[0], rot: 0, x: -1, y: -1 }],
    [key(1, -1), { id: guns[1], rot: 0, x: 1, y: -1 }]
  ]);
}
function resetProfile() {
  Object.assign(G, {
    round: 1,
    tool: 'place',
    sel: 'frame',
    rot: 0,
    binCat: 'all',
    leftTab: 'bin',
    inv: {},
    found: new Set(),
    tune: new Set(),
    aff: {},
    coins: 100,
    log: [],
    zoom: 1,
    score: [0, 0],
    freeRerolls: 0,
    hist: [],
    redo: [],
    meReady: false,
    botRound: 0,
    bot: null,
    lastTheme: -1,
    sched: null,
    maxDeficit: 0,
    lastReplay: null,
    bestReplay: null,
    fun: null,
    lastOppDesign: null,
    nextTheme: null,
    srcTotals: {}
  });
  draftRerolls = 0;
  resetWs();
  G.inv.cockpit = 1;
  G.found.add('cockpit');
  const starter = starterKit();
  G.starterGuns = starter.guns;
  for (const id in starter.kit) {
    G.inv[id] = starter.kit[id];
    G.found.add(id);
  }
  defaultCar();
}
function hideOverlays() {
  for (const id of [
    '#ovIntro',
    '#ovMenu',
    '#ovLobby',
    '#ovVS',
    '#ovDraft',
    '#ovCrate',
    '#ovCodex',
    '#ovResult',
    '#ovReady',
    '#ovStyle',
    '#ovBlueprint'
  ])
    $(id).hidden = true;
}
function startMatch(mode, sched, format = chosenFormat, rounds) {
  if (G.run) {
    G.diff = G.run.prevDiff;
    G.run = null;
  }
  setRounds(mode === 'mp' ? rounds || 10 : mode === 'solo' ? G.rounds || 10 : 10);
  G.format = MATCH_FORMATS[format] ? format : 'balanced';
  G.lives = [20, 20];
  G.bountyStreak = 0;
  G.bountyWinner = null;
  G.synRound = null;
  demoStop();
  hideOverlays();
  B = null;
  G.mode = mode;
  resetProfile();
  if (mode === 'solo') {
    G.bot = makeBot(G.diff);
    G.bot.coins += DIFF[G.diff].bonus;
    G.oppName = G.bot.name;
    G.oppPaint = G.bot.paint === G.paint ? PAINTS.find(p => p !== G.paint) : G.bot.paint;
    G.oppLook = randomLook(G.diff);
    G.oppBadge = G.oppLook.badge;
  }
  if (mode === 'solo' || mode === 'mp') G.sched = sched || makeSchedule();
  if (G.format === 'finalehill') G.sched[ROUNDS - 1] = 'hill';
  if (mode === 'sandbox') {
    for (const m of MODS) {
      G.inv[m.id] = m.id === 'cockpit' ? 1 : 99;
      G.found.add(m.id);
    }
    G.coins = 9999;
    G.ws = new Set();
    for (let y = -WS_BOUND.y; y <= WS_BOUND.y; y++) for (let x = -WS_BOUND.x; x <= WS_BOUND.x; x++) G.ws.add(key(x, y));
    G.oppName = 'Dummies';
  }
  $('#arena').hidden = true;
  $('#build').hidden = false;
  turnBrush(0);
  setTool('place');
  updateHUD();
  if (mode === 'sandbox') {
    openBuild();
    window.__toast('Sandbox: every module, 99 of each. Ready drops you in the test arena.', true);
  } else {
    openDraft();
    showTip('draft');
  }
}
function openBuild() {
  G.phase = 'build';
  B = null;
  $('#arena').hidden = true;
  $('#build').hidden = false;
  if (G.meReady && G.mode === 'mp') Net.send({ t: 'unready' });
  G.meReady = false;
  sizeBP();
  refreshUI();
  updateHUD();
  showTip(specialOf(G.round) ? 'special' : 'build');
  if (G.nextTheme == null && G.mode !== 'sandbox' && !(G.mode === 'mp' && Net.role === 'client'))
    G.nextTheme = pickTheme();
  intelUI(true);
}
/* ---------- garage intel: the arena through the window, and the rival's shadow ---------- */
function oppHints(d) {
  const es = [...d.base.values(), ...d.top.values()],
    ms = es.map(e => MOD[e.id]).filter(Boolean);
  const mass = ms.reduce((a, m) => a + (m.mass || 0), 0),
    n = t => ms.filter(m => m.tags.includes(t)).length;
  const xs = [];
  for (const e of d.base.values()) for (const [x] of footprint(e.id, e.rot, e.x, e.y)) xs.push(x);
  const width = xs.length ? Math.max(...xs) - Math.min(...xs) + 1 : 0;
  const H = [
    [mass > 45, 3, '🏋 Heavy vehicle'],
    [mass < 18, 2, '🪶 Lightweight'],
    [n('fire') >= 2, 3, '🔥 Lots of fire'],
    [ms.filter(m => m.wpn).length >= 4, 3, '🔫 Bristling with guns'],
    [ms.filter(m => m.mel).length >= 2, 3, '🗡 Spiky nose'],
    [n('expl') >= 1, 2, '💥 Explosives on board'],
    [width >= 7, 2, '↔ Very wide body'],
    [ms.filter(m => m.drive).length >= 6, 2, '💨 Built for speed'],
    [n('cold') >= 2, 2, '❄ Cold hands'],
    [ms.some(m => m.odd), 2, '❓ Something weird…'],
    [ms.filter(m => m.tags.includes('def')).length >= 6, 2, '🛡 Armoured up']
  ]
    .filter(h => h[0])
    .sort((a, b) => b[1] - a[1])
    .map(h => h[2]);
  return H.length ? H.slice(0, 2) : ['🤷 Hard to read'];
}
function intelUI(force) {
  const box = $('#rivalIntel');
  if (!box) return;
  const solo = G.mode === 'solo',
    mp = G.mode === 'mp';
  if (!solo && !mp) {
    $('#bayIntel').hidden = true;
    return;
  }
  if (solo && G.bot && G.botRound !== G.round)
    try {
      prepareBot();
    } catch (e) {}
  $('#bayIntel').hidden = false;
  const packed = solo
    ? G.botDesign
      ? packDesign(G.botDesign)
      : null
    : (Net.oppReady && Net.oppReady.design) || G.lastOppDesign || null;
  const k = G.round + ':' + (packed ? JSON.stringify(packed).length : 0) + ':' + G.oppName;
  if (!force && box.dataset.k === k) return;
  box.dataset.k = k;
  let img = '',
    hints = ['No intel yet'];
  if (packed)
    try {
      const d = unpackDesign(packed);
      img = `<img class="shadow" alt="" src="${designURL(d, 90, '#000')}">`;
      hints = oppHints(d);
    } catch (e) {}
  box.innerHTML = `<span class="ih">${badgeHTML(G.oppBadge, 16)} ${esc(G.oppName || 'Rival')}</span>${img}<ul>${hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`;
}
const winFx = { parts: [], t: 0 };
function drawWindow(dt) {
  const cv = $('#winCv');
  if (!cv || !cv.getContext || cv.offsetParent === null) return;
  const c = cv.getContext('2d'),
    W = cv.width,
    H = cv.height;
  const th = THEMES[G.nextTheme != null ? G.nextTheme : 0],
    sp = specialOf(G.round),
    S = sp && SPECIALS[sp];
  const known = G.nextTheme != null;
  const lbl = $('#winLbl'),
    txt = (known ? th.name : 'Arena unknown') + (S ? ' · ' + S.name : '');
  if (lbl && lbl.textContent !== txt) lbl.textContent = txt;
  winFx.t += dt;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, known ? th.ground[0] : '#2a3344');
  g.addColorStop(1, known ? `rgb(${th.ground[1]})` : '#141b28');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // moving obstacles: a couple of junk blocks sliding past
  for (let i = 0; i < 3; i++) {
    const x = ((winFx.t * (14 + i * 9) + i * 70) % (W + 40)) - 20,
      y = 50 + i * 9;
    c.fillStyle = `rgba(${known ? th.ground[2] : '120,130,150'},.55)`;
    c.fillRect(x, y, 16 + i * 4, 8);
  }
  const id = known ? th.id : 'fog',
    P = winFx.parts;
  const spawn = {
    ice: 'snow',
    beach: 'sand',
    junkyard: 'dust',
    backyard: 'leaf',
    construction: 'spark',
    carpark: 'rain',
    market: 'dust',
    fog: 'dust',
    volcano: 'ember',
    space: 'star',
    carwash: 'bubble',
    desert: 'sand',
    haunted: 'ghost',
    toyroom: 'confetti',
    factory: 'spark',
    pinball: 'star',
    kitchen: 'steam',
    swamp: 'fly'
  }[id];
  const rate = spawn === 'rain' ? 60 : spawn === 'snow' ? 30 : 14;
  if (SETTINGS.motion !== false)
    for (let i = 0; i < rate * dt; i++)
      P.push({
        x: Math.random() * W * 1.2,
        y: ['ember', 'steam', 'bubble'].includes(spawn) ? H + 4 : -4,
        vx: spawn === 'sand' ? -90 : spawn === 'rain' ? -30 : spawn === 'fly' ? rnd(-40, 40) : rnd(-10, 10),
        vy:
          spawn === 'rain'
            ? 220
            : spawn === 'snow'
              ? 26
              : spawn === 'spark'
                ? rnd(-40, 40)
                : ['ember', 'steam', 'bubble'].includes(spawn)
                  ? -rnd(20, 50)
                  : spawn === 'star'
                    ? 6
                    : spawn === 'fly'
                      ? rnd(-20, 20)
                      : 30,
        life: 4,
        k: spawn
      });
  if (spawn === 'spark' && Math.random() < dt * 2)
    for (let i = 0; i < 6; i++)
      P.push({ x: rnd(20, W - 20), y: rnd(20, H - 10), vx: rnd(-60, 60), vy: rnd(-60, 10), life: 0.5, k: 'spark' });
  for (let i = P.length - 1; i >= 0; i--) {
    const q = P[i];
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.k === 'spark') q.vy += 120 * dt;
    if (q.life <= 0 || q.y > H + 6 || q.y < -8) {
      P.splice(i, 1);
      continue;
    }
    c.fillStyle = {
      snow: '#fff',
      sand: 'rgba(250,230,170,.8)',
      dust: 'rgba(200,190,170,.35)',
      leaf: '#8fbf4f',
      spark: '#ffd257',
      rain: 'rgba(170,200,255,.7)',
      ember: '#ff9a3c',
      star: 'rgba(255,255,255,.8)',
      bubble: 'rgba(220,245,255,.8)',
      ghost: 'rgba(220,200,255,.35)',
      confetti: pick(['#ff5c7a', '#ffd257', '#5be7ff', '#3fe0a0']),
      steam: 'rgba(255,255,255,.35)',
      fly: '#1a1a1a'
    }[q.k];
    if (q.k === 'rain') c.fillRect(q.x, q.y, 1, 6);
    else c.fillRect(q.x, q.y, q.k === 'snow' ? 2 : 2, 2);
  }
  if (P.length > 300) P.splice(0, P.length - 300);
  if (sp === 'night') {
    c.fillStyle = 'rgba(5,8,20,.72)';
    c.fillRect(0, 0, W, H);
    const r = c.createRadialGradient(W * 0.6, H * 0.6, 4, W * 0.6, H * 0.6, 40);
    r.addColorStop(0, 'rgba(255,240,180,.35)');
    r.addColorStop(1, 'transparent');
    c.fillStyle = r;
    c.fillRect(0, 0, W, H);
  }
  if (sp === 'lowgrav') {
    c.fillStyle = 'rgba(127,224,255,.12)';
    c.fillRect(0, 0, W, H);
  }
  if (S) {
    c.font = '700 22px "Chakra Petch", sans-serif';
    c.textAlign = 'right';
    c.textBaseline = 'top';
    c.fillStyle = S.col;
    c.globalAlpha = 0.6 + Math.sin(winFx.t * 3) * 0.3;
    c.fillText(S.icon, W - 8, 6);
    c.globalAlpha = 1;
  }
  // window frame + blinds
  c.fillStyle = 'rgba(10,16,32,.28)';
  for (let y = 6; y < H; y += 18) c.fillRect(0, y, W, 1.5);
  c.strokeStyle = '#3a4a66';
  c.lineWidth = 4;
  c.strokeRect(2, 2, W - 4, H - 4);
  c.beginPath();
  c.moveTo(W / 2, 0);
  c.lineTo(W / 2, H);
  c.lineWidth = 3;
  c.stroke();
}

/* ---------- bot rival ---------- */
/** Easier bots bolt on only part of what they own, so difficulty changes the car as well as the aim. */
function botBuildFor(P, diff) {
  const frac = DIFF[diff].build,
    inv = {};
  for (const [id, n] of Object.entries(P.inv)) {
    const keepAll = id === 'cockpit' || MOD[id].drive;
    inv[id] = keepAll ? n : Math.floor(n * frac + Math.random() * 0.999);
  }
  return botBuild({ ...P, inv });
}
function prepareBot() {
  if (G.botRound === G.round) return;
  G.botRound = G.round;
  botDraft(G.bot);
  if (DIFF[G.diff].build >= 0.8 || Math.random() < 0.5) botShop(G.bot);
  G.botDesign = botBuildFor(G.bot, G.diff);
  G.botReadyAt = performance.now() + rnd(700, 1800);
}
const botCarCfg = () => ({
  design: packDesign(G.botDesign),
  tune: [...G.bot.tune],
  name: G.bot.name,
  paint: G.oppPaint,
  ctrl: 'bot',
  style: G.bot.style,
  diff: G.diff,
  look: G.oppLook,
  ...runBotExtras()
});

/* ---------- waiting arena ---------- */
function enterWait() {
  G.phase = 'wait';
  updateHUD();
  $('#build').hidden = true;
  $('#arena').hidden = false;
  $('#waitcard').hidden = G.mode === 'sandbox';
  sizeArena();
  B = newB({ net: null, me: 0, theme: THEMES[0] });
  setupField('wait');
  const sp = B.sp[0],
    v = makeCar(myDesign(), 0, sp[0], sp[1], sp[2], { tune: [...G.tune], name: G.name, paint: G.paint });
  v.ctrl = 'local';
  v.look = { ...G.style };
  B.cars = [v];
  cam.x = cam.tx = v.x;
  cam.y = cam.ty = v.y;
  cam.z = cam.tz = 1.8;
  sfx('tele');
  if (G.mode === 'solo') prepareBot();
  if (G.mode === 'mp') {
    G.meReady = true;
    Net.send({ t: 'ready', round: G.round, ...myCarCfg() });
    Net.check();
  }
  setButtons();
  oppStatusUI();
  showTip('wait');
}
function oppReady() {
  if (G.mode === 'solo') return G.botRound === G.round && performance.now() >= G.botReadyAt;
  if (G.mode === 'mp') return !!(Net.oppReady && Net.oppReady.round === G.round);
  return false;
}
/** Status chip plus a thumbnail of the rival's car once they are ready, so you can scout their build. */
function oppStatusUI() {
  const el = $('#oppStatus');
  if (!el) return;
  const r = oppReady(),
    design = r ? (G.mode === 'solo' ? packDesign(G.botDesign) : Net.oppReady && Net.oppReady.design) : null;
  const key_ = r ? G.round + ':' + G.mode : 'no';
  if (el.dataset.k === key_ && !(G.mode === 'mp' && !Net.connected)) return;
  el.dataset.k = key_;
  let thumb = '';
  if (design)
    try {
      thumb = `<img class="oppthumb" src="${designURL(unpackDesign(design), 120, G.oppPaint)}" alt="${esc(G.oppName)}'s car" title="Scout: ${esc(G.oppName)}'s car">`;
    } catch (e) {}
  el.innerHTML = `<span class="dot${r ? '' : ' off'}"></span>${esc(G.oppName)} · ${r ? 'ready' : G.mode === 'mp' && !Net.connected ? 'disconnected' : 'building'}${thumb}`;
  const go = $('#bGo');
  if (go && G.mode === 'solo') go.disabled = !r;
  const sp = $('#waitSpecial');
  if (sp) sp.innerHTML = specialNote(G.round);
}
function setButtons() {
  const el = $('#abtns');
  if (G.phase === 'wait') {
    const right =
      G.mode === 'solo'
        ? `<button class="btn ok" id="bGo">Start round ${G.round}</button>`
        : G.mode === 'mp'
          ? `<button class="btn ok" id="bGo" disabled>Waiting for ${esc(G.oppName)}…</button>`
          : '';
    el.innerHTML = `<div id="waitSpecial" class="waitsp">${specialNote(G.round)}</div><button class="btn ghost" id="bBack">Back to garage</button>${right}`;
  } else if (G.phase === 'battle' && G.mode === 'solo')
    el.innerHTML = `<button class="btn ghost" id="bEnd">Forfeit round</button>`;
  else el.innerHTML = '';
  const bb = $('#bBack');
  if (bb)
    bb.addEventListener('click', () => {
      sfx('ui');
      openBuild();
    });
  const bg = $('#bGo');
  if (bg && G.mode === 'solo')
    bg.addEventListener('click', () => {
      if (B && (B.seq === 'play' || B.seq === 'in') && oppReady())
        launchBattle({ ...makeCfg(botCarCfg()), net: null, me: 0 });
    });
  const be = $('#bEnd');
  if (be)
    be.addEventListener('click', () => {
      if (B && B.seq === 'play') endRound(1 - B.me, `${G.name} forfeited the round.`);
    });
}
function pickTheme() {
  let ti;
  do ti = Math.floor(Math.random() * THEMES.length);
  while (ti === G.lastTheme && THEMES.length > 1);
  G.lastTheme = ti;
  return ti;
}

/* ---------- into battle ---------- */
function launchBattle(cfg) {
  const go = () => showVS(cfg, () => toBattle(cfg));
  if (B && G.phase === 'wait' && (B.seq === 'play' || B.seq === 'in')) {
    B.seq = 'out';
    B.seqT = 0;
    B.onOut = go;
    sfx('tele');
    $('#abtns').innerHTML = '';
  } else go();
}
function showVS(cfg, done) {
  const me = cfg.cars[cfg.me],
    op = cfg.cars[1 - cfg.me],
    th = THEMES[cfg.theme],
    S = cfg.special && SPECIALS[cfg.special];
  const img = c => {
    try {
      return designURL(unpackDesign(c.design), 300, c.paint, (c.look || {}).livery);
    } catch (e) {
      return '';
    }
  };
  const title = c => esc(titleName((c.look || {}).title));
  const after = pointsRemaining(cfg.round),
    mpMe = G.score[0] + roundPoints(cfg.round) > G.score[1] + after,
    mpOp = G.score[1] + roundPoints(cfg.round) > G.score[0] + after;
  const tag =
    cfg.round === ROUNDS
      ? 'FINAL ROUND'
      : mpMe && mpOp
        ? 'MATCH POINT FOR BOTH'
        : mpMe
          ? `MATCH POINT · ${esc(me.name)}`
          : mpOp
            ? `MATCH POINT · ${esc(op.name)}`
            : '';
  $('#ovVS').innerHTML =
    `<div class="vs"><div class="side"><img src="${img(me)}" alt="${esc(me.name)}'s car"><span class="nm" style="color:${me.paint}">${esc(me.name)}</span><span class="ttl">${title(me)}</span><span class="small">${G.score[0]} points</span></div>
    <div class="mid">VS</div>
    <div class="side r"><img src="${img(op)}" alt="${esc(op.name)}'s car"><span class="nm" style="color:${op.paint}">${esc(op.name)}</span><span class="ttl">${title(op)}</span><span class="small">${G.score[1]} points</span></div>
    <div class="meta">${tag ? `<span class="mptag">${tag}</span>` : ''}<span class="label">${G.run ? `Scrap Gauntlet · wave ${cfg.round}${G.run.boss ? ' · BOSS' : ''}` : `Round ${cfg.round} of ${ROUNDS} · ${stakeLine(cfg.round)}`}</span><b style="font-family:var(--f-display);font-size:22px">${th.name}</b><span class="small">${THEME_BLURB[th.id] || ''}</span>
    ${S ? `<div class="vssp" style="--sc:${S.col}"><span class="spi">${S.icon}</span><div><b>SPECIAL ROUND · ${esc(S.name)}</b><span>${esc(S.blurb)}</span></div></div>` : ''}</div></div>`;
  $('#ovVS').hidden = false;
  sfx('vs');
  setTimeout(
    () => {
      $('#ovVS').hidden = true;
      done();
    },
    S ? 3400 : 2600
  );
}
function toBattle(cfg) {
  G.scars = null; // a fresh round: the repair bay has done its job
  try {
    G.lastOppDesign = cfg.cars[1 - cfg.me].design;
    G.oppBadge = validBadge(cfg.cars[1 - cfg.me].look && cfg.cars[1 - cfg.me].look.badge);
  } catch (e) {}
  if (cfg.format) G.format = cfg.format;
  G.phase = 'battle';
  G.meReady = false;
  updateHUD();
  $('#build').hidden = true;
  $('#arena').hidden = false;
  $('#waitcard').hidden = true;
  sizeArena();
  B = newB({
    net: cfg.net,
    me: cfg.me,
    theme: THEMES[cfg.theme],
    t: 90,
    remoteIn: null,
    remoteEdges: new Set(),
    cfg,
    rec: cfg.net !== 'client'
  });
  setupField('battle', deserializeField(cfg.field));
  setupSpecial(cfg.special);
  if (B.theme.grav && !B.grav) B.grav = B.theme.grav;
  B.cars = carsFromCfg(cfg);
  const v = myCar();
  B.flash = 1;
  cam.x = cam.tx = v.x;
  cam.y = cam.ty = v.y;
  cam.z = cam.tz = 1.8;
  setButtons();
  sfx('tele');
  setTimeout(() => B && !B.demo && G.phase === 'battle' && Announcer.round(G.round), 350);
  const bossCar = B.cars.find(c => c.boss);
  if (bossCar) {
    B.banner = { text: 'BOSS FIGHT', col: '#ff5c7a', t: 0, sub: bossCar.name };
    B.shake = 8;
    sfx('vs');
  }
  showTip(cfg.special ? 'specialFight' : 'battle');
}

/* ---------- round end ---------- */
function setEndBanner() {
  const w = B.win,
    points = B.points ?? roundPoints(G.round),
    loss = 2 + G.round;
  B.banner =
    w == null
      ? { text: 'DRAW', col: '#ece8df', t: 0, sub: 'No points this round' }
      : w === B.me
        ? {
            text: 'ROUND WON',
            col: '#5cc38f',
            t: 0,
            sub:
              G.format === 'lives'
                ? `${B.cars[1 - B.me].name} loses ${loss} lives`
                : `+${points} point${points > 1 ? 's' : ''}`
          }
        : {
            text: 'ROUND LOST',
            col: '#e2504a',
            t: 0,
            sub: G.format === 'lives' ? `You lose ${loss} lives` : `${B.cars[w].name} takes ${points}`
          };
  if (!B.demo && !B.replay) Announcer.say(w == null ? 'Draw' : w === B.me ? 'Round won' : 'Round lost');
}
function endRound(win, why) {
  if (!B || B.seq === 'end') return;
  B.win = win;
  B.points = win == null ? 0 : (B.cfg?.awards?.[win] ?? roundPoints(G.round));
  B.why = why;
  B.seq = 'end';
  B.seqT = 0;
  B.ts = 1;
  B.stats = B.cars.map(v => ({
    dealt: Math.round(v.dealt),
    coins: v.coins,
    lost: v.lost.slice(0, 60),
    integ: v.dead ? 0 : +integrity(v).toFixed(3),
    dead: v.dead,
    powers: v.powers || 0,
    damage: v.damageMap || {},
    first: v.firstBreak || null,
    blocked: v.insts.filter(I => I.blocked).map(I => ({ id: I.id, k: I.k, layer: I.layer })),
    src: Object.fromEntries(Object.entries(v.dealtSrc).map(([k, n]) => [k, Math.round(n)])),
    by: Object.fromEntries(Object.entries(v.dealtBy).map(([k, n]) => [k, Math.round(n)]))
  }));
  setEndBanner();
  if (win != null) {
    botSay(B.cars[win], 'win');
    botSay(B.cars[1 - win], 'lose');
  }
  if (B.net === 'host') {
    Net.lastResult = { t: 'result', round: G.round, win, why, points: B.points, stats: B.stats };
    Net.send(Net.lastResult);
  }
  sfx(win === B.me ? 'win' : win == null ? 'ui' : 'lose');
  if (!B.demo) $('#abtns').innerHTML = '';
}
function clientResult(d) {
  if (!B || B.net !== 'client' || B.replay) return;
  B.win = d.win;
  B.points = d.points ?? roundPoints(G.round);
  B.why = d.why;
  B.stats = d.stats;
  B.result = true;
  B.seq = 'end';
  B.seqT = 0;
  B.ts = 1;
  setEndBanner();
  sfx(d.win === B.me ? 'win' : d.win == null ? 'ui' : 'lose');
}

/** A losing player picks one free part from three, so a bad round still moves your car forward. */
function pityOptions() {
  const tags = Object.entries(G.aff)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
  const pool = MODS.filter(m => m.id !== 'cockpit' && m.rar <= 2);
  const out = [];
  while (out.length < 3) {
    const m = wpick(
      pool,
      m => (m.tags.some(t => tags.includes(t)) ? 3 : 1) * (m.rar === 0 ? 1 : m.rar === 1 ? 0.8 : 0.4)
    );
    if (!out.includes(m)) out.push(m);
  }
  return out;
}
function finishBattle() {
  if (B.demo) return demoNext();
  const me = B.me,
    op = 1 - me,
    st = B.stats,
    win = B.win,
    iWon = win === me,
    draw = win == null,
    pts = B.points ?? roundPoints(G.round),
    why = B.why,
    special = B.special,
    S = special && SPECIALS[special];
  G.lastReplay = { cfg: B.cfg, tape: B.tape, me };
  const hadWreck = B.tape.some(s => s.q === 'death');
  G.fun = G.fun || { lost: [0, 0], clutch: [1, 1], wins: [0, 0] };
  G.fun.lost[0] += (st[me].lost || []).length;
  G.fun.lost[1] += (st[op].lost || []).length;
  if (iWon) {
    G.fun.clutch[0] = Math.min(G.fun.clutch[0], st[me].integ);
    G.fun.wins[0]++;
  } else if (!draw) {
    G.fun.clutch[1] = Math.min(G.fun.clutch[1], st[op].integ);
    G.fun.wins[1]++;
  }
  if (iWon && hadWreck) G.bestReplay = G.lastReplay;
  if (!draw) {
    G.score[iWon ? 0 : 1] += pts;
    if (G.format === 'lives') G.lives[iWon ? 1 : 0] = Math.max(0, G.lives[iWon ? 1 : 0] - 2 - G.round);
    const winner = iWon ? 0 : 1;
    G.bountyStreak = G.bountyWinner === winner ? (G.bountyStreak || 0) + 1 : 1;
    G.bountyWinner = winner;
  }
  G.maxDeficit = Math.max(G.maxDeficit, G.score[1] - G.score[0]);
  const designIds = [...G.base.values(), ...G.top.values()].map(e => e.id),
    econ = 1 + (synergyOf(designIds).aura.coins || 0);
  const lucky = Math.min(2, [...G.top.values()].filter(e => e.id === 'horseshoe').length);
  const base = (draw ? 95 : iWon ? 110 : 80) + (iWon && G.format === 'bounty' ? Math.max(0, pts - 1) * 15 : 0),
    bonus = Math.min(40, Math.floor(st[me].dealt / 40)),
    found = st[me].coins,
    mult = (1 + 0.25 * lucky) * econ * ((S && S.coins) || 1) * (G.run && G.run.relics.includes('dice') ? 1.3 : 1),
    total = Math.round((base + bonus + found) * mult);
  addCoins(total);
  if (!iWon && !draw) G.freeRerolls++;
  if (G.mode === 'solo') {
    const bw = win === op;
    G.bot.coins += Math.round(
      ((draw ? 95 : bw ? 110 : 80) + Math.min(40, Math.floor(st[op].dealt / 40)) + st[op].coins) * ((S && S.coins) || 1)
    );
    if (!bw && !draw) gainP(G.bot, pick(MODS.filter(m => m.rar <= 2 && m.id !== 'cockpit')).id, 1);
  }
  G.log.push({
    round: G.round,
    win: iWon,
    draw,
    dealt: st[me].dealt,
    taken: st[op].dealt,
    coins: total,
    pts: draw ? 0 : pts,
    special
  });
  const prog = progressRound({
    win: iWon,
    special,
    integ: st[me].integ,
    by: st[me].by || {},
    powers: st[me].powers || 0
  });
  G.srcTotals = G.srcTotals || {};
  for (const [k, n] of Object.entries(st[me].src || {})) G.srcTotals[k] = (G.srcTotals[k] || 0) + n;
  const top = topSource(st[me].src);
  B = null;
  G.phase = 'result';
  updateHUD();
  $('#arena').hidden = true;
  $('#build').hidden = false;
  const runInfo = G.run ? runWaveDone(iWon, draw) : null;
  const lead = G.score[0] - G.score[1],
    left = runInfo ? 99 : ptsLeft(),
    decided = runInfo
      ? runInfo.over
      : G.round >= ROUNDS ||
        (G.format === 'lives' ? Math.min(...G.lives) <= 0 : G.format === 'bounty' ? false : Math.abs(lead) > left);
  const cnt = {};
  for (const id of st[me].lost) cnt[id] = (cnt[id] || 0) + 1;
  const lostHtml = Object.entries(cnt)
    .map(([id, n]) => `<span>${esc(MOD[id] ? MOD[id].name : id)}${n > 1 ? ' ×' + n : ''}</span>`)
    .join('');
  const outlook = runInfo
    ? runInfo.text
    : G.format === 'lives'
      ? decided
        ? 'The lives contest is over.'
        : `${G.lives[0]}–${G.lives[1]} lives left. Next defeat costs ${3 + G.round} lives.`
      : G.format === 'bounty'
        ? decided
          ? 'That was the last round.'
          : `Defeat the leader for up to 3 points (never more than the gap) and bonus scrap. ${ROUNDS - G.round} rounds left.`
        : decided
          ? G.round >= ROUNDS
            ? 'That was the last round.'
            : lead > 0
              ? 'You have clinched the match. The rest of the points cannot catch you.'
              : `${esc(G.oppName)} has clinched the match.`
          : `${left} points still on the table. Next round is worth ${roundPoints(G.round + 1)} point${roundPoints(G.round + 1) > 1 ? 's' : ''}.`;
  const pity = !iWon && !draw && !decided ? pityOptions() : [];
  const roundLbl = G.run
      ? `Scrap Gauntlet · wave ${G.round}${G.run.boss ? ' · BOSS' : ''}`
      : `Round ${G.round} of ${ROUNDS}`,
    scoreHTML = G.run
      ? heartsHTML()
      : `<span class="sw" style="background:${G.paint};width:14px;height:14px"></span><span class="me">${G.format === 'lives' ? '♥ ' + G.lives[0] : G.score[0]}</span>–<span class="op">${G.format === 'lives' ? G.lives[1] + ' ♥' : G.score[1]}</span><span class="sw" style="background:${G.oppPaint};width:14px;height:14px"></span>`;
  $('#resultCard').innerHTML =
    `<span class="label">${roundLbl}${S ? ' · ' + esc(S.name) : ''}</span><h2 style="color:${iWon ? '#5cc38f' : draw ? '#ece8df' : '#e2504a'}">${iWon ? (G.run ? 'Wave cleared' : 'Round won') : draw ? 'Draw' : G.run ? 'Wave lost' : 'Round lost'}</h2><p>${esc(why || '')}</p>
    <div class="score" style="justify-content:center;font-size:28px">${scoreHTML}</div>
    <p class="small" style="text-align:center">${outlook}</p>
    <div class="rbtns">${hadWreck ? '<button class="btn ghost" id="btnKillcam">Kill-cam</button>' : ''}<button class="btn ghost" id="btnReplay">Watch replay</button></div>
    <div class="bigcoin" id="coinCount">+0</div>
    <div class="ledger"><div><span>${iWon ? 'Winner’s purse' : draw ? 'Split purse' : 'Comeback money'}</span><span class="coin">${base}</span></div><div><span>Damage bonus (${st[me].dealt} dealt, ${st[op].dealt} taken)</span><span class="coin">${bonus}</span></div><div><span>Coins grabbed in the arena</span><span class="coin">${found}</span></div>${top ? `<div><span>Top weapon this round</span><span>${esc(top[0])} · ${top[1]} dmg</span></div>` : ''}${lucky ? `<div><span>Lucky Horseshoe ×${lucky}</span><span>+${lucky * 25}%</span></div>` : ''}${econ > 1 ? `<div><span>Scrap economy synergy</span><span>+${Math.round((econ - 1) * 100)}%</span></div>` : ''}${S && S.coins ? `<div><span>${esc(S.name)}</span><span>×${S.coins}</span></div>` : ''}
    ${!iWon && !draw ? '<div class="good"><span>Underdog bonus</span><span>1 free draft reroll</span></div>' : ''}
    <div class="good"><span>Repair bay</span><span>Every part rebuilt for free</span></div></div>
    ${pity.length ? `<span class="label">Underdog pick · take one part for free</span><div class="pity">${pity.map(m => `<button class="pick r${m.rar}" data-id="${m.id}" style="--rc:${RAR[m.rar].col}"><img src="${iconURL(m.id, 64)}" alt=""><b>${esc(m.name)}</b><span>${esc(RAR[m.rar].name)}</span></button>`).join('')}</div>` : ''}
    ${lostHtml ? `<span class="label">Destroyed this round</span><div class="lostlist">${lostHtml}</div>` : ''}
    ${progressHtml(prog)}
    ${decided ? '' : G.run ? runNextUpHTML() : nextUpHTML(G.round + 1)}
    <button class="btn" id="btnNext">${decided ? (G.run ? 'See how far you got' : 'See match result') : runInfo && runInfo.relic ? 'Claim your relic' : 'Pick your next part'}</button>`;
  $('#ovResult').hidden = false;
  G.scars = { ...(st[me].damage || {}) };
  (
    document.querySelector('#resultCard .nextup') ||
    document.querySelector('#btnNext') ||
    $('#resultCard')
  ).insertAdjacentHTML(
    document.querySelector('#resultCard .nextup') || document.querySelector('#btnNext') ? 'beforebegin' : 'beforeend',
    reviewHTML(st[me])
  );
  $$('#resultCard [data-review]').forEach(b => (b.onclick = () => openGarageReport(st[me], b.dataset.review)));
  sfx('coin');
  let shown = 0;
  const step = () => {
    shown = Math.min(total, shown + Math.max(1, Math.ceil(total / 30)));
    const el = $('#coinCount');
    if (el) el.textContent = '+' + shown;
    if (shown < total) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  $$('#resultCard .pick').forEach(b =>
    b.addEventListener('click', () => {
      if (b.disabled) return;
      gainWithSupport(b.dataset.id, 1);
      sfx('coin');
      $$('#resultCard .pick').forEach(x => {
        x.disabled = true;
        x.classList.toggle('taken', x === b);
      });
    })
  );
  const kc = $('#btnKillcam');
  if (kc) kc.addEventListener('click', () => startReplay('kill'));
  $('#btnReplay').addEventListener('click', () => startReplay('full'));
  $('#btnNext').addEventListener('click', () => {
    sfx('ui');
    $('#ovResult').hidden = true;
    if (runInfo) runNext(decided, runInfo.relic);
    else if (decided) showFinal();
    else {
      G.round++;
      updateHUD();
      openDraft();
    }
  });
}
function showFinal() {
  G.phase = 'final';
  updateHUD();
  const s = G.score,
    tot = G.log.reduce((a, r) => ({ d: a.d + r.dealt, t: a.t + r.taken, w: a.w + (r.win ? 1 : 0) }), {
      d: 0,
      t: 0,
      w: 0
    });
  const won =
      G.format === 'lives'
        ? G.lives[0] > G.lives[1] || (G.lives[0] === G.lives[1] && tot.d > tot.t)
        : s[0] > s[1] || (s[0] === s[1] && tot.d > tot.t),
    tie = G.format === 'lives' ? G.lives[0] === G.lives[1] : s[0] === s[1];
  const prog = progressMatch({ won });
  const br =
    Object.entries(G.aff)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => TAGS[t])
      .join(' + ') || 'Scrap';
  $('#resultCard').innerHTML =
    `<span class="label">${esc(MATCH_FORMATS[G.format].name)} · Match over${tie ? ' · tie broken on damage dealt' : ''}</span><h2 style="color:${won ? '#5cc38f' : '#e2504a'}">${won ? 'Victory' : 'Defeat'}</h2>
    ${podiumHTML(won)}
    <div class="score" style="justify-content:center;font-size:34px"><span class="me">${G.format === 'lives' ? '♥ ' + G.lives[0] : s[0]}</span>–<span class="op">${G.format === 'lives' ? G.lives[1] + ' ♥' : s[1]}</span></div>
    ${funAwardsHTML()}
    <p>${G.format === 'lives' ? `Lives remaining (♥): ${G.lives[0]}–${G.lives[1]}, rounds won ${s[0]}–${s[1]}. ` : ''}${esc(G.name)} vs ${esc(G.oppName)}. You won ${tot.w} of ${G.log.length} rounds with a ${esc(br)} build, dealt ${tot.d.toLocaleString()} damage and took ${tot.t.toLocaleString()}.</p>
    <div class="ledger">${G.log.map(r => `<div><span>Round ${r.round}${r.special ? ' · ' + esc(SPECIALS[r.special].name) : ''}</span><span>${G.format === 'lives' ? (r.win ? `won · rival −${2 + r.round} ♥` : r.draw ? 'draw' : `lost · −${2 + r.round} ♥`) : r.win ? 'won +' + r.pts : r.draw ? 'draw' : 'lost'} · ${r.dealt} dmg</span></div>`).join('')}</div>
    ${(() => {
      const mvp = topSource(G.srcTotals);
      return mvp
        ? `<p class="small">MVP part of the match: <b>${esc(mvp[0])}</b> with ${mvp[1].toLocaleString()} damage.</p>`
        : '';
    })()}
    ${progressHtml(prog)}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${G.bestReplay ? '<button class="btn ghost" id="btnBest">▶ Best moment</button>' : ''}${G.mode === 'solo' ? '<button class="btn" id="btnAgain">Rematch</button>' : ''}<button class="btn ghost" id="btnStyle2">Garage Style</button><button class="btn ghost" id="btnHome">Main menu</button></div>`;
  $('#ovResult').hidden = false;
  sfx(won ? 'win' : 'lose');
  const a = $('#btnAgain');
  if (a) a.addEventListener('click', () => startMatch('solo', null, G.format));
  const bm = $('#btnBest');
  if (bm) bm.addEventListener('click', () => startReplay('kill', G.bestReplay));
  if (won && SETTINGS.motion !== false)
    setTimeout(() => {
      const r = $('#resultCard').getBoundingClientRect && $('#resultCard').getBoundingClientRect();
      if (r) {
        GFX.start($('#resFx'));
        GFX.confetti(r.left + r.width / 2, r.top + 80, 120);
      }
    }, 200);
  Announcer.say(won ? 'Victory' : 'Defeat');
  $('#btnStyle2').addEventListener('click', () => openStyle(() => ($('#ovResult').hidden = false)));
  $('#btnHome').addEventListener('click', () => {
    if (G.mode === 'mp') Net.close();
    showMenu();
  });
}

/** Both cars side by side on a podium, winner on the high step. */
function finalCars() {
  const R = G.lastReplay;
  if (!R || !R.cfg || !R.cfg.cars) return null;
  return R.cfg.cars.map((c, i) => ({ c, d: unpackDesign(c.design), mine: i === R.me }));
}
function podiumHTML(won) {
  const cars = finalCars();
  if (!cars) return '';
  const me = cars.find(x => x.mine),
    op = cars.find(x => !x.mine);
  const card = (x, first) => {
    let src = '';
    try {
      src = designURL(x.d, 160, x.c.paint, x.c.look && x.c.look.livery);
    } catch (e) {}
    return `<div class="pd ${first ? 'first' : 'second'}">${badgeHTML(x.mine ? G.style.badge : x.c.look && x.c.look.badge, 26)}<img alt="" src="${src}"><b>${esc(x.c.name || (x.mine ? G.name : G.oppName))}</b><span class="step">${first ? 1 : 2}</span></div>`;
  };
  return `<canvas class="gfx" id="resFx"></canvas><div class="podium">${won ? card(op, false) + card(me, true) : card(me, false) + card(op, true)}</div>`;
}
/** Playful end-of-match titles; the loser can earn one too. */
function funAwards() {
  const cars = finalCars(),
    F = G.fun || { lost: [0, 0], clutch: [1, 1], wins: [0, 0] },
    out = [];
  const names = [G.name, G.oppName];
  const stat = d => {
    const xs = [],
      es = [...d.base.values(), ...d.top.values()];
    for (const e of d.base.values()) for (const [x] of footprint(e.id, e.rot, e.x, e.y)) xs.push(x);
    return {
      w: xs.length ? Math.max(...xs) - Math.min(...xs) + 1 : 0,
      mass: es.reduce((a, e) => a + (MOD[e.id] ? MOD[e.id].mass : 0), 0),
      parts: es.length
    };
  };
  const S = cars ? [stat(cars.find(x => x.mine).d), stat(cars.find(x => !x.mine).d)] : null;
  const add = (who, icon, title, why) => out.push({ who, icon, title, why });
  if (S && S[0].w !== S[1].w) {
    const w = S[0].w > S[1].w ? 0 : 1;
    add(w, '↔', 'Widest Ride', `${S[w].w} cells wide. Needs two parking spots.`);
  }
  if (F.clutch[0] <= 0.05 || F.clutch[1] <= 0.05) {
    const w = F.clutch[0] <= F.clutch[1] ? 0 : 1;
    add(w, '🩹', 'Survived on 1 HP', 'Won a round held together by hope.');
  }
  if (F.lost[0] !== F.lost[1]) {
    const w = F.lost[0] > F.lost[1] ? 0 : 1;
    add(w, '🔩', 'Scrap Donor', `Lost ${F.lost[w]} parts. The arena thanks you.`);
  }
  if (S && Math.abs(S[0].mass - S[1].mass) > 3) {
    const w = S[0].mass > S[1].mass ? 0 : 1;
    add(w, '🐘', 'Absolute Unit', `${Math.round(S[w].mass)} tonnes of pure stubbornness.`);
  }
  const dealt = [G.log.reduce((a, r) => a + r.dealt, 0), G.log.reduce((a, r) => a + r.taken, 0)];
  if (dealt[0] !== dealt[1]) {
    const w = dealt[0] > dealt[1] ? 0 : 1;
    add(w, '🔨', 'Demolition Crew', `${dealt[w].toLocaleString()} damage dealt.`);
  }
  out.splice(4);
  for (const w of [0, 1])
    if (!out.some(a => a.who === w)) add(w, '🏅', 'Participation Trophy', 'Shiny, plastic and all yours.');
  return out.map(a => ({ ...a, name: names[a.who] }));
}
function funAwardsHTML() {
  const A = funAwards();
  return A.length
    ? `<div class="funawards">${A.map(a => `<div class="fa"><i>${a.icon}</i><b>${esc(a.title)}</b><span>${esc(a.name)} · ${esc(a.why)}</span></div>`).join('')}</div>`
    : '';
}
/** Biggest damage source from a {source: damage} map, as [display name, damage]. */
function topSource(src) {
  const best = Object.entries(src || {}).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 1) return null;
  const m = MOD[best[0]];
  return [
    m ? m.name : { crash: 'Crashes', expl: 'Explosions', fire: 'Fire', melee: 'Blades' }[best[0]] || best[0],
    Math.round(best[1])
  ];
}
