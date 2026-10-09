// Garage helpers: auto-place loose parts, auto-build a whole car, and the "you forgot something" check on Ready.
const looseIds = () => Object.keys(G.inv).filter(id => id !== 'cockpit' && left(id) > 0);
const looseCount = () => looseIds().reduce((a, id) => a + left(id), 0);

/** Bolts every loose part onto the current design: wheels on the flanks, melee up front, armor around the body, guns on mounts. */
function autoPlace(quiet) {
  if (!building()) return 0;
  const before = designKey(),
    initial = new Set(blockedList().map(([l, k]) => l + k));
  let placed = 0;
  const safe = (map, k, e) => {
    map.set(k, e);
    const bad = blockedList().some(([l, bk]) => !initial.has(l + bk));
    map.delete(k);
    return !bad;
  };
  // Reserve contiguous supports before scattering single support blocks around the chassis.
  for (const m of MODS.filter(m => m.plan && m.layer === 't' && cellCount(m) > 1))
    while (left(m.id) > 0) {
      let done = false;
      for (const k of G.ws) {
        const [x, y] = unkey(k);
        for (const rot of [0, 1, 3, 2]) {
          const cells = footprint(m.id, rot, x, y),
            occ = occupancy(G.base),
            sid = m.mnt > 1 ? 'girder' : 'frame';
          if (
            !cells.every(
              ([a, b]) =>
                G.ws.has(key(a, b)) &&
                !topAt(key(a, b)) &&
                (!occ.has(key(a, b)) || MOD[baseAt(key(a, b), occ).id].mnt >= m.mnt)
            )
          )
            continue;
          const missing = cells.filter(([a, b]) => !occ.has(key(a, b)));
          if (left(sid) < missing.length) continue;
          const old = G.base,
            nd = new Map(old);
          for (const [a, b] of missing) nd.set(key(a, b), { id: sid, rot: 0, x: a, y: b });
          if (!designConnected(nd)) continue;
          G.base = nd;
          const e = { id: m.id, rot, x, y };
          if (canPlaceTop(m.id, x, y, occupancy(nd), rot) || !safe(G.top, k, e)) {
            G.base = old;
            continue;
          }
          G.top.set(k, e);
          for (const [a, b] of missing) fxPlace(a, b, 'b', key(a, b));
          fxPlace(x, y, 't', k);
          placed += missing.length + 1;
          done = true;
          break;
        }
        if (done) break;
      }
      if (!done) break;
    }
  const ids = looseIds().sort((a, b) => {
    const order = m => (m.layer === 't' ? 3 : m.front ? 2 : m.drive ? 1 : 0);
    return order(MOD[a]) - order(MOD[b]) || MOD[b].mnt - MOD[a].mnt || MOD[b].hp - MOD[a].hp;
  });
  for (const id of ids) {
    const m = MOD[id],
      top = m.layer === 't';
    while (left(id) > 0) {
      const occ = occupancy(G.base);
      let best = null,
        bs = -Infinity;
      for (const k of top ? occ.keys() : G.ws) {
        const [x, y] = unkey(k);
        if (top ? !!topAt(k) : occ.has(k)) continue;
        for (const rot of m.dir || m.size > 1 ? [0, 1, 3, 2] : [0]) {
          if (top ? canPlaceTop(id, x, y, occ, rot) : canPlaceBase(id, rot, x, y, occ)) continue;
          const e = { id, rot, x, y };
          if (!safe(top ? G.top : G.base, k, e)) continue;
          const neighbours = DIRS.filter(([dx, dy]) => occ.has(key(x + dx, y + dy))).length;
          let sc = m.drive
            ? Math.abs(x) * 3 - Math.abs(y) * 0.6
            : m.front
              ? -y * 3 - Math.abs(x) * 0.8
              : -(Math.abs(x) + Math.abs(y) * 1.2) + neighbours * 1.6;
          if (top) sc = m.wpn ? -y * 2 - Math.abs(x) * 0.7 : y - Math.abs(x) * 0.3;
          if (rot !== 0) sc -= 0.5;
          if (m.front) sc += (x * FX[rot] + y * FY[rot]) * 0.25;
          if (sc > bs) {
            bs = sc;
            best = e;
          }
        }
      }
      if (!best) break;
      const k = key(best.x, best.y);
      (top ? G.top : G.base).set(k, best);
      fxPlace(best.x, best.y, top ? 't' : 'b', k);
      placed++;
    }
  }
  if (placed) {
    G.hist.push(before);
    G.redo = [];
    sfx('place');
  }
  refreshUI();
  if (!quiet)
    window.__toast(
      placed
        ? `Placed ${placed} working part${placed > 1 ? 's' : ''}. ${looseCount()} remain in the bin. Ctrl+Z undoes it.`
        : 'No safe placement. Add compatible supports or expand the bay.',
      !!placed
    );
  return placed;
}
function fixAutoDirections() {
  for (let pass = 0; pass < 4; pass++) {
    const bad = blockedList();
    if (!bad.length) break;
    for (const [ly, k] of bad) {
      const map = ly === 'b' ? G.base : G.top,
        e = map.get(k),
        old = e.rot;
      let fixed = false;
      for (const r of [old, 0, 1, 3, 2]) {
        if ((MOD[e.id].size || 1) > 1 && r !== old) continue;
        e.rot = r;
        if (!blockedList().some(([l, bk]) => l === ly && bk === k)) {
          fixed = true;
          break;
        }
      }
      if (!fixed) {
        e.rot = old;
        if (ly === 't') map.delete(k);
        else {
          const nd = new Map(map);
          nd.delete(k);
          if (designConnected(nd)) {
            G.base = nd;
            G.top.delete(k);
          }
        }
      }
    }
  }
}
/** Rebuilds the whole car from everything you own, using the bot's builder. */
function autoBuild() {
  if (!building()) return;
  const historyLength = G.hist.length;
  const before = designKey(),
    d = botBuild({ inv: { ...G.inv }, ws: G.ws, tune: G.tune, found: G.found, likes: [], style: 'gunner' });
  G.base = d.base;
  G.top = d.top;
  G.hist.push(before);
  G.redo = [];
  fixAutoDirections();
  // the sandbox owns 99 of everything: bolting all of it on made 800-tonne bricks with no guns
  if (G.mode !== 'sandbox') autoPlace(true);
  G.hist.length = historyLength;
  G.hist.push(before);
  sfx('legend');
  window.__toast('Rebuilt from everything you own. Ctrl+Z brings your old car back.', true);
}
$('#btnAuto').addEventListener('click', () => autoPlace());
$('#btnAutoBuild').addEventListener('click', autoBuild);

