// Settings (volume, screen shake, damage numbers, hit markers), the pause menu, controls card and hotkeys.
const SETTINGS = {
  vol: 1,
  music: 0.4,
  shake: true,
  nums: true,
  marks: true,
  voice: true,
  comm: true,
  commVoice: true,
  motion: true,
  crateSpin: true,
  perf: false,
  fps: false
};
try {
  Object.assign(SETTINGS, JSON.parse(load('sd.settings') || '{}'));
} catch (e) {}
const saveSettings = () => store('sd.settings', SETTINGS);
function applyVolume() {
  if (MASTER) MASTER.gain.value = 0.45 * SETTINGS.vol;
}

const CONTROLS = [
  ['W A S D', 'Drive and steer'],
  ['Mouse', 'Aim'],
  ['Left click / Space', 'Fire (hold)'],
  ['Right click', 'Action: piston, flipper, catapult, tractor, hinges and rams'],
  ['1 – 9', 'Action groups (bind parts with Keys in the garage)'],
  ['Shift', 'Boosters and nitro'],
  ['J', 'Jump jets'],
  ['Q / E', 'Strafe (omni wheels)'],
  ['Z', 'Drop oil, glue, banana peels, mines'],
  ['V', 'Countermeasure: smoke, decoy, jammer, flare, EMP, flash-bang'],
  ['F', 'Blink'],
  ['H', 'Horn'],
  ['C', 'Anchor'],
  ['X', 'Release couplers'],
  ['Esc / P', 'Pause'],
  ['Garage', 'R turn part · T rotate · X remove · M mirror · Ctrl+Z undo'],
  ['Garage tools', 'G keys · L wire logic chips · [ ] beam length'],
  ['Draft', '1 / 2 / 3 take a card · R reroll']
];
const controlsHtml = () =>
  `<div class="ctrls">${CONTROLS.map(([k, d]) => `<span class="kbd2">${esc(k)}</span><span>${esc(d)}</span>`).join('')}</div>`;

