// PeerJS multiplayer: lobby, host-authoritative sync, snapshots.
/* =================== NETWORK (PeerJS, host-authoritative) =================== */
const PEER_SRC = [
  'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',
  'https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js'
];
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => {
    let i = 0;
    const next = () => {
      if (i >= PEER_SRC.length) {
        rej(new Error('Could not load the networking library.'));
        return;
      }
      const s = document.createElement('script');
      s.src = PEER_SRC[i++];
      s.onload = () => (window.Peer ? res() : next());
      s.onerror = next;
      document.head.appendChild(s);
    };
    next();
  });
}
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const NET_PROTOCOL = 9,
  RECONNECT_MS = 30000;
const connectionToken = () =>
  crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
const Net = {
  peer: null,
  conn: null,
  role: null,
  code: '',
  connected: false,
  ready: false,
  error: '',
  oppReady: null,
  acc: 0,
  inAcc: new Set(),
  sendT: 0,
  reconnecting: false,
  remoteId: null,
  remoteToken: null,
  token: connectionToken(),
  ping: null,
  jitter: 0,
  lastReceive: 0,
  heartbeat: null,
  recoveryTimer: null,
  closing: false,
  lastResult: null,
  reset() {
    clearInterval(this.heartbeat);
    clearInterval(this.recoveryTimer);
    $('#ovReconnect').hidden = true;
    Object.assign(this, {
      reconnecting: false,
      remoteId: null,
      remoteToken: null,
      token: connectionToken(),
      ping: null,
      jitter: 0,
      lastReceive: 0,
      heartbeat: null,
      recoveryTimer: null,
      closing: false,
      lastResult: null
    });
    Object.assign(this, {
      peer: null,
      conn: null,
      role: null,
      code: '',
      connected: false,
      ready: false,
      error: '',
      oppReady: null,
      acc: 0,
      inAcc: new Set(),
      sendT: 0
    });
  },
  fail(msg) {
    this.error = msg;
    lobbyUI();
  },
  rtcOK() {
    return typeof RTCPeerConnection !== 'undefined' || typeof window.Peer !== 'undefined';
  },
  async host() {
    this.close();
    this.role = 'host';
    this.code = Array.from({ length: 4 }, () => pick([...CODE_CH])).join('');
    lobbyUI();
    if (!this.rtcOK())
      return this.fail(
        'Peer-to-peer connections are blocked here. Check your internet connection or firewall and try again.'
      );
    try {
      await loadPeer();
    } catch (e) {
      return this.fail(e.message + ' Multiplayer needs the game hosted on a normal website.');
    }
    let p;
    try {
      p = new window.Peer('scrapduel-' + this.code, { debug: 0 });
    } catch (e) {
      return this.fail('Could not open a room: ' + e.message);
    }
    this.peer = p;
    p.on('open', () => {
      this.ready = true;
      lobbyUI();
    });
    p.on('connection', c => {
      if (this.reconnecting && this.remoteId && c.peer !== this.remoteId) {
        c.on('open', () => {
          c.send({ t: 'full' });
          setTimeout(() => c.close(), 100);
        });
        return;
      }
      if (this.conn && this.conn.open) {
        c.on('open', () => {
          c.send({ t: 'full' });
          setTimeout(() => c.close(), 300);
        });
        return;
      }
      this.bind(c);
    });
    p.on('error', e => {
      if (this.reconnecting) return;
      if (e && e.type === 'unavailable-id') {
        this.host();
        return;
      }
      this.fail(netErr(e));
    });
    p.on('disconnected', () => {
      try {
        p.reconnect();
      } catch (e) {}
    });
  },
  async join(code) {
    this.close();
    this.role = 'client';
    this.code = code.toUpperCase();
    lobbyUI();
    if (!this.rtcOK())
      return this.fail(
        'Peer-to-peer connections are blocked here. Check your internet connection or firewall and try again.'
      );
    try {
      await loadPeer();
    } catch (e) {
      return this.fail(e.message + ' Multiplayer needs the game hosted on a normal website.');
    }
    let p;
    try {
      p = new window.Peer({ debug: 0 });
    } catch (e) {
      return this.fail('Could not connect: ' + e.message);
    }
    this.peer = p;
    p.on('open', () => {
      this.ready = true;
      if (this.reconnecting) return;
      this.bind(p.connect('scrapduel-' + this.code, { reliable: true, serialization: 'json' }));
    });
    p.on(
      'error',
      e =>
        !this.reconnecting &&
        this.fail(
          e && e.type === 'peer-unavailable'
            ? `No room called ${this.code}. Check the code with your friend.`
            : netErr(e)
        )
    );
  },
  bind(c) {
    this.conn = c;
    c.on('open', () => {
      if (this.conn !== c || this.closing) return;
      this.connected = true;
      this.error = '';
      this.lastReceive = performance.now();
      this.send({ t: 'hello', name: G.name, paint: G.paint, v: NET_PROTOCOL, token: this.token });
      if (!this.reconnecting) lobbyUI();
      this.startHeartbeat();
      sfx('coin');
    });
    c.on('data', d => {
      if (this.conn !== c || this.closing) return;
      try {
        this.lastReceive = performance.now();
        this.recv(typeof d === 'string' ? JSON.parse(d) : d);
      } catch (e) {
        console.error(e);
      }
    });
    const lost = () => {
      if (this.conn === c && !this.closing) this.lost();
    };
    c.on('close', lost);
    c.on('error', lost);
  },
  startHeartbeat() {
    clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      if (!this.connected) return;
      const now = performance.now();
      if (now - this.lastReceive > 8000) {
        this.lost();
        return;
      }
      this.send({ t: 'ping', at: now });
    }, 1000);
  },
  updateStatus() {
    let el = $('#netStatus');
    if (!el) {
      el = document.createElement('span');
      el.id = 'netStatus';
      el.className = 'net-status';
      el.setAttribute('aria-live', 'polite');
      $('#hud').appendChild(el);
    }
    el.hidden = G.mode !== 'mp';
    if (el.hidden) return;
    const quality =
      this.ping === null
        ? 'connecting'
        : this.ping < 100 && this.jitter < 50
          ? 'good'
          : this.ping < 220
            ? 'fair'
            : 'poor';
    const text = this.reconnecting
      ? `Reconnecting · ${Math.max(0, Math.ceil((this.recoveryDeadline - performance.now()) / 1000))}s`
      : this.connected
        ? `${this.ping === null ? 'Measuring ping' : Math.round(this.ping) + ' ms'} · ${quality}`
        : 'Offline';
    if (el.textContent !== text) el.textContent = text;
    el.dataset.quality = quality;
    if (this.reconnecting) {
      const count = $('#reconnectSeconds');
      if (count) count.textContent = Math.max(0, Math.ceil((this.recoveryDeadline - performance.now()) / 1000));
    }
  },
  resumeConnection() {
    const resumed = this.reconnecting;
    this.reconnecting = false;
    clearInterval(this.recoveryTimer);
    this.recoveryTimer = null;
    $('#ovReconnect').hidden = true;
    if (!resumed) return;
    if (this.role === 'host')
      this.send({
        t: 'recover',
        round: G.round,
        score: G.score,
        lives: G.lives,
        format: G.format,
        bounty: G.bountyStreak,
        bountyWinner: G.bountyWinner,
        sched: G.sched,
        phase: G.phase,
        cfg: B && ['battle', 'result'].includes(G.phase) ? B.cfg : null,
        snap: B && G.phase === 'battle' ? snapshot() : null,
        time: B?.time || 0,
        result: this.lastResult,
        resultScoreIncluded: this.lastResult && (G.round !== this.lastResult.round || G.phase !== 'battle')
      });
    if (G.meReady) this.send({ t: 'ready', round: G.round, ...myCarCfg() });
    this.check();
    toast('Connection restored. Match resumed.', true);
  },
  send(o) {
    if (this.conn && this.conn.open)
      try {
        this.conn.send(o);
      } catch (e) {}
  },
  recv(d) {
    if (!d || typeof d.t !== 'string') return;
    switch (d.t) {
      case 'ping':
        this.send({ t: 'pong', at: d.at });
        break;
      case 'pong': {
        const sample = performance.now() - d.at;
        if (Number.isFinite(sample) && sample >= 0 && sample < 30000) {
          this.jitter = this.ping === null ? 0 : this.jitter * 0.8 + Math.abs(sample - this.ping) * 0.2;
          this.ping = this.ping === null ? sample : this.ping * 0.7 + sample * 0.3;
        }
        break;
      }
      case 'recover':
        if (this.role === 'client') {
          G.score = [d.score[1], d.score[0]];
          G.sched = d.sched;
          G.format = d.format || 'balanced';
          G.lives = d.lives ? [d.lives[1], d.lives[0]] : [20, 20];
          G.bountyStreak = d.bounty || 0;
          G.bountyWinner = d.bountyWinner == null ? null : 1 - d.bountyWinner;
          if (d.cfg && d.phase === 'battle') {
            G.round = d.round;
            if (!B || G.phase !== 'battle' || B.cfg?.round !== d.round) toBattle({ ...d.cfg, net: 'client', me: 1 });
            B.time = d.time;
            if (d.snap) applySnap(d.snap);
          }
          const result = d.result;
          if (
            result &&
            result.round === G.round &&
            !['result', 'final', 'draft', 'build', 'replay'].includes(G.phase)
          ) {
            if (d.phase === 'result' && d.cfg && B?.cfg?.round !== result.round)
              toBattle({ ...d.cfg, net: 'client', me: 1 });
            if (B?.net === 'client') {
              // The result animation awards the point locally once. A completed host score already includes it.
              if (d.resultScoreIncluded && result.win != null) {
                G.score[result.win === 1 ? 0 : 1] -= result.points ?? roundPoints(result.round);
                if (G.format === 'lives') G.lives[result.win === 1 ? 1 : 0] += 2 + result.round;
                G.bountyStreak = Math.max(0, G.bountyStreak - 1);
              }
              clientResult(result);
            }
          }
          updateHUD();
        }
        break;
      case 'hello':
        if (d.v !== NET_PROTOCOL) {
          this.fail('Different game versions. Both players should refresh the game.');
          this.conn?.close();
          return;
        }
        if (this.remoteToken && (this.remoteToken !== d.token || this.remoteId !== this.conn?.peer)) {
          this.conn?.close();
          return;
        }
        this.remoteToken = d.token;
        this.remoteId = this.conn?.peer;
        this.resumeConnection();
        G.oppName = String(d.name || 'Rival').slice(0, 16);
        G.oppPaint = d.paint === G.paint ? PAINTS.find(p => p !== G.paint) : d.paint;
        if (!$('#ovLobby').hidden) lobbyUI();
        break;
      case 'full':
        this.fail('That room already has two players.');
        break;
      case 'begin':
        if (this.role === 'client')
          beginMP(Array.isArray(d.sched) ? d.sched : null, d.format, ROUND_CHOICES.includes(d.rounds) ? d.rounds : 10);
        break;
      case 'ready':
        this.oppReady = d;
        G.oppName = String(d.name || G.oppName).slice(0, 16);
        G.oppPaint = d.paint === G.paint ? PAINTS.find(p => p !== G.paint) : d.paint;
        updateHUD();
        oppStatusUI();
        this.check();
        break;
      case 'unready':
        this.oppReady = null;
        oppStatusUI();
        break;
      case 'start':
        if (this.role === 'client') {
          const cfg = { ...d.cfg, net: 'client', me: 1 };
          launchBattle(cfg);
        }
        break;
      case 'in':
        if (B && B.net === 'host') {
          B.remoteIn = d.i;
          for (const e of d.i.edges || []) B.remoteEdges.add(e);
        }
        break;
      case 'snap':
        if (B && B.net === 'client') applySnap(d);
        break;
      case 'result':
        clientResult(d);
        break;
      case 'bye':
        this.endDisconnect('Your friend left the match.');
        break;
    }
  },
  check() {
    if (
      this.role !== 'host' ||
      !G.meReady ||
      this.reconnecting ||
      !this.connected ||
      G.phase !== 'wait' ||
      !this.oppReady ||
      this.oppReady.round !== G.round ||
      !B
    )
      return;
    const o = this.oppReady;
    const cfg = makeCfg({
      design: o.design,
      tune: o.tune,
      name: String(o.name).slice(0, 16),
      paint: G.oppPaint,
      ctrl: 'remote',
      look: sanitizeLook(o.look)
    });
    this.oppReady = null;
    this.send({ t: 'start', cfg });
    launchBattle({ ...cfg, net: 'host', me: 0 });
  },
  sendSnap(snap) {
    if (this.conn && this.conn.open) this.send(snap);
  },
  tickClient() {
    if (this.reconnecting) return;
    const i = readLocal();
    for (const e of i.edges) this.inAcc.add(e);
    const now = performance.now();
    if (now - this.sendT < 33) return;
    this.sendT = now;
    this.send({
      t: 'in',
      i: {
        th: i.th,
        st: i.st,
        sf: i.sf,
        boost: i.boost,
        aimX: Math.round(i.aimX),
        aimY: Math.round(i.aimY),
        fire: i.fire,
        rmb: i.rmb,
        drop: i.drop,
        edges: [...this.inAcc]
      }
    });
    this.inAcc.clear();
  },
  lost() {
    if (this.closing || this.reconnecting) return;
    const old = this.conn;
    this.connected = false;
    this.conn = null;
    clearInterval(this.heartbeat);
    try {
      old?.close();
    } catch (e) {}
    if (G.mode !== 'mp' || !G.started || G.phase === 'final' || G.phase === 'menu')
      return this.fail('Connection lost. Please join the room again.');
    this.reconnecting = true;
    this.recoveryDeadline = performance.now() + RECONNECT_MS;
    clearArenaInput();
    if (B) {
      B.remoteIn = { ...ZERO_IN };
      B.remoteEdges = new Set();
    }
    $('#reconnectCard').innerHTML =
      `<span class="label">Multiplayer recovery</span><h2>Reconnecting…</h2><p>The match is paused. Waiting for ${esc(G.oppName)}: <b id="reconnectSeconds">30</b>s.</p><p class="small">Keep this page open. Temporary network drops can recover without losing your build.</p><button class="btn ghost" id="reconnectLeave">Leave match</button>`;
    $('#ovReconnect').hidden = false;
    $('#reconnectLeave').onclick = () => {
      this.close();
      B = null;
      G.phase = 'final';
      showMenu();
    };
    this.recoveryTimer = setInterval(() => {
      if (!this.reconnecting) return;
      if (performance.now() >= this.recoveryDeadline) {
        this.endDisconnect('Reconnect window expired. Your build and final score are shown below.');
        return;
      }
      if (this.role === 'client' && this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          try {
            this.peer.reconnect();
          } catch (e) {}
        } else if (!this.conn || !this.conn.open) {
          const previous = this.conn;
          this.conn = null;
          try {
            previous?.close();
          } catch (e) {}
          this.bind(this.peer.connect('scrapduel-' + this.code, { reliable: true, serialization: 'json' }));
        }
      }
    }, 1500);
  },
  endDisconnect(reason) {
    clearInterval(this.heartbeat);
    clearInterval(this.recoveryTimer);
    this.reconnecting = false;
    this.connected = false;
    this.closing = true;
    try {
      this.conn?.close();
      this.peer?.destroy();
    } catch (e) {}
    this.conn = null;
    $('#ovReconnect').hidden = true;
    if (G.mode !== 'mp' || !G.started) {
      this.closing = false;
      return this.fail(reason);
    }
    B = null;
    G.phase = 'final';
    $('#arena').hidden = true;
    $('#build').hidden = false;
    hideOverlays();
    $('#resultCard').innerHTML =
      `<span class="label">Multiplayer</span><h2>Connection ended</h2><p>${esc(reason)}</p><p>Final score ${G.score[0]}–${G.score[1]}. Your car remains in the garage.</p><button class="btn" id="btnHome2">Main menu</button>`;
    $('#ovResult').hidden = false;
    $('#btnHome2').onclick = () => {
      this.close();
      showMenu();
    };
  },
  close() {
    this.closing = true;
    clearInterval(this.heartbeat);
    clearInterval(this.recoveryTimer);
    try {
      if (this.conn && this.conn.open) this.conn.send({ t: 'bye' });
    } catch (e) {}
    try {
      this.conn && this.conn.close();
    } catch (e) {}
    try {
      this.peer && this.peer.destroy();
    } catch (e) {}
    this.reset();
  }
};
function netErr(e) {
  const t = e && e.type;
  return t === 'browser-incompatible'
    ? 'This browser cannot do peer-to-peer.'
    : t === 'network' || t === 'server-error' || t === 'socket-error'
      ? 'Could not reach the matchmaking server. Check your connection, or this page blocks it (the Claude preview does).'
      : 'Network error: ' + ((e && (e.message || t)) || 'unknown');
}
addEventListener('beforeunload', () => {
  try {
    Net.close();
  } catch (e) {}
});

