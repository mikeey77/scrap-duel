// Main menu (over a live bot battle), multiplayer lobby, the main loop and start-up.
const inMatch = () => !['intro', 'menu', 'final'].includes(G.phase) && G.mode !== undefined && G.started;
const MENU_MODES = [
  {
    id: 'solo',
    name: 'Quick match',
    col: '#3fe0a0',
    line: 'Fight a bot. Draft a car round by round, or bring a finished one.'
  },
  { id: 'run', name: 'Scrap Gauntlet', col: '#ff5c7a', line: 'Endless waves, three hearts, a boss every fifth wave.' },
  { id: 'online', name: 'Online', col: '#5be7ff', line: 'Duel or brawl a friend with a 4-letter room code.' },

];
const TAGLINES = [
  'Tip: loadout gear in the Garage is in your parts bin from round 1.',
  "Tip: two stickers from your skin's set turn on a set bonus.",
  'Tip: hinges and rams follow right click, or a key you give them with the Keys tool (G).',
  'Tip: in a Brawl you can rearrange your car between rounds.',
  'Tip: press T in battle for quick chat.',
  'Tip: bosses get angrier at two thirds and one third health.',
  'Now with 40% more duct tape.',
  'Build it. Break it. Blame the bot.',
  'Warning: may contain traces of flying fridges.'
];
let menuMode = null;
function showMenu() {
  hideOverlays();
  if (G.phase === 'review') closeGarageReport();
  const resume = inMatch();
  if (!resume) {
    G.phase = 'menu';
    updateHUD();
    demoStop(); // the hangar has its own backdrop
  } else if (B && !B.demo && G.mode !== 'mp' && (G.phase === 'battle' || G.phase === 'wait') && !B.paused) {
    // solo: the bot must not keep shooting while you browse the menu
    B.paused = true;
    B.menuPaused = true;
    clearArenaInput && clearArenaInput();
  }
  if (load('sd.menuTab') === 'brawl') {
    store('sd.menuTab', 'solo'); // Brawl is now a format of Quick match
    store('sd.quickFmt', 'brawl');
  }
  menuMode = MENU_MODES.some(m => m.id === load('sd.menuTab')) ? load('sd.menuTab') : 'solo';
  G.quickFmt = load('sd.quickFmt') === 'brawl' ? 'brawl' : 'balanced';
  const L = levelInfo(),
    rec = (() => {
      try {
        return { w: 0, l: 0, ...JSON.parse(load('sd.record') || '{}') };
      } catch (e) {
        return { w: 0, l: 0 };
      }
    })();
  let car = '';
  try {
    car = designURL(stylePreviewDesign(), 420, G.paint, G.style.livery);
  } catch (e) {}
  const set = activeSet(),
    lo = GEAR.loadout.map(gearById).filter(Boolean);
  const stat = id =>
    id === 'run'
      ? runBest()
        ? `Best: wave ${runBest()}`
        : 'No run yet'
      : id === 'solo'
        ? `${G.quickFmt === 'brawl' ? 'Brawl' : 'Draft'} · ${DIFF[G.diff].name} · ${G.rounds || 10} rounds`
        : id === 'online'
          ? 'Peer to peer'
          : `${MODS.length} parts`;
  $('#ovMenu').classList.toggle('live', false);
  $('#ovMenu').innerHTML = `<div class="hangar${resume ? ' resume' : ''}">
    <header class="hg-top">
      <div class="hg-brand" aria-label="Scrap Duel">SCRAP<b>DUEL</b></div>
      <div class="hg-prof">${badgeHTML(G.style.badge, 40)}
        <div><input id="mName" class="hg-name" maxlength="16" value="${esc(G.name)}" aria-label="Your name"><span class="small">${esc(titleName(G.style.title))}</span></div>
        ${walletHtml()}</div>
      <nav class="hg-sys" aria-label="System"><button class="mlink" id="mHow">How to play</button><button class="mlink" id="mCodex">Codex</button><button class="mlink" id="mSettings">Settings</button><button class="mlink" id="mSound">${MUTE ? 'Sound off' : 'Sound on'}</button>${window.desktop ? '<button class="mlink" id="mQuit">Quit</button>' : ''}</nav>
    </header>
    <main class="hg-main">
      <section class="hg-car" aria-label="Your car">
        <div class="hg-pad"><img src="${car}" alt="Your car"><div class="hq-stk">${(G.style.stickers || []).map(id => `<img alt="" src="${stickerURL(id, 48)}">`).join('')}</div></div>
        <div class="hg-carinfo">
          <div class="hg-chips">${set ? `<span class="settag" style="--sc:${STICKER_SETS[set].col}">${esc(STICKER_SETS[set].name)} set on</span>` : ''}${lo.map(g => `<span class="hg-chip"><img alt="" src="${iconURL(g.id, 32)}">${esc(gearName(g))}</span>`).join('')}${lo.length ? '' : '<span class="small">No gear in your loadout yet.</span>'}</div>
          <button class="btn ghost" id="mGarage">Garage · gear, skins, stickers</button>
        </div>
      </section>
      <section class="hg-play">
        ${
          resume
            ? `<div class="hg-cont" style="--rc:#3fe0a0"><span class="label">Match in progress</span><h2>${esc(MATCH_FORMATS[G.format].name)}</h2><button class="btn hg-go" id="mResume">Resume match</button></div>`
            : `<div class="hg-cont" style="--rc:#ffd257"><span class="label">Ready when you are</span>
          <h2>Jump into a fight</h2><p class="small">${rec.w + rec.l ? `Your record against bots: <b>${rec.w}</b> wins, <b>${rec.l}</b> losses${runBest() ? ` · best Gauntlet wave ${runBest()}` : ''}.` : 'Draft a car, outbuild a bot, or team up with a friend online.'}</p>
          <div class="hg-row"><button class="btn hg-go" id="mQuick">Quick match vs bot</button><button class="btn ghost" id="mQuick2">2v2 with a bot partner</button></div></div>`
        }
        <div class="hg-modes" role="tablist" aria-label="Other modes">${MENU_MODES.map(m => `<button class="hg-mode" role="tab" data-mode="${m.id}" aria-selected="${m.id === menuMode}" style="--rc:${m.col}"><b>${m.name}</b><span>${esc(m.line)}</span><em>${stat(m.id)}</em></button>`).join('')}</div>
        <div class="hg-opts" id="hgOpts" role="tabpanel"></div>
      </section>
    </main>
    <footer class="hg-foot"><span id="tagline">${esc(pick(TAGLINES))}</span></footer>
  </div>`;
  $('#ovMenu').hidden = false;
  menuOpts();
  const on = (id, f) => {
    const el = $('#' + id);
    if (el) el.addEventListener('click', f);
  };
  on('mQuit', () => window.desktop.quit());
  clearInterval(showMenu.tag);
  showMenu.tag = setInterval(() => {
    const t = $('#tagline');
    if (!t || $('#ovMenu').hidden) return clearInterval(showMenu.tag);
    t.classList.add('swap');
    setTimeout(() => {
      t.textContent = pick(TAGLINES);
      t.classList.remove('swap');
    }, 350);
  }, 8000);
  const nameIn = $('#mName');
  nameIn.addEventListener('input', () => {
    G.name = nameIn.value.trim().slice(0, 16) || 'Player';
    store('sd.name', G.name);
  });
  $$('.hg-mode').forEach(b =>
    b.addEventListener('click', () => {
      menuMode = b.dataset.mode;
      store('sd.menuTab', menuMode);
      $$('.hg-mode').forEach(x => x.setAttribute('aria-selected', x === b));
      sfx('ui');
      menuOpts();
    })
  );
  const quick = size =>
    on(size === 2 ? 'mQuick2' : 'mQuick', () => {
      sfx('ui');
      menuLeave();
      G.started = true;
      G.teamSize = size;
      startMatch('solo', null, G.quickFmt === 'brawl' ? 'brawl' : 'balanced');
    });
  quick(1);
  quick(2);
  on('mGarage', () => {
    sfx('ui');
    $('#ovMenu').hidden = true;
    openGarageHQ(showMenu, 'gear');
  });
  on('mCodex', () => {
    sfx('ui');
    $('#ovMenu').hidden = true;
    openCodex();
  });
  on('mSound', e => {
    MUTE = !MUTE;
    store('sd.mute', MUTE ? 1 : 0);
    e.currentTarget.textContent = MUTE ? 'Sound off' : 'Sound on';
    sfx('ui');
  });
  on('mHow', () => {
    $('#ovMenu').hidden = true;
    $('#ovIntro').hidden = false;
  });
  on('mSettings', () => {
    $('#ovMenu').hidden = true;
    openSettings(showMenu);
  });
  on('mResume', () => {
    sfx('ui');
    $('#ovMenu').hidden = true;
  });
}
const menuLeave = () => {
  if (G.mode === 'mp') Net.close();
};
/** The options and Play button for the selected mode tile. */
function menuOpts() {
  const el = $('#hgOpts');
  if (!el) return;
  const m = MENU_MODES.find(x => x.id === menuMode),
    seg = (id, items, cur, attr) =>
      `<div class="seg" id="${id}">${items.map(([v, n]) => `<button data-${attr}="${v}" aria-pressed="${v === cur}">${n}</button>`).join('')}</div>`;
  const diff = seg(
      'diffSeg',
      DIFF.map((d, i) => [i, d.name]),
      G.diff,
      'i'
    ),
    rounds = seg(
      'roundSeg',
      ROUND_CHOICES.map(n => [n, n + ' rounds']),
      G.rounds || 10,
      'n'
    );
  const body = {
    solo: `<div class="hg-o"><span class="mlab">Format</span>${seg(
      'fmtSeg',
      [
        ['balanced', 'Draft duel'],
        ['brawl', 'Blueprint Brawl']
      ],
      G.quickFmt,
      'f'
    )}</div><div class="hg-o"><span class="mlab">Difficulty</span>${diff}</div><div class="hg-o"><span class="mlab">Length</span>${rounds}</div><p class="small" id="fmtText">${G.quickFmt === 'brawl' ? `Bring one finished car worth up to ${BRAWL_BUDGET} coins: a saved blueprint or a ready-made one. No drafting, no shop.` : 'Start with a cockpit, draft a part every round, shop and outbuild the bot.'}</p><button class="btn hg-go2" id="mPlay">${G.quickFmt === 'brawl' ? 'Start a Brawl' : 'Play vs bot'}</button>`,
    run: `<p class="small">Survive as long as you can. Hearts carry over; relics stack. Your loadout gear comes along.</p><button class="btn hg-go2" id="mPlay">Start a run</button>`,
    online: `<p class="small">Host a room and share the code. As host you pick Draft duel or Blueprint Brawl.</p><div class="mrow"><button class="btn" id="mHost">Host a room</button><input class="codein" id="mCode" maxlength="4" placeholder="CODE" aria-label="Room code"><button class="btn ghost" id="mJoin">Join</button></div>`,
  }[m.id];
  el.style.setProperty('--rc', m.col);
  el.innerHTML = body;
  $$('#diffSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.diff = +b.dataset.i;
      $$('#diffSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
      store('sd.diff', G.diff);
      sfx('ui');
    })
  );
  $$('#fmtSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.quickFmt = b.dataset.f;
      store('sd.quickFmt', G.quickFmt);
      sfx('ui');
      menuOpts();
      const t = document.querySelector('.hg-mode[data-mode="solo"] em');
      if (t)
        t.textContent = `${G.quickFmt === 'brawl' ? 'Brawl' : 'Draft'} · ${DIFF[G.diff].name} · ${G.rounds || 10} rounds`;
    })
  );
  $$('#roundSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.rounds = +b.dataset.n;
      $$('#roundSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
      store('sd.rounds', G.rounds);
      sfx('ui');
    })
  );
  const play = $('#mPlay');
  if (play)
    play.addEventListener('click', () => {
      sfx('ui');
      menuLeave();
      G.started = true;
      if (m.id === 'run') startRun();
      else startMatch('solo', null, G.quickFmt === 'brawl' ? 'brawl' : 'balanced');
    });
  const host = $('#mHost');
  if (host)
    host.addEventListener('click', () => {
      sfx('ui');
      menuLeave();
      Net.host();
    });
  const code = $('#mCode');
  if (code) {
    code.addEventListener('input', () => (code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '')));
    const join = () => {
      const c = code.value.trim();
      if (c.length !== 4) return code.focus();
      sfx('ui');
      menuLeave();
      Net.join(c);
    };
    $('#mJoin').addEventListener('click', join);
    code.addEventListener('keydown', e => e.key === 'Enter' && join());
  }
}
function lobbyUI() {
  const n = Net,
    host = n.role === 'host',
    c = $('#lobbyCard');
  $('#ovLobby').hidden = false;
  $('#ovMenu').hidden = true;
  const st = n.error
    ? `<p style="color:#f0a39f">${esc(n.error)}</p>`
    : n.connected
      ? `<p>Connected to <b>${esc(G.oppName)}</b>.</p>`
      : host
        ? n.ready
          ? '<p>Share this code with your friend. Waiting for them to join…</p>'
          : '<p>Opening a room…</p>'
        : '<p>Connecting…</p>';
  c.innerHTML = `<span class="label">${host ? 'Hosting' : 'Joining'} a room</span><h2>Multiplayer</h2>
    <div class="code">${esc(n.code || '····')}</div>${st}
    <div class="lstat"><span><span class="dot on"></span>${esc(G.name)}</span><span><span class="dot${n.connected ? ' on' : ''}"></span>${n.connected ? esc(G.oppName) : 'Friend'}</span></div>
    ${
      host
        ? `<div class="seg rseg" id="lFormat" aria-label="Mode">${Object.entries(MATCH_FORMATS)
            .map(
              ([k, f]) =>
                `<button data-f="${k}" aria-pressed="${k === (G.mpFormat || 'balanced')}" title="${esc(f.desc)}">${esc(f.name)}</button>`
            )
            .join('')}</div>
          <div class="seg rseg" id="lRounds" aria-label="Match length">${ROUND_CHOICES.map(r => `<button data-n="${r}" aria-pressed="${r === (G.mpRounds || 10)}">${r} rounds</button>`).join('')}</div>`
        : ''
    }
    ${n.connected && h2hLine(G.oppName) ? `<p class="small">${h2hLine(G.oppName)}</p>` : ''}
    <p class="small fairline">Online is fair play: your gear levels and sticker perks stay at home. Your skin, stickers and trail still show.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${host ? `<button class="btn" id="lStart" ${n.connected ? '' : 'disabled'}>Start match</button>` : n.connected ? '<span class="small">Waiting for the host to start…</span>' : ''}<button class="btn ghost" id="lCancel">Cancel</button></div>`;
  $$('#lFormat button').forEach(b =>
    b.addEventListener('click', () => {
      G.mpFormat = b.dataset.f;
      $$('#lFormat button').forEach(x => x.setAttribute('aria-pressed', x === b));
      sfx('ui');
    })
  );
  $$('#lRounds button').forEach(b =>
    b.addEventListener('click', () => {
      G.mpRounds = +b.dataset.n;
      $$('#lRounds button').forEach(x => x.setAttribute('aria-pressed', x === b));
      sfx('ui');
    })
  );
  const s = $('#lStart');
  if (s)
    s.addEventListener('click', () => {
      if (!n.connected) return;
      const format = G.mpFormat || 'balanced';
      const rounds = setRounds(G.mpRounds || 10);
      const sched = makeSchedule(rounds);
      Net.send({ t: 'begin', sched, format, rounds });
      beginMP(sched, format, rounds);
    });
  $('#lCancel').addEventListener('click', () => {
    Net.close();
    $('#ovLobby').hidden = true;
    showMenu();
  });
}
function beginMP(sched, format = 'balanced', rounds = 10) {
  G.started = true;
  $('#ovLobby').hidden = true;
  startMatch('mp', sched, format, rounds);
}
$('#btnStart').addEventListener('click', () => {
  sfx('ui');
  $('#ovIntro').hidden = true;
  showMenu();
});
$('#btnMenu').addEventListener('click', () => {
  sfx('ui');
  showMenu();
});
$('#btnPause').addEventListener('click', () => {
  sfx('ui');
  if (canPause()) togglePause(true);
  else showMenu();
});