/* ---------- settings ---------- */
function openSettings(back) {
  const c = $('#settingsCard');
  const toggle = (id, label, on) =>
    `<label class="tgl"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  c.innerHTML = `<span class="label">Settings</span><h2>Settings</h2>
    <label class="vol"><span>Volume</span><input type="range" id="setVol" min="0" max="1" step="0.05" value="${SETTINGS.vol}"><b id="setVolV">${Math.round(SETTINGS.vol * 100)}%</b></label>
    <label class="vol"><span>Battle music</span><input type="range" id="setMusic" aria-label="Battle music volume" min="0" max="1" step="0.05" value="${SETTINGS.music}"><b id="setMusicV">${Math.round(SETTINGS.music * 100)}%</b></label>
    ${toggle('setMute', 'Mute all sound', MUTE)}
    ${toggle('setVoice', 'Announcer voice', SETTINGS.voice !== false)}
    ${toggle('setComm', 'Commentators (captions)', SETTINGS.comm !== false)}
    ${toggle('setCommVoice', 'Commentator voices', SETTINGS.commVoice !== false)}
    ${toggle('setMotion', 'Decorative motion', SETTINGS.motion)}
    ${toggle('setCrateSpin', 'Animate mystery crates', SETTINGS.crateSpin)}
    ${toggle('setShake', 'Screen shake', SETTINGS.shake)}
    ${toggle('setNums', 'Floating damage numbers', SETTINGS.nums)}
    ${toggle('setMarks', 'Hit markers', SETTINGS.marks)}
    ${toggle('setPerf', 'Performance mode (lower resolution, smoother on older PCs)', SETTINGS.perf)}
    ${toggle('setFps', 'Show frame rate (FPS)', SETTINGS.fps)}
    <div class="rbtns"><button class="btn ghost" id="setTips">Show tips again</button><button class="btn ghost" id="setReset">Reset Garage Style progress</button></div>
    <button class="btn" id="setDone">Done</button>`;
  $('#ovSettings').hidden = false;
  $('#setVol').addEventListener('input', e => {
    SETTINGS.vol = +e.target.value;
    $('#setVolV').textContent = Math.round(SETTINGS.vol * 100) + '%';
    applyVolume();
    saveSettings();
  });
  $('#setVol').addEventListener('change', () => sfx('ui'));
  $('#setMusic').oninput = e => {
    SETTINGS.music = +e.target.value;
    $('#setMusicV').textContent = Math.round(SETTINGS.music * 100) + '%';
    saveSettings();
    BattleMusic.update();
  };
  $('#setMute').addEventListener('change', e => {
    MUTE = e.target.checked;
    store('sd.mute', MUTE ? 1 : 0);
  });
  for (const [id, k] of [
    ['setVoice', 'voice'],
    ['setComm', 'comm'],
    ['setCommVoice', 'commVoice'],
    ['setMotion', 'motion'],
    ['setFps', 'fps'],
    ['setCrateSpin', 'crateSpin'],
    ['setShake', 'shake'],
    ['setNums', 'nums'],
    ['setMarks', 'marks'],
    ['setPerf', 'perf']
  ])
    $('#' + id).addEventListener('change', e => {
      SETTINGS[k] = e.target.checked;
      saveSettings();
      if (B) {
        sizeArena();
        clearArenaInput();
      }
    });
  $('#setTips').addEventListener('click', e => {
    seenTips = new Set();
    store('sd.tips', []);
    e.target.textContent = 'Tips will show again';
  });
  let armed = false;
  $('#setReset').addEventListener('click', e => {
    if (!armed) {
      armed = true;
      e.target.textContent = 'Click again to wipe XP and unlocks';
      return;
    }
    PROG = { xp: 0, ach: [] };
    saveProg();
    G.style = { ...DEFAULT_STYLE };
    saveStyle();
    e.target.textContent = 'Progress reset';
  });
  $('#setDone').addEventListener('click', () => {
    $('#ovSettings').hidden = true;
    sfx('ui');
    if (back) back();
  });
}

/* ---------- pause ---------- */
const canPause = () => B && !B.demo && !B.replay && (G.phase === 'battle' || G.phase === 'wait');
function togglePause(force) {
  if (!canPause()) return;
  const online = G.mode === 'mp';
  const open = force !== undefined ? force : $('#ovPause').hidden;
  if (!open) {
    $('#ovPause').hidden = true;
    B.paused = false;
    return;
  }
  if (!online) B.paused = true;
  clearArenaInput();
  sfx('pause');
  const forfeit = G.phase === 'battle' && G.mode === 'solo';
  $('#pauseCard').innerHTML =
    `<span class="label">${online ? 'Online match · still running' : 'Game paused'}</span><h2>${online ? 'Menu' : 'Paused'}</h2>
    <div class="pmenu">
      <button class="btn" id="pResume"><i>▶</i>Resume</button>
      ${G.phase === 'wait' ? '<button class="btn ghost" id="pGarage"><i>⚒</i>Back to garage</button>' : ''}
      <button class="btn ghost" id="pSettings"><i>⚙</i>Settings</button>
      <button class="btn ghost" id="pControls"><i>⌨</i>Controls</button>
      <button class="btn ghost" id="pFull"><i>⛶</i>${document.fullscreenElement || (window.desktop && window.desktop.isFullscreen) ? 'Exit fullscreen' : 'Fullscreen'}</button>
      ${forfeit ? '<button class="btn ghost warn" id="pForfeit"><i>⚑</i>Forfeit round</button>' : ''}
      <button class="btn ghost quit" id="pMenu"><i>⏏</i>Main menu</button>
    </div>
    <div id="pExtra"></div>`;
  $('#pauseCard').classList.add('pause2');
  setTimeout(() => !$('#ovPause').hidden && zap($('#pauseCard')), 60);
  $('#ovPause').hidden = false;
  $('#pResume').addEventListener('click', () => togglePause(false));
  const pf = $('#pFull');
  if (pf)
    pf.addEventListener('click', async () => {
      await toggleFullscreen();
      togglePause(false);
    });
  $('#pControls').addEventListener('click', () => ($('#pExtra').innerHTML = controlsHtml()));
  $('#pSettings').addEventListener('click', () => {
    $('#ovPause').hidden = true;
    openSettings(() => ($('#ovPause').hidden = false));
  });
  const f = $('#pForfeit');
  if (f)
    f.addEventListener('click', () => {
      togglePause(false);
      if (B && B.seq === 'play') endRound(1 - B.me, `${G.name} forfeited the round.`);
    });
  const g = $('#pGarage');
  if (g)
    g.addEventListener('click', () => {
      togglePause(false);
      openBuild();
    });
  $('#pMenu').addEventListener('click', () => {
    togglePause(false);
    showMenu();
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && canPause() && G.mode !== 'mp' && !B.paused) togglePause(true);
});

/* ---------- hotkeys outside the arena ---------- */
addEventListener('keydown', e => {
  if (e.target && (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable)) return;
  if (e.defaultPrevented) return;
  if (e.code === 'Escape' && !$('#ovMenu').hidden && inMatch()) {
    // Esc on the in-match menu works like "Resume match"
    e.preventDefault();
    $('#ovMenu').hidden = true;
    return;
  }
  if (
    (e.code === 'Escape' || e.code === 'KeyP') &&
    canPause() &&
    $('#ovCodex').hidden &&
    $('#ovSettings').hidden &&
    $('#ovMenu').hidden
  ) {
    e.preventDefault();
    togglePause();
    return;
  }
  if (G.phase === 'draft' && !$('#ovDraft').hidden && !e.repeat) {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined) {
      const opt = $$('#ovDraft .opt')[n];
      if (opt) opt.click();
    } else if (e.code === 'KeyR') {
      const r = $('#btnReroll');
      if (r && !r.disabled) r.click();
    }
  }
});
