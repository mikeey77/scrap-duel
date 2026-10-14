// League (championship): a season against five fixed rivals. Every matchday you play one of them over five rounds;
// the other rivals play each other off-screen. Three points for a win, one for a draw. After five matchdays
// the top two meet in the final. A season is saved as you go, so you can stop between matchdays.
const LEAGUE_DAYS = 5;
let LEAGUE = null;
function loadLeague() {
  try {
    const L = JSON.parse(load('sd.league') || 'null');
    LEAGUE = L && Array.isArray(L.rivals) && L.table ? L : null;
  } catch (e) {
    LEAGUE = null;
  }
  return LEAGUE;
}
const saveLeague = () => store('sd.league', LEAGUE);
const ME = '__me';
function newSeason() {
  const prev = loadLeague(),
    season = (prev ? prev.season : 0) + 1,
    pool = [...BOTS].sort(() => Math.random() - 0.5).slice(0, 5);
  // rivals get stronger through the season and from season to season
  const rivals = pool.map((b, i) => ({
    name: b.name,
    style: b.style,
    likes: b.likes,
    paint: b.paint,
    say: b.say,
    str: clamp(i * 0.45 + (season - 1) * 0.5 + Math.random() * 0.3, 0, 2.6),
    diff: clamp(Math.round(i / 2 + (season - 1) * 0.5), 0, 2)
  }));
  const table = { [ME]: row() };
  for (const r of rivals) table[r.name] = row();
  LEAGUE = { season, day: 0, rivals, table, log: [], final: null, champion: null };
  saveLeague();
  return LEAGUE;
}
const row = () => ({ p: 0, w: 0, d: 0, l: 0, pts: 0, rf: 0, ra: 0 });
function addResult(a, b, ra, rb) {
  const A = LEAGUE.table[a],
    Bt = LEAGUE.table[b];
  A.p++;
  Bt.p++;
  A.rf += ra;
  A.ra += rb;
  Bt.rf += rb;
  Bt.ra += ra;
  if (ra > rb) {
    A.w++;
    A.pts += 3;
    Bt.l++;
  } else if (rb > ra) {
    Bt.w++;
    Bt.pts += 3;
    A.l++;
  } else {
    A.d++;
    Bt.d++;
    A.pts++;
    Bt.pts++;
  }
}
/** A five-round match between two rivals, decided by their strength and some luck. */
function simMatch(x, y) {
  const px = 0.5 + (x.str - y.str) * 0.12;
  let a = 0,
    b = 0;
  for (let r = 1; r <= 5; r++) {
    const pts = r === 5 ? 2 : 1;
    if (Math.random() < clamp(px, 0.15, 0.85)) a += pts;
    else b += pts;
  }
  return [a, b];
}
const leagueName = k => (k === ME ? G.name : k);
function standings() {
  return Object.entries(LEAGUE.table)
    .map(([k, r]) => ({ k, ...r }))
    .sort((a, b) => b.pts - a.pts || b.rf - b.ra - (a.rf - a.ra) || b.rf - a.rf || (a.k === ME ? -1 : 1));
}
const leagueOpp = () => (LEAGUE && LEAGUE.day < LEAGUE_DAYS ? LEAGUE.rivals[LEAGUE.day] : null);
function leagueFinalist() {
  const s = standings();
  return s[0].k === ME ? s[1].k : s[1].k === ME ? s[0].k : null;
}
/** Starts your next league match (a matchday or the final). */
function playLeague() {
  if (!LEAGUE) newSeason();
  let opp;
  if (LEAGUE.day < LEAGUE_DAYS) opp = LEAGUE.rivals[LEAGUE.day];
  else if (LEAGUE.final && !LEAGUE.final.done) opp = LEAGUE.rivals.find(r => r.name === LEAGUE.final.opp);
  if (!opp) return;
  const keepR = G.rounds,
    prevDiff = G.diff;
  G.teamSize = 1;
  G.diff = LEAGUE.final && LEAGUE.day >= LEAGUE_DAYS ? 2 : opp.diff;
  G.rounds = 5;
  G.leagueStarting = true;
  startMatch('solo', null, 'balanced');
  G.leagueStarting = false;
  G.rounds = keepR;
  G.league = { opp: opp.name, final: LEAGUE.day >= LEAGUE_DAYS, prevDiff };
  Object.assign(G.bot, { name: opp.name, style: opp.style, likes: opp.likes, paint: opp.paint, say: opp.say });
  G.oppName = opp.name;
  G.oppPaint = opp.paint === G.paint ? PAINTS.find(p => p !== G.paint) : opp.paint;
}
/** Called from showFinal: books the result, plays the other matches and returns the card for the result screen. */
function leagueResult(won, tie, s) {
  if (!G.league || !LEAGUE) return '';
  const L = G.league,
    res = tie ? [s[0], s[0]] : [s[0], s[1]];
  G.diff = L.prevDiff;
  G.league = null;
  let html = '';
  if (L.final) {
    LEAGUE.final.done = true;
    LEAGUE.final.won = won;
    LEAGUE.champion = won ? ME : L.opp;
    html = leagueSeasonEnd();
  } else {
    addResult(ME, L.opp, res[0], res[1]);
    // the others play their matchday: two matches between the four rivals you did not face
    const rest = LEAGUE.rivals.filter(r => r.name !== L.opp);
    const rot = LEAGUE.day % rest.length,
      order = [...rest.slice(rot), ...rest.slice(0, rot)];
    const day = [];
    for (let i = 0; i + 1 < order.length; i += 2) {
      const [a, b] = simMatch(order[i], order[i + 1]);
      addResult(order[i].name, order[i + 1].name, a, b);
      day.push(`${esc(order[i].name)} ${a}–${b} ${esc(order[i + 1].name)}`);
    }
    LEAGUE.log.push({ day: LEAGUE.day + 1, me: `${res[0]}–${res[1]} vs ${L.opp}`, others: day });
    LEAGUE.day++;
    if (LEAGUE.day >= LEAGUE_DAYS) {
      const fin = leagueFinalist(),
        s2 = standings();
      if (fin) LEAGUE.final = { opp: fin, done: false };
      else {
        // you missed the final: the top two play it out
        const [a, b] = simMatch(LEAGUE.rivals.find(r => r.name === s2[0].k), LEAGUE.rivals.find(r => r.name === s2[1].k));
        LEAGUE.final = { opp: null, done: true, sim: `${s2[0].k} ${a}–${b} ${s2[1].k}` };
        LEAGUE.champion = a >= b ? s2[0].k : s2[1].k;
        html = leagueSeasonEnd();
      }
    }
    if (!html)
      html = `<div class="lg-card"><span class="label">League · season ${LEAGUE.season} · matchday ${LEAGUE.day}/${LEAGUE_DAYS}</span>
        ${leagueTableHtml(true)}<p class="small">Also today: ${day.join(' · ')}</p>
        ${LEAGUE.final && !LEAGUE.final.done ? `<p class="lg-next">You made the final against <b>${esc(LEAGUE.final.opp)}</b>.</p>` : `<p class="lg-next">Next: <b>${esc(leagueOpp().name)}</b></p>`}</div>`;
  }
  saveLeague();
  return html;
}
/** Season over: prizes by final position. */
function leagueSeasonEnd() {
  const champ = LEAGUE.champion === ME,
    pos = standings().findIndex(r => r.k === ME) + 1;
  const bolts = champ ? 300 : pos <= 2 ? 150 : pos <= 3 ? 90 : 50;
  addBolts(bolts);
  let chip = '';
  if (champ) {
    grantAch('league');
    const k = chipKey(pick(CHIP_IDS), 3);
    addChip(k);
    chip = ` and a <b>${esc(chipName(k))}</b> chip`;
  }
  LEAGUE.prize = { bolts, champ };
  return `<div class="lg-card ${champ ? 'champ' : ''}"><span class="label">League · season ${LEAGUE.season} is over</span>
    <h3>${champ ? 'Champions!' : `${esc(leagueName(LEAGUE.champion))} takes the title`}</h3>
    <p>${champ ? 'You won the final. The trophy is yours, the confetti is everyone\'s.' : LEAGUE.final && LEAGUE.final.sim ? `Final: ${esc(LEAGUE.final.sim)}. You finished ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'}.` : 'So close. You lost the final.'}</p>
    <p class="lg-prize"><i class="boltico" aria-hidden="true"></i> +${bolts} bolts${chip}</p>
    ${leagueTableHtml(true)}</div>`;
}
function leagueTableHtml(compact) {
  return `<table class="lg-table"><thead><tr><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th>${compact ? '' : '<th>Rounds</th>'}<th>Pts</th></tr></thead><tbody>${standings()
    .map((r, i) => {
      const rv = LEAGUE.rivals.find(x => x.name === r.k);
      return `<tr class="${r.k === ME ? 'me' : ''}${i < 2 ? ' top' : ''}"><td>${i + 1}</td><td><i class="lg-dot" style="background:${r.k === ME ? G.paint : rv.paint}"></i>${esc(leagueName(r.k))}${LEAGUE.champion === r.k ? ' <b class="lg-cup">Champion</b>' : ''}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>${compact ? '' : `<td>${r.rf}–${r.ra}</td>`}<td><b>${r.pts}</b></td></tr>`;
    })
    .join('')}</tbody></table>`;
}
/** The options panel of the Championship tile in the main menu. */
function leagueMenuHtml() {
  loadLeague();
  if (!LEAGUE)
    return `<p class="small">A season of five matchdays against the same five rivals, five rounds each. Three points for a win. The top two play the final; the champion takes 300 bolts and a Mk III chip.</p><button class="btn hg-go2" id="lgStart">Start season 1</button>`;
  const over = LEAGUE.champion != null;
  const next = over
    ? null
    : LEAGUE.day < LEAGUE_DAYS
      ? `Matchday ${LEAGUE.day + 1} of ${LEAGUE_DAYS}: <b>${esc(LEAGUE.rivals[LEAGUE.day].name)}</b> · ${DIFF[LEAGUE.rivals[LEAGUE.day].diff].name}`
      : `The final: <b>${esc(LEAGUE.final.opp)}</b> · Hard`;
  return `<div class="lg-menu"><span class="label">Season ${LEAGUE.season}${over ? ' · finished' : ''}</span>${leagueTableHtml(false)}
    ${over ? `<p class="small">${LEAGUE.champion === ME ? 'You are the champion.' : `${esc(LEAGUE.champion)} won the title.`} A new season brings stronger rivals.</p><button class="btn hg-go2" id="lgStart">Start season ${LEAGUE.season + 1}</button>` : `<p class="lg-next">${next}</p><button class="btn hg-go2" id="lgPlay">${LEAGUE.day < LEAGUE_DAYS ? `Play matchday ${LEAGUE.day + 1}` : 'Play the final'}</button>`}
    ${over ? '' : '<button class="linkbtn" id="lgReset" type="button">Give up this season</button>'}</div>`;
}
function leagueMenuWire(rerender) {
  const st = $('#lgStart'),
    pl = $('#lgPlay'),
    rs = $('#lgReset');
  if (st)
    st.onclick = () => {
      newSeason();
      sfx('ui');
      rerender();
    };
  if (pl)
    pl.onclick = () => {
      sfx('ui');
      G.started = true;
      playLeague();
    };
  if (rs)
    rs.onclick = () => {
      if (!rs.dataset.sure) {
        rs.dataset.sure = 1;
        rs.textContent = 'Sure? Click again to give up the season';
        return;
      }
      LEAGUE = null;
      store('sd.league', 'null');
      rerender();
    };
}
