// Main menu (over a live bot battle), multiplayer lobby, the main loop and start-up.
const inMatch = () => !['intro', 'menu', 'final'].includes(G.phase) && G.mode !== undefined && G.started;
const MENU_TABS = [
  { id: 'story', name: 'Scrap Road', ico: 'SR', col: '#ffb423', badge: () => storyBadge() },
  { id: 'solo', name: 'Duel vs bot', ico: '1P', col: '#3fe0a0' },
  { id: 'run', name: 'Scrap Gauntlet', ico: '☠', col: '#ff5c7a' },
  { id: 'online', name: 'Online 1v1', ico: '2P', col: '#5be7ff' },
  { id: 'sand', name: 'Sandbox', ico: 'LAB', col: '#c58bff' },
  { id: 'work', name: 'Workbench', ico: 'WB', col: '#ffb423', badge: () => GEAR.bolts + ' bolts' },
  { id: 'style', name: 'Locker', ico: '★', col: '#ffd257', badge: () => 'Lv ' + levelInfo().lvl },
  { id: 'codex', name: 'Module codex', ico: 'K', col: '#8da3c2' }
];
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
  const tab = MENU_TABS.some(t => t.id === load('sd.menuTab')) ? load('sd.menuTab') : 'story';
  const item = t =>
    `<button class="mrail-i" data-tab="${t.id}" style="--rc:${t.col}" aria-pressed="${t.id === tab}"><span class="mi-ico">${t.ico}</span><span class="mi-t">${t.name}</span>${t.badge ? `<span class="mi-b">${t.badge()}</span>` : ''}</button>`;
  const group = (label, ids) =>
    `<div class="mrail-g"><span class="mrail-h">${label}</span>${MENU_TABS.filter(t => ids.includes(t.id))
      .map(item)
      .join('')}</div>`;
  const panel = (id, col, title, body) =>
    `<section class="mpanel" data-panel="${id}" style="--rc:${col}" ${id === tab ? '' : 'hidden'}><h2>${title}</h2>${body}</section>`;
  $('#ovMenu').innerHTML = `<div class="menu3">
        <div class="mbrand"><h1>SCRAP <span>DUEL</span></h1><p id="tagline">Weld a car from scrap, draft a new part every round, smash your rival.</p></div>
    ${resume ? '<button class="btn ok mresume" id="mResume">▶ Resume match</button>' : ''}
    <div class="mbody">
      <nav class="mrail" aria-label="Game modes">
        ${group('Play', ['story', 'solo', 'run', 'online'])}
        ${group('Build', ['sand'])}
        ${group('Garage', ['work', 'style', 'codex'])}
      </nav>
      <div class="mpanels">
        ${panel('story', '#ffb423', 'Scrap Road', storyPanelHtml())}
        ${panel(
          'solo',
          '#3fe0a0',
          'Duel vs bot',
          `<p>A bot rival who drafts, shops and builds with the same rules as you.</p>
          <span class="mlab">Difficulty</span><div class="seg" id="diffSeg">${DIFF.map((d, i) => `<button data-i="${i}" aria-pressed="${i === G.diff}">${d.name}</button>`).join('')}</div>
          <span class="mlab">Rounds</span><div class="seg" id="roundSeg" aria-label="Match length">${ROUND_CHOICES.map(n => `<button data-n="${n}" aria-pressed="${n === (G.rounds || 10)}">${n}</button>`).join('')}</div>
          <span class="mlab">Format</span><div class="seg" id="fmtSeg" aria-label="Match format">${Object.entries(
            MATCH_FORMATS
          )
            .map(
              ([k, f]) =>
                `<button data-f="${k}" title="${esc(f.desc)}" aria-pressed="${k === chosenFormat}">${esc(f.short)}</button>`
            )
            .join('')}</div><p class="small" id="fmtDesc">${esc(MATCH_FORMATS[chosenFormat].desc)}</p>
          <button class="btn mgo" id="mSolo">Play vs bot</button>`
        )}
        ${panel(
          'online',
          '#5be7ff',
          'Online 1v1',
          `<p>Host a room and share the 4-letter code with a friend, or join theirs.</p>
          <span class="mlab">Your name</span><input id="mName" class="mname" maxlength="16" value="${esc(G.name)}" aria-label="Your name" placeholder="Your name">
          <div class="mrow"><button class="btn" id="mHost">Host room</button><input class="codein" id="mCode" maxlength="4" placeholder="CODE" aria-label="Room code"><button class="btn ghost" id="mJoin">Join</button></div>`
        )}
        ${panel(
          'run',
          '#ff5c7a',
          'Scrap Gauntlet',
          `<p>Survive wave after wave with three hearts. Every fifth wave a boss drops a relic.</p>
          <div class="mstat"><b>${runBest() ? 'Wave ' + runBest() : '—'}</b><span>best run</span></div>
          <button class="btn mgo" id="mRun">Start a run</button>`
        )}
        ${panel(
          'sand',
          '#c58bff',
          'Sandbox',
          `<p>Every module, 99 of each, no drafting. Build anything and test it on dummies.</p>
          <button class="btn mgo" id="mSand">Open sandbox</button>`
        )}
        ${panel(
          'work',
          '#ffb423',
          'Workbench',
          `<p>Your own parts. Upgrade them with bolts, weld on quirks and find them again as draft cards in Duel, Story and Gauntlet.</p>
          <div class="mstat"><b>${GEAR.bolts}</b><span>bolts</span></div><div class="mstat"><b>${GEAR.items.length}</b><span>gear pieces</span></div>
          <button class="btn mgo" id="mWork">Open the Workbench</button>`
        )}
        ${panel(
          'style',
          '#ffd257',
          'Locker',
          `<p>${esc(titleName(G.style.title))} · ${unlockedCount()} of ${totalCosmetics()} unlocked</p>
          <div class="xpbar"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></div><span class="small">Scrap Cred level ${L.lvl} · ${L.into}/${L.need} XP</span>
          <p class="small">Skins, stickers, trails and titles. Stickers give small perks, and two stickers that match your skin unlock a set bonus.</p>
          <button class="btn mgo" id="mStyle">Open the Locker</button>`
        )}
      </div>
    </div>
    <div class="mfoot3"><button class="mlink" id="mHow">How to play</button><button class="mlink" id="mSettings">Settings</button><button class="mlink" id="mSound">${MUTE ? 'Sound off' : 'Sound on'}</button>${window.desktop ? '<button class="mlink" id="mQuit">Quit game</button>' : ''}</div>
  </div>`;
  $('#ovMenu').hidden = false;
  const q = $('#mQuit');
  if (q) q.onclick = () => window.desktop.quit();
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
  $$('#fmtSeg button').forEach(b =>
    b.addEventListener('click', () => {
      chosenFormat = b.dataset.f;
      $$('#fmtSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
      $('#fmtDesc').textContent = MATCH_FORMATS[chosenFormat].desc;
      store('sd.format', chosenFormat);
      sfx('ui');
    })
  );
  $('#mWork').addEventListener('click', () => {
    $('#ovMenu').hidden = true;
    sfx('ui');
    openWorkbench(showMenu);
  });
  $('#mStory').addEventListener('click', () => {
    sfx('ui');
    leave();
    openStory();
  });
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
    e.currentTarget.textContent = MUTE ? 'Sound off' : 'Sound on';
    sfx('ui');
  });
  $$('.mrail-i').forEach(b =>
    b.addEventListener('click', () => {
      sfx('ui');
      if (b.dataset.tab === 'codex') {
        $('#ovMenu').hidden = true;
        return openCodex();
      }
      store('sd.menuTab', b.dataset.tab);
      $$('.mrail-i').forEach(x => x.setAttribute('aria-pressed', x === b));
      $$('.mpanel').forEach(p => (p.hidden = p.dataset.panel !== b.dataset.tab));
    })
  );
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
    if (owFrame(dt)) {
      // the Scrap Road map draws itself
    } else if (G.phase === 'replay' && B) {
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
  const pt = load('sd.paint');
  if (pt && /^#[0-9a-f]{6}$/i.test(pt)) G.paint = pt;
  const fm = load('sd.format');
  if (fm && MATCH_FORMATS[fm]) chosenFormat = fm;
  loadStory();
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
    STORY,
    dpsOf,
    OW_SITES,
    OW_CACHES,
    OW_W,
    OW_H,
    owWorld,
    owRegionAt,
    owBlockers,
    owStart,
    owStep,
    OWS: () => OWS,
    owFogSave,
    owFogLoad,
    owOpenCache,
    makeBot,
    botDraft,
    botShop,
    botBuildFor,
    openDraft,
    openSettings,
    sanitizeLook,
    ACHIEVEMENTS,
    STORY_BY,
    STORY_BOSSES,
    STORY_LAYOUTS,
    STICKERS,
    STICKER,
    STICKER_SETS,
    QUIRKS,
    bossDesign,
    startStory,
    storyField,
    storyFinish,
    storyGrab,
    storyTick,
    openStory,
    STORYP: () => STORYP,
    GEAR: () => GEAR,
    setGear: g => (GEAR = g),
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
    stepLogic,
    groupOn,
    partFiring,
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
