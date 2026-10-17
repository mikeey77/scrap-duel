// Open world, part 7: explaining it. A field guide opens the first time you enter (and from the ? button or
// H any time), and a short first-steps list in the HUD teaches by doing: each step pays a little scrap.

const OW_STEPS = [
  { id: 'loot', text: 'Smash a crate or a building for parts', done: () => Object.values(OW.inv).some(n => n > 0) },
  { id: 'camp', text: 'Drive onto a camp pad and press Enter', done: () => OW.guide && OW.guide.camp },
  { id: 'mission', text: 'Take a mission at a camp', done: () => !!OW.mission || OW.done > 0 },
  { id: 'raider', text: 'Wreck a raider (red dots on the map)', done: () => OW.wrecked > 0 },
  { id: 'garage', text: 'Visit your garage next to the first camp', done: () => OW.guide && OW.guide.hq }
];
const OW_STEP_PAY = 25;
const owStepsDone = () => {
  try {
    return JSON.parse(load('sd.owSteps') || '[]');
  } catch (e) {
    return [];
  }
};

const OW_GUIDE_CARDS = [
  ['🧰', 'Loot everything', 'Crates, buildings and wrecks burst into parts. Drive over them: they land in My parts.'],
  [
    '⛺',
    'Camps',
    'Every road crossing has a camp. Stop on the pad and press Enter to repair, rebuild your car, take missions or travel.'
  ],
  [
    '🏠',
    'Your garage',
    'The shed next to the first camp. Park up to three cars, build from blueprints and turn spare parts into scrap.'
  ],
  [
    '☠',
    'Raiders',
    'Red dots on the map. They chase you when you come close. Wrecks stay behind: break them open for parts.'
  ],
  [
    '🌙',
    'Day, night and weather',
    'Night brings more raiders and better crates. Every biome has its own ground, weather and grip.'
  ]
];

/** The field guide: what the open world is and how it works, on one card. */
function owOpenGuide() {
  let ov = $('#ovOwGuide');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'ovOwGuide';
    ov.className = 'overlay';
    document.body.appendChild(ov);
  }
  ov.innerHTML = `<div class="card owguide" role="dialog" aria-labelledby="owgT">
    <span class="label">Field guide</span>
    <h2 id="owgT">The open world</h2>
    <p class="owg-lead">One big map made of every arena. Drive anywhere, find parts, make your car stronger and survive the night.</p>
    <div class="owg-cards">${OW_GUIDE_CARDS.map(
      ([i, h, t], n) =>
        `<div class="owg-c" style="--d:${n * 60}ms"><b class="owg-i" aria-hidden="true">${i}</b><h3>${h}</h3><p>${t}</p></div>`
    ).join('')}</div>
    <div class="owg-keys"><span><span class="kbd">W A S D</span> drive</span><span><span class="kbd">Mouse</span> aim</span><span><span class="kbd">Click</span> fire</span><span><span class="kbd">Enter</span> camp or garage</span><span><span class="kbd">H</span> this guide</span></div>
    <button class="btn" id="owgGo">Let's go</button>
  </div>`;
  ov.hidden = false;
  clearArenaInput();
  sfx('reveal');
  if (B) B.paused = true;
  $('#owgGo').onclick = owCloseGuide;
  $('#owgGo').focus();
}
function owCloseGuide() {
  const ov = $('#ovOwGuide');
  if (ov) ov.hidden = true;
  store('sd.owGuideSeen', 1);
  if (B) B.paused = false;
  sfx('ui');
}
addEventListener(
  'keydown',
  e => {
    if (G.phase !== 'world' || !OW) return;
    const ov = $('#ovOwGuide');
    if (ov && !ov.hidden && (e.key === 'Escape' || e.key === 'Enter')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      owCloseGuide();
    } else if ((e.key === 'h' || e.key === 'H') && !e.repeat && !(ov && !ov.hidden) && !$('#ovCamp:not([hidden])'))
      owOpenGuide();
  },
  true
);

/** Called when a world starts: the guide the first time, and the steps you haven't done yet. */
function owGuideStart() {
  OW.guide = { camp: false, hq: false, done: owStepsDone(), flash: {} };
  if (!load('sd.owGuideSeen') && !OW.net) setTimeout(() => G.phase === 'world' && OW && owOpenGuide(), 1700);
}
/** Ticks the steps off as you do them. */
function owGuideStep() {
  const Gd = OW.guide;
  if (!Gd || Gd.done.length >= OW_STEPS.length) return;
  if ($('#ovCamp') && !$('#ovCamp').hidden) Gd.camp = true;
  if ($('#ovHQ') && !$('#ovHQ').hidden) Gd.hq = true;
  for (const s of OW_STEPS) {
    if (Gd.done.includes(s.id) || !s.done()) continue;
    Gd.done.push(s.id);
    Gd.flash[s.id] = performance.now();
    store('sd.owSteps', JSON.stringify(Gd.done));
    OW.scrap += OW_STEP_PAY;
    owNote(`First steps: ${s.text.toLowerCase()} · +${OW_STEP_PAY} scrap`, '#5cc38f');
    sfx('coin');
    if (Gd.done.length === OW_STEPS.length)
      cineTitle('You know your way around', 'The world is yours. H opens the guide again.', '#5cc38f', 'win', {
        confetti: 80
      });
  }
}
/** The first-steps list, under the status box (and under the mission when there is one). */
function owGuideHUD(c) {
  const Gd = OW.guide;
  if (!Gd) return;
  const left = OW_STEPS.filter(s => !Gd.done.includes(s.id)),
    now = performance.now(),
    recent = OW_STEPS.filter(s => Gd.flash[s.id] && now - Gd.flash[s.id] < 1600);
  if (!left.length && !recent.length) return;
  const show = [...recent, ...left].slice(0, 3),
    y0 = OW.mission ? 194 : 124,
    h = 34 + show.length * 22;
  c.save();
  owPanel(c, 18, y0, 280, h, '#5cc38f');
  c.textAlign = 'left';
  c.fillStyle = '#5cc38f';
  c.font = '700 13px "Chakra Petch", sans-serif';
  c.fillText(`First steps · ${Gd.done.length}/${OW_STEPS.length}`, 32, y0 + 20);
  c.fillStyle = '#8fa3bd';
  c.font = '500 12px "Barlow Semi Condensed", sans-serif';
  c.textAlign = 'right';
  c.fillText('H: guide', 284, y0 + 20);
  c.textAlign = 'left';
  show.forEach((s, i) => {
    const y = y0 + 42 + i * 22,
      done = Gd.done.includes(s.id),
      k = done ? Math.min(1, (now - Gd.flash[s.id]) / 300) : 0;
    c.strokeStyle = done ? '#5cc38f' : 'rgba(223,233,245,.5)';
    c.lineWidth = 1.5;
    c.strokeRect(32.5, y - 10.5, 11, 11);
    if (done) {
      c.strokeStyle = '#5cc38f';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(34, y - 5);
      c.lineTo(37 + 0 * k, y - 1.5);
      c.lineTo(34 + 9 * k, y - 10 + 2 * (1 - k));
      c.stroke();
    }
    c.fillStyle = done ? 'rgba(92,195,143,.9)' : '#dfe9f5';
    c.font = '500 13px "Barlow Semi Condensed", sans-serif';
    c.fillText(s.text, 52, y);
  });
  c.restore();
}
