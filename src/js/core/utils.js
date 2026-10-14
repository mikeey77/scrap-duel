'use strict';
/* ---------- the save file (desktop app) ----------
   Everything the game remembers lives in localStorage keys starting with "sd.". In the desktop app those keys are
   mirrored to save.json in the user's profile folder (with rotating back-ups), so clearing browser data or a
   reinstall never loses progress. At start-up the newer of the two copies wins. */
const SAVE = {
  dirty: false,
  t: 0,
  collect() {
    const o = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sd.')) o[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return o;
  },
  restore() {
    try {
      const d = window.desktop && window.desktop.readSave && window.desktop.readSave();
      if (!d || typeof d !== 'object' || !d.keys) return;
      const localAt = +(localStorage.getItem('sd._savedAt') || 0);
      if ((d.savedAt || 0) <= localAt) return;
      for (const [k, v] of Object.entries(d.keys))
        if (k.startsWith('sd.') && typeof v === 'string') localStorage.setItem(k, v);
    } catch (e) {}
  },
  mark() {
    if (!window.desktop || !window.desktop.writeSave) return;
    this.dirty = true;
    clearTimeout(this.t);
    this.t = setTimeout(() => this.flush(), 800);
  },
  flush(sync) {
    if (!this.dirty || !window.desktop || !window.desktop.writeSave) return;
    this.dirty = false;
    const now = Date.now();
    try {
      localStorage.setItem('sd._savedAt', String(now));
    } catch (e) {}
    window.desktop.writeSave(
      { savedAt: now, version: typeof GAME_VERSION === 'string' ? GAME_VERSION : '', keys: this.collect() },
      !!sync
    );
  }
};
SAVE.restore();
/** Errors go to errors.log in the desktop app (each distinct message once per session). */
const reportError = (() => {
  const seen = new Set();
  return (msg, stack) => {
    const key = String(msg).slice(0, 200);
    if (seen.has(key) || seen.size > 50) return;
    seen.add(key);
    try {
      if (window.desktop && window.desktop.logError) window.desktop.logError(`${msg}\n${stack || ''}`);
    } catch (e) {}
  };
})();
try {
  addEventListener('error', e => reportError(e.message, e.error && e.error.stack));
  addEventListener('unhandledrejection', e =>
    reportError('promise: ' + (e.reason && e.reason.message), e.reason && e.reason.stack)
  );
} catch (e) {}
try {
  addEventListener('beforeunload', () => SAVE.flush(true));
} catch (e) {}
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
