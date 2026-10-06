// Special rounds: half of every match is a special round, either an objective or a rule modifier.
const SPECIALS = {
  piano: {
    name: 'Piano Push',
    kind: 'objective',
    icon: 'P',
    col: '#c58bff',
    blurb: 'Shove the grand piano into the enemy goal. Wrecked cars respawn after a moment.',
    tip: 'Pushers, bumpers and heavy tracks shine here.',
    time: 120,
    respawn: true
  },
  duck: {
    name: 'Golden Duck Heist',
    kind: 'objective',
    icon: 'D',
    col: '#ffd257',
    blurb: 'Grab the golden duck and bring it home to your spawn pad. Take a beating and you drop it.',
    tip: 'Speed and armor both matter. Magnets, harpoons and tractor beams love this.',
    time: 120,
    respawn: true
  },
  hill: {
    name: 'King of the Hill',
    kind: 'objective',
    icon: 'H',
    col: '#5cc38f',
    blurb: 'Hold the centre circle on your own for 20 seconds. Wrecked cars respawn after a moment.',
    tip: 'Anchors, heavy plate and area damage keep you on top.',
    time: 120,
    respawn: true,
    hold: 20
  },
  mayhem: {
    name: 'Barrel Mayhem',
    kind: 'modifier',
    icon: 'B',
    col: '#ff8a3a',
    blurb: 'The arena is packed with explosive barrels. Coins are doubled this round.',
    tip: 'Blast-resistant parts and ranged weapons pay off.',
    coins: 2
  },
  lowgrav: {
    name: 'Low Gravity',
    kind: 'modifier',
    icon: 'G',
    col: '#7fe0ff',
    blurb: 'Everything floats. Extra trampolines and ramps, huge jumps.',
    tip: 'Bomb bays, jump jets and flippers go wild.',
    grav: 420
  },
  night: {
    name: 'Night Shift',
    kind: 'modifier',
    icon: 'N',
    col: '#8a7fff',
    blurb: 'The lights are out. You only see what your headlights, fires and explosions light up.',
    tip: 'Flamethrowers and tesla coils light the way; smoke and decoys are deadlier.',
    dark: true
  },
  sumo: {
    name: 'Sumo Ring',
    kind: 'modifier',
    icon: 'S',
    col: '#ff8fc7',
    blurb: 'A burning ring closes in from the first second. Push your rival outside it.',
    tip: 'Pushers, heavy tracks and bumpers rule the ring.',
    sumo: true
  },
  glass: {
    name: 'Glass Cannons',
    kind: 'modifier',
    icon: 'X',
    col: '#e2504a',
    blurb: 'Every hit does double damage. Short, brutal and decided by who shoots first.',
    tip: 'Shields, smoke and decoys buy precious seconds.',
    dmg: 2
  }
};
SPECIALS.scrap = {
  name: 'Scrap Run',
  icon: '♻',
  col: '#72d79d',
  kind: 'objective',
  time: 100,
  target: 20,
  blurb: 'Collect world scrap and deliver 20 pieces to your depot.',
  tip: 'Cargo slows you down. Deliver often; wrecking drops your load.'
};
const OBJECTIVES = Object.keys(SPECIALS).filter(k => SPECIALS[k].kind === 'objective');
const MODIFIERS = Object.keys(SPECIALS).filter(k => SPECIALS[k].kind === 'modifier');
const specialCount = rounds => (rounds <= 5 ? 2 : rounds <= 10 ? 5 : 9);

/** Picks which rounds are special (never round 1), favouring objectives and never repeating a type back to back. */
function makeSchedule(rounds = ROUNDS) {
  const pool = [];
  for (let r = 2; r <= rounds; r++) pool.push(r);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.min(specialCount(rounds), pool.length)).sort((a, b) => a - b);
  const sched = Array(rounds).fill(null);
  let last = null,
    objectives = 0;
  picked.forEach((r, i) => {
    const needObjective = objectives < 2 && picked.length - i <= 2 - objectives;
    let id;
    do id = needObjective || Math.random() < 0.6 ? pick(OBJECTIVES) : pick(MODIFIERS);
    while (id === last);
    if (SPECIALS[id].kind === 'objective') objectives++;
    sched[r - 1] = last = id;
  });
  return sched;
}
const specialOf = round => (G.sched && G.sched[round - 1]) || null;
/** Small HTML banner announcing a special round (used in the draft, garage and waiting arena). */
/** "Next up" card on the round report: which round, what kind, what it is worth. */
function nextUpHTML(round) {
  const id = specialOf(round),
    S = id && SPECIALS[id],
    pts = roundPoints(round),
    fin = round === ROUNDS;
  const head = `Round ${round} of ${ROUNDS}${fin ? ' · final round' : ''}`;
  if (S)
    return `<div class="nextup special" style="--sc:${S.col}"><span class="nx-ico">${S.icon}</span><div><span class="nx-k">${head} · ${pts} point${pts > 1 ? 's' : ''}</span><b>${esc(S.name)}</b><p>${esc(S.blurb)}</p><p class="nx-tip">${esc(S.tip)}</p></div></div>`;
  return `<div class="nextup"><span class="nx-ico">⚔</span><div><span class="nx-k">${head} · ${pts} point${pts > 1 ? 's' : ''}</span><b>${fin ? 'Final duel: double points' : 'Normal duel'}</b><p>Wreck the rival's cockpit or have more car left when time runs out.</p></div></div>`;
}
function specialNote(round) {
  const id = specialOf(round);
  if (!id) return '';
  const S = SPECIALS[id];
  return `<div class="spnote" style="--sc:${S.col}"><span class="spi">${S.icon}</span><span><b>Round ${round} is special: ${esc(S.name)}.</b> ${esc(S.blurb)} <i>${esc(S.tip)}</i></span></div>`;
}
