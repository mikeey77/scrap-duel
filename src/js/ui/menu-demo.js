// The living menu: two bots with random drafted cars fight behind the menu, with a commentary feed.
const DEMO_LINES = [
  n => `${n} is warming up the welder`,
  n => `${n} swears this build is balanced`,
  n => `${n} has been banned from three junkyards`,
  n => `${n} brought spare tyres. Not for the car.`
];
let demoFeedItems = [];
/** Picks a bot profile, drafts it forward a few rounds and builds a car from it. */
function demoCar(idx, special) {
  const P = makeBot(1 + (Math.random() < 0.3 ? 1 : 0)),
    rounds = 1 + Math.floor(Math.random() * 7);
  for (let r = 0; r < rounds; r++) {
    botDraft(P);
    P.coins += 120;
    botShop(P);
  }
  return {
    design: packDesign(botBuild(P)),
    tune: [...P.tune],
    name: P.name,
    paint: P.paint,
    ctrl: 'bot',
    style: P.style,
    diff: 1,
    look: randomLook(2)
  };
}
function demoStart() {
  if (inMatch() && G.phase !== 'menu' && G.phase !== 'intro') return;
  const ti = Math.floor(Math.random() * THEMES.length),
    special = Math.random() < 0.45 ? pick(Object.keys(SPECIALS)) : null;
  B = newB({ net: null, me: 0, theme: THEMES[ti], t: 90, demo: true, seq: 'count' });
  const a = demoCar(0, special),
    b = demoCar(1, special);
  if (b.name === a.name) b.name += ' Jr.';
  if (b.paint === a.paint) b.paint = PAINTS.find(p => p !== a.paint);
  const f = applySpecialField(genArena('battle', THEMES[ti]), special);
  setupField('battle', f);
  B.cfg = { cars: [a, b], special, theme: ti };
  setupSpecial(special);
  B.cars = [carFromCfg(a, 0), carFromCfg(b, 1)];
  B.cars.forEach(v => (v.ctrl = 'bot'));
  $('#arena').hidden = false;
  $('#build').hidden = true;
  $('#waitcard').hidden = true;
  $('#abtns').innerHTML = '';
  sizeArena();
  cam.x = cam.tx = AW / 2;
  cam.y = cam.ty = AH / 2;
  cam.z = cam.tz = 1;
  const S = special && SPECIALS[special];
  demoFeed(`LIVE · ${a.name} vs ${b.name} · ${THEMES[ti].name}${S ? ' · ' + S.name : ''}`, true);
  demoFeed(pick(DEMO_LINES)(pick([a.name, b.name])));
}
function demoNext() {
  const w = B.win;
  demoFeed(w == null ? 'Draw! Nobody walks away happy.' : `${B.cars[w].name} wins the round`);
  demoStart();
}
function demoStop() {
  if (B && B.demo) B = null;
  demoFeedItems = [];
  $('#demoFeed').hidden = true;
}
function demoFeed(text, reset) {
  if (reset) demoFeedItems = [];
  demoFeedItems.unshift({ text, t: performance.now() });
  demoFeedItems = demoFeedItems.slice(0, 4);
  const el = $('#demoFeed');
  el.innerHTML = demoFeedItems.map((f, i) => `<div class="${i === 0 ? 'new' : ''}">${esc(f.text)}</div>`).join('');
  el.hidden = !(G.phase === 'menu' || G.phase === 'intro');
}
let demoChat = 0;
/** Light commentary while the bots fight. */
function demoTick(dt) {
  $('#demoFeed').hidden = !(G.phase === 'menu' || G.phase === 'intro');
  demoChat -= dt;
  if (demoChat > 0 || B.seq !== 'play') return;
  demoChat = rnd(6, 11);
  const [a, b] = B.cars,
    lead = integrity(a) > integrity(b) ? a : b,
    other = lead === a ? b : a;
  const lines = [
    `${lead.name} is ahead on armor`,
    `${other.name} needs a miracle`,
    `${other.name} is down to ${Math.round(integrity(other) * 100)}%`,
    B.obj ? `${SPECIALS[B.special].name}: it's anyone's game` : `${Math.ceil(B.t)} seconds on the clock`
  ];
  demoFeed(pick(lines));
}
