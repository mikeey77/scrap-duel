// Bot banter: speech bubbles over bot cars at key moments (start, taking hits, nearly wrecked, wrecking you).
const BANTER = {
  start: [
    'Let’s dance.',
    'Nice paint. Shame about what happens next.',
    'I’ve seen scarier toasters.',
    'Is that a car or a filing cabinet?',
    'I built mine from a fridge. Fear me.',
    'Seatbelts are for quitters.',
    'My mechanic said this was a bad idea.',
    'Warranty void in 3… 2… 1…',
    'I’m 40% duct tape and 60% confidence.',
    'Who welded that? A raccoon?'
  ],
  hurt: [
    'Hey! That was a new part!',
    'Rude.',
    'I needed that!',
    'Ouch, my wheel!',
    'That was a rental!',
    'My insurance doesn’t cover this.',
    'I can fix that. Probably.',
    'Not the cup holder!',
    'Okay, now it’s personal.'
  ],
  low: [
    'Just a scratch!',
    'I meant to do that.',
    'Tis but a flesh wound.',
    'Running on fumes here…',
    'The check-engine light is now a bonfire.',
    'Everything’s fine. This is fine.',
    'Is it supposed to smell like that?',
    'I can see the road through the floor.'
  ],
  wreck: [
    'Scrap metal!',
    'Another one for the pile.',
    'Was that your best?',
    'Sold for parts!',
    'I’ll take the hubcaps, thanks.',
    'Your car is now modern art.'
  ],
  win: [
    'Too easy.',
    'Better luck next round!',
    'Did you try turning it off and on again?',
    'GG. Mostly G.',
    'I’ll send you the repair bill.'
  ],
  lose: [
    'I let you win that one.',
    'My cat was driving.',
    'Rematch. Now.',
    'The sun was in my eyes. Indoors.',
    'Lag. Definitely lag.',
    'I was testing your armour. For science.',
    'I’m telling my mum.'
  ]
};
const BOT_NAMES = Object.fromEntries(BOTS.map(b => [b.name, b]));
/** A bot (solo or menu demo) says something; at most one line every few seconds per car. */
function botSay(v, kind, chance = 1) {
  if (!B || !v || v.ctrl !== 'bot' || v.dead || Math.random() > chance) return;
  if ((v.sayT || 0) > B.time) return;
  v.sayT = B.time + 5;
  const own = BOT_NAMES[v.name] && BOT_NAMES[v.name].say,
    lines = kind === 'start' && own && Math.random() < 0.7 ? own : BANTER[kind];
  B.bubbles = B.bubbles || [];
  B.bubbles.push({ car: v.idx, text: pick(lines), t: 2.8 });
}
function drawBubbles(c) {
  if (!B.bubbles || !B.bubbles.length) return;
  c.save();
  c.font = '600 13px "Barlow Semi Condensed", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const b of B.bubbles) {
    const v = B.cars[b.car];
    if (!v || v.dead) continue;
    const w = c.measureText(b.text).width + 18,
      x = v.x,
      y = v.y - v.rad - 48;
    c.globalAlpha = Math.min(1, b.t * 2, (2.8 - b.t) * 6);
    rr(c, x - w / 2, y - 13, w, 26, 10);
    c.fillStyle = '#ece8df';
    c.fill();
    c.beginPath();
    c.moveTo(x - 6, y + 12);
    c.lineTo(x, y + 20);
    c.lineTo(x + 6, y + 12);
    c.fill();
    c.fillStyle = '#1b1f23';
    c.fillText(b.text, x, y + 1);
  }
  c.restore();
}
function stepBubbles(dt) {
  if (!B.bubbles) return;
  for (const b of B.bubbles) b.t -= dt;
  B.bubbles = B.bubbles.filter(b => b.t > 0);
}

/* ---------- rivals remember you ----------
   Every bot keeps your head-to-head record (sd.rivalbook). On the VS screen it radios in with a line that fits:
   a first meeting, a grudge, revenge, or the score in this match. */
function rivalBook() {
  try {
    return JSON.parse(load('sd.rivalbook') || '{}') || {};
  } catch (e) {
    return {};
  }
}
function rivalRecord(name, won, tie) {
  if (!name) return;
  const book = rivalBook(),
    r = (book[name] = book[name] || { w: 0, l: 0, d: 0 });
  if (tie) r.d++;
  else if (won) r.w++;
  else r.l++;
  r.last = tie ? 'd' : won ? 'w' : 'l';
  r.at = Date.now();
  store('sd.rivalbook', book);
}
const RADIO = {
  first: [
    'First time, {me}? Try not to cry when it is over.',
    'Fresh meat. Nice bumper. I am keeping it.',
    'Never heard of you, {me}. After today, nobody will.'
  ],
  meLead: [
    '{me} again. You got lucky {w} times. Luck runs out.',
    'I studied your car all week, {me}. I have notes. Mean ones.',
    '{w} to {l}? I have been sandbagging. Obviously.'
  ],
  themLead: [
    'Back for more, {me}? That makes it {l} to {w} for me.',
    'There is a {me}-shaped dent on my trophy shelf.',
    'Ah, {me}. My favourite source of spare parts.'
  ],
  revenge: [
    'Last time you went home in a bucket, {me}.',
    'You want revenge? Take a number.',
    'I have your old hubcap on my wall, {me}.'
  ],
  owed: [
    'You beat me last time. I have not slept since.',
    'Remember last time? I do. Every night.',
    'Rematch, {me}. And this time I read the manual.'
  ],
  ahead: ['Score check: me. Just me.', 'Keep this up and I will name a part after you.'],
  behind: ['That was a warm-up. This one counts.', 'Fine. Now I am angry.'],
  even: ['All square. Not for long.', 'Tied. I hate ties. Ties are for suits.'],
  final: ['Final round, double points, double tears.', 'Last round. Make it pretty for the replay.']
};
/** The rival's line for the VS screen, or '' in team and online matches. */
function rivalRadio(round) {
  if (G.mode !== 'solo' || G.teamSize === 2 || !G.oppName) return '';
  if (G.run && G.run.boss && G.run.bossDef) return G.run.bossDef.taunt;
  const r = rivalBook()[G.oppName] || { w: 0, l: 0 },
    fill = s =>
      s
        .replace(/\{me\}/g, G.name)
        .replace(/\{w\}/g, r.w)
        .replace(/\{l\}/g, r.l);
  let set;
  if (round > 1) {
    const d = G.score[1] - G.score[0];
    set = round === ROUNDS ? RADIO.final : d > 0 ? RADIO.ahead : d < 0 ? RADIO.behind : RADIO.even;
  } else if (!r.w && !r.l) set = RADIO.first;
  else if (r.last === 'l') set = RADIO.revenge;
  else if (r.last === 'w') set = Math.random() < 0.5 ? RADIO.owed : r.w > r.l ? RADIO.meLead : RADIO.themLead;
  else set = r.w >= r.l ? RADIO.meLead : RADIO.themLead;
  return fill(pick(set));
}
