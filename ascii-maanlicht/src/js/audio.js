// ---------- tiny procedural audio: ambience beds + effect blips (no files) ----------
const AU = { ctx: null, on: true };
function audioInit() {
  if (AU.ctx) return;
  try {
    const ctx = (AU.ctx = new (window.AudioContext || window.webkitAudioContext)());
    AU.master = ctx.createGain();
    AU.master.gain.value = 0.5;
    AU.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = buf;
    const bed = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(AU.master);
      src.start();
      return g;
    };
    AU.wind = bed('lowpass', 420, 0.7);
    AU.rain = bed('highpass', 1800, 0.4);
    AU.crick = ctx.createGain();
    AU.crick.gain.value = 0;
    AU.crick.connect(AU.master);
    setInterval(() => {
      if (!AU.ctx || AU.crick.gain.value < 0.01) return;
      const t = ctx.currentTime;
      for (let k = 0; k < 3; k++) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 4200 + Math.random() * 400;
        g.gain.setValueAtTime(0, t + k * 0.06);
        g.gain.linearRampToValueAtTime(0.04, t + k * 0.06 + 0.01);
        g.gain.linearRampToValueAtTime(0, t + k * 0.06 + 0.04);
        o.connect(g).connect(AU.crick);
        o.start(t + k * 0.06);
        o.stop(t + k * 0.06 + 0.05);
      }
    }, 700);
  } catch (e) {
    AU.ctx = null;
  }
}
function audioUpdate() {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime, e = G.env;
  AU.wind.gain.setTargetAtTime(0.05 + e.cloud * 0.08 + e.rain * 0.05, t, 0.5);
  AU.rain.gain.setTargetAtTime(e.rain * 0.12, t, 0.5);
  AU.crick.gain.setTargetAtTime(e.night * (1 - e.rain) * 0.6, t, 1);
}
function sfx(name) {
  if (!AU.ctx || !AU.on) return;
  const ctx = AU.ctx, t = ctx.currentTime;
  const tone = (f0, f1, dur, type = 'square', vol = 0.08, delay = 0) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t + delay);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur);
    g.gain.setValueAtTime(vol, t + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
    o.connect(g).connect(AU.master);
    o.start(t + delay);
    o.stop(t + delay + dur + 0.02);
  };
  const noise = (dur, freq, vol = 0.2, type = 'bandpass') => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = AU.noise;
    f.type = type;
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(AU.master);
    s.start(t, Math.random());
    s.stop(t + dur);
  };
  switch (name) {
    case 'swing': noise(0.14, 1400, 0.12); break;
    case 'hit': noise(0.1, 500, 0.3); tone(160, 60, 0.12, 'sine', 0.2); break;
    case 'hurt': tone(220, 90, 0.18, 'sawtooth', 0.06); break;
    case 'die': noise(0.35, 300, 0.25, 'lowpass'); tone(300, 50, 0.4, 'triangle', 0.08); break;
    case 'boss': noise(1.2, 120, 0.5, 'lowpass'); tone(110, 30, 1.2, 'sawtooth', 0.12); break;
    case 'spell': tone(500, 1400, 0.25, 'sine', 0.08); break;
    case 'coin': tone(1200, 1800, 0.08, 'square', 0.04); tone(1800, 2400, 0.1, 'square', 0.04, 0.06); break;
    case 'pickup': tone(600, 900, 0.12, 'triangle', 0.08); break;
    case 'equip': noise(0.08, 2500, 0.12); break;
    case 'chest': tone(300, 300, 0.1, 'square', 0.05); tone(450, 450, 0.1, 'square', 0.05, 0.1); tone(600, 900, 0.25, 'square', 0.05, 0.2); break;
    case 'level': [0, 0.1, 0.2, 0.3].forEach((d, i) => tone(400 * Math.pow(1.26, i), 400 * Math.pow(1.26, i), 0.18, 'square', 0.05, d)); break;
    case 'blip': tone(900, 900, 0.05, 'square', 0.03); break;
    case 'thunder': noise(2.2, 90, 0.6, 'lowpass'); break;
  }
}
