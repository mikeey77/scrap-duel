// Action groups: any weapon or moving part can be put on key 1–9 in the garage (Keys tool).
// Group 0 means "default": weapons fire with left click/Space and moving parts follow right click.
// Logic modules (js/game/logic.js) can switch groups on as well, as if the key were held.

/** Parts that can be bound to a key: weapons (incl. fire-button gadgets) and moving parts. */
const groupable = m => !!m && !!(m.joint || m.wpn || (typeof PLAN_FIRE !== 'undefined' && PLAN_FIRE.includes(m.id)));
/** Is group g (1–9) active for this car: held key or a logic signal. */
const groupOn = (v, g) => !!((v.groups | 0 | (v.logicGroups | 0)) & (1 << g));
/** Moving part: its group if it has one, otherwise right click. */
function actionHeld(v, J) {
  return J.g ? groupOn(v, J.g) : !!v.rmb;
}
/** Weapon: its group if it has one, otherwise the normal fire button. */
function partFiring(v, I, fireAll) {
  return I.g ? groupOn(v, I.g) : fireAll;
}
/** Bitmask of number keys 1–9 held right now. */
function heldGroups() {
  let m = 0;
  for (let g = 1; g <= 9; g++) if (keys.has('Digit' + g) || keys.has('Numpad' + g)) m |= 1 << g;
  return m;
}
/** HUD hint lines: "1 Hinge ×2" for every group used on this car. */
function groupHints(v) {
  const by = {};
  for (const I of v.insts) if (I.alive && I.g) (by[I.g] = by[I.g] || []).push(I.m.name);
  return Object.entries(by).map(([g, names]) => {
    const c = {};
    for (const n of names) c[n] = (c[n] || 0) + 1;
    return [
      g,
      Object.entries(c)
        .map(([n, k]) => n + (k > 1 ? ' ×' + k : ''))
        .join(', ')
    ];
  });
}
/** Garage: small amber key badges on bound parts. */
function drawGroupBadges(c) {
  const all = [...G.base.values(), ...G.top.values()].filter(e => e.g);
  if (!all.length) return;
  c.save();
  c.font = `700 ${Math.max(9, cell * 0.32)}px "Chakra Petch", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const e of all) {
    const x = cpx(e.x) + cell * 0.18,
      y = cpy(e.y) + cell * 0.18,
      r = cell * 0.17;
    c.fillStyle = '#ffb423';
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.fillStyle = '#0a1020';
    c.fillText(String(e.g), x, y + 1);
  }
  c.restore();
}
