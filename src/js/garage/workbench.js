// Gear spec sheet and work order, shown in the Gear tab of the Garage HQ (js/garage/hq.js).
let wbSel = null,
  wbFilter = 'all',
  wbArmed = null;
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
const lvBadge = g => `<em class="lvb" style="--lc:${lvCol(g.lvl)}">Lv ${g.lvl}</em>`;
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
  for (const S of gearActiveSpecials({ ...g, c5: g.c5 || (g.lvl >= 5 ? 'st' : null) })) {
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
  if (gearEquipped(g)) chips.push('<span class="chip lo">In loadout</span>');
  return chips.join('') || '<span class="chip dim">Fresh from the scrapyard</span>';
}
/** The two specials: a choice at level 5, the legendary one at level 10. */
function wbSpecials(g) {
  const [s5, s10] = gearSpecials(g.id),
    st = gearSteady(g.id),
    card = (S, cls, extra = '') =>
      `<div class="spc ${cls}"><b>${esc(S.name)}</b><span>${esc(S.text)}</span>${S.tbd ? '<em class="tbd">Still to be invented</em>' : ''}${extra}</div>`;
  let five;
  if (g.lvl < 5)
    five = `<div class="sp-opts">${s5 ? card(s5, 'locked') : ''}${card(st, 'locked')}</div><p class="small">At level 5 you pick ${s5 ? 'one of these' : 'this bonus'}.</p>`;
  else if (!g.c5)
    five = `<div class="sp-opts choose">${s5 ? `<button class="spc pickme" data-sp="sp"><b>${esc(s5.name)}</b><span>${esc(s5.text)}</span><i>Pick this</i></button>` : ''}<button class="spc pickme" data-sp="st"><b>${esc(st.name)}</b><span>${esc(st.text)}</span><i>Pick this</i></button></div>`;
  else {
    const on = g.c5 === 'sp' && s5 ? s5 : st,
      other = g.c5 === 'sp' ? st : s5;
    five = `<div class="sp-opts">${card(on, 'on')}${other ? `<button class="btn ghost sm" data-sp="${g.c5 === 'sp' ? 'st' : 'sp'}" ${GEAR.bolts < SPECIAL_SWAP ? 'disabled' : ''}>Swap to ${esc(other.name)} · ${SPECIAL_SWAP} bolts</button>` : ''}</div>`;
  }
  return `<div class="wb-sp"><div class="sprow" style="--lc:${lvCol(5)}"><span class="spl">Lv 5</span>${five}</div>
    <div class="sprow" style="--lc:${lvCol(10)}"><span class="spl">Lv 10</span>${card(s10, g.lvl >= 10 ? 'on legend' : 'locked legend')}</div></div>`;
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
      <div class="wbx-lv"><b>${g.lvl}</b><span>${g.lvl >= GEAR_MAX ? 'LEGEND' : 'LEVEL'}</span></div>
    </div>
    <div class="wbx-head"><span class="wbx-rar">${esc(RAR[m.rar].name)} · ${esc(CATNAME[m.cat])}</span><h3>${esc(m.name)}</h3>
      <div class="wbx-chips">${wbChips(g)}</div></div>
    ${wbSpecials(g)}
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
  const up = max
    ? `<div class="wbx-max">Maxed out. This one is a legend.</div>`
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
