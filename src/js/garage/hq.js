// Garage HQ: one screen for everything you own. Left: your car, its paint, stickers, set bonus and gear loadout.
// Right: tabs for gear (spec sheet and upgrades), the fabricator, skins, stickers, trails, wreck effects, titles
// and your profile (badge and achievements). Replaces the separate Workbench and Locker screens.

let hqTab = 'gear',
  hqBack = null,
  hqFabLast = null;
const HQ_TABS = [
  ['gear', 'Gear'],
  ['fab', 'Fabricator'],
  ['livery', 'Skins'],
  ['stickers', 'Stickers'],
  ['trail', 'Trails'],
  ['wreck', 'Wreck effects'],
  ['title', 'Titles'],
  ['profile', 'Profile']
];
function openGarageHQ(back, tab) {
  hqBack = back || null;
  if (tab) hqTab = tab;
  wbArmed = null;
  if (!wbSel || !gearById(wbSel)) wbSel = GEAR.items[0] ? GEAR.items[0].u : null;
  hideOverlays();
  renderHQ();
  $('#ovWork').hidden = false;
}
// the old entry points open the matching tab
const openWorkbench = back => openGarageHQ(back, 'gear');
const openStyle = back => openGarageHQ(back, 'livery');

/* ---------- left column: the car ---------- */
function hqCarHtml() {
  let img = '';
  try {
    img = designURL(stylePreviewDesign(), 260, G.paint, G.style.livery);
  } catch (e) {}
  const slots = loadoutSlots(),
    lo = Array.from({ length: 4 }, (_, i) => {
      if (i >= slots) return `<div class="lo-slot locked"><span>Unlocks at level 10</span></div>`;
      const g = gearById(GEAR.loadout[i]);
      return g
        ? `<button class="lo-slot on" data-lo="${g.u}" title="Show ${esc(gearName(g))}"><img alt="" src="${iconURL(g.id, 48)}"><span><b>${esc(gearName(g))}</b>${lvPips(g)}</span></button>`
        : `<div class="lo-slot"><span>Empty: equip gear from the Gear tab</span></div>`;
    }).join('');
  return `<div class="hq-carimg"><img src="${img}" alt="Your car"><div class="hq-stk">${(G.style.stickers || [])
    .map(id => `<img alt="${esc(STICKER[id].name)}" src="${stickerURL(id, 48)}">`)
    .join('')}</div></div>
    <div class="hq-paint" role="group" aria-label="Paint colour">${PAINTS.map(p => `<button style="background:${p}" data-paint="${p}" aria-pressed="${G.paint === p}" title="Paint"></button>`).join('')}</div>
    ${setPanelHtml()}
    <div class="hq-lo"><span class="label">Loadout · ${GEAR.loadout.length}/${slots}</span>
      <p class="small">Loadout gear is in your parts bin from round 1 of every Duel, Scrap Road and Gauntlet match.</p>${lo}</div>
    <div class="hq-presets"><span class="label">Looks</span>${[0, 1, 2]
      .map(i => {
        const P = (PROG.presets || [])[i];
        return `<div class="pre"><button class="btn ghost sm" data-wear="${i}" ${P ? '' : 'disabled'}>${P ? esc(P.name) : 'Empty'}</button><button class="btn ghost sm" data-save="${i}" title="Save the current look here">Save</button></div>`;
      })
      .join('')}</div>`;
}

