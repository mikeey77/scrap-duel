// Main menu (over a live bot battle), multiplayer lobby, the main loop and start-up.
const inMatch = () => !['intro', 'menu', 'final'].includes(G.phase) && G.mode !== undefined && G.started;
const TAGLINES = [
  'Weld a car from scrap, draft a new part every round, smash your rival.',
  'Now with 40% more duct tape.',
  'Every bolt counts. Most of them are loose.',
  'Build it. Break it. Blame the bot.',
  'The only racing game where you are the race track.',
  'Certified road-illegal since forever.',
  'Warning: may contain traces of flying fridges.',
  'Your mechanic called. He is crying.',
  'Pick parts. Hit things. Repeat until victorious or on fire.'
];
function showMenu() {
  hideOverlays();
  if (G.phase === 'review') closeGarageReport();
  const resume = inMatch();
  if (!resume) {
    G.phase = 'menu';
    updateHUD();
    demoStart();
  } else if (B && !B.demo && G.mode !== 'mp' && (G.phase === 'battle' || G.phase === 'wait') && !B.paused) {
    // solo: the bot must not keep shooting while you browse the menu
    B.paused = true;
    B.menuPaused = true;
    clearArenaInput && clearArenaInput();
  }
  const L = levelInfo();
  $('#ovMenu').classList.toggle('live', !resume);
  $('#ovMenu').innerHTML = `<div class="menu2">
    <div class="hero2"><h1>SCRAP<br>DUEL</h1>
      <p id="tagline">Weld a car from scrap, draft a new part every round, smash your rival.</p></div>
    <div class="modes2">
      <div class="mode2" style="--rc:#5cc38f"><div class="mh"><span class="ico">1P</span><h3>Singleplayer</h3></div><p>A bot rival who drafts, shops and builds with the same rules.</p>
        <div class="seg" id="diffSeg">${DIFF.map((d, i) => `<button data-i="${i}" aria-pressed="${i === G.diff}">${d.name}</button>`).join('')}</div>
        <div class="seg rseg" id="roundSeg" aria-label="Match length"><span class="rseg-l">Rounds</span>${ROUND_CHOICES.map(n => `<button data-n="${n}" aria-pressed="${n === (G.rounds || 10)}">${n}</button>`).join('')}</div>
        <button class="btn" id="mSolo">Play vs bot</button></div>
      <div class="mode2" style="--rc:#4ea1ff"><div class="mh"><span class="ico">2P</span><h3>Multiplayer</h3></div><p>Host a room and share the code with a friend.</p>
        <input id="mName" class="mname" maxlength="16" value="${esc(G.name)}" aria-label="Your name" placeholder="Your name">
        <div class="row"><button class="btn" id="mHost">Host</button><input class="codein" id="mCode" maxlength="4" placeholder="CODE" aria-label="Room code"><button class="btn ghost" id="mJoin">Join</button></div></div>
      <div class="mode2" style="--rc:#ff5c7a"><div class="mh"><span class="ico">☠</span><h3>Scrap Gauntlet</h3></div><p>Survive wave after wave with three hearts. A boss every fifth wave drops a relic.</p>
        <span class="small runbest">Best run: ${runBest() ? 'wave ' + runBest() : 'none yet'}</span>
        <button class="btn" id="mRun">Start a run</button></div>
      <div class="mode2" style="--rc:#c58bff"><div class="mh"><span class="ico">LAB</span><h3>Sandbox</h3></div><p>Every module, 99 of each, a test arena with dummies.</p>
        <button class="btn" id="mSand">Open sandbox</button></div>
      <div class="mode2" style="--rc:#ffd257"><div class="mh"><span class="ico">${L.lvl}</span><h3>Garage Style</h3></div><p>${esc(titleName(G.style.title))} · ${unlockedCount()} of ${totalCosmetics()} unlocked</p>
        <div class="xpbar"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></div><span class="small">Scrap Cred level ${L.lvl} · ${L.into}/${L.need} XP</span>
        <button class="btn" id="mStyle">Customize</button></div>
    </div>
    <div class="mfoot">${resume ? '<button class="btn ok" id="mResume">Resume match</button>' : ''}<button class="btn ghost" id="mSound">${MUTE ? 'Sound off' : 'Sound on'}</button><button class="btn ghost" id="mCodex">Module codex</button><button class="btn ghost" id="mHow">How to play</button><button class="btn ghost" id="mSettings">Settings</button></div>
  </div>`;
  $('#ovMenu').hidden = false;
  clearInterval(showMenu.tag);
  showMenu.tag = setInterval(() => {
    const t = $('#tagline');
    if (!t || $('#ovMenu').hidden) return clearInterval(showMenu.tag);
    t.classList.add('swap');
    setTimeout(() => {
      t.textContent = pick(TAGLINES);
      t.classList.remove('swap');
    }, 350);
  }, 7000);
  $$('#diffSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.diff = +b.dataset.i;
      $$('#diffSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
      store('sd.diff', G.diff);
      sfx('ui');
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
  const nameIn = $('#mName');
  nameIn.addEventListener('input', () => {
    G.name = nameIn.value.trim().slice(0, 16) || 'Player';
    store('sd.name', G.name);
  });
  const leave = () => {
    if (G.mode === 'mp') Net.close();
  };
  const go = mode => () => {
    sfx('ui');
    leave();
    G.started = true;
    startMatch(mode);
  };
  $('#mSolo').addEventListener('click', go('solo'));
  $('#mSand').addEventListener('click', go('sandbox'));
  $('#mRun').addEventListener('click', () => {
    sfx('ui');
    leave();
    G.started = true;
    startRun();
  });
  $('#mHost').addEventListener('click', () => {
    sfx('ui');
    leave();
    Net.host();
  });
  const code = $('#mCode');
  code.addEventListener('input', () => (code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '')));
  const join = () => {
    const c = code.value.trim();
    if (c.length !== 4) return code.focus();
    sfx('ui');
    leave();
    Net.join(c);
  };
  $('#mJoin').addEventListener('click', join);
  code.addEventListener('keydown', e => e.key === 'Enter' && join());
  $('#mSound').addEventListener('click', e => {
    MUTE = !MUTE;
    store('sd.mute', MUTE ? 1 : 0);
    e.target.textContent = MUTE ? 'Sound off' : 'Sound on';
    sfx('ui');
  });
  $('#mCodex').addEventListener('click', () => {
    $('#ovMenu').hidden = true;
    openCodex();
  });
  $('#mHow').addEventListener('click', () => {
    $('#ovMenu').hidden = true;
    $('#ovIntro').hidden = false;
  });
  $('#mSettings').addEventListener('click', () => {
    $('#ovMenu').hidden = true;
    openSettings(showMenu);
  });
  $('#mStyle').addEventListener('click', () => {
    $('#ovMenu').hidden = true;
    openStyle(showMenu);
  });
  const r = $('#mResume');
  if (r)
    r.addEventListener('click', () => {
      sfx('ui');
      $('#ovMenu').hidden = true;
    });
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
        ? `<div class="seg rseg" id="lRounds" aria-label="Match length">${ROUND_CHOICES.map(r => `<button data-n="${r}" aria-pressed="${r === (G.mpRounds || 10)}">${r} rounds</button>`).join('')}</div>`
        : ''
    }
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${host ? `<button class="btn" id="lStart" ${n.connected ? '' : 'disabled'}>Start match</button>` : n.connected ? '<span class="small">Waiting for the host to start…</span>' : ''}<button class="btn ghost" id="lCancel">Cancel</button></div>`;
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
      const format = 'balanced'; // only the balanced format is offered
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
function loop(t) {
  const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
  lastT = t;
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
      if (B && G.phase === 'wait' && G.mode !== 'sandbox' && Math.random() < 0.05) oppStatusUI();
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
  loadStyle();
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
    prepareBot,
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
