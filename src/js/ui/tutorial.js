// First-time coach tips: one short card per new screen, shown once and remembered in localStorage.
const TIPS = {
  draft: [
    'Draft',
    'Take one of three cards. Parts you take steer what shows up later, so pick a direction: fire, guns, melee, explosives…'
  ],
  build: [
    'Garage',
    'Pick a part in the bin and click the bay to bolt it on. Wheels and blades go on the base layer; guns go on top of support blocks. Short on time? Hit Auto-place.'
  ],
  special: [
    'Special round ahead',
    'The next round has special rules (see the banner). Build for it: pushers for Piano Push, speed for the Duck Heist, armor for King of the Hill.'
  ],
  wait: [
    'Waiting arena',
    'Test-drive while your rival finishes. WASD drives, the mouse aims, left-click fires. Smash the dummies to check your guns.'
  ],
  battle: [
    'Fight!',
    'Destroy the enemy cockpit (the red diamond) to win. Parts around a cockpit shield it, so chew through the armor first. Grab coins and repair kits in the middle.'
  ],
  specialFight: [
    'Special round',
    'Watch the objective line under the timer. In objective rounds wrecked cars respawn, so the objective decides it.'
  ]
};
let seenTips = new Set();
try {
  seenTips = new Set(JSON.parse(load('sd.tips') || '[]'));
} catch (e) {}
let tipTimer = 0;
function showTip(id) {
  if (seenTips.has(id) || !TIPS[id] || window.__SD_TEST__) return;
  seenTips.add(id);
  store('sd.tips', [...seenTips]);
  const [title, text] = TIPS[id],
    el = $('#coach');
  el.innerHTML = `<b>${esc(title)}</b><p>${esc(text)}</p><div><button class="btn ghost" id="coachOk">Got it</button><button class="linkbtn" id="coachOff">Turn tips off</button></div>`;
  el.hidden = false;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => (el.hidden = true), 16000);
  $('#coachOk').addEventListener('click', () => (el.hidden = true));
  $('#coachOff').addEventListener('click', () => {
    for (const k in TIPS) seenTips.add(k);
    store('sd.tips', [...seenTips]);
    el.hidden = true;
  });
}
