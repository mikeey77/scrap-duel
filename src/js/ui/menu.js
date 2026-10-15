// Main menu (over a live bot battle), multiplayer lobby, the main loop and start-up.
const inMatch = () => !['intro', 'menu', 'final'].includes(G.phase) && G.mode !== undefined && G.started;
const MENU_MODES = [
  {
    id: 'solo',
    name: 'Quick match',
    col: '#3fe0a0',
    line: 'Fight a bot. Draft a car round by round, or bring a finished one.'
  },
  { id: 'daily', name: 'Daily', col: '#b06bff', line: 'Same seed for everyone today, plus one odd rule.' },
  { id: 'league', name: 'League', col: '#ffd257', line: 'A season against five rivals. Top the table, win the final.' },
  { id: 'run', name: 'Scrap Gauntlet', col: '#ff5c7a', line: 'Endless waves, three hearts, a boss every fifth wave.' },
  { id: 'online', name: 'Friends', col: '#5be7ff', line: 'Online with a room code, or on this PC with a controller.' },
  {
    id: 'world',
    name: 'Open world',
    col: '#9be15d',
    line: 'A huge map to explore: loot buildings, take missions, wreck raiders. Alone or with a friend.'
  }
];
const TAGLINES = [
  'Tip: loadout gear in the Garage is in My parts from round 1.',
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
// small line icons for the mode tiles
const MODE_ICONS = {
  daily: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 15l2 2 3-4"/>',
  league: '<path d="M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>',
  solo: '<path d="M5 19 19 5M14 5h5v5M5 5l14 14M5 14v5h5"/>',
  run: '<path d="M12 3c-4.4 0-8 3.2-8 7.3 0 2.4 1.2 4.3 3 5.5V19h10v-3.2c1.8-1.2 3-3.1 3-5.5C20 6.2 16.4 3 12 3Z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 19v2M14 19v2"/>',
  online: '<path d="M12 13v8M8.5 9.5a5 5 0 0 1 7 0M5.6 6.6a9 9 0 0 1 12.8 0"/><circle cx="12" cy="12.5" r="1.4"/>',
  world: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z"/><path d="M9 4v13.5M15 6.5V20"/>'
};
function showMenu() {
  cineClear();
  hideOverlays();
  if (G.phase === 'review') closeGarageReport();
  const resume = inMatch();
  if (!resume && G.daily) {
    dailyRestoreRandom();
    G.diff = G.daily.prevDiff;
    G.daily = null;
  }
  if (!resume) {
    G.phase = 'menu';
    updateHUD();
    if (!(B && B.demo)) demoStart(); // two bots fight behind the hangar
  } else if (
    B &&
    !B.demo &&
    G.mode !== 'mp' &&
    (G.phase === 'battle' || G.phase === 'wait' || G.phase === 'world') &&
    !B.paused
  ) {
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
  G.quickTeams = +load('sd.teamSize') === 2 ? 2 : 1;
  G.runTeams = +load('sd.runTeams') === 2 ? 2 : 1;
  G.partnerStyle = PARTNER_STYLES.some(p => p[0] === load('sd.partner')) ? load('sd.partner') : 'gunner';
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
    id === 'world'
      ? (sv =>
          sv
            ? `${sv.done} missions · ${Object.values(sv.inv).reduce((a, b) => a + b, 0)} parts`
            : 'New · alone or co-op')(owSaved())
      : id === 'run'
        ? runBest()
          ? `Best: wave ${runBest()}`
          : 'No run yet'
        : id === 'solo'
          ? `${G.quickTeams === 2 ? '2v2' : '1v1'} · ${G.quickFmt === 'brawl' ? 'Brawl' : 'Draft'} · ${DIFF[G.diff].name}`
          : id === 'online'
            ? 'Online or local'
            : id === 'daily'
              ? (st => (st.best[dailyId()] != null ? `Best today ${st.best[dailyId()]}` : dailyToday().rule.name))(
                  dailyState()
                )
              : id === 'league'
                ? (L =>
                    !L
                      ? 'No season yet'
                      : L.champion
                        ? `Season ${L.season} done`
                        : `Season ${L.season} · day ${Math.min(L.day + 1, LEAGUE_DAYS)}/${LEAGUE_DAYS}`)(loadLeague())
                : `${MODS.length} parts`;
  $('#ovMenu').classList.toggle('live', false);
  $('#ovMenu').innerHTML = `<div class="hangar${resume ? ' resume' : ''}">
    <header class="hg-top">
      <div class="hg-brand" aria-label="Scrap Duel">SCRAP<b>DUEL</b></div>
      <div class="hg-prof">${badgeHTML(G.style.badge, 40)}
        <div><input id="mName" class="hg-name" maxlength="16" value="${esc(G.name)}" aria-label="Your name"><span class="small">${esc(titleName(G.style.title))}</span></div>
        ${walletHtml()}</div>
      <nav class="hg-sys" aria-label="System"><button class="mlink" id="mHow">How to play</button><button class="mlink" id="mCodex">Codex</button><button class="mlink" id="mSettings">Settings</button><button class="mlink" id="mSound">${MUTE ? 'Sound off' : 'Sound on'}</button><button class="mlink" id="mFull" title="Fullscreen (F11)">${document.fullscreenElement || (window.desktop && window.desktop.isFullscreen) ? 'Window' : 'Fullscreen'}</button>${window.desktop ? '<button class="mlink" id="mQuit">Quit</button>' : ''}</nav>
    </header>
    <main class="hg-main">
      <section class="hg-car" aria-label="Your car">
        <div class="hg-pad"><div class="hg-spot" aria-hidden="true"></div><div class="hg-turn" aria-hidden="true"></div><img src="${car}" alt="Your car"><canvas class="hg-fx" id="hgFx" aria-hidden="true"></canvas><div class="hq-stk">${(G.style.stickers || []).map(id => `<img alt="" src="${stickerURL(id, 48)}">`).join('')}</div></div>
        <div class="hg-carinfo">
          <div class="hg-chips">${set ? `<span class="settag" style="--sc:${STICKER_SETS[set].col}">${esc(STICKER_SETS[set].name)} set on</span>` : ''}${lo.map(g => `<span class="hg-chip"><img alt="" src="${iconURL(g.id, 32)}">${esc(gearName(g))}</span>`).join('')}${lo.length ? '' : '<span class="small">No gear in your loadout yet.</span>'}</div>
          <button class="btn ghost" id="mGarage">Garage · gear, skins, stickers</button>
          ${resume ? '' : contractsHtml()}
        </div>
      </section>
      <section class="hg-play">
        ${
          resume
            ? `<div class="hg-cont" style="--rc:#3fe0a0"><span class="label">Match in progress</span><h2>${esc(MATCH_FORMATS[G.format].name)}</h2><button class="btn hg-go" id="mResume">Resume match</button></div>`
            : `<div class="hg-cont" style="--rc:#ffd257"><span class="label">Ready when you are</span>
          <h2>Jump into a fight</h2><div class="hg-live" id="hgLive" hidden></div><p class="small">${rec.w + rec.l ? `Your record against bots: <b>${rec.w}</b> wins, <b>${rec.l}</b> losses${runBest() ? ` · best Gauntlet wave ${runBest()}` : ''}.` : 'Draft a car, outbuild a bot, or team up with a friend online.'}</p>
          <div class="hg-row"><button class="btn hg-go" id="mQuick">Quick match vs bot</button><button class="btn ghost" id="mQuick2">2v2 with a bot partner</button></div></div>`
        }
        <div class="hg-modes" role="tablist" aria-label="Other modes">${MENU_MODES.map(m => `<button class="hg-mode" role="tab" data-mode="${m.id}" aria-selected="${m.id === menuMode}" style="--rc:${m.col}"><svg class="hg-ico" viewBox="0 0 24 24" aria-hidden="true">${MODE_ICONS[m.id] || ''}</svg><b>${m.name}</b><span>${esc(m.line)}</span><em>${stat(m.id)}</em></button>`).join('')}</div>
        <div class="hg-opts" id="hgOpts" role="tabpanel"></div>
      </section>
    </main>
    <footer class="hg-foot"><div class="hg-led" aria-live="off"><b>PIT FM</b><div class="hg-tick" id="hgTick"><span>${esc(pick(TAGLINES))}</span></div></div></footer>
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
    if (!$('#hgTick') || $('#ovMenu').hidden) return clearInterval(showMenu.tag);
    hangarTicker(pick(TAGLINES)); // tips and jokes between the live lines
  }, 17000);
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
  on('mFull', () => {
    sfx('ui');
    toggleFullscreen();
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
  swapIn(el);
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
    solo: `<div class="hg-o"><span class="mlab">Teams</span>${seg(
      'teamSeg',
      [
        ['1', '1 vs 1'],
        ['2', '2 vs 2 with a bot partner']
      ],
      String(G.quickTeams),
      't'
    )}</div>${
      G.quickTeams === 2
        ? `<div class="hg-o"><span class="mlab">Your partner</span>${seg('partnerSeg', PARTNER_STYLES, G.partnerStyle, 'p')}</div>`
        : ''
    }<div class="hg-o"><span class="mlab">Format</span>${seg(
      'fmtSeg',
      [
        ['balanced', 'Draft duel'],
        ['brawl', 'Blueprint Brawl']
      ],
      G.quickFmt,
      'f'
    )}</div><div class="hg-o"><span class="mlab">Difficulty</span>${diff}</div><div class="hg-o"><span class="mlab">Length</span>${rounds}</div><p class="small" id="fmtText">${G.quickFmt === 'brawl' ? `Bring one finished car worth up to ${BRAWL_BUDGET} coins: a saved blueprint or a ready-made one. No drafting, no shop.` : 'Start with a cockpit, draft a part every round, shop and outbuild the bot.'}</p><button class="btn hg-go2" id="mPlay">${G.quickFmt === 'brawl' ? 'Start a Brawl' : 'Play vs bot'}</button>`,
    league: leagueMenuHtml(),
    daily: dailyMenuHtml(),
    run: `<div class="hg-o"><span class="mlab">Teams</span>${seg(
      'runSeg',
      [
        [1, 'Alone'],
        [2, 'With a bot partner']
      ],
      G.runTeams === 2 ? 2 : 1,
      'rt'
    )}</div>${G.runTeams === 2 ? `<div class="hg-o"><span class="mlab">Your partner</span>${seg('partnerSeg', PARTNER_STYLES, G.partnerStyle, 'p')}</div>` : ''}<p class="small">Survive as long as you can. Hearts carry over; relics stack. Your loadout gear comes along.${G.runTeams === 2 ? ' With a partner, every wave brings two rivals.' : ''}</p><button class="btn hg-go2" id="mPlay">Start a run</button>`,
    world:
      (sv => `<p class="small">One big map built from every arena, with day and night. Loot buildings for parts, rebuild your car at camps, take missions, wreck raiders and bosses. To play together: Friends → Host a room → Open world.</p>
      ${owCarPicker('owCar')}
      <div class="mrow">${sv ? `<button class="btn hg-go2" id="owCont">Continue · ${sv.done} missions, ${Object.values(sv.inv).reduce((a, b) => a + b, 0)} parts</button>` : ''}<button class="btn ${sv ? 'ghost' : 'hg-go2'}" id="owPlay">${sv ? 'New world' : 'Enter the open world'}</button></div>`)(
        owSaved()
      ),
    online: `<p class="small">Host a room and share the code. As host you pick Draft duel or Blueprint Brawl.</p><div class="mrow"><button class="btn" id="mHost">Host a room</button><input class="codein" id="mCode" maxlength="4" placeholder="CODE" aria-label="Room code"><button class="btn ghost" id="mJoin">Join</button></div>
      <div class="hg-o local2"><span class="mlab">On this PC</span><p class="small">Player 1 on keyboard and mouse, player 2 on a controller. Both bring a finished car, five rounds.${PAD.on ? ' Controller ready.' : ''}</p>
      <div class="mrow"><select id="p2Car" aria-label="Player 2's car">${BRAWL_TYPES.map(t => `<option>${esc(t.name)}</option>`).join('')}</select><button class="btn ghost" id="mLocal">Local duel</button></div></div>`
  }[m.id];
  el.style.setProperty('--rc', m.col);
  el.innerHTML = body;
  if (m.id === 'league') leagueMenuWire(menuOpts);
  if ($('#owCar')) $('#owCar').onchange = () => store('sd.owCar', $('#owCar').value);
  if ($('#owPlay'))
    $('#owPlay').onclick = () => {
      sfx('ui');
      menuLeave();
      store('sd.owCar', $('#owCar').value);
      const [d, label] = owChosenDesign();
      startWorld(d, label);
    };
  if ($('#owCont'))
    $('#owCont').onclick = () => {
      sfx('ui');
      menuLeave();
      const sv = owSaved();
      startWorld(unpackDesign(sv.design), sv.label, { save: sv });
    };
  if ($('#mLocal'))
    $('#mLocal').onclick = () => {
      sfx('ui');
      G.started = true;
      startLocalDuel($('#p2Car').value);
    };
  if ($('#dlPlay'))
    $('#dlPlay').onclick = () => {
      sfx('ui');
      G.started = true;
      playDaily();
    };
  $$('#diffSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.diff = +b.dataset.i;
      $$('#diffSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
      store('sd.diff', G.diff);
      sfx('ui');
    })
  );
  $$('#teamSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.quickTeams = +b.dataset.t;
      store('sd.teamSize', G.quickTeams);
      sfx('ui');
      menuOpts();
    })
  );
  $$('#runSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.runTeams = +b.dataset.rt;
      store('sd.runTeams', G.runTeams);
      sfx('ui');
      menuOpts();
    })
  );
  $$('#partnerSeg button').forEach(b =>
    b.addEventListener('click', () => {
      G.partnerStyle = b.dataset.p;
      store('sd.partner', G.partnerStyle);
      $$('#partnerSeg button').forEach(x => x.setAttribute('aria-pressed', x === b));
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
      else {
        G.teamSize = G.quickTeams;
        startMatch('solo', null, G.quickFmt === 'brawl' ? 'brawl' : 'balanced');
      }
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
/** One-click setups for a room. Everything else hides under "Change details". */
const LOBBY_PRESETS = [
  {
    id: 'duel',
    name: 'Duel',
    line: 'You against your friend. Draft a car round by round.',
    f: 'balanced',
    r: 10,
    ts: 1
  },
  {
    id: 'brawl',
    name: 'Quick brawl',
    line: 'Bring a finished car. Five fast rounds, just driving.',
    f: 'brawl',
    r: 5,
    ts: 1
  },
  {
    id: 'coop',
    name: 'Team up',
    line: 'You two on one team against two bots.',
    f: 'balanced',
    r: 10,
    ts: 2,
    same: true
  },
  {
    id: 'teams',
    name: 'Team vs team',
    line: 'Each of you with a bot partner, against each other.',
    f: 'balanced',
    r: 10,
    ts: 2,
    same: false
  },
  {
    id: 'world',
    name: 'Open world',
    line: 'Explore together: loot buildings, take missions, wreck raiders.',
    world: true
  }
];
function lobbyPreset() {
  if (G.mpWorld) return LOBBY_PRESETS.find(p => p.world);
  const T = G.mpTeams || { host: 0, client: 1 },
    ts = G.mpTeamSize === 2 ? 2 : 1,
    f = G.mpFormat || 'balanced',
    r = G.mpRounds || 10;
  return LOBBY_PRESETS.find(
    p => p.f === f && p.r === r && p.ts === ts && (ts === 1 || p.same === (T.host === T.client))
  );
}
function lobbySummary() {
  if (G.mpWorld) return 'Open world together · each brings their own car';
  const T = G.mpTeams || { host: 0, client: 1 },
    ts = G.mpTeamSize === 2 ? 2 : 1;
  return `${MATCH_FORMATS[G.mpFormat || 'balanced'].name} · ${G.mpRounds || 10} rounds · ${ts === 2 ? (T.host === T.client ? '2 vs 2, you two together' : '2 vs 2, against each other') : '1 vs 1'}`;
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
          ? '<p>Send this code to your friend. Waiting for them to join…</p>'
          : '<p>Opening a room…</p>'
        : '<p>Connecting…</p>';
  const cur = lobbyPreset();
  c.innerHTML = `<span class="label">${host ? 'Your room' : 'Joining a room'}</span><h2>Play with a friend</h2>
    <div class="lcode"><div class="code">${esc(n.code || '····')}</div>${host && n.code ? '<button class="btn ghost sm" id="lCopy">Copy code</button>' : ''}</div>${st}
    <div class="lstat"><span><span class="dot on"></span>${esc(G.name)}</span><span><span class="dot${n.connected ? ' on' : ''}"></span>${n.connected ? esc(G.oppName) : 'Friend'}</span></div>
    ${
      host
        ? `<div class="lpresets" role="radiogroup" aria-label="What to play">${LOBBY_PRESETS.map(p => `<button class="lpre" data-pre="${p.id}" role="radio" aria-checked="${cur === p}"><b>${esc(p.name)}</b><span>${esc(p.line)}</span></button>`).join('')}</div>
      ${G.mpWorld ? owCarPicker('lowCar') : ''}<details class="lmore"${cur ? '' : ' open'}${G.mpWorld ? ' hidden' : ''}><summary>Change details · ${esc(lobbySummary())}</summary>
        <div class="hg-o"><span class="mlab">Mode</span><div class="seg rseg" id="lFormat" aria-label="Mode">${Object.entries(
          MATCH_FORMATS
        )
          .map(
            ([k, f]) =>
              `<button data-f="${k}" aria-pressed="${k === (G.mpFormat || 'balanced')}" title="${esc(f.desc)}">${esc(f.name)}</button>`
          )
          .join('')}</div></div>
        <div class="hg-o"><span class="mlab">Length</span><div class="seg rseg" id="lRounds" aria-label="Match length">${ROUND_CHOICES.map(r => `<button data-n="${r}" aria-pressed="${r === (G.mpRounds || 10)}">${r} rounds</button>`).join('')}</div></div>
        ${lobbyTeamsHtml(host, n.connected)}
      </details>`
        : `<p class="lsum">The host picked: <b>${esc(lobbySummary())}</b></p>${G.mpWorld ? owCarPicker('lowCar') : G.mpTeamSize === 2 ? lobbyTeamsHtml(host, n.connected) : ''}`
    }
    ${n.connected && h2hLine(G.oppName) ? `<p class="small">${h2hLine(G.oppName)}</p>` : ''}
    <p class="small fairline">Online is fair play: gear levels and sticker perks stay at home. Your skin, stickers and trail still show.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${host ? `<button class="btn" id="lStart" ${n.connected ? '' : 'disabled'}>${n.connected ? (G.mpWorld ? 'Start together' : 'Start match') : 'Waiting for your friend…'}</button>` : n.connected ? '<span class="small">Waiting for the host to start…</span>' : ''}<button class="btn ghost" id="lCancel">Leave room</button></div>`;
  const keepOpen = () => {
    const d = $('.lmore');
    return d && d.open;
  };
  $$('[data-pre]').forEach(b =>
    b.addEventListener('click', () => {
      const p = LOBBY_PRESETS.find(x => x.id === b.dataset.pre);
      G.mpWorld = !!p.world;
      if (p.world) {
        Net.sendLobby();
        sfx('ui');
        return lobbyUI();
      }
      G.mpFormat = p.f;
      G.mpRounds = p.r;
      G.mpTeamSize = p.ts;
      G.mpTeams = p.ts === 2 ? (p.same ? { host: 0, client: 0 } : { host: 0, client: 1 }) : { host: 0, client: 1 };
      Net.sendLobby();
      sfx('ui');
      lobbyUI();
    })
  );
  const lc = $('#lowCar');
  if (lc) lc.onchange = () => store('sd.owCar', lc.value);
  const cp = $('#lCopy');
  if (cp)
    cp.addEventListener('click', () => {
      try {
        navigator.clipboard.writeText(n.code);
        cp.textContent = 'Copied';
      } catch (e) {}
    });
  $$('#lFormat button').forEach(b =>
    b.addEventListener('click', () => {
      G.mpFormat = b.dataset.f;
      Net.sendLobby();
      sfx('ui');
      lobbyUI();
      if (!keepOpen() && $('.lmore')) $('.lmore').open = true;
    })
  );
  $$('#lRounds button').forEach(b =>
    b.addEventListener('click', () => {
      G.mpRounds = +b.dataset.n;
      Net.sendLobby();
      sfx('ui');
      lobbyUI();
      if ($('.lmore')) $('.lmore').open = true;
    })
  );
  $$('#lTeamSize button').forEach(b =>
    b.addEventListener('click', () => {
      G.mpTeamSize = +b.dataset.ts;
      G.mpTeams = G.mpTeams || { host: 0, client: 1 };
      Net.sendLobby();
      sfx('ui');
      lobbyUI();
      if ($('.lmore')) $('.lmore').open = true;
    })
  );
  $$('[data-side]').forEach(b =>
    b.addEventListener('click', () => {
      const side = +b.dataset.side;
      G.mpTeams = G.mpTeams || { host: 0, client: 1 };
      if (host) {
        G.mpTeams.host = side;
        Net.sendLobby();
      } else {
        G.mpTeams.client = side;
        Net.send({ t: 'team', team: side });
      }
      sfx('ui');
      lobbyUI();
      if ($('.lmore')) $('.lmore').open = true;
    })
  );
  const s = $('#lStart');
  if (s)
    s.addEventListener('click', () => {
      if (!n.connected) return;
      if (G.mpWorld) return owHostStart();
      const format = G.mpFormat || 'balanced';
      const rounds = setRounds(G.mpRounds || 10);
      const sched = makeSchedule(rounds),
        teamSize = G.mpTeamSize === 2 ? 2 : 1,
        T = G.mpTeams || { host: 0, client: 1 },
        coop = teamSize === 2 && T.host === T.client;
      Net.send({ t: 'begin', sched, format, rounds, teamSize, coop });
      beginMP(sched, format, rounds, teamSize, coop);
    });
  $('#lCancel').addEventListener('click', () => {
    Net.close();
    $('#ovLobby').hidden = true;
    showMenu();
  });
}
/** Lobby: 1v1 or 2v2 (the host decides), and in 2v2 both players pick their own side. Bots fill the rest. */
function lobbyTeamsHtml(host, connected) {
  const size = G.mpTeamSize === 2 ? 2 : 1,
    T = G.mpTeams || { host: 0, client: 1 },
    meSide = host ? T.host : T.client,
    friendSide = host ? T.client : T.host;
  const sizeSeg = host
    ? `<div class="seg rseg" id="lTeamSize" aria-label="Teams"><button data-ts="1" aria-pressed="${size === 1}">1 vs 1</button><button data-ts="2" aria-pressed="${size === 2}">2 vs 2</button></div>`
    : ''; // the friend already sees the host's choice in the summary line
  if (size !== 2) return sizeSeg;
  const side = (i, label, col) => {
    const members = [];
    if (meSide === i) members.push(`<li class="you">${esc(G.name)} (you)</li>`);
    if (connected && friendSide === i) members.push(`<li>${esc(G.oppName || 'Friend')}</li>`);
    while (members.length < 2) members.push('<li class="bot">Bot</li>');
    return `<div class="tside" style="--tc:${col}"><b>${label}</b><ul>${members.join('')}</ul>${meSide === i ? '<span class="small">You are here</span>' : `<button class="btn ghost sm" data-side="${i}">Join ${label}</button>`}</div>`;
  };
  return `${sizeSeg}<div class="tpick">${side(0, 'Blue team', '#4ea1ff')}${side(1, 'Red team', '#ff5c5c')}</div>
    <p class="small">${meSide === friendSide ? 'Same team: you two against two bots.' : 'Different teams: each of you gets a bot partner.'}</p>`;
}
function beginMP(sched, format = 'balanced', rounds = 10, teamSize = 1, coop = false) {
  G.started = true;
  G.mpTeamSize = teamSize;
  G.mpCoop = teamSize === 2 && coop;
  G.mpBots = null;
  G.mpBotsRound = null;
  G.teamSize = teamSize;
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
    // full quality stays on; only a hint where to find the faster mode
    AUTO_PERF.done = true;
    toast('Running slowly? Settings → Performance mode makes it smoother.', true);
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
    gamepadTick(dt);
  } catch (e) {}
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
      hangarFxTick(dt);
    } else if ((G.phase === 'wait' || G.phase === 'battle' || G.phase === 'world') && B) {
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
      if (
        B &&
        B.rec &&
        (G.phase === 'battle' || (G.phase === 'world' && B.net === 'host')) &&
        !B.paused &&
        !Net.reconnecting
      )
        recTick(dt);
      if (B && G.phase === 'wait' && Math.random() < 0.05) oppStatusUI();
    } else {
      ANIM += dt;
      hangarFxTick(dt);
      // the open world keeps running while you rebuild at a camp (your friend is still out there)
      if (G.owGarage && B && B.ow) {
        stepArena(dt);
        if (B.rec && B.net === 'host' && !Net.reconnecting) recTick(dt);
      }
      if ((building() || G.phase === 'draft') && $('#ovCrate').hidden && builderBusy()) {
        bfxTick(dt);
        drawBP();
      }
    }
  } catch (e) {
    console.error(e);
    reportError(e.message, e.stack);
  }
  requestAnimationFrame(loop);
}
addEventListener('resize', () => {
  if (G.phase !== 'wait' && G.phase !== 'battle' && G.phase !== 'world') sizeBP();
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
if (!window.__SD_TEST__ || (typeof location !== 'undefined' && /boot/.test(location.search + location.hash)))
  bootScreen();
requestAnimationFrame(loop);

// Test hook: the headless test suite sets window.__SD_TEST__ before the page script runs.
if (window.__SD_TEST__)
  window.__SD = {
    gearActive,
    gearOptions5,
    gearPicked5,
    addChip,
    gearSocket,
    gearUnsocket,
    chipFuse,
    chipKey,
    gearReforge,
    setProgress,
    loadoutSets,
    applySets,
    bossTick,
    contractsToday,
    contractsUpdate,
    startLocalDuel,
    readPad2,
    playDaily,
    dailyToday,
    dailyResult,
    dailyState,
    newSeason,
    playLeague,
    leagueResult,
    getLeague: () => LEAGUE,
    PROG: () => PROG,
    gimmickCar,
    AW: () => AW,
    drawBossWorld,
    BOSSES,
    applyFlair,
    gearFamily,
    DUP_XP,
    flairCfg,
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
    setGear: g => (GEAR = { loadout: [], locked: [], chips: {}, ...g }),
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
    drawModule,
    designURL,
    beginMP,
    myTeam,
    teamOf,
    lobbyTeamsHtml,
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
    SURFACES,
    surfaceOf,
    surfaceFit,
    surfaceAdvice,
    tyreOf,
    genArena,
    calc,
    JUNK,
    JUNKDRAW,
    drawModule,
    setAnim: a => (ANIM = a),
    bpCellClient: (x, y) => {
      const r = bp.getBoundingClientRect();
      return [r.left + cpx(x) + cell / 2, r.top + cpy(y) + cell / 2];
    },
    partMotion,
    getOW: () => OW,
    owSaved,
    cineTitle,
    cineDoors,
    owBoard,
    owLootDrop,
    owTakePart,
    owStartMission,
    owEndMission,
    dmgObj,
    startWorld,
    leaveWorld,
    owGenChunk,
    owThemeAt,
    owGround,
    getAW: () => [AW, AH],
    stepArena,
    kickOf,
    fireWeapons: (v, dt) => weapons(v, dt),
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

/** The car picker for the open world (menu tile and online room). */
function owCarPicker(id) {
  const cur = load('sd.owCar') || 't0';
  const opts = [
    ...(G.base && G.base.size > 4 ? [['mine', 'The car in your garage']] : []),
    ...brawlSaved().map((b, i) => ['bp' + i, b.name]),
    ...BRAWL_TYPES.map((t, i) => ['t' + i, t.name])
  ];
  return `<div class="hg-o"><span class="mlab">Your car</span><select id="${id}" aria-label="Your car for the open world">${opts.map(([v, n]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
}
