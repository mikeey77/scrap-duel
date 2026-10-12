// Gear spec sheet and work order, shown in the Gear tab of the Garage HQ (js/garage/hq.js).
let wbSel = null,
  wbFilter = 'all',
  wbArmed = null,
  wbSock = null; // the chip socket whose picker is open
const WB_FILTERS = [
  ['all', 'All'],
  ['weapon', 'Weapons'],
  ['melee', 'Melee'],
  ['armour', 'Armour'],
  ['move', 'Movement'],
  ['other', 'Other']
];
function wbMatch(g) {
  const c = MOD[g.id].cat;
  if (wbFilter === 'all') return true;
  if (wbFilter === 'armour') return c === 'struct' || c === 'defense';
  if (wbFilter === 'other') return c === 'utility' || c === 'chaos';
  return c === wbFilter;
}
/** Ten pips, each lit in the colour of its own level. */
const lvPips = g =>
  `<span class="lvpips" aria-label="Level ${g.lvl} of ${GEAR_MAX}">${Array.from({ length: GEAR_MAX }, (_, i) => `<i class="${i < g.lvl ? 'on' : ''}${i === 4 || i === 9 ? ' ms' : ''}" style="--lc:${lvCol(i + 1)}"></i>`).join('')}</span>`;
const starTxt = g => (g.s ? `<i class="gstars" title="Reforged ${g.s}×">${'✦'.repeat(g.s)}</i>` : '');
const lvBadge = g => `<em class="lvb" style="--lc:${lvCol(g.lvl)}">Lv ${g.lvl}${starTxt(g)}</em>`;
/** Multipliers a gear piece gives at a level, mirroring applyGear (for the spec sheet). */
function gearEffects(g) {
  const k = gearKind(g.id),
    b = gearBonus(g);
  const e = { hp: k === 'hp' ? 1 + b : 1, dmg: k === 'dmg' ? 1 + b : 1, speed: k === 'speed' ? b : 0 };
  const q = g.q;
  if (q === 'overclock') e.dmg *= 1.2;
  if (q === 'bulky') ((e.hp *= 1.35), (e.speed -= 0.03));
  if (q === 'feather') ((e.hp *= 0.8), (e.speed += 0.03));
  if (q === 'spiky' || q === 'tantrum') e.hp *= 0.9;
  if (q === 'showoff') e.hp *= 0.85;
  if (q === 'selfheal' || q === 'magnetic') e.speed -= 0.02;
  for (const S of gearActiveSpecials({ ...g, c5: g.c5 || (g.lvl >= 5 ? 'sp' : null) })) {
    if (!S) continue;
    if (S.fx.dmg) e.dmg *= S.fx.dmg;
    if (S.fx.rate) e.dmg *= S.fx.rate;
    if (S.fx.hp) e.hp *= S.fx.hp;
    if (S.fx.speed) e.speed += S.fx.speed;
  }
  return e;
}
const pct = v => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 100))}%`;
/** The level ring: ten segments in their level colours, the next one filling up with XP. */
function wbRing(g) {
  const r = 88,
    C = 2 * Math.PI * r,
    seg = C / 10,
    gap = 5,
    f = g.lvl >= GEAR_MAX ? 0 : clamp((g.xp || 0) / gearNeed(g.lvl), 0, 1);
  let arcs = '';
  for (let i = 0; i < 10; i++) {
    const on = i < g.lvl,
      dash = `${seg - gap} ${C - seg + gap}`,
      off = -i * seg;
    arcs += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${on ? lvCol(i + 1) : 'rgba(255,255,255,.08)'}" stroke-width="${on ? 9 : 7}" stroke-dasharray="${dash}" stroke-dashoffset="${off}" ${on ? `style="filter:drop-shadow(0 0 4px ${lvCol(i + 1)})"` : ''}/>`;
    if (i === g.lvl && f > 0)
      arcs += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${lvCol(i + 1)}" stroke-opacity=".55" stroke-width="7" stroke-dasharray="${(seg - gap) * f} ${C}" stroke-dashoffset="${off}"/>`;
  }
  return `<svg class="wbx-ring" viewBox="0 0 200 200" aria-hidden="true"><g transform="rotate(-90 100 100)">${arcs}</g></svg>`;
}
/** Short chips for what this piece does right now. */
function wbChips(g) {
  const k = gearKind(g.id),
    b = gearBonus(g),
    chips = [];
  if (b) chips.push(`<span class="chip">${pct(b)} ${esc(GEAR_KIND_TEXT[k])}</span>`);
  for (const S of gearActiveSpecials(g)) if (S) chips.push(`<span class="chip sp">★ ${esc(S.name)}</span>`);
  if (g.q) chips.push(`<span class="chip q">${esc(QUIRKS[g.q].name)}</span>`);
  for (const k of gearChipsOn(g))
    chips.push(`<span class="chip mc" style="--cc:${CHIPS[chipParse(k).c].col}">${esc(chipName(k))}</span>`);
  chips.push(`<span class="chip fam">${esc(FAMILY_NAME[gearFamily(g.id)])}</span>`);
  if (gearEquipped(g)) chips.push('<span class="chip lo">In loadout</span>');
  return chips.join('') || '<span class="chip dim">Fresh from the scrapyard</span>';
}
/** Level 5: option A or B, side by side. Level 10: the legendary special. */
function wbSpecials(g) {
  const opts = gearOptions5(g.id),
    s10 = gearSpecials(g.id)[1],
    keys = ['sp', 'sp2'];
  const five = opts
    .map((S, i) => {
      const k = keys[i],
        tag = `<em class="ab">${'AB'[i]}</em>`;
      if (g.lvl < 5) return `<div class="spc locked">${tag}<b>${esc(S.name)}</b><span>${esc(S.text)}</span></div>`;
      if (!g.c5)
        return `<button class="spc pickme" data-sp="${k}">${tag}<b>${esc(S.name)}</b><span>${esc(S.text)}</span><i>Pick ${'AB'[i]}</i></button>`;
      if (g.c5 === k)
        return `<div class="spc on">${tag}<b>${esc(S.name)}</b><span>${esc(S.text)}</span><i>Fitted</i></div>`;
      return `<button class="spc alt" data-sp="${k}" ${GEAR.bolts < SPECIAL_SWAP ? 'disabled' : ''}>${tag}<b>${esc(S.name)}</b><span>${esc(S.text)}</span><i>Switch · ${SPECIAL_SWAP} bolts</i></button>`;
    })
    .join('');
  return `<div class="wb-sp"><div class="sprow" style="--lc:${lvCol(5)}"><span class="spl">Lv 5</span><div class="sp-opts ab${g.lvl >= 5 && !g.c5 ? ' choose' : ''}">${five}</div></div>
    <div class="sprow" style="--lc:${lvCol(10)}"><span class="spl">Lv 10</span><div class="spc ${g.lvl >= 10 ? 'on legend' : 'locked legend'}"><b>${esc(s10.name)}</b><span>${esc(s10.text)}</span>${s10.tbd ? '<em class="tbd">Still to be invented</em>' : ''}</div></div></div>`;
}
/** Three chip sockets (open at level 3, 6 and 9) and, when one is clicked, the chips you can put in. */
function wbSockets(g) {
  const ch = g.ch || [];
  const socks = CHIP_SOCKETS.map((lv, i) => {
    if (!socketOpen(g, i))
      return `<div class="sock locked" style="--lc:${lvCol(lv)}"><span>Opens at</span><b>Lv ${lv}</b></div>`;
    const k = ch[i];
    return k
      ? `<button class="sock full${wbSock === i ? ' sel' : ''}" data-sock="${i}" style="--cc:${CHIPS[chipParse(k).c].col}">${chipIcon(k, 40)}<b>${esc(chipName(k))}</b><span>${esc(CHIPS[chipParse(k).c].text(chipParse(k).t))}</span></button>`
      : `<button class="sock empty${wbSock === i ? ' sel' : ''}" data-sock="${i}"><i>+</i><span>Add a chip</span></button>`;
  }).join('');
  let pick = '';
  if (wbSock != null && socketOpen(g, wbSock)) {
    const own = Object.keys(GEAR.chips)
      .filter(k => GEAR.chips[k] > 0)
      .sort();
    pick = `<div class="chippick">${
      own.length
        ? own
            .map(k => {
              const p = chipParse(k);
              return `<button class="chipbtn" data-chip="${k}" style="--cc:${CHIPS[p.c].col}">${chipIcon(k, 30)}<span><b>${esc(chipName(k))}</b>${esc(CHIPS[p.c].text(p.t))}</span><em>×${GEAR.chips[k]}</em></button>`;
            })
            .join('')
        : '<p class="small">No chips in your case yet. You find them after matches, and every Gauntlet boss drops a Mk II.</p>'
    }${ch[wbSock] ? '<button class="btn ghost sm" id="sockOut">Take the chip out</button>' : ''}</div>`;
  }
  return `<div class="wbx-sock"><span class="label">Mod chips</span><div class="socks">${socks}</div>${pick}</div>`;
}
function wbDetail(g) {
  if (!g)
    return `<div class="wb-empty"><h3>No gear yet</h3><p>Win matches and clear Gauntlet waves to find gear.</p></div>`;
  const m = MOD[g.id],
    q = g.q && QUIRKS[g.q];
  let quirk = '';
  if (q)
    quirk = `<div class="wbx-q"><span>Quirk</span><b>${esc(q.name)}</b><em class="pro">+ ${esc(q.pro)}</em><em class="con">− ${esc(q.con)}</em><button class="btn ghost sm" id="wbReroll" ${GEAR.bolts < QUIRK_REROLL ? 'disabled' : ''}>Reroll · ${QUIRK_REROLL}</button></div>`;
  else if (g.qo && g.qo.length)
    quirk = `<div class="wbx-q pick"><span>Pick a quirk</span><div class="qopts">${g.qo
      .map(
        id =>
          `<button class="qopt" data-q="${id}"><b>${esc(QUIRKS[id].name)}</b><span class="pro">+ ${esc(QUIRKS[id].pro)}</span><span class="con">− ${esc(QUIRKS[id].con)}</span></button>`
      )
      .join('')}</div></div>`;
  return `<div class="wbx${g.lvl >= GEAR_MAX ? ' legend' : ''}" style="--lc:${lvCol(g.lvl)};--rc:${RAR[m.rar].col}">
    <div class="wbx-stage">
      <div class="wbx-glow"></div>${wbRing(g)}
      <img class="wbx-part" alt="" src="${iconURL(g.id, 256)}">
      <div class="wbx-lv"><b>${g.lvl}</b><span>${g.lvl >= GEAR_MAX ? 'LEGEND' : 'LEVEL'}</span>${g.s ? `<i class="gstars">${'✦'.repeat(g.s)}</i>` : ''}</div>
    </div>
    <div class="wbx-head"><span class="wbx-rar">${esc(RAR[m.rar].name)} · ${esc(CATNAME[m.cat])}</span><h3>${esc(m.name)}</h3>
      <div class="wbx-chips">${wbChips(g)}</div></div>
    ${wbSpecials(g)}
    ${wbSockets(g)}
    ${quirk}
  </div>`;
}
/** Right column: one big upgrade button, the XP bar, and the small actions. */
function wbOrder(g) {
  if (!g) return '';
  const m = MOD[g.id],
    max = g.lvl >= GEAR_MAX,
    cost = max ? 0 : gearCost(g),
    ready = gearReady(g),
    dup = GEAR.items.find(x => x !== g && x.id === g.id),
    short = cost - GEAR.bolts,
    need = gearNeed(g.lvl) - (g.xp || 0);
  const stars = g.s || 0,
    up = max
      ? canReforge(g)
        ? `<div class="wbx-max">Level 10 reached.</div><button class="btn wbx-up reforge${GEAR.bolts >= REFORGE_COST ? ' go' : ''}" id="wbReforge" ${GEAR.bolts >= REFORGE_COST ? '' : 'disabled'}><b>Reforge for a star ${'✦'.repeat(stars + 1)}</b><span>Back to level 1, +2% forever · <i class="boltico" aria-hidden="true"></i> ${REFORGE_COST}</span></button>`
        : `<div class="wbx-max">Five stars and level 10. It does not get better than this.</div>`
      : `<button class="btn wbx-up${ready && short <= 0 ? ' go' : ''}" id="wbUp" ${ready && short <= 0 ? '' : 'disabled'}>${
          !ready
            ? `<b>Play ${need} more XP</b><span>with it in your car</span>`
            : short > 0
              ? `<b>Need ${short} more bolts</b><span>win rounds to earn them</span>`
              : `<b>Upgrade to level ${g.lvl + 1}</b><span><i class="boltico" aria-hidden="true"></i> ${cost} bolts</span>`
        }</button>`;
  return `<div class="wbx-order" style="--lc:${lvCol(g.lvl)}">
    ${max ? '' : `<div class="wbx-xp"><span class="label">XP to level ${g.lvl + 1}</span>${xpBar(g)}</div>`}
    ${up}
    <div class="wbx-acts">
      <button class="btn ${gearEquipped(g) ? 'ghost' : 'ok'}" id="wbEquip">${gearEquipped(g) ? 'Take out of loadout' : `Put in loadout · ${GEAR.loadout.length}/${loadoutSlots()}`}</button>
      ${dup ? `<button class="btn ghost" id="wbFuse" title="Your other ${esc(m.name)} becomes XP for this one">Fuse in the spare (+XP)</button>` : ''}
      <div class="wb-row2"><button class="btn ghost sm" id="wbLock" aria-pressed="${gearLocked(g)}">${gearLocked(g) ? 'Locked' : 'Lock'}</button>
      <button class="btn ghost warn sm" id="wbScrap" ${gearLocked(g) ? 'disabled' : ''}>${wbArmed === g.u ? 'Sure? Click again' : `Scrap · ${gearScrapValue(g)} bolts`}</button></div>
    </div>
    <button class="wl-help wbx-help" type="button">How do XP and bolts work?</button>
  </div>`;
}
