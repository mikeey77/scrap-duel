// Scrap Gauntlet: a roguelike run. Survive wave after wave of bots with three hearts.
// Every fifth wave is a boss with a beefed-up car; beating one gives a heart back and a relic.
// The run reuses the solo flow (draft → garage → battle → report); `G.run` holds the run state.

const RUN_HEARTS = 3;
const RUN_RELICS = {
  tape: { icon: '🩹', name: 'Industrial Duct Tape', desc: 'Every part gets +20% HP.', hp: 0.2 },
  coffee: { icon: '☕', name: 'Nitro Coffee', desc: '+15% top speed and acceleration.', speed: 0.15 },
  trigger: { icon: '🔫', name: 'Hair Trigger', desc: 'Weapons fire 15% faster.', rate: 0.15 },
  spite: { icon: '😤', name: 'Pure Spite', desc: 'Deal 15% more damage.', dmgOut: 0.15 },
  skin: { icon: '🐢', name: 'Thick Skin', desc: 'Take 12% less damage.', dmgIn: 0.12 },
  drone: { icon: '🛸', name: 'Pocket Repair Drone', desc: 'Parts slowly repair themselves in battle.', regen: 0.006 },
  dice: { icon: '🎲', name: 'Loaded Dice', desc: '+30% coins after every wave.', coins: 0.3 },
  heart: { icon: '❤️', name: 'Spare Heart', desc: 'One extra heart, right now.', heart: 1 },
  magnet: { icon: '🧲', name: 'Coupon Magnet', desc: 'Start every wave with 40 bonus coins.', bonus: 40 },
  insurance: { icon: '📄', name: 'Dodgy Insurance', desc: 'The first loss after a boss costs no heart.', shield: 1 }
};
const BOSSES = [
  {
    name: 'Mega Mauler',
    style: 'rammer',
    likes: ['melee', 'pinball', 'flip'],
    paint: '#e2504a',
    taunt: 'I eat bumpers for breakfast.'
  },
  {
    name: 'Grandma Tank',
    style: 'gunner',
    likes: ['gun', 'def'],
    paint: '#c58bff',
    taunt: 'Back in my day we built cars out of WALLS.'
  },
  {
    name: 'The Shredder 3000',
    style: 'rammer',
    likes: ['melee', 'hook'],
    paint: '#ff8a3a',
    taunt: 'Your warranty ends here.'
  },
  {
    name: 'Professor Overkill',
    style: 'gunner',
    likes: ['expl', 'gun'],
    paint: '#4ea1ff',
    taunt: 'For science! Mostly explosions.'
  },
  {
    name: 'Inferno Ingrid',
    style: 'gunner',
    likes: ['fire', 'gun'],
    paint: '#ff5c7a',
    taunt: 'It is getting hot in here. Because of me.'
  },
  {
    name: 'King Kongcrete',
    style: 'rammer',
    likes: ['def', 'melee'],
    paint: '#8a8f96',
    taunt: 'I am 90% concrete and 10% attitude.'
  }
];
const isBossWave = w => w % 5 === 0;
const runBest = () => +(load('sd.runBest') || 0);

