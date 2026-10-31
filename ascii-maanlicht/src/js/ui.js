// ---------- interface: HUD, inventory, map, minimap, floating text ----------
const UI = { open: {}, cursor: {}, dirty: true, map: false, pools: {}, baseMap: null };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function pool(name, n, cls) {
  const root = $('labels');
  const arr = UI.pools[name] || (UI.pools[name] = []);
  while (arr.length < n) {
    const d = document.createElement('div');
    d.className = cls;
    root.appendChild(d);
    arr.push(d);
  }
  arr.forEach((d, i) => (d.style.display = i < n ? '' : 'none'));
  return arr;
}
function place(el, x, y, z) {
  const c = G.cam;
  const sx = x, sy = y * YS + z * ZS;
  const px = (sx - c.snapX) * c.ppu + (Rn.cols * Rn.cw) / 2, py = (sy - c.snapY) * c.ppu + (Rn.rows * Rn.ch) / 2;
  el.style.transform = `translate(${(px / Rn.dpr).toFixed(1)}px,${((Rn.H - py) / Rn.dpr).toFixed(1)}px) translate(-50%,-100%)`;
}
const bar = (v, max, w = 16) => {
  const n = Math.round(clamp(v / max, 0, 1) * w);
  return '█'.repeat(n) + '░'.repeat(w - n);
};

function updateHud() {
  const h = $('huds');
  if (h.childElementCount !== G.players.length) {
    h.innerHTML = '';
    G.players.forEach(p => {
      const d = document.createElement('div');
      d.className = 'hud';
      d.innerHTML = `<canvas width="44" height="66"></canvas><div class="hb"></div>`;
      h.appendChild(d);
      p.hudEl = d;
      p.hudDirty = true;
    });
  }
  for (const p of G.players) {
    const s = stats(p);
    if (p.hudDirty) { drawPortrait(p.hudEl.querySelector('canvas'), p); p.hudDirty = false; }
    p.hudEl.querySelector('.hb').innerHTML =
      `<div><b style="color:${p.tag}">${esc(p.name)}</b> <span class="dim">${p.input.label}</span></div>` +
      `<div>HP <span class="bar hp">${bar(p.hp, s.hpMax)}</span> ${Math.ceil(p.hp)}/${s.hpMax}</div>` +
      `<div>MP <span class="bar mp">${bar(p.mp, s.mpMax)}</span> ${Math.floor(p.mp)}/${s.mpMax}</div>` +
      `<div>XP <span class="bar xp">${bar(p.xp, xpNext(p.level))}</span> LV ${p.level}</div>` +
      `<div class="dim">${p.gold}g · drankjes ${p.potions}${p.dead > 0 ? ' · <span style="color:#ff6a5a">gevallen</span>' : ''}</div>`;
  }
  const w = G.weather;
  $('clock').innerHTML = `${clockText()} · ${G.env.night > 0.5 ? '☾' : '☀'} ${w.state}`;
  $('log').innerHTML = G.msg.map(m => `<div style="color:${m.col};opacity:${clamp(m.t, 0, 1)}">${esc(m.text)}</div>`).join('');
}

function updateLabels() {
  // names
  const tags = [];
  for (const p of G.players) if (p.dead <= 0) tags.push({ x: p.x, y: p.y, z: 2.55, html: `<span style="color:${p.tag}">${esc(p.name)}</span>` });
  for (const r of NET.remotes.values()) if (!r.dead) tags.push({ x: r.rx, y: r.ry, z: 2.55, html: `<span style="color:${r.tag || '#cfd8e3'}">${esc(r.name)} <span class="dim">lv${r.lv}</span></span>` });
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    if (e.def.boss || e.hp < e.hpMax) {
      const near = G.players.some(p => dist(p.x, p.y, e.x, e.y) < 16);
      if (!near) continue;
      tags.push({ x: e.x, y: e.y, z: 2.4 * e.def.scale + 0.1, html: `<span class="${e.def.boss ? 'boss' : ''}">${e.def.nl} <span class="dim">lv${e.level}</span></span><br><span class="ebar">${bar(e.hp, e.hpMax, e.def.boss ? 20 : 8)}</span>` });
    }
  }
  for (const n of G.villagers) if (n.talk > 0) tags.push({ x: n.x, y: n.y, z: 2.5, html: `<span class="speech">${esc(n.line)}</span>` });
  for (const d of G.drops) if (d.item && G.players.some(p => dist(p.x, p.y, d.x, d.y) < 3.5)) tags.push({ x: d.x, y: d.y, z: 0.7, html: `<span style="color:${RARITY[d.item.rarity].col}">${esc(d.item.name)}</span>` });
  for (const c of W.chests) if (!c.open && G.players.some(p => dist(p.x, p.y, c.x, c.y) < 2.2)) tags.push({ x: c.x, y: c.y, z: 1.3, html: `<span class="dim">[E] openen</span>` });
  for (const v of W.villages) if (G.players.some(p => dist(p.x, p.y, v.x, v.y) < 26)) tags.push({ x: v.x, y: v.y + 9, z: 4, html: `<span class="place">${esc(v.name)}</span>` });
  for (const r of W.ruins) if (G.players.some(p => dist(p.x, p.y, r.x, r.y) < 22)) tags.push({ x: r.x, y: r.y + 8, z: 4, html: `<span class="place ruin">${esc(r.name)}</span>` });
  const els = pool('tags', tags.length, 'tag');
  tags.forEach((t, i) => {
    if (els[i]._h !== t.html) { els[i].innerHTML = t.html; els[i]._h = t.html; }
    place(els[i], t.x, t.y, t.z);
  });
  const fl = pool('float', G.floaters.length, 'float');
  G.floaters.forEach((f, i) => {
    const el = fl[i];
    if (el._h !== f.text) { el.textContent = f.text; el._h = f.text; }
    el.style.color = f.col;
    el.style.opacity = clamp(f.t * 2, 0, 1);
    el.style.fontSize = f.big ? '16px' : '12px';
    place(el, f.x, f.y, f.z);
  });
}

