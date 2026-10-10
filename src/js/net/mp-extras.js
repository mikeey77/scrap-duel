// Online extras: quick chat (T, then 1–4), a head-to-head record per friend, and the host's rematch button.

const QUICK_CHAT = ['Nice shot!', 'Oops.', 'Bring it on!', 'GG!'];
let chatOpenT = 0;
/** Says a quick-chat line above your car; online it also goes to the other player. */
function quickChat(i) {
  const v = myCar();
  if (!B || !v || v.dead) return;
  const text = QUICK_CHAT[i];
  B.bubbles = B.bubbles || [];
  B.bubbles.push({ car: v.idx, text, t: 2.8 });
  if (G.mode === 'mp') Net.send({ t: 'chat', i });
  else if (Math.random() < 0.6)
    setTimeout(
      () =>
        B &&
        botSay(
          B.cars.find(c => c !== v),
          i === 3 ? 'win' : 'hurt'
        ),
      900
    );
  sfx('beep');
}
function chatFromPeer(i) {
  if (!B || !QUICK_CHAT[i]) return;
  const v = B.cars.find(c => c !== myCar());
  if (!v) return;
  B.bubbles = B.bubbles || [];
  B.bubbles.push({ car: v.idx, text: QUICK_CHAT[i], t: 2.8 });
}
addEventListener(
  'keydown',
  e => {
    if (!B || B.demo || B.replay || G.phase !== 'battle' || e.repeat) return;
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'KeyT') {
      chatOpenT = chatOpenT > 0 ? 0 : 3;
      e.preventDefault();
      return;
    }
    if (chatOpenT > 0) {
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
      if (n !== undefined) {
        quickChat(n);
        chatOpenT = 0;
        e.preventDefault();
        e.stopImmediatePropagation(); // the digit must not also fire an action key
      }
    }
  },
  true
);
/** The little chat menu, bottom left above the controls. */
function drawChatWheel(c, dt) {
  if (chatOpenT <= 0) return;
  chatOpenT -= dt;
  const x = 16,
    y = view.h - 190;
  c.save();
  c.fillStyle = 'rgba(10,16,32,.9)';
  c.fillRect(x, y, 200, 118);
  c.fillStyle = '#5be7ff';
  c.fillRect(x, y, 3, 118);
  c.font = '700 11px "Chakra Petch", sans-serif';
  c.textBaseline = 'top';
  c.fillStyle = '#7fb8d6';
  c.fillText('QUICK CHAT · PRESS 1–4', x + 12, y + 8);
  c.font = '600 14px "Barlow Semi Condensed", sans-serif';
  QUICK_CHAT.forEach((l, i) => {
    c.fillStyle = '#ffb423';
    c.fillText(String(i + 1), x + 12, y + 28 + i * 21);
    c.fillStyle = '#e6f1ff';
    c.fillText(l, x + 30, y + 28 + i * 21);
  });
  c.restore();
}

/* ---------- head to head ---------- */
function h2hLoad() {
  try {
    return JSON.parse(load('sd.h2h') || '{}') || {};
  } catch (e) {
    return {};
  }
}
function h2hRecord(name, won, tie) {
  const H = h2hLoad(),
    k = String(name || 'Friend').slice(0, 16);
  H[k] = H[k] || { w: 0, l: 0, t: 0 };
  if (tie) H[k].t++;
  else if (won) H[k].w++;
  else H[k].l++;
  store('sd.h2h', H);
  return H[k];
}
function h2hLine(name) {
  const r = h2hLoad()[String(name || '').slice(0, 16)];
  return r ? `Head to head vs ${esc(name)}: ${r.w}–${r.l}${r.t ? ` (${r.t} tied)` : ''}` : '';
}
/** Host: start the same kind of match again with the same friend. */
function mpRematch() {
  if (G.mode !== 'mp' || Net.role !== 'host' || !Net.connected) return;
  const format = G.mpFormat || 'balanced',
    rounds = setRounds(G.mpRounds || 10),
    sched = makeSchedule(rounds);
  Net.send({ t: 'begin', sched, format, rounds });
  beginMP(sched, format, rounds);
}