/* ----- snapshots ----- */
const r2 = n => Math.round(n * 100) / 100;
function snapshot() {
  return {
    t: 'snap',
    T: r2(B.t),
    q: B.seq,
    di: B.deadIdx ?? -1,
    rg: B.ring ? Math.round(B.ring.r) : 0,
    c: B.cars.map(v => [
      r2(v.x),
      r2(v.y),
      r2(v.a),
      Math.round(v.z),
      Math.round(v.vx),
      Math.round(v.vy),
      r2(v.w),
      r2(v.flip),
      v.dead ? 1 : 0,
      v.anchored ? 1 : 0,
      r2(v.frozen),
      v.insts.map(I =>
        I.alive
          ? [
              Math.round(I.hp),
              r2(I.ta),
              I.charge > 0 ? r2(I.charge) : 0,
              I.beam ? I.beam.map(b => [r2(b.a), Math.round(b.l)]) : 0,
              I.sh !== undefined ? Math.round(I.sh) : 0,
              (I.bon > 0 ? 1 : 0) |
                (I.punch > 0 ? 2 : 0) |
                (I.active ? 4 : 0) |
                (I.burn > 0 ? 8 : 0) |
                (I.hitT > 0 ? 16 : 0),
              I.pa ? r2(I.pa) : 0,
              I.tgt ? [Math.round(I.tgt.x), Math.round(I.tgt.y)] : 0
            ]
          : 0
      ),
      v.ball ? [Math.round(v.ball.x), Math.round(v.ball.y)] : 0,
      v.tether
        ? [v.tether.inst.n, Math.round((v.tether.car || v.tether.obj).x), Math.round((v.tether.car || v.tether.obj).y)]
        : 0,
      v.drones.map(d => [Math.round(d.x), Math.round(d.y)]),
      v.stuck.map(s => [s.kind, s.id || 0, r2(s.gx), r2(s.gy), s.r, r2(s.a)]),
      v.hopper.length,
      v.glue,
      r2(v.jumpCd),
      r2(v.cmCd),
      r2(v.blinkCd),
      Math.round(v.dealt),
      v.coins,
      r2(v.blind),
      r2(v.emp),
      v.gen || 0,
      r2(v.spawnT || 0),
      v.buff ? v.buff.p : 0,
      v.buff ? r2(v.buff.t) : 0
    ]),
    sp: B.obj ? [r2(B.obj.score[0]), r2(B.obj.score[1]), B.obj.carrier, B.obj.owner ?? -1] : 0,
    ki: B.seq === 'death' ? B.killInfo || '' : 0,
    o: B.objs.map(o => [
      o.uid,
      o.kind,
      Math.round(o.x),
      Math.round(o.y),
      r2(o.a),
      Math.round(o.z),
      Math.round(o.hp),
      Math.round(o.max),
      o.frozen > 0 ? 1 : 0,
      o.id || 0,
      Math.round(o.r),
      o.ha ? r2(o.ha) : 0,
      o.hitT > 0 ? 1 : 0
    ]),
    s: B.shots
      .filter(s => !(s.delay > 0))
      .map(s => [
        s.kind,
        Math.round(s.x),
        Math.round(s.y),
        Math.round(s.vx),
        Math.round(s.vy),
        s.own,
        r2(s.life),
        s.max ? r2(s.max) : 0,
        s.kind === 'junk'
          ? [s.item.kind, s.item.id || 0, s.item.r]
          : s.big
            ? 1
            : s.freeze
              ? 2
              : s.knock
                ? 3
                : s.saw
                  ? 4
                  : 0
      ]),
    l: B.lobs.map(l => [
      Math.round(l.sx),
      Math.round(l.sy),
      Math.round(l.tx),
      Math.round(l.ty),
      r2(l.t),
      r2(l.T),
      Math.round(l.splash),
      l.small ? 1 : 0,
      l.col || 0,
      l.own
    ]),
    z: B.zones
      .filter(z => z.life !== undefined)
      .map(z => [
        z.kind,
        Math.round(z.x),
        Math.round(z.y),
        Math.round(z.r),
        r2(z.life),
        z.own ?? -1,
        z.a ? r2(z.a) : 0
      ]),
    cl: B.clouds.map(c => [Math.round(c.x), Math.round(c.y), c.r, r2(c.life), c.max]),
    dc: B.decoys.map(d => [Math.round(d.x), Math.round(d.y), r2(d.a)]),
    bm: B.bombs.filter(b => b.x !== undefined).map(b => [Math.round(b.x), Math.round(b.y), r2(b.t)]),
    pk: B.pk.map(p => (p.kind === 'power' ? [r2(p.cd), p.p] : r2(p.cd))),
    plan: B.cars.map(v => ({
      cargo: v.cargo || 0,
      earned: v.scrapEarned || 0,
      damage: v.damageMap || {},
      first: v.firstBreak || null,
      links: (v.planLinks || []).map(l => ({ ...l, obj: l.obj?.uid })),
      inst: v.insts.map(I => ({
        cd: I.planCd || 0,
        heat: I.heat || 0,
        burst: I.planBurst || 0,
        weight: I.weight || null,
        deployed: !!I.deployed,
        yoyo: I.yoyoUntil || 0,
        ammo: !!I.ammoMode,
        used: I.used || 0,
        rescue: I.rescueUntil || 0
      }))
    })),
    seen: [...(B.scrapSeen || [])],
    clock: r2(B.time),
    cds: B.cars.map(v =>
      v.insts.map(I => [
        r2(Math.max(0, (I.bcd || 0) - B.time)),
        r2(Math.max(0, (I.pcd || 0) - B.time)),
        r2(Math.max(0, (I.ccd || 0) - B.time))
      ])
    ),
    ev: B.ev.splice(0, B.ev.length)
  };
}
function applySnap(S, silent) {
  B.lag = 0;
  B.scrapSeen = new Set(S.seen || []);
  if (!B.replay && B.tape.length < 4000) B.tape.push(S);
  B.t = S.T;
  if (Number.isFinite(S.clock)) B.time = S.clock;
  if (S.cds)
    S.cds.forEach((list, i) =>
      list.forEach((cd, n) => {
        const I = B.cars[i]?.insts[n];
        if (I) {
          I.bcd = B.time + cd[0];
          I.pcd = B.time + cd[1];
          I.ccd = B.time + cd[2];
        }
      })
    );
  if (S.ki) B.killInfo = S.ki;
  if (S.sp && B.obj) {
    B.obj.score = [S.sp[0], S.sp[1]];
    B.obj.carrier = S.sp[2];
    B.obj.owner = S.sp[3];
  }
  if (S.q !== B.seq) {
    B.seq = S.q;
    B.seqT = 0;
    B.deadIdx = S.di;
    onSeqClient(S.q);
  }
  B.deadIdx = S.di;
  B.ring = S.rg ? { r: S.rg } : null;
  S.c.forEach((d, i) => {
    let v = B.cars[i];
    if (!v) return;
    if ((d[25] || 0) !== (v.gen || 0) && B.cfg) {
      // the host respawned this car (objective rounds): rebuild it from its design
      v = B.cars[i] = carFromCfg(B.cfg.cars[i], i);
      v.gen = d[25];
    }
    v.spawnT = d[26] || 0;
    v.buff = d[27] ? { p: d[27], t: d[28] } : null;
    let changed = false;
    d[11].forEach((q, n) => {
      const I = v.insts[n];
      if (!I) return;
      if (q === 0) {
        if (I.alive) {
          I.alive = false;
          changed = true;
        }
        return;
      }
      I.hp = q[0];
      I.ta = q[1];
      I.charge = q[2];
      I.beam = q[3] ? q[3].map(([a, l]) => ({ a, l })) : null;
      if (I.sh !== undefined) I.sh = q[4];
      const f = q[5];
      I.bon = f & 1 ? 0.1 : 0;
      if (f & 2) I.punch = 0.15;
      I.active = !!(f & 4);
      I.burn = f & 8 ? 0.5 : 0;
      if (f & 16) I.hitT = 0.1;
      I.pa = q[6];
      I.tgt = q[7] ? { x: q[7][0], y: q[7][1] } : null;
    });
    const nst = d[15].length !== v.stuck.length;
    if (nst) v.stuck = d[15].map(([kind, id, gx, gy, r, a]) => ({ kind, id, gx, gy, r, a, m: 1, hp: 1 }));
    if (changed || nst) {
      recalc(v);
      v.drones = v.drones.filter(dr => dr.bay.alive);
    }
    if (v.tx === undefined || Math.hypot(d[0] - v.x, d[1] - v.y) > 160) {
      v.x = d[0];
      v.y = d[1];
      v.a = d[2];
    }
    v.tx = d[0];
    v.ty = d[1];
    v.tA = d[2];
    v.z = d[3];
    v.vx = d[4];
    v.vy = d[5];
    v.w = d[6];
    if (d[7] > 0 && !(v.flip > 0)) v.flipAnim = 0;
    v.flip = d[7];
    if (d[8] && !v.dead) v.dead = true;
    v.anchored = !!d[9];
    v.frozen = d[10];
    v.ball = v.ball && d[12] ? Object.assign(v.ball, { x: d[12][0], y: d[12][1] }) : v.ball;
    if (!d[12]) v.ball = null;
    v.tether = d[13] && v.insts[d[13][0]] ? { inst: v.insts[d[13][0]], obj: { x: d[13][1], y: d[13][2] } } : null;
    d[14].forEach((p, k) => {
      if (v.drones[k]) {
        v.drones[k].x = p[0];
        v.drones[k].y = p[1];
      }
    });
    v.hopper.length = 0;
    for (let k = 0; k < d[16]; k++) v.hopper.push({});
    v.glue = d[17];
    v.jumpCd = d[18];
    v.cmCd = d[19];
    v.blinkCd = d[20];
    v.dealt = d[21];
    v.coins = d[22];
    v.blind = d[23] || 0;
    v.emp = d[24] || 0;
  });
  const map = new Map(B.objs.map(o => [o.uid, o])),
    next = [];
  for (const [uid, kind, x, y, a, z, hp, max, fr, id, r, ha, hit] of S.o) {
    let o = map.get(uid);
    if (!o) {
      o =
        kind === 'part'
          ? {
              uid,
              kind: 'part',
              id,
              x,
              y,
              z: 0,
              vz: 0,
              vx: 0,
              vy: 0,
              a,
              w: 0,
              r,
              m: 1,
              h: 16,
              hp,
              max,
              bounce: 0.3,
              acc: 0,
              accT: 0,
              hitT: 0,
              burn: 0,
              frozen: 0,
              junk: true,
              d: {}
            }
          : JUNK[kind] || PROPS[kind]
            ? mkObj(kind, x, y, a)
            : null;
      if (!o) continue;
      o.uid = uid;
    }
    o.tx = x;
    o.ty = y;
    o.tA = a;
    o.z = z;
    o.hp = hp;
    o.max = max;
    o.frozen = fr ? 1 : 0;
    if (ha) o.ha = ha;
    if (hit) o.hitT = 0.1;
    next.push(o);
  }
  B.objs = next;
  B.shots = S.s.map(([kind, x, y, vx, vy, own, life, max, ex]) => ({
    kind,
    x,
    y,
    vx,
    vy,
    own,
    life,
    max,
    big: ex === 1,
    freeze: ex === 2,
    knock: ex === 3,
    saw: ex === 4,
    item: Array.isArray(ex) ? { kind: ex[0], id: ex[1], r: ex[2] } : null,
    ang: 0
  }));
  B.lobs = S.l.map(([sx, sy, tx, ty, t, T, splash, small, col, own]) => ({
    sx,
    sy,
    tx,
    ty,
    t,
    T,
    splash,
    small,
    col: col || null,
    own
  }));
  B.zones = B.zones
    .filter(z => z.life === undefined)
    .concat(S.z.map(([kind, x, y, r, life, own, a]) => ({ kind, x, y, r, life, own, a })));
  B.clouds = S.cl.map(([x, y, r, life, max]) => ({ x, y, r, life, max }));
  B.decoys = S.dc.map(([x, y, a]) => ({ x, y, a }));
  B.bombs = S.bm.map(([x, y, t]) => ({ x, y, t }));
  S.pk.forEach((d, i) => {
    if (!B.pk[i]) return;
    if (Array.isArray(d)) [B.pk[i].cd, B.pk[i].p] = d;
    else B.pk[i].cd = d;
  });
  if (S.plan)
    S.plan.forEach((p, i) => {
      const v = B.cars[i];
      if (!v) return;
      v.cargo = p.cargo;
      v.scrapEarned = p.earned;
      v.damageMap = p.damage;
      v.firstBreak = p.first;
      v.planLinks = p.links.map(l => ({ ...l, obj: l.obj != null ? B.objs.find(o => o.uid === l.obj) : null }));
      p.inst.forEach((d, n) => {
        const I = v.insts[n];
        if (I)
          Object.assign(I, {
            planCd: d.cd,
            heat: d.heat,
            planBurst: d.burst,
            weight: d.weight,
            deployed: d.deployed,
            yoyoUntil: d.yoyo,
            ammoMode: d.ammo,
            used: d.used,
            rescueUntil: d.rescue
          });
      });
    });
  if (silent) return; // fast-forwarding a replay: skip effects and sounds
  NET_REPLAY = true;
  try {
    for (const e of S.ev) {
      switch (e[0]) {
        case 'b':
          boom(e[1], e[2], e[3], !!e[4]);
          break;
        case 's':
          spark(e[1], e[2], e[3], e[4] || undefined);
          break;
        case 'f':
          B.fx.push(e[1]);
          break;
        case 'n':
          B.nums.push({ x: e[1], y: e[2], v: e[3], life: 0.9, col: e[4] });
          break;
        case 'd':
          debris(e[1], e[2], e[3], e[4]);
          break;
        case 'lesson':
          if (B.replay) B.replayLesson = { car: e[1], x: e[2], y: e[3], text: e[4], until: B.time + 2.2 };
          break;
        case 'h':
          if (e[1] === B.me) B.hitDirs.push({ a: e[2], t: 0.9 });
          if (e[3] === B.me && !B.replay) hitMarker(e[4], e[5]);
          break;
        case 'a':
          NET_REPLAY = false;
          playSfx(e[1], e[2], e[3]);
          NET_REPLAY = true;
          break;
      }
    }
  } finally {
    NET_REPLAY = false;
  }
}
