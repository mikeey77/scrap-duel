// The soundtrack: four recorded loops made by tools/make-music.py (assets/music → site/music).
// Hangar plays in the menu and the garage, Scrap Metal or Neon Brawl in battle (by arena), Open Road in the
// open world. Tracks crossfade when the screen changes; when a file can't load, the live synth takes over.

const TRACK_GAIN = 0.55;
const SOUNDTRACK = {
  buf: {},
  pending: {},
  failed: {},
  cur: null,
  src: null,
  g: null,
  bus: null,
  level: 0,
  load(id) {
    if (this.buf[id] || this.pending[id] || this.failed[id] || !AC) return;
    if (typeof fetch !== 'function') return void (this.failed[id] = true);
    this.pending[id] = fetch('music/' + id + '.ogg')
      .then(r => {
        if (!r.ok) throw new Error('missing track');
        return r.arrayBuffer();
      })
      .then(d => AC.decodeAudioData(d))
      .then(b => (this.buf[id] = b))
      .catch(() => (this.failed[id] = true))
      .finally(() => delete this.pending[id]);
  },
  out() {
    if (!this.bus) {
      this.bus = AC.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(MUSIC_OUT || MASTER);
    }
    return this.bus;
  },
  /** Plays a track at a level, crossfading from whatever played before. */
  play(id, level) {
    if (this.cur !== id) {
      if (!this.buf[id]) {
        this.load(id);
        return;
      }
      this.fadeOut(1.2);
      const src = AC.createBufferSource(),
        g = AC.createGain(),
        t = AC.currentTime;
      src.buffer = this.buf[id];
      src.loop = true;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.setTargetAtTime(level, t, 0.45);
      src.connect(g);
      g.connect(this.out());
      src.start(t + 0.02);
      Object.assign(this, { cur: id, src, g, level });
      // warm up the other tracks once something is playing
      for (const k of ['hangar', 'scrapmetal', 'neonbrawl', 'openroad']) this.load(k);
    } else if (Math.abs(this.level - level) > 0.001) {
      this.level = level;
      this.g.gain.setTargetAtTime(level, AC.currentTime, 0.35);
    }
  },
  fadeOut(sec = 1) {
    if (!this.src || !AC) return;
    const { src, g } = this,
      t = AC.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, sec / 4);
    try {
      src.stop(t + sec + 0.1);
    } catch (e) {}
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
    this.src = this.g = this.cur = null;
  },
  stop() {
    this.fadeOut(0.6);
  },
  /** Drops under the commentators and comes back after. */
  duck(sec) {
    if (!this.bus || !AC) return;
    const t = AC.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(0.35, t, 0.05);
    this.bus.gain.setTargetAtTime(1, t + sec, 0.4);
  }
};

/** BattleMusic's first choice: the recorded tracks. Returns false to let the live synth play instead. */
BattleMusic.updateTrack = function () {
  const id = this.trackFor(),
    on = AC && AC.state === 'running' && !MUTE && SETTINGS.music > 0 && !document.hidden && id;
  if (!on) {
    if (this.timer) this.stop();
    if (SOUNDTRACK.cur) SOUNDTRACK.stop();
    return true;
  }
  SOUNDTRACK.load(id);
  if (SOUNDTRACK.failed[id]) return false;
  if (this.timer) this.stop();
  const fight = id !== 'hangar' && id !== 'openroad',
    tense = fight && B && !B.replay && (B.t < 30 || (G.round === ROUNDS && !G.run)),
    lvl =
      SETTINGS.music *
      TRACK_GAIN *
      (B && B.paused ? 0.35 : G.phase === 'replay' ? 0.6 : id === 'hangar' ? 0.75 : tense ? 1.15 : 1);
  SOUNDTRACK.play(id, lvl);
  return true;
};
