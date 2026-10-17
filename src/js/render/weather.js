// Weather and light per arena (and per biome in the open world): rain with puddles that reflect,
// storms with lightning, snow, desert dust, volcanic ash and haunted fog. Wet and snowy floors
// give less grip; everything is drawn over the world in screen space, puddles on the ground.

const WEATHER = {
  rain: { name: 'Rain', icon: '🌧', grip: 0.88, note: 'Wet floor: 12% less grip. Puddles are slippery.' },
  storm: { name: 'Thunderstorm', icon: '⛈', grip: 0.85, note: 'Heavy rain, lightning: 15% less grip.' },
  snow: { name: 'Snowfall', icon: '🌨', grip: 0.9, note: 'Fresh snow: 10% less grip, tracks stay.' },
  dust: { name: 'Dust wind', icon: '🌪', grip: 0.95, note: 'Sand in the air and on the floor: 5% less grip.' },
  ash: { name: 'Ash fall', icon: '🌋', grip: 1, note: 'Embers and ash drift down.' },
  fog: { name: 'Fog', icon: '🌫', grip: 1, note: 'Thick fog rolls through.' }
};
const THEME_WEATHER = {
  market: 'rain',
  neonstrip: 'rain',
  swamp: 'rain',
  carpark: 'rain',
  carwash: 'rain',
  stormroof: 'storm',
  crusheryard: 'storm',
  ice: 'snow',
  frozenlot: 'snow',
  glacier: 'snow',
  desert: 'dust',
  construction: 'dust',
  volcano: 'ash',
  haunted: 'fog'
};
const weatherOf = th => (th && THEME_WEATHER[th.id]) || null;

/** At the start of a battle: puddles on the floor and the grip change. */
function setupWeather() {
  const w = weatherOf(B.theme);
  B.weather = w;
  B.puddles = [];
  B.wx = null;
  if (!w || B.kind === 'wait') return;
  B.grip *= WEATHER[w].grip;
  if (w === 'rain' || w === 'storm') {
    const r = owRng(owHash(B.theme.id.length * 31, Math.round(AW), 7));
    for (let i = 0; i < 12 && B.puddles.length < 9; i++) {
      const x = 200 + r() * (AW - 400),
        y = 150 + r() * (AH - 300);
      if (B.st.some(s => circRectDist(x, y, s) < 90)) continue;
      B.puddles.push({ x, y, rx: 60 + r() * 70, ry: 35 + r() * 40, a: r() * Math.PI, p: r() * 10 });
    }
  }
  B.nextBolt = (B.time || 0) + 5 + Math.random() * 5;
}
/** Puddles on the ground (world space): dark water, a sky sheen, raindrop rings. */
function drawPuddles(c) {
  if (!B.puddles || !B.puddles.length) return;
  for (const p of B.puddles) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.a);
    c.beginPath();
    c.ellipse(0, 0, p.rx, p.ry, 0, 0, 7);
    const g = c.createLinearGradient(-p.rx, -p.ry, p.rx, p.ry);
    g.addColorStop(0, 'rgba(120,150,190,.42)');
    g.addColorStop(0.5, 'rgba(30,45,70,.5)');
    g.addColorStop(1, 'rgba(160,190,230,.35)');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = 'rgba(200,220,255,.18)';
    c.lineWidth = 2;
    c.stroke();
    c.clip();
    // rings from raindrops
    c.strokeStyle = 'rgba(220,235,255,.35)';
    c.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      const t = (ANIM * 0.9 + p.p + k * 0.37) % 1,
        x = Math.sin(p.p * 3 + k * 2.1) * p.rx * 0.6,
        y = Math.cos(p.p * 5 + k * 1.3) * p.ry * 0.6;
      c.globalAlpha = 1 - t;
      c.beginPath();
      c.ellipse(x, y, 4 + t * 22, 2 + t * 11, 0, 0, 7);
      c.stroke();
    }
    c.restore();
  }
}
/** Is a point in a puddle (for grip)? */
function inPuddle(x, y) {
  if (!B.puddles) return false;
  for (const p of B.puddles) {
    const ca = Math.cos(-p.a),
      sa = Math.sin(-p.a),
      dx = x - p.x,
      dy = y - p.y,
      lx = dx * ca - dy * sa,
      ly = dx * sa + dy * ca;
    if ((lx * lx) / (p.rx * p.rx) + (ly * ly) / (p.ry * p.ry) < 1) return true;
  }
  return false;
}

