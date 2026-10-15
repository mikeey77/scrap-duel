// Synthesized sound effects (WebAudio, no audio files).
/* =================== SOUND (WebAudio synth, no files) =================== */
let AC = null,
  MASTER = null,
  NOISE = null,
  MUTE = false,
  NET_REPLAY = false;
const lastS = {};
function audio() {
  if (AC) return AC;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C();
    MASTER = AC.createGain();
    MASTER.gain.value = 0.45 * SETTINGS.vol;
    const comp = AC.createDynamicsCompressor();
    if (comp.threshold) comp.threshold.value = -18;
    if (comp.ratio) comp.ratio.value = 4;
    MASTER.connect(comp);
    try {
      // a short garage-sized room: everything gets a little tail so the hits feel physical
      const verb = AC.createConvolver(),
        wet = AC.createGain(),
        len = Math.floor(AC.sampleRate * 1.1),
        ir = AC.createBuffer(2, len, AC.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      verb.buffer = ir;
      wet.gain.value = 0.16;
      MASTER.connect(verb);
      verb.connect(wet);
      wet.connect(comp);
    } catch (e) {}
    comp.connect(AC.destination);
    NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = NOISE.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) {
    AC = null;
  }
  return AC;
}
const unlock = () => {
  const a = audio();
  if (a && a.state === 'suspended') a.resume();
};
addEventListener('pointerdown', unlock, true);
// remember the last input so the garage cockpit can doze off when you walk away
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel'])
  addEventListener(ev, () => (G.lastInput = performance.now()), { passive: true, capture: true });
