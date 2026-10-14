// Controller support and key rebinding.
// Rebinding: the game keeps using its own key codes inside (bots and online play rely on them); a binding only maps
// the physical key you press to the code it stands for. Controller: driving, aiming and every action in battle,
// and moving through every menu with the d-pad or left stick (A presses, B goes back, Start pauses).
const BINDABLE = [
  ['KeyW', 'Drive forward'],
  ['KeyS', 'Reverse'],
  ['KeyA', 'Steer left'],
  ['KeyD', 'Steer right'],
  ['KeyQ', 'Strafe left (omni wheels)'],
  ['KeyE', 'Strafe right (omni wheels)'],
  ['Space', 'Fire'],
  ['ShiftLeft', 'Boost'],
  ['KeyJ', 'Jump'],
  ['KeyZ', 'Drop (oil, mines, peels)'],
  ['KeyV', 'Gadget (EMP, flash-bang)'],
  ['KeyX', 'Release (harpoon, tow)'],
  ['KeyF', 'Blink'],
  ['KeyH', 'Horn'],
  ['KeyC', 'Anchor']
];
let KEYBIND = {}; // default code -> the key the player uses instead
let KEYMAP = {}; // physical key -> default code (null = the key is taken by something else)
function loadBinds() {
  try {
    KEYBIND = JSON.parse(load('sd.keys') || '{}') || {};
  } catch (e) {
    KEYBIND = {};
  }
  rebuildKeymap();
}
function rebuildKeymap() {
  KEYMAP = {};
  for (const [code, key] of Object.entries(KEYBIND)) {
    if (!key || key === code) continue;
    KEYMAP[key] = code;
    if (!(code in KEYMAP)) KEYMAP[code] = null; // the old key no longer does this
  }
}
const mappedKey = code => (code in KEYMAP ? KEYMAP[code] : code);
const keyLabel = code =>
  (code || '')
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Arrow/, '')
    .replace('ShiftLeft', 'Left Shift')
    .replace('ShiftRight', 'Right Shift')
    .replace('ControlLeft', 'Left Ctrl')
    .replace('Space', 'Space');
const boundKey = code => KEYBIND[code] || code;
function setBind(code, key) {
  // a key can only do one thing: free it from any other action first
  for (const [c, k] of Object.entries(KEYBIND)) if (k === key) delete KEYBIND[c];
  if (key === code) delete KEYBIND[code];
  else KEYBIND[code] = key;
  store('sd.keys', KEYBIND);
  rebuildKeymap();
}
function resetBinds() {
  KEYBIND = {};
  store('sd.keys', KEYBIND);
  rebuildKeymap();
}
loadBinds();

