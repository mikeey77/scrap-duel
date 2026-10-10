// Between-round draft, mystery crate and the module codex.
/* =================== DRAFT =================== */
const affOf = (m, P = G) => m.tags.reduce((s, t) => s + (P.aff[t] || 0), 0);
const topTag = (m, P = G) => m.tags.slice().sort((a, b) => (P.aff[b] || 0) - (P.aff[a] || 0))[0];
function rollRar(boost = 0) {
  const w = RAR.map((r, i) => r.w * (i >= 2 ? 1 + (G.round - 1) * 0.09 + boost : 1));
  let t = w.reduce((a, b) => a + b, 0),
    x = Math.random() * t;
  for (let i = 0; i < 5; i++) {
    x -= w[i];
    if (x <= 0) return i;
  }
  return 0;
}
function modOfRar(pool, rar, wf) {
  for (let d = 0; d < 5; d++) {
    for (const r of [rar - d, rar + d]) {
      const p = pool.filter(m => m.rar === r);
      if (p.length) return wf ? wpick(p, wf) : pick(p);
    }
  }
  return null;
}
let draftRerolls = 0,
  curOpts = null;
function draftOptions(P = G) {
  const all = MODS.filter(m => m.id !== 'cockpit'),
    used = new Set(),
    opts = [];
  const tunes = TUNE.filter(t => P.found.has(t.mod) && !P.tune.has(t.id));
  const mod = (m, slot, why) => {
    used.add(m.id);
    opts.push({
      type: 'module',
      id: m.id,
      rar: m.rar,
      n: RAR[m.rar].copies,
      slot,
      why,
      isNew: !P.found.has(m.id)
    });
  };
  if ((G.round === 1 && !P.log) || G.log.length) {
    const seen = new Set();
    for (let i = 0; i < 3; i++) {
      const pool = all.filter(
        m => !used.has(m.id) && !P.found.has(m.id) && m.tags.length && !m.tags.some(t => seen.has(t)) && m.rar <= 2
      );
      const m = modOfRar(pool, rollRar()) || pick(all.filter(x => !used.has(x.id)));
      m.tags.forEach(t => seen.add(t));
      mod(m, 'Starting branch', m.tags.map(t => TAGS[t]).join(' · '));
    }
    return opts;
  }
  // 1 · your build
  const r1 = rollRar();
  const sup = all.filter(m => !used.has(m.id) && affOf(m, P) > 0);
  const tsup = tunes.filter(t => MOD[t.mod].tags.some(tag => P.aff[tag]));
  if (tsup.length && Math.random() < 0.3) {
    const t = wpick(tsup, t => 1 + affOf(MOD[t.mod], P));
    used.add(t.id);
    opts.push({
      type: 'tune',
      id: t.id,
      rar: Math.max(1, MOD[t.mod].rar),
      slot: 'Your build',
      why: `Tunes your ${MOD[t.mod].name}`
    });
  } else {
    const m = modOfRar(sup.length ? sup : all, r1, m => 1 + affOf(m, P) * 2);
    mod(m, 'Your build', m.tags.length && affOf(m, P) ? `Fits your ${TAGS[topTag(m, P)]} branch` : 'Solid pick');
  }
  // 2 · new direction
  let nd = all.filter(m => !used.has(m.id) && affOf(m, P) === 0);
  if (!nd.length) nd = all.filter(m => !used.has(m.id));
  {
    const m = modOfRar(nd, rollRar());
    mod(m, 'New direction', m.tags.length ? `Starts a ${TAGS[m.tags[0]]} branch` : 'A change of pace');
  }
  // 3 · wildcard
  const r3 = rollRar(),
    x = Math.random(),
    shapes = SHAPES.map(s => ({ s, cells: shapeCells(s, P.ws) })).filter(v => v.cells.size);
  if (x < 0.38 && shapes.length) {
    const near = shapes.filter(v => Math.abs(v.s.rar - r3) <= 1);
    const v = pick(near.length ? near : shapes);
    opts.push({
      type: 'ws',
      id: v.s.id,
      cells: v.cells,
      rar: v.s.rar,
      slot: 'Wildcard',
      why: `+${v.cells.size} bay cells`
    });
  } else if (x < 0.58 && tunes.filter(t => !used.has(t.id)).length) {
    const t = pick(tunes.filter(t => !used.has(t.id)));
    opts.push({
      type: 'tune',
      id: t.id,
      rar: Math.max(1, MOD[t.mod].rar),
      slot: 'Wildcard',
      why: `Tunes your ${MOD[t.mod].name}`
    });
  } else if (x < 0.8) {
    const items = {},
      n = [4, 4, 5, 5, 6][r3];
    for (let i = 0; i < n; i++) {
      const m = modOfRar(all, i === 0 ? r3 : Math.floor(Math.random() * (r3 + 1)));
      items[m.id] = (items[m.id] || 0) + 1;
    }
    opts.push({ type: 'salvage', items, rar: r3, slot: 'Wildcard', why: 'A mixed haul' });
  } else
    opts.push({
      type: 'coins',
      n: [45, 70, 100, 150, 240][r3],
      rar: r3,
      slot: 'Wildcard',
      why: 'Spend it in the shop'
    });
  // your own gear can turn up instead of the wildcard (single player only)
  if (P === G && gearActive()) {
    const miss = gearMissing(),
      none = !Object.keys(G.gearFound || {}).length;
    if (miss.length && (Math.random() < 0.4 || (none && G.round >= 3))) {
      const g = wpick(miss, g => g.lvl * g.lvl + (g.q ? 2 : 0));
      opts[2] = {
        type: 'gear',
        u: g.u,
        id: g.id,
        rar: Math.max(MOD[g.id].rar, Math.min(4, g.lvl - 1)),
        slot: 'Your gear',
        why: 'Found in the scrap: your own tuned part'
      };
    }
  }
  return opts;
}
function optView(o) {
  const R = RAR[o.rar];
  if (o.type === 'module') {
    const m = MOD[o.id];
    return {
      kind: `${R.name} module`,
      img: `<img alt="" src="${iconURL(m.id, 184)}"><span class="x">×${o.n}</span>`,
      title: m.name,
      body: `<p>${esc(m.desc)}</p><p class="con">− ${esc(m.con)}</p>${draftSupportCount(m.id, o.n) ? `<p class="mount-gift">Includes ${draftSupportCount(m.id, o.n)} ${m.mnt > 1 ? 'heavy' : 'light'} support block(s), ready to mount.</p>` : ''}<div class="opt-meta">${socketBadge(m)}${statChips(m)}</div>`,
      isNew: o.isNew
    };
  }
  if (o.type === 'tune') {
    const t = TUNEMAP[o.id];
    return {
      kind: 'Tuning',
      img: `<img alt="" src="${iconURL(t.mod, 184)}"><span class="x">▲</span>`,
      title: t.name,
      body: `<p class="pro">+ ${esc(t.pro)}</p><p class="con">− ${esc(t.con)}</p><p class="small">Applies to every ${esc(MOD[t.mod].name)}</p>`
    };
  }
  if (o.type === 'gear') {
    const g = gearById(o.u),
      m = MOD[o.id],
      q = g && g.q ? QUIRKS[g.q] : null;
    return {
      kind: g && g.lvl >= GEAR_MAX ? 'Masterwork gear' : 'Personal gear',
      img: `<img alt="" src="${iconURL(m.id, 184)}"><span class="x gearlv">+${g ? g.lvl - 1 : 0}</span>`,
      title: g ? gearName(g) : m.name,
      body: `<p class="pro">+ ${Math.round(gearBonus(g || { id: o.id, lvl: 1 }) * 100)}% ${GEAR_KIND_TEXT[gearKind(o.id)]}</p>${q ? `<p class="pro">+ ${esc(q.name)}: ${esc(q.pro)}</p><p class="con">− ${esc(q.con)}</p>` : ''}<p class="small">One copy. Upgrade it in the Garage.</p>`
    };
  }
  if (o.type === 'ws') {
    const s = SHAPES.find(x => x.id === o.id);
    return {
      kind: 'Bay expansion',
      img: `<img class="wide" alt="" src="${shapeURL(o.cells)}">`,
      title: s.name,
      body: `<p>${esc(s.desc)}</p><p class="small">New cells in yellow · worth <span class="coin">${shapePrice(o.cells.size)}</span></p>`
    };
  }
  if (o.type === 'salvage')
    return {
      kind: `${R.name} salvage`,
      img: `<img alt="" src="${crateURL()}">`,
      title: ['Scrap Pile', 'Salvage Crate', 'Military Surplus', 'Prototype Cache', 'Black Box'][o.rar],
      body: `<p>${Object.entries(o.items)
        .map(([id, n]) => `<span style="color:${RAR[MOD[id].rar].col}">${n}× ${esc(MOD[id].name)}</span>`)
        .join(', ')}</p>`
    };
  return {
    kind: 'Payout',
    img: `<span class="bigcoin">${o.n}</span>`,
    title: 'Scrap Payout',
    body: `<p><span class="coin">${o.n}</span> straight into your pocket.</p>`
  };
}
function openDraft(fresh = true) {
  G.phase = 'draft';
  updateHUD();
  if (fresh) draftRerolls = 0;
  const opts = draftOptions();
  curOpts = opts;
  const first = G.round === 1 && !G.log.length;
  const free = G.freeRerolls > 0,
    cost = free ? 0 : 15 + draftRerolls * 10;
  const best = Math.max(...opts.map(o => o.rar));
  $('#ovDraft').innerHTML =
    `<div class="draft"><header><span class="label">${first ? 'Starter kit: same chassis, randomized basic weapons' : 'Round ' + (G.round - 1) + ' done · win or lose, everyone drafts'}</span><h2>${first ? 'Pick a starting branch' : 'Pick a branch'}</h2><p class="small">${first ? 'Each card opens a different style. Later drafts lean toward what you take.' : 'One card fits your build, one opens a new direction, one is a wildcard.'}</p>${specialNote(G.round)}</header>
  <div class="opts">${opts
    .map((o, i) => {
      const v = optView(o);
      return `<button class="opt r${o.rar}" data-i="${i}" style="--rc:${RAR[o.rar].col};--i:${i}">${v.isNew ? '<span class="new">NEW</span>' : ''}<span class="top"><span class="slot">${esc(o.slot)}</span><span class="kind">${esc(v.kind)}</span></span><span class="art">${v.img}</span><h3>${esc(v.title)}</h3>${v.body}<p class="small why">${esc(o.why)}</p></button>`;
    })
    .join('')}</div>
  <div class="dfoot"><button class="btn ghost" id="btnReroll" ${G.coins < cost ? 'disabled' : ''}>${free ? `Free reroll (${G.freeRerolls} left)` : `Reroll all three · <span class="coin">${cost}</span>`}</button>${first ? '' : `<button class="btn ghost" id="btnSkip">Skip and take <span class="coin">35</span></button>`}<span class="small">You have <span class="coin">${G.coins}</span></span></div></div>`;
  const ov = $('#ovDraft');
  ov.hidden = false;
  ov.classList.remove('legend');
  if (best >= 4) {
    void ov.offsetWidth;
    ov.classList.add('legend');
    setTimeout(() => sfx('legend'), 500);
  }
  opts.forEach((o, i) => setTimeout(() => sfx('flip'), 220 * i + 100));
  $$('#ovDraft .opt').forEach(b => b.addEventListener('click', () => takeOption(opts[+b.dataset.i])));
  $('#btnReroll').addEventListener('click', () => {
    if (G.coins < cost) return;
    sfx('ui');
    if (free) G.freeRerolls--;
    else {
      addCoins(-cost);
      draftRerolls++;
    }
    openDraft(false);
  });
  const sk = $('#btnSkip');
  if (sk)
    sk.addEventListener('click', () => {
      addCoins(35);
      $('#ovDraft').hidden = true;
      openBuild();
    });
}
function takeOption(o) {
  sfx('coin');
  if (o.type === 'module') {
    gainWithSupport(o.id, o.n);
    addAff(o.id, 0.5);
    G.sel = o.id;
  } else if (o.type === 'tune') {
    G.tune.add(o.id);
    addAff(TUNEMAP[o.id].mod, 0.5);
  } else if (o.type === 'gear') {
    const g = gearById(o.u);
    if (g) findGear(g);
    G.sel = o.id;
  } else if (o.type === 'ws') {
    for (const k of o.cells) G.ws.add(k);
  } else if (o.type === 'salvage') {
    for (const id in o.items) gainWithSupport(id, o.items[id]);
  } else addCoins(o.n);
  $('#ovDraft').hidden = true;
  openBuild();
}

