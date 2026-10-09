// Garage state (G), car stats, the blueprint bay editor, shop, inspector and HUD.
/* =================== STATE =================== */
const G = {
  phase: 'intro',
  mode: 'solo',
  round: 1,
  tool: 'place',
  sel: 'frame',
  rot: 0,
  binCat: 'all',
  catalogQ: '',
  catalogRarity: 'all',
  favoritesOnly: false,
  compatibleOnly: false,
  favorites: new Set(),
  layerView: 'both',
  showArcs: false,
  showLinks: false,
  leftTab: 'bin',
  base: new Map(),
  top: new Map(),
  inv: {},
  found: new Set(),
  tune: new Set(),
  aff: {},
  coins: 100,
  ws: new Set(),
  log: [],
  zoom: 1,
  rerolls: 0,
  freeRerolls: 0,
  mirror: false,
  hist: [],
  redo: [],
  paint: '#f2b705',
  name: 'Player',
  score: [0, 0],
  oppName: 'Rival',
  oppPaint: '#e2504a',
  diff: 1
};
const T = (id, tn) => (tn || G.tune).has(id);
function resetWs() {
  G.ws = new Set();
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) G.ws.add(key(x, y));
}
const moduleCells = m => m.shape || Array.from({ length: m.size || 1 }, (_, i) => [0, -i]);
const cellCount = m => moduleCells(m).length;
function shapeBounds(m) {
  const cs = moduleCells(m),
    xs = cs.map(c => c[0]),
    ys = cs.map(c => c[1]);
  return {
    w: Math.max(...xs) - Math.min(...xs) + 1,
    h: Math.max(...ys) - Math.min(...ys) + 1,
    cx: xs.reduce((a, b) => a + b, 0) / cs.length,
    cy: ys.reduce((a, b) => a + b, 0) / cs.length
  };
}
const shapeLabel = m =>
  `${m.shapeName || `${shapeBounds(m).w}×${shapeBounds(m).h}`} · ${cellCount(m)} cell${cellCount(m) > 1 ? 's' : ''}`;
const footprint = (id, rot, x, y) =>
  moduleCells(MOD[id])
    .map(
      ([a, b]) =>
        [
          [a, b],
          [-b, a],
          [-a, -b],
          [b, -a]
        ][rot]
    )
    .map(([a, b]) => [a + x, b + y]);
const topAt = (k, map = G.top) => {
  const anchor = occupancy(map).get(k);
  return anchor === undefined ? null : map.get(anchor);
};
function frontCells(e) {
  const cs = footprint(e.id, e.rot, e.x, e.y),
    set = new Set(cs.map(([x, y]) => key(x, y)));
  return cs.map(([x, y]) => [x + FX[e.rot], y + FY[e.rot]]).filter(([x, y]) => !set.has(key(x, y)));
}

function occupancy(d) {
  const o = new Map();
  for (const [k, e] of d) for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) o.set(key(x, y), k);
  return o;
}
function placedCount(id) {
  let n = 0;
  for (const e of G.base.values()) if (e.id === id) n++;
  for (const e of G.top.values()) if (e.id === id) n++;
  return n;
}
const left = id => (G.inv[id] || 0) - placedCount(id);
function designConnected(d) {
  const occ = occupancy(d),
    start = key(0, 0);
  if (!occ.has(start)) return false;
  const seen = new Set([start]),
    q = [start];
  while (q.length) {
    const [x, y] = unkey(q.pop());
    for (const [dx, dy] of DIRS) {
      const k = key(x + dx, y + dy);
      if (occ.has(k) && !seen.has(k)) {
        seen.add(k);
        q.push(k);
      }
    }
  }
  return seen.size === occ.size;
}
function instCenter(e) {
  const cs = footprint(e.id, e.rot, e.x, e.y);
  return [cs.reduce((n, c) => n + c[0], 0) / cs.length, cs.reduce((n, c) => n + c[1], 0) / cs.length];
}
function frontCell(e) {
  const cs = frontCells(e);
  return cs.reduce((a, b) => (b[0] * FX[e.rot] + b[1] * FY[e.rot] > a[0] * FX[e.rot] + a[1] * FY[e.rot] ? b : a));
}

function baseAt(k, occ) {
  occ = occ || occupancy(G.base);
  const a = occ.get(k);
  return a ? G.base.get(a) : null;
}
function blockedFor(base, top) {
  const occ = occupancy(base),
    tops = occupancy(top),
    out = [];
  for (const [k, e] of base) {
    if (!MOD[e.id].front) continue;
    const hit = frontCells(e)
      .map(([x, y]) => occ.get(key(x, y)))
      .find(a => a !== undefined && a !== k);
    if (hit !== undefined) out.push(['b', k, base.get(hit).id]);
  }
  for (const [k, e] of top) {
    if (!MOD[e.id].front) continue;
    const b = (() => {
      const anchor = occ.get(k);
      return anchor === undefined ? null : base.get(anchor);
    })();
    if (b?.id === 'ring' && cellCount(MOD[e.id]) === 1) continue;
    const hit = frontCells(e)
      .map(([x, y]) => tops.get(key(x, y)))
      .find(a => a !== undefined && a !== k);
    if (hit !== undefined) out.push(['t', k, top.get(hit).id]);
  }
  return out;
}

function blockedList() {
  return blockedFor(G.base, G.top);
}
function addAff(id, w = 1) {
  for (const t of MOD[id].tags) G.aff[t] = (G.aff[t] || 0) + w;
}
function gain(id, n) {
  G.inv[id] = (G.inv[id] || 0) + n;
  if (!G.found.has(id)) {
    G.found.add(id);
    addAff(id);
  }
}
function addCoins(n) {
  G.coins += n;
  const el = $('#tCoins');
  el.textContent = G.coins;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 180);
}

/* stats shared by builder and arena */
function calc(items, tn) {
  let mass = 0,
    p = 0,
    g = 0,
    topW = 0,
    drv = 0,
    hover = 0,
    slide = 0,
    strafe = false,
    flipRes = 0,
    cx = 0,
    cy = 0,
    power = 0,
    turnB = 0,
    monster = 0,
    studs = 0;
  for (const it of items) {
    mass += it.mass;
    cx += it.x * it.mass;
    cy += it.y * it.mass;
  }
  cx /= mass || 1;
  cy /= mass || 1;
  let steer = 0;
  for (const it of items) {
    const m = it.m,
      d = m.drive;
    if (m.flipRes) flipRes++;
    if (m.strafe) strafe = true;
    if (m.power) power += m.power;
    if (m.studs) studs++;
    if (m.turn) turnB += m.turn;
    if (d) {
      const mud = T('mudtires', tn) && m.id === 'wheel';
      p += d.p;
      g += d.g * (mud ? 1.3 : 1);
      topW += d.top * d.p * (mud ? 0.9 : 1);
      drv++;
      if (m.hover) hover++;
      if (d.slide) slide++;
      if (m.monster) monster++;
    }
    if (m.steer) steer += 0.22 * Math.min(1, Math.abs(it.y - cy) / 2.5);
  }
  if (drv) p += power;
  const trac = drv ? Math.min(1.25, g / 4) : 0.06,
    hoverMode = drv > 0 && hover === drv;
  const accel = ((p * 215) / Math.max(1, mass)) * trac,
    topCap = p ? topW / (p - power || 1) : 0,
    top = p ? Math.min(topCap, accel / 1.2) : 0;
  const turnR =
    (1.2 + 1.4 * Math.min(1, (p * 1.5) / Math.max(1, mass))) *
    Math.max(0.3, Math.min(1.15, trac)) *
    (1 + Math.min(0.8, steer) + Math.min(0.6, turnB));
  let latF = 1 + 6 * Math.min(1.4, g / 4);
  if (hoverMode) latF *= 0.35;
  if (drv) latF *= 1 - (0.4 * slide) / drv;
  return {
    mass,
    p,
    g,
    trac,
    accel,
    top,
    topCap,
    turnR,
    latF,
    hoverMode,
    strafe,
    flipRes,
    cx,
    cy,
    monster: monster > 0,
    studs: drv > 0 && studs * 2 >= drv
  };
}
function auraOf(ids) {
  const a = {},
    c = {};
  for (const id of ids) {
    const m = MOD[id];
    if (!m.aura) continue;
    c[id] = (c[id] || 0) + 1;
    if (c[id] <= (m.auraMax || 9)) for (const k in m.aura) a[k] = (a[k] || 0) + m.aura[k];
  }
  return a;
}
function wstat(id, aura, tn) {
  const W = { ...MOD[id].wpn };
  aura = aura || {};
  if (id === 'flamer') {
    if (T('longnozzle', tn)) {
      W.rng *= 1.5;
      W.dps *= 0.8;
    }
    if (T('napalmmix', tn)) W.rng *= 0.8;
    if (T('burntrail', tn)) W.dps *= 0.9;
  }
  if (id === 'mg') {
    if (T('apround', tn)) W.rate *= 0.75;
    if (T('drum', tn)) {
      W.rate *= 1.5;
      W.spr *= 1.6;
    }
  }
  if (id === 'cannon') {
    if (T('bigbore', tn)) {
      W.dmg *= 1.5;
      W.recoil *= 2;
    }
    if (T('dampers', tn)) {
      W.recoil *= 0.2;
      W.dmg *= 0.85;
    }
  }
  if (id === 'scatter' && T('choke', tn)) {
    W.spr *= 0.55;
    W.rng *= 1.3;
    W.n = 5;
  }
  if (id === 'rocket' && T('longvolley', tn)) {
    W.burst = 6;
    W.reload += 2;
  }
  if (id === 'mortar' && T('heavyshell', tn)) {
    W.splash *= 1.4;
    W.slow = 1;
  }
  if (id === 'railgun' && T('overcharge', tn)) {
    W.dmg *= 1.6;
    W.charge += 0.6;
  }
  if (id === 'arc' && T('widearc', tn)) {
    W.chain += 2;
    W.rng *= 0.8;
  }
  if (id === 'harpoon' && T('winch', tn)) W.rng *= 0.75;
  if (id === 'freeze' && T('cryo', tn)) W.rng *= 0.75;
  if (id === 'hydro' && T('pressure', tn)) {
    W.push *= 1.6;
    W.rng *= 0.8;
  }
  if (id === 'tirel' && T('ricochet', tn)) W.dmg *= 0.75;
  if (id === 'minigun' && T('minispool', tn)) W.spr *= 1.4;
  if (W.rng) W.rng *= 1 + (aura.range || 0);
  const rm = 1 + (aura.rate || 0);
  if (W.rate) W.rate *= rm;
  if (W.cd) W.cd /= rm;
  if (W.reload) W.reload /= rm;
  if (W.dps) W.dps *= 1 + (aura.rate || 0) * 0.5;
  if (W.cls === 'ballistic' && W.dmg) W.dmg *= 1 + (aura.dmg_ballistic || 0);
  if (W.cls === 'energy') {
    const k = 1 + (aura.dmg_energy || 0);
    if (W.dmg) W.dmg *= k;
    if (W.dps) W.dps *= k;
  }
  if (W.cls === 'fire' && W.dps) W.dps *= 1 + (aura.dmg_fire || 0);
  if (W.cls === 'expl' && W.dmg) W.dmg *= 1 + (aura.dmg_expl || 0);
  if (W.splash) W.splash *= 1 + (aura.splash || 0);
  if (W.chain !== undefined) W.chain += aura.chain || 0;
  return W;
}
function dpsOf(id, aura, tn) {
  const m = MOD[id];
  if (m.mel) return (m.mel.dps || m.mel.hit / m.mel.cd) * (id === 'saw' && T('diamond', tn) ? 1.4 : 1);
  if (m.drones) return m.drones * 12 * (T('hive', tn) ? 1.5 : 1);
  if (!m.wpn) return 0;
  const W = wstat(id, aura, tn);
  switch (W.kind) {
    case 'bullet':
    case 'shell':
    case 'bolt':
    case 'plasma':
    case 'sticky':
    case 'bounce':
      return W.dmg * (W.n || 1) * W.rate;
    case 'homing':
      return W.dmg * W.rate;
    case 'rocket':
      return (W.dmg * W.burst) / (W.reload + W.burst * 0.12);
    case 'lob':
      return W.dmg * W.rate * (W.cluster ? W.cluster * 0.6 : 1);
    case 'rail':
      return W.dmg / (W.cd + W.charge);
    case 'flame':
    case 'beam':
      return W.dps * (W.beams || 1);
    case 'arc':
    case 'tesla':
      return (W.dmg * (1 + W.chain * 0.6)) / W.cd;
    case 'harpoon':
      return W.dmg / W.cd;
  }
  return 0;
}
function statLine(m) {
  const a = [`${m.hp} HP`, `${m.mass} t`];
  if (cellCount(m) > 1) a.push(shapeLabel(m));
  const d = dpsOf(m.id, {});
  if (d) a.push(`${Math.round(d)} dps`);
  if (m.wpn && m.wpn.rng) a.push(`range ${Math.round(wstat(m.id).rng)}`);
  if (m.drive) a.push(`drive ${m.drive.p}`);
  if (m.dir) a.push('directional');
  return a.join(' · ');
}
const SOCKET = ['', '○', '⬢'];
function mountLine(m) {
  return m.layer === 't'
    ? `Equipment · needs a ${SOCKET[m.mnt]} ${MOUNTNAME[m.mnt]}`
    : m.mnt
      ? `Chassis · gives a ${SOCKET[m.mnt]} ${MOUNTNAME[m.mnt]}`
      : 'Chassis · nothing mounts on it';
}
/* ---------- small icon set for stat chips (inline SVG, inherits text colour) ---------- */
const ICO = {
  hp: '<path d="M8 14s-5-3.2-5-7a3 3 0 0 1 5-2.2A3 3 0 0 1 13 7c0 3.8-5 7-5 7z"/>',
  mass: '<path d="M5 6h6l2 8H3zM8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  dps: '<path d="M8 1l1.6 4.4L14 6l-3.4 2.8L11.8 14 8 11.4 4.2 14l1.2-5.2L2 6l4.4-.6z"/>',
  rng: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6"/><path d="M8 0v3M8 13v3M0 8h3M13 8h3" stroke="currentColor" stroke-width="1.6"/>',
  drive:
    '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2"/>',
  dir: '<path d="M8 1l5 7H9.5v7h-3V8H3z"/>',
  cells: '<path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2z"/>',
  coin: '<circle cx="8" cy="8" r="6"/>'
};
const ico = (k, cls = '') =>
  `<svg class="si ${cls}" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">${ICO[k]}</svg>`;
