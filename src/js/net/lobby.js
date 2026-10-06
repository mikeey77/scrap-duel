// Players online + public 1v1 rooms. Talks to netlify/functions/lobby.mjs.
const Lobby = {
  id: (() => {
    const mk = () =>
      connectionToken()
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 24);
    try {
      let x = sessionStorage.getItem('sd.pid');
      if (!x) {
        x = mk();
        sessionStorage.setItem('sd.pid', x);
      }
      return x;
    } catch (e) {
      return mk();
    }
  })(),
  online: 0,
  rooms: [],
  ok: false,
  wantPublic: true,
  listed: false,
  timer: 0,
  busy: false,
  last: 0,
  async ping(force) {
    if (typeof fetch !== 'function' || this.busy || (!force && document.hidden)) return;
    if (!force && Date.now() - this.last < 4000) return;
    this.busy = true;
    this.last = Date.now();
    const room =
      this.listed && Net.role === 'host' && Net.ready && !Net.connected && Net.code
        ? { code: Net.code, name: G.name, rounds: G.mpRounds || 10 }
        : null;
    try {
      const r = await fetch('/api/lobby', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: this.id, v: NET_PROTOCOL, room })
      });
      if (r.ok) {
        const d = await r.json();
        this.online = Math.max(1, d.online | 0);
        this.rooms = (d.rooms || []).filter(x => x.v === NET_PROTOCOL && x.code !== Net.code);
        this.ok = true;
      } else this.ok = false;
    } catch (e) {
      this.ok = false;
    }
    this.busy = false;
    this.render();
  },
  list() {
    if (!this.wantPublic) return;
    this.listed = true;
    this.last = 0;
    this.ping(true);
  },
  unlist() {
    if (!this.listed) return;
    this.listed = false;
    this.last = 0;
    this.ping(true);
  },
  start() {
    clearInterval(this.timer);
    this.ping(true);
    this.timer = setInterval(() => this.ping(), 20000);
  },
  render() {
    const o = $('#onlineChip');
    if (o) {
      o.hidden = !this.ok;
      const n = $('#onlineN');
      if (n) n.textContent = this.online;
    }
    const box = $('#roomList');
    if (!box) return;
    box.innerHTML = !this.ok
      ? '<span class="small">Public rooms appear here when the server is reachable.</span>'
      : this.rooms.length
        ? this.rooms
            .map(
              r =>
                `<div class="room"><b>${esc(r.name)}</b><span class="small">${r.rounds} rounds · ${esc(r.code)}</span><button class="btn" data-code="${esc(r.code)}">Join</button></div>`
            )
            .join('')
        : '<span class="small">No open rooms right now. Host one and it shows up here.</span>';
    box.querySelectorAll &&
      box.querySelectorAll('button[data-code]').forEach(
        b =>
          (b.onclick = () => {
            sfx('ui');
            if (G.mode === 'mp') Net.close();
            Net.join(b.dataset.code);
          })
      );
  }
};
addEventListener('pagehide', () => {
  try {
    navigator.sendBeacon &&
      navigator.sendBeacon(
        '/api/lobby',
        new Blob([JSON.stringify({ id: Lobby.id, bye: true })], { type: 'application/json' })
      );
  } catch (e) {}
});
