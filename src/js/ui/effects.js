/* Holo lightning: a brief electric crackle along a random edge of a panel. */
function zap(el, opt = {}) {
  if (!el || SETTINGS.motion === false || !el.getBoundingClientRect) return;
  try {
    if (REDUCED.on) return;
  } catch (e) {}
  const r = el.getBoundingClientRect();
  if (r.width < 40 || r.height < 30) return;
  let layer = $('#zapLayer');
  if (!layer) {
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.id = 'zapLayer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  const side = opt.side ?? Math.floor(Math.random() * 4),
    horiz = side % 2 === 0;
  const len = horiz ? r.width : r.height,
    segLen = Math.min(len * 0.95, len * (0.35 + Math.random() * 0.45));
  const start = Math.random() * (len - segLen),
    steps = Math.max(6, Math.round(segLen / 14));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (segLen * i) / steps,
      j = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 9;
    pts.push(
      horiz ? [r.left + t, (side === 0 ? r.top : r.bottom) + j] : [(side === 1 ? r.right : r.left) + j, r.top + t]
    );
  }
  const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'zap');
  g.innerHTML = `<path d="${d}" class="zg"/><path d="${d}" class="zc"/>`;
  layer.appendChild(g);
  setTimeout(() => g.remove(), 520);
  if (opt.sound) sfx('zap');
}

/* ---------- a livelier interface ---------- */
// Screens get an `entering` class for a moment when they open, so the CSS can animate them in
// (only on open: re-rendering an open screen does not replay it).
if (typeof MutationObserver !== 'undefined') {
  const enter = new MutationObserver(ms => {
    for (const m of ms) {
      const el = m.target;
      if (el.hidden || !el.classList.contains('overlay')) continue;
      el.classList.add('entering');
      clearTimeout(el._enterT);
      el._enterT = setTimeout(() => el.classList.remove('entering'), 450);
    }
  });
  document
    .querySelectorAll('.overlay')
    .forEach(o => enter.observe(o, { attributes: true, attributeFilter: ['hidden'] }));
  // coins, bolts and levels pop when their number changes
  const BUMP = ['#tCoins', '.wb-bolts b', '.hg-lvl', '.hq .lv'],
    seen = new Map();
  let queued = false;
  const check = () => {
    queued = false;
    for (const sel of BUMP) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const v = el.textContent;
      if (seen.has(sel) && seen.get(sel) !== v && el.offsetParent) {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
      seen.set(sel, v);
    }
  };
  new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(check);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
