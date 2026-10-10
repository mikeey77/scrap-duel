// Action keys: only parts that need activating (hinges, rotators, rams) can go on a key 1–9 (Keys tool).
// Without a key they follow right click. Weapons always fire with left click/Space.

/** Parts that can be bound to a key: the moving parts. */
const groupable = m => !!m && !!m.joint;
/** Is key g (1–9) held for this car. */
const groupOn = (v, g) => !!((v.groups | 0) & (1 << g));
/** Moving part: its group if it has one, otherwise right click. */
function actionHeld(v, J) {
  return J.g ? groupOn(v, J.g) : !!v.rmb;
}
/** Weapons always use the fire button (old car codes may still carry a key on a weapon; it is ignored). */
function partFiring(v, I, fireAll) {
  return fireAll;
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
