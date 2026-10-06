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