/** The weather over everything, in screen space. Called with the identity transform. */
function drawWeather(c, dt) {
  const w = B.ow ? weatherOf(B.theme) : B.weather;
  if (!w || B.demo) return;
  const W = view.w,
    H = view.h,
    calm = REDUCED.on || SETTINGS.perf;
  if (!B.wx || B.wx.kind !== w || B.wx.w !== W) {
    const n = Math.round(((W * H) / 9000) * (calm ? 0.35 : 1) * (w === 'fog' ? 0.04 : w === 'dust' ? 0.6 : 1));
    B.wx = { kind: w, w: W, p: [] };
    for (let i = 0; i < n; i++)
      B.wx.p.push({ x: Math.random() * W, y: Math.random() * H, z: 0.4 + Math.random() * 0.8, s: Math.random() * 10 });
  }
  const P = B.wx.p,
    // the world scrolls under the weather a little, so it feels attached to the ground
    cx = cam.x,
    cy = cam.y,
    mx = B.wx.cx === undefined ? 0 : (cx - B.wx.cx) * view.sc * cam.z,
    my = B.wx.cy === undefined ? 0 : (cy - B.wx.cy) * view.sc * cam.z;
  B.wx.cx = cx;
  B.wx.cy = cy;
  c.save();
  if (w === 'rain' || w === 'storm') {
    c.fillStyle = w === 'storm' ? 'rgba(14,22,40,.22)' : 'rgba(18,30,55,.13)';
    c.fillRect(0, 0, W, H);
    const vx = w === 'storm' ? -260 : -120,
      vy = 1100;
    c.strokeStyle = w === 'storm' ? 'rgba(200,220,250,.6)' : 'rgba(195,215,245,.52)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (const p of P) {
      p.x += vx * dt * p.z - mx;
      p.y += vy * dt * p.z - my;
      if (p.y > H) ((p.y -= H + 30), (p.x = Math.random() * W));
      if (p.x < -20) p.x += W + 40;
      if (p.x > W + 20) p.x -= W + 40;
      c.moveTo(p.x, p.y);
      c.lineTo(p.x + vx * 0.018 * p.z, p.y + vy * 0.018 * p.z);
    }
    c.stroke();
    if (w === 'storm' && !calm) drawLightning(c, W, H);
  } else if (w === 'snow') {
    c.fillStyle = 'rgba(220,235,255,.06)';
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (const p of P) {
      p.x += (Math.sin(ANIM * 1.3 + p.s) * 25 - 20) * dt * p.z - mx;
      p.y += 70 * dt * p.z - my;
      if (p.y > H) ((p.y -= H + 10), (p.x = Math.random() * W));
      if (p.x < -10) p.x += W + 20;
      if (p.x > W + 10) p.x -= W + 20;
      c.globalAlpha = 0.5 + p.z * 0.4;
      c.beginPath();
      c.arc(p.x, p.y, 1 + p.z * 1.8, 0, 7);
      c.fill();
    }
  } else if (w === 'dust') {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(210,160,90,.16)');
    g.addColorStop(1, 'rgba(180,120,60,.08)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(235,200,140,.35)';
    c.lineWidth = 1.4;
    c.beginPath();
    for (const p of P) {
      p.x += 520 * dt * p.z - mx;
      p.y += Math.sin(ANIM * 2 + p.s) * 20 * dt - my;
      if (p.x > W + 30) ((p.x -= W + 60), (p.y = Math.random() * H));
      if (p.y < -10) p.y += H + 20;
      if (p.y > H + 10) p.y -= H + 20;
      c.moveTo(p.x, p.y);
      c.lineTo(p.x - 14 * p.z, p.y);
    }
    c.stroke();
  } else if (w === 'ash') {
    c.fillStyle = 'rgba(60,20,10,.1)';
    c.fillRect(0, 0, W, H);
    for (const p of P) {
      p.x += (Math.sin(ANIM + p.s) * 15 + 10) * dt * p.z - mx;
      p.y += 40 * dt * p.z - my;
      if (p.y > H) ((p.y -= H + 10), (p.x = Math.random() * W));
      if (p.x < -10) p.x += W + 20;
      if (p.x > W + 10) p.x -= W + 20;
      const ember = p.s < 2.5;
      c.globalAlpha = ember ? 0.6 + 0.4 * Math.sin(ANIM * 6 + p.s * 5) : 0.45;
      c.fillStyle = ember ? '#ff8a3a' : '#9a948e';
      c.fillRect(p.x, p.y, 1.5 + p.z * 1.5, 1.5 + p.z * 1.5);
    }
  } else if (w === 'fog') {
    for (const p of P) {
      p.x += 18 * dt * p.z - mx;
      p.y -= my;
      if (p.x > W + 300) p.x -= W + 600;
      if (p.y < -300) p.y += H + 600;
      if (p.y > H + 300) p.y -= H + 600;
      const R = 180 + p.z * 160,
        g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      g.addColorStop(0, 'rgba(200,215,225,.16)');
      g.addColorStop(1, 'rgba(200,215,225,0)');
      c.fillStyle = g;
      c.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    }
  }
  c.restore();
}
/** A bolt now and then: the screen flashes white, a jagged line, thunder a moment later. */
function drawLightning(c, W, H) {
  const t = B.time || 0;
  if (t >= B.nextBolt) {
    B.bolt = { t, x: W * (0.15 + Math.random() * 0.7), seed: Math.random() * 1000 };
    B.nextBolt = t + 6 + Math.random() * 8;
    setTimeout(() => B && !B.demo && sfx('bigboom'), 380);
  }
  const b = B.bolt;
  if (!b) return;
  const age = t - b.t;
  if (age > 0.6) return;
  const flick = age < 0.08 || (age > 0.14 && age < 0.2) ? 1 : 0.35;
  c.fillStyle = `rgba(230,240,255,${0.45 * (1 - age / 0.6) * flick})`;
  c.fillRect(0, 0, W, H);
  if (age < 0.25) {
    c.strokeStyle = `rgba(245,250,255,${0.9 * flick})`;
    c.lineWidth = 3;
    c.shadowColor = '#bcd6ff';
    c.shadowBlur = 18;
    c.beginPath();
    let x = b.x,
      y = 0;
    c.moveTo(x, y);
    let k = 0;
    while (y < H * 0.7) {
      y += 30 + hullHash(b.seed, k) * 40;
      x += (hullHash(k, b.seed) - 0.5) * 70;
      c.lineTo(x, y);
      k++;
    }
    c.stroke();
    c.shadowBlur = 0;
  }
}