/* ---------- tabs ---------- */
function hqGearHtml() {
  const list = GEAR.items
    .filter(wbMatch)
    .sort(
      (a, b) =>
        gearEquipped(b) - gearEquipped(a) || b.lvl - a.lvl || MOD[b.id].rar - MOD[a.id].rar || a.id.localeCompare(b.id)
    );
  const g = gearById(wbSel);
  if (g && g.isNew) {
    delete g.isNew;
    saveGear();
  }
  const counts = {};
  for (const x of GEAR.items) counts[x.id] = (counts[x.id] || 0) + 1;
  return `<div class="hq-gear">
    <section class="wb-list" aria-label="Gear list">
      <div class="tabs">${WB_FILTERS.map(([id, n]) => `<button data-f="${id}" aria-pressed="${id === wbFilter}">${n}</button>`).join('')}</div>
      <span class="small">${GEAR.items.length} / ${GEAR_CAP} pieces</span>
      <div class="wb-rows">${
        list.length
          ? list
              .map(
                x =>
                  `<button class="wb-row${x.u === wbSel ? ' on' : ''}" data-u="${x.u}"><img alt="" src="${iconURL(x.id, 48)}"><span class="nm"><b>${esc(gearName(x))}</b><span>${gearEquipped(x) ? 'In loadout' : x.q ? esc(QUIRKS[x.q].name) : x.qo ? 'Quirk ready' : esc(RAR[MOD[x.id].rar].name)}</span></span>${lvPips(x)}${gearLocked(x) ? '<em class="locktag" title="Locked">L</em>' : ''}${x.isNew ? '<em class="newtag">New</em>' : counts[x.id] > 1 ? '<em class="fusetag">Fuse</em>' : ''}</button>`
              )
              .join('')
          : '<p class="small" style="padding:12px">Nothing in this category. Try the Fabricator.</p>'
      }</div>
    </section>
    <section class="wb-detail" aria-label="Selected gear">${wbDetail(g)}</section>
    <aside class="wb-order" aria-label="Work order">${wbOrder(g)}</aside></div>`;
}
function hqFabHtml() {
  const full = GEAR.items.length >= GEAR_CAP;
  return `<div class="hq-fab"><p>Turn bolts into new gear. Every crate makes one level-1 part of its kind: mostly common, sometimes rare, now and then epic.</p>
    <div class="fab-grid">${FAB.map(
      F => `<div class="fab-card"><span class="label">${esc(F.name)}</span><b class="fab-cost"><i class="boltico" aria-hidden="true"></i>${F.cost}</b><p class="small">${esc(F.desc)}</p>
        <div class="fab-odds">${['Common', 'Uncommon', 'Rare', 'Epic'].map((n, i) => `<span style="color:${RAR[i].col}">${n} ${FAB_RAR[i]}%</span>`).join('')}</div>
        <button class="btn" data-fab="${F.id}" ${GEAR.bolts < F.cost || full ? 'disabled' : ''}>${full ? 'Locker full' : GEAR.bolts < F.cost ? `Need ${F.cost - GEAR.bolts} more bolts` : 'Fabricate'}</button></div>`
    ).join('')}</div>
    ${
      hqFabLast
        ? `<div class="fab-out"><img alt="" src="${iconURL(hqFabLast.id, 96)}"><div><span class="label" style="color:${RAR[MOD[hqFabLast.id].rar].col}">${RAR[MOD[hqFabLast.id].rar].name} · fresh off the line</span><h3>${esc(MOD[hqFabLast.id].name)}</h3><button class="btn ghost sm" id="fabShow">Open in Gear</button></div></div>`
        : ''
    }</div>`;
}
function hqLookHtml(tab) {
  const isSt = tab === 'stickers',
    items = isSt ? STICKERS : COSMETICS[tab];
  const grid = items
    .map(it => {
      if (isSt) {
        const un = stickerUnlocked(it),
          on = (G.style.stickers || []).includes(it.id),
          match = it.set === liverySet(G.style.livery);
        return `<button class="stitem sticker${on ? ' on' : ''}${un ? '' : ' locked'}${match ? ' match' : ''}" data-id="${it.id}" ${un ? '' : 'aria-disabled="true"'}><img class="st-stk" alt="" src="${stickerURL(it.id, 64)}"><b>${esc(it.name)}</b>${setTag(it.set)}<span>${esc(un ? it.perk : unlockText(it.unlock))}</span>${on ? '<i>On your car</i>' : un ? '' : '<i>Locked</i>'}</button>`;
      }
      const un = isUnlocked(it),
        on = G.style[tab] === it.id;
      return `<button class="stitem${on ? ' on' : ''}${un ? '' : ' locked'}" data-id="${it.id}" ${un ? '' : 'aria-disabled="true"'}>${stylePreview(tab, it.id)}<b>${esc(it.name)}</b>${tab === 'livery' ? setTag(liverySet(it.id)) : ''}<span>${esc(un ? it.desc : unlockText(it.unlock))}</span>${on ? '<i>Equipped</i>' : un ? '' : '<i>Locked</i>'}</button>`;
    })
    .join('');
  const hint = isSt
    ? `${stickerSlotsHtml()}<p class="small sthint">Three slots. Stickers give small perks offline. Two stickers from your skin's set turn on its set bonus.</p>`
    : tab === 'livery'
      ? '<p class="small sthint">Skins with a set tag work with that set\'s stickers.</p>'
      : '';
  return `${hint}<div class="stgrid">${grid}</div>`;
}
function hqProfileHtml() {
  return `<div class="hq-prof">${badgeEditorHTML()}
    <div><span class="label">Achievements · ${PROG.ach.length}/${Object.keys(ACHIEVEMENTS).length}</span><div class="achlist2">${Object.entries(
      ACHIEVEMENTS
    )
      .map(
        ([id, a]) =>
          `<div class="${PROG.ach.includes(id) ? 'on' : ''}"><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`
      )
      .join('')}</div></div></div>`;
}