// ---------- inventory ----------
function toggleInventory(p) {
  if (UI.open[p.idx]) { UI.open[p.idx] = false; $('inv' + p.idx)?.remove(); return; }
  UI.open[p.idx] = true;
  UI.cursor[p.idx] = UI.cursor[p.idx] || 0;
  const el = document.createElement('div');
  el.className = 'inv';
  el.id = 'inv' + p.idx;
  if (G.players.length > 1) el.classList.add(p.idx % 2 ? 'right' : 'left');
  $('panels').appendChild(el);
  renderInventory(p);
  sfx('blip');
}
function nearFire(p) {
  return W.lights.some(l => l.type === 1 && dist(l.x, l.y, p.x, p.y) < 9);
}
function equip(p, bagIndex) {
  const it = p.bag[bagIndex];
  if (!it) return;
  const old = p.eq[it.slot];
  p.eq[it.slot] = it;
  p.bag.splice(bagIndex, 1);
  if (old) p.bag.splice(bagIndex, 0, old);
  const s = stats(p);
  p.hp = Math.min(p.hp, s.hpMax);
  p.hudDirty = true;
  sfx('equip');
}
function unequip(p, slot) {
  const it = p.eq[slot];
  if (!it || p.bag.length >= 40) return;
  delete p.eq[slot];
  p.bag.push(it);
  p.hudDirty = true;
  sfx('equip');
}
function dropOrSell(p, bagIndex) {
  const it = p.bag[bagIndex];
  if (!it) return;
  p.bag.splice(bagIndex, 1);
  if (nearFire(p)) { p.gold += it.value; say(`${p.name} verkoopt ${it.name} voor ${it.value}g.`, '#ffd76a'); sfx('coin'); }
  else if (isClient()) netSend({ t: 'drop', x: p.x + p.face * 0.8, y: p.y - 0.4, item: it });
  else dropItem(p.x + p.face * 0.8, p.y - 0.4, it);
}
function renderInventory(p) {
  const el = $('inv' + p.idx);
  if (!el) return;
  const s = stats(p);
  const cur = UI.cursor[p.idx];
  const slot = (k, cls) => {
    const it = p.eq[k], i = SLOTS.indexOf(k);
    return `<div class="slot ${cls} ${cur === i ? 'cur' : ''}" data-slot="${k}" data-i="${i}"><span class="sl">${SLOT_NL[k]}</span>${it ? `<canvas width="96" height="60" data-item="eq:${k}"></canvas>` : ''}</div>`;
  };
  const bag = [];
  for (let i = 0; i < 40; i++) {
    const it = p.bag[i];
    bag.push(`<div class="cell ${cur === 7 + i ? 'cur' : ''}" data-bag="${i}" data-i="${7 + i}">${it ? `<canvas width="96" height="64" data-item="bag:${i}" style="border-bottom:2px solid ${RARITY[it.rarity].col}"></canvas>` : ''}</div>`);
  }
  el.innerHTML = `
    <div class="ihead"><span>${esc(p.name.toUpperCase())} · LEVEL ${p.level}</span><span class="dim">${p.input.kind === 'kb0' ? 'sluiten (I)' : p.input.kind === 'kb1' ? 'sluiten (P)' : 'sluiten (Y)'}</span></div>
    <div class="equip">
      ${slot('weapon', 'big')}
      <div class="col">${slot('helm', '')}${slot('amulet', 'small')}</div>
      <div class="portrait"><canvas width="340" height="400" class="pc"></canvas></div>
      <div class="col">${slot('armor', '')}${slot('ring', 'small')}</div>
      <div class="col">${slot('shield', '')}${slot('boots', '')}</div>
    </div>
    <div class="istats">
      level ${p.level} · XP <span class="bar xp">${bar(p.xp, xpNext(p.level), 18)}</span> ${p.xp}/${xpNext(p.level)} · HP ${Math.ceil(p.hp)}/${s.hpMax} · MP ${Math.floor(p.mp)}/${s.mpMax}<br>
      STR ${s.str} · DEX ${s.dex} · INT ${s.int} · pantser ${s.armor} · ontwijken ${s.eva} · schade ${s.dmg[0]}-${s.dmg[1]} · kritiek ${s.crit}% · dps ${s.dps.toFixed(1)}<br>
      goud ${p.gold} · drankjes ${p.potions}
    </div>
    <div class="ibag"><div class="dim bh">Tas ${p.bag.length}/40 <span>klik: dragen/afdoen · rechtsklik: ${nearFire(p) ? 'verkopen' : 'laten vallen'} · toetsen: richting + aanval/actie</span></div><div class="grid">${bag.join('')}</div></div>
    <div class="tip" style="display:none"></div>`;
  drawPortrait(el.querySelector('.pc'), p);
  el.querySelectorAll('canvas[data-item]').forEach(c => {
    const [w, k] = c.dataset.item.split(':');
    const it = w === 'eq' ? p.eq[k] : p.bag[+k];
    if (it) drawIcon(c, it, w === 'eq' ? 18 : 13, w === 'eq' ? 11 : 9);
  });
  const tip = el.querySelector('.tip');
  const itemOf = d => (d.dataset.slot ? p.eq[d.dataset.slot] : d.dataset.bag !== undefined ? p.bag[+d.dataset.bag] : null);
  const showTip = (d, it) => {
    if (!it) { tip.style.display = 'none'; return; }
    const cmp = it.slot && p.eq[it.slot] && p.eq[it.slot] !== it ? p.eq[it.slot] : null;
    tip.innerHTML = `<div style="color:${RARITY[it.rarity].col}">${esc(it.name)}</div>` + itemLines(it).map(l => `<div>${esc(l)}</div>`).join('') + (cmp ? `<div class="dim">nu: ${esc(cmp.name)}</div>` : '');
    tip.style.display = 'block';
    const r = d.getBoundingClientRect(), pr = el.getBoundingClientRect();
    tip.style.left = Math.min(r.left - pr.left + r.width * 0.6, pr.width - 260) + 'px';
    tip.style.top = r.top - pr.top + r.height * 0.6 + 'px';
  };
  el.querySelectorAll('[data-i]').forEach(d => {
    d.onmouseenter = () => showTip(d, itemOf(d));
    d.onmouseleave = () => (tip.style.display = 'none');
    d.onclick = () => {
      if (d.dataset.slot) unequip(p, d.dataset.slot);
      else equip(p, +d.dataset.bag);
      renderInventory(p);
    };
    d.oncontextmenu = e => {
      e.preventDefault();
      if (d.dataset.bag !== undefined) { dropOrSell(p, +d.dataset.bag); renderInventory(p); }
    };
  });
  const cd = el.querySelector(`[data-i="${cur}"]`);
  if (cd && p.input.kind !== 'mouse') showTip(cd, itemOf(cd));
}
function inventoryNav(p, inp) {
  if (!UI.open[p.idx]) return;
  let c = UI.cursor[p.idx];
  let moved = false;
  if (inp.navX || inp.navY) {
    moved = true;
    if (c < 7) {
      c = clamp(c + inp.navX, 0, 6);
      if (inp.navY > 0) c = 7 + Math.min(9, c);
    } else {
      const b = c - 7;
      let x = b % 10, y = Math.floor(b / 10);
      x = clamp(x + inp.navX, 0, 9);
      y += inp.navY;
      c = y < 0 ? Math.min(6, x) : 7 + clamp(y, 0, 3) * 10 + x;
    }
  }
  if (inp.ok) {
    if (c < 7) unequip(p, SLOTS[c]);
    else equip(p, c - 7);
    moved = true;
  }
  if (inp.drop && c >= 7) { dropOrSell(p, c - 7); moved = true; }
  UI.cursor[p.idx] = c;
  if (moved) renderInventory(p);
}

