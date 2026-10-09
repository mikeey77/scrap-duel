'use strict';
/** The OS "reduce motion" preference, read once and kept up to date (matchMedia per frame is slow). */
const REDUCED = (() => {
  const st = { on: false };
  try {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    st.on = mq.matches;
    mq.addEventListener && mq.addEventListener('change', e => (st.on = e.matches));
  } catch (e) {}
  return st;
})();
// Shared helpers: DOM shortcuts, math, grid keys, weighted random.
const $ = s => document.querySelector(s),
  $$ = s => [...document.querySelectorAll(s)];
// Performance mode renders the arena at 1x: big savings on high-density (4K/retina) screens.
const dprOf = () => {
  let perf = false;
  try {
    perf = !!SETTINGS.perf; // SETTINGS is declared further down; during start-up it is not ready yet
  } catch (e) {}
  return perf ? 1 : Math.min(2, window.devicePixelRatio || 1);
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v),
  rnd = (a, b) => a + Math.random() * (b - a),
  pick = a => a[Math.floor(Math.random() * a.length)];
const wrap = a => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const fmt = t => {
  t = Math.max(0, Math.ceil(t));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};
const key = (x, y) => x + ',' + y,
  unkey = k => k.split(',').map(Number);
const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ],
  FX = [0, 1, 0, -1],
  FY = [-1, 0, 1, 0];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function wpick(list, wf) {
  let t = 0;
  const w = list.map(x => {
    const v = Math.max(0, wf(x));
    t += v;
    return v;
  });
  if (t <= 0) return pick(list);
  let r = Math.random() * t;
  for (let i = 0; i < list.length; i++) {
    r -= w[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
