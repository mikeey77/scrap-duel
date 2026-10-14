// Start-up screen: the logo is welded together, a loading bar fills while fonts and voices warm up,
// then it fades into the hangar. Any key or click skips it.
const BOOT_LINES = [
  'Warming up the welder',
  'Counting bolts',
  'Bribing the referee',
  'Hosing down the arena',
  'Teaching the bots to drive',
  'Untangling the tow cables'
];
function bootScreen(done) {
  const el = document.createElement('div');
  el.id = 'boot';
  el.innerHTML = `<div class="bt-stripes" aria-hidden="true"></div>
    <div class="bt-logo" aria-label="Scrap Duel"><span class="bt-w1">SCRAP</span><span class="bt-w2">DUEL</span><i class="bt-weld" aria-hidden="true"></i></div>
    <div class="bt-load"><div class="bt-bar"><i></i></div><span id="btLine">${esc(pick(BOOT_LINES))}…</span></div>
    <span class="bt-ver">v${esc(GAME_VERSION)}</span>`;
  document.body.appendChild(el);
  let gone = false;
  const finish = () => {
    if (gone) return;
    gone = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), 450);
    removeEventListener('keydown', finish);
    el.removeEventListener('pointerdown', finish);
    if (done) done();
  };
  addEventListener('keydown', finish);
  el.addEventListener('pointerdown', finish);
  const line = setInterval(() => {
    const l = $('#btLine');
    if (!l || gone) return clearInterval(line);
    l.textContent = pick(BOOT_LINES) + '…';
  }, 600);
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const minTime = new Promise(r => setTimeout(r, calmMotion() ? 400 : 1900));
  Promise.all([ready, minTime]).then(finish);
}