/* ---------- controller ---------- */
const PAD = { on: false, lx: 0, ly: 0, rx: 0, ry: 0, rt: 0, lt: 0, b: [], prev: [], navT: 0, aimA: null };
// Xbox layout: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 View, 9 Menu, 12-15 d-pad
const PAD_EDGES = { 1: 'KeyJ', 2: 'KeyZ', 3: 'KeyV', 4: 'KeyH', 5: 'KeyF', 13: 'KeyX', 12: 'KeyC' };
const dz = (v, d = 0.18) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));
function readPad() {
  let gp = null;
  try {
    for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected) gp = gp || g;
  } catch (e) {}
  if (!gp) {
    PAD.on = false;
    return null;
  }
  PAD.prev = PAD.b;
  PAD.b = gp.buttons.map(b => b.pressed || b.value > 0.5);
  PAD.lx = dz(gp.axes[0] || 0);
  PAD.ly = dz(gp.axes[1] || 0);
  PAD.rx = dz(gp.axes[2] || 0, 0.25);
  PAD.ry = dz(gp.axes[3] || 0, 0.25);
  PAD.rt = gp.buttons[7] ? gp.buttons[7].value : 0;
  PAD.lt = gp.buttons[6] ? gp.buttons[6].value : 0;
  if (!PAD.on && PAD.b.some(Boolean)) {
    PAD.on = true;
    document.body.classList.add('pad');
    toast('Controller connected. Left stick drives, right stick aims, RT fires.', true);
  }
  return gp;
}
const padPressed = i => PAD.b[i] && !PAD.prev[i];
/** Battle input from the controller, merged into the keyboard input by readLocal. */
function padBattle(i, v) {
  if (!PAD.on) return;
  if (Math.abs(PAD.ly) > 0 || Math.abs(PAD.lx) > 0) {
    i.th = -PAD.ly;
    i.st = PAD.lx;
  }
  if (PAD.rt > 0.3) i.fire = true;
  if (PAD.lt > 0.3) {
    if (!i.rmb) i.edges.add('RMB');
    i.rmb = true;
  }
  if (PAD.b[0]) i.boost = true;
  for (const [btn, code] of Object.entries(PAD_EDGES)) if (padPressed(+btn)) i.edges.add(code);
  // right stick aims around your car; let go and the last direction is kept
  if (v && Math.hypot(PAD.rx, PAD.ry) > 0.3) PAD.aimA = Math.atan2(PAD.ry, PAD.rx);
  if (v && PAD.aimA != null && (Math.hypot(PAD.rx, PAD.ry) > 0.3 || mouse.sx === undefined)) {
    i.aimX = v.x + Math.cos(PAD.aimA) * 420;
    i.aimY = v.y + Math.sin(PAD.aimA) * 420;
  }
}
/* ---------- menus with the controller ---------- */
function padFocusables() {
  const ovs = $$('.overlay:not([hidden])').filter(
    o => o.offsetParent !== null || getComputedStyle(o).position === 'fixed'
  );
  const root = ovs.length ? ovs.at(-1) : document.body;
  return [...root.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')].filter(el => {
    if (el.disabled) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
  });
}
function padMove(dx, dy) {
  const list = padFocusables();
  if (!list.length) return;
  const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) return padFocus(list.find(el => el.matches('.hg-go, #btnReady, .btn:not(.ghost)')) || list[0]);
  const a = cur.getBoundingClientRect(),
    ax = a.left + a.width / 2,
    ay = a.top + a.height / 2;
  let best = null,
    bestS = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect(),
      x = r.left + r.width / 2 - ax,
      y = r.top + r.height / 2 - ay;
    const along = x * dx + y * dy;
    if (along <= 4) continue;
    const across = Math.abs(x * dy - y * dx);
    const s = along + across * 2.2;
    if (s < bestS) {
      bestS = s;
      best = el;
    }
  }
  if (best) padFocus(best);
}
function padFocus(el) {
  $$('.gp-focus').forEach(x => x.classList.remove('gp-focus'));
  el.classList.add('gp-focus');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  sfx('ui');
}
function padBack() {
  // B: the same as Escape, or the screen's own back / done button
  const back = padFocusables().find(el =>
    /^(Done|Close|Back|Cancel|Got it|Main menu|Back to the menu)/i.test(el.textContent.trim())
  );
  if (back) back.click();
  else dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
}
/** Called every frame from the main loop. */
function gamepadTick(dt) {
  if (!readPad() || !PAD.on) return;
  const inBattle = B && !B.demo && (G.phase === 'battle' || G.phase === 'wait') && !arenaInputBlocked();
  if (padPressed(9)) dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
  if (inBattle) return;
  PAD.navT -= dt;
  const dx = (PAD.b[15] ? 1 : 0) - (PAD.b[14] ? 1 : 0) || (Math.abs(PAD.lx) > 0.5 ? Math.sign(PAD.lx) : 0),
    dy = (PAD.b[13] ? 1 : 0) - (PAD.b[12] ? 1 : 0) || (Math.abs(PAD.ly) > 0.5 ? Math.sign(PAD.ly) : 0);
  if ((dx || dy) && PAD.navT <= 0) {
    padMove(dx, dx ? 0 : dy);
    PAD.navT = PAD.navT < -0.05 ? 0.28 : 0.14; // first step waits a little longer, holding repeats
  } else if (!dx && !dy) PAD.navT = -0.1;
  if (padPressed(0)) {
    const el = document.activeElement;
    if (el && el !== document.body) el.click();
    else padMove(0, 1);
  }
  if (padPressed(1)) padBack();
}
addEventListener('gamepaddisconnected', () => {
  PAD.on = false;
  document.body.classList.remove('pad');
});
/* ---------- the controls screen ---------- */
let keyWait = null;
function openControls(back) {
  let ov = $('#ovKeys');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'ovKeys';
    document.body.appendChild(ov);
  }
  const rows = BINDABLE.map(
    ([code, name]) =>
      `<div class="kb-row"><span>${esc(name)}</span><button class="kb-key${keyWait === code ? ' wait' : ''}${KEYBIND[code] ? ' custom' : ''}" data-bind="${code}">${keyWait === code ? 'Press a key…' : esc(keyLabel(boundKey(code)))}</button></div>`
  ).join('');
  ov.innerHTML = `<div class="card kbcard"><h2>Controls</h2>
    <div class="kb-cols"><section><h3>Keyboard</h3><div class="kb-list">${rows}</div>
      <p class="small">Arrow keys always drive too. Mouse aims, left click fires, right click uses moving parts and gadgets. Keys 1–9 are for moving parts.</p>
      <button class="btn ghost sm" id="kbReset">Back to the default keys</button></section>
    <section><h3>Controller</h3><dl class="kb-pad">
      <dt>Left stick</dt><dd>Drive and steer</dd><dt>Right stick</dt><dd>Aim</dd><dt>RT</dt><dd>Fire</dd><dt>LT</dt><dd>Moving parts and gadgets</dd>
      <dt>A</dt><dd>Boost</dd><dt>B</dt><dd>Jump</dd><dt>X</dt><dd>Drop</dd><dt>Y</dt><dd>Gadget</dd><dt>LB / RB</dt><dd>Horn / blink</dd>
      <dt>D-pad up / down</dt><dd>Anchor / release</dd><dt>Menu</dt><dd>Pause</dd></dl>
      <p class="small">In menus the d-pad or left stick moves, A presses and B goes back. ${PAD.on ? 'A controller is connected.' : 'Plug in a controller and press any button.'}</p></section></div>
    <button class="btn" id="kbDone">Done</button></div>`;
  ov.hidden = false;
  swapIn(ov, 'entering');
  $$('#ovKeys [data-bind]').forEach(b =>
    b.addEventListener('click', () => {
      keyWait = b.dataset.bind;
      sfx('ui');
      openControls(back);
    })
  );
  $('#kbReset').onclick = () => {
    resetBinds();
    toast('Default keys are back', true);
    openControls(back);
  };
  $('#kbDone').onclick = () => {
    keyWait = null;
    ov.hidden = true;
    sfx('ui');
    if (back) back();
  };
}
addEventListener(
  'keydown',
  e => {
    if (!keyWait || !$('#ovKeys') || $('#ovKeys').hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const code = keyWait;
    keyWait = null;
    if (e.code !== 'Escape') {
      if (/^(Digit[1-9]|Numpad[1-9]|F11|KeyK|KeyT)$/.test(e.code))
        toast(`${keyLabel(e.code)} is already used by the game. Pick another key.`);
      else {
        setBind(code, e.code);
        sfx('place');
      }
    }
    openControls();
  },
  true
);

/* ---------- local duel: player 2 on the controller ---------- */
/** Player 2's input: everything from the controller, the right stick aims (or straight ahead). */
function readPad2(v) {
  const i = { th: 0, st: 0, sf: 0, boost: false, aimX: v.x + Math.sin(v.a) * 400, aimY: v.y - Math.cos(v.a) * 400, fire: false, rmb: false, drop: false, gr: 0, edges: new Set() };
  if (B.seq !== 'play') return i;
  padBattle(i, v);
  return i;
}
/** Starts a local duel: Blueprint Brawl, five rounds, player 2 on the controller with a ready-made car. */
function startLocalDuel(p2Type) {
  const keepR = G.rounds;
  G.teamSize = 1;
  G.rounds = 5;
  G.local2Starting = true;
  startMatch('solo', null, 'brawl');
  G.local2Starting = false;
  G.local2 = true;
  G.rounds = keepR;
  const t = BRAWL_TYPES.find(x => x.name === p2Type) || pick(BRAWL_TYPES);
  Object.assign(G.bot, { name: 'Player 2', style: t.style, say: ['Controller connected. Mercy disconnected.'] });
  G.oppName = 'Player 2';
  G.botDesign = brawlDesign(t, 2);
  G.brawlBotReady = true;
  if (!PAD.on) toast('Player 2: press any button on the controller.', true);
}
