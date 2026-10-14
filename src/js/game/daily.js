// Daily challenge: one seed per calendar day. Everyone who plays today gets the same arena, the same rival, the
// same drafts and the same odd rule, over five rounds. Your best score of the day is kept, plus a streak of days.
const DAILY_RULES = [
  { id: 'glass', name: 'Glass Cannons', text: 'Every part has half its HP, and every weapon hits twice as hard.', hp: 0.5, dmg: 2 },
  { id: 'heavy', name: 'Heavy Metal', text: 'Every part has 60% more HP, but cars are 15% slower.', hp: 1.6, speed: -0.15 },
  { id: 'speed', name: 'Speed Demons', text: 'Every car is 40% faster. Steering is your problem.', speed: 0.4 },
  { id: 'trigger', name: 'Trigger Happy', text: 'Every weapon fires 50% faster.', rate: 1.5 },
  { id: 'bumper', name: 'Bumper Cars', text: 'Rams hit 150% harder, guns 40% softer.', ram: 1.5, dmg: 0.6 },
  { id: 'bank', name: 'Big Spender', text: 'You start with 300 extra coins. So does the rival.', coins: 300 },
  { id: 'tank', name: 'Tank Battle', text: 'Twice the HP, half the speed. Bring patience.', hp: 2, speed: -0.5 }
];
const dailyId = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** A small seeded random generator (mulberry32). */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Today's challenge: rule, rival and arena, all from the date. */
function dailyToday(id = dailyId()) {
  const h = hashStr('scrapduel:' + id);
  const lit = THEMES.map((t, i) => i).filter(i => !THEMES[i].dark);
  return {
    id,
    seed: h,
    rule: DAILY_RULES[h % DAILY_RULES.length],
    rival: BOTS[(h >>> 8) % BOTS.length],
    theme: lit[(h >>> 16) % lit.length]
  };
}
function dailyState() {
  try {
    return { best: {}, streak: 0, last: null, ...(JSON.parse(load('sd.daily') || '{}') || {}) };
  } catch (e) {
    return { best: {}, streak: 0, last: null };
  }
}
const REAL_RANDOM = Math.random;
function dailyRestoreRandom() {
  Math.random = REAL_RANDOM;
}
function playDaily() {
  const D = dailyToday(),
    keepR = G.rounds,
    prevDiff = G.diff;
  G.teamSize = 1;
  G.diff = 1;
  G.rounds = 5;
  Math.random = seededRandom(D.seed); // same drafts and rival builds for everyone today
  G.dailyStarting = true;
  startMatch('solo', null, 'balanced');
  G.dailyStarting = false;
  G.rounds = keepR;
  G.daily = { ...D, prevDiff };
  Object.assign(G.bot, { name: D.rival.name, style: D.rival.style, likes: D.rival.likes, paint: D.rival.paint, say: D.rival.say });
  G.oppName = D.rival.name;
  G.oppPaint = D.rival.paint === G.paint ? PAINTS.find(p => p !== G.paint) : D.rival.paint;
  if (D.rule.coins) {
    addCoins(D.rule.coins);
    G.bot.coins += D.rule.coins;
  }
  G.nextTheme = D.theme;
}
/** The daily rule, applied to every car as it is built. */
function applyDailyRule(v) {
  const R = G.daily && G.daily.rule;
  if (!R) return;
  if (R.hp) {
    for (const I of v.insts) {
      I.max *= R.hp;
      I.hp *= R.hp;
    }
    v.total *= R.hp;
  }
  if (R.dmg) v.dmgOut = (v.dmgOut || 1) * R.dmg;
  if (R.rate) v.rateMul = (v.rateMul || 1) * R.rate;
  if (R.ram) v.gRamOut = (v.gRamOut || 0) + R.ram;
  if (R.speed) {
    v.c.topCap *= 1 + R.speed;
    v.c.accel *= 1 + R.speed * 0.8;
  }
}
const dailyScore = (s, tot, won) => s[0] * 100 + Math.round(tot.d / 10) + (won ? 300 : 0);
/** Called from showFinal: score, best of the day, streak and the first-play reward. */
function dailyResult(won, s, tot) {
  if (!G.daily) return '';
  dailyRestoreRandom();
  const D = G.daily,
    st = dailyState(),
    score = dailyScore(s, tot, won),
    prev = st.best[D.id] || 0,
    first = !(D.id in st.best);
  G.diff = D.prevDiff;
  G.daily = null;
  st.best[D.id] = Math.max(prev, score);
  if (first) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    st.streak = st.last === dailyId(y) ? st.streak + 1 : 1;
    st.last = D.id;
    addBolts(60 + 10 * Math.min(st.streak, 7));
    addChip(rollChip());
  }
  // keep the last 60 days only
  const keys = Object.keys(st.best).sort();
  while (keys.length > 60) delete st.best[keys.shift()];
  store('sd.daily', st);
  return `<div class="lg-card daily"><span class="label">Daily challenge · ${esc(D.id)} · ${esc(D.rule.name)}</span>
    <h3>${score.toLocaleString()} points${score > prev && !first ? ' · new best!' : ''}</h3>
    <p class="small">${s[0] * 100} for rounds, ${Math.round(tot.d / 10)} for damage${won ? ', 300 for the win' : ''}. Best today: <b>${st.best[D.id].toLocaleString()}</b>.</p>
    ${first ? `<p class="lg-prize">Day ${st.streak} in a row · <i class="boltico" aria-hidden="true"></i> +${60 + 10 * Math.min(st.streak, 7)} bolts and a mod chip</p>` : '<p class="small">Play again to beat your score. The reward comes once a day.</p>'}</div>`;
}
function dailyMenuHtml() {
  const D = dailyToday(),
    st = dailyState(),
    best = st.best[D.id];
  return `<div class="dl-menu"><span class="label">Today · ${esc(D.id)}</span>
    <h3 class="dl-rule">${esc(D.rule.name)}</h3><p>${esc(D.rule.text)}</p>
    <p class="small">Five rounds against <b>${esc(D.rival.name)}</b> in <b>${esc(THEMES[D.theme].name)}</b>. Same drafts for everyone today. ${best != null ? `Your best: <b>${best.toLocaleString()}</b>.` : 'First play of the day gives bolts and a mod chip.'}${st.streak ? ` Streak: ${st.streak} day${st.streak > 1 ? 's' : ''}.` : ''}</p>
    <button class="btn hg-go2" id="dlPlay">${best != null ? 'Try to beat it' : 'Play today\'s challenge'}</button></div>`;
}
