/* Deep arena announcer (browser speech, pitched way down) plus a sub-bass hit so it lands. */
const NUM_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'twenty one',
  'twenty two',
  'twenty three',
  'twenty four',
  'twenty five'
];
const Announcer = {
  voice: null,
  pick() {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const en = vs.filter(v => /^en/i.test(v.lang));
    this.voice =
      en.find(
        v => /male|daniel|david|alex|fred|george|guy|ryan|arthur|james/i.test(v.name) && !/female/i.test(v.name)
      ) ||
      en[0] ||
      null;
  },
  say(text) {
    if (MUTE || SETTINGS.voice === false || !SETTINGS.vol) return;
    try {
      sfx('boom');
    } catch (e) {}
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (!this.voice) this.pick();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.pitch = 0.05;
      u.rate = 0.78;
      u.volume = Math.min(1, SETTINGS.vol * 1.1);
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  round(r) {
    this.say(r === ROUNDS && ROUNDS > 1 ? 'Final round' : 'Round ' + (NUM_WORDS[r] || r));
  }
};
try {
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => Announcer.pick();
} catch (e) {}