// ---------- map + minimap ----------
const MAP_COL = {
  [M.GRASS]: '#2f5a2a', [M.FOREST]: '#1d3d22', [M.ROAD]: '#7a6448', [M.SAND]: '#a39468', [M.WATER]: '#1f4f78', [M.ROCK]: '#6c6f78',
  [M.RUIN]: '#9a9a96', [M.HOUSE]: '#b0603a', [M.PLAZA]: '#8a857c', [M.MEADOW]: '#4d6d34', [M.FIELD]: '#a8903e', [M.BRIDGE]: '#8a6a3a', [M.RUINFLOOR]: '#5a5c58', [M.POST]: '#ffd28a'
};
const MAP_GLYPH = { [M.GRASS]: '"', [M.FOREST]: '♣', [M.ROAD]: '·', [M.SAND]: ':', [M.WATER]: '~', [M.ROCK]: '^', [M.RUIN]: '#', [M.HOUSE]: '▲', [M.PLAZA]: '+', [M.MEADOW]: '*', [M.FIELD]: '=', [M.BRIDGE]: '=', [M.RUINFLOOR]: '.', [M.POST]: '*' };
function buildBaseMap() {
  const cells = N / 2, cs = 6, chh = 8;
  const c = document.createElement('canvas');
  c.width = cells * cs;
  c.height = cells * chh;
  const x = c.getContext('2d');
  x.fillStyle = '#05070b';
  x.fillRect(0, 0, c.width, c.height);
  x.font = `bold ${chh}px Consolas, Menlo, "DejaVu Sans Mono", monospace`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) {
      const wx = i * 2 + 1, wy = j * 2 + 1;
      let m = matAt(wx, wy);
      const rk = rockAt(wx, wy);
      if (rk > 4.2) m = -1;
      const tree = texel(W.h, wx, wy, 2) > 110 && m === M.FOREST;
      x.fillStyle = m === -1 ? '#d8dde6' : tree ? '#2c6a33' : MAP_COL[m] || '#333';
      const g = m === -1 ? '▲' : tree ? '♠' : MAP_GLYPH[m] || '.';
      x.fillText(g, (i + 0.5) * cs, c.height - (j + 0.5) * chh);
    }
  UI.baseMap = c;
}
function drawMap(canvas, cx, cy, span, full) {
  const ctx = canvas.getContext('2d');
  const Wc = canvas.width, Hc = canvas.height;
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, Wc, Hc);
  const bm = UI.baseMap, cells = N / 2;
  const sx = bm.width / N, sy = bm.height / N;
  const x0 = cx - span / 2, y0 = cy - span / 2;
  const scale = Math.min(Wc, Hc) / span;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bm, x0 * sx, bm.height - (y0 + span) * sy, span * sx, span * sy, (Wc - span * scale) / 2, (Hc - span * scale) / 2, span * scale, span * scale);
  // fog of war
  ctx.fillStyle = 'rgba(5,7,11,0.93)';
  const ox = (Wc - span * scale) / 2, oy = (Hc - span * scale) / 2;
  for (let j = Math.max(0, Math.floor(y0 / 2)); j < Math.min(cells, Math.ceil((y0 + span) / 2)); j++)
    for (let i = Math.max(0, Math.floor(x0 / 2)); i < Math.min(cells, Math.ceil((x0 + span) / 2)); i++)
      if (!W.explored[j * cells + i]) ctx.fillRect(ox + (i * 2 - x0) * scale - 0.5, oy + (y0 + span - (j * 2 + 2)) * scale - 0.5, 2 * scale + 1, 2 * scale + 1);
  const toC = (x, y) => [ox + (x - x0) * scale, oy + (y0 + span - y) * scale];
  ctx.font = `bold ${full ? 13 : 10}px Consolas, Menlo, monospace`;
  ctx.textAlign = 'center';
  const seen = (x, y) => W.explored[Math.floor(y / 2) * cells + Math.floor(x / 2)];
  for (const v of W.villages) if (seen(v.x, v.y)) { const [a, b] = toC(v.x, v.y); ctx.fillStyle = '#ffd28a'; ctx.fillText(full ? '⌂ ' + v.name : '⌂', a, b); }
  for (const r of W.ruins) if (seen(r.x, r.y)) { const [a, b] = toC(r.x, r.y); ctx.fillStyle = '#c58bff'; ctx.fillText(full ? '☠ ' + r.name : '☠', a, b); }
  if (full) for (const c of W.chests) if (!c.open && seen(c.x, c.y)) { const [a, b] = toC(c.x, c.y); ctx.fillStyle = '#ffd76a'; ctx.fillText('$', a, b); }
  for (const p of G.players) { const [a, b] = toC(p.x, p.y); ctx.fillStyle = p.tag; ctx.fillText('@', a, b + 4); }
  for (const r of NET.remotes.values()) { const [a, b] = toC(r.rx, r.ry); ctx.fillStyle = '#e8eef5'; ctx.fillText(full ? '@ ' + r.name : '@', a, b + 4); }
}
function updateMaps() {
  const mm = $('minimap');
  const c = G.cam;
  drawMap(mm, c.sx, c.sy / YS, 70, false);
  if (UI.map) drawMap($('bigmap'), N / 2, N / 2, N, true);
}
