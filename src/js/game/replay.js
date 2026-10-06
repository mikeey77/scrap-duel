// Round recording, kill-cam and full replays. Recording reuses the multiplayer snapshot format.
const REC_HZ = 20;
const TAPE_MAX = 4000;

/** Host/solo: take a snapshot 20 times a second, keep it on the tape and send it to the client if online. */
function recTick(dt) {
  B.recAcc = (B.recAcc || 0) + dt;
  if (B.recAcc < 1 / REC_HZ) return;
  B.recAcc = 0;
  const snap = snapshot();
  if (B.tape.length < TAPE_MAX) B.tape.push(snap);
  if (B.net === 'host') Net.sendSnap(snap);
}

let RP = null; // the replay being played
/** mode 'kill': the seconds around the last wreck in slow motion. mode 'full': the whole round. */
function startReplay(mode, R = G.lastReplay) {
  if (!R || !R.tape.length || !R.cfg) return;
  let from = 0,
    to = R.tape.length - 1,
    speed = 1;
  if (mode === 'kill') {
    let di = -1;
    for (let i = R.tape.length - 1; i > 0; i--)
      if (R.tape[i].q === 'death' && R.tape[i - 1].q !== 'death') {
        di = i;
        break;
      }
    if (di < 0) return;
    from = Math.max(0, di - 3.5 * REC_HZ);
    to = Math.min(R.tape.length - 1, di + 1.6 * REC_HZ);
    speed = 0.45;
  }
  RP = { R, i: 0, t: from / REC_HZ, from, to, speed, mode, prevPhase: G.phase, end: 0 };
  $('#ovResult').hidden = true;
  $('#build').hidden = true;
  $('#arena').hidden = false;
  G.phase = 'replay';
  sizeArena();
  B = newB({ net: 'client', me: R.me, theme: THEMES[R.cfg.theme], replay: true, cfg: R.cfg, t: 90 });
  setupField('battle', deserializeField(R.cfg.field));
  setupSpecial(R.cfg.special);
  B.cars = carsFromCfg({ ...R.cfg, net: 'client' });
  while (RP.i < from) applySnap(R.tape[RP.i++], true);
  const v = myCar();
  cam.x = cam.tx = v.x;
  cam.y = cam.ty = v.y;
  cam.z = cam.tz = 1.3;
  replayButtons();
}
function replayButtons() {
  const sp = [0.25, 0.5, 1, 2];
  $('#abtns').innerHTML =
    `<span class="replay-note" id="replayLesson" aria-live="polite">Watch for red markers: broken connections and exposed cockpits.</span><span class="rplabel">${RP.mode === 'kill' ? 'KILL-CAM' : 'REPLAY'}</span>${sp
      .map(s => `<button class="btn ghost${Math.abs(RP.speed - s) < 0.01 ? ' on' : ''}" data-s="${s}">${s}×</button>`)
      .join('')}<button class="btn ok" id="rpExit">Back to results</button>`;
  $$('#abtns [data-s]').forEach(b =>
    b.addEventListener('click', () => {
      RP.speed = +b.dataset.s;
      replayButtons();
    })
  );
  $('#rpExit').addEventListener('click', endReplay);
}
function replayStep(dt) {
  if (!RP) return;
  RP.t += dt * RP.speed;
  const target = Math.min(RP.to, Math.floor(RP.t * REC_HZ));
  while (RP.i <= target) applySnap(RP.R.tape[RP.i++]);
  stepArena(dt * RP.speed);
  const lesson = B.replayLesson;
  $('#replayLesson').textContent =
    lesson && lesson.until > B.time
      ? `${B.cars[lesson.car]?.name || 'Vehicle'}: ${lesson.text}`
      : 'Watch for red markers: broken connections and exposed cockpits.';
  if (RP.i > RP.to) {
    RP.end += dt;
    if (RP.end > 1.2) endReplay();
  }
}
function endReplay() {
  if (!RP) return;
  G.phase = RP.prevPhase;
  RP = null;
  B = null;
  $('#abtns').innerHTML = '';
  $('#arena').hidden = true;
  $('#build').hidden = false;
  $('#ovResult').hidden = false;
}
