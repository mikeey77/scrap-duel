// Workshop contracts: three small jobs a day, the same three for the whole day. Progress counts in every match
// against bots (Duel, League, Daily, Gauntlet). A finished contract pays out at once.
const CONTRACTS = [
  { id: 'win1', text: 'Win a match against a bot', n: 1, ev: 'win', pay: 50 },
  { id: 'rounds', text: 'Win {n} rounds', n: 8, ev: 'rounds', pay: 50 },
  { id: 'dmg', text: 'Deal {n} damage', n: 6000, ev: 'dmg', pay: 50 },
  { id: 'guns', text: 'Win with 3 or more guns on your car', n: 1, ev: 'winGuns', pay: 70 },
  { id: 'melee', text: 'Win with 3 or more melee parts', n: 1, ev: 'winMelee', pay: 70 },
  { id: 'nogun', text: 'Win a match without a single gun', n: 1, ev: 'winNoGun', pay: 90 },
  { id: 'wave', text: 'Reach wave {n} in the Gauntlet', n: 6, ev: 'wave', max: 1, pay: 70 },
  { id: 'league', text: 'Win a League match', n: 1, ev: 'league', pay: 60 },
  { id: 'daily', text: 'Play the daily challenge', n: 1, ev: 'daily', pay: 40 },
  { id: 'team', text: 'Win a 2v2 match', n: 1, ev: 'win2v2', pay: 60 },
  { id: 'hard', text: 'Win a match on Hard', n: 1, ev: 'winHard', pay: 90 },
  { id: 'clean', text: 'Win a match taking less damage than you deal twice over', n: 1, ev: 'winClean', pay: 70 },
  { id: 'brawl', text: 'Win a Blueprint Brawl', n: 1, ev: 'winBrawl', pay: 60 }
];
function contractsToday() {
  const id = dailyId(),
    rnd = seededRandom(hashStr('contracts:' + id)),
    pool = [...CONTRACTS];
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  let st;
  try {
    st = JSON.parse(load('sd.contracts') || 'null');
  } catch (e) {}
  if (!st || st.day !== id) st = { day: id, prog: {}, done: [] };
  return { list: out, st };
}
const contractText = C => C.text.replace('{n}', C.n.toLocaleString());
/** Books what happened in a match; returns the contracts that were just finished. */
function contractsUpdate(ev) {
  const { list, st } = contractsToday(),
    finished = [];
  for (const C of list) {
    if (st.done.includes(C.id) || ev[C.ev] == null) continue;
    const v = +ev[C.ev] || 0;
    st.prog[C.id] = C.max ? Math.max(st.prog[C.id] || 0, v) : (st.prog[C.id] || 0) + v;
    if (st.prog[C.id] >= C.n) {
      st.done.push(C.id);
      addBolts(C.pay);
      if (st.done.length === 3) {
        addChip(rollChip(2)); // all three: a Mk II chip on top
        grantAch('shift');
      }
      finished.push(C);
    }
  }
  store('sd.contracts', st);
  for (const C of finished) toast(`Contract done: ${contractText(C)} · +${C.pay} bolts`, true);
  return finished;
}
/** What a finished match means for the contracts. */
function contractsFromMatch(won, tot) {
  const ms = [...G.base.values(), ...G.top.values()].map(e => MOD[e.id]).filter(Boolean),
    guns = ms.filter(m => m.wpn).length,
    melee = ms.filter(m => m.cat === 'melee').length,
    ev = { rounds: tot.w, dmg: tot.d };
  if (won) {
    ev.win = 1;
    if (guns >= 3) ev.winGuns = 1;
    if (melee >= 3) ev.winMelee = 1;
    if (!guns) ev.winNoGun = 1;
    if (G.teamSize === 2) ev.win2v2 = 1;
    if (G.diff === 2) ev.winHard = 1;
    if (tot.d >= tot.t * 2) ev.winClean = 1;
    if (G.format === 'brawl') ev.winBrawl = 1;
  }
  return ev;
}
function contractsHtml() {
  const { list, st } = contractsToday();
  return `<div class="ct-box"><span class="label">Today's contracts · ${st.done.length}/3</span>${list
    .map(C => {
      const done = st.done.includes(C.id),
        p = Math.min(C.n, st.prog[C.id] || 0);
      return `<div class="ct${done ? ' done' : ''}"><span>${esc(contractText(C))}</span><b>${done ? 'Done' : `<i class="boltico" aria-hidden="true"></i>${C.pay}`}</b>${C.n > 1 && !done ? `<span class="ct-bar"><i style="width:${Math.round((p / C.n) * 100)}%"></i></span>` : ''}</div>`;
    })
    .join(
      ''
    )}${st.done.length === 3 ? '<p class="small">All three done. New contracts tomorrow.</p>' : '<p class="small">Finish all three for a Mk II chip.</p>'}</div>`;
}