/** Before entering the waiting arena: remind the player about loose parts and unspent coins. */
const SCRAP_JOKES = [
  'Tip: wheels go on the bottom. Usually.',
  'No ducks were harmed. Several were annoyed.',
  'Fun fact: 9 out of 10 mechanics recommend more spikes.',
  'Remember to stretch before ramming.',
  'Your warranty expired when you said “hold my oil can”.',
  'The arena is not responsible for lost hubcaps.',
  'If it rattles, it’s working.',
  'Pro tip: the pointy end goes towards the enemy.',
  'Today’s forecast: 100% chance of scrap.',
  'Please keep all limbs inside the vehicle. You don’t have limbs. Carry on.',
  'Built with love, bolts and bad decisions.',
  'Airbags sold separately.'
];
/* Garage → arena: the lights go out, engines start, the arena door slides open. */
function enterWaitShow() {
  const fx = $('#doorFx');
  if (!fx || SETTINGS.motion === false || REDUCED.on) return enterWait();
  fx.hidden = false;
  fx.className = 'door-fx lights-out';
  const dj = $('#doorJoke');
  if (dj) dj.textContent = pick(SCRAP_JOKES);
  sfx('engine');
  setTimeout(() => {
    fx.classList.add('closed');
  }, 380);
  setTimeout(() => {
    enterWait();
    sfx('door');
    fx.classList.add('open');
  }, 900);
  setTimeout(() => {
    fx.hidden = true;
    fx.className = 'door-fx';
  }, 1700);
}
function readyCheck() {
  const loose = looseCount(),
    rich = G.coins >= 80;
  if (G.mode === 'sandbox' || G.skipReadyWarn || (!loose && !rich)) return enterWaitShow();
  const bits = [];
  if (loose) bits.push(`<b>${loose} loose part${loose > 1 ? 's' : ''}</b> in your bin`);
  if (rich) bits.push(`<b class="coin">${G.coins}</b> unspent coins`);
  $('#readyCard').innerHTML = `<span class="label">Before you roll out</span><h2>Forgetting something?</h2>
    <p>You have ${bits.join(' and ')}. Parts in the bin don’t fight.</p>
    <div class="rbtns">${loose ? '<button class="btn" id="rwAuto">Auto-place and go</button>' : ''}${rich ? '<button class="btn ghost" id="rwShop">Open the shop</button>' : ''}<button class="btn ghost" id="rwGo">Go anyway</button></div>
    <label class="small"><input type="checkbox" id="rwSkip"> Don’t ask again this match</label>`;
  $('#ovReady').hidden = false;
  const close = () => {
    if ($('#rwSkip').checked) G.skipReadyWarn = true;
    $('#ovReady').hidden = true;
  };
  const a = $('#rwAuto');
  if (a)
    a.addEventListener('click', () => {
      close();
      autoPlace(true);
      enterWaitShow();
    });
  const s = $('#rwShop');
  if (s)
    s.addEventListener('click', () => {
      close();
      G.leftTab = 'shop';
      refreshUI();
    });
  $('#rwGo').addEventListener('click', () => {
    close();
    enterWaitShow();
  });
}