function startRun() {
  const prevDiff = G.diff;
  startMatch('solo', [], 'balanced');
  ROUNDS = 999;
  G.run = { wave: 1, hearts: RUN_HEARTS, relics: [], bosses: 0, prevDiff, shield: 0, coinsWon: 0 };
  G.sched = [];
  setupWaveBot();
  updateHUD();
}
/** A fresh rival for the current wave, built up to roughly where you are. */
function setupWaveBot() {
  const R = G.run,
    w = R.wave,
    boss = isBossWave(w);
  G.diff = w <= 2 ? 0 : w <= 6 ? 1 : 2;
  const bot = makeBot(G.diff);
  if (boss) {
    const B_ = BOSSES[(w / 5 - 1) % BOSSES.length];
    Object.assign(bot, { name: B_.name, style: B_.style, likes: B_.likes, paint: B_.paint, say: [B_.taunt] });
  }
  bot.coins += 40 * (w - 1) + (boss ? 220 + 60 * (w / 5) : 0);
  for (let i = 1; i < w + (boss ? 2 : 0); i++) {
    botDraft(bot);
    if (i % 2 === 0) botShop(bot);
  }
  G.bot = bot;
  G.botRound = -1;
  G.botDesign = null;
  G.oppName = bot.name;
  G.oppPaint = bot.paint === G.paint ? PAINTS.find(p => p !== G.paint) : bot.paint;
  G.oppLook = randomLook(boss ? 2 : G.diff);
  G.oppBadge = G.oppLook.badge;
  R.boss = boss ? { hp: 1.5 + 0.35 * (w / 5), dmg: 1.08 + 0.07 * (w / 5) } : null;
  if (R.relics.includes('magnet')) addCoins(RUN_RELICS.magnet.bonus);
}
/** Extra fields for the bot's battle config: boss multipliers. */
const runBotExtras = () =>
  G.run && G.run.boss ? { boss: G.run.boss } : G.run && G.run.tough ? { tough: G.run.tough } : {};
/** Run perks for the player's own car config. */
function runMods() {
  if (!G.run) return null;
  const m = { hp: 0, speed: 0, rate: 0, dmgOut: 0, dmgIn: 0, regen: 0 };
  for (const id of G.run.relics) for (const k in m) m[k] += RUN_RELICS[id][k] || 0;
  return m;
}
/** Applies boss or relic multipliers to a freshly built car. */
function applyCarMods(v, c) {
  const hp = (c.boss ? c.boss.hp : c.run ? 1 + c.run.hp : 1) * (c.tough || 1);
  if (hp !== 1) {
    for (const I of v.insts) {
      I.max *= hp;
      I.hp *= hp;
    }
    v.total *= hp;
  }
  if (c.boss) {
    v.boss = true;
    v.dmgOut = c.boss.dmg;
  }
  if (c.gear) applyGear(v, c.gear);
  if (c.flair) applyFlair(v, c.flair);
  v.gearHeal = v.insts.some(I => I.gRegen);
  if (c.run) {
    v.dmgOut = (v.dmgOut || 1) * (1 + c.run.dmgOut);
    v.dmgIn = 1 - c.run.dmgIn;
    v.rateMul = 1 + c.run.rate;
    v.regen = c.run.regen;
    if (c.run.speed) {
      v.c.topCap *= 1 + c.run.speed;
      v.c.accel *= 1 + c.run.speed;
    }
  }
}