addEventListener('keydown', unlock, true);
const BattleMusic = {
  bus: null,
  timer: null,
  step: 0,
  next: 0,
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.level = null;
    if (this.bus && AC) this.bus.gain.setTargetAtTime(0, AC.currentTime, 0.12);
  },
  note(freq, start, dur, vol, type = 'sawtooth') {
    const o = AC.createOscillator(),
      g = AC.createGain(),
      f = AC.createBiquadFilter();
    o.type = type;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.bus);
    o.start(start);
    o.stop(start + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      f.disconnect();
      g.disconnect();
    };
  },
  drum(start, snare = false) {
    if (snare) {
      const src = AC.createBufferSource(),
        g = AC.createGain(),
        f = AC.createBiquadFilter();
      src.buffer = NOISE;
      f.type = 'highpass';
      f.frequency.value = 1500;
      g.gain.setValueAtTime(0.11, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      src.connect(f);
      f.connect(g);
      g.connect(this.bus);
      src.start(start);
      src.stop(start + 0.15);
      src.onended = () => {
        src.disconnect();
        f.disconnect();
        g.disconnect();
      };
    } else {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.frequency.setValueAtTime(130, start);
      o.frequency.exponentialRampToValueAtTime(42, start + 0.13);
      g.gain.setValueAtTime(0.4, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
      o.connect(g);
      g.connect(this.bus);
      o.start(start);
      o.stop(start + 0.18);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
  },
  update() {
    const garage = !B && ['build', 'draft', 'review'].includes(G.phase) && G.started;
    const active =
      AC &&
      AC.state === 'running' &&
      !MUTE &&
      SETTINGS.music > 0 &&
      !document.hidden &&
      ((B && !B.demo && !B.replay && !B.paused && !Net.reconnecting && (G.phase === 'battle' || G.phase === 'world')) ||
        garage);
    if (!active) {
      if (this.timer) this.stop();
      return;
    }
    if (!this.bus) {
      this.bus = AC.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(MASTER);
    }
    const want = garage ? 'lounge' : musicStyleFor(B && B.theme);
    const level = SETTINGS.music * (garage ? 0.55 : 1);
    if (this.level !== level) {
      this.level = level;
      this.bus.gain.setTargetAtTime(level, AC.currentTime, 0.1);
    }
    if (this.timer && this.styleId === want) return;
    if (this.timer) clearInterval(this.timer);
    this.styleId = want;
    this.step = 0;
    this.next = AC.currentTime + 0.06;
    const S = MUSIC_STYLES[want];
    const schedule = () => {
      if (!AC || AC.state !== 'running') return;
      if (this.next < AC.currentTime) this.next = AC.currentTime + 0.02;
      let guard = 0;
      while (this.next < AC.currentTime + 0.12 && guard++ < 4) {
        const t = this.next,
          n = this.step++,
          bar = Math.floor(n / 16) % 4,
          root = S.roots[bar];
        // adaptive layers: last half minute, a nearly wrecked car, the final round
        const me = B && B.cars && B.cars[B.me],
          lastSecs = B && B.t < 30,
          danger = me && !me.dead && integrity(me) < 0.3,
          finale = B && G.round === ROUNDS && !G.run,
          intense = lastSecs || danger || finale;
        const k = S.kick;
        if (
          k === 'four'
            ? n % 4 === 0
            : k === 'half'
              ? n % 8 === 0
              : k === 'gallop'
                ? n % 4 === 0 || n % 16 === 10
                : k === 'soft'
                  ? n % 16 === 0
                  : n % 8 === 0
        )
          this.drum(t);
        if (k !== 'soft' && n % 8 === 4) this.drum(t, true);
        if ((S.hat || intense) && n % 2 === 1) this.hat(t, intense ? 0.05 : 0.03);
        const bassStep = S.offbeat ? n % 4 === 2 : true;
        if (bassStep)
          this.note(root * (n % 4 === 3 && !S.offbeat ? 2 : 1), t, S.bassLen || 0.12, S.bassVol || 0.12, S.bass);
        this.note(root * 2 * S.arp[n % S.arp.length], t, 0.15, intense ? S.leadVol * 1.6 : S.leadVol, S.lead);
        if (S.bell && n % 8 === 6) this.note(root * 4 * S.arp[(n >> 3) % S.arp.length], t, 0.5, 0.03, 'sine');
        if (n % 16 === 0)
          for (const ratio of S.pad || [1, 1.189, 1.5]) this.note(root * ratio, t, 1.4, S.padVol ?? 0.025, 'triangle');
        const bpm = S.bpm[intense ? 1 : 0] + (finale ? 8 : 0);
        this.next += 60 / bpm / 4;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 25);
  },
  hat(start, vol) {
    const src = AC.createBufferSource(),
      g = AC.createGain(),
      f = AC.createBiquadFilter();
    src.buffer = NOISE;
    f.type = 'highpass';
    f.frequency.value = 7000;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
    src.connect(f);
    f.connect(g);
    g.connect(this.bus);
    src.start(start);
    src.stop(start + 0.05);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
};
/* Music styles: every arena picks the one that fits its mood. All of it is generated live, so it costs no
   download, and each style changes up when the round gets tense. */
const MUSIC_STYLES = {
  metal: {
    bpm: [128, 144],
    roots: [110, 87.31, 130.81, 98],
    arp: [1, 1.5, 2, 2.378],
    lead: 'sawtooth',
    bass: 'square',
    kick: 'four',
    leadVol: 0.045
  },
  ice: {
    bpm: [112, 126],
    roots: [146.83, 123.47, 110, 130.81],
    arp: [1, 1.5, 2, 3],
    lead: 'triangle',
    bass: 'sine',
    kick: 'half',
    bell: 1,
    leadVol: 0.05,
    bassVol: 0.14
  },
  lava: {
    bpm: [136, 152],
    roots: [82.41, 87.31, 73.42, 98],
    arp: [1, 1.189, 1.5, 2],
    lead: 'sawtooth',
    bass: 'sawtooth',
    kick: 'four',
    hat: 1,
    leadVol: 0.05,
    bassVol: 0.1
  },
  neon: {
    bpm: [120, 134],
    roots: [110, 98, 87.31, 98],
    arp: [1, 1.26, 1.5, 2, 1.5, 1.26],
    lead: 'square',
    bass: 'sawtooth',
    kick: 'four',
    offbeat: 1,
    hat: 1,
    leadVol: 0.035,
    bassVol: 0.13,
    bassLen: 0.2
  },
  toy: {
    bpm: [132, 148],
    roots: [130.81, 174.61, 196, 130.81],
    arp: [1, 1.26, 1.5, 2],
    lead: 'square',
    bass: 'triangle',
    kick: 'boomchick',
    bell: 1,
    leadVol: 0.035,
    pad: [1, 1.26, 1.5]
  },
  spooky: {
    bpm: [96, 112],
    roots: [110, 103.83, 98, 92.5],
    arp: [1, 1.189, 1.414, 2],
    lead: 'triangle',
    bass: 'sine',
    kick: 'half',
    leadVol: 0.05,
    pad: [1, 1.189, 1.414],
    padVol: 0.035
  },
  desert: {
    bpm: [116, 128],
    roots: [110, 98, 87.31, 82.41],
    arp: [1, 1.5, 2, 1.5],
    lead: 'triangle',
    bass: 'square',
    kick: 'gallop',
    leadVol: 0.05,
    pad: [1, 1.26, 1.5]
  },
  surf: {
    bpm: [140, 156],
    roots: [146.83, 146.83, 196, 220],
    arp: [1, 1.26, 1.5, 1.26],
    lead: 'square',
    bass: 'triangle',
    kick: 'four',
    hat: 1,
    leadVol: 0.035,
    pad: [1, 1.26, 1.5]
  },
  lounge: {
    bpm: [92, 92],
    roots: [130.81, 110, 146.83, 98],
    arp: [1, 1.26, 1.5, 1.89],
    lead: 'triangle',
    bass: 'sine',
    kick: 'soft',
    leadVol: 0.03,
    bassVol: 0.09,
    bassLen: 0.3,
    offbeat: 1,
    pad: [1, 1.26, 1.5, 1.89],
    padVol: 0.03
  }
};
const MUSIC_BY_THEME = {
  chess: 'lounge',
  ice: 'ice',
  frozenlot: 'ice',
  glacier: 'ice',
  volcano: 'lava',
  kitchen: 'lava',
  scrapfactory: 'lava',
  pinball: 'neon',
  neonstrip: 'neon',
  space: 'neon',
  warpzone: 'neon',
  stormroof: 'neon',
  toyroom: 'toy',
  funfair: 'toy',
  backyard: 'toy',
  haunted: 'spooky',
  swamp: 'spooky',
  desert: 'desert',
  construction: 'desert',
  beach: 'surf',
  carwash: 'surf',
  market: 'surf'
};
const musicStyleFor = th => MUSIC_BY_THEME[(th && th.id) || ''] || 'metal';

/* Per-sound variation: a random pitch nudge and stereo position (set by playSfx). */
let SND_PITCH = 1,
  SND_PAN = 0;
function out(a) {
  if (!SND_PAN || !a.createStereoPanner) return MASTER;
  const p = a.createStereoPanner();
  p.pan.value = SND_PAN;
  p.connect(MASTER);
  return p;
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  const a = AC,
    t = a.currentTime + delay,
    o = a.createOscillator(),
    g = a.createGain();
  f0 *= SND_PITCH;
  f1 *= SND_PITCH;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(out(a));
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(dur, vol, f0, f1, q = 1, delay = 0, type = 'bandpass') {
  const a = AC,
    t = a.currentTime + delay,
    s = a.createBufferSource(),
    f = a.createBiquadFilter(),
    g = a.createGain();
  s.buffer = NOISE;
  s.loop = true;
  f.type = type;
  f.Q.value = q;
  f0 *= SND_PITCH;
  f1 *= SND_PITCH;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(out(a));
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}
const SFX = {
  gun: v => {
    noise(0.012, 0.35 * v, 6000, 4000, 0.7, 0, 'highpass');
    noise(0.07, 0.3 * v, 3000, 800, 1.2);
    tone('square', 190, 70, 0.05, 0.08 * v);
    tone('sine', 110, 50, 0.07, 0.12 * v);
  },
  shotgun: v => {
    noise(0.16, 0.45 * v, 2200, 300, 0.8);
    tone('sawtooth', 120, 40, 0.1, 0.12 * v);
  },
  cannon: v => {
    noise(0.3, 0.55 * v, 900, 80, 0.7);
    tone('sine', 110, 35, 0.3, 0.35 * v);
  },
  laser: v => {
    tone('sawtooth', 1400, 300, 0.12, 0.1 * v);
    tone('square', 900, 200, 0.1, 0.05 * v);
  },
  rocket: v => noise(0.35, 0.25 * v, 600, 2400, 2),
  mortar: v => {
    tone('sine', 260, 60, 0.18, 0.25 * v);
    noise(0.12, 0.2 * v, 500, 200);
  },
  zap: v => {
    for (let i = 0; i < 3; i++) tone('square', rnd(600, 1600), rnd(80, 300), 0.05, 0.08 * v, i * 0.03);
  },
  rail: v => {
    tone('sawtooth', 2200, 80, 0.4, 0.18 * v);
    noise(0.35, 0.35 * v, 5000, 400, 0.6);
  },
  charge: v => tone('sine', 200, 1200, 0.6, 0.08 * v),
  hum: v => tone('sawtooth', 90, 95, 0.12, 0.04 * v),
  flame: v => noise(0.18, 0.12 * v, 700, 500, 0.5),
  water: v => noise(0.16, 0.1 * v, 1800, 1200, 0.7),
  thump: v => {
    tone('sine', 180, 60, 0.12, 0.25 * v);
    noise(0.06, 0.15 * v, 400, 200);
  },
  splat: v => noise(0.14, 0.25 * v, 900, 200, 1.5),
  boom: v => {
    noise(0.02, 0.5 * v, 5000, 2000, 0.5, 0, 'highpass');
    noise(0.5, 0.6 * v, 1400, 50, 0.6, 0, 'lowpass');
    tone('sine', 90, 28, 0.45, 0.4 * v);
    for (let i = 0; i < 5; i++) noise(0.03, 0.12 * v, rnd(1500, 4000), 800, 3, 0.08 + i * rnd(0.04, 0.09));
  },
  bigboom: v => {
    noise(1.2, 0.9 * v, 1500, 40, 0.5, 0, 'lowpass');
    tone('sine', 70, 22, 1, 0.6 * v);
    noise(0.6, 0.3 * v, 4000, 600, 0.5, 0.05);
  },
  clang: v => {
    tone('triangle', rnd(500, 900), rnd(300, 500), 0.18, 0.16 * v);
    noise(0.05, 0.2 * v, 4000, 2000, 3);
  },
  grind: v => noise(0.08, 0.12 * v, 3000, 2500, 4),
  crash: v => {
    noise(0.3, 0.55 * v, 2000, 200, 0.5);
    tone('square', 140, 50, 0.2, 0.15 * v);
    tone('triangle', rnd(700, 1100), rnd(400, 600), 0.22, 0.06 * v, 0.03);
    noise(0.12, 0.15 * v, 5000, 3000, 4, 0.06);
  },
  punch: v => {
    tone('sine', 160, 50, 0.15, 0.35 * v);
    noise(0.08, 0.3 * v, 1200, 300);
  },
  spring: v => {
    tone('triangle', 300, 900, 0.15, 0.18 * v);
    tone('triangle', 900, 400, 0.2, 0.1 * v, 0.12);
  },
  pd: v => {
    tone('square', 2400, 1800, 0.04, 0.06 * v);
  },
  coin: v => {
    tone('square', 988, 988, 0.07, 0.08 * v);
    tone('square', 1319, 1319, 0.2, 0.08 * v, 0.07);
    tone('sine', 2637, 2637, 0.25, 0.03 * v, 0.07);
  },
  repair: v => {
    [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.12, 0.12 * v, i * 0.07));
  },
  horn: v => {
    const k = Math.random();
    if (k < 0.6) {
      tone('sawtooth', 370, 360, 0.45, 0.15 * v);
      tone('sawtooth', 466, 456, 0.45, 0.12 * v);
    } else if (k < 0.8)
      [523, 440, 523, 659].forEach((f, i) => tone('square', f, f, 0.1, 0.09 * v, i * 0.11)); // beep-beep
    else {
      tone('sawtooth', 300, 180, 0.5, 0.14 * v); // sad trombone-ish wobble
      tone('sine', 6, 6, 0.5, 0.0001);
    }
  },
  tele: v => {
    tone('sine', 300, 1800, 0.5, 0.12 * v);
    tone('sine', 600, 3000, 0.5, 0.06 * v, 0.08);
  },
  boost: v => noise(0.4, 0.35 * v, 500, 2500, 1.4),
  jump: v => {
    tone('sine', 200, 700, 0.2, 0.2 * v);
    noise(0.2, 0.2 * v, 800, 2000);
  },
  thud: v => {
    tone('sine', 120, 40, 0.18, 0.3 * v);
    noise(0.1, 0.2 * v, 300, 100);
  },
  whoosh: v => noise(0.35, 0.18 * v, 400, 1800, 1.2),
  boing: v => {
    tone('sine', 180, 520, 0.25, 0.25 * v);
    tone('sine', 520, 260, 0.2, 0.12 * v, 0.2);
  },
  squeak: v => {
    tone('square', 1200, 1800, 0.06, 0.08 * v);
    tone('square', 1800, 1100, 0.08, 0.06 * v, 0.06);
  },
  smoke: v => noise(0.5, 0.2 * v, 1200, 300, 0.6),
  wreck: v => {
    noise(1.4, 0.7 * v, 2500, 60, 0.5, 0, 'lowpass');
    tone('sawtooth', 220, 40, 1.1, 0.2 * v);
  },
  place: v => {
    tone('square', 520, 260, 0.06, 0.08 * v);
    noise(0.04, 0.1 * v, 3000, 1500, 2);
    tone('sine', 140, 60, 0.09, 0.18 * v);
    noise(0.03, 0.12 * v, 900, 400, 1.5, 0.02);
  },
  engine: v => {
    tone('sawtooth', 38, 70, 0.5, 0.12 * v);
    tone('sawtooth', 55, 110, 1.1, 0.1 * v, 0.35);
    noise(1.2, 0.08 * v, 160, 90, 0.8, 0.3, 'lowpass');
  },
  door: v => {
    noise(0.9, 0.12 * v, 220, 120, 0.6, 0, 'lowpass');
    tone('square', 90, 60, 0.12, 0.06 * v, 0.85);
  },
  remove: v => {
    tone('square', 300, 120, 0.08, 0.08 * v);
    noise(0.08, 0.1 * v, 1500, 400);
  },
  ui: v => {
    noise(0.015, 0.06 * v, 4000, 3000, 1, 0, 'highpass');
    tone('triangle', 880, 1180, 0.05, 0.06 * v);
  },
  flip: v => {
    noise(0.08, 0.12 * v, 2500, 5000, 2);
    tone('triangle', 600, 900, 0.06, 0.05 * v);
  },
  legend: v => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.25, 0.07 * v, i * 0.08));
  },
  count: v => {
    [0, 0.9, 1.8].forEach(d => {
      tone('square', 440, 440, 0.14, 0.1 * v, d);
      tone('sine', 110, 70, 0.3, 0.18 * v, d);
    });
  },
  go: v => {
    tone('square', 880, 880, 0.3, 0.12 * v);
    tone('square', 1320, 1320, 0.3, 0.06 * v);
  },
  alarm: v => {
    for (let i = 0; i < 4; i++) tone('sawtooth', i % 2 ? 600 : 800, i % 2 ? 600 : 800, 0.18, 0.08 * v, i * 0.2);
  },
  vs: v => {
    noise(0.6, 0.4 * v, 200, 3000, 0.8);
    tone('sawtooth', 80, 40, 0.8, 0.2 * v, 0.3);
    noise(0.5, 0.4 * v, 2000, 80, 0.5, 0.35, 'lowpass');
  },
  win: v => {
    [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, i === 3 ? 0.5 : 0.14, 0.1 * v, i * 0.12));
  },
  tick: v => tone('square', 1800, 1500, 0.025, 0.035 * v),
  bumper: v => {
    tone('square', 880, 1320, 0.08, 0.08 * v);
    tone('triangle', 1760, 1760, 0.12, 0.05 * v, 0.05);
  },
  creak: v => {
    noise(0.25, 0.08 * v, 300, 900, 6);
    tone('sawtooth', 140, 120, 0.22, 0.03 * v);
  },
  shatter: v => {
    noise(0.4, 0.3 * v, 3000, 9000, 1.2);
    noise(0.2, 0.2 * v, 1200, 4000, 2, 0.05);
    [2400, 3100, 2700].forEach((f, i) => tone('triangle', f, f * 0.9, 0.12, 0.05 * v, 0.03 + i * 0.05));
  },
  nope: v => {
    tone('square', 220, 160, 0.09, 0.05 * v);
    tone('square', 170, 120, 0.12, 0.04 * v, 0.08);
  },
  slide: v => {
    noise(0.12, 0.07 * v, 2600, 900, 1.2);
    tone('triangle', 320, 520, 0.08, 0.03 * v);
  },
  clank: v => {
    noise(0.18, 0.22 * v, 500, 2500, 3);
    tone('triangle', 180, 90, 0.25, 0.14 * v);
    tone('square', 620, 600, 0.06, 0.04 * v, 0.01);
  },
  beep: v => {
    tone('sine', 1320, 1320, 0.06, 0.06 * v);
    tone('sine', 1760, 1760, 0.06, 0.05 * v, 0.07);
  },
  drumroll: v => {
    for (let i = 0; i < 14; i++) noise(0.06, 0.05 * v * (0.5 + i / 14), 300 + i * 30, 150, 1, i * 0.11);
  },
  reveal: v => {
    tone('triangle', 520, 1040, 0.22, 0.14 * v);
    tone('sine', 780, 1560, 0.3, 0.08 * v, 0.06);
  },
  jackpot: v => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone('square', f, f, 0.16, 0.07 * v, i * 0.08));
    for (let i = 0; i < 10; i++) tone('sine', 2000 + i * 180, 2600, 0.08, 0.03 * v, 0.5 + i * 0.07);
    noise(0.8, 0.12 * v, 6000, 3000, 0.7, 0.45);
  },
  heart: v => {
    tone('sine', 70, 50, 0.12, 0.25 * v);
    tone('sine', 66, 46, 0.12, 0.18 * v, 0.18);
  },
  power: v => {
    [660, 880, 1320].forEach((f, i) => tone('square', f, f * 1.02, 0.09, 0.08 * v, i * 0.05));
    noise(0.3, 0.12 * v, 800, 4000, 1.5);
  },
  pause: v => tone('triangle', 520, 300, 0.12, 0.08 * v),
  lose: v => {
    [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.97, i === 3 ? 0.6 : 0.2, 0.12 * v, i * 0.16));
  }
};
// melodic jingles keep their exact pitch
const STEADY = new Set([
  'coin',
  'legend',
  'count',
  'go',
  'win',
  'lose',
  'jackpot',
  'reveal',
  'repair',
  'tick',
  'drumroll',
  'heart',
  'beep',
  'vs'
]);
const THROT = {
  tick: 0.06,
  heart: 0.5,
  grind: 0.07,
  hum: 0.1,
  flame: 0.09,
  water: 0.09,
  gun: 0.045,
  pd: 0.08,
  clang: 0.06,
  spark: 0.05,
  boom: 0.05
};
function playSfx(name, x, y) {
  const a = audio();
  if (!a || MUTE || a.state !== 'running' || !SFX[name]) return;
  const now = a.currentTime;
  if (lastS[name] && now - lastS[name] < (THROT[name] || 0.03)) return;
  lastS[name] = now;
  let v = 1;
  if (x != null && y != null && B && (G.phase === 'battle' || G.phase === 'wait' || G.phase === 'world')) {
    const d = Math.hypot(x - cam.x, y - cam.y);
    v = clamp(1.15 - d / 1500, 0.12, 1);
  }
  if (B && B.demo) v *= 0.2; // the menu battle is background noise
  SND_PAN =
    x != null && B && (G.phase === 'battle' || G.phase === 'wait' || G.phase === 'world')
      ? clamp((x - cam.x) / 900, -0.8, 0.8)
      : 0;
  SND_PITCH = STEADY.has(name) ? 1 : 1 + (Math.random() - 0.5) * 0.09;
  try {
    SFX[name](v);
  } catch (e) {}
  SND_PAN = 0;
  SND_PITCH = 1;
}
function sfx(name, x, y) {
  if (NET_REPLAY) return;
  if (B && B.rec) B.ev.push(['a', name, x == null ? null : x | 0, y == null ? null : y | 0]);
  playSfx(name, x, y);
}
