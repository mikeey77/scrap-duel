// Garage Style: Scrap Cred progression, achievements, unlocks and the customization screen.
let PROG = { xp: 0, ach: [] };
function loadStyle() {
  try {
    const p = JSON.parse(load('sd.prog') || 'null');
    if (p && typeof p.xp === 'number') PROG = { xp: p.xp, ach: Array.isArray(p.ach) ? p.ach : [] };
  } catch (e) {}
  let s = {};
  try {
    s = JSON.parse(load('sd.style') || '{}') || {};
  } catch (e) {}
  G.style = { ...DEFAULT_STYLE };
  for (const [slot] of STYLE_SLOTS) {
    const it = COSMETICS[slot].find(i => i.id === s[slot]);
    if (it && isUnlocked(it)) G.style[slot] = it.id;
  }
  if (s.badge) G.style.badge = validBadge(s.badge);
}
const saveProg = () => store('sd.prog', PROG);
const saveStyle = () => store('sd.style', G.style);
function levelInfo(xp = PROG.xp) {
  let lvl = 1,
    left = xp;
  while (left >= xpForLevel(lvl)) left -= xpForLevel(lvl++);
  return { lvl, into: Math.floor(left), need: xpForLevel(lvl) };
}
function isUnlocked(item, xp = PROG.xp, ach = PROG.ach) {
  const u = item.unlock;
  if (!u) return true;
  if (u.lvl) return levelInfo(xp).lvl >= u.lvl;
  return ach.includes(u.ach);
}
const allItems = () => STYLE_SLOTS.flatMap(([slot]) => COSMETICS[slot].map(i => ({ ...i, slot })));
const unlockedCount = () => allItems().filter(i => isUnlocked(i)).length;
const totalCosmetics = () => allItems().length;
const unlockText = u =>
  !u
    ? 'Starter item'
    : u.lvl
      ? `Reach Scrap Cred level ${u.lvl}`
      : `Achievement: ${ACHIEVEMENTS[u.ach].name} (${ACHIEVEMENTS[u.ach].desc})`;

/** Applies XP and achievements, returning what changed so the result screen can celebrate it. */
function grant(xp, achIds) {
  const before = allItems()
      .filter(i => isUnlocked(i))
      .map(i => i.slot + i.id),
    lvl0 = levelInfo().lvl;
  PROG.xp += xp;
  const newAch = achIds.filter(a => ACHIEVEMENTS[a] && !PROG.ach.includes(a));
  PROG.ach.push(...newAch);
  saveProg();
  const unlocked = allItems().filter(i => isUnlocked(i) && !before.includes(i.slot + i.id));
  return { xp, newAch, unlocked, lvl0, lvl: levelInfo().lvl };
}
function progressRound({ win, special, integ, by, powers = 0 }) {
  if (G.mode === 'sandbox') return null;
  const ach = [],
    S = special && SPECIALS[special];
  let xp = XP.round + (win ? XP.roundWin : 0) + (win && S ? XP.specialWin : 0);
  if (win) ach.push('first_win');
  if (win && integ >= 0.9) ach.push('flawless');
  if (win && S && (S.kind === 'objective' || special === 'night' || special === 'sumo')) ach.push(special);
  if (powers >= 3) ach.push('powered');
  if ((by.fire || 0) >= 400) ach.push('pyro');
  if ((by.expl || 0) >= 600) ach.push('boom');
  if (G.found.size >= 50) ach.push('collector');
  return grant(xp, ach);
}
function progressMatch({ won }) {
  if (G.mode === 'sandbox') return null;
  const ach = [];
  if (won) {
    ach.push('match_win');
    if (G.mode === 'solo' && G.diff === 2) ach.push('hard_win');
    if (G.mode === 'mp') ach.push('mp_win');
    if (G.maxDeficit >= 10) ach.push('comeback');
  }
  return grant(XP.match + (won ? XP.matchWin : 0), ach);
}
function progressHtml(p) {
  if (!p) return '';
  const L = levelInfo();
  return `<div class="prog"><div class="prow"><b>+${p.xp} Scrap Cred</b><span>Level ${L.lvl}${p.lvl > p.lvl0 ? ' · LEVEL UP!' : ''}</span></div><div class="xpbar"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></div>
    ${p.newAch.map(a => `<div class="achv">Achievement · <b>${esc(ACHIEVEMENTS[a].name)}</b> <span>${esc(ACHIEVEMENTS[a].desc)}</span></div>`).join('')}
    ${p.unlocked.map(i => `<div class="unl">Unlocked ${esc(STYLE_SLOTS.find(s => s[0] === i.slot)[1].toLowerCase())}: <b>${esc(i.name)}</b></div>`).join('')}</div>`;
}

/* ---------- the Garage Style screen ---------- */
let styleTab = 'livery',
  styleBack = null;
