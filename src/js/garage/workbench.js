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
/** Blueprint schematic: the part on a grid with dimension lines and callouts. */
function wbSchematic(g) {
  const m = MOD[g.id],
    b = shapeBounds(m),
    cells = `${b.w}×${b.h}`,
    code = `SD-${g.id.toUpperCase().slice(0, 6)}-${String(g.u).padStart(4, '0')}`;
  return `<svg class="wb-schem" viewBox="0 0 520 250" role="img" aria-label="Schematic of ${esc(m.name)}">
    <defs><pattern id="wbgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(91,231,255,.09)"/></pattern></defs>
    <rect width="520" height="250" fill="url(#wbgrid)"/>
    <g stroke="#5be7ff" stroke-width="1" fill="none" opacity=".55">
      <path d="M150 40h220M150 34v12M370 34v12"/><path d="M400 70v130M394 70h12M394 200h12"/>
      <circle cx="260" cy="135" r="86" stroke-dasharray="3 6"/><path d="M260 35v20M260 215v20M160 135h20M340 135h20"/>
    </g>
    <image href="${iconURL(g.id, 184)}" x="195" y="70" width="130" height="130"/>
    <g font-family="Chakra Petch" font-size="12" fill="#7fb8d6">
      <text x="260" y="30" text-anchor="middle">${cells} CELL${b.w * b.h > 1 ? 'S' : ''}</text>
      <text x="410" y="139" transform="rotate(90 410 139)" text-anchor="middle">${esc((m.layer === 't' ? 'NEEDS ' + MOUNTNAME[m.mnt] : m.mnt ? 'GIVES ' + MOUNTNAME[m.mnt] : 'NO SOCKET').toUpperCase())}</text>
      <text x="16" y="24">${code}</text>
      <text x="16" y="42" fill="#8da3c2">REV ${g.lvl}.${g.q ? 'Q' : '0'} · ${esc(RAR[m.rar].name.toUpperCase())}</text>
      <text x="16" y="232" fill="#8da3c2">MASS ${m.mass} t</text>
      <text x="504" y="232" text-anchor="end" fill="#8da3c2">${esc(CATNAME[m.cat].toUpperCase())}</text>
    </g>
    <rect x="1" y="1" width="518" height="248" fill="none" stroke="${lvCol(g.lvl)}" stroke-width="${g.lvl >= GEAR_MAX ? 3 : 1.5}" opacity="${g.lvl >= GEAR_MAX ? 1 : 0.6}"/>
  </svg>`;
}
/** Readout: base part, now, and after the next upgrade. */
function wbReadout(g) {
  const m = MOD[g.id],
    now = gearEffects(g),
    nxt = g.lvl < GEAR_MAX ? gearEffects({ ...g, lvl: g.lvl + 1 }) : null,
    dps = dpsOf(m.id, {}),
    row = (label, base, a, b, fmt) =>
      `<tr><th scope="row">${label}</th><td>${fmt(base)}</td><td class="now">${fmt(a)}</td><td class="nx">${b == null ? '—' : fmt(b)}</td></tr>`;
  const rows = [row('Hit points', m.hp, m.hp * now.hp, nxt && m.hp * nxt.hp, v => Math.round(v))];
  if (dps) rows.push(row('DPS', dps, dps * now.dmg, nxt && dps * nxt.dmg, v => Math.round(v)));
  else if (now.dmg !== 1 || (nxt && nxt.dmg !== 1))
    rows.push(row('Damage', 1, now.dmg, nxt && nxt.dmg, v => `×${v.toFixed(2)}`));
  if (now.speed || (nxt && nxt.speed)) rows.push(row('Car top speed', 0, now.speed, nxt && nxt.speed, v => pct(v)));
  return `<table class="wb-read"><thead><tr><th></th><th scope="col">Base</th><th scope="col">Lv ${g.lvl}</th><th scope="col">${nxt ? 'Lv ' + (g.lvl + 1) : 'Max'}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
/** Level curve: the level bonus at each of the ten levels, in the level colours; stars on 5 and 10. */
function wbCurve(g) {
  const vals = Array.from({ length: GEAR_MAX }, (_, i) => gearBonus({ ...g, lvl: i + 1 })),
    max = vals[GEAR_MAX - 1] || 1;
  return `<div class="wb-curve" aria-label="Bonus per level">${vals
    .map(
      (v, i) =>
        `<div class="cv${i + 1 <= g.lvl ? ' on' : ''}${i + 1 === g.lvl + 1 ? ' nx' : ''}" style="--lc:${lvCol(i + 1)}" title="Level ${i + 1}: ${pct(v)}"><i style="height:${Math.max(6, Math.round((v / max) * 100))}%"></i><b>${i === 4 || i === 9 ? '★' : ''}</b><span>${i + 1}</span></div>`
    )
    .join(
      ''
    )}<p class="small">${pct(gearBonus({ ...g, lvl: GEAR_MAX }))} ${esc(GEAR_KIND_TEXT[gearKind(g.id)])} at level 10 · ★ special</p></div>`;
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
    return `<div class="wb-empty"><h3>No gear yet</h3><p>Win matches, clear Gauntlet waves and finish Scrap Road missions to find gear.</p></div>`;
  const m = MOD[g.id],
    q = g.q && QUIRKS[g.q];
  let quirk;
  if (q)
    quirk = `<div class="wb-q on"><span class="qtag">Quirk</span><b>${esc(q.name)}</b><p class="pro">+ ${esc(q.pro)}</p><p class="con">− ${esc(q.con)}</p><button class="btn ghost sm" id="wbReroll" ${GEAR.bolts < QUIRK_REROLL ? 'disabled' : ''}>Reroll quirk · ${QUIRK_REROLL} bolts</button></div>`;
  else if (g.qo && g.qo.length)
    quirk = `<div class="wb-q pick"><span class="qtag">Pick a quirk</span><span class="small">Every quirk is a trade-off. You can reroll later.</span><div class="qopts">${g.qo
      .map(
        id =>
          `<button class="qopt" data-q="${id}"><b>${esc(QUIRKS[id].name)}</b><span class="pro">+ ${esc(QUIRKS[id].pro)}</span><span class="con">− ${esc(QUIRKS[id].con)}</span></button>`
      )
      .join('')}</div></div>`;
  else quirk = `<div class="wb-q locked"><span class="qtag">Quirk</span><span>Slot unlocks at level 3.</span></div>`;
  return `<div class="wb-title"><span class="label" style="color:${RAR[m.rar].col}">${RAR[m.rar].name} · ${esc(CATNAME[m.cat])}${g.from ? ' · found in ' + esc(g.from) : ''}</span>
      <h3>${esc(MOD[g.id].name)} ${lvBadge(g)}${g.lvl >= GEAR_MAX ? ' <em class="mwtag">Legendary</em>' : ''}</h3></div>
    ${wbSchematic(g)}
    ${wbSpecials(g)}
    <div class="wb-grid2">${wbReadout(g)}${wbCurve(g)}</div>
    ${quirk}`;
}
/** Right column: the work order for the selected piece. */
function wbOrder(g) {
  if (!g) return '';
  const m = MOD[g.id],
    max = g.lvl >= GEAR_MAX,
    cost = max ? 0 : gearCost(g),
    ready = gearReady(g),
    dup = GEAR.items.find(x => x !== g && x.id === g.id),
    after = GEAR.bolts - cost,
    need = gearNeed(g.lvl) - (g.xp || 0);
  const up = max
    ? ''
    : !ready
      ? `<button class="btn" id="wbUp" disabled>Play ${need} XP more with it</button>`
      : `<button class="btn" id="wbUp" ${after < 0 ? 'disabled' : ''}>${after < 0 ? `Need ${-after} more bolts` : `Upgrade to level ${g.lvl + 1}`}</button>`;
  return `<h3>Work order</h3>
    <div class="wb-xp"><span class="label">Experience · Lv ${g.lvl}</span>${xpBar(g)}</div>
    <dl class="wb-bill"><dt>Bolts in stock</dt><dd>${GEAR.bolts}</dd>
      ${max ? '<dt>Status</dt><dd>Max level</dd>' : `<dt>Upgrade to Lv ${g.lvl + 1}</dt><dd class="neg">−${cost}</dd><dt>Left after</dt><dd class="${after < 0 ? 'bad' : ''}">${after}</dd>`}</dl>
    ${up}
    <button class="btn ${gearEquipped(g) ? 'ghost' : 'ok'}" id="wbEquip">${gearEquipped(g) ? 'Take out of loadout' : `Put in loadout (${GEAR.loadout.length}/${loadoutSlots()})`}</button>
    ${dup ? `<button class="btn ghost" id="wbFuse">Fuse in your other ${esc(m.name)} (+XP)</button>` : ''}
    <div class="wb-row2"><button class="btn ghost sm" id="wbLock" aria-pressed="${gearLocked(g)}">${gearLocked(g) ? 'Locked' : 'Lock'}</button>
    <button class="btn ghost warn sm" id="wbScrap" ${gearLocked(g) ? 'disabled' : ''}>${wbArmed === g.u ? 'Click again to scrap' : `Scrap for ${gearScrapValue(g)} bolts`}</button></div>
    <div class="wb-help"><b>How gear works</b>
      <p><b>XP</b> comes from playing: every gear piece in your car earns it, win or lose. <b>Bolts</b> come from winning rounds and matches. When the XP bar is full, spend bolts to level up.</p>
      <p>Every level adds ${esc(GEAR_KIND_TEXT[gearKind(g.id)])}. Level 3 opens a quirk, level 5 lets you pick a special (or Steady +10%), level 10 adds the legendary special.</p>
      <p>Loadout gear is in your bin from round 1 of Duel, Scrap Road and Gauntlet. Online never uses gear, so it stays fair.</p></div>`;
}
