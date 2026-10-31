// ---------- procedural island ----------
// Two RGBA8 maps, one texel per world unit, shared by the GPU renderer and the CPU game logic:
//   H (linear):  R rock height (/255*6.4)  G water depth  B tree density  A elevation
//   B (nearest): R building height (/255*6.4)  G material  B variant  A unused
const N = 320;
const HSCALE = 6.4;
const M = { GRASS: 0, FOREST: 1, ROAD: 2, SAND: 3, WATER: 4, ROCK: 5, RUIN: 6, HOUSE: 7, PLAZA: 8, MEADOW: 9, FIELD: 10, BRIDGE: 11, RUINFLOOR: 12, POST: 13 };
const TG = 2.5; // tree grid
const VILLAGE_NAMES = ['Wilgenhoek', 'Asveld', 'Maanbroek', 'Heidegrond', 'Riethaven', 'Duinlo', 'Kraaienest', 'Lindehof'];
const RUIN_NAMES = ['Grafwacht', 'Oude Toren', 'Stille Hal', 'Mosgewelf', 'Klokkenput', 'Wolfsbaan'];

let W = null;

function genWorld(seed) {
  const t0 = performance.now();
  const R = mulberry(seed * 9301 + 49297);
  const h = new Uint8Array(N * N * 4), b = new Uint8Array(N * N * 4);
  const elev = new Float32Array(N * N), moist = new Float32Array(N * N);
  const idx = (x, y) => y * N + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

  // elevation: fbm + island falloff, then remapped by percentile so every seed has similar land/rock share
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const nx = x / N - 0.5, ny = y / N - 0.5, d = Math.hypot(nx, ny) * 2;
      let e = fbm(x * 0.0105, y * 0.0105, seed, 5) + (fbm(x * 0.045, y * 0.045, seed + 7, 3) - 0.5) * 0.12;
      e -= Math.pow(d, 2.4) * 0.7;
      elev[idx(x, y)] = e;
      moist[idx(x, y)] = fbm(x * 0.016 + 50, y * 0.016, seed + 3, 4);
    }
  const sorted = Float32Array.from(elev).sort();
  const q = p => sorted[Math.floor(p * (sorted.length - 1))];
  const lo = sorted[0], qw = q(0.3), qr = q(0.9), hi = sorted[sorted.length - 1];
  for (let i = 0; i < elev.length; i++) {
    const e = elev[i];
    elev[i] = e < qw ? (0.3 * (e - lo)) / (qw - lo) : e < qr ? 0.3 + (0.34 * (e - qw)) / (qr - qw) : 0.64 + (0.36 * (e - qr)) / (hi - qr);
  }

  const water = new Float32Array(N * N), rock = new Float32Array(N * N), dens = new Float32Array(N * N), bh = new Float32Array(N * N);
  const mat = new Uint8Array(N * N), vari = new Uint8Array(N * N);

  // rivers: steepest descent from the foot of the mountains, with a little meander
  const rivers = [];
  for (let k = 0, tries = 0; k < 6 && tries < 400; tries++) {
    const x = Math.floor(R() * N), y = Math.floor(R() * N);
    const e = elev[idx(x, y)];
    if (e < 0.6 || e > 0.66) continue;
    let cx = x, cy = y, steps = 0;
    const path = [];
    while (steps++ < 600) {
      path.push([cx, cy]);
      if (elev[idx(cx, cy)] < 0.3) break;
      let best = null, be = 1e9;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!inside(nx, ny)) continue;
          const v = elev[idx(nx, ny)] + hf(nx, ny, seed + 77) * 0.004 + (path.length > 2 && path[path.length - 2][0] === nx && path[path.length - 2][1] === ny ? 1 : 0);
          if (v < be) { be = v; best = [nx, ny]; }
        }
      if (!best) break;
      if (be >= elev[idx(cx, cy)]) elev[idx(best[0], best[1])] = elev[idx(cx, cy)] - 0.0005; // dig through pits
      [cx, cy] = best;
    }
    if (path.length > 30) { rivers.push(path); k++; }
  }
  for (const p of rivers)
    p.forEach(([x, y], i) => {
      const r = 0.8 + Math.min(1.4, i / 120);
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny) || Math.hypot(dx, dy) > r) continue;
          const j = idx(nx, ny);
          water[j] = Math.max(water[j], 0.55);
          elev[j] = Math.min(elev[j], 0.31);
        }
    });

  // base materials
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = idx(x, y), e = elev[i], m = moist[i];
      if (e < 0.3 || water[i] > 0) {
        mat[i] = M.WATER;
        water[i] = Math.max(water[i], clamp((0.3 - e) * 9, 0.35, 1));
      } else if (e < 0.33) mat[i] = M.SAND;
      else if (e > 0.64) {
        mat[i] = M.ROCK;
        const v = (e - 0.64) * 20, st = 1.5, f = (v / st) % 1;
        rock[i] = Math.min(6.2, 1.1 + Math.floor(v / st) * st + smooth(0.7, 1, f) * st);
      } else {
        const fn = fbm(x * 0.05, y * 0.05, seed + 21, 3);
        if (m > 0.56) { mat[i] = M.FOREST; dens[i] = smooth(0.54, 0.7, m) * (0.75 + 0.35 * fn); }
        else if (m < 0.4 && fn > 0.5) { mat[i] = M.MEADOW; dens[i] = 0.02; }
        else { mat[i] = M.GRASS; dens[i] = 0.05 + smooth(0.45, 0.56, m) * 0.3; }
        if (e > 0.58) dens[i] = Math.max(dens[i], 0.35 * fn); // pines on the slopes
      }
    }
  // boulders
  for (let k = 0; k < 90; k++) {
    const cx = R() * N, cy = R() * N, r = 0.9 + R() * 1.6, i0 = idx(Math.floor(cx), Math.floor(cy));
    if (mat[i0] === M.WATER || mat[i0] === M.SAND || mat[i0] === M.ROCK) continue;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (!inside(x, y)) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d > 1) continue;
        const i = idx(x, y);
        rock[i] = Math.max(rock[i], 0.5 + 1.3 * Math.sqrt(1 - d * d));
        mat[i] = M.ROCK; dens[i] = 0;
      }
  }

  const flat = (cx, cy, r) => {
    let ok = true;
    for (let y = cy - r; y <= cy + r && ok; y += 2)
      for (let x = cx - r; x <= cx + r; x += 2) {
        if (!inside(x, y)) return false;
        const i = idx(x, y);
        if (mat[i] === M.WATER || mat[i] === M.ROCK || mat[i] === M.SAND) { ok = false; break; }
      }
    return ok;
  };
  const clearTrees = (cx, cy, r) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if (inside(x, y) && Math.hypot(x - cx, y - cy) < r) dens[idx(x, y)] = 0;
  };

  // villages
  const villages = [], lights = [], chests = [], posts = [];
  const names = [...VILLAGE_NAMES].sort(() => R() - 0.5);
  for (let tries = 0; tries < 4000 && villages.length < 3; tries++) {
    const cx = 40 + Math.floor(R() * (N - 80)), cy = 40 + Math.floor(R() * (N - 80));
    const e = elev[idx(cx, cy)];
    if (e < 0.37 || e > 0.56 || !flat(cx, cy, 17)) continue;
    if (villages.some(v => dist(v.x, v.y, cx, cy) < 75)) continue;
    villages.push({ x: cx + 0.5, y: cy + 0.5, name: names[villages.length], houses: [] });
  }
  for (const v of villages) {
    clearTrees(v.x, v.y, 24);
    for (let y = -7; y <= 7; y++)
      for (let x = -7; x <= 7; x++) if (Math.hypot(x, y) < 6.5 + hf(x, y, seed) * 0.8) mat[idx(Math.floor(v.x) + x, Math.floor(v.y) + y)] = M.PLAZA;
    lights.push({ x: v.x, y: v.y, z: 0.3, r: 11, col: [1, 0.55, 0.2], type: 1 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.6, px = Math.floor(v.x + Math.cos(a) * 7.5), py = Math.floor(v.y + Math.sin(a) * 7.5);
      bh[idx(px, py)] = 2.2; mat[idx(px, py)] = M.POST;
      posts.push({ x: px + 0.5, y: py + 0.5 });
      lights.push({ x: px + 0.5, y: py + 0.5, z: 2.4, r: 7, col: [1, 0.72, 0.38], type: 0, night: 1 });
    }
    const nh = 5 + Math.floor(R() * 3);
    for (let k = 0; k < nh; k++) {
      const a = (k / nh) * TAU + R() * 0.4, d = 11.5 + R() * 3;
      const w = 5 + Math.floor(R() * 3), dd = 4 + Math.floor(R() * 2);
      const x0 = Math.floor(v.x + Math.cos(a) * d - w / 2), y0 = Math.floor(v.y + Math.sin(a) * d - dd / 2);
      let ok = true;
      for (let y = y0 - 1; y <= y0 + dd && ok; y++) for (let x = x0 - 1; x <= x0 + w; x++) if (!inside(x, y) || bh[idx(x, y)] > 0 || mat[idx(x, y)] === M.WATER || mat[idx(x, y)] === M.ROCK) ok = false;
      if (!ok) continue;
      const alongX = w >= dd, col = 1 + Math.floor(R() * 3);
      for (let y = y0; y < y0 + dd; y++)
        for (let x = x0; x < x0 + w; x++) {
          const i = idx(x, y);
          const u = alongX ? Math.abs(y + 0.5 - (y0 + dd / 2)) / (dd / 2) : Math.abs(x + 0.5 - (x0 + w / 2)) / (w / 2);
          bh[i] = 2.3 + 1.5 * (1 - u);
          mat[i] = M.HOUSE;
          vari[i] = (alongX ? 0 : 1) + col * 2;
        }
      v.houses.push({ x: x0, y: y0, w, d });
    }
    // crop fields
    for (let k = 0; k < 2; k++) {
      const a = R() * TAU, fx = Math.floor(v.x + Math.cos(a) * 19 - 4), fy = Math.floor(v.y + Math.sin(a) * 19 - 3);
      for (let y = fy; y < fy + 6; y++) for (let x = fx; x < fx + 9; x++) if (inside(x, y) && bh[idx(x, y)] === 0 && (mat[idx(x, y)] === M.GRASS || mat[idx(x, y)] === M.MEADOW || mat[idx(x, y)] === M.FOREST)) { mat[idx(x, y)] = M.FIELD; dens[idx(x, y)] = 0; }
    }
  }

  // ruins
  const ruins = [];
  const rnames = [...RUIN_NAMES].sort(() => R() - 0.5);
  for (let tries = 0; tries < 5000 && ruins.length < 5; tries++) {
    const cx = 30 + Math.floor(R() * (N - 60)), cy = 30 + Math.floor(R() * (N - 60));
    const e = elev[idx(cx, cy)];
    if (e < 0.4 || e > 0.62 || !flat(cx, cy, 10)) continue;
    if (villages.some(v => dist(v.x, v.y, cx, cy) < 55) || ruins.some(r => dist(r.x, r.y, cx, cy) < 45)) continue;
    ruins.push({ x: cx + 0.5, y: cy + 0.5, name: rnames[ruins.length] });
  }
  ruins.forEach((r, ri) => {
    clearTrees(r.x, r.y, 12);
    const s = 7, x0 = Math.floor(r.x), y0 = Math.floor(r.y);
    for (let y = -s; y <= s; y++)
      for (let x = -s; x <= s; x++) {
        const i = idx(x0 + x, y0 + y);
        mat[i] = M.RUINFLOOR;
        const edge = Math.abs(x) === s || Math.abs(y) === s, inner = (x === 0 && Math.abs(y) > 2) || (y === -2 && Math.abs(x) < s && Math.abs(x) > 2);
        const corner = Math.abs(x) === s && Math.abs(y) === s;
        if (corner) { bh[i] = 3.6; mat[i] = M.RUIN; continue; }
        if (!edge && !inner) continue;
        if (y === -s && Math.abs(x) <= 1) continue; // gate
        const n = fbm((x0 + x) * 0.35, (y0 + y) * 0.35, seed + 40, 2);
        const hh = n < 0.38 ? 0 : 0.6 + (n - 0.38) * 6;
        if (hh > 0.2) { bh[i] = Math.min(3.2, hh); mat[i] = M.RUIN; }
      }
    chests.push({ x: r.x + 0.5, y: r.y + 3.5, open: false, tier: ri === 0 ? 3 : 2 });
    lights.push({ x: r.x, y: r.y + 1, z: 0.6, r: 6, col: [0.45, 0.6, 1], type: 2, night: 1 }); // ghost-fire
  });

  // roads: A* over a cost grid, rocks impassable, water expensive (becomes a bridge)
  const costAt = i => (mat[i] === M.ROCK || bh[i] > 0 ? Infinity : mat[i] === M.WATER ? 18 : mat[i] === M.ROAD || mat[i] === M.BRIDGE ? 0.35 : mat[i] === M.FOREST ? 2.2 : 1);
  function astar(ax, ay, bx, by) {
    const start = idx(ax, ay), goal = idx(bx, by);
    const g = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1);
    const closed = new Uint8Array(N * N);
    const heap = [];
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    g[start] = 0; push(start, 0);
    while (heap.length) {
      const [, i] = pop();
      if (closed[i]) continue;
      closed[i] = 1;
      if (i === goal) break;
      const x = i % N, y = (i / N) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny)) continue;
          const j = idx(nx, ny), c = costAt(j);
          if (c === Infinity && j !== goal) continue;
          const ng = g[i] + (dx && dy ? 1.414 : 1) * (c === Infinity ? 1 : c);
          if (!closed[j] && ng < g[j]) { g[j] = ng; from[j] = i; push(j, ng + Math.hypot(nx - bx, ny - by) * 0.6); }
        }
    }
    const path = [];
    for (let i = goal; i !== -1 && path.length < 5000; i = from[i]) path.push([i % N, (i / N) | 0]);
    return from[goal] === -1 ? [] : path;
  }
  const paint = path => {
    path.forEach(([x, y]) => {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny) || Math.hypot(dx, dy) > 1.2) continue;
          const j = idx(nx, ny);
          if (bh[j] > 0 || mat[j] === M.PLAZA || mat[j] === M.RUINFLOOR || mat[j] === M.ROCK) continue;
          mat[j] = mat[j] === M.WATER || mat[j] === M.BRIDGE ? M.BRIDGE : M.ROAD;
        }
      clearTrees(x + 0.5, y + 0.5, 2.6);
    });
  };
  const sites = [...villages, ...ruins];
  for (let i = 1; i < villages.length; i++) paint(astar(Math.floor(villages[i - 1].x), Math.floor(villages[i - 1].y), Math.floor(villages[i].x), Math.floor(villages[i].y)));
  for (const r of ruins) {
    let best = villages[0];
    for (const v of villages) if (dist(v.x, v.y, r.x, r.y) < dist(best.x, best.y, r.x, r.y)) best = v;
    if (best) paint(astar(Math.floor(r.x), Math.floor(r.y - 8), Math.floor(best.x), Math.floor(best.y)));
  }
  // houses and plazas must stay clear after road painting
  for (const v of villages) clearTrees(v.x, v.y, 20);

  // scattered chests in the wild
  for (let k = 0, tries = 0; k < 10 && tries < 3000; tries++) {
    const x = Math.floor(R() * N), y = Math.floor(R() * N), i = idx(x, y);
    if (mat[i] !== M.FOREST && mat[i] !== M.GRASS && mat[i] !== M.MEADOW) continue;
    if (sites.some(s => dist(s.x, s.y, x, y) < 30)) continue;
    chests.push({ x: x + 0.5, y: y + 0.5, open: false, tier: 1 });
    clearTrees(x + 0.5, y + 0.5, 3);
    k++;
  }
  for (const c of chests) clearTrees(c.x, c.y, 2);
  for (const l of lights) if (l.type === 1) clearTrees(l.x, l.y, 4);

  // pack
  for (let i = 0; i < N * N; i++) {
    h[i * 4] = Math.round((clamp(rock[i], 0, HSCALE) / HSCALE) * 255);
    h[i * 4 + 1] = Math.round(clamp(water[i], 0, 1) * 255);
    h[i * 4 + 2] = Math.round(clamp(dens[i], 0, 1) * 255);
    h[i * 4 + 3] = Math.round(clamp(elev[i], 0, 1) * 255);
    b[i * 4] = Math.round((clamp(bh[i], 0, HSCALE) / HSCALE) * 255);
    b[i * 4 + 1] = mat[i];
    b[i * 4 + 2] = vari[i];
  }
  const v0 = villages[0] || { x: N / 2, y: N / 2 };
  W = { seed, h, b, villages, ruins, lights, chests, posts, spawn: { x: v0.x, y: v0.y - 3.5 }, explored: new Uint8Array((N / 2) * (N / 2)), ms: 0 };
  W.ms = Math.round(performance.now() - t0);
  return W;
}