/** Stat chips with icons; the text label lives in the title for hover and screen readers. */
function statChips(m) {
  const c = [['hp', `${m.hp}`, 'Hit points']];
  c.push(['mass', `${m.mass}t`, 'Weight']);
  if (cellCount(m) > 1) c.push(['cells', shapeLabel(m).split(' ·')[0], 'Footprint']);
  const d = dpsOf(m.id, {});
  if (d) c.push(['dps', `${Math.round(d)}`, 'Damage per second']);
  if (m.wpn && m.wpn.rng) c.push(['rng', `${Math.round(wstat(m.id).rng)}`, 'Range']);
  if (m.drive) c.push(['drive', `${m.drive.p}`, 'Drive power']);
  if (m.dir) c.push(['dir', '', 'Fires the way it faces']);
  return `<span class="chips">${c.map(([k, v, t]) => `<span class="chip-s" title="${t}">${ico(k)}${v ? `<b>${v}</b>` : ''}</span>`).join('')}</span>`;
}
/** One socket badge: what a part needs (equipment) or gives (chassis). */
function socketBadge(m) {
  const t = mountLine(m);
  if (m.layer === 't')
    return `<span class="sock need s${m.mnt}" title="${esc(t)}">${SOCKET[m.mnt]} needs ${m.mnt > 1 ? 'heavy' : 'light'}</span>`;
  return m.mnt
    ? `<span class="sock give s${m.mnt}" title="${esc(t)}">${SOCKET[m.mnt]} gives ${m.mnt > 1 ? 'heavy' : 'light'}</span>`
    : `<span class="sock none" title="${esc(t)}">no socket</span>`;
}

/* =================== BUILDER =================== */
const bp = $('#bp'),
  bpx = bp.getContext('2d'),
  bay = $('#bay'),
  bayScroll = $('#bayScroll');
let cell = 40,
  fitCell = 40,
  bpW = 0,
  bpH = 0,
  hover = null,
  dragMode = null,
  lastK = null,
  dims = null;
const bfx = [],
  pops = new Map(),
  ghosts = [];