/* =================== MYSTERY CRATE =================== */
/* =================== GAMBLING: SCRAP CRATE + PRIZE WHEEL ===================
   Two ways to gamble coins in the shop.
   - Scrap Crate (cheap): mostly common parts, but 1 in 100 opens the golden JACKPOT.
   - Prize Wheel (expensive): every slice is rare or better, with a thin Legendary
     slice and a tiny MEGA slice.
   The prize is decided and added to your inventory before the show starts, so
   skipping or closing can never lose or duplicate it. The show itself is long on
   purpose: shake, lid pop, a slowing reel with ticks and a near-miss, or a spinning
   wheel with chasing lights and a flapping pointer. */
let crateBusy = false;
const WHEEL_COST = 180,
  CRATE_W = [62, 28, 8.5, 1.5, 0],
  JACKPOT_P = 0.01,
  WHEEL_SEGS = [
    { kind: 'mod', rar: 2, n: 2, w: 3 },
    { kind: 'mod', rar: 3, n: 1, w: 2 },
    { kind: 'coins', n: 250, w: 2 },
    { kind: 'mod', rar: 2, n: 2, w: 3 },
    { kind: 'mod', rar: 3, n: 1, w: 2 },
    { kind: 'mod', rar: 4, n: 1, w: 1 },
    { kind: 'mod', rar: 2, n: 2, w: 3 },
    { kind: 'coins', n: 400, w: 1 },
    { kind: 'mod', rar: 3, n: 1, w: 2 },
    { kind: 'mega', w: 0.6 },
    { kind: 'mod', rar: 2, n: 2, w: 3 },
    { kind: 'mod', rar: 3, n: 1, w: 2 }
  ];