/** Called by finishBattle: hearts, rewards and what happens next. */
function runWaveDone(iWon, draw) {
  const R = G.run;
  let text;
  if (iWon) {
    R.cleared = R.wave;
    if (R.boss) {
      R.bosses++;
      R.hearts = Math.min(RUN_HEARTS + 2, R.hearts + 1);
      text = `Boss down! +1 heart and a relic. ${pick(['The crowd goes wild.', 'Someone call a tow truck.', 'That one will need a new chassis.'])}`;
      grantAch('boss_slayer');
    } else
      text = pick([
        'Wave cleared. Next!',
        'Easy. Probably.',
        'Another one for the scrap pile.',
        'Keep that engine warm.'
      ]);
  } else if (draw) text = 'A draw costs nothing. Phew.';
  else if (R.shield) {
    R.shield = 0;
    text = 'Dodgy Insurance paid out. No heart lost. Do not ask how.';
  } else {
    R.hearts--;
    text =
      R.hearts > 0 ? `Ouch. ${R.hearts} heart${R.hearts > 1 ? 's' : ''} left.` : 'Out of hearts. The run ends here.';
  }
  R.tough = 0; // a Mystery Crate's tougher rival only lasts one wave
  if (R.wave >= 10) grantAch('wave10');
  if (R.wave >= 25) grantAch('wave25');
  return { over: R.hearts <= 0, text, relic: iWon && !!R.boss };
}
/** "Next up" card for the run. */
function runNextUpHTML() {
  const w = G.run.wave + 1,
    boss = isBossWave(w),
    toBoss = 5 - (w % 5);
  return `<div class="nextup${boss ? ' sp' : ''}" style="--sc:${boss ? '#ff5c7a' : '#5be7ff'}"><span class="nu-ico">${boss ? '☠' : w}</span><div><span class="label">Next up · wave ${w}</span><b>${boss ? 'BOSS: ' + esc(BOSSES[(w / 5 - 1) % BOSSES.length].name) : 'A new rival'}</b><span class="small">${boss ? 'A beefed-up car with extra armour and damage. Beat it for a heart and a relic.' : `Boss in ${toBoss} wave${toBoss > 1 ? 's' : ''}.`}</span></div></div>`;
}
function updateRunHUD() {
  const w = G.round,
    base = Math.floor((w - 1) / 5) * 5;
  $('#tRoundLbl').textContent = `Wave ${w} · best ${Math.max(runBest(), w)}`;
  $('#segs').innerHTML = Array.from({ length: 5 }, (_, i) => {
    const n = base + i + 1,
      r = G.log[n - 1];
    return `<i class="${r ? (r.win ? 'w' : r.draw ? 'd' : 'l') : n === w ? 'now' : ''}${isBossWave(n) ? ' sp' : ''}"${isBossWave(n) ? ` style="--sc:#ff5c7a" title="Wave ${n}: boss"` : ''}>${isBossWave(n) ? '☠' : ''}</i>`;
  }).join('');
  $('#tCoins').textContent = G.coins;
  $('#tScore').innerHTML = `${badgeHTML(G.style.badge, 18)}${heartsHTML()}${badgeHTML(G.oppBadge, 18)}`;
  $('#tScoreLbl').textContent = `Gauntlet vs ${G.oppName}`;
  const toBoss = 5 - (w % 5);
  $('#tStake').textContent = G.run.boss ? 'BOSS WAVE' : `Wave ${w} · boss in ${toBoss % 5 || 5}`;
  $('#tStake').hidden = false;
  $('#formatStatus').hidden = true;
  $('#tParts').textContent = G.base.size + G.top.size;
  $('#tFound').textContent = `${G.found.size} / ${MODS.length}`;
  const p = $('#tPhase');
  p.className = 'pill ' + ({ build: 'build', battle: 'battle', wait: 'wait', draft: 'draft' }[G.phase] || '');
  p.textContent =
    {
      build: 'Build',
      battle: 'Battle',
      wait: 'Waiting arena',
      draft: 'Draft',
      result: 'Repair bay',
      final: 'Run over'
    }[G.phase] || '';
}
function heartsHTML(n = G.run.hearts) {
  return `<span class="hearts" aria-label="${n} hearts">${'❤️'.repeat(Math.max(0, n))}${'🖤'.repeat(Math.max(0, RUN_HEARTS - n))}</span>`;
}
/** Continue after the wave report. */
function runNext(over, relic) {
  if (over) return showRunOver();
  const go = () => {
    G.round++;
    G.run.wave++;
    setupWaveBot();
    updateHUD();
    openDraft();
  };
  if (relic) openRelicPick(go);
  else if (G.run.wave % 5 === 2 && G.log.length && G.log[G.log.length - 1].win) openPathPick(go);
  else go();
}
/** Halfway to every boss: pick a path. Coins now, a heart back, or a relic with a tougher next rival. */
const RUN_PATHS = [
  { id: 'heap', icon: '🔩', name: 'Scrap Heap', desc: '+90 coins right now.' },
  { id: 'pit', icon: '🔧', name: 'Pit Stop', desc: 'Get a heart back (up to five).' },
  {
    id: 'crate',
    icon: '📦',
    name: 'Mystery Crate',
    desc: 'A random relic now, but the next rival has 30% more armour.'
  }
];
function openPathPick(done) {
  const R = G.run;
  $('#resultCard').innerHTML =
    `<span class="label">Wave ${R.wave} cleared · a fork in the road</span><h2>Pick a path</h2><p class="small">Halfway to the next boss. Choose what you need most.</p>
    <div class="relics">${RUN_PATHS.map(p => `<button class="relic" data-id="${p.id}" ${p.id === 'pit' && R.hearts >= RUN_HEARTS + 2 ? 'disabled' : ''}><i>${p.icon}</i><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></button>`).join('')}</div>`;
  $('#ovResult').hidden = false;
  sfx('reveal');
  R.pathDone = done;
  $$('#resultCard .relic').forEach(b => b.addEventListener('click', () => runPathChoose(b.dataset.id)));
}
function runPathChoose(id) {
  const R = G.run,
    done = R.pathDone;
  if (!done) return;
  R.pathDone = null;
  {
    {
      if (id === 'heap') addCoins(90);
      else if (id === 'pit') R.hearts = Math.min(RUN_HEARTS + 2, R.hearts + 1);
      else {
        const pool = Object.keys(RUN_RELICS).filter(x => !R.relics.includes(x) || x === 'heart'),
          rid = pick(pool),
          r = RUN_RELICS[rid];
        R.relics.push(rid);
        if (r.heart) R.hearts++;
        if (r.shield) R.shield = 1;
        R.tough = 1.3;
        toast(`${r.icon} ${r.name}: ${r.desc}`, true);
      }
      sfx('legend');
      $('#ovResult').hidden = true;
      done();
    }
  }
}
function openRelicPick(done) {
  const own = G.run.relics,
    pool = Object.keys(RUN_RELICS).filter(id => !own.includes(id) || id === 'heart'),
    picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  $('#resultCard').innerHTML =
    `<span class="label">Boss loot · pick one relic</span><h2>Choose a relic</h2><p class="small">Relics last for the rest of the run.</p>
    <div class="relics">${picks.map(id => `<button class="relic" data-id="${id}"><i>${RUN_RELICS[id].icon}</i><b>${esc(RUN_RELICS[id].name)}</b><span>${esc(RUN_RELICS[id].desc)}</span></button>`).join('')}</div>`;
  $('#ovResult').hidden = false;
  sfx('reveal');
  $$('#resultCard .relic').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.id,
        r = RUN_RELICS[id];
      G.run.relics.push(id);
      if (r.heart) G.run.hearts++;
      if (r.shield) G.run.shield = 1;
      sfx('legend');
      $('#ovResult').hidden = true;
      done();
    })
  );
}
function showRunOver() {
  const R = G.run,
    reached = R.wave,
    best = runBest(),
    record = reached > best;
  if (record) store('sd.runBest', reached);
  const prog = grant(20 + R.cleared * 12 + R.bosses * 40, []);
  const spoils = matchSpoils(R.cleared >= 5, 0, {
    rounds: R.wave,
    bolts: R.cleared * 8 + R.bosses * 30 - 20,
    from: 'Gauntlet wave ' + R.wave
  });
  G.phase = 'final';
  $('#resultCard').innerHTML =
    `<span class="label">Scrap Gauntlet · run over</span><h2 style="color:${record ? '#3fe0a0' : '#ff5c7a'}">${record ? 'New record!' : 'Run over'}</h2>
    <div class="runstats"><div><b>${reached}</b><span>wave reached</span></div><div><b>${R.bosses}</b><span>bosses beaten</span></div><div><b>${Math.max(best, reached)}</b><span>best ever</span></div></div>
    ${R.relics.length ? `<div class="relicrow">${R.relics.map(id => `<span title="${esc(RUN_RELICS[id].desc)}">${RUN_RELICS[id].icon} ${esc(RUN_RELICS[id].name)}</span>`).join('')}</div>` : ''}
    <p class="small">${esc(pick(['Your car has been donated to science.', 'The scrapyard thanks you for your contribution.', 'Somewhere, a mechanic is crying.', 'Not bad for a pile of bolts.']))}</p>
    ${progressHtml(prog)}${spoilsHtml(spoils)}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="runAgain">Run it back</button><button class="btn ghost" id="runHome">Main menu</button></div>`;
  $('#ovResult').hidden = false;
  Announcer.say(record ? 'New record' : 'Game over');
  sfx(record ? 'win' : 'lose');
  G.diff = R.prevDiff;
  G.run = null;
  $('#runAgain').onclick = () => startRun();
  $('#runHome').onclick = () => showMenu();
}
