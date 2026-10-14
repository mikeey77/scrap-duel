// Garage HQ: one screen for everything you own. Left: your car, its paint, stickers, set bonus and gear loadout.
// Right: tabs for gear (spec sheet and upgrades), the fabricator, skins, stickers, trails, wreck effects, titles
// and your profile (badge and achievements). Replaces the separate Workbench and Locker screens.

let hqTab = 'gear',
  hqBack = null,
  hqFabLast = null;
const HQ_TABS = [
  ['gear', 'Gear'],
  ['fab', 'Fabricator'],
  ['chips', 'Chips'],
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
  if (!load('sd.walletSeen')) setTimeout(showWalletHelp, 400); // explain the currencies the first time
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
      <p class="small">In your parts bin from round 1 of every Duel against bots and every Gauntlet run.</p>${lo}${hqSetsHtml()}</div>
    <div class="hq-presets"><span class="label">Looks</span>${[0, 1, 2]
      .map(i => {
        const P = (PROG.presets || [])[i];
        return `<div class="pre"><button class="btn ghost sm" data-wear="${i}" ${P ? '' : 'disabled'}>${P ? esc(P.name) : 'Empty'}</button><button class="btn ghost sm" data-save="${i}" title="Save the current look here">Save</button></div>`;
      })
      .join('')}</div>`;
}

/** Loadout sets: the ones that are on, and the ones your loadout is halfway to. */
function hqSetsHtml() {
  const prog = setProgress(loadoutGear()),
    shown = prog
      .filter(p => p.on)
      .concat(
        prog
          .filter(p => !p.on && p.have > 0)
          .sort((a, b) => b.have / b.need - a.have / a.need)
          .slice(0, 2)
      );
  const row = p =>
    `<div class="setrow${p.on ? ' on' : ''}" style="--sc:${p.set.col}"><b>${esc(p.set.name)}</b><span class="setpips">${Array.from({ length: p.need }, (_, i) => `<i class="${i < p.have ? 'on' : ''}"></i>`).join('')}</span><span class="small">${esc(p.set.text)}${
      p.on
        ? ''
        : ` Needs ${Object.entries(p.set.need)
            .map(([f, n]) => (f === 'mix' ? `${n} different families` : `${n} ${FAMILY_NAME[f].toLowerCase()}`))
            .join(' + ')}.`
    }</span></div>`;
  return `<div class="hq-sets"><span class="label">Loadout sets</span>${shown.length ? shown.map(row).join('') : '<p class="small">Put parts of one family in your loadout for a set bonus: three guns, two explosives, three armour pieces…</p>'}<button class="linkbtn" id="setAll" type="button">All ${GEAR_SETS.length} sets</button></div>`;
}
function showAllSets() {
  const prog = setProgress(loadoutGear());
  toastCard(
    'Loadout sets',
    prog
      .map(
        p =>
          `<div class="setrow${p.on ? ' on' : ''}" style="--sc:${p.set.col}"><b>${esc(p.set.name)}</b><span class="setpips">${Array.from({ length: p.need }, (_, i) => `<i class="${i < p.have ? 'on' : ''}"></i>`).join('')}</span><span class="small">${esc(p.set.text)} Needs ${Object.entries(
            p.set.need
          )
            .map(([f, n]) => (f === 'mix' ? `${n} different families` : `${n} ${FAMILY_NAME[f].toLowerCase()}`))
            .join(' + ')}.</span></div>`
      )
      .join('')
  );
}
/** A simple card overlay with a title and some HTML. */
function toastCard(title, html) {
  let ov = $('#ovInfo');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'ovInfo';
    document.body.appendChild(ov);
  }
  ov.innerHTML = `<div class="card infocard"><h2>${esc(title)}</h2>${html}<button class="btn" id="infoDone">Got it</button></div>`;
  ov.hidden = false;
  swapIn(ov, 'entering');
  $('#infoDone').onclick = () => {
    ov.hidden = true;
    sfx('ui');
  };
}
/** The chip case: every chip you own, three of a kind fuse into the next mark. */
function hqChipsHtml() {
  const rows = CHIP_IDS.map(c => {
    const C = CHIPS[c];
    return `<div class="chiprow" style="--cc:${C.col}"><b class="cn">${esc(C.name)}</b>${[1, 2, 3]
      .map(t => {
        const k = chipKey(c, t),
          n = chipCount(k);
        return `<div class="chipcell${n ? '' : ' none'}">${chipIcon(k, 38)}<span><b>${CHIP_MK[t]}</b>${esc(C.text(t))}</span><em>×${n}</em>${t < 3 ? `<button class="btn ghost sm" data-cfuse="${k}" ${n >= 3 ? '' : 'disabled'} title="Three ${esc(chipName(k))} become one ${esc(chipName(chipKey(c, t + 1)))}">Fuse 3 → ${CHIP_MK[t + 1]}</button>` : ''}</div>`;
      })
      .join('')}</div>`;
  }).join('');
  return `<div class="hq-chips"><p>Mod chips go into the sockets of your gear: one opens at level 3, 6 and 9. You find them after matches, and every Gauntlet boss drops a Mk II. Taking a chip out is free.</p><div class="chipcase">${rows}</div></div>`;
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
                  `<button class="wb-row${x.u === wbSel ? ' on' : ''}" data-u="${x.u}"><img alt="" src="${iconURL(x.id, 48)}"><span class="nm"><b>${lvBadge(x)} ${esc(MOD[x.id].name)}</b><span>${gearEquipped(x) ? 'In loadout' : x.lvl >= 5 && !x.c5 ? 'Pick a special' : gearReady(x) ? 'Ready to upgrade' : x.qo ? 'Pick a quirk' : esc(RAR[MOD[x.id].rar].name)}</span>${xpBar(x)}</span>${gearLocked(x) ? '<em class="locktag" title="Locked">L</em>' : ''}${x.isNew ? '<em class="newtag">New</em>' : gearReady(x) || (x.lvl >= 5 && !x.c5) ? '<em class="readytag">Up</em>' : counts[x.id] > 1 ? '<em class="fusetag">Fuse</em>' : ''}</button>`
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
        ? `<div class="fab-out"><img alt="" src="${iconURL(hqFabLast.id, 96)}"><div><span class="label" style="color:${RAR[MOD[hqFabLast.id].rar].col}">${RAR[MOD[hqFabLast.id].rar].name} · ${DUP_XP.get(hqFabLast) ? `a copy: +${DUP_XP.get(hqFabLast).xp} XP for yours` : 'fresh off the line'}</span><h3>${esc(MOD[hqFabLast.id].name)}</h3><button class="btn ghost sm" id="fabShow">Open in Gear</button></div></div>`
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
function hqRivalsHtml() {
  const book = Object.entries(rivalBook()).sort((a, b) => b[1].w + b[1].l - (a[1].w + a[1].l));
  if (!book.length) return '';
  return `<div class="rv-album"><span class="label">Rivals · ${book.length}</span><div class="rv-grid">${book
    .map(([name, r]) => {
      const bot = BOTS.find(b => b.name === name),
        col = bot ? bot.paint : '#9aa3ab',
        mood = r.w > r.l ? 'You own this one' : r.l > r.w ? 'Has your number' : 'Dead even';
      return `<div class="rv" style="--pc:${col}"><b>${esc(name)}</b><span class="rv-score">${r.w}<i>–</i>${r.l}</span><span class="small">${mood}</span></div>`;
    })
    .join('')}</div></div>`;
}
function hqProfileHtml() {
  return `<div class="hq-prof">${badgeEditorHTML()}${hqRivalsHtml()}
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
          : tab === 'chips'
            ? hqChipsHtml()
            : tab === 'profile'
              ? hqProfileHtml()
              : hqLookHtml(tab);
  $('#ovWork').innerHTML = `<div class="hq">
    <header><div><span class="label">Garage</span><h2>${esc(G.name)} <span class="ttl">${esc(titleName(G.style.title))}</span></h2></div>
      ${walletHtml()}
      <button class="btn ghost" id="hqDone">Done</button></header>
    <div class="hq-body"><aside class="hq-car" aria-label="Your car">${hqCarHtml()}</aside>
      <div class="hq-main"><nav class="hq-tabs" aria-label="Garage sections">${HQ_TABS.map(([id, n]) => `<button data-hq="${id}" aria-pressed="${id === tab}">${n}</button>`).join('')}</nav>
        <div class="hq-pane">${main}</div></div></div></div>`;
  hqWire();
}
let hqLevelUp = null; // the piece that just levelled up flashes once
let hqSeen = { tab: null, sel: null },
  hqPop = null; // a selector that should pop once after the next render
