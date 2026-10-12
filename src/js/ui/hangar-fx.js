// The living hangar: welding sparks and dust over your car on its turntable, a live scoreboard of the bot fight
// behind the menu, and an LED ticker with what the casters say. Runs only while the main menu is on screen.
const HFX = { parts: [], weld: 2, dust: 0, live: 0, cv: null };
const hangarOn = () => {
  const m = $('#ovMenu');
  return m && !m.hidden && m.querySelector('.hangar:not(.resume)');
};
const calmMotion = () =>
  document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
/** One frame of the hangar effects. */
function hangarFxTick(dt) {
  if (!hangarOn()) return;
  document.body.classList.toggle('perf-ui', !!SETTINGS.perf);
  hangarLive(dt);
  const cv = $('#hgFx');
  if (!cv || calmMotion()) return;
  const r = cv.getBoundingClientRect(),
    dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * dpr)) {
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
  }
  const c = cv.getContext('2d'),
    W = cv.width / dpr,
    H = cv.height / dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  // a welding burst somewhere on the car every few seconds
  HFX.weld -= dt;
  if (HFX.weld <= 0) {
    HFX.weld = rnd(1.4, 3.6);
    const a = Math.random() * Math.PI * 2,
      d = rnd(0.12, 0.3) * W,
      x = W / 2 + Math.cos(a) * d,
      y = H / 2 + Math.sin(a) * d;
    HFX.flash = { x, y, t: 0.25 };
    for (let i = 0; i < 26; i++) {
      const s = rnd(80, 260),
        b = rnd(-Math.PI, 0.2);
      HFX.parts.push({ x, y, vx: Math.cos(b) * s, vy: Math.sin(b) * s, t: rnd(0.4, 0.9), k: 'spark' });
    }
  }
  // drifting dust in the work light
  HFX.dust -= dt;
  if (HFX.dust <= 0) {
    HFX.dust = 0.18;
    HFX.parts.push({ x: rnd(0.15, 0.85) * W, y: H * 0.95, vx: rnd(-6, 6), vy: rnd(-22, -10), t: rnd(4, 7), k: 'dust' });
  }
  if (HFX.flash) {
    const f = HFX.flash,
      g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 60);
    g.addColorStop(0, `rgba(190,240,255,${f.t * 3})`);
    g.addColorStop(1, 'rgba(190,240,255,0)');
    c.fillStyle = g;
    c.fillRect(f.x - 60, f.y - 60, 120, 120);
    f.t -= dt;
    if (f.t <= 0) HFX.flash = null;
  }
  c.globalCompositeOperation = 'lighter';
  for (const p of HFX.parts) {
    p.t -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.k === 'spark') {
      p.vy += 520 * dt;
      c.strokeStyle = `rgba(255,${180 + Math.random() * 60},90,${Math.min(1, p.t * 2)})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
      c.stroke();
    } else {
      c.fillStyle = `rgba(255,220,160,${Math.min(0.35, p.t * 0.08)})`;
      c.fillRect(p.x, p.y, 2, 2);
    }
  }
  c.globalCompositeOperation = 'source-over';
  HFX.parts = HFX.parts.filter(p => p.t > 0 && p.y < H + 20);
}
/** The live scoreboard of the bot fight behind the menu. */
function hangarLive(dt) {
  HFX.live -= dt;
  if (HFX.live > 0) return;
  HFX.live = 0.25;
  const el = $('#hgLive');
  if (!el) return;
  if (!B || !B.demo || B.cars.length < 2) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const [a, b] = B.cars,
    hp = v => (v.dead ? 0 : clamp(integrity(v), 0, 1)),
    side = (v, right) =>
      `<div class="lv-car${right ? ' r' : ''}${v.dead ? ' out' : ''}" style="--pc:${v.paint}"><b>${esc(v.name)}</b><span class="lv-bar"><i style="width:${Math.round(hp(v) * 100)}%"></i></span></div>`;
  const t = B.seq === 'play' ? `${Math.max(0, Math.ceil(B.t))}s` : B.seq === 'count' ? 'Get ready' : 'Over';
  el.innerHTML = `<span class="lv-tag"><i></i>Live from the pit</span>${side(a)}<em class="lv-t">${t}</em>${side(b, true)}`;
}
/** Pushes a line into the hangar's LED ticker. */
function hangarTicker(text) {
  const el = $('#hgTick');
  if (!el) return;
  el.innerHTML = `<span>${esc(text)}</span>`; // one line at a time, sliding in like a stadium board
}
