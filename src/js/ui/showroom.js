// The showroom: your car on a lit turntable. It turns slowly (drag to turn it yourself), three
// backdrops, the numbers on a plate underneath, and a photo button that saves a PNG.

const SHOW = { open: false, raf: 0, a: 0, spin: true, drag: null, bg: 'studio', img: null, motes: [], last: 0 };
const SHOW_BG = {
  studio: { name: 'Studio', top: '#1a2236', bot: '#05070d', floor: '#141a28', light: '255,236,200' },
  garage: { name: 'Garage', top: '#2b2620', bot: '#0d0b09', floor: '#2a2621', light: '255,214,150' },
  neon: { name: 'Neon', top: '#1b0f2e', bot: '#040309', floor: '#130c22', light: '120,220,255' }
};

function openShowroom(design, label) {
  design = design || { base: G.base, top: G.top };
  let ov = $('#ovShow');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'ovShow';
    ov.className = 'overlay';
    document.body.appendChild(ov);
  }
  const S = showStats(design),
    stat = k => S[k] || '';
  ov.innerHTML = `<canvas id="showCv" aria-label="Your car on a turntable. Drag to turn it."></canvas>
    <div class="show-plate"><span class="label">Showroom</span><h2>${esc(label || `${G.name}'s car`)}</h2>
      <div class="show-stats">${[
        ['Structure', stat('hp')],
        ['Top speed', stat('speed')],
        ['Turning', stat('turn')],
        ['Firepower', stat('dps')]
      ]
        .filter(([, v]) => v)
        .map(([k, v]) => `<span><em>${k}</em><b>${esc(v)}</b></span>`)
        .join('')}</div></div>
    <div class="show-bar">
      <div class="seg" id="showBg">${Object.entries(SHOW_BG)
        .map(([k, b]) => `<button data-bg="${k}" aria-pressed="${k === SHOW.bg}">${b.name}</button>`)
        .join('')}</div>
      <button class="btn ghost" id="showSpin">${SHOW.spin ? 'Stop turning' : 'Turn'}</button>
      <button class="btn" id="showPhoto">Save photo</button>
      <button class="btn ghost" id="showClose">Close</button>
    </div>`;
  ov.hidden = false;
  SHOW.open = true;
  SHOW.img = new Image();
  SHOW.img.src = designURL(design, 900, G.paint, G.style && G.style.livery);
  SHOW.motes = Array.from({ length: 70 }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random(),
    s: Math.random() * 7
  }));
  const cv = $('#showCv');
  cv.onpointerdown = e => {
    SHOW.drag = { x: e.clientX, a: SHOW.a };
    cv.setPointerCapture(e.pointerId);
  };
  cv.onpointermove = e => {
    if (SHOW.drag) SHOW.a = SHOW.drag.a + (e.clientX - SHOW.drag.x) * 0.01;
  };
  cv.onpointerup = () => (SHOW.drag = null);
  $$('#showBg [data-bg]').forEach(b =>
    b.addEventListener('click', () => {
      SHOW.bg = b.dataset.bg;
      $$('#showBg [data-bg]').forEach(x => x.setAttribute('aria-pressed', x === b));
      sfx('ui');
    })
  );
  $('#showSpin').onclick = () => {
    SHOW.spin = !SHOW.spin;
    $('#showSpin').textContent = SHOW.spin ? 'Stop turning' : 'Turn';
  };
  $('#showPhoto').onclick = showPhoto;
  $('#showClose').onclick = closeShowroom;
  sfx('reveal');
  SHOW.last = performance.now();
  cancelAnimationFrame(SHOW.raf);
  SHOW.raf = requestAnimationFrame(showFrame);
}
/** The numbers for the design on the turntable (not whatever the builder panel last showed). */
function showStats(design) {
  const sb = G.base,
    st = G.top;
  try {
    if (design.base instanceof Map) ((G.base = design.base), (G.top = design.top || new Map()));
    const items = designItems(),
      C = calc(items),
      aura = auraOf(items.map(i => i.m.id));
    let hp = 0,
      dps = 0;
    for (const it of items) ((hp += it.m.hp), (dps += dpsOf(it.m.id, aura)));
    return {
      hp: Math.round(hp) + ' HP',
      speed: Math.round(C.top * 0.4) + ' km/h',
      turn: Math.round(C.turnR * 57.3) + '°/s',
      dps: Math.round(dps) + ' dps'
    };
  } catch (e) {
    return {};
  } finally {
    G.base = sb;
    G.top = st;
  }
}
function closeShowroom() {
  SHOW.open = false;
  cancelAnimationFrame(SHOW.raf);
  const ov = $('#ovShow');
  if (ov) ov.hidden = true;
  sfx('ui');
}
function showFrame(now) {
  if (!SHOW.open) return;
  const dt = Math.min(0.05, (now - SHOW.last) / 1000);
  SHOW.last = now;
  if (SHOW.spin && !SHOW.drag && !REDUCED.on) SHOW.a += dt * 0.35;
  drawShowroom($('#showCv'), now / 1000);
  SHOW.raf = requestAnimationFrame(showFrame);
}
function drawShowroom(cv, t) {
  if (!cv) return;
  const d = Math.min(2, window.devicePixelRatio || 1),
    W = cv.clientWidth,
    H = cv.clientHeight;
  if (cv.width !== Math.round(W * d)) ((cv.width = Math.round(W * d)), (cv.height = Math.round(H * d)));
  const c = cv.getContext('2d'),
    bg = SHOW_BG[SHOW.bg];
  c.setTransform(d, 0, 0, d, 0, 0);
  // backdrop: a soft gradient and a floor with perspective lines
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg.top);
  g.addColorStop(1, bg.bot);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const cx = W / 2,
    cy = H * 0.47,
    R = Math.min(W, H) * 0.36;
  c.strokeStyle = 'rgba(255,255,255,.05)';
  c.lineWidth = 1;
  for (let i = -12; i <= 12; i++) {
    c.beginPath();
    c.moveTo(cx + i * 30, cy);
    c.lineTo(cx + i * 160, H);
    c.stroke();
  }
  for (let k = 1; k < 8; k++) {
    const y = cy + (H - cy) * (k / 8) ** 1.6;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  if (SHOW.bg === 'garage') {
    // a hazard stripe along the back wall
    c.save();
    c.beginPath();
    c.rect(0, H * 0.16, W, 18);
    c.clip();
    for (let x = -40; x < W + 40; x += 36) {
      c.fillStyle = '#f2b705';
      c.beginPath();
      c.moveTo(x, H * 0.16);
      c.lineTo(x + 18, H * 0.16);
      c.lineTo(x + 36, H * 0.16 + 18);
      c.lineTo(x + 18, H * 0.16 + 18);
      c.fill();
    }
    c.restore();
  } else if (SHOW.bg === 'neon') {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const [x, col] of [
      [0.12, '255,77,209'],
      [0.88, '90,209,255']
    ]) {
      const ng = c.createLinearGradient(W * x - 6, 0, W * x + 6, 0);
      ng.addColorStop(0, `rgba(${col},0)`);
      ng.addColorStop(0.5, `rgba(${col},.9)`);
      ng.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = ng;
      c.fillRect(W * x - 6, 0, 12, H * 0.8);
    }
    c.restore();
  }
  // two spotlights from the ceiling
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const sx of [0.22, 0.78]) {
    const lg = c.createLinearGradient(W * sx, 0, cx, cy);
    lg.addColorStop(0, `rgba(${bg.light},.22)`);
    lg.addColorStop(1, `rgba(${bg.light},0)`);
    c.fillStyle = lg;
    c.beginPath();
    c.moveTo(W * sx - 20, 0);
    c.lineTo(W * sx + 20, 0);
    c.lineTo(cx + R * (sx < 0.5 ? 0.6 : 1.1), cy + R * 0.4);
    c.lineTo(cx - R * (sx < 0.5 ? 1.1 : 0.6), cy + R * 0.4);
    c.closePath();
    c.fill();
  }
  // dust in the light
  for (const m of SHOW.motes) {
    const x = (m.x + Math.sin(t * 0.2 + m.s) * 0.02) * W,
      y = ((m.y + t * 0.01 * (0.5 + m.z)) % 1) * H * 0.75;
    c.fillStyle = `rgba(${bg.light},${0.15 + 0.25 * m.z})`;
    c.fillRect(x, y, 1.5, 1.5);
  }
  c.restore();
  // the turntable
  c.save();
  c.translate(cx, cy);
  c.scale(1, 0.92);
  c.fillStyle = 'rgba(0,0,0,.5)';
  c.beginPath();
  c.ellipse(0, R * 0.12, R * 1.08, R * 1.02, 0, 0, 7);
  c.fill();
  const tg = c.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
  tg.addColorStop(0, '#4a525c');
  tg.addColorStop(0.8, '#262b31');
  tg.addColorStop(1, '#14171b');
  c.fillStyle = tg;
  c.beginPath();
  c.arc(0, 0, R, 0, 7);
  c.fill();
  c.rotate(SHOW.a);
  c.strokeStyle = 'rgba(255,255,255,.06)';
  for (let k = 1; k < 6; k++) {
    c.beginPath();
    c.arc(0, 0, (R * k) / 6, 0, 7);
    c.stroke();
  }
  // chasing lights around the rim
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2,
      on = (Math.floor(t * 8) + i) % 4 === 0;
    c.fillStyle = on ? '#ffd257' : 'rgba(255,210,87,.25)';
    c.beginPath();
    c.arc(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94, on ? 4 : 3, 0, 7);
    c.fill();
  }
  // the car
  const im = SHOW.img;
  if (im && im.complete) {
    const sz = R * 1.5;
    c.shadowColor = 'rgba(0,0,0,.7)';
    c.shadowBlur = 30;
    c.shadowOffsetY = 14;
    c.drawImage(im, -sz / 2, -sz / 2, sz, sz);
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
  }
  c.restore();
  // a gloss sweep over the whole scene
  const sw = ((t * 0.15) % 1.6) - 0.3;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const gl = c.createLinearGradient(W * sw - 120, 0, W * sw + 120, H);
  gl.addColorStop(0, 'rgba(255,255,255,0)');
  gl.addColorStop(0.5, 'rgba(255,255,255,.04)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl;
  c.fillRect(0, 0, W, H);
  c.restore();
}
/** Save what the showroom shows (with the name plate drawn in) as a PNG. */
function showPhoto() {
  const cv = $('#showCv');
  if (!cv) return;
  const out = document.createElement('canvas');
  out.width = cv.width;
  out.height = cv.height;
  const c = out.getContext('2d'),
    d = cv.width / cv.clientWidth;
  c.drawImage(cv, 0, 0);
  c.scale(d, d);
  c.fillStyle = '#f2b705';
  c.font = '700 34px "Chakra Petch", sans-serif';
  c.textAlign = 'center';
  c.fillText(`${G.name}'s car`.toUpperCase(), cv.clientWidth / 2, cv.clientHeight * 0.9);
  c.font = '600 16px "Barlow Semi Condensed", sans-serif';
  c.fillStyle = '#cfe0f5';
  c.fillText('SCRAP DUEL', cv.clientWidth / 2, cv.clientHeight * 0.9 + 26);
  const a = document.createElement('a');
  a.href = out.toDataURL('image/png');
  a.download = `scrap-duel-${(G.name || 'car').replace(/\W+/g, '-').toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  sfx('reveal');
  toast('Photo saved', true);
}