function hqWire() {
  const pane = $('#ovWork .hq-pane');
  if (pane && hqSeen.tab !== hqTab) swapIn(pane);
  if (hqTab === 'gear' && hqSeen.sel !== wbSel && hqSeen.tab === hqTab) {
    const st = $('#ovWork .wbx-stage');
    if (st) swapIn(st);
  }
  hqSeen = { tab: hqTab, sel: wbSel };
  if (hqPop) {
    $$('#ovWork ' + hqPop).forEach(el => swapIn(el, 'popped'));
    hqPop = null;
  }
  if (hqLevelUp) {
    const el = $('#ovWork .wb-detail');
    if (el) el.classList.add('levelup');
    hqLevelUp = null;
  }
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
    hqPop = `[data-paint="${G.paint}"], .hq-carimg img`;
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
    wbSock = null;
    rerender('ui');
  });
  const g = gearById(wbSel);
  on('.qopt', b => {
    if (gearPickQuirk(g, b.dataset.q)) toast(`${QUIRKS[g.q].name} welded onto ${MOD[g.id].name}`, true);
    rerender('legend');
  });
  on('#wbUp', () => {
    if (gearUpgrade(g))
      toast(
        g.lvl >= GEAR_MAX
          ? `${MOD[g.id].name} is LEGENDARY: ${gearSpecials(g.id)[1].name} unlocked!`
          : g.lvl === 5
            ? `${gearName(g)}: pick your special!`
            : `${gearName(g)}`,
        true
      );
    hqLevelUp = g.u;
    rerender(g.lvl >= GEAR_MAX || g.lvl === 5 ? 'jackpot' : 'repair');
  });
  on('[data-sp]', b => {
    if (gearPickSpecial(g, b.dataset.sp)) {
      const S = gearPicked5(g);
      toast(`${S.name} fitted to ${MOD[g.id].name}`, true);
      rerender('legend');
    } else rerender('remove');
  });
  on('[data-sock]', b => {
    const i = +b.dataset.sock;
    wbSock = wbSock === i ? null : i;
    rerender('ui');
  });
  on('[data-chip]', b => {
    if (gearSocket(g, wbSock, b.dataset.chip)) {
      toast(`${chipName(b.dataset.chip)} plugged into ${MOD[g.id].name}`, true);
      hqPop = `[data-sock="${wbSock}"]`;
    }
    wbSock = null;
    rerender('place');
  });
  on('#sockOut', () => {
    gearUnsocket(g, wbSock);
    wbSock = null;
    rerender('remove');
  });
  on('[data-cfuse]', b => {
    const up = chipFuse(b.dataset.cfuse);
    if (up) toast(`Fused into ${chipName(up)}`, true);
    rerender(up ? 'jackpot' : 'remove');
  });
  on('#setAll', () => showAllSets());
  on('#wbReforge', () => {
    if (gearReforge(g)) toast(`${MOD[g.id].name} reforged: ${'✦'.repeat(g.s)} and back to level 1`, true);
    hqLevelUp = g.u;
    rerender('jackpot');
  });
  on('#wbReroll', () => {
    gearRerollQuirk(g);
    rerender('reveal');
  });
  on('#wbEquip', () => {
    const r = gearEquip(g);
    if (r === 'full') toast(`All ${loadoutSlots()} loadout slots are full. Take something out first.`);
    if (r === 'on') {
      const now = loadoutSets();
      if (now.length) toast(`Set on: ${now.map(id => GEAR_SETS.find(S => S.id === id).name).join(', ')}`, true);
    }
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
      hqPop = '.fab-out';
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
    hqPop = `.stitem[data-id="${b.dataset.id}"], .hq-carimg img`;
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
