// Recorded voices for the commentators and the arena announcer (made by tools/make-voices.mjs).
// VOICE_INDEX (id -> seconds) is written into the bundle by build.mjs; the clips live in site/voice/.
// Lines without a clip fall back to the system speech voice, so new text still works before it is recorded.
const Voice = {
  raw: new Map(), // id -> Promise<ArrayBuffer> (compressed, small)
  buf: new Map(), // id -> AudioBuffer (decoded, kept for the most recent lines only)
  bus: null,
  src: null,
  until: 0,
  has(who, text) {
    return typeof VOICE_INDEX !== 'undefined' && !!VOICE_INDEX[voiceId(who, text)];
  },
  /** Length of a recorded line in seconds, or 0 when there is no clip. */
  length(who, text) {
    return (typeof VOICE_INDEX !== 'undefined' && VOICE_INDEX[voiceId(who, text)]) || 0;
  },
  fetch(id) {
    if (!this.raw.has(id)) {
      if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
      this.raw.set(
        id,
        fetch('voice/' + id + '.ogg').then(r => {
          if (!r.ok) throw new Error('missing clip');
          return r.arrayBuffer();
        })
      );
    }
    return this.raw.get(id);
  },
  async decode(id) {
    if (this.buf.has(id)) return this.buf.get(id);
    const a = audio();
    if (!a) throw new Error('no audio');
    const data = (await this.fetch(id)).slice(0);
    const b = await a.decodeAudioData(data);
    this.buf.set(id, b);
    if (this.buf.size > 40) this.buf.delete(this.buf.keys().next().value);
    return b;
  },
  /** Warms up the clips a battle starts with, so the first line is not late. */
  preload(kinds) {
    if (typeof VOICE_INDEX === 'undefined') return;
    for (const k of kinds)
      for (const call of CALLS[k] || []) for (const [who, text] of call) this.fetch(voiceId(who, text)).catch(() => {});
  },
  /** Plays a line. Returns its length in seconds (0 when it could not be played). */
  play(who, text, { cut = false } = {}) {
    const id = voiceId(who, text),
      len = this.length(who, text),
      a = audio();
    if (!len || !a || MUTE || !SETTINGS.vol) return 0;
    if (cut) this.stop();
    else if (a.currentTime < this.until - 0.05) return 0; // never talk over each other
    this.until = a.currentTime + len + 0.3;
    this.decode(id)
      .then(b => {
        if (a.state !== 'running') return;
        if (!this.bus) {
          // straight to the speakers: the commentators are in a booth, not in the garage reverb
          this.bus = a.createGain();
          this.bus.connect(a.destination);
        }
        this.bus.gain.value = clamp(SETTINGS.vol * (who === 'ann' ? 1.0 : 0.95), 0, 1.2);
        const s = a.createBufferSource();
        s.buffer = b;
        s.connect(this.bus);
        s.start();
        this.src = s;
        this.duck(b.duration);
      })
      .catch(() => {});
    return len;
  },
  stop() {
    try {
      if (this.src) this.src.stop();
    } catch (e) {}
    this.src = null;
    this.until = 0;
  },
  /** Music drops under the voices and comes back after. */
  duck(sec) {
    SOUNDTRACK.duck(sec);
    const bus = BattleMusic.bus;
    if (!bus || !AC) return;
    const t = AC.currentTime,
      lvl = SETTINGS.music || 0;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setTargetAtTime(lvl * 0.35, t, 0.05);
    bus.gain.setTargetAtTime(lvl, t + sec, 0.4);
  }
};
