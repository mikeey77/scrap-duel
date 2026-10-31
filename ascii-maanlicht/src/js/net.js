// ---------- identity + online play (PeerJS, host-authoritative) ----------
// Every device has a permanent id and name. A device that starts its own world hosts it:
// it runs the enemies, loot, chests and boss; joining devices send their own player and their actions.
const NAMES = ['Ansel', 'Brann', 'Corin', 'Daan', 'Elske', 'Fenna', 'Gerrit', 'Hilde', 'Ivo', 'Jorrit', 'Kaatje', 'Lieve', 'Maarten', 'Nora', 'Oskar', 'Pim', 'Roos', 'Sanne', 'Tijs', 'Vera', 'Wout', 'Yara'];
function loadIdentity() {
  let me = null;
  try { me = JSON.parse(localStorage.getItem('maanlicht-id') || 'null'); } catch (e) {}
  if (!me || !me.id) {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += a[Math.floor(Math.random() * a.length)];
    me = { id, name: NAMES[Math.floor(Math.random() * NAMES.length)], seed: 1 + Math.floor(Math.random() * 99999) };
    try { localStorage.setItem('maanlicht-id', JSON.stringify(me)); } catch (e) {}
  }
  return me;
}
const ME = loadIdentity();
function saveIdentity() {
  try { localStorage.setItem('maanlicht-id', JSON.stringify(ME)); } catch (e) {}
}
const roomOf = code => 'maanlicht-w-' + code.toUpperCase().replace(/[^A-Z0-9]/g, '');

const NET = { mode: 'off', peer: null, conns: [], host: null, remotes: new Map(), status: '', sendT: 0, snapT: 0 };
let NID = 1;
const netOn = () => NET.mode !== 'off';
const isClient = () => NET.mode === 'client';
const netStatus = (s, col = '#9fb0c8') => { NET.status = s; const el = $('net'); if (el) el.innerHTML = `<span style="color:${col}">${esc(s)}</span>`; };

function peerAvailable() {
  return typeof window.Peer === 'function';
}
function hostWorld() {
  if (!peerAvailable()) { netStatus('online niet beschikbaar in deze versie (alleen lokaal)', '#ff9a7a'); return; }
  NET.mode = 'host';
  const peer = (NET.peer = new window.Peer(roomOf(ME.id.slice(0, 6)), { debug: 0, ...(window.__peerOpts || {}) }));
  peer.on('open', () => netStatus(`wereld online · code ${ME.id.slice(0, 6)}`, '#9be38a'));
  peer.on('error', e => netStatus('netwerk: ' + (e.type || e.message), '#ff9a7a'));
  peer.on('connection', c => {
    c.on('data', d => onHostData(c, d));
    c.on('close', () => {
      NET.conns = NET.conns.filter(x => x !== c);
      for (const [k, r] of NET.remotes) if (r.conn === c) { say(`${r.name} heeft de wereld verlaten.`, '#9fb0c8'); NET.remotes.delete(k); }
    });
    NET.conns.push(c);
  });
}
function joinWorld(code, onWelcome) {
  if (!peerAvailable()) { netStatus('online niet beschikbaar in deze versie', '#ff9a7a'); return; }
  NET.mode = 'client';
  netStatus('verbinden met ' + code + '…');
  const peer = (NET.peer = new window.Peer(undefined, { debug: 0, ...(window.__peerOpts || {}) }));
  peer.on('error', e => netStatus('kan niet verbinden: ' + (e.type || e.message), '#ff9a7a'));
  peer.on('open', () => {
    const c = (NET.host = peer.connect(roomOf(code), { reliable: true }));
    c.on('open', () => c.send({ t: 'hello', id: ME.id, name: ME.name }));
    c.on('data', d => onClientData(d, onWelcome));
    c.on('close', () => { netStatus('verbinding met de host verbroken', '#ff9a7a'); NET.mode = 'off'; NET.remotes.clear(); });
  });
}

// ---------- shared packing ----------
function packPlayer(p) {
  const lk = playerLook(p), s = stats(p);
  return { id: p.netId, name: p.name, tag: p.tag, x: +p.x.toFixed(2), y: +p.y.toFixed(2), face: p.face, phase: +p.phase.toFixed(2), move: +p.move.toFixed(2), atk: +p.atkT.toFixed(2), hurt: +p.hurt.toFixed(2), lk, hp: Math.round(p.hp), hpMax: s.hpMax, lv: p.level, dead: p.dead > 0 ? 1 : 0 };
}
function applyRemote(m, conn) {
  let r = NET.remotes.get(m.id);
  if (!r) {
    r = { ...m, rx: m.x, ry: m.y, conn };
    NET.remotes.set(m.id, r);
    say(`${m.name} is in de wereld.`, m.tag || '#cfd8e3');
  }
  Object.assign(r, m, { conn: conn || r.conn, tx: m.x, ty: m.y, seen: G.time });
}
function updateRemotes(dt) {
  for (const [k, r] of NET.remotes) {
    r.rx = lerp(r.rx, r.tx, Math.min(1, dt * 10));
    r.ry = lerp(r.ry, r.ty, Math.min(1, dt * 10));
    r.phase += dt * 9 * (r.move || 0) * 0;
    if (G.time - r.seen > 8) NET.remotes.delete(k);
  }
  // client: smooth host-owned enemies
  if (isClient())
    for (const e of G.enemies) {
      if (e.tx === undefined) continue;
      e.x = lerp(e.x, e.tx, Math.min(1, dt * 10));
      e.y = lerp(e.y, e.ty, Math.min(1, dt * 10));
    }
}
// remotes as targets for the host's enemies
function remoteTargets() {
  const out = [];
  for (const r of NET.remotes.values()) if (!r.dead) out.push({ x: r.rx, y: r.ry, dead: 0, remote: r });
  return out;
}

