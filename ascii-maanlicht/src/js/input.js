// ---------- input: two keyboard layouts + up to four gamepads ----------
const keys = new Set();
const pressed = new Set(); // edge-triggered this frame
addEventListener('keydown', e => {
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const KB = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], attack: ['Space', 'KeyF'], spell: ['KeyQ', 'KeyG'], interact: ['KeyE'], potion: ['KeyH', 'KeyR'], inv: ['KeyI', 'Tab'], sprint: ['ShiftLeft'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], attack: ['Numpad1', 'Period', 'Enter'], spell: ['Numpad2', 'Comma'], interact: ['Numpad3', 'Slash'], potion: ['Numpad4', 'Semicolon'], inv: ['NumpadAdd', 'KeyP'], sprint: ['ShiftRight', 'Numpad0'] }
];
const any = arr => arr.some(k => keys.has(k));
const anyP = arr => arr.some(k => pressed.has(k));

function keyboardInput(n) {
  const m = KB[n];
  return {
    kind: 'kb' + n,
    label: n === 0 ? 'WASD' : 'Pijltjes',
    state() {
      return {
        mx: (any(m.right) ? 1 : 0) - (any(m.left) ? 1 : 0),
        my: (any(m.up) ? 1 : 0) - (any(m.down) ? 1 : 0),
        attack: any(m.attack), spell: anyP(m.spell), interact: anyP(m.interact), potion: anyP(m.potion), inv: anyP(m.inv), sprint: any(m.sprint),
        navX: (anyP(m.right) ? 1 : 0) - (anyP(m.left) ? 1 : 0), navY: (anyP(m.down) ? 1 : 0) - (anyP(m.up) ? 1 : 0), ok: anyP(m.attack), drop: anyP(m.interact)
      };
    }
  };
}
const padPrev = {};
function gamepadInput(index) {
  const edge = (pad, b) => {
    const k = index + ':' + b, now = !!(pad.buttons[b] && pad.buttons[b].pressed);
    const was = padPrev[k];
    padPrev[k] = now;
    return now && !was;
  };
  let navHeld = 0;
  return {
    kind: 'pad' + index,
    label: 'Controller ' + (index + 1),
    state() {
      const pad = (navigator.getGamepads ? navigator.getGamepads() : [])[index];
      if (!pad) return { mx: 0, my: 0 };
      const ax = Math.abs(pad.axes[0]) > 0.18 ? pad.axes[0] : 0, ay = Math.abs(pad.axes[1]) > 0.18 ? pad.axes[1] : 0;
      const dx = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0), dy = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
      let navX = 0, navY = 0;
      const sx = ax || dx, sy = ay || dy;
      if (Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5) {
        if (navHeld <= 0) { navX = Math.abs(sx) > 0.5 ? Math.sign(sx) : 0; navY = Math.abs(sy) > 0.5 ? Math.sign(sy) : 0; navHeld = 0.22; }
      } else navHeld = 0;
      navHeld -= 1 / 60;
      return {
        mx: ax + dx, my: -(ay + dy),
        attack: !!pad.buttons[0]?.pressed, spell: edge(pad, 2), interact: edge(pad, 1), potion: edge(pad, 4), inv: edge(pad, 3), sprint: !!(pad.buttons[5]?.pressed || pad.buttons[7]?.value > 0.5),
        navX, navY, ok: edge(pad, 0) , drop: edge(pad, 1), start: edge(pad, 9)
      };
    }
  };
}
function pollJoin() {
  // a gamepad pressing Start (or A on the title screen) joins as a new player
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (!pad) continue;
    if (G.players.some(p => p.input.kind === 'pad' + i)) continue;
    const k = 'join' + i, now = !!(pad.buttons[9]?.pressed || (!Game.started && pad.buttons[0]?.pressed));
    if (now && !padPrev[k]) {
      padPrev[k] = now;
      return gamepadInput(i);
    }
    padPrev[k] = now;
  }
  return null;
}
function endInputFrame() {
  pressed.clear();
}