/* ---------- render and wiring ---------- */
function renderHQ() {
  const L = levelInfo(),
    tab = hqTab,
    main =
      tab === 'gear'
        ? hqGearHtml()
        : tab === 'fab'
          ? hqFabHtml()
          : tab === 'profile'
            ? hqProfileHtml()
            : hqLookHtml(tab);
  $('#ovWork').innerHTML = `<div class="hq">
    <header><div><span class="label">Garage</span><h2>${esc(G.name)} <span class="ttl">${esc(titleName(G.style.title))}</span></h2></div>
      <div class="lvl"><span class="lv">${L.lvl}</span><div><b>Scrap Cred level ${L.lvl}</b><div class="xpbar"><i style="width:${Math.round((L.into / L.need) * 100)}%"></i></div><span class="small">${L.into} / ${L.need} XP</span></div></div>
      <div class="wb-bolts"><i class="boltico" aria-hidden="true"></i><b>${GEAR.bolts}</b><span>bolts</span></div>
      <button class="btn ghost" id="hqDone">Done</button></header>
    <div class="hq-body"><aside class="hq-car" aria-label="Your car">${hqCarHtml()}</aside>
      <div class="hq-main"><nav class="hq-tabs" aria-label="Garage sections">${HQ_TABS.map(([id, n]) => `<button data-hq="${id}" aria-pressed="${id === tab}">${n}</button>`).join('')}</nav>
        <div class="hq-pane">${main}</div></div></div></div>`;
  hqWire();
}
function hqWire() {
  const on = (sel, f) => $$('#ovWork ' + sel).forEach(b => b.addEventListener('click', e => f(b, e)));
  const rerender = s => {
    if (s) sfx(s);
    renderHQ();
  };
  on('[data-hq]', b => {
    hqTab = b.dataset.hq;
    rerender('ui');
  });
  on('#hqDone', () => {
    $('#ovWork').hidden = true;
    sfx('ui');
    if (hqBack) hqBack();
    else showMenu();
  });
  on('[data-paint]', b => {
    G.paint = b.dataset.paint;
    store('sd.paint', G.paint);
    if (typeof renderPaints === 'function' && $('#paints')) renderPaints();
    rerender('place');
  });
  on('[data-lo]', b => {
    wbSel = +b.dataset.lo;
    hqTab = 'gear';
    rerender('ui');
  });
  on('[data-save]', b => {
    const i = +b.dataset.save;
    PROG.presets = PROG.presets || [];
    PROG.presets[i] = {
      name: `${COSMETICS.livery.find(x => x.id === G.style.livery).name}`,
      style: { ...G.style, stickers: [...(G.style.stickers || [])] },
      paint: G.paint
    };
    saveProg();
    toast('Look saved', true);
    rerender('place');
  });
  on('[data-wear]', b => {
    const P = (PROG.presets || [])[+b.dataset.wear];
    if (!P) return;
    for (const [slot] of STYLE_SLOTS) {
      const it = COSMETICS[slot].find(x => x.id === P.style[slot]);
      if (it && isUnlocked(it)) G.style[slot] = it.id;
    }
    G.style.stickers = (P.style.stickers || []).filter(id => STICKER[id] && stickerUnlocked(STICKER[id]));
    if (P.paint) G.paint = P.paint;
    saveStyle();
    store('sd.paint', G.paint);
    rerender('place');
  });
  // gear tab
  on('[data-f]', b => {
    wbFilter = b.dataset.f;
    rerender('ui');
  });
  on('.wb-row', b => {
    wbSel = +b.dataset.u;
    wbArmed = null;
    rerender('ui');
  });
  const g = gearById(wbSel);
  on('.qopt', b => {
    if (gearPickQuirk(g, b.dataset.q)) toast(`${QUIRKS[g.q].name} welded onto ${MOD[g.id].name}`, true);
    rerender('legend');
  });
  on('#wbUp', () => {
    if (gearUpgrade(g)) toast(`${gearName(g)}${g.lvl >= GEAR_MAX ? ' is now a Masterwork!' : ' upgraded'}`, true);
    rerender(g.lvl >= GEAR_MAX ? 'jackpot' : 'repair');
  });
  on('#wbReroll', () => {
    gearRerollQuirk(g);
    rerender('reveal');
  });
  on('#wbEquip', () => {
    const r = gearEquip(g);
    if (r === 'full') toast(`All ${loadoutSlots()} loadout slots are full. Take something out first.`);
    rerender(r === 'full' ? 'remove' : 'place');
  });
  on('#wbLock', () => {
    gearLock(g);
    rerender('ui');
  });
  on('#wbFuse', () => {
    const other = GEAR.items.filter(x => x !== g && x.id === g.id).sort((a, b) => b.lvl - a.lvl)[0];
    const keep = gearFuse(g, other);
    if (keep) {
      wbSel = keep.u;
      toast(`Fused into ${gearName(keep)}`, true);
    }
    rerender('clank');
  });
  on('#wbScrap', () => {
    if (gearLocked(g)) return toast('Unlock it first.');
    if (wbArmed !== g.u) {
      wbArmed = g.u;
      return rerender();
    }
    const v = gearScrapValue(g);
    gearScrap(g);
    wbArmed = null;
    wbSel = GEAR.items[0] ? GEAR.items[0].u : null;
    toast(`Scrapped for ${v} bolts`);
    rerender('remove');
  });
  // fabricator
  on('[data-fab]', b => {
    const made = fabricate(b.dataset.fab);
    if (made) {
      hqFabLast = made;
      wbSel = made.u;
      sfx('reveal');
      setTimeout(() => sfx(MOD[made.id].rar >= 2 ? 'jackpot' : 'coin'), 300);
    }
    rerender();
  });
  on('#fabShow', () => {
    hqTab = 'gear';
    rerender('ui');
  });
  // looks
  on('.stitem', b => {
    const tab = hqTab;
    if (tab === 'stickers') {
      const st = STICKER[b.dataset.id];
      if (!stickerUnlocked(st)) return sfx('remove');
      const cur = G.style.stickers || [];
      if (cur.includes(st.id)) G.style.stickers = cur.filter(x => x !== st.id);
      else if (cur.length >= STICKER_SLOTS) {
        toast('All three slots are full. Click a sticker in a slot to peel it off first.');
        return sfx('remove');
      } else G.style.stickers = [...cur, st.id];
      saveStyle();
      if (activeSet() && cur.length < G.style.stickers.length)
        toast(`Set bonus on: ${STICKER_SETS[activeSet()].bonus}`, true);
      return rerender('place');
    }
    const it = COSMETICS[tab].find(i => i.id === b.dataset.id);
    if (!it || !isUnlocked(it)) return sfx('remove');
    G.style[tab] = it.id;
    saveStyle();
    rerender('place');
  });
  on('[data-rm]', b => {
    G.style.stickers = G.style.stickers.filter(x => x !== b.dataset.rm);
    saveStyle();
    rerender('remove');
  });
  on('[data-bk]', b => {
    const p = parseBadge(G.style.badge),
      k = b.dataset.bk,
      v = b.dataset.bv;
    if (k === 'sh') p.sh = v;
    else if (k === 'sy') p.sy = v;
    else p.ci = +v;
    G.style.badge = `${p.sh}.${p.sy}.${p.ci}`;
    saveStyle();
    rerender('place');
  });
}
