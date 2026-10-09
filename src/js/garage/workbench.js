// Workbench: upgrade your personal gear with bolts, pick quirks, fuse duplicates, scrap what you do not need.
let wbSel = null,
  wbFilter = 'all',
  wbBack = null,
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
function openWorkbench(back) {
  wbBack = back || null;
  wbArmed = null;
  if (!wbSel || !gearById(wbSel)) wbSel = GEAR.items[0] ? GEAR.items[0].u : null;
  renderWorkbench();
  $('#ovWork').hidden = false;
}
const lvPips = g =>
  `<span class="lvpips" aria-label="Level ${g.lvl} of ${GEAR_MAX}">${Array.from({ length: GEAR_MAX }, (_, i) => `<i class="${i < g.lvl ? 'on' : ''}${i === GEAR_MAX - 1 ? ' mw' : ''}"></i>`).join('')}</span>`;
function wbDetail(g) {
  if (!g)
    return `<div class="wb-empty"><h3>No gear yet</h3><p>Win matches, clear Gauntlet waves and finish Scrap Road missions to find gear.</p></div>`;
  const m = MOD[g.id],
    k = gearKind(g.id),
    now = Math.round(gearBonus(g) * 100),
    next = g.lvl < GEAR_MAX ? Math.round(gearBonus({ ...g, lvl: g.lvl + 1 }) * 100) : null,
    cost = g.lvl < GEAR_MAX ? gearCost(g) : 0,
    dup = GEAR.items.find(x => x !== g && x.id === g.id),
    q = g.q && QUIRKS[g.q];
  let quirk;
  if (q)
    quirk = `<div class="wb-q on"><span class="qtag">Quirk</span><b>${esc(q.name)}</b><p class="pro">+ ${esc(q.pro)}</p><p class="con">− ${esc(q.con)}</p><button class="btn ghost sm" id="wbReroll" ${GEAR.bolts < QUIRK_REROLL ? 'disabled' : ''}>Reroll quirk · ${QUIRK_REROLL} bolts</button></div>`;
  else if (g.qo && g.qo.length)
    quirk = `<div class="wb-q pick"><span class="qtag">Pick a quirk</span><p class="small">Every quirk is a trade-off. You can reroll later.</p><div class="qopts">${g.qo
      .map(
        id =>
          `<button class="qopt" data-q="${id}"><b>${esc(QUIRKS[id].name)}</b><span class="pro">+ ${esc(QUIRKS[id].pro)}</span><span class="con">− ${esc(QUIRKS[id].con)}</span></button>`
      )
      .join('')}</div></div>`;
  else quirk = `<div class="wb-q locked"><span class="qtag">Quirk</span><p>Unlocks at level 3.</p></div>`;
  return `<div class="wb-hero ${g.lvl >= GEAR_MAX ? 'mw' : ''}"><img alt="" src="${iconURL(g.id, 184)}"></div>
    <div class="wb-meta"><span class="label" style="color:${RAR[m.rar].col}">${RAR[m.rar].name} · ${esc(CATNAME[m.cat])}${g.from ? ' · ' + esc(g.from) : ''}</span>
      <h3>${esc(gearName(g))}${g.lvl >= GEAR_MAX ? ' <em class="mwtag">Masterwork</em>' : ''}</h3>${lvPips(g)}
      <div class="wb-stat"><span>${esc(GEAR_KIND_TEXT[k])}</span><b>+${now}%</b>${next != null ? `<i aria-hidden="true">→</i><b class="nx">+${next}%</b>` : ''}</div>
      ${g.lvl === GEAR_MAX - 1 ? '<p class="small">Level 5 makes it a Masterwork: an extra bonus, a golden glow and a hype boost with the crowd.</p>' : ''}
    </div>
    ${quirk}
    <div class="wb-acts">
      ${g.lvl < GEAR_MAX ? `<button class="btn" id="wbUp" ${GEAR.bolts < cost ? 'disabled' : ''}>Upgrade to level ${g.lvl + 1} · ${cost} bolts</button>` : '<span class="small">Max level reached.</span>'}
      ${dup ? `<button class="btn ghost" id="wbFuse">Fuse with your other ${esc(m.name)} (Lv ${dup.lvl})</button>` : ''}
      <button class="btn ghost warn" id="wbScrap">${wbArmed === g.u ? 'Click again to scrap' : `Scrap for ${gearScrapValue(g)} bolts`}</button>
    </div>`;
}
function renderWorkbench() {
  const list = GEAR.items.filter(wbMatch).sort((a, b) => b.lvl - a.lvl || MOD[b.id].rar - MOD[a.id].rar);
  const g = gearById(wbSel);
  if (g && g.isNew) {
    delete g.isNew;
    saveGear();
  }
  const counts = {};
  for (const x of GEAR.items) counts[x.id] = (counts[x.id] || 0) + 1;
  $('#ovWork').innerHTML = `<div class="wb">
    <header><div><span class="label">Workbench</span><h2>Your gear</h2></div>
      <div class="wb-bolts"><i class="boltico" aria-hidden="true"></i><b>${GEAR.bolts}</b><span>bolts</span></div>
      <span class="small">${GEAR.items.length} / ${GEAR_CAP} in the locker</span>
      <button class="btn ghost" id="wbDone">Done</button></header>
    <div class="wb-body">
      <section class="wb-list" aria-label="Gear list">
        <div class="tabs">${WB_FILTERS.map(([id, n]) => `<button data-f="${id}" aria-pressed="${id === wbFilter}">${n}</button>`).join('')}</div>
        <div class="wb-rows">${
          list.length
            ? list
                .map(
                  x =>
                    `<button class="wb-row${x.u === wbSel ? ' on' : ''}" data-u="${x.u}"><img alt="" src="${iconURL(x.id, 48)}"><span class="nm"><b>${esc(gearName(x))}</b><span>${x.q ? esc(QUIRKS[x.q].name) : x.qo ? 'Quirk ready' : esc(RAR[MOD[x.id].rar].name)}</span></span>${lvPips(x)}${x.isNew ? '<em class="newtag">New</em>' : counts[x.id] > 1 ? '<em class="fusetag">Fuse</em>' : ''}</button>`
                )
                .join('')
            : '<p class="small" style="padding:12px">Nothing in this category.</p>'
        }</div>
      </section>
      <section class="wb-detail" aria-label="Selected gear">${wbDetail(g)}</section>
      <aside class="wb-help">
        <h3>How gear works</h3>
        <ol>
          <li><b>Find it.</b> Gear drops after Duel matches, Gauntlet runs and Scrap Road missions. Bosses drop their signature parts.</li>
          <li><b>Upgrade it.</b> Spend bolts here. Level 3 unlocks a quirk, level 5 makes it a Masterwork.</li>
          <li><b>Draft it.</b> In Duel, Story and Gauntlet your gear shows up as a draft card. Take it and the first copy you mount is your tuned part.</li>
        </ol>
        <p class="small">Online 1v1 never uses gear, so matches against friends stay fair.</p>
      </aside>
    </div></div>`;
  $$('#ovWork [data-f]').forEach(b =>
    b.addEventListener('click', () => {
      wbFilter = b.dataset.f;
      sfx('ui');
      renderWorkbench();
    })
  );
  $$('#ovWork .wb-row').forEach(b =>
    b.addEventListener('click', () => {
      wbSel = +b.dataset.u;
      wbArmed = null;
      sfx('ui');
      renderWorkbench();
    })
  );
  $$('#ovWork .qopt').forEach(b =>
    b.addEventListener('click', () => {
      if (gearPickQuirk(g, b.dataset.q)) {
        sfx('legend');
        toast(`${QUIRKS[g.q].name} welded onto ${MOD[g.id].name}`, true);
      }
      renderWorkbench();
    })
  );
  const on = (id, f) => {
    const el = $('#' + id);
    if (el) el.addEventListener('click', f);
  };
  on('wbUp', () => {
    if (gearUpgrade(g)) {
      sfx(g.lvl >= GEAR_MAX ? 'jackpot' : 'repair');
      toast(`${gearName(g)}${g.lvl >= GEAR_MAX ? ' is now a Masterwork!' : ' upgraded'}`, true);
    }
    renderWorkbench();
  });
  on('wbReroll', () => {
    if (gearRerollQuirk(g)) sfx('reveal');
    renderWorkbench();
  });
  on('wbFuse', () => {
    const other = GEAR.items.filter(x => x !== g && x.id === g.id).sort((a, b) => b.lvl - a.lvl)[0];
    const keep = gearFuse(g, other);
    if (keep) {
      wbSel = keep.u;
      sfx('clank');
      toast(`Fused into ${gearName(keep)}`, true);
    }
    renderWorkbench();
  });
  on('wbScrap', () => {
    if (wbArmed !== g.u) {
      wbArmed = g.u;
      renderWorkbench();
      return;
    }
    const v = gearScrapValue(g);
    gearScrap(g);
    wbArmed = null;
    wbSel = GEAR.items[0] ? GEAR.items[0].u : null;
    sfx('remove');
    toast(`Scrapped for ${v} bolts`);
    renderWorkbench();
  });
  on('wbDone', () => {
    $('#ovWork').hidden = true;
    sfx('ui');
    if (wbBack) wbBack();
  });
}
