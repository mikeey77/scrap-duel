// Blueprint Brawl: no drafting, no shop. Both players bring a car worth at most BRAWL_BUDGET coins of parts
// (a saved blueprint or a ready-made archetype) and fight best-of rounds. Between rounds you can rearrange
// the same parts. It is a match format, so it works against a bot and online (the host picks it in the lobby).

const BRAWL_TYPES = [
  {
    style: 'rammer',
    name: 'Battering Ram',
    likes: ['melee', 'pinball', 'flip'],
    desc: 'Spikes and saws up front. Drive into things.'
  },
  { style: 'gunner', name: 'Gun Wagon', likes: ['gun', 'def'], desc: 'Lots of bullets, decent armour.' },
  {
    style: 'artillery',
    name: 'Siege Cart',
    likes: ['expl', 'energy'],
    desc: 'Hits hard from far away. Keep your distance.'
  },
  { style: 'brawler', name: 'Scrap Brawler', likes: ['fire', 'melee'], desc: 'Flames and blades for close fights.' },
  { style: 'gunner', name: 'Zapper', likes: ['energy', 'cold'], desc: 'Lasers, tesla coils and ice.' },
  { style: 'rammer', name: 'Pinball', likes: ['air', 'pinball', 'flip'], desc: 'Bounces, flips and gets in your face.' }
];
/** What a design costs: the shop price of every part except the cockpit. */
function designCost(d) {
  let c = 0;
  for (const e of [...d.base.values(), ...d.top.values()]) if (e.id !== 'cockpit' && MOD[e.id]) c += MOD[e.id].price;
  return c;
}
/** Builds an archetype car with the bot pipeline, then trims it to the budget (weapons first, then extras). */
function brawlDesign(type, diff = 1, budget = BRAWL_BUDGET) {
  const P = Object.assign(newProfile(), { style: type.style, likes: type.likes, diff, name: type.name });
  P.coins = Math.round(budget * 0.55);
  const saveRound = G.round;
  for (let r = 1; r <= 4; r++) {
    G.round = r;
    botDraft(P);
  }
  botShop(P);
  G.round = saveRound;
  const d = botBuildFor(P, diff);
  // trim: drop the priciest top parts until it fits, then the priciest outer base parts
  const ranked = map =>
    [...map.entries()].filter(([, e]) => e.id !== 'cockpit').sort((a, b) => MOD[b[1].id].price - MOD[a[1].id].price);
  for (const [k] of ranked(d.top)) {
    if (designCost(d) <= budget) break;
    d.top.delete(k);
  }
  for (const [k, e] of ranked(d.base)) {
    if (designCost(d) <= budget) break;
    const copy = new Map(d.base);
    copy.delete(k);
    if (d.top.has(k) || !designConnected(copy)) continue;
    d.base.delete(k);
  }
  return d;
}
/** Your saved blueprint slots that fit the budget. */
function brawlSaved() {
  const out = [];
  for (let i = 0; i < BP_SLOTS; i++) {
    const bp = bpRead(i);
    if (bp) out.push({ name: bp.name, d: bp.d, saved: true });
  }
  return out;
}
let brawlChoices = [];
/** Round 1 of a Brawl: pick the car you bring. */
function openBrawlPick() {
  G.phase = 'draft';
  updateHUD();
  brawlChoices = [...brawlSaved(), ...BRAWL_TYPES.map(t => ({ name: t.name, desc: t.desc, d: brawlDesign(t, 1) }))];
  const el = $('#ovDraft');
  el.innerHTML = `<div class="card brawlpick"><span class="label">Blueprint Brawl · budget ${BRAWL_BUDGET} coins</span><h2>Pick the car you bring</h2>
    <p class="small">No drafting and no shop: you keep these parts all match. Between rounds you can rearrange them in the garage.</p>
    <div class="bp-grid">${brawlChoices
      .map((c, i) => {
        const cost = designCost(c.d),
          over = cost > BRAWL_BUDGET;
        let img = '';
        try {
          img = designURL(c.d, 150, G.paint, G.style.livery);
        } catch (e) {}
        return `<button class="bp-card${over ? ' over' : ''}" data-i="${i}" ${over ? 'disabled' : ''}><img alt="" src="${img}"><b>${esc(c.name)}</b><span class="small">${esc(c.desc || 'From your garage')}</span><span class="bp-cost"><i style="width:${Math.min(100, Math.round((cost / BRAWL_BUDGET) * 100))}%"></i><em>${cost} / ${BRAWL_BUDGET}${over ? ' · over budget' : ''}</em></span></button>`;
      })
      .join('')}</div></div>`;
  el.hidden = false;
  $$('#ovDraft .bp-card').forEach(b =>
    b.addEventListener('click', () => {
      const c = brawlChoices[+b.dataset.i];
      if (!c || designCost(c.d) > BRAWL_BUDGET) return;
      sfx('legend');
      el.hidden = true;
      brawlApply(c.d);
      openBuild();
    })
  );
}
/** Your bin becomes exactly the parts of the chosen car, already bolted together. */
function brawlApply(d) {
  G.inv = {};
  G.base = new Map();
  G.top = new Map();
  for (const [k, e] of d.base) G.base.set(k, { ...e });
  for (const [k, e] of d.top) G.top.set(k, { ...e });
  for (const e of [...G.base.values(), ...G.top.values()]) {
    G.inv[e.id] = (G.inv[e.id] || 0) + 1;
    G.found.add(e.id);
  }
  // make sure the bay is big enough for the car
  for (const e of [...G.base.values()]) for (const [x, y] of footprint(e.id, e.rot, e.x, e.y)) G.ws.add(key(x, y));
  G.coins = 0;
  G.brawlCost = designCost(d);
}
/** The bot brings one archetype for the whole match. */
function brawlBot() {
  if (G.botDesign && G.brawlBotReady) return;
  const t = BRAWL_TYPES.find(x => x.style === G.bot.style) || pick(BRAWL_TYPES);
  G.botDesign = brawlDesign(t, G.diff);
  G.bot.inv = {};
  for (const e of [...G.botDesign.base.values(), ...G.botDesign.top.values()])
    G.bot.inv[e.id] = (G.bot.inv[e.id] || 0) + 1;
  G.brawlBotReady = true;
}