/* ---------- main loop ---------- */
$('#reviewBack').onclick = closeGarageReport;
let lastT = performance.now();
/** Optional FPS readout (Settings → Show frame rate), updated twice a second. */
const FPS = { n: 0, t: 0, el: null };
/** If battles run below ~40 FPS for a while on a high-DPI screen, switch to performance mode once. */
const AUTO_PERF = { slow: 0, done: false };
function autoPerf(dt) {
  if (
    AUTO_PERF.done ||
    SETTINGS.perf ||
    SETTINGS.autoPerfOff ||
    G.phase !== 'battle' ||
    (window.devicePixelRatio || 1) <= 1
  )
    return;
  AUTO_PERF.slow = dt > 0.025 ? AUTO_PERF.slow + dt : Math.max(0, AUTO_PERF.slow - dt * 0.5);
  if (AUTO_PERF.slow > 5) {
    AUTO_PERF.done = true;
    SETTINGS.perf = true;
    saveSettings();
    sizeArena();
    toast('Switched to performance mode for smoother play. You can change this in Settings.', true);
  }
}
function fpsTick(t) {
  if (!SETTINGS.fps) {
    if (FPS.el) FPS.el.hidden = true;
    return;
  }
  if (!FPS.el) {
    FPS.el = document.createElement('div');
    FPS.el.id = 'fpsMeter';
    document.body.appendChild(FPS.el);
  }
  FPS.el.hidden = false;
  FPS.n++;
  if (t - FPS.t >= 500) {
    FPS.el.textContent = Math.round((FPS.n * 1000) / (t - FPS.t)) + ' FPS';
    FPS.n = 0;
    FPS.t = t;
  }
}
function loop(t) {
  const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
  lastT = t;
  fpsTick(t);
  autoPerf(dt);
  try {
    syncPresentation();
    BattleMusic.update();
    Net.updateStatus();
    if (G.phase === 'replay' && B) {
      replayStep(dt);
      if (B) drawArena();
    } else if (B && B.demo) {
      stepArena(dt);
      if (B && B.demo) {
        drawArena();
        demoTick(dt);
      }
    } else if ((G.phase === 'wait' || G.phase === 'battle') && B) {
      if (
        B.menuPaused &&
        ['#ovMenu', '#ovCodex', '#ovSettings', '#ovStyle', '#ovIntro', '#ovPause'].every(id => $(id).hidden)
      ) {
        B.menuPaused = false;
        B.paused = false;
      }
      if (!$('#ovPause').hidden) {
        G.pzapT = (G.pzapT ?? 2) - dt;
        if (G.pzapT <= 0) {
          G.pzapT = 2 + Math.random() * 3;
          zap($('#pauseCard'));
        }
      }
      if (!B.paused && !Net.reconnecting) stepArena(dt);
      if (B && B.cars.length) drawArena();
      if (B && B.rec && G.phase === 'battle' && !B.paused && !Net.reconnecting) recTick(dt);
      if (B && G.phase === 'wait' && Math.random() < 0.05) oppStatusUI();
    } else {
      ANIM += dt;
      if ((building() || G.phase === 'draft') && $('#ovCrate').hidden && builderBusy()) {
        bfxTick(dt);
        drawBP();
      }
    }
  } catch (e) {
    console.error(e);
  }
  requestAnimationFrame(loop);
}
addEventListener('resize', () => {
  if (G.phase !== 'wait' && G.phase !== 'battle') sizeBP();
  if (B) sizeArena();
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawBP());
{
  const n = load('sd.name');
  if (n) G.name = n;
  const d = load('sd.diff');
  if (d != null && DIFF[+d]) G.diff = +d;
  const rn = +load('sd.rounds');
  G.rounds = ROUND_CHOICES.includes(rn) ? rn : 10;
  G.mpRounds = G.rounds;
  MUTE = load('sd.mute') == 1;
  const pt = load('sd.paint');
  if (pt && /^#[0-9a-f]{6}$/i.test(pt)) G.paint = pt;
  loadStyle();
  loadGear();
  try {
    G.favorites = new Set(JSON.parse(load('sd.favorites') || '[]').filter(id => MOD[id]));
  } catch (e) {}
}
resetWs();
G.base = new Map([[key(0, 0), { id: 'cockpit', rot: 0, x: 0, y: 0 }]]);
G.inv = { cockpit: 1 };
G.found.add('cockpit');
sizeBP();
refreshUI();
// the site opens straight on the main menu; "How to play" is one click away there
$('#ovIntro').hidden = true;
showMenu();
requestAnimationFrame(loop);

// Test hook: the headless test suite sets window.__SD_TEST__ before the page script runs.
if (window.__SD_TEST__)
  window.__SD = {
    gearActive,
    designCost,
    brawlDesign,
    brawlApply,
    gearNeed,
    gearPickSpecial,
    gearSpecials,
    gearToInvent,
    gearGainXp,
    lvCol,
    shiftDesign,
    copyLeftToRight,
    commName,
    NAMED_CALLS,
    COMM_NAMES,
    runPathChoose,
    centerDesign,
    turnDesign,
    mirrorDesign,
    designKey,
    occupancy,
    CALLS,
    CASTERS,
    ANNOUNCE,
    voiceId,
    commentate,
    getComm: () => COMM,
    BRAWL_TYPES,
    brawlChoices: () => brawlChoices,
    quickChat,
    h2hRecord,
    h2hLine,
    gearEquip,
    gearLock,
    fabricate,
    loadoutSlots,
    openGarageHQ,
    dpsOf,
    makeBot,
    botDraft,
    botShop,
    botBuildFor,
    openDraft,
    openSettings,
    sanitizeLook,
    ACHIEVEMENTS,
    STICKERS,
    STICKER,
    STICKER_SETS,
    QUIRKS,
    GEAR: () => GEAR,
    setGear: g => (GEAR = { loadout: [], locked: [], ...g }),
    addGear,
    addBolts,
    gearUpgrade,
    gearPickQuirk,
    gearFuse,
    gearScrap,
    gearBonus,
    gearCfg,
    flairCfg,
    activeSet,
    applyGear,
    findGear,
    matchSpoils,
    openWorkbench,
    commentate,
    crowdStep,
    stepCommentary,
    throwGift,
    crowdGiftTaken,
    stepGifts,
    COMM: () => COMM,
    carHealth,
    stickerUnlocked,
    openStyle,
    draftOptions,
    prepareBot,
    groupOn,
    partFiring,
    groupable,
    actionHeld,
    designJSON,
    stepJoints,
    jointSnap,
    applyJointSnap,
    bpos,
    ipos,
    carBlockAt,
    faceAng,
    botCarCfg,
    startRun,
    runNext,
    runMods,
    openRelicPick,
    validBadge,
    parseBadge,
    funAwards,
    oppHints,
    CRATE_THEMES,
    Announcer,
    intelUI,
    showFinal,
    unpackDesign,
    packDesign,
    blueprintCode,
    parseBlueprintCode,
    blueprintNeeds,
    applyBlueprint,
    spinWheel,
    WHEEL_SEGS,
    GFX,
    showMenu,
    canPause,
    togglePause,
    CATS,
    blockedFor,
    reviewHTML,
    openGarageReport,
    closeGarageReport,
    footprint,
    occupancy,
    instCenter,
    cellCount,
    shapeBounds,
    shapeLabel,
    topAt,
    canPlaceTop,
    act,
    returnTopsOn,
    planCapacity,
    planTakeScrap,
    planSpill,
    planTick,
    planActivate,
    planWeapon,
    planHurt,
    simulate,
    weapons,
    hurtInst,
    stepCarHazards,
    mkObj,
    setupSpecial,
    stepSpecial,
    specialTimeout,
    finishBattle,
    formatAwards,
    MATCH_FORMATS,
    POWERUPS,
    SPECIALS,
    drawBP,
    drawArena,
    view,
    cam,
    mouse,
    toWorld,
    worldToScreen,
    screenVectorToWorld,
    sizeArena,
    updateCam,
    enterWait,
    syncPresentation,
    clearArenaInput,
    unlock,
    makeCfg,
    myCarCfg,
    toBattle,
    G,
    MODS,
    MOD,
    getB: () => B,
    killInst,
    Net,
    endRound,
    startReplay,
    botSay,
    makeGround,
    THEMES,
    autoPlace,
    autoBuild,
    blockedList,
    defaultCar,
    starterKit,
    resetProfile,
    startMatch,
    openBuild,
    takeOption,
    draftSupportCount,
    openCrate,
    readLocal,
    keys,
    edges,
    applyInput,
    roundPoints,
    pointsRemaining,
    weakLinks,
    catalogMatches,
    catalogFilters,
    snapshot,
    applySnap,
    BattleMusic,
    SETTINGS,
    makeCar,
    designConnected,
    refreshUI,
    replayStep,
    setB: b => (B = b),
    getRP: () => RP
  };
