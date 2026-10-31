// ---------- boot, title screen, main loop, saving ----------
const Game = { started: false, cell: 9, fpsT: 0, fpsN: 0, fps: 0, saveT: 0 };
const CHAR_KEY = 'maanlicht-char-v2';   // your character: lives on this device, travels to every world
const WORLD_KEY = s => 'maanlicht-world-' + s; // per-world progress (host only)

function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function fetchStore(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function writeSave() {
  if (!Game.started) return;
  store(CHAR_KEY, G.players.map(p => ({ level: p.level, xp: p.xp, gold: p.gold, potions: p.potions, bag: p.bag, eq: p.eq })));
  if (!isClient()) store(WORLD_KEY(W.seed), { explored: Array.from(W.explored).join(''), chests: W.chests.map(c => c.open), boss: !!G.bossDead, pos: G.players.map(p => [p.x, p.y]) });
}

function startWorld(seed) {
  genWorld(seed);
  uploadWorld();
  buildBaseMap();
  spawnVillagers();
  G.enemies = [];
  G.drops = [];
  G.bossSpawned = false;
  G.bossDead = false;
  G.players.forEach((p, i) => { p.x = W.spawn.x + (i - 0.5) * 1.6; p.y = W.spawn.y; });
  updateCamera(0, true);
  $('seed').textContent = `wereld #${seed} · ${W.villages.length} dorpen · ${W.ruins.length} ruïnes`;
}
function addPlayer(input, saved) {
  const i = G.players.length;
  if (i >= 4) return;
  const p = newPlayer(i);
  p.input = input;
  if (saved) {
    Object.assign(p, { level: saved.level, xp: saved.xp, gold: saved.gold, potions: saved.potions, bag: saved.bag, eq: saved.eq });
    const s = stats(p);
    p.hp = s.hpMax;
    p.mp = s.mpMax;
    for (const it of [...p.bag, ...Object.values(p.eq)]) ITEM_ID = Math.max(ITEM_ID, it.id + 1);
  }
  G.players.push(p);
  say(`${p.name} doet mee (${input.label}).`, p.tag);
}
function enterWorld(local2, restore = true) {
  audioInit();
  const chars = fetchStore(CHAR_KEY) || [];
  G.players = [];
  addPlayer(keyboardInput(0), chars[0]);
  if (local2) addPlayer(keyboardInput(1), chars[1]);
  const ws = restore && !isClient() ? fetchStore(WORLD_KEY(W.seed)) : null;
  if (ws) {
    if (ws.explored) for (let i = 0; i < W.explored.length; i++) W.explored[i] = ws.explored.charCodeAt(i) === 49 ? 1 : 0;
    (ws.chests || []).forEach((o, i) => W.chests[i] && (W.chests[i].open = o));
    G.bossSpawned = G.bossDead = !!ws.boss;
    (ws.pos || []).forEach((q, i) => { const p = G.players[i]; if (p && q && !blocked(q[0], q[1])) { p.x = q[0]; p.y = q[1]; } });
  }
  Game.started = true;
  $('title').style.display = 'none';
  updateCamera(0, true);
  const v = nearestVillage(G.players[0].x, G.players[0].y);
  say(`${clockText()} — je bent in ${v.name}.`, '#cfd8e3');
}
function begin(mode) {
  if (mode === 'host') {
    startWorld(ME.seed);
    hostWorld();
    enterWorld(false);
  } else if (mode === 'two') {
    startWorld(ME.seed);
    enterWorld(true);
  } else if (mode === 'join') {
    const code = $('code').value.trim().toUpperCase();
    if (code.length < 4) { netStatus('vul een wereldcode in', '#ff9a7a'); return; }
    joinWorld(code, d => {
      startWorld(d.seed);
      (d.chests || []).forEach((o, i) => W.chests[i] && (W.chests[i].open = o));
      G.bossSpawned = true;
      enterWorld(false, false);
    });
  } else {
    startWorld(ME.seed);
    enterWorld(false);
  }
}

// ---------- ambient life: birds, leaves, dust, butterflies, chimney smoke ----------
function ambientFx(dt) {
  const cx = G.cam.sx, cy = G.cam.sy / YS, e = G.env;
  const span = Rn.W / G.cam.ppu / 2 + 2, spanY = Rn.H / G.cam.ppu / 2 / YS + 2;
  const rx = () => cx + (Math.random() * 2 - 1) * span, ry = () => cy + (Math.random() * 2 - 1) * spanY;
  // falling leaves over forest
  if (Math.random() < dt * 5) {
    const x = rx(), y = ry();
    if (matAt(x, y) === M.FOREST) {
      const au = Math.random() < 0.4;
      G.particles.push({ x, y, z: 3.5 + Math.random() * 2, vx: 0.3, vy: 0, vz: -0.55, sway: Math.random() * 6, col: au ? [0.8, 0.45, 0.12] : [0.35, 0.55, 0.2], glyph: GI.GRASS + 2 + (Math.random() < 0.5 ? 1 : 0), size: 0.17, life: 7, grav: 0, leaf: 1 });
    }
  }
  // butterflies over meadows (day)
  if (e.night < 0.3 && e.rain < 0.3 && Math.random() < dt * 2) {
    const x = rx(), y = ry();
    if (matAt(x, y) === M.MEADOW || matAt(x, y) === M.FIELD) G.particles.push({ x, y, z: 0.6, vx: 0, vy: 0, vz: 0, flutter: Math.random() * 9, col: Math.random() < 0.5 ? [1, 0.95, 0.6] : [0.9, 0.85, 1], glyph: GI.FLOWER + 3, size: 0.16, life: 6, grav: 0 });
  }
  // a flock crossing the sky by day, with ground shadows
  if (e.night < 0.4 && !G.flock && Math.random() < dt * 0.06) {
    const a = Math.random() * TAU;
    G.flock = { x: cx - Math.cos(a) * span * 1.4, y: cy - Math.sin(a) * span * 1.4, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, t: 0, n: 5 + Math.floor(Math.random() * 5) };
  }
  if (G.flock) {
    const f = G.flock;
    f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt;
    for (let i = 0; i < f.n; i++) {
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      const bx = f.x - (f.vx / 5) * row * 0.9 + (f.vy / 5) * side * row * 0.7, by = f.y - (f.vy / 5) * row * 0.9 - (f.vx / 5) * side * row * 0.7;
      const flap = Math.sin(G.time * 9 + i) > 0;
      G.particles.push({ x: bx, y: by, z: 7, vx: 0, vy: 0, vz: 0, col: [0.12, 0.12, 0.14], glyph: flap ? GI.FLOWER + 3 : GI.WATER + 3, size: 0.2, life: 0.001 });
      G.particles.push({ x: bx + 1.5, y: by + 1.6, z: 0, vx: 0, vy: 0, vz: 0, col: [0.02, 0.03, 0.02], glyph: GI.RAMP + 1, size: 0.2, life: 0.001 });
    }
    if (f.t > 20) G.flock = null;
  }
  // footstep dust & splashes
  for (const p of G.players)
    if (p.move > 0.5 && Math.random() < dt * 6) {
      const wet = G.env.wet > 0.4;
      G.particles.push({ x: p.x + (Math.random() - 0.5) * 0.3, y: p.y, z: 0.05, vx: -p.dir[0] * 0.5, vy: 0, vz: 0.8, col: wet ? [0.5, 0.6, 0.75] : [0.45, 0.4, 0.32], glyph: wet ? GI.SPARK + 3 : GI.DIRT + 1, size: 0.17, life: 0.35, grav: 3 });
    }
  // chimney smoke in the evening and morning
  if ((e.night > 0.3 || Math.abs(G.day - 0.3) < 0.06) && Math.random() < dt * 3)
    for (const v of W.villages) {
      if (Math.abs(v.x - cx) > span + 10) continue;
      const h = pickR(Math.random, v.houses);
      if (!h) continue;
      G.particles.push({ x: h.x + h.w * 0.7, y: h.y + h.d * 0.5, z: 4.2, vx: 0.25, vy: 0, vz: 0.6, col: [0.3, 0.3, 0.33].map(c => c * (0.5 + e.amb[1] * 2)), glyph: GI.SMOKE + 2, size: 0.3, life: 3, grav: 0, smoke: 1 });
    }
  for (const q of G.particles) {
    if (q.leaf) { q.vx = Math.sin(G.time * 2 + q.sway) * 0.6; if (q.z <= 0.02) { q.vz = 0; q.life = Math.min(q.life, 1.5); } }
    if (q.flutter !== undefined) { q.flutter += dt; q.vx = Math.sin(q.flutter * 1.3) * 1.2; q.vy = Math.cos(q.flutter * 0.9) * 0.8; q.z = 0.6 + Math.abs(Math.sin(q.flutter * 7)) * 0.3; }
    if (q.smoke) q.size = Math.min(0.5, q.size + dt * 0.05);
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - (Game.last || now)) / 1000);
  Game.last = now;
  G.time += dt;
  updateEnv(dt);
  for (const p of G.players) p.inp = p.input.state();
  const join = pollJoin();
  if (join && Game.started && G.players.length < 4) addPlayer(join, (fetchStore(CHAR_KEY) || [])[G.players.length]);
  if (Game.started) {
    for (const p of G.players) {
      if (p.inp.inv) toggleInventory(p);
      else inventoryNav(p, p.inp);
      updatePlayer(p, dt);
    }
    if (!isClient()) {
      spawnEnemies(dt);
      updateEnemies(dt);
      if (G.bossSpawned && !G.enemies.some(e => e.def.boss) && !G.bossDead) G.bossDead = true;
    } else for (const e of G.enemies) { e.hurt = Math.max(0, (e.hurt || 0) - dt * 5); }
    updateRemotes(dt);
    updateVillagers(dt);
    ambientFx(dt);
    updateFx(dt);
    updateCamera(dt);
    netTick(dt);
    Game.saveT += dt;
    if (Game.saveT > 15) { Game.saveT = 0; writeSave(); }
  } else {
    // title: slow drift over the island
    const v = W.villages[0] || W.spawn;
    G.cam.sx = v.x + Math.sin(G.time * 0.05) * 14;
    G.cam.sy = (v.y + Math.cos(G.time * 0.04) * 10) * YS;
    G.cam.ppu = Math.sqrt(Rn.W * Rn.H) / 22;
    updateVillagers(dt);
    ambientFx(dt);
    updateFx(dt);
  }
  for (const l of W.lights)
    if (l.type === 1 && Math.random() < dt * 6 && Math.abs(l.x - G.cam.sx) < 30) G.particles.push({ x: l.x + (Math.random() - 0.5) * 0.4, y: l.y, z: 1, vx: (Math.random() - 0.5) * 0.4, vy: 0, vz: 1.5 + Math.random(), col: [1, 0.55, 0.15], glyph: GI.SPARK + 3, size: 0.18, life: 1 + Math.random(), grav: -0.3 });
  const sc = collectScene();
  renderFrame({ time: G.time, env: G.env, cam: G.cam, raw: G.raw, players: Game.started ? G.players.filter(p => p.dead <= 0) : [], ...sc });
  if (Game.started) {
    updateHud();
    updateLabels();
    if ((Game.mapT = (Game.mapT || 0) + dt) > 0.25) { Game.mapT = 0; updateMaps(); }
  }
  audioUpdate();
  Game.fpsN++;
  Game.fpsT += dt;
  if (Game.fpsT > 0.5) { Game.fps = Math.round(Game.fpsN / Game.fpsT); Game.fpsN = 0; Game.fpsT = 0; $('fps').textContent = `${Game.fps} fps · ${Rn.cols}×${Rn.rows} tekens`; }
  endInputFrame();
  requestAnimationFrame(frame);
}

