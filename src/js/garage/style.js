// The Locker: Scrap Cred progression, achievements, unlocks, and the screen for skins, stickers, trails and titles.
let PROG = { xp: 0, ach: [] };
function loadStyle() {
  try {
    const p = JSON.parse(load('sd.prog') || 'null');
    if (p && typeof p.xp === 'number')
      PROG = {
        xp: p.xp,
        ach: Array.isArray(p.ach) ? p.ach : [],
        presets: Array.isArray(p.presets) ? p.presets.slice(0, 3).map(x => (x && x.style ? x : null)) : []
      };
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
  G.style.stickers = Array.isArray(s.stickers)
    ? [...new Set(s.stickers.filter(id => STICKER[id] && stickerUnlocked(STICKER[id])))].slice(0, STICKER_SLOTS)
    : [];
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
      : u.story
        ? `Scrap Road: beat ${STORY_BY[u.story].name}`
        : `Achievement: ${ACHIEVEMENTS[u.ach].name} (${ACHIEVEMENTS[u.ach].desc})`;

/** Applies XP and achievements, returning what changed so the result screen can celebrate it. */
function grant(xp, achIds) {
  const before = allItems()
      .filter(i => isUnlocked(i))
      .map(i => i.slot + i.id),
    lvl0 = levelInfo().lvl,
    st0 = STICKERS.filter(stickerUnlocked).map(x => x.id);
  PROG.xp += xp;
  const newAch = achIds.filter(a => ACHIEVEMENTS[a] && !PROG.ach.includes(a));
  PROG.ach.push(...newAch);
  saveProg();
  const unlocked = allItems().filter(i => isUnlocked(i) && !before.includes(i.slot + i.id));
  const stickers = STICKERS.filter(x => stickerUnlocked(x) && !st0.includes(x.id));
  return { xp, newAch, unlocked, stickers, lvl0, lvl: levelInfo().lvl };
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
    ${p.unlocked.map(i => `<div class="unl">Unlocked ${esc(STYLE_SLOTS.find(s => s[0] === i.slot)[1].toLowerCase())}: <b>${esc(i.name)}</b></div>`).join('')}
    ${(p.stickers || []).map(x => `<div class="unl">Unlocked sticker: <b>${esc(x.name)}</b> · ${esc(x.perk)}</div>`).join('')}</div>`;
}

/* ---------- look helpers for the Garage HQ ---------- */
function stylePreviewDesign() {
  if (G.base && G.base.size > 1) return myDesign();
  const save = { base: G.base, top: G.top };
  defaultCar();
  const d = { base: G.base, top: G.top };
  G.base = save.base;
  G.top = save.top;
  return d;
}
/* Small previews in the Locker grid: skins on your own car, a glyph for the rest. */
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
  wreck: { classic: '✹', confetti: '❋', glitter: '✧', pixels: '▦', ducks: '◒', notes: '♫' }
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
const setTag = set =>
  set ? `<em class="settag" style="--sc:${STICKER_SETS[set].col}">${esc(STICKER_SETS[set].name)}</em>` : '';
/** The set panel: which set your skin belongs to and how close you are to its bonus. */
function setPanelHtml() {
  const set = liverySet(G.style.livery),
    have = (G.style.stickers || []).filter(id => STICKER[id].set === set).length;
  if (!set)
    return `<div class="setp off"><b>No set</b><span>The ${esc(COSMETICS.livery.find(i => i.id === G.style.livery).name)} skin has no sticker set. Pick a skin with a set tag to unlock a set bonus.</span></div>`;
  const S = STICKER_SETS[set],
    on = have >= 2;
  return `<div class="setp${on ? ' on' : ''}" style="--sc:${S.col}"><b>${esc(S.name)} set · ${Math.min(have, 2)}/2</b><span>${on ? 'Active: ' : 'Wear two ' + esc(S.name) + ' stickers with this skin: '}${esc(S.bonus)}</span></div>`;
}
function stickerSlotsHtml() {
  const st = G.style.stickers || [];
  return `<div class="stslots">${Array.from({ length: STICKER_SLOTS }, (_, i) =>
    st[i]
      ? `<button class="stslot on" data-rm="${st[i]}" title="Remove ${esc(STICKER[st[i]].name)}"><img alt="" src="${stickerURL(st[i], 72)}"><span>${esc(STICKER[st[i]].name)}</span></button>`
      : `<div class="stslot"><span>Empty slot</span></div>`
  ).join('')}</div>`;
}