function openStyle(back) {
  styleBack = back || null;
  renderStyle();
  $('#ovStyle').hidden = false;
}
function stylePreviewDesign() {
  if (G.base && G.base.size > 1) return myDesign();
  const save = { base: G.base, top: G.top };
  defaultCar();
  const d = { base: G.base, top: G.top };
  G.base = save.base;
  G.top = save.top;
  return d;
}
/* Small previews in the Garage Style grid: liveries on your own car, a glyph for the rest. */
const _stylePrev = {};
const STYLE_GLYPH = {
  trail: {
    none: '·',
    sparks: '✦',
    smoke: '☁',
    bubbles: '◌',
    rainbow: '≋',
    ember: '✺',
    notes: '♪',
    zap: 'ϟ',
    hearts: '♥',
    pixels: '▦',
    comet: '☄',
    coins: '●'
  },
  wreck: { classic: '🔥', confetti: '🎉', glitter: '✨', pixels: '▦', ducks: '🦆', notes: '♫' }
};
function stylePreview(slot, id) {
  if (slot === 'livery') {
    const k = id + G.paint;
    if (!_stylePrev[k]) {
      try {
        _stylePrev[k] = designURL(stylePreviewDesign(), 120, G.paint, id);
      } catch (e) {
        _stylePrev[k] = '';
      }
    }
    return _stylePrev[k] ? `<img class="st-prev" alt="" src="${_stylePrev[k]}">` : '';
  }
  const g = (STYLE_GLYPH[slot] || {})[id];
  return g ? `<span class="st-glyph" aria-hidden="true">${g}</span>` : '';
}
function renderStyle() {
  const L = levelInfo(),
    items = COSMETICS[styleTab];
  let img = '';
  try {
    img = designURL(stylePreviewDesign(), 260, G.paint, G.style.livery);
  } catch (e) {}
  $('#ovStyle').innerHTML = `<div class="style">
    <header><div><span class="label">Garage Style</span><h2>${esc(G.name)} <span class="ttl">${esc(titleName(G.style.title))}</span></h2></div>
      <div class="lvl"><span class="lv">${L.lvl}</span><div><b>Scrap Cred level ${L.lvl}</b><div class="xpbar"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></div><span class="small">${L.into} / ${L.need} XP · ${unlockedCount()} of ${totalCosmetics()} items</span></div></div>
      <button class="btn ghost" id="stBack">Done</button></header>
    <div class="stbody"><div class="stprev"><img src="${img}" alt="Your car with the ${esc(G.style.livery)} livery"><span class="small">Paint colour is set in the garage. Cosmetics never change stats.</span>
      ${badgeEditorHTML()}
      <span class="label">Achievements · ${PROG.ach.length}/${Object.keys(ACHIEVEMENTS).length}</span><div class="achlist">${Object.entries(
        ACHIEVEMENTS
      )
        .map(
          ([id, a]) => `<span class="${PROG.ach.includes(id) ? 'on' : ''}" title="${esc(a.desc)}">${esc(a.name)}</span>`
        )
        .join('')}</div></div>
      <div class="stright"><div class="tabs">${STYLE_SLOTS.map(([s, n]) => `<button data-tab="${s}" aria-pressed="${s === styleTab}">${n}</button>`).join('')}</div>
      <div class="stgrid">${items
        .map(it => {
          const un = isUnlocked(it),
            on = G.style[styleTab] === it.id;
          return `<button class="stitem${on ? ' on' : ''}${un ? '' : ' locked'}" data-id="${it.id}" ${un ? '' : 'aria-disabled="true"'}>${stylePreview(styleTab, it.id)}<b>${esc(it.name)}</b><span>${esc(un ? it.desc : unlockText(it.unlock))}</span>${on ? '<i>Equipped</i>' : un ? '' : '<i>Locked</i>'}</button>`;
        })
        .join('')}</div></div></div></div>`;
  $$('#ovStyle [data-bk]').forEach(b =>
    b.addEventListener('click', () => {
      const p = parseBadge(G.style.badge),
        k = b.dataset.bk,
        v = b.dataset.bv;
      if (k === 'sh') p.sh = v;
      else if (k === 'sy') p.sy = v;
      else p.ci = +v;
      G.style.badge = `${p.sh}.${p.sy}.${p.ci}`;
      saveStyle();
      sfx('place');
      renderStyle();
    })
  );
  $$('#ovStyle [data-tab]').forEach(b =>
    b.addEventListener('click', () => {
      styleTab = b.dataset.tab;
      sfx('ui');
      renderStyle();
    })
  );
  $$('#ovStyle .stitem').forEach(b =>
    b.addEventListener('click', () => {
      const it = items.find(i => i.id === b.dataset.id);
      if (!isUnlocked(it)) {
        sfx('remove');
        return;
      }
      G.style[styleTab] = it.id;
      saveStyle();
      sfx('place');
      renderStyle();
    })
  );
  $('#stBack').addEventListener('click', () => {
    $('#ovStyle').hidden = true;
    sfx('ui');
    if (styleBack) styleBack();
  });
}