function asciiLogo() {
  const c = document.createElement('canvas'), w = 360, h = 64;
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#fff'; x.font = 'bold 54px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('MAANLICHT', w / 2, h / 2 + 3);
  const d = x.getImageData(0, 0, w, h).data, ramp = ' .:-=+*#%@', cols = 90, rows = 13;
  let out = '';
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let v = 0;
      for (let k = 0; k < 4; k++) { const px = Math.floor(((i + (k % 2) * 0.5) / cols) * w), py = Math.floor(((j + (k >> 1) * 0.5) / rows) * h); v += d[(py * w + px) * 4]; }
      out += ramp[Math.min(9, Math.floor((v / 4 / 255) * 9.99))];
    }
    out += '\n';
  }
  return out;
}

function boot() {
  document.querySelector('.logo').textContent = asciiLogo();
  const canvas = $('c');
  try { initRenderer(canvas); } catch (e) { $('err').style.display = 'flex'; $('err').textContent = 'Kan WebGL2 niet starten: ' + e.message; console.error(e); return; }
  Game.cell = matchMedia('(pointer:coarse)').matches ? 8 : 9;
  resizeRenderer(Game.cell);
  addEventListener('resize', () => resizeRenderer(Game.cell));
  const qs = /^#(\d+)$/.exec(location.hash);
  if (qs) ME.seed = +qs[1];
  startWorld(ME.seed);
  // identity on the title screen
  $('myid').textContent = ME.id;
  $('mycode').textContent = ME.id.slice(0, 6);
  $('name').value = ME.name;
  $('name').oninput = () => { ME.name = $('name').value.slice(0, 16) || 'Naamloos'; saveIdentity(); };
  $('bHost').onclick = () => begin('host');
  $('bJoin').onclick = () => begin('join');
  $('bTwo').onclick = () => begin('two');
  $('bNew').onclick = () => { ME.seed = 1 + Math.floor(Math.random() * 99999); saveIdentity(); startWorld(ME.seed); };
  if (!peerAvailable()) netStatus('online spelen werkt in de Windows-versie (Maanlicht.exe) en in een gewone browser', '#9fb0c8');
  addEventListener('keydown', e => {
    if (!Game.started) return;
    if (e.code === 'KeyM') { UI.map = !UI.map; $('mapwrap').style.display = UI.map ? 'flex' : 'none'; if (UI.map) updateMaps(); }
    if (e.code === 'KeyT') G.raw = !G.raw;
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') { Game.cell = Math.min(20, Game.cell + 1); resizeRenderer(Game.cell); }
    if (e.code === 'Equal') { Game.cell = Math.max(5, Game.cell - 1); resizeRenderer(Game.cell); }
    if (e.code === 'Digit2' && G.players.length === 1 && !isClient()) addPlayer(keyboardInput(1), (fetchStore(CHAR_KEY) || [])[1]);
    if (e.code === 'F11' && window.maanlicht) { e.preventDefault(); window.maanlicht.toggleFullscreen(); }
    if (e.code === 'Escape') {
      if (UI.map) { UI.map = false; $('mapwrap').style.display = 'none'; }
      else for (const p of G.players) if (UI.open[p.idx]) toggleInventory(p);
    }
  });
  addEventListener('pointerdown', audioInit, { once: true });
  addEventListener('beforeunload', writeSave);
  requestAnimationFrame(frame);
}
boot();
// handle for automated screenshots / debugging
window.__maanlicht = { snapCam: () => updateCamera(0, true), G, get W() { return W; }, Game, begin, addPlayer, keyboardInput, toggleInventory, UI, makeItem, mulberry, makeEnemy, updateMaps, NET, applyRemote };