const segLabel = g =>
  g.kind === 'coins'
    ? `${g.n}`
    : g.kind === 'mega'
      ? 'MEGA'
      : g.rar === 4
        ? 'LEGEND'
        : RAR[g.rar].name + (g.n > 1 ? ' ×2' : '');
const segCol = g => (g.kind === 'coins' ? '#ffd257' : g.kind === 'mega' ? '#ff5c7a' : RAR[g.rar].col);
/** Pick a module of a rarity, leaning towards ones you have not found yet. */
function lootOf(rar) {
  const all = MODS.filter(m => m.id !== 'cockpit');
  const fresh = all.filter(m => m.rar === rar && !G.found.has(m.id));
  if (fresh.length && Math.random() < 0.6) return pick(fresh);
  return modOfRar(all, rar);
}
function grantAch(id) {
  if (PROG.ach.includes(id)) return false;
  PROG.ach.push(id);
  saveProg();
  return true;
}

/* ---------- shared particle show on a full-screen canvas ---------- */
const GFX = {
  cv: null,
  parts: [],
  run: false,
  start(cv) {
    this.cv = cv;
    this.parts = [];
    const d = dprOf(),
      r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
    if (this.run) return;
    this.run = true;
    let last = performance.now();
    const frame = t => {
      if (!this.cv || !this.cv.isConnected) return (this.run = false);
      const dt = Math.min(0.05, (t - last) / 1000),
        c = this.cv.getContext('2d'),
        d2 = dprOf();
      last = t;
      c.setTransform(d2, 0, 0, d2, 0, 0);
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.t += dt;
        if (p.t > p.life) {
          this.parts.splice(i, 1);
          continue;
        }
        p.vy += (p.g || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a = (p.a || 0) + (p.va || 0) * dt;
        const k = 1 - p.t / p.life;
        c.save();
        c.globalAlpha = Math.min(1, k * 1.5);
        c.translate(p.x, p.y);
        c.rotate(p.a);
        if (p.k === 'ray') {
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(0, 0, p.len, 0);
          g.addColorStop(0, p.col);
          g.addColorStop(1, 'transparent');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(p.len, -p.wd);
          c.lineTo(p.len, p.wd);
          c.closePath();
          c.fill();
        } else if (p.k === 'coin') {
          c.scale(Math.cos(p.t * 9 + p.ph), 1);
          circ(c, 0, 0, p.r, '#ffd257', '#a87908', 2);
          c.fillStyle = '#a87908';
          c.fillRect(-1, -p.r * 0.5, 2, p.r);
        } else if (p.k === 'conf') {
          c.fillStyle = p.col;
          c.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        } else if (p.k === 'ring') {
          c.strokeStyle = p.col;
          c.lineWidth = 4 * k;
          c.beginPath();
          c.arc(0, 0, p.r + (1 - k) * p.grow, 0, 7);
          c.stroke();
        } else if (p.k === 'smoke') {
          c.globalAlpha = k * 0.8;
          circ(c, 0, 0, p.r * (1.6 - k * 0.6), p.col);
        } else {
          c.globalCompositeOperation = 'lighter';
          circ(c, 0, 0, p.r * (0.5 + k * 0.5), p.col);
        }
        c.restore();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  burst(x, y, col, n = 40, power = 420) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        sp = power * (0.3 + Math.random());
      this.parts.push({
        k: 'spark',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: 500,
        life: 0.7 + Math.random() * 0.8,
        t: 0,
        r: 2 + Math.random() * 3,
        col
      });
    }
    this.parts.push({ k: 'ring', x, y, vx: 0, vy: 0, life: 0.7, t: 0, r: 30, grow: 260, col });
  },
  rays(x, y, col, n = 14, life = 2.4) {
    for (let i = 0; i < n; i++)
      this.parts.push({
        k: 'ray',
        x,
        y,
        vx: 0,
        vy: 0,
        a: (i / n) * Math.PI * 2,
        va: 0.6,
        life,
        t: 0,
        len: 420 + Math.random() * 260,
        wd: 18 + Math.random() * 16,
        col
      });
  },
  confetti(x, y, n = 80) {
    const cols = ['#5be7ff', '#ffb423', '#ff5c7a', '#3fe0a0', '#c58bff', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2,
        sp = 380 + Math.random() * 420;
      this.parts.push({
        k: 'conf',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: 620,
        a: Math.random() * 6,
        va: (Math.random() - 0.5) * 16,
        life: 2 + Math.random(),
        t: 0,
        r: 4 + Math.random() * 4,
        col: pick(cols)
      });
    }
  },
  coins(w, n = 90) {
    for (let i = 0; i < n; i++)
      this.parts.push({
        k: 'coin',
        x: Math.random() * w,
        y: -20 - Math.random() * 500,
        vx: (Math.random() - 0.5) * 60,
        vy: 120 + Math.random() * 160,
        g: 380,
        life: 3.2,
        t: 0,
        r: 7 + Math.random() * 6,
        ph: Math.random() * 6
      });
  }
};

/** The reveal card both shows end in. */
function gambleResult(prize, again) {
  const m = prize.mod && MOD[prize.mod],
    col = prize.jackpot ? '#ffd257' : m ? RAR[m.rar].col : '#ffd257';
  const body = prize.jackpot
    ? `<span class="tag" style="color:${col}">JACKPOT · 1 in 100</span><h2>${esc(m.name)} + ${prize.coins} coins</h2><p>${esc(m.desc)}</p><p class="mount-gift">Unlocked the Jackpot Gold livery in Garage Style.</p>`
    : m
      ? `<span class="tag" style="color:${col}">${RAR[m.rar].name}${prize.isNew ? ' · NEW MODULE' : ''}</span><h2>${esc(m.name)} ×${prize.n}</h2><p>${esc(m.desc)}</p><div class="opt-meta">${socketBadge(m)}${statChips(m)}</div>${prize.extra ? `<p class="mount-gift">+ ${esc(MOD[prize.extra].name)} (Epic) from the MEGA slice.</p>` : ''}${prize.support ? `<p class="mount-gift">+${prize.support} support block${prize.support > 1 ? 's' : ''} included so you can mount it.</p>` : ''}`
      : `<span class="tag" style="color:${col}">Coin pot</span><h2>${prize.coins} coins</h2><p>Straight into your pocket.</p>`;
  $('#reelres').innerHTML =
    `<div class="card g-card" style="--rc:${col}">${m ? `<img class="g-icon" alt="" src="${iconURL(m.id, 128)}">` : ''}<div>${body}<div class="dfoot"><button class="btn ghost" id="cAgain" ${G.coins < again.cost ? 'disabled' : ''}>${again.label} · ${again.cost}</button><button class="btn" id="cDone">Back to the garage</button></div></div></div>`;
  $('#cDone').onclick = () => {
    $('#ovCrate').hidden = true;
    crateBusy = false;
    if (m) G.sel = m.id;
    refreshUI();
  };
  $('#cAgain').onclick = () => {
    crateBusy = false;
    again.fn();
  };
}

/* ---------- Scrap Crate ---------- */
function openCrate() {
  if (!building() || crateBusy || G.coins < CRATE_COST) return;
  crateBusy = true;
  addCoins(-CRATE_COST);
  const all = MODS.filter(m => m.id !== 'cockpit');
  const jackpot = Math.random() < JACKPOT_P || G.forceJackpot;
  G.forceJackpot = false;
  let rar = 0,
    x = Math.random() * CRATE_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 5; i++)
    if ((x -= CRATE_W[i]) <= 0) {
      rar = i;
      break;
    }
  const res = jackpot ? lootOf(4) : modOfRar(all, rar);
  const n = jackpot ? 1 : res.rar <= 1 ? 2 : 1,
    isNew = !G.found.has(res.id),
    support = draftSupportCount(res.id, n);
  gainWithSupport(res.id, n);
  const prize = { mod: res.id, n, isNew, support, jackpot, coins: jackpot ? 150 : 0 };
  if (jackpot) {
    addCoins(150);
    grantAch('jackpot');
  }
  // the strip: a near miss right before the stop when the prize is ordinary
  const stop = 34,
    cells = Array.from({ length: 42 }, (_, i) => (i === stop ? res : pick(all)));
  if (!jackpot && res.rar < 3) cells[stop + 1] = modOfRar(all, 4);
  const cellHTML = (m, i) =>
    i === stop && jackpot
      ? `<div class="cell jack"><span>★</span></div>`
      : `<div class="cell" style="--rc:${RAR[m.rar].col}"><img alt="" decoding="async" src="${iconURL(m.id)}"></div>`;
  const ov = $('#ovCrate');
  const theme = G.forceCrateTheme || pick(['plain', 'frost', 'fire', 'magnet']),
    TH = CRATE_THEMES[theme];
  G.forceCrateTheme = null;
  ov.innerHTML = `<div class="gamble crate-${theme}"><canvas class="gfx" id="gFx"></canvas><div class="reelwrap"><span class="g-title">${TH.name}</span>
    <div class="g-crate" id="gCrate"><img alt="" src="${crateURL()}"><i class="g-glow"></i><i class="g-skin"></i></div><span class="g-flavour">${TH.flavour}</span>
    <div class="reel" id="reel" hidden><div class="strip" id="strip">${cells.map(cellHTML).join('')}</div></div>
    <button class="btn ghost" id="cSkip">Skip</button><div class="reelres" id="reelres" aria-live="polite"></div></div></div>`;
  ov.hidden = false;
  GFX.start($('#gFx'));
  const again = { label: 'Open another', cost: CRATE_COST, fn: openCrate };
  let finished = false,
    raf = 0;
  const reelW = () => $('#reel').clientWidth,
    target = () => stop * 112 + 52 - reelW() / 2;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    $('#gCrate').hidden = true;
    $('#reel').hidden = false;
    $('#strip').style.transform = `translate3d(${-target()}px,0,0)`;
    $('#cSkip').hidden = true;
    const r = $('#reel').getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2,
      col = jackpot ? '#ffd257' : RAR[res.rar].col;
    $('#reel').classList.add('landed');
    $('#reel').style.setProperty('--rc', col);
    if (jackpot) {
      ov.classList.add('jackpot');
      GFX.rays(cx, cy, 'rgba(255,210,87,.55)', 18, 3);
      GFX.burst(cx, cy, '#ffd257', 90, 620);
      GFX.coins(innerWidth, 120);
      sfx('jackpot');
    } else {
      if (res.rar >= 2) GFX.rays(cx, cy, col + '88', 10 + res.rar * 3, 1.6 + res.rar * 0.4);
      GFX.burst(cx, cy, col, 20 + res.rar * 22, 300 + res.rar * 90);
      if (res.rar >= 3) GFX.confetti(cx, cy, 90);
      sfx(res.rar >= 3 ? 'legend' : 'reveal');
    }
    gambleResult(prize, again);
  };
  $('#cSkip').onclick = finish;
  if (SETTINGS.crateSpin === false) return finish();
  // 1) the crate shakes harder and harder, 2) the lid pops, 3) the reel runs
  const crate = $('#gCrate'),
    t0 = performance.now(),
    SHAKE = 1700,
    SPIN = 4600;
  let lastCell = -1,
    popped = false;
  sfx('drumroll');
  const frame = now => {
    if (finished || ov.isConnected === false || ov.hidden) return;
    const t = now - t0;
    if (t < SHAKE) {
      const k = t / SHAKE,
        a = 2 + k * k * 14;
      crate.style.transform = `translate(${(Math.random() - 0.5) * a}px,${(Math.random() - 0.5) * a * 0.6}px) rotate(${(Math.random() - 0.5) * a * 0.4}deg) scale(${1 + k * 0.08})`;
      crate.style.setProperty('--glow', (0.2 + k * 0.8).toFixed(2));
      {
        const r = crate.getBoundingClientRect();
        TH.tick && TH.tick(r, k);
      }
      if (Math.random() < k * 0.25) {
        const r = crate.getBoundingClientRect();
        GFX.burst(
          r.left + r.width * Math.random(),
          r.top + r.height * 0.3,
          jackpot && k > 0.6 ? '#ffd257' : TH.pop || '#5be7ff',
          3,
          180
        );
      }
    } else {
      if (!popped) {
        popped = true;
        const r = crate.getBoundingClientRect();
        GFX.burst(r.left + r.width / 2, r.top + r.height / 2, TH.pop || '#ffffff', 50, 520);
        TH.open && TH.open(r);
        sfx('boom');
        crate.hidden = true;
        $('#reel').hidden = false;
      }
      const k = Math.min(1, (t - SHAKE) / SPIN),
        e = 1 - Math.pow(1 - k, 4.2),
        // a long slow tail: the next cell (often a teaser) creeps up to the needle and stops just short
        x = target() * e;
      $('#strip').style.transform = `translate3d(${-x}px,0,0)`;
      const cur = Math.floor((x + reelW() / 2) / 112);
      if (cur !== lastCell) {
        lastCell = cur;
        sfx('tick');
      }
      if (k >= 1) return finish();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

/* Crates with character: same odds, different personality. */
const CRATE_THEMES = {
  plain: { name: 'Scrap Crate', flavour: 'Smells like old oil and opportunity.' },
  frost: {
    name: 'Frozen Crate',
    flavour: 'Something in here creaks…',
    pop: '#bff4ff',
    tick(r, k) {
      if (Math.random() < 0.05 + k * 0.1) sfx('creak');
      if (Math.random() < 0.3)
        GFX.parts.push({
          k: 'conf',
          x: r.left + Math.random() * r.width,
          y: r.top + r.height * 0.9,
          vx: (Math.random() - 0.5) * 40,
          vy: 30,
          g: 200,
          a: Math.random() * 6,
          va: 3,
          life: 1,
          t: 0,
          r: 2 + Math.random() * 2,
          col: '#dff8ff'
        });
    },
    open(r) {
      sfx('shatter');
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * 6.28,
          sp = 200 + Math.random() * 400;
        GFX.parts.push({
          k: 'conf',
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          g: 700,
          a,
          va: (Math.random() - 0.5) * 20,
          life: 1.4,
          t: 0,
          r: 3 + Math.random() * 5,
          col: pick(['#bff4ff', '#8bdeed', '#ffffff'])
        });
      }
    }
  },
  fire: {
    name: 'Smoking Crate',
    flavour: 'Warm to the touch. Very warm.',
    pop: '#ff9a3c',
    tick(r, k) {
      if (Math.random() < 0.5)
        GFX.parts.push({
          k: 'smoke',
          x: r.left + r.width * (0.3 + Math.random() * 0.4),
          y: r.top + r.height * 0.2,
          vx: (Math.random() - 0.5) * 30,
          vy: -60 - Math.random() * 60,
          life: 1.6,
          t: 0,
          r: 10 + Math.random() * 10,
          col: 'rgba(120,120,130,.5)'
        });
      if (Math.random() < k * 0.4)
        GFX.parts.push({
          k: 'spark',
          x: r.left + Math.random() * r.width,
          y: r.top + r.height * 0.4,
          vx: (Math.random() - 0.5) * 60,
          vy: -120,
          g: -40,
          life: 0.8,
          t: 0,
          r: 2,
          col: pick(['#ffb423', '#ff7a1a'])
        });
    },
    open(r) {
      sfx('flame');
      for (let i = 0; i < 26; i++)
        GFX.parts.push({
          k: 'smoke',
          x: r.left + r.width / 2 + (Math.random() - 0.5) * 60,
          y: r.top + r.height / 2,
          vx: (Math.random() - 0.5) * 220,
          vy: -80 - Math.random() * 200,
          life: 1.8,
          t: 0,
          r: 14 + Math.random() * 16,
          col: 'rgba(90,90,100,.55)'
        });
    }
  },
  magnet: {
    name: 'Magnetic Crate',
    flavour: 'Loose bolts are getting nervous.',
    pop: '#c58bff',
    tick(r, k) {
      if (Math.random() < 0.25 + k * 0.5) {
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2,
          a = Math.random() * 6.28,
          d = 320 + Math.random() * 200,
          t = 0.5 + Math.random() * 0.3;
        GFX.parts.push({
          k: 'conf',
          x: cx + Math.cos(a) * d,
          y: cy + Math.sin(a) * d,
          vx: (-Math.cos(a) * d) / t,
          vy: (-Math.sin(a) * d) / t,
          life: t,
          t: 0,
          a,
          va: 12,
          r: 3 + Math.random() * 2,
          col: pick(['#9aa6b4', '#c6ccd4', '#6f7a88'])
        });
        if (Math.random() < 0.15) sfx('tick');
      }
    },
    open(r) {
      GFX.rays(r.left + r.width / 2, r.top + r.height / 2, 'rgba(197,139,255,.5)', 12, 1.4);
    }
  }
};
/* ---------- Prize Wheel ---------- */
let _wheelImg = null;
function wheelURL(size = 520) {
  if (_wheelImg) return _wheelImg;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d'),
    R = size / 2,
    tot = WHEEL_SEGS.reduce((a, g) => a + g.w, 0);
  c.translate(R, R);
  let a0 = -Math.PI / 2;
  WHEEL_SEGS.forEach((g, i) => {
    const da = (g.w / tot) * Math.PI * 2,
      col = segCol(g);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, R - 14, a0, a0 + da);
    c.closePath();
    const gr = c.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
    gr.addColorStop(0, i % 2 ? '#0d1a30' : '#132442');
    gr.addColorStop(1, mix(col, -0.55));
    c.fillStyle = gr;
    c.fill();
    c.strokeStyle = 'rgba(91,231,255,.35)';
    c.lineWidth = 2;
    c.stroke();
    c.save();
    c.rotate(a0 + da / 2);
    c.fillStyle = col;
    c.font = `700 ${g.w < 1 ? 15 : 19}px "Chakra Petch", sans-serif`;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.shadowColor = col;
    c.shadowBlur = 10;
    c.fillText(segLabel(g), R - 34, 0);
    c.restore();
    a0 += da;
  });
  c.beginPath();
  c.arc(0, 0, R - 8, 0, 7);
  c.lineWidth = 10;
  c.strokeStyle = '#1e3052';
  c.stroke();
  c.beginPath();
  c.arc(0, 0, R * 0.16, 0, 7);
  c.fillStyle = '#0a1020';
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = '#ffb423';
  c.stroke();
  return (_wheelImg = cv.toDataURL());
}
function spinWheel() {
  if (!building() || crateBusy || G.coins < WHEEL_COST) return;
  crateBusy = true;
  addCoins(-WHEEL_COST);
  const tot = WHEEL_SEGS.reduce((a, g) => a + g.w, 0);
  let x = Math.random() * tot,
    idx = 0;
  for (; idx < WHEEL_SEGS.length; idx++) if ((x -= WHEEL_SEGS[idx].w) <= 0) break;
  idx = Math.min(idx, WHEEL_SEGS.length - 1);
  if (G.forceWheel != null) {
    idx = G.forceWheel;
    G.forceWheel = null;
  }
  const g = WHEEL_SEGS[idx];
  const prize = { n: 1, coins: 0 };
  if (g.kind === 'coins') {
    prize.coins = g.n;
    addCoins(g.n);
  } else {
    const m = lootOf(g.kind === 'mega' ? 4 : g.rar);
    prize.mod = m.id;
    prize.n = g.kind === 'mega' ? 1 : g.n;
    prize.isNew = !G.found.has(m.id);
    prize.support = draftSupportCount(m.id, prize.n);
    gainWithSupport(m.id, prize.n);
    if (g.kind === 'mega') {
      const e = lootOf(3);
      prize.extra = e.id;
      gainWithSupport(e.id, 1);
    }
  }
  // where on the slice the pointer lands: never right on an edge
  let start = 0;
  for (let i = 0; i < idx; i++) start += WHEEL_SEGS[i].w;
  const segMid = ((start + WHEEL_SEGS[idx].w * (0.2 + Math.random() * 0.6)) / tot) * 360,
    finalDeg = 360 * 7 - segMid;
  const ov = $('#ovCrate');
  ov.innerHTML = `<div class="gamble wheel-stage"><canvas class="gfx" id="gFx"></canvas><div class="reelwrap"><span class="g-title">Prize Wheel</span>
    <div class="wheel" id="wheel"><div class="w-lights" id="wLights">${Array.from({ length: 28 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><img id="wImg" alt="" src="${wheelURL()}"><div class="w-pointer" id="wPtr"></div><div class="w-hub">SPIN</div></div>
    <button class="btn ghost" id="cSkip">Skip</button><div class="reelres" id="reelres" aria-live="polite"></div></div></div>`;
  ov.hidden = false;
  GFX.start($('#gFx'));
  const again = { label: 'Spin again', cost: WHEEL_COST, fn: spinWheel };
  const img = $('#wImg'),
    ptr = $('#wPtr'),
    wheel = $('#wheel');
  let finished = false,
    raf = 0;
  const bounds = [];
  {
    let acc = 0;
    for (const s of WHEEL_SEGS) bounds.push(((acc += s.w) / tot) * 360);
  }
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    img.style.transform = `rotate(${finalDeg}deg)`;
    wheel.classList.remove('spinning');
    wheel.classList.add('landed');
    wheel.style.setProperty('--rc', segCol(g));
    $('#cSkip').hidden = true;
    const r = wheel.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height * 0.12;
    const big = g.kind === 'mega' || g.rar === 4 || (g.kind === 'coins' && g.n >= 400);
    GFX.burst(cx, cy, segCol(g), big ? 120 : 60, big ? 640 : 420);
    if (big) {
      GFX.rays(r.left + r.width / 2, r.top + r.height / 2, segCol(g) + '77', 20, 2.6);
      GFX.confetti(cx, cy, 120);
      if (g.kind === 'coins') GFX.coins(innerWidth, 90);
      sfx('jackpot');
    } else sfx(g.kind === 'coins' ? 'coin' : g.rar >= 3 ? 'legend' : 'reveal');
    gambleResult(prize, again);
  };
  $('#cSkip').onclick = finish;
  if (SETTINGS.crateSpin === false) return finish();
  // a short wind-up backwards, then a long spin that slows to a crawl
  const t0 = performance.now(),
    WIND = 450,
    SPIN = 6800;
  let lastSeg = -1;
  wheel.classList.add('spinning');
  sfx('drumroll');
  const frame = now => {
    if (finished || ov.isConnected === false || ov.hidden) return;
    const t = now - t0;
    let deg;
    if (t < WIND) deg = -14 * Math.sin((t / WIND) * Math.PI * 0.5);
    else {
      const k = Math.min(1, (t - WIND) / SPIN),
        e = 1 - Math.pow(1 - k, 3.6);
      deg = -14 + (finalDeg + 14) * e;
      wheel.style.setProperty('--speed', (0.15 + (1 - e) * 1.6).toFixed(2));
      if (k >= 1) return finish();
    }
    img.style.transform = `rotate(${deg}deg)`;
    // which slice is under the pointer (pointer at the top)
    const at = ((-deg % 360) + 360) % 360,
      seg = bounds.findIndex(b => at < b);
    if (seg !== lastSeg) {
      lastSeg = seg;
      if (t > WIND) {
        sfx('tick');
        ptr.classList.remove('flap');
        void ptr.offsetWidth;
        ptr.classList.add('flap');
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
/* =================== CODEX =================== */
let codexTab = 'mods',
  codexCat = 'all',
  codexQ = '';
function openCodex() {
  $('#ovCodex').innerHTML =
    `<div class="codex" role="dialog" aria-label="Codex"><header><h2>Codex</h2><div class="tabs"><button data-t="mods" aria-pressed="${codexTab === 'mods'}">Modules</button><button data-t="objs" aria-pressed="${codexTab === 'objs'}">Arena objects</button><button data-t="road" aria-pressed="${codexTab === 'road'}">Roadmap</button></div><div class="grow"></div><button class="btn ghost" id="cx">Close</button>
   ${codexTab === 'mods' ? `${catalogFilters('codex', codexQ)}<div class="chips">${[{ id: 'all', name: 'All' }, ...CATS].map(c => `<button class="chip" data-c="${c.id}" aria-pressed="${codexCat === c.id}">${c.name}</button>`).join('')}</div>` : `<input id="cq" type="search" placeholder="Search this page" aria-label="Search this page" value="${esc(codexQ)}">`}</header><div class="cbody" id="cbody"></div></div>`;
  $('#ovCodex').hidden = false;
  renderCodex();
  $('#cx').addEventListener('click', closeCodex);
  if (codexTab === 'mods') bindCatalog('codex', openCodex, true);
  else
    $('#cq').oninput = e => {
      codexQ = e.target.value;
      renderCodex();
    };
  $$('#ovCodex .tabs button').forEach(b =>
    b.addEventListener('click', () => {
      codexTab = b.dataset.t;
      openCodex();
    })
  );
  $$('#ovCodex .chip').forEach(b =>
    b.addEventListener('click', () => {
      codexCat = b.dataset.c;
      $$('#ovCodex .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === codexCat));
      renderCodex();
    })
  );
}
function closeCodex() {
  $('#ovCodex').hidden = true;
}
$('#ovCodex').addEventListener('click', e => {
  if (e.target.id === 'ovCodex') closeCodex();
});
function renderCodex() {
  const q = codexQ.trim().toLowerCase(),
    hit = s => !q || s.toLowerCase().includes(q);
  if (codexTab === 'mods') {
    $('#cbody').innerHTML =
      CATS.filter(c => codexCat === 'all' || c.id === codexCat)
        .map(c => {
          const list = MODS.filter(
            m => m.cat === c.id && hit(m.name + m.desc + m.con) && catalogMatches(m, codexQ)
          ).sort((a, b) => a.rar - b.rar);
          if (!list.length) return '';
          return `<section class="cgroup"><h4>${c.name}<span>${list.length}</span></h4><div class="cgrid">${list
            .map(m => {
              const own = G.found.has(m.id);
              const tn = TUNE.filter(t => t.mod === m.id)
                .map(t => t.name)
                .join(', ');
              return `<div class="centry${own ? '' : ' locked'}" style="--rc:${RAR[m.rar].col}"><img alt="" src="${iconURL(m.id)}"><div><div class="nm">${esc(m.name)}</div><div class="meta">${RAR[m.rar].name} · ${m.price ? `${m.price} coins` : 'free'}</div><div class="ds">${esc(m.desc)}</div><div class="cn">− ${esc(m.con)}</div><div class="st">${esc(mountLine(m))}</div><div class="st">${esc(statLine(m))}</div>${tn ? `<div class="st">Tunings: ${esc(tn)}</div>` : ''}<div class="own">${own ? 'Found' : 'Not found yet'}</div></div></div>`;
            })
            .join('')}</div></section>`;
        })
        .join('') || '<p class="small">No modules match that search.</p>';
  } else if (codexTab === 'objs') {
    const all = [...Object.entries(JUNK), ...Object.entries(PROPS)].filter(([k, d]) => hit(d.name + (d.note || '')));
    $('#cbody').innerHTML =
      `<section class="cgroup"><h4>Arena objects<span>${all.length}</span></h4><div class="cgrid">${all.map(([k, d]) => `<div class="centry" style="--rc:${d.coins ? '#ffd257' : d.target ? '#e2504a' : '#a3abb3'}"><img alt="" src="${junkURL(k)}"><div><div class="nm">${esc(d.name)}</div><div class="meta">${d.target ? 'Target' : d.coins ? 'Pays coins' : 'Junk'} · ${d.m} t</div><div class="ds">${esc(d.note || (d.explode ? 'Explodes when destroyed.' : d.heavy ? 'Too heavy to shove without a pusher.' : 'Smash it, ram it, throw it.'))}</div><div class="st">${d.hp} HP</div></div></div>`).join('')}</div></section>
    <section class="cgroup"><h4>Ground features<span>${ZONES_INFO.length}</span></h4><div class="cgrid">${ZONES_INFO.map(([n, d]) => `<div class="centry"><span></span><div><div class="nm">${n}</div><div class="ds">${d}</div></div></div>`).join('')}</div></section>`;
  } else {
    $('#cbody').innerHTML = `<div class="roadmap">${Object.entries(ROADMAP)
      .map(
        ([h, l]) =>
          `<section><h5>${esc(h)}</h5><ul>${l
            .filter(hit)
            .map(x => `<li>${esc(x)}</li>`)
            .join('')}</ul></section>`
      )
      .join('')}</div>`;
  }
}
$('#btnCodex').addEventListener('click', openCodex);