const building = () => G.phase === 'build';
function bayDims() {
  const b = bbox(G.ws);
  return { x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 };
}
function sizeBP() {
  // fit inside the padded area, so the grid never hides under the layer buttons or toolbar
  const cs = (window.getComputedStyle && getComputedStyle(bayScroll)) || {},
    pad = k => parseFloat(cs[k]) || 0,
    r0 = bayScroll.getBoundingClientRect(),
    r = {
      width: r0.width - pad('paddingLeft') - pad('paddingRight'),
      height: r0.height - pad('paddingTop') - pad('paddingBottom')
    },
    d = dprOf();
  dims = bayDims();
  const cols = dims.x1 - dims.x0 + 1,
    rows = dims.y1 - dims.y0 + 1;
  fitCell = clamp(Math.floor(Math.min((r.width - 20) / cols, (r.height - 20) / rows)), 14, 60);
  cell = Math.round(fitCell * G.zoom);
  bpW = cell * cols;
  bpH = cell * rows;
  bp.style.width = bpW + 'px';
  bp.style.height = bpH + 'px';
  bp.width = Math.round(bpW * d);
  bp.height = Math.round(bpH * d);
  const b = bbox(G.ws);
  $('#bayTag').textContent = `BAY ${b.x1 - b.x0 + 1}×${b.y1 - b.y0 + 1} · ${G.ws.size} CELLS`;
  $('#zLbl').textContent = Math.round(G.zoom * 100) + '%';
  drawBP();
}
function setZoom(z) {
  G.zoom = clamp(z, 0.6, 2.6);
  sizeBP();
}
if (window.ResizeObserver) {
  const tb = $('#bay .toolbar');
  if (tb)
    new ResizeObserver(() => {
      const h = Math.round(tb.getBoundingClientRect().height);
      if (h && $('#bay').style.getPropertyValue('--tb-h') !== h + 'px') {
        $('#bay').style.setProperty('--tb-h', h + 'px');
        if (building()) sizeBP();
      }
    }).observe(tb);
}
$('#zIn').addEventListener('click', () => setZoom(G.zoom * 1.2));
$('#zOut').addEventListener('click', () => setZoom(G.zoom / 1.2));
$('#zFit').addEventListener('click', () => setZoom(1));
bay.addEventListener(
  'wheel',
  e => {
    if (!building()) return;
    e.preventDefault();
    setZoom(G.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  },
  { passive: false }
);
const cpx = x => (x - dims.x0) * cell,
  cpy = y => (y - dims.y0) * cell;
const touchesDesign = (cells, occ) =>
  cells.some(([x, y]) =>
    DIRS.some(([dx, dy]) => {
      const k = key(x + dx, y + dy);
      return occ.has(k) && !cells.some(([a, b]) => a === x + dx && b === y + dy);
    })
  );
function canPlaceBase(id, rot, x, y, occ) {
  const cells = footprint(id, rot, x, y);
  if (!cells.every(([a, b]) => G.ws.has(key(a, b)))) return 'Part of it falls outside the bay';
  if (cells.some(([a, b]) => occ.has(key(a, b)))) return 'Something is already there';
  if (!touchesDesign(cells, occ)) return 'Attach parts to the vehicle';
  if (left(id) <= 0) return `No ${MOD[id].name} left. Buy more in the shop.`;
  return null;
}
function canPlaceTop(id, x, y, occ, rot = G.rot) {
  const cells = footprint(id, rot, x, y),
    anchor = key(x, y),
    current = G.top.get(anchor),
    tops = occupancy(G.top);
  for (const [a, b] of cells) {
    const k = key(a, b),
      support = baseAt(k, occ);
    if (!G.ws.has(k) || !support) return 'Every occupied cell needs a support block';
    if (MOD[support.id].mnt < MOD[id].mnt) return 'Every occupied cell needs a compatible mount';
    const used = tops.get(k);
    if (used !== undefined && used !== anchor) return 'Remove the equipment occupying this footprint first';
  }
  if (!current && left(id) <= 0) return `No ${MOD[id].name} left`;
  if (current && current.id !== id && left(id) <= 0) return `No ${MOD[id].name} left`;
  return null;
}

function drawPiece(c, e, top, scale = 1) {
  if (top && G.layerView === 'base') return;
  const m = MOD[e.id],
    [ccx, ccy] = instCenter(e);
  c.save();
  c.translate(cpx(ccx) + cell / 2, cpy(ccy) + cell / 2);
  const alive = building() && SETTINGS.motion !== false;
  // engines and thrusters idle with a little shake
  if (alive && ['engine', 'jet', 'jumpjet'].includes(m.art && m.art.k))
    c.translate(Math.sin(ANIM * 47 + ccx * 3) * cell * 0.018, Math.cos(ANIM * 53 + ccy * 2) * cell * 0.018);
  c.scale(scale, scale);
  if (!top && G.layerView === 'top') c.globalAlpha *= 0.22;
  const hot = m.tags.includes('fire'),
    cold = m.tags.includes('cold');
  if (m.glow) {
    c.shadowColor = m.glow;
    c.shadowBlur = cell * 0.35 * (1 + Math.sin(ANIM * 3) * 0.3);
  } else if (hot && alive) {
    c.shadowColor = '#ff7a1a';
    c.shadowBlur = cell * (0.25 + 0.15 * Math.sin(ANIM * 4 + ccx));
  } else if (cold && alive) {
    c.shadowColor = '#bfefff';
    c.shadowBlur = cell * 0.22;
  }
  const b = top ? baseAt(key(e.x, e.y)) : null;
  drawModule(c, e.id, cell * (top ? 0.82 : 0.96), (e.rot * Math.PI) / 2, 'p', {
    builder: 1,
    turret: top && b && b.id === 'ring',
    paint: G.paint,
    ...(e.id === 'cockpit'
      ? {
          badge: G.style.badge,
          mood: performance.now() - (G.lastInput || performance.now()) > 20000 ? 'sleep' : G.scars ? 'hurt' : 'idle'
        }
      : null)
  });
  c.shadowBlur = 0;
  if (cold) drawFrost(c, cell * (top ? 0.82 : 0.96), ccx * 7 + ccy * 3);
  const scar = G.scars && building() && G.scars[(top ? 't|' : 'b|') + key(e.x, e.y)];
  if (scar) drawScar(c, cell * (top ? 0.82 : 0.96), scar, ccx * 13 + ccy * 7);
  c.restore();
}
/* ---------- cockpit character + badge ---------- */
/** Two eyes on the windshield: they blink, look where you aim and pull faces. */
function drawEyes(c, h, st) {
  const mood = st.mood || 'idle',
    t = ANIM + (st.seed || 0);
  const blink = mood !== 'dead' && t % 4.3 < 0.12;
  const la = st.lookA != null ? st.lookA : Math.sin(t * 0.7) * 0.6 - Math.PI / 2,
    lx = Math.cos(la) * h * 0.06,
    ly = Math.sin(la) * h * 0.05;
  for (const sx of [-1, 1]) {
    const x = sx * h * 0.27,
      y = -h * 0.36,
      r = h * (mood === 'hurt' ? 0.19 : 0.16);
    c.save();
    c.translate(x, y);
    if (mood === 'sleep') {
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = h * 0.06;
      c.beginPath();
      c.arc(0, -r * 0.1, r * 0.7, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
      if (sx > 0) {
        c.fillStyle = '#e6faff';
        c.font = `700 ${h * 0.3}px "Chakra Petch", sans-serif`;
        const z = (t * 0.6) % 1;
        c.globalAlpha = 1 - z;
        c.fillText('z', r * 1.3 + z * h * 0.3, -r - z * h * 0.6);
        c.globalAlpha = 1;
      }
    } else if (mood === 'dead') {
      line(c, [-r * 0.7, -r * 0.7, r * 0.7, r * 0.7], '#1a1a1a', h * 0.07);
      line(c, [r * 0.7, -r * 0.7, -r * 0.7, r * 0.7], '#1a1a1a', h * 0.07);
    } else if (mood === 'happy') {
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = h * 0.07;
      c.beginPath();
      c.arc(0, r * 0.3, r * 0.75, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    } else {
      c.fillStyle = '#f7fbff';
      c.beginPath();
      c.ellipse(0, 0, r, blink ? r * 0.12 : r * 1.05, 0, 0, 7);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,.55)';
      c.lineWidth = h * 0.03;
      c.stroke();
      if (!blink) {
        c.fillStyle = '#10141c';
        c.beginPath();
        c.arc(lx, ly, r * 0.5, 0, 7);
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(lx - r * 0.18, ly - r * 0.2, r * 0.15, 0, 7);
        c.fill();
      }
      if (mood === 'angry') {
        c.fillStyle = st.paint || '#f2b705';
        c.beginPath();
        c.moveTo(-r * 1.3, -r * (sx > 0 ? 1.3 : 0.2));
        c.lineTo(r * 1.3, -r * (sx > 0 ? 0.2 : 1.3));
        c.lineTo(r * 1.3, -r * 1.6);
        c.lineTo(-r * 1.3, -r * 1.6);
        c.closePath();
        c.fill();
      }
      if (mood === 'hurt' && sx > 0) {
        c.fillStyle = '#7fd1ff';
        c.beginPath();
        c.moveTo(r * 1.2, -r * 0.4);
        c.quadraticCurveTo(r * 1.65, r * 0.5, r * 1.2, r * 0.6);
        c.quadraticCurveTo(r * 0.8, r * 0.5, r * 1.2, -r * 0.4);
        c.fill();
      }
    }
    c.restore();
  }
}
const BADGE_SHAPES = {
  shield: 'M20 2 L36 8 V20 C36 30 28 36 20 39 C12 36 4 30 4 20 V8 Z',
  circle: 'M20 2 A18 18 0 1 1 19.99 2 Z',
  hex: 'M20 2 L36 11 V29 L20 38 L4 29 V11 Z',
  diamond: 'M20 1 L39 20 L20 39 L1 20 Z',
  star: 'M20 1 L25 13 L38 13 L28 22 L32 36 L20 28 L8 36 L12 22 L2 13 L15 13 Z'
};
const BADGE_SYMBOLS = {
  bolt: '<path d="M22 7 L12 22 H19 L16 33 L28 17 H21 L24 7 Z"/>',
  skull:
    '<path d="M20 9 C13 9 10 14 10 19 C10 23 12 25 14 26 V30 H26 V26 C28 25 30 23 30 19 C30 14 27 9 20 9 Z M15.5 17 A2.5 2.5 0 1 0 15.5 22 A2.5 2.5 0 1 0 15.5 17 Z M24.5 17 A2.5 2.5 0 1 0 24.5 22 A2.5 2.5 0 1 0 24.5 17 Z" fill-rule="evenodd"/>',
  gear: '<circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="3.2 2.1"/><circle cx="20" cy="20" r="5.5"/><circle cx="20" cy="20" r="2.4" fill="#0a1020"/>',
  crown: '<path d="M10 28 V15 L15 20 L20 11 L25 20 L30 15 V28 Z"/>',
  flame:
    '<path d="M20 8 C24 14 29 17 27 25 C26 30 22 32 20 32 C16 32 12 29 13 23 C14 19 17 18 17 14 C19 16 20 18 20 20 C22 17 21 12 20 8 Z"/>',
  cross: '<path d="M17 9 H23 V17 H31 V23 H23 V31 H17 V23 H9 V17 H17 Z"/>',
  chevron: '<path d="M10 14 L20 22 L30 14 V19 L20 27 L10 19 Z M10 22 L20 30 L30 22 V26 L20 33 L10 26 Z"/>',
  wrench: '<path d="M26 8 A6 6 0 0 0 20 15 L10 25 A2.8 2.8 0 0 0 14 29 L24 19 A6 6 0 0 0 31 13 L27.5 15 L25 12.5 Z"/>'
};
const BADGE_COLS = ['#ffb423', '#5be7ff', '#ff5c7a', '#3fe0a0', '#c58bff', '#f2f6fc', '#ff8a3a', '#4ea1ff'];
const DEFAULT_BADGE = 'shield.bolt.0';
function parseBadge(code) {
  const [sh, sy, ci] = String(code || DEFAULT_BADGE).split('.');
  return {
    sh: BADGE_SHAPES[sh] ? sh : 'shield',
    sy: BADGE_SYMBOLS[sy] ? sy : 'bolt',
    col: BADGE_COLS[+ci] || BADGE_COLS[0],
    ci: BADGE_COLS[+ci] ? +ci : 0
  };
}
const validBadge = code => {
  const p = parseBadge(code);
  return `${p.sh}.${p.sy}.${p.ci}`;
};
function badgeSVG(code) {
  const b = parseBadge(code);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="${BADGE_SHAPES[b.sh]}" fill="#0a1020" stroke="${b.col}" stroke-width="2.6" stroke-linejoin="round"/><g fill="${b.col}" color="${b.col}">${BADGE_SYMBOLS[b.sy]}</g></svg>`;
}
const badgeURL = code => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(badgeSVG(code));
const badgeHTML = (code, size = 24) =>
  code ? `<img class="badge" width="${size}" height="${size}" alt="" src="${badgeURL(code)}">` : '';
const _badgeImgs = {};
function drawBadge(c, code, size, x = 0, y = 0) {
  if (typeof Image === 'undefined') return;
  const k = validBadge(code);
  let im = _badgeImgs[k];
  if (!im) {
    im = _badgeImgs[k] = new Image();
    im.src = badgeURL(k);
  }
  if (im.complete && im.naturalWidth) c.drawImage(im, x - size / 2, y - size / 2, size, size);
}
function badgeEditorHTML() {
  const p = parseBadge(G.style.badge);
  const opt = (k, v, code, on) =>
    `<button class="bo${on ? ' on' : ''}" data-bk="${k}" data-bv="${v}" aria-pressed="${on}" title="${esc(String(v))}">${badgeHTML(code, 30)}</button>`;
  return `<div class="badgeed"><span class="label">Your badge</span><div class="bhead">${badgeHTML(G.style.badge, 72)}<span class="small">Shows on your cockpit, the scoreboard and the podium.</span></div>
    <div class="brow">${Object.keys(BADGE_SHAPES)
      .map(sh => opt('sh', sh, `${sh}.${p.sy}.${p.ci}`, sh === p.sh))
      .join('')}</div>
    <div class="brow">${Object.keys(BADGE_SYMBOLS)
      .map(sy => opt('sy', sy, `${p.sh}.${sy}.${p.ci}`, sy === p.sy))
      .join('')}</div>
    <div class="brow">${BADGE_COLS.map((c, i) => `<button class="bo sw${i === p.ci ? ' on' : ''}" data-bk="ci" data-bv="${i}" aria-pressed="${i === p.ci}" style="--c:${c}" title="Colour ${i + 1}"></button>`).join('')}</div></div>`;
}
/* ---------- living garage helpers ---------- */
/** A few frost crystals and a pale rim on ice modules. */
function drawFrost(c, s, seed) {
  const h = s / 2;
  c.save();
  c.strokeStyle = 'rgba(225,248,255,.75)';
  c.lineWidth = Math.max(1, s * 0.03);
  for (let k = 0; k < 3; k++) {
    const x = (cellHash(seed + k, k * 3) - 0.5) * s * 0.8,
      y = (cellHash(k * 5, seed - k) - 0.5) * s * 0.8,
      r = s * (0.07 + cellHash(seed, k) * 0.06);
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      c.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.stroke();
  }
  c.strokeStyle = 'rgba(200,240,255,.35)';
  c.lineWidth = Math.max(1.5, s * 0.06);
  c.strokeRect(-h * 0.9, -h * 0.9, h * 1.8, h * 1.8);
  c.restore();
}
/** Dents and scorch marks from the last round. They are cosmetic and clear when the next round starts. */
function drawScar(c, s, amount, seed) {
  const h = s / 2,
    k = clamp(amount / 160, 0.25, 1);
  c.save();
  for (let i = 0; i < 1 + Math.round(k * 2); i++) {
    const x = (cellHash(seed + i, i) - 0.5) * s * 0.7,
      y = (cellHash(i * 3, seed + i) - 0.5) * s * 0.7,
      g = c.createRadialGradient(x, y, 0, x, y, h * (0.35 + k * 0.4));
    g.addColorStop(0, `rgba(20,12,8,${0.55 * k + 0.2})`);
    g.addColorStop(1, 'rgba(20,12,8,0)');
    c.fillStyle = g;
    c.fillRect(-h, -h, s, s);
  }
  c.strokeStyle = `rgba(255,255,255,${0.18 + 0.2 * k})`;
  c.lineWidth = Math.max(1, s * 0.03);
  const dx = (cellHash(seed, 9) - 0.5) * s * 0.5;
  c.beginPath();
  c.arc(dx, (cellHash(9, seed) - 0.5) * s * 0.5, h * 0.28, Math.PI * 0.1, Math.PI * 0.9);
  c.stroke();
  if (k > 0.6) {
    c.strokeStyle = 'rgba(10,6,4,.55)';
    c.beginPath();
    c.moveTo(-h * 0.6, -h * 0.2);
    c.lineTo(-h * 0.1, h * 0.05);
    c.lineTo(h * 0.15, -h * 0.15);
    c.lineTo(h * 0.55, h * 0.3);
    c.stroke();
  }
  c.restore();
}
/** Rolling tyre treads on every wheel or track, so the car looks ready to go. */
function drawTreads(c) {
  if (SETTINGS.motion === false || G.layerView === 'top') return;
  c.save();
  for (const e of G.base.values()) {
    const m = MOD[e.id];
    if (!m.drive) continue;
    for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) {
      const X = cpx(x),
        Y = cpy(y),
        w = cell * 0.34,
        off = (ANIM * cell * 1.6) % (cell * 0.26);
      c.save();
      c.beginPath();
      c.rect(X + cell / 2 - w / 2, Y + cell * 0.08, w, cell * 0.84);
      c.clip();
      c.strokeStyle = 'rgba(255,255,255,.13)';
      c.lineWidth = Math.max(1, cell * 0.045);
      for (let i = -1; i < 5; i++) {
        const yy = Y + cell * 0.08 + i * cell * 0.26 + off;
        c.beginPath();
        c.moveTo(X + cell / 2 - w / 2, yy);
        c.lineTo(X + cell / 2 + w / 2, yy);
        c.stroke();
      }
      c.restore();
    }
  }
  c.restore();
}
/** Holographic look for the part under the cursor: scanlines and a glow on its real footprint. */
function drawHolo(c, id, rot, x, y, bad) {
  const col = bad ? '255,92,122' : '91,231,255';
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const [a, b] of footprint(id, rot, x, y)) {
    const X = cpx(a),
      Y = cpy(b);
    c.fillStyle = `rgba(${col},.12)`;
    c.fillRect(X + 1, Y + 1, cell - 2, cell - 2);
    c.fillStyle = `rgba(${col},.22)`;
    for (let yy = (ANIM * 30) % 4; yy < cell; yy += 4) c.fillRect(X + 1, Y + yy, cell - 2, 1);
  }
  c.restore();
  c.save();
  c.shadowColor = `rgb(${col})`;
  c.shadowBlur = cell * 0.4;
  c.strokeStyle = `rgba(${col},.95)`;
  c.lineWidth = 2;
  c.setLineDash([cell * 0.18, cell * 0.08]);
  c.lineDashOffset = -ANIM * 40;
  for (const [a, b] of footprint(id, rot, x, y)) c.strokeRect(cpx(a) + 1.5, cpy(b) + 1.5, cell - 3, cell - 3);
  c.restore();
}
/** Idle sparks, exhaust puffs and the white flash when a part clicks into place. */
function garageAmbient(dt) {
  if (!building() || SETTINGS.motion === false) return;
  G.zapT = (G.zapT ?? 3) - dt;
  if (G.zapT <= 0) {
    G.zapT = 3.5 + Math.random() * 6;
    try {
      const els = [...document.querySelectorAll('#build .panel, #bayScroll, #hud')].filter(
        e => e.offsetParent !== null
      );
      if (els.length) zap(pick(els));
    } catch (e) {}
  }
  for (const e of [...G.base.values(), ...G.top.values()]) {
    const m = MOD[e.id],
      k = m.art && m.art.k;
    if (['engine', 'jet', 'booster'].includes(k) && Math.random() < dt * 1.6)
      bfx.push({
        x: e.x + 0.5 + rnd(-0.1, 0.1),
        y: e.y + 0.95,
        vx: rnd(-0.3, 0.3),
        vy: rnd(0.6, 1.2),
        life: 0.9,
        max: 0.9,
        col: 'rgba(180,190,205,.6)',
        sz: rnd(3, 5),
        smoke: 1
      });
    if (m.wpn && Math.random() < dt * 0.12)
      for (let i = 0; i < 4; i++)
        bfx.push({
          x: e.x + 0.5,
          y: e.y + 0.3,
          vx: rnd(-2, 2),
          vy: rnd(-2.5, -0.5),
          life: 0.3,
          max: 0.3,
          col: pick(['#fff3b0', '#ffb423', '#ffffff']),
          sz: rnd(1.5, 2.5)
        });
    if (m.tags.includes('fire') && Math.random() < dt * 2)
      bfx.push({
        x: e.x + 0.5 + rnd(-0.25, 0.25),
        y: e.y + 0.4,
        vx: rnd(-0.2, 0.2),
        vy: rnd(-1.2, -0.6),
        life: 0.6,
        max: 0.6,
        col: pick(['#ffb423', '#ff7a1a', '#ffe27a']),
        sz: rnd(1.5, 3)
      });
  }
}
function drawBP() {
  if (!dims) return;
  const c = bpx,
    d = dprOf();
  c.setTransform(d, 0, 0, d, 0, 0);
  c.clearRect(0, 0, bpW, bpH);
  for (let y = dims.y0; y <= dims.y1; y++)
    for (let x = dims.x0; x <= dims.x1; x++) {
      const X = cpx(x),
        Y = cpy(y);
      if (G.ws.has(key(x, y))) {
        c.fillStyle = 'rgba(10,30,50,.42)';
        c.fillRect(X, Y, cell, cell);
        c.strokeStyle = 'rgba(150,195,235,.3)';
        c.lineWidth = 1;
        c.strokeRect(X + 0.5, Y + 0.5, cell - 1, cell - 1);
      }
    }
  c.setLineDash([4, 4]);
  c.strokeStyle = 'rgba(150,195,235,.35)';
  c.beginPath();
  c.moveTo(cpx(0) + cell / 2, 0);
  c.lineTo(cpx(0) + cell / 2, bpH);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = 'rgba(169,203,232,.75)';
  c.font = `700 ${Math.max(9, cell * 0.24)}px "Barlow Semi Condensed",sans-serif`;
  c.textAlign = 'center';
  c.fillText('▲ FRONT', cpx(0) + cell / 2, cpy(dims.y0) + cell * 0.6);
  const occ = occupancy(G.base),
    selTop = MOD[G.sel] && MOD[G.sel].layer === 't';
  if (building() && G.tool === 'place') {
    if (selTop) {
      /* sockets are drawn on top of the chassis further down (drawSockets) */
    } else {
      c.fillStyle = 'rgba(169,203,232,.55)';
      for (const k of G.ws) {
        if (occ.has(k)) continue;
        const [x, y] = unkey(k);
        if (DIRS.some(([dx, dy]) => occ.has(key(x + dx, y + dy)))) {
          c.beginPath();
          c.arc(cpx(x) + cell / 2, cpy(y) + cell / 2, 2, 0, 7);
          c.fill();
        }
      }
    }
  }
  const now = performance.now();
  for (const [k, e] of G.base) {
    const pt = pops.get('b' + k);
    let sc = 1;
    if (pt) {
      const t = (now - pt) / 260;
      sc = t >= 1 ? 1 : 1 + Math.sin(t * Math.PI) * 0.25 * (1 - t) + (t < 0.3 ? -0.35 * (1 - t / 0.3) : 0);
      if (t >= 1) pops.delete('b' + k);
    }
    const m = MOD[e.id];
    if (m.rar >= 3) {
      const [ccx, ccy] = instCenter(e);
      c.save();
      c.translate(cpx(ccx) + cell / 2, cpy(ccy) + cell / 2);
      c.strokeStyle = RAR[m.rar].col;
      c.globalAlpha = 0.4 + Math.sin(ANIM * 3) * 0.25;
      c.lineWidth = 2;
      c.shadowColor = RAR[m.rar].col;
      c.shadowBlur = 10;
      const L = m.size || 1;
      c.rotate((e.rot * Math.PI) / 2);
      const sb = shapeBounds(m);
      rr(c, (-sb.w * cell) / 2 + 1, (-sb.h * cell) / 2 + 1, sb.w * cell - 2, sb.h * cell - 2, 4);
      c.stroke();
      c.restore();
    }
    drawPiece(c, e, false, sc);
  }
  for (const [k, e] of G.top) {
    if (G.layerView === 'base') continue;
    const pt = pops.get('t' + k);
    let sc = 1;
    if (pt) {
      const t = (now - pt) / 260;
      sc = t >= 1 ? 1 : 1 + Math.sin(t * Math.PI) * 0.3 * (1 - t) + (t < 0.3 ? -0.4 * (1 - t / 0.3) : 0);
      if (t >= 1) pops.delete('t' + k);
    }
    c.save();
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath();
    c.arc(cpx(e.x) + cell / 2 + 2, cpy(e.y) + cell / 2 + 3, cell * 0.34, 0, 7);
    c.fill();
    c.restore();
    const m = MOD[e.id];
    if (m.rar >= 3) {
      c.save();
      c.strokeStyle = RAR[m.rar].col;
      c.globalAlpha = 0.45 + Math.sin(ANIM * 3) * 0.25;
      c.lineWidth = 2;
      c.shadowColor = RAR[m.rar].col;
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(cpx(e.x) + cell / 2, cpy(e.y) + cell / 2, cell * 0.38, 0, 7);
      c.stroke();
      c.restore();
    }
    drawPiece(c, e, true, sc);
  }
  drawTreads(c);
  // the bright flash when a part clicks into place
  for (const [pk, t0] of pops) {
    const t = (performance.now() - t0) / 220;
    if (t > 1) continue;
    const e = pk[0] === 'b' ? G.base.get(pk.slice(1)) : G.top.get(pk.slice(1));
    if (!e) continue;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(220,250,255,${(1 - t) * 0.65})`;
    for (const [a, b] of footprint(e.id, e.rot, e.x, e.y)) c.fillRect(cpx(a), cpy(b), cell, cell);
    c.restore();
  }
  drawSockets(c, occ);
  drawLogicWires(c);
  drawGroupBadges(c);
  drawLogicBadges(c);
  drawBuilderDiagnostics(c, occ);
  planGarageReport(c);
  for (const [k, e] of [...G.base, ...G.top]) {
    const m = MOD[e.id];
    if (!m.dir || !building()) continue;
    const isTop = topAt(k) === e;
    const fc = isTop ? [e.x, e.y] : footprint(e.id, e.rot, e.x, e.y).pop();
    c.save();
    c.translate(cpx(fc[0]) + cell / 2, cpy(fc[1]) + cell / 2);
    c.rotate((e.rot * Math.PI) / 2);
    c.fillStyle = isTop ? 'rgba(127,224,255,.95)' : 'rgba(242,183,5,.9)';
    c.beginPath();
    c.moveTo(0, -cell * 0.52);
    c.lineTo(cell * 0.09, -cell * 0.4);
    c.lineTo(-cell * 0.09, -cell * 0.4);
    c.closePath();
    c.fill();
    c.restore();
  }
  for (const [ly, k] of blockedList()) {
    const e = ly === 'b' ? G.base.get(k) : topAt(k),
      [ccx, ccy] = ly === 'b' ? instCenter(e) : [e.x, e.y],
      X = cpx(ccx) + cell * 0.8,
      Y = cpy(ccy) + cell * 0.2;
    circ(c, X, Y, cell * 0.15, '#e2504a', '#fff', 1.5);
    c.fillStyle = '#fff';
    c.font = `700 ${Math.round(cell * 0.22)}px sans-serif`;
    c.textBaseline = 'middle';
    c.fillText('!', X, Y + 1);
  }
  if (hover && building()) {
    const [x, y] = hover,
      k = key(x, y);
    c.lineWidth = 2;
    if (G.tool === 'place') {
      if (selTop) {
        const err = canPlaceTop(G.sel, x, y, occ);
        c.save();
        c.globalAlpha = err ? 0.3 : 0.7;
        drawPiece(c, { id: G.sel, rot: G.rot, x, y }, true);
        c.restore();
        drawHolo(c, G.sel, G.rot, x, y, !!err);
        c.strokeStyle = err ? '#e2504a' : '#7fe0ff';
        c.beginPath();
        for (const [a, b] of footprint(G.sel, G.rot, x, y)) c.rect(cpx(a) + 1, cpy(b) + 1, cell - 2, cell - 2);
        c.stroke();
      } else {
        const own = occ.get(k);
        if (!own) {
          const err = canPlaceBase(G.sel, G.rot, x, y, occ);
          c.save();
          c.globalAlpha = err ? 0.3 : 0.65;
          drawPiece(c, { id: G.sel, rot: G.rot, x, y }, false);
          c.restore();
          drawHolo(c, G.sel, G.rot, x, y, !!err);
          c.strokeStyle = err ? '#e2504a' : '#f2b705';
          for (const [a, b] of footprint(G.sel, G.rot, x, y)) c.strokeRect(cpx(a) + 1, cpy(b) + 1, cell - 2, cell - 2);
        } else {
          const e = G.base.get(own);
          c.strokeStyle = '#fff';
          for (const [a, b] of footprint(e.id, e.rot, e.x, e.y))
            c.strokeRect(cpx(a) + 1, cpy(b) + 1, cell - 2, cell - 2);
        }
      }
    } else {
      const t = topAt(k),
        own = occ.get(k);
      c.strokeStyle = G.tool === 'remove' ? '#e2504a' : '#f2b705';
      if (t && G.layerView !== 'base') {
        c.beginPath();
        c.arc(cpx(x) + cell / 2, cpy(y) + cell / 2, cell * 0.45, 0, 7);
        c.stroke();
      } else if (own) {
        const e = G.base.get(own);
        for (const [a, b] of footprint(e.id, e.rot, e.x, e.y)) c.strokeRect(cpx(a) + 1, cpy(b) + 1, cell - 2, cell - 2);
      }
    }
  }
  // Balance point: only shown when the car is noticeably lopsided (it then pulls to that side).
  const C0 = calc(designItems()),
    off = Math.hypot(C0.cx, C0.cy);
  if (off > 0.75 || G.showArcs) {
    const C = C0;
    const X = cpx(C.cx) + cell / 2,
      Y = cpy(C.cy) + cell / 2;
    c.strokeStyle = '#ff6fae';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(X, Y, cell * 0.22, 0, 7);
    c.moveTo(X - cell * 0.35, Y);
    c.lineTo(X + cell * 0.35, Y);
    c.moveTo(X, Y - cell * 0.35);
    c.lineTo(X, Y + cell * 0.35);
    c.stroke();
    c.fillStyle = '#ff6fae';
    c.font = `700 ${Math.max(9, cell * 0.2)}px sans-serif`;
    c.textAlign = 'left';
    c.fillText(off > 0.75 ? 'Heavy side' : 'Balance', X + cell * 0.25, Y - cell * 0.25);
  }
  if (G.mirror) {
    c.strokeStyle = 'rgba(127,224,255,.8)';
    c.lineWidth = 2;
    c.setLineDash([8, 5]);
    c.beginPath();
    c.moveTo(cpx(0) + cell / 2, 0);
    c.lineTo(cpx(0) + cell / 2, bpH);
    c.stroke();
    c.setLineDash([]);
  }
  for (const g of ghosts) {
    const t = (now - g.t) / 450;
    if (t >= 1) continue;
    c.save();
    c.globalAlpha = 1 - t;
    c.translate(cpx(g.x) + cell / 2, cpy(g.y) + cell / 2 - t * cell * 0.8);
    c.rotate(t * 1.2 * g.spin);
    c.scale(1 - t * 0.4, 1 - t * 0.4);
    drawModule(c, g.id, cell * 0.9, (g.rot * Math.PI) / 2, 'p', { builder: 1 });
    c.restore();
  }
  for (const p of bfx) {
    const k = Math.max(0, p.life / p.max);
    c.globalAlpha = p.smoke ? k * 0.55 : k;
    c.fillStyle = p.col;
    if (p.smoke) circ(c, cpx(0) + p.x * cell, cpy(0) + p.y * cell, p.sz * (1 + (1 - k) * 2.2), p.col);
    else c.fillRect(cpx(0) + p.x * cell - 1.5, cpy(0) + p.y * cell - 1.5, p.sz, p.sz);
  }
  c.globalAlpha = 1;
}
/** Free sockets on the chassis that can hold equipment needing `need` (1 light, 2 heavy). */
function freeSockets(need) {
  const occ = occupancy(G.base);
  let n = 0;
  for (const [k, a] of occ) if (!topAt(k) && MOD[G.base.get(a).id].mnt >= need) n++;
  return n;
}
/* Sockets drawn on the chassis: ○ light, ⬢ heavy. While equipment is selected the ones that
   fit glow and the ones too weak for it are crossed out, so it is obvious where it can go. */
function drawSockets(c, occ) {
  if (!building()) return;
  const sel = MOD[G.sel],
    placing = G.tool === 'place' && sel && sel.layer === 't',
    show = placing || G.layerView === 'top';
  if (!show) return;
  const need = placing ? sel.mnt : 0,
    pulse = 0.65 + Math.sin(ANIM * 4) * 0.25;
  c.save();
  for (const [k, a] of occ) {
    if (topAt(k)) continue;
    const mnt = MOD[G.base.get(a).id].mnt;
    if (!mnt) continue;
    const [x, y] = unkey(k),
      X = cpx(x) + cell / 2,
      Y = cpy(y) + cell / 2,
      r = cell * (mnt > 1 ? 0.2 : 0.15),
      fits = !need || mnt >= need;
    c.lineWidth = Math.max(1.5, cell * 0.05);
    c.strokeStyle = fits ? (need ? `rgba(91,231,255,${pulse})` : 'rgba(91,231,255,.55)') : 'rgba(255,92,122,.75)';
    c.fillStyle = fits ? (need ? 'rgba(91,231,255,.22)' : 'rgba(91,231,255,.1)') : 'rgba(255,92,122,.12)';
    c.beginPath();
    if (mnt > 1)
      for (let i = 0; i < 6; i++)
        c.lineTo(X + Math.cos((i * Math.PI) / 3 + Math.PI / 6) * r, Y + Math.sin((i * Math.PI) / 3 + Math.PI / 6) * r);
    else c.arc(X, Y, r, 0, Math.PI * 2);
    c.closePath();
    if (fits && need) {
      c.shadowColor = '#5be7ff';
      c.shadowBlur = cell * 0.35;
    }
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    if (!fits) {
      c.beginPath();
      c.moveTo(X - r * 0.7, Y + r * 0.7);
      c.lineTo(X + r * 0.7, Y - r * 0.7);
      c.stroke();
    } else {
      c.fillStyle = fits && need ? '#dffaff' : 'rgba(223,250,255,.6)';
      c.beginPath();
      c.arc(X, Y, Math.max(1.5, r * 0.28), 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}
function weakLinks() {
  const links = [];
  for (const [k, e] of G.base) {
    if (e.id === 'cockpit') continue;
    const nd = new Map(G.base);
    nd.delete(k);
    if (!designConnected(nd)) links.push(e);
  }
  return links;
}
function drawBuilderDiagnostics(c, occ) {
  if (G.showArcs && G.layerView !== 'base')
    for (const [k, e] of G.top) {
      const m = MOD[e.id];
      if (!m.wpn || !m.dir) continue;
      const ring = baseAt(k, occ)?.id === 'ring',
        angle = (e.rot * Math.PI) / 2 - Math.PI / 2;
      c.save();
      c.translate(cpx(e.x) + cell / 2, cpy(e.y) + cell / 2);
      c.fillStyle = 'rgba(127,224,255,.09)';
      c.strokeStyle = 'rgba(127,224,255,.4)';
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, cell * 2.6, ring ? 0 : angle - 0.42, ring ? Math.PI * 2 : angle + 0.42);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
  if (G.showLinks)
    for (const e of weakLinks()) {
      for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) {
        c.fillStyle = 'rgba(255,90,70,.22)';
        c.fillRect(cpx(x), cpy(y), cell, cell);
        c.strokeStyle = '#ff8a6a';
        c.lineWidth = 3;
        c.strokeRect(cpx(x) + 2, cpy(y) + 2, cell - 4, cell - 4);
      }
    }
}
$$('[data-layer]').forEach(
  b =>
    (b.onclick = () => {
      G.layerView = b.dataset.layer;
      $$('[data-layer]').forEach(x => x.setAttribute('aria-pressed', x === b));
      drawBP();
    })
);
$('#btnArcs').onclick = () => {
  G.showArcs = !G.showArcs;
  $('#btnArcs').setAttribute('aria-pressed', G.showArcs);
  drawBP();
};
$('#btnLogic').onclick = () => {
  G.showLogic = !G.showLogic;
  $('#btnLogic').setAttribute('aria-pressed', G.showLogic);
  drawBP();
};
$('#btnLinks').onclick = () => {
  G.showLinks = !G.showLinks;
  $('#btnLinks').setAttribute('aria-pressed', G.showLinks);
  drawBP();
};

function bfxTick(dt) {
  garageAmbient(dt);
  if (building()) {
    drawWindow(SETTINGS.motion === false ? 0 : dt);
    intelUI();
  }
  for (let i = bfx.length - 1; i >= 0; i--) {
    const p = bfx[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 6 * dt;
    if (p.life <= 0) bfx.splice(i, 1);
  }
  const now = performance.now();
  for (let i = ghosts.length - 1; i >= 0; i--) if (now - ghosts[i].t > 450) ghosts.splice(i, 1);
}
const builderBusy = () =>
  (building() && SETTINGS.motion !== false) ||
  bfx.length ||
  pops.size ||
  ghosts.length ||
  [...G.base.values(), ...G.top.values()].some(
    e => SETTINGS.motion !== false && (MOD[e.id].plan || MOD[e.id].glow || MOD[e.id].rar >= 3)
  );
function fxPlace(x, y, layer, k) {
  pops.set(layer + k, performance.now());
  for (let i = 0; i < 14; i++) {
    const a = rnd(0, 6.28),
      s = rnd(1.5, 4.5);
    bfx.push({
      x: x + 0.5,
      y: y + 0.5,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1,
      life: rnd(0.25, 0.5),
      max: 0.5,
      col: pick(['#ffe27a', '#fff', '#f2b705', '#ffb347']),
      sz: rnd(2, 3.5)
    });
  }
}
function fxRemove(x, y, id, rot) {
  ghosts.push({ x, y, id, rot, t: performance.now(), spin: Math.random() < 0.5 ? -1 : 1 });
  for (let i = 0; i < 10; i++) {
    const a = rnd(0, 6.28),
      s = rnd(1, 3);
    bfx.push({
      x: x + 0.5,
      y: y + 0.5,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rnd(0.3, 0.6),
      max: 0.6,
      col: pick(['#9aa3ab', '#6f777e', '#c9ced3']),
      sz: rnd(2, 4)
    });
  }
}
function hintFor() {
  const m = MOD[G.sel];
  if (!hover)
    return G.tool === 'place'
      ? m.layer === 't'
        ? (() => {
            const free = freeSockets(m.mnt);
            return free
              ? `${m.name} needs a ${SOCKET[m.mnt]} ${MOUNTNAME[m.mnt]}. ${free} glowing socket${free > 1 ? 's' : ''} on your chassis fit it.`
              : `${m.name} needs a ${SOCKET[m.mnt]} ${MOUNTNAME[m.mnt]}. None free: place a ${m.mnt > 1 ? 'Steel Girder' : 'Scrap Frame'} first.`;
          })()
        : `${m.name}: ${left(G.sel)} available. Dots mark where it can attach.`
      : G.tool === 'wire'
        ? 'Wire logic chips: click a chip, then the chip it should feed. Click a wire again to cut it.'
        : G.tool === 'keys'
          ? 'Click a weapon, moving part or chip to put it on key 1–9 (right-click counts down). Shift+click a chip to set its input key.'
          : G.tool === 'rotate'
            ? 'Click a part to turn it 90°. Top modules turn first.'
            : 'Click a part to put it back in the bin. Top modules come off first.';
  const [x, y] = hover,
    k = key(x, y);
  if (!G.ws.has(k)) return 'Outside the bay. Buy or draft an expansion to build here.';
  const t = topAt(k),
    b = baseAt(k);
  if (!t && !b) return G.tool === 'place' ? `${m.name} · ${statLine(m)}` : '';
  return [
    b && `${MOD[b.id].name} (${MOD[b.id].mnt ? SOCKET[MOD[b.id].mnt] + ' ' + MOUNTNAME[MOD[b.id].mnt] : 'no socket'})`,
    t && `topped with ${MOD[t.id].name}`
  ]
    .filter(Boolean)
    .join(' ');
}
let toastT = 0;
window.__toast = (m, g) => toast(m, g);
function toast(msg, good) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('good', !!good);
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 1800);
}
function returnTopsOn(cells, occ) {
  for (const [a, b] of cells) {
    const k = key(a, b),
      t = topAt(k);
    if (t) {
      G.top.delete(key(t.x, t.y));
      fxRemove(t.x, t.y, t.id, t.rot);
    }
  }
}
function actCore(x, y, mode, quiet) {
  const toast = quiet ? () => {} : window.__toast;
  const k = key(x, y),
    occ = occupancy(G.base),
    own = occ.get(k);
  if (mode === 'place') {
    const id = G.sel,
      m = MOD[id];
    if (m.layer === 't') {
      const err = canPlaceTop(id, x, y, occ);
      if (err) {
        toast(err);
        return;
      }
      const t = topAt(k);
      if (t && t.id === id) {
        if (t.rot !== G.rot) {
          t.rot = G.rot;
          refreshUI();
        }
        return;
      }
      if (t) fxRemove(x, y, t.id, t.rot);
      G.top.set(k, { id, rot: G.rot, x, y });
      fxPlace(x, y, 't', k);
      refreshUI();
      return;
    }
    if (own) {
      const e = G.base.get(own);
      if (e.id === 'cockpit') {
        toast('The cockpit stays put.');
        return;
      }
      if (e.id === id && (m.size || 1) === 1) {
        if (e.rot !== G.rot) {
          e.rot = G.rot;
          refreshUI();
        }
        return;
      }
      if ((MOD[e.id].size || 1) === 1 && (m.size || 1) === 1) {
        if (left(id) <= 0) {
          toast(`No ${m.name} left. Buy more in the shop.`);
          return;
        }
        const t = topAt(own);
        if (t && m.mnt < MOD[t.id].mnt) {
          G.top.delete(key(t.x, t.y));
          fxRemove(t.x, t.y, t.id, t.rot);
        }
        fxRemove(x, y, e.id, e.rot);
        G.base.set(own, { id, rot: G.rot, x: e.x, y: e.y });
        fxPlace(x, y, 'b', own);
        refreshUI();
        return;
      }
      toast('Remove that part first');
      return;
    }
    if (!G.ws.has(k)) {
      toast('Outside the bay');
      return;
    }
    const err = canPlaceBase(id, G.rot, x, y, occ);
    if (err) {
      toast(err);
      return;
    }
    G.base.set(k, { id, rot: G.rot, x, y });
    fxPlace(x, y, 'b', k);
  } else if (mode === 'keysIn') {
    const t = topAt(k);
    if (!t || !isLogic(t.id)) return toast('Shift+click sets the input key of a logic chip.');
    t.i = ((t.i || 0) + 1) % 10;
    if (!t.i) delete t.i;
    sfx('beep');
    refreshUI();
    return;
  } else if (mode === 'wire') {
    wireClick(k);
    return;
  } else if (mode === 'keys' || mode === 'keysBack') {
    const t = G.layerView === 'base' ? null : topAt(k),
      e = t && groupable(MOD[t.id]) ? t : own && groupable(MOD[G.base.get(own).id]) ? G.base.get(own) : null;
    if (!e) {
      if (t || own) toast('Only weapons and moving parts can go on a key.');
      return;
    }
    e.g = ((e.g || 0) + (mode === 'keysBack' ? 9 : 1)) % 10;
    if (!e.g) delete e.g;
    pops.set((e === t ? 't' : 'b') + k, performance.now());
    sfx('beep');
    refreshUI();
    return;
  } else if (mode === 'rotate') {
    const t = G.layerView === 'base' ? null : topAt(k);
    if (t) {
      const next = (t.rot + (G._rd || 1) + 4) % 4,
        err = canPlaceTop(t.id, t.x, t.y, occ, next);
      if (err) {
        toast(err);
        return;
      }
      t.rot = next;
      pops.set('t' + k, performance.now());
      refreshUI();
      return;
    }
    if (!own) return;
    const e = G.base.get(own),
      nd = new Map(G.base);
    nd.delete(own);
    const n = { ...e, rot: (e.rot + (G._rd || 1) + 4) % 4 };
    if ((MOD[e.id].size || 1) > 1) {
      const o2 = occupancy(nd),
        cells = footprint(n.id, n.rot, n.x, n.y);
      if (!cells.every(([a, b]) => G.ws.has(key(a, b)) && !o2.has(key(a, b)))) {
        toast('No room to turn it');
        return;
      }
      returnTopsOn(footprint(e.id, e.rot, e.x, e.y));
    }
    nd.set(own, n);
    if (!designConnected(nd)) {
      toast('It would come loose that way');
      return;
    }
    G.base = nd;
    pops.set('b' + own, performance.now());
  } else if (mode === 'remove') {
    const t = G.layerView === 'base' ? null : topAt(k);
    if (t) {
      G.top.delete(key(t.x, t.y));
      fxRemove(t.x, t.y, t.id, t.rot);
      refreshUI();
      return;
    }
    if (!own) return;
    const e = G.base.get(own);
    if (e.id === 'cockpit') {
      toast('The cockpit can’t be removed');
      return;
    }
    const nd = new Map(G.base);
    nd.delete(own);
    if (!designConnected(nd)) {
      toast('Other parts hang on this one');
      return;
    }
    returnTopsOn(footprint(e.id, e.rot, e.x, e.y));
    G.base = nd;
    fxRemove(e.x, e.y, e.id, e.rot);
  }
  refreshUI();
}
const designKey = () => JSON.stringify([[...G.base], [...G.top]]);
function restoreDesign(j) {
  const [a, b] = JSON.parse(j);
  G.base = new Map(a);
  G.top = new Map(b);
}
function act(x, y, mode) {
  if (!building()) return;
  const before = designKey();
  actCore(x, y, mode, false);
  if (G.mirror && x !== 0) {
    const r = G.rot;
    G.rot = [0, 3, 2, 1][r];
    G._rd = -1;
    actCore(-x, y, mode, true);
    G.rot = r;
    G._rd = 1;
  }
  const after = designKey();
  if (after !== before) {
    G.hist.push(before);
    if (G.hist.length > 80) G.hist.shift();
    G.redo = [];
    sfx(mode === 'remove' ? 'remove' : 'place');
    if (mode !== 'remove') {
      const id = G.sel;
      placeSound(id);
    }
  }
  refreshUI();
}
/** Heavy parts land with a metal clank, electronics give a soft beep. */
function placeSound(id) {
  const m = id && MOD[id];
  if (!m) return;
  const elec =
    m.tags.includes('energy') ||
    m.tags.includes('tech') ||
    ['sensor', 'radar', 'shieldgen', 'emp', 'tesla', 'laser', 'pulse', 'plasma', 'ion', 'drone', 'jammer'].includes(
      m.id
    ) ||
    m.wpn?.cls === 'energy' ||
    (m.cat === 'utility' && m.layer === 't');
  if (elec) sfx('beep');
  else if (m.mass >= 3 || (m.size || 1) >= 3) sfx('clank');
}
function undo() {
  if (!G.hist.length) return;
  G.redo.push(designKey());
  restoreDesign(G.hist.pop());
  sfx('ui');
  refreshUI();
}
function redo() {
  if (!G.redo.length) return;
  G.hist.push(designKey());
  restoreDesign(G.redo.pop());
  sfx('ui');
  refreshUI();
}
function setMirror(on) {
  G.mirror = on;
  $('#btnMirror').classList.toggle('on', on);
  $('#btnMirror').setAttribute('aria-pressed', on);
  drawBP();
}
$('#btnMirror').addEventListener('click', () => setMirror(!G.mirror));
$('#btnUndo').addEventListener('click', undo);
$('#btnRedo').addEventListener('click', redo);
addEventListener('keydown', e => {
  if (!building() || (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) return;
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
    e.preventDefault();
    redo();
  } else if (!e.ctrlKey && !e.metaKey && e.code === 'KeyM') setMirror(!G.mirror);
});
/* Paint & blueprints */
function renderPaints() {
  $('#paints').innerHTML = PAINTS.map(
    p => `<button style="background:${p}" data-p="${p}" aria-pressed="${G.paint === p}" title="Paint"></button>`
  ).join('');
  $$('#paints button').forEach(b =>
    b.addEventListener('click', () => {
      G.paint = b.dataset.p;
      store('sd.paint', G.paint);
      renderPaints();
      drawBP();
    })
  );
}
function store(k, v) {
  try {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  } catch (e) {}
}
function load(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
}
function renderSlots() {
  $('#slots').innerHTML = [0, 1, 2]
    .map(i => {
      const raw = load('sd.bp' + i);
      let img = '';
      if (raw) {
        try {
          const d = JSON.parse(raw);
          img = `<img alt="" src="${designURL({ base: new Map(d.base), top: new Map(d.top) }, 112, G.paint)}">`;
        } catch (e) {}
      }
      return `<div class="slot">${img || '<span style="height:56px;display:grid;place-items:center">empty</span>'}<span>Slot ${i + 1}</span><div class="row"><button data-s="${i}">Save</button>${raw ? `<button data-l="${i}">Load</button>` : ''}</div></div>`;
    })
    .join('');
  $$('#slots [data-s]').forEach(b =>
    b.addEventListener('click', () => {
      store('sd.bp' + b.dataset.s, { base: [...G.base], top: [...G.top] });
      toast(`Saved to slot ${+b.dataset.s + 1}`, true);
      renderSlots();
    })
  );
  $$('#slots [data-l]').forEach(b => b.addEventListener('click', () => loadBlueprint(+b.dataset.l)));
}
/* ---------- blueprint codes: share a car as text ----------
   Format: "SD1." + base64url(deflate(JSON)) when the browser can compress, otherwise
   "SD1j." + base64url(JSON). The JSON is [[id,rot,x,y]...] for chassis and equipment. */
const b64u = bytes =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
async function pipeBytes(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
function designJSON(base, top) {
  const live = new Set([...top.keys()]);
  const extra = e => {
    const w = (e.w || []).filter(k => live.has(k)),
      o = {};
    if (e.g) o.g = e.g;
    if (e.i) o.i = e.i;
    if (w.length) o.w = w;
    const n = Object.keys(o).length;
    return !n ? null : n === 1 && o.g ? o.g : o; // a bare group number keeps old-style codes short
  };
  const pack = m =>
    [...m.values()].map(e => {
      const x = extra(e);
      return x === null ? [e.id, e.rot, e.x, e.y] : [e.id, e.rot, e.x, e.y, x];
    });
  return JSON.stringify({ b: pack(base), t: pack(top) });
}
async function blueprintCode(base = G.base, top = G.top) {
  const raw = new TextEncoder().encode(designJSON(base, top));
  if (window.CompressionStream) {
    try {
      return 'SD1.' + b64u(await pipeBytes(raw, new CompressionStream('deflate-raw')));
    } catch (e) {}
  }
  return 'SD1j.' + b64u(raw);
}
const okDigit = n => n === undefined || (Number.isInteger(n) && n >= 0 && n <= 9);
const okExtra = x =>
  okDigit(x) ||
  (x &&
    typeof x === 'object' &&
    okDigit(x.g) &&
    okDigit(x.i) &&
    (x.w === undefined || (Array.isArray(x.w) && x.w.length <= 4 && x.w.every(k => /^-?\d+,-?\d+$/.test(k)))));
async function parseBlueprintCode(code) {
  code = String(code || '')
    .trim()
    .replace(/\s+/g, '');
  const m = code.match(/^SD1(j?)\.([A-Za-z0-9_-]+)$/);
  if (!m) throw new Error('That is not a Scrap Duel car code. Codes start with SD1.');
  let bytes = unb64u(m[2]);
  if (!m[1]) {
    if (!window.DecompressionStream) throw new Error('This browser cannot open compressed codes.');
    bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'));
  }
  const d = JSON.parse(new TextDecoder().decode(bytes));
  const ok = e =>
    Array.isArray(e) &&
    MOD[e[0]] &&
    [0, 1, 2, 3].includes(e[1]) &&
    Number.isInteger(e[2]) &&
    Number.isInteger(e[3]) &&
    (e[4] === undefined || okExtra(e[4]));
  if (
    !d ||
    !Array.isArray(d.b) ||
    !Array.isArray(d.t) ||
    !d.b.every(ok) ||
    !d.t.every(ok) ||
    d.b.length + d.t.length > 600
  )
    throw new Error('That code is damaged. Ask for it again.');
  if (!d.b.some(e => e[0] === 'cockpit')) throw new Error('That car has no cockpit.');
  const mk = list =>
    new Map(
      list.map(([id, rot, x, y, x5]) => {
        const e = { id, rot, x, y },
          o = typeof x5 === 'number' ? { g: x5 } : x5 || {};
        if (o.g) e.g = o.g;
        if (o.i) e.i = o.i;
        if (o.w && o.w.length) e.w = [...o.w];
        return [key(x, y), e];
      })
    );
  return { base: mk(d.b), top: mk(d.t) };
}
/** What you still need to build a design: missing parts, their cost, and whether the bay is big enough. */
function blueprintNeeds(d) {
  const need = {};
  for (const [, e] of [...d.base, ...d.top]) need[e.id] = (need[e.id] || 0) + 1;
  const miss = Object.entries(need)
    .map(([id, n]) => [id, n - (G.inv[id] || 0)])
    .filter(([, n]) => n > 0);
  const buyable = miss.every(([id]) => G.found.has(id) || id === 'frame' || id === 'girder');
  const cost = miss.reduce((t, [id, n]) => t + MOD[id].price * n, 0);
  const out = [...d.base.values()]
    .flatMap(e => footprint(e.id, e.rot, e.x, e.y))
    .filter(([x, y]) => !G.ws.has(key(x, y))).length;
  return { miss, buyable, cost, out };
}
function applyBlueprint(d) {
  G.hist.push(designKey());
  G.redo = [];
  G.base = new Map(d.base);
  G.top = new Map(d.top);
  sfx('legend');
  refreshUI();
  drawBP();
}
function openBlueprintDialog(mode) {
  const ov = $('#ovBlueprint'),
    card = $('#bpCard');
  const close = () => {
    ov.hidden = true;
  };
  if (mode === 'share') {
    card.innerHTML = `<h2>Share this car</h2><p class="small">Send this code to a friend. They paste it under Blueprints → Paste a code. It only describes the car; it never gives them your parts.</p>
      <img class="bp-prev" alt="Your car" src="${designURL({ base: G.base, top: G.top }, 220, G.paint, G.style.livery)}">
      <textarea id="bpCode" readonly rows="3">Making code…</textarea>
      <div class="rbtns"><button class="btn" id="bpCopy">Copy code</button><button class="btn ghost" id="bpClose">Close</button></div>`;
    blueprintCode().then(code => {
      $('#bpCode').value = code;
      $('#bpCode').select();
    });
    $('#bpCopy').onclick = async () => {
      const code = $('#bpCode').value;
      try {
        await navigator.clipboard.writeText(code);
        $('#bpCopy').textContent = 'Copied';
      } catch (e) {
        $('#bpCode').select();
        $('#bpCopy').textContent = 'Press Ctrl+C';
      }
      sfx('ui');
    };
  } else {
    card.innerHTML = `<h2>Paste a car code</h2><p class="small">Codes start with SD1. You can build the car if you own the parts and your bay is big enough. Missing parts you have found can be bought in one go.</p>
      <textarea id="bpCode" rows="3" placeholder="SD1.…"></textarea><div id="bpCheck"></div>
      <div class="rbtns"><button class="btn ghost" id="bpClose">Close</button></div>`;
    let timer;
    $('#bpCode').oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const box = $('#bpCheck'),
          code = $('#bpCode').value;
        if (!code.trim()) return (box.innerHTML = '');
        let d;
        try {
          d = await parseBlueprintCode(code);
        } catch (e) {
          box.innerHTML = `<p class="ac-msg">${esc(e.message)}</p>`;
          return;
        }
        const n = blueprintNeeds(d);
        const missHTML = n.miss.length
          ? `<p class="small">Missing: ${n.miss.map(([id, k]) => `${k}× ${esc(MOD[id].name)}`).join(', ')}</p>`
          : '<p class="small" style="color:var(--ok)">You own every part.</p>';
        box.innerHTML = `<img class="bp-prev" alt="Shared car" src="${designURL(d, 220, G.paint, G.style.livery)}">${missHTML}${n.out ? `<p class="ac-msg">Your bay is too small: ${n.out} cells fall outside. Buy a bay expansion first.</p>` : ''}
          <div class="rbtns">${!n.miss.length && !n.out ? '<button class="btn" id="bpBuild">Build this car</button>' : ''}${n.miss.length && n.buyable && !n.out ? `<button class="btn" id="bpBuy" ${G.coins < n.cost ? 'disabled' : ''}>Buy missing and build · ${n.cost}</button>` : ''}</div>`;
        const bb = $('#bpBuild');
        if (bb)
          bb.onclick = () => {
            applyBlueprint(d);
            toast('Car built from the code. Ctrl+Z brings your old car back.', true);
            close();
          };
        const by = $('#bpBuy');
        if (by)
          by.onclick = () => {
            if (G.coins < n.cost) return;
            addCoins(-n.cost);
            for (const [id, k] of n.miss) G.inv[id] = (G.inv[id] || 0) + k;
            applyBlueprint(d);
            toast(`Bought ${n.miss.reduce((t, [, k]) => t + k, 0)} parts and built the car.`, true);
            close();
          };
      }, 200);
    };
    setTimeout(() => $('#bpCode').focus(), 30);
  }
  $('#bpClose').onclick = close;
  ov.hidden = false;
}
$('#bpShare').onclick = () => building() && openBlueprintDialog('share');
$('#bpImport').onclick = () => building() && openBlueprintDialog('import');
function loadBlueprint(i) {
  if (!building()) return;
  let d;
  try {
    d = JSON.parse(load('sd.bp' + i));
  } catch (e) {
    return;
  }
  const need = {};
  for (const [, e] of [...d.base, ...d.top]) need[e.id] = (need[e.id] || 0) + 1;
  const miss = Object.entries(need)
    .filter(([id, n]) => (G.inv[id] || 0) < n)
    .map(([id, n]) => `${n - (G.inv[id] || 0)}× ${MOD[id].name}`);
  const out = [...d.base].flatMap(([, e]) => footprint(e.id, e.rot, e.x, e.y)).filter(([x, y]) => !G.ws.has(key(x, y)));
  if (miss.length) {
    toast('Missing: ' + miss.slice(0, 3).join(', '));
    return;
  }
  if (out.length) {
    toast('Your bay is too small for that blueprint');
    return;
  }
  G.hist.push(designKey());
  G.base = new Map(d.base);
  G.top = new Map(d.top);
  toast('Blueprint loaded', true);
  refreshUI();
}
function cellAt(ev) {
  if (!dims) return null;
  const r = bp.getBoundingClientRect(),
    x = Math.floor((ev.clientX - r.left) / cell) + dims.x0,
    y = Math.floor((ev.clientY - r.top) / cell) + dims.y0;
  return x >= dims.x0 && x <= dims.x1 && y >= dims.y0 && y <= dims.y1 ? [x, y] : null;
}
bp.addEventListener('pointerdown', ev => {
  if (!building()) return;
  const c = cellAt(ev);
  if (!c) return;
  ev.preventDefault();
  bp.setPointerCapture(ev.pointerId);
  dragMode =
    ev.button === 2
      ? G.tool === 'keys'
        ? 'keysBack'
        : 'remove'
      : G.tool === 'keys' && ev.shiftKey
        ? 'keysIn'
        : G.tool;
  lastK = key(...c);
  act(c[0], c[1], dragMode);
});
bp.addEventListener('pointermove', ev => {
  const c = cellAt(ev),
    k = c ? key(...c) : null;
  if (k !== (hover ? key(...hover) : null)) {
    hover = c;
    $('#bayHint').textContent = hintFor();
    drawBP();
  }
  if (dragMode && c && k !== lastK && !['rotate', 'keys', 'keysBack', 'keysIn', 'wire'].includes(dragMode)) {
    lastK = k;
    act(c[0], c[1], dragMode);
  }
});
const endDrag = () => {
  dragMode = null;
  lastK = null;
};
bp.addEventListener('pointerup', endDrag);
bp.addEventListener('pointercancel', endDrag);
bp.addEventListener('pointerleave', () => {
  if (!dragMode) {
    hover = null;
    $('#bayHint').textContent = hintFor();
    drawBP();
  }
});
bp.addEventListener('contextmenu', e => e.preventDefault());
function setTool(t) {
  G.tool = t;
  $$('.toolbar [data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === t));
  $('#bayHint').textContent = hintFor();
  drawBP();
}
$$('.toolbar [data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
function turnBrush(d) {
  G.rot = (G.rot + d + 4) % 4;
  $('#rotIcon').style.transform = `rotate(${G.rot * 90}deg)`;
  drawBP();
  renderInspect();
}
$('#btnRot').addEventListener('click', () => turnBrush(1));

/* =================== LEFT PANEL: BIN & SHOP =================== */
$('#tabBin').addEventListener('click', () => {
  G.leftTab = 'bin';
  renderLeft();
});
$('#tabShop').addEventListener('click', () => {
  G.leftTab = 'shop';
  renderLeft();
});
function renderLeft() {
  $('#tabBin').setAttribute('aria-pressed', G.leftTab === 'bin');
  $('#tabShop').setAttribute('aria-pressed', G.leftTab === 'shop');
  G.leftTab === 'bin' ? renderBin() : renderShop();
}
function mountCompatible(m) {
  if (m.layer === 'b') return true;
  const occ = occupancy(G.base),
    tops = occupancy(G.top);
  if (!m.plan || cellCount(m) === 1) return [...G.base.values()].some(e => MOD[e.id].mnt >= m.mnt);
  return [...G.ws].some(k => {
    const [x, y] = unkey(k);
    return [0, 1, 2, 3].some(r =>
      footprint(m.id, r, x, y).every(([a, b]) => {
        const k = key(a, b),
          e = baseAt(k, occ);
        return e && MOD[e.id].mnt >= m.mnt && !tops.has(k);
      })
    );
  });
}
function catalogMatches(m, q = G.catalogQ) {
  return (
    (!q ||
      (m.name + ' ' + m.desc + ' ' + m.tags.map(t => TAGS[t]).join(' ')).toLowerCase().includes(q.toLowerCase())) &&
    (G.catalogRarity === 'all' || m.rar === +G.catalogRarity) &&
    (!G.favoritesOnly || G.favorites.has(m.id)) &&
    (!G.compatibleOnly || mountCompatible(m))
  );
}
function catalogFilters(prefix, q) {
  return `<div class="catalog-filters"><input type="search" id="${prefix}Search" aria-label="Search modules" placeholder="Search modules or branches…" value="${esc(q)}">
    <select id="${prefix}Rarity" aria-label="Module rarity"><option value="all">All rarities</option>${RAR.map((r, i) => `<option value="${i}" ${G.catalogRarity === String(i) ? 'selected' : ''}>${r.name}</option>`).join('')}</select>
    <label><input type="checkbox" id="${prefix}Fav" ${G.favoritesOnly ? 'checked' : ''}>Favorites</label>
    <label style="grid-column:1/-1"><input type="checkbox" id="${prefix}Compatible" ${G.compatibleOnly ? 'checked' : ''}>Compatible with current mounts</label></div>`;
}
function bindCatalog(prefix, render, codex = false) {
  const input = $('#' + prefix + 'Search');
  input.addEventListener('input', () => {
    const at = input.selectionStart,
      value = input.value;
    if (codex) codexQ = value;
    else G.catalogQ = value;
    render();
    const next = $('#' + prefix + 'Search');
    next.focus();
    if (at !== null) next.setSelectionRange(at, at);
  });
  for (const [suffix, state] of [
    ['Rarity', 'catalogRarity'],
    ['Fav', 'favoritesOnly'],
    ['Compatible', 'compatibleOnly']
  ])
    $('#' + prefix + suffix).addEventListener('change', e => {
      G[state] = suffix === 'Rarity' ? e.target.value : e.target.checked;
      render();
    });
}
function toggleFavorite(id) {
  G.favorites.has(id) ? G.favorites.delete(id) : G.favorites.add(id);
  store('sd.favorites', [...G.favorites]);
}
function draftSupportCount(id, n, P = G) {
  const m = MOD[id];
  if (m.layer !== 't') return 0;
  if (m.plan && cellCount(m) > 1) {
    const sid = m.mnt > 1 ? 'girder' : 'frame',
      used = [...(P.base || new Map()).values()].filter(e => e.id === sid).length;
    return Math.max(0, n * cellCount(m) - Math.max(0, (P.inv[sid] || 0) - used));
  }
  let available = 0;
  const used = {};
  for (const e of [...(P.base || new Map()).values(), ...(P.top || new Map()).values()])
    used[e.id] = (used[e.id] || 0) + 1;
  for (const [k, e] of P.base || new Map())
    if (MOD[e.id].mnt >= m.mnt)
      for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) if (!topAt(key(x, y), P.top || new Map())) available++;
  for (const [part, count] of Object.entries(P.inv))
    if (MOD[part].layer === 'b' && MOD[part].mnt >= m.mnt)
      available += Math.max(0, count - (used[part] || 0)) * (MOD[part].size || 1);
  return Math.max(0, n * cellCount(m) - available);
}
function gainWithSupport(id, n) {
  const support = draftSupportCount(id, n);
  if (MOD[id].plan && cellCount(MOD[id]) > 1) {
    const b = shapeBounds(MOD[id]),
      maxX = Math.max(...[...G.ws].map(k => unkey(k)[0]));
    for (let x = maxX; x <= maxX + b.w * n + 1; x++)
      for (let y = -Math.max(3, b.h); y <= Math.max(3, b.h); y++) G.ws.add(key(x, y));
  }
  gain(id, n);
  if (support) {
    const sid = MOD[id].mnt > 1 ? 'girder' : 'frame';
    gain(sid, support);
    toast(`Included ${support} ${MOD[sid].name}${support > 1 ? 's' : ''} to mount ${MOD[id].name}.`, true);
  }
}

function renderBin() {
  const ids = MODS.filter(
    m => m.id !== 'cockpit' && (G.inv[m.id] || 0) > 0 && (G.binCat === 'all' || m.cat === G.binCat) && catalogMatches(m)
  ).sort((a, b) => CATS.findIndex(c => c.id === a.cat) - CATS.findIndex(c => c.id === b.cat) || a.rar - b.rar);
  let loose = 0;
  for (const id in G.inv) if (id !== 'cockpit') loose += Math.max(0, left(id));
  $('#binCount').textContent = `${loose} available`;
  $('#leftBody').innerHTML =
    `${catalogFilters('bin', G.catalogQ)}<div class="chips">${[{ id: 'all', name: 'All' }, ...CATS].map(c => `<button class="chip" data-cat="${c.id}" aria-pressed="${G.binCat === c.id}">${c.name}</button>`).join('')}</div>
   <div class="bin">${
     ids
       .map(m => {
         const l = left(m.id);
         return `<div class="tilewrap"><button class="tile r${m.rar}${l <= 0 ? ' empty' : ''}" style="--rc:${RAR[m.rar].col}" data-id="${m.id}" aria-pressed="${G.sel === m.id}" title="${esc(m.name)} · ${l} available to place"><span class="ly ${m.layer === 't' ? 'top' : 'base'}" title="${m.layer === 't' ? 'Equipment: needs a ' + SOCKET[m.mnt] + ' ' + MOUNTNAME[m.mnt] : 'Chassis block'}">${m.layer === 't' ? SOCKET[m.mnt] : '▦'}</span><img alt="" src="${iconURL(m.id)}"><span class="n">${esc(m.name)}</span><span class="q${l <= 0 ? ' zero' : ''}" aria-label="${l} available to place">${l > 0 ? '×' + l : 'On car'}</span><i class="rb"></i></button><button class="favorite" data-fav="${m.id}" aria-label="Favorite ${esc(m.name)}" aria-pressed="${G.favorites.has(m.id)}">${G.favorites.has(m.id) ? '★' : '☆'}</button></div>`;
       })
       .join('') || '<p class="small" style="grid-column:1/-1">Nothing here yet.</p>'
   }</div>
   <div class="build-legend" aria-label="How building works">
     <div><i class="lg-chassis"></i><span><b>Chassis</b> blocks connect to your cockpit.</span></div>
     <div><i class="lg-sock">○</i><span>Frames, armor and the cockpit give a <b>light</b> socket.</span></div>
     <div><i class="lg-sock heavy">⬢</i><span>Girders, junctions and rings give a <b>heavy</b> socket.</span></div>
     <div><i class="lg-equip"></i><span><b>Equipment</b> sits on a free socket that is strong enough.</span></div>
   </div>`;
  bindCatalog('bin', renderBin);
  $$('#leftBody [data-fav]').forEach(b =>
    b.addEventListener('click', () => {
      toggleFavorite(b.dataset.fav);
      renderBin();
    })
  );
  $$('#leftBody .chip').forEach(b =>
    b.addEventListener('click', () => {
      G.binCat = b.dataset.cat;
      renderBin();
    })
  );
  $$('#leftBody .tile').forEach(b =>
    b.addEventListener('click', () => {
      G.sel = b.dataset.id;
      setTool('place');
      renderBin();
      renderInspect();
    })
  );
}
const CRATE_COST = 60;
function shapePrice(n) {
  return Math.max(30, n * 9);
}
function shapeCells(sh, ws = G.ws) {
  const out = new Set();
  for (const [x, y] of sh.gen(ws)) {
    if (Math.abs(x) <= WS_BOUND.x && Math.abs(y) <= WS_BOUND.y && !ws.has(key(x, y))) out.add(key(x, y));
  }
  return out;
}
function shapeURL(cells) {
  const all = new Set([...G.ws, ...cells]),
    b = bbox(all),
    cw = Math.min(12, 140 / (b.x1 - b.x0 + 1), 100 / (b.y1 - b.y0 + 1)),
    W = (b.x1 - b.x0 + 1) * cw,
    H = (b.y1 - b.y0 + 1) * cw;
  const cv = document.createElement('canvas');
  cv.width = W * 2;
  cv.height = H * 2;
  const c = cv.getContext('2d');
  c.scale(2, 2);
  for (const k of all) {
    const [x, y] = unkey(k);
    rr(c, (x - b.x0) * cw + 1, (y - b.y0) * cw + 1, cw - 2, cw - 2, 2);
    c.fillStyle = cells.has(k) ? '#f2b705' : x === 0 && y === 0 ? '#ece8df' : '#4d7ea8';
    c.fill();
  }
  return cv.toDataURL();
}
function renderShop() {
  $('#binCount').innerHTML = `<span class="coin">${G.coins}</span>`;
  const shapes = SHAPES.map(s => ({ s, cells: shapeCells(s) })).filter(x => x.cells.size);
  const owned = MODS.filter(
    m =>
      m.id !== 'cockpit' &&
      (G.found.has(m.id) || m.id === 'girder' || m.id === 'frame') &&
      (G.binCat === 'all' || m.cat === G.binCat) &&
      catalogMatches(m)
  ).sort((a, b) => a.rar - b.rar || a.price - b.price);
  $('#leftBody').innerHTML = `
   <div class="gamble-shop">
     <div class="gs crate-card"><img alt="" src="${crateURL()}"><div><b>Scrap Crate</b><span class="small">Mostly common parts. One in a hundred hits the golden jackpot.</span>
       <div class="odds">${CRATE_W.map((w, i) => (w ? `<span style="color:${RAR[i].col}">${RAR[i].name[0]} ${w}%</span>` : '')).join('')}<span class="jp">★ 1% jackpot</span></div>
       <button class="btn" id="bCrate" ${G.coins < CRATE_COST ? 'disabled' : ''}>Open · ${CRATE_COST}</button></div></div>
     <div class="gs wheel-card"><img alt="" src="${wheelURL()}"><div><b>Prize Wheel</b><span class="small">Every slice is Rare or better, with a thin Legendary slice and a tiny MEGA.</span>
       <button class="btn" id="bWheel" ${G.coins < WHEEL_COST ? 'disabled' : ''}>Spin · ${WHEEL_COST}</button></div></div>
   </div>
   <div class="shopsec"><span class="label">Bay expansions</span>${
     shapes.length
       ? shapes
           .map(({ s, cells }) => {
             const p = shapePrice(cells.size);
             return `<div class="srow"><img alt="" src="${shapeURL(cells)}"><div><div class="nm">${esc(s.name)}</div><div class="ds">+${cells.size} cells. ${esc(s.desc)}</div></div><button class="buy" data-shape="${s.id}" ${G.coins < p ? 'disabled' : ''}><span class="coin">${p}</span></button></div>`;
           })
           .join('')
       : '<p class="small">The bay is at its maximum size.</p>'
   }</div>
   <div class="shopsec"><span class="label">Find parts</span>${catalogFilters('shop', G.catalogQ)}<select id="shopCategory" aria-label="Shop category"><option value="all">All categories</option>${CATS.map(c => `<option value="${c.id}" ${G.binCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select><span class="label">Restock parts you’ve found · ${owned.length}</span>${owned.map(m => `<div class="srow"><img alt="" src="${iconURL(m.id)}"><div><div class="nm" style="color:${RAR[m.rar].col}">${esc(m.name)}</div><div class="ds">${footprintHTML(m)} ${shapeLabel(m)} · ${m.mass} t</div><div class="ds">${esc(mountLine(m))}</div><div class="ds">${left(m.id)} available · sells for ${Math.floor(m.price / 2)}</div></div><button class="buy" aria-label="Buy ${esc(m.name)} for ${m.price} coins" data-buy="${m.id}" ${G.coins < m.price ? 'disabled' : ''}><span class="coin">${m.price}</span></button></div>`).join('') || '<p class="small">No discovered parts match these filters.</p>'}</div>`;
  bindCatalog('shop', renderShop);
  $('#shopCategory').onchange = e => {
    G.binCat = e.target.value;
    renderShop();
  };
  $('#bCrate').addEventListener('click', openCrate);
  $('#bWheel').addEventListener('click', spinWheel);
  $$('#leftBody [data-shape]').forEach(b =>
    b.addEventListener('click', () => {
      const s = SHAPES.find(x => x.id === b.dataset.shape),
        cells = shapeCells(s),
        p = shapePrice(cells.size);
      if (G.coins < p) return;
      addCoins(-p);
      for (const k of cells) G.ws.add(k);
      toast(`${s.name} welded on: +${cells.size} cells`, true);
      sizeBP();
      refreshUI();
    })
  );
  $$('#leftBody [data-buy]').forEach(b => b.addEventListener('click', () => buy(b.dataset.buy)));
}
function buy(id) {
  const m = MOD[id];
  if (G.coins < m.price) return;
  addCoins(-m.price);
  gain(id, 1);
  toast(`Bought 1 ${m.name}`, true);
  refreshUI();
}
function sell(id) {
  if (left(id) <= 0) return;
  G.inv[id]--;
  addCoins(Math.floor(MOD[id].price / 2));
  toast(`Sold 1 ${MOD[id].name}`, true);
  refreshUI();
}

/* =================== INSPECTOR =================== */
function renderInspect() {
  const m = MOD[G.sel],
    col = RAR[m.rar].col;
  $('#inspect').innerHTML =
    `<div class="art" style="--rc:${col}"><img alt="" src="${iconURL(m.id)}"></div><div><span class="tag" style="color:${col}">${RAR[m.rar].name} · ${CATNAME[m.cat]}</span><h4>${esc(m.name)}</h4><p>${esc(m.desc)}</p><p class="con">− ${esc(m.con)}</p>
   <div class="tags">${socketBadge(m)}${cellCount(m) > 1 ? footprintHTML(m) : ''}${m.tags.map(t => `<span class="btag">${TAGS[t]}</span>`).join('')}${m.dir ? `<span class="btag" title="Next placement faces this way (R)">${'▲▶▼◀'[G.rot]}</span>` : ''}</div></div>
   <div class="stl">${statChips(m)}</div>
   <div class="trade"><span class="small">${left(m.id)} available · worth <span class="coin">${m.price}</span></span><span class="grow"></span>${G.found.has(m.id) && m.id !== 'cockpit' ? `<button class="buy" id="iBuy" ${G.coins < m.price ? 'disabled' : ''}>Buy +1</button><button class="buy" id="iSell" ${left(m.id) <= 0 ? 'disabled' : ''}>Sell 1 · ${Math.floor(m.price / 2)}</button>` : ''}</div>`;
  const ib = $('#iBuy');
  if (ib) ib.addEventListener('click', () => buy(m.id));
  const is = $('#iSell');
  if (is) is.addEventListener('click', () => sell(m.id));
}
const setMeter = (id, v) => {
  $(id).style.width = clamp(v * 100, 0, 100) + '%';
};
function designItems() {
  const items = [];
  for (const e of G.base.values()) {
    const m = MOD[e.id],
      [x, y] = instCenter(e);
    items.push({ m, x, y, mass: m.mass + (e.id === 'lance' && T('tungsten') ? 2 : 0) });
  }
  for (const e of G.top.values()) items.push({ m: MOD[e.id], x: e.x, y: e.y, mass: MOD[e.id].mass });
  return items;
}
function refreshUI() {
  const items = designItems(),
    C = calc(items),
    aura = auraOf(items.map(i => i.m.id));
  let hp = 0,
    dps = 0;
  for (const it of items) {
    hp += it.m.hp;
    dps += dpsOf(it.m.id, aura);
  }
  $('#sHp').textContent = Math.round(hp) + ' HP';
  setMeter('#mHp', hp / 6000);
  $('#sMass').textContent = C.mass.toFixed(1) + ' t';
  $('#sSpeed').textContent = Math.round(C.top * 0.4) + ' km/h';
  setMeter('#mSpeed', C.top / 300);
  $('#sTurn').textContent = Math.round(C.turnR * 57.3) + '°/s';
  setMeter('#mTurn', C.turnR / 3.2);
  $('#sDps').textContent = Math.round(dps) + ' dps';
  setMeter('#mDps', dps / 500);
  const w = [];
  if (!items.some(i => i.m.drive)) w.push('Nothing to drive with. Add wheels or tracks.');
  else if (C.g < 3.5 && !C.hoverMode) w.push('Weak grip. Add more wheels.');
  if (C.p && C.top < 120) w.push('Very slow. Too much weight for your drive.');
  for (const [ly, k, by] of blockedList()) {
    const e = ly === 'b' ? G.base.get(k) : topAt(k);
    w.push(`${MOD[e.id].name} faces into ${MOD[by].name} and can’t work.`);
  }
  if (
    !items.some(
      i =>
        i.m.wpn ||
        i.m.mel ||
        i.m.lance ||
        i.m.piston ||
        i.m.ball ||
        i.m.flipper ||
        i.m.catapult ||
        i.m.drones ||
        i.m.ram
    )
  )
    w.push('No way to deal damage yet.');
  $('#warns').innerHTML = w.length
    ? w.map(x => `<span>${esc(x)}</span>`).join('')
    : '<span class="ok-note">Road-legal. Mostly.</span>';
  const br = Object.entries(G.aff)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  $('#branches').innerHTML = br.length
    ? br
        .map(
          ([t, v]) =>
            `<div class="br"><span>${TAGS[t]}</span><span class="p">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>`
        )
        .join('')
    : '<span class="small">Draft modules to start branches. Branches make related parts show up more.</span>';
  renderSynergy();
  $('#perks').innerHTML = G.tune.size
    ? [...G.tune]
        .map(
          id =>
            `<span class="perk" title="${esc(TUNEMAP[id].pro + '. ' + TUNEMAP[id].con)}">${esc(TUNEMAP[id].name)}</span>`
        )
        .join('')
    : '<span class="small">None yet.</span>';
  renderLeft();
  renderInspect();
  renderPaints();
  renderSlots();
  updateHUD();
  $('#bayHint').textContent = hintFor();
  drawBP();
}
$('#btnClear').addEventListener('click', () => {
  if (!building()) return;
  G.hist.push(designKey());
  for (const [k, e] of G.base) if (e.id !== 'cockpit') fxRemove(e.x, e.y, e.id, e.rot);
  G.base = new Map([[key(0, 0), G.base.get(key(0, 0))]]);
  G.top = new Map();
  refreshUI();
});
$('#btnReady').addEventListener('click', () => {
  if (building()) readyCheck();
});
function updateHUD() {
  if (G.run) return updateRunHUD();
  $('#tRoundLbl').textContent = G.mode === 'sandbox' ? 'Sandbox' : `Round ${Math.min(G.round, ROUNDS)} of ${ROUNDS}`;
  $('#segs').innerHTML =
    G.mode === 'sandbox'
      ? ''
      : Array.from({ length: ROUNDS }, (_, i) => {
          const r = G.log[i];
          const sp = specialOf(i + 1),
            S = sp && SPECIALS[sp];
          return `<i class="${r ? (r.win ? 'w' : r.draw ? 'd' : 'l') : i + 1 === G.round ? 'now' : ''}${S ? ' sp' : ''}"${S ? ` style="--sc:${S.col}" title="Round ${i + 1}: ${esc(S.name)}"` : ''}>${S ? S.icon : ''}</i>`;
        }).join('');
  $('#tCoins').textContent = G.coins;
  const sb = G.mode === 'sandbox';
  $('#tScore').innerHTML = sb
    ? '<span class="small">Sandbox</span>'
    : `${badgeHTML(G.style.badge, 18)}<span class="sw" style="background:${G.paint}"></span><span class="me">${G.score[0]}</span>–<span class="op">${G.score[1]}</span><span class="sw" style="background:${G.oppPaint}"></span>${badgeHTML(G.oppBadge, 18)}`;
  $('#tScoreLbl').textContent = sb ? 'Mode' : `You vs ${G.oppName}`;
  $('#tStake').textContent = sb ? '' : `Round ${Math.min(G.round, ROUNDS)} · ${stakeLine(G.round)}`;
  $('#tStake').hidden = sb;
  $('#formatStatus').textContent =
    G.format === 'lives' ? `♥ ${G.lives[0]} – ${G.lives[1]}` : MATCH_FORMATS[G.format || 'balanced'].name;
  $('#formatStatus').hidden = !G.started || (G.format || 'balanced') === 'balanced';
  $('#tParts').textContent = G.base.size + G.top.size;
  $('#tFound').textContent = `${G.found.size} / ${MODS.length}`;
  const p = $('#tPhase');
  p.className = 'pill ' + ({ build: 'build', battle: 'battle', wait: 'wait', draft: 'draft' }[G.phase] || '');
  p.textContent =
    {
      build: 'Build',
      battle: 'Battle',
      wait: 'Waiting arena',
      draft: 'Draft',
      result: 'Repair bay',
      final: 'Run over',
      intro: 'Setup'
    }[G.phase] || '';
}

/** Lists every branch on the current design with its progress toward the 3- and 5-part bonuses. */
function footprintHTML(m) {
  const b = shapeBounds(m),
    cs = moduleCells(m),
    minX = Math.min(...cs.map(c => c[0])),
    minY = Math.min(...cs.map(c => c[1])),
    set = new Set(cs.map(c => key(...c)));
  let h = '';
  for (let y = minY; y < minY + b.h; y++)
    for (let x = minX; x < minX + b.w; x++) h += `<i class="${set.has(key(x, y)) ? 'filled' : ''}"></i>`;
  return `<span class="shape-preview" role="img" aria-label="${esc(shapeLabel(m))}" style="grid-template-columns:repeat(${b.w},7px)">${h}</span>`;
}
function fittingBranch(t) {
  const occ = occupancy(G.base),
    tops = occupancy(G.top),
    ws = [...G.ws].map(unkey),
    out = [];
  for (const m of MODS) {
    if (m.id === 'cockpit' || !m.tags.includes(t) || cellCount(m) > 3 || m.price > G.coins) continue;
    if (
      ws.some(([x, y]) =>
        [0, 1, 2, 3].some(r => {
          const cells = footprint(m.id, r, x, y);
          return (
            cells.every(([a, b]) => {
              const k = key(a, b),
                e = baseAt(k, occ);
              return m.layer === 't' ? e && MOD[e.id].mnt >= m.mnt && !tops.has(k) : G.ws.has(k) && !occ.has(k);
            }) && touchesDesign(cells, occ)
          );
        })
      )
    )
      out.push(m);
    if (out.length === 2) break;
  }
  return out;
}
function planShapeFill(c, m, s) {
  const b = shapeBounds(m);
  for (const [x, y] of moduleCells(m)) c.fillRect((x - b.cx - 0.5) * s, (y - b.cy - 0.5) * s, s, s);
}
const reportPart = k => {
  const [layer, anchor] = k.includes('|') ? k.split('|') : ['b', k];
  return (layer === 't' ? G.top : G.base).get(anchor);
};
function planGarageReport(c) {
  const report = G.reviewReport;
  if (!report || G.phase !== 'review') return;
  const max = Math.max(1, ...Object.values(report.damage || {}));
  for (const [k, n] of Object.entries(report.damage || {})) {
    const e = reportPart(k);
    if (!e) continue;
    for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) {
      c.fillStyle = `rgba(255,92,70,${0.15 + (0.55 * n) / max})`;
      c.fillRect(cpx(x) + 2, cpy(y) + 2, cell - 4, cell - 4);
    }
  }
  const e = G.reviewFocus && reportPart(G.reviewFocus);
  if (e) {
    c.strokeStyle = '#fff2a0';
    c.lineWidth = 3;
    for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) c.strokeRect(cpx(x) + 1, cpy(y) + 1, cell - 2, cell - 2);
  }
}
/* The round report shows the damage map right away: your car with red heat where hits landed,
   a white outline on the first part that broke and amber on any blocked weapon, plus one tip. */
function reviewHTML(st) {
  const first = st.first,
    damage = Object.entries(st.damage || {}).sort((a, b) => b[1] - a[1])[0],
    blocked = (st.blocked || [])[0];
  const max = Math.max(1, ...Object.values(st.damage || {}));
  let img = '';
  try {
    img = designURL({ base: G.base, top: G.top }, 260, G.paint, null, (c, ox, oy, cs) => {
      const cellsOf = e => footprint(e.id, e.rot, e.x, e.y);
      for (const [k, n] of Object.entries(st.damage || {})) {
        const e = reportPart(k);
        if (!e) continue;
        for (const [x, y] of cellsOf(e)) {
          c.fillStyle = `rgba(255,72,60,${0.18 + (0.6 * n) / max})`;
          c.fillRect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2);
        }
      }
      const ring = (k, col) => {
        const e = k && reportPart(k);
        if (!e) return;
        c.strokeStyle = col;
        c.lineWidth = Math.max(2, cs * 0.09);
        for (const [x, y] of cellsOf(e)) c.strokeRect(ox + x * cs + 1.5, oy + y * cs + 1.5, cs - 3, cs - 3);
      };
      if (blocked) ring(blocked.layer + '|' + blocked.k, '#ffb423');
      if (first) ring(first.layer + '|' + first.k, '#ffffff');
    });
  } catch (e) {}
  const rows = [];
  if (first) rows.push(['first', `<b>${esc(MOD[first.id]?.name || first.id)}</b> broke first`]);
  if (damage) {
    const e = reportPart(damage[0]);
    rows.push([
      'heat',
      `<b>${e ? esc(MOD[e.id].name) : 'A connection'}</b> took the most damage (${Math.round(damage[1])})`
    ]);
  }
  if (blocked)
    rows.push(['block', `<b>${esc(MOD[blocked.id]?.name || '')}</b> could not fire: something sits in front of it`]);
  const fid = first && first.id,
    tip = blocked
      ? 'Turn blocked weapons so they face out, or move what sits in front of them.'
      : fid === 'cockpit'
        ? 'Your cockpit was hit directly. Put armor on the side the hits came from.'
        : fid && ['frame', 'mesh', 'girder', 'junction', 'shackle'].includes(fid)
          ? 'A connection broke and parts fell off. Add a second path to the cockpit, or armor that block.'
          : damage
            ? 'Armor the red side first: that is where your rival aims.'
            : 'Nothing broke. Spend coins on firepower next.';
  return `<div class="build-report"><b>What happened to your car</b><div class="rep-grid">${img ? `<img class="rep-map" src="${img}" alt="Damage map of your car">` : ''}<div class="rep-list">${rows.map(([k, t]) => `<p class="rep ${k}">${t}</p>`).join('')}<p class="rep tip">${esc(tip)}</p><button class="btn ghost rep-open" data-review="">Inspect in the garage</button></div></div></div>`;
}
function openGarageReport(st, k) {
  G.reviewReport = st;
  G.reviewFocus = k;
  G.phase = 'review';
  $('#ovResult').hidden = true;
  $('#build').hidden = false;
  document.body.classList.add('reviewing');
  $('#reviewBack').onclick = closeGarageReport;
  $('#reviewBack').hidden = false;
  sizeBP();
  drawBP();
}
function closeGarageReport() {
  G.phase = 'result';
  G.reviewReport = null;
  document.body.classList.remove('reviewing');
  $('#reviewBack').hidden = true;
  $('#ovResult').hidden = false;
}
function planAmbient(c) {
  if (SETTINGS.motion === false || REDUCED.on) return;
  c.save();
  c.strokeStyle = '#7fe0ff';
  c.lineWidth = 2;
  for (const x of [WM * 0.5, AW - WM * 0.5]) {
    const y = AH / 2;
    c.save();
    c.translate(x, y);
    c.rotate(ANIM * 0.8);
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(10, -18);
      c.lineTo(18, -6);
      c.closePath();
      c.stroke();
    }
    c.restore();
  }
  for (let i = 0; i < 7; i++) {
    c.globalAlpha = 0.12 + 0.12 * Math.sin(ANIM * 1.2 + i);
    circ(c, WM + (i * (AW - 2 * WM)) / 6, WM * 0.45, 7, '#f2b705');
  }
  c.restore();
}
function planPortrait(c, v, x, y) {
  c.save();
  c.translate(x, y);
  circ(c, 0, 0, 11, '#172332', v.paint, 2);
  c.fillStyle = v.paint;
  c.fillRect(-6, -5, 12, 9);
  c.fillStyle = '#d9f4ff';
  c.fillRect(-4, -4, 8, 3);
  c.fillStyle = '#fff';
  c.fillRect(-4, 2, 2, 2);
  c.fillRect(2, 2, 2, 2);
  c.restore();
}

function renderSynergy() {
  const ids = [...G.base.values(), ...G.top.values()].map(e => e.id);
  const { counts, tier } = synergyOf(ids);
  if (G.synRound !== G.round) {
    G.synRound = G.round;
    G.synPrevious = { ...tier };
  } else if (building()) {
    const gained = Object.keys(tier).find(t => tier[t] > (G.synPrevious?.[t] || 0));
    if (gained) {
      toast(`${TAGS[gained]} bonus unlocked: ${SYNERGY[gained].t[tier[gained] - 1]}`, true);
      sfx('power');
    }
    G.synPrevious = { ...tier };
  }
  const rows = Object.entries(counts)
    .filter(([t]) => SYNERGY[t])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  $('#synergy').innerHTML = rows.length
    ? rows
        .map(([t, n]) => {
          const lvl = tier[t] || 0,
            next = SYN_TIERS[lvl];
          const fits = fittingBranch(t);
          const text =
            (lvl ? SYNERGY[t].t[lvl - 1] : 'No bonus yet') +
            (next ? ` · ${next - n} more → ${SYNERGY[t].t[lvl]}` : ' · Complete');
          return `<div class="syn${lvl ? ' on' : ''}" title="${esc(SYNERGY[t].t.map((x, i) => SYN_TIERS[i] + ' parts: ' + x).join(' · '))}"><span class="sn">${TAGS[t]}</span><span class="sc">${n}${next ? '/' + next : ''}</span><span class="st">${esc(text)}</span><progress max="5" value="${Math.min(5, n)}" aria-label="${TAGS[t]} synergy: ${n} parts"></progress>${next && fits.length ? `<span class="syn-fit">Fits your bay: ${fits.map(m => `${esc(m.name)} (${shapeLabel(m)})`).join(' · ')}</span>` : ''}</div>`;
        })
        .join('')
    : '<span class="small">Put 3 parts of the same branch on your car to unlock a bonus.</span>';
}