// ---------- CPU queries (mirror the shader) ----------
const texel = (arr, x, y, c) => arr[(clamp(y, 0, N - 1) * N + clamp(x, 0, N - 1)) * 4 + c];
function bilinear(arr, c, x, y) {
  x -= 0.5; y -= 0.5;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  return lerp(lerp(texel(arr, ix, iy, c), texel(arr, ix + 1, iy, c), fx), lerp(texel(arr, ix, iy + 1, c), texel(arr, ix + 1, iy + 1, c), fx), fy) / 255;
}
const rockAt = (x, y) => bilinear(W.h, 0, x, y) * HSCALE;
const waterAt = (x, y) => bilinear(W.h, 1, x, y);
const matAt = (x, y) => texel(W.b, Math.floor(x), Math.floor(y), 1);
const bldAt = (x, y) => (texel(W.b, Math.floor(x), Math.floor(y), 0) / 255) * HSCALE;

function treeInCell(i, j) {
  const cx = Math.floor((i + 0.5) * TG), cy = Math.floor((j + 0.5) * TG);
  const d = texel(W.h, cx, cy, 2) / 255;
  if (!(hf(i, j, W.seed + 11) < d * 0.85)) return null;
  const x = (i + 0.2 + 0.6 * hf(i, j, W.seed + 12)) * TG, y = (j + 0.2 + 0.6 * hf(i, j, W.seed + 13)) * TG;
  return { x, y };
}
function blocked(x, y, r = 0.3) {
  if (x < 2 || y < 2 || x > N - 2 || y > N - 2) return true;
  for (const [ox, oy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
    const px = x + ox, py = y + oy;
    if (rockAt(px, py) > 0.55 || bldAt(px, py) > 0.3) return true;
    if (waterAt(px, py) > 0.3 && matAt(px, py) !== M.BRIDGE) return true;
  }
  const ti = Math.floor(x / TG), tj = Math.floor(y / TG);
  for (let j = tj - 1; j <= tj + 1; j++)
    for (let i = ti - 1; i <= ti + 1; i++) {
      const t = treeInCell(i, j);
      if (t && dist(t.x, t.y, x, y) < 0.35 + r) return true;
    }
  for (const l of W.lights) if (l.type === 1 && dist(l.x, l.y, x, y) < 0.7 + r) return true;
  for (const c of W.chests) if (dist(c.x, c.y, x, y) < 0.5 + r) return true;
  return false;
}
function explore(x, y, r = 14) {
  const e = W.explored, n = N / 2;
  for (let j = -r; j <= r; j += 2)
    for (let i = -r; i <= r; i += 2) {
      if (i * i + j * j > r * r) continue;
      const ex = Math.floor((x + i) / 2), ey = Math.floor((y + j) / 2);
      if (ex >= 0 && ey >= 0 && ex < n && ey < n) e[ey * n + ex] = 1;
    }
}