// ---------- host side ----------
function onHostData(c, d) {
  if (d.t === 'hello') {
    c.peerName = d.name;
    c.send({ t: 'welcome', seed: W.seed, chests: W.chests.map(x => x.open), host: ME.name, tz: new Date().getTimezoneOffset() });
    say(`${d.name} komt binnen.`, '#9be38a');
  } else if (d.t === 'me') for (const m of d.players) applyRemote(m, c);
  else if (d.t === 'hit') {
    const e = G.enemies.find(x => x.id === d.id);
    const r = NET.remotes.get(d.by);
    if (e && e.hp > 0) {
      if (d.fx === 'fire') e.burn = 3;
      if (d.fx === 'ice' || d.slow) e.slow = 2.5;
      damageEnemy(e, d.dmg, r ? { remote: r, x: r.rx, y: r.ry } : null, d.crit, true);
    }
  } else if (d.t === 'chest') {
    const ch = W.chests[d.i];
    if (ch && !ch.open) openChest(ch, d.lv || 1);
  } else if (d.t === 'take') {
    const dr = G.drops.find(x => x.id === d.id);
    if (dr && !dr.taken) { dr.taken = true; c.send({ t: 'give', drop: dr, pid: d.pid }); }
  } else if (d.t === 'drop') G.drops.push({ id: NID++, x: d.x, y: d.y, item: d.item });
}
function hostSnapshot() {
  const players = [...G.players.map(packPlayer), ...[...NET.remotes.values()].map(r => { const { conn, rx, ry, tx, ty, seen, ...m } = r; return m; })];
  return {
    t: 'snap',
    players,
    enemies: G.enemies.filter(e => e.hp > 0).map(e => [e.id, e.kind, +e.x.toFixed(2), +e.y.toFixed(2), e.face, +e.phase.toFixed(2), +e.atkT.toFixed(2), +e.hurt.toFixed(2), Math.round(e.hp), e.hpMax, e.level, e.burn > 0 ? 1 : 0, e.slow > 0 ? 1 : 0]),
    drops: G.drops.filter(d => !d.taken).map(d => ({ id: d.id, x: d.x, y: d.y, gold: d.gold, potion: d.potion, item: d.item })),
    chests: W.chests.map(c => (c.open ? 1 : 0)).join(''),
    boss: G.bossDead ? 1 : 0
  };
}
function hostHurtRemote(r, dmg, mana) {
  if (r.conn && r.conn.open) r.conn.send({ t: 'hurt', id: r.id, dmg, mana });
}
function hostXpRemote(r, xp) {
  if (r.conn && r.conn.open) r.conn.send({ t: 'xp', id: r.id, xp });
}

// ---------- client side ----------
function onClientData(d, onWelcome) {
  if (d.t === 'welcome') {
    netStatus(`verbonden met de wereld van ${d.host}`, '#9be38a');
    onWelcome(d);
  } else if (d.t === 'snap') {
    const mine = new Set(G.players.map(p => p.netId));
    const seen = new Set();
    for (const m of d.players) if (!mine.has(m.id)) { applyRemote(m); seen.add(m.id); }
    for (const k of NET.remotes.keys()) if (!seen.has(k)) NET.remotes.delete(k);
    const old = new Map(G.enemies.map(e => [e.id, e]));
    G.enemies = d.enemies.map(a => {
      const [id, kind, x, y, face, phase, atk, hurt, hp, hpMax, level, burn, slow] = a;
      const e = old.get(id) || { id, def: ENEMY[kind], kind, x, y };
      Object.assign(e, { tx: x, ty: y, face, phase, atkT: atk, hurt, hp, hpMax, level, burn, slow, move: 0 });
      return e;
    });
    G.drops = d.drops;
    [...d.chests].forEach((v, i) => W.chests[i] && (W.chests[i].open = v === '1'));
    G.bossDead = !!d.boss;
  } else if (d.t === 'hurt') {
    const p = G.players.find(q => q.netId === d.id);
    if (p) hurtPlayer(p, d.dmg, { def: { mana: d.mana } }, true);
  } else if (d.t === 'xp') {
    const p = G.players.find(q => q.netId === d.id);
    if (p) gainXp(p, d.xp);
  } else if (d.t === 'give') {
    const p = G.players.find(q => q.netId === d.pid) || G.players[0];
    if (p) receiveDrop(p, d.drop);
  }
}
function netTick(dt) {
  if (!netOn()) return;
  NET.sendT += dt;
  if (NET.mode === 'client' && NET.host && NET.host.open && NET.sendT > 1 / 15) {
    NET.sendT = 0;
    NET.host.send({ t: 'me', players: G.players.map(packPlayer) });
  }
  if (NET.mode === 'host' && NET.conns.length && NET.sendT > 1 / 12) {
    NET.sendT = 0;
    const snap = hostSnapshot();
    for (const c of NET.conns) if (c.open) c.send(snap);
  }
}
function netSend(msg) {
  if (NET.mode === 'client' && NET.host && NET.host.open) NET.host.send(msg);
}
