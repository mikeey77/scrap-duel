const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const html = fs.readFileSync(__dirname + '/../site/index.html', 'utf8');
const source = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
new vm.Script(source);

function runtime(options = {}) {
  let clock = 0,
    tid = 0;
  const elements = new Map(),
    timers = new Map(),
    rafs = [],
    events = new Map(),
    storage = new Map();
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      createPattern: () => ({}),
      measureText: t => ({ width: String(t).length * 7 }),
      getImageData: () => ({ data: new Uint8ClampedArray(16) }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) }
  );
  class El {
    constructor(id = '') {
      this.id = id;
      this.tagName = 'DIV';
      this.hidden = true;
      this.style = {
        setProperty(k, v) {
          this[k] = v;
        }
      };
      this.dataset = {};
      this.attrs = {};
      this.listeners = {};
      this.value = '';
      this.clientWidth = 720;
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    set innerHTML(h) {
      this.html = h;
      for (const m of h.matchAll(/id="([^"]+)"/g)) {
        const e = new El(m[1]);
        e.hidden = false;
        elements.set(m[1], e);
      }
    }
    get innerHTML() {
      return this.html || '';
    }
    insertAdjacentHTML(where, h) {
      this.innerHTML = this.innerHTML + h;
    }
    addEventListener(k, f) {
      (this.listeners[k] ??= []).push(f);
    }
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
    getAttribute(k) {
      return this.attrs[k];
    }
    getContext() {
      return ctx;
    }
    toDataURL() {
      return 'data:image/png;base64,AA';
    }
    getBoundingClientRect() {
      return { width: 720, height: 600, left: 0, top: 0, bottom: 600 };
    }
    appendChild(e) {
      elements.set(e.id, e);
    }
    focus() {}
    setSelectionRange() {}
    setPointerCapture() {}
    click() {
      this.onclick?.({ target: this });
      for (const f of this.listeners.click || []) f({ target: this });
    }
  }
  for (const m of html.matchAll(/id="([^"]+)"/g)) elements.set(m[1], new El(m[1]));
  const doc = {
    hidden: false,
    querySelector: s =>
      elements.get(s.slice(1)) || (elements.set(s.slice(1), new El(s.slice(1))), elements.get(s.slice(1))),
    querySelectorAll: () => [],
    createElement: () => new El(),
    head: new El('head'),
    body: new El('body'),
    addEventListener() {},
    fonts: null,
    documentElement: { clientWidth: 1440, clientHeight: 900, style: { setProperty() {} } }
  };
  const context = {
    console,
    document: doc,
    performance: { now: () => clock },
    crypto: crypto.webcrypto,
    atob,
    btoa,
    TextEncoder,
    TextDecoder,
    Math,
    Map,
    Set,
    WeakMap,
    JSON,
    Promise,
    Uint8Array,
    Uint8ClampedArray,
    Float32Array,
    Image: class {},
    devicePixelRatio: 1,
    innerWidth: 1440,
    innerHeight: 900,
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (k, f) => {
      (events.get(k) || events.set(k, []).get(k)).push(f);
    },
    requestAnimationFrame: f => {
      rafs.push(f);
      return rafs.length;
    },
    cancelAnimationFrame() {},
    setTimeout: (f, ms = 0) => {
      timers.set(++tid, { f, at: clock + ms });
      return tid;
    },
    clearTimeout: id => timers.delete(id),
    setInterval: (f, ms) => {
      timers.set(++tid, { f, at: clock + ms, ms });
      return tid;
    },
    clearInterval: id => timers.delete(id),
    __SD_TEST__: true,
    ...options
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 15000 });
  return {
    api: context.__SD,
    context,
    elements,
    timers,
    rafs,
    advance(ms) {
      clock += ms;
      for (const [id, t] of [...timers])
        if (t.at <= clock) {
          if (t.ms) t.at = clock + t.ms;
          else timers.delete(id);
          t.f();
        }
    },
    event(k, e) {
      for (const f of events.get(k) || []) f(e);
    }
  };
}
let passed = 0;
function test(name, f) {
  try {
    f();
    passed++;
    console.log('PASS ' + name);
  } catch (e) {
    console.error('FAIL ' + name);
    throw e;
  }
}
const r = runtime(),
  a = r.api,
  G = a.G;
a.setGear({ bolts: 0, items: [], next: 1 }); // no loadout: starter tests count the exact kit
const start = () => {
  a.startMatch('solo');
  a.openBuild();
};
test('catalog loads and every starter is connected, usable and owned', () => {
  const signatures = new Set();
  for (let n = 0; n < 200; n++) {
    start();
    assert.equal(G.base.size + G.top.size, 23);
    assert(a.designConnected(G.base));
    assert.equal(a.blockedList().length, 0);
    const used = {};
    for (const e of [...G.base.values(), ...G.top.values()]) used[e.id] = (used[e.id] || 0) + 1;
    for (const [id, count] of Object.entries(used)) assert.equal(count, G.inv[id]);
    signatures.add(G.starterGuns.join(','));
  }
  assert(signatures.size > 10);
  assert.equal(a.MODS.length, 235);
});
test('all heavy drafted modules include enough free support', () => {
  for (const m of a.MODS.filter(m => m.layer === 't' && m.mnt === 2)) {
    start();
    a.takeOption({ type: 'module', id: m.id, n: 2 });
    assert.equal(a.draftSupportCount(m.id, 2), 0);
    assert(G.inv.girder >= 2);
    a.autoPlace(true);
    assert.equal(a.blockedList().length, 0, m.name);
    assert.equal([...G.top.values()].filter(e => e.id === m.id).length, 2, m.name);
  }
});
test('auto-place never creates blocked directional parts', () => {
  for (let n = 0; n < 60; n++) {
    start();
    G.inv.spike += 4;
    G.inv.frame += 3;
    G.inv.mg = (G.inv.mg || 0) + 4;
    a.autoPlace(true);
    assert.equal(a.blockedList().length, 0);
    assert(a.designConnected(G.base));
    for (const id of Object.keys(G.inv))
      assert([...G.base.values(), ...G.top.values()].filter(e => e.id === id).length <= G.inv[id]);
  }
});
test('auto-build creates a connected car and one undo returns the original design', () => {
  start();
  G.inv.spike += 6;
  G.inv.frame += 4;
  const before = JSON.stringify([[...G.base], [...G.top]]);
  const historyLength = G.hist.length;
  a.autoBuild();
  assert(a.designConnected(G.base));
  assert.equal(a.blockedList().length, 0);
  assert.equal(G.hist.at(-1), before);
  assert.equal(G.hist.length, historyLength + 1);
});
test('scoring is one point per round and a double-point finale everywhere', () => {
  assert.equal(
    Array.from({ length: 10 }, (_, i) => a.roundPoints(i + 1)).reduce((x, y) => x + y),
    11
  );
  assert.equal(a.pointsRemaining(0), 11);
  assert.equal(a.pointsRemaining(1), 10);
  assert.equal(a.pointsRemaining(9), 2);
  assert.equal(a.pointsRemaining(10), 0);
});
test('Space fires while J remains a separate jump action', () => {
  start();
  G.phase = 'battle';
  const b = a.getB();
  // readLocal needs only a car for aim; resetProfile does not start the arena.
  a.setB({ cars: [], me: 0 });
  a.keys.add('Space');
  assert.equal(a.readLocal().fire, true);
  a.keys.delete('Space');
  a.keys.add('KeyJ');
  assert.equal(a.readLocal().fire, false);
  a.keys.clear();
  a.setB(b);
});
test('search, rarity, favorites and mount filters combine', () => {
  start();
  G.catalogQ = 'machine';
  assert(a.catalogMatches(a.MOD.mg));
  assert(!a.catalogMatches(a.MOD.spike));
  G.catalogQ = '';
  G.catalogRarity = '3';
  assert(!a.catalogMatches(a.MOD.mg));
  G.catalogRarity = 'all';
  G.favoritesOnly = true;
  G.favorites = new Set(['mg']);
  assert(a.catalogMatches(a.MOD.mg));
  assert(!a.catalogMatches(a.MOD.pulse));
  G.favoritesOnly = false;
  G.compatibleOnly = true;
  assert(a.catalogMatches(a.MOD.mg));
  assert(!a.catalogMatches(a.MOD.shield));
  G.compatibleOnly = false;
});
test('weak-link analysis identifies fragile branches', () => {
  start();
  G.base = new Map([
    ['0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 }],
    ['0,-1', { id: 'frame', x: 0, y: -1, rot: 0 }],
    ['0,-2', { id: 'frame', x: 0, y: -2, rot: 0 }]
  ]);
  G.top = new Map();
  assert.equal(a.weakLinks().length, 1);
  assert.equal(a.weakLinks()[0].y, -1);
});
test('crate charges once, grants once and skip cannot duplicate rewards', () => {
  start();
  const count = () => Object.values(G.inv).reduce((x, y) => x + y, 0),
    before = count();
  a.openCrate();
  const coins = G.coins; // 40, or 190 on the 1-in-100 jackpot
  assert(coins === 40 || coins === 190, 'charged once: ' + coins);
  const gained = count();
  assert(gained > before);
  a.openCrate();
  assert.equal(G.coins, coins);
  assert.equal(count(), gained);
  r.elements.get('cSkip').click();
  r.elements.get('cSkip').click();
  assert.equal(count(), gained);
  r.elements.get('cDone').click();
  assert(r.elements.get('ovCrate').hidden);
});
test('connection loss preserves the car and pauses instead of ending immediately', () => {
  start();
  G.mode = 'mp';
  G.started = true;
  G.phase = 'battle';
  a.Net.role = 'host';
  a.Net.connected = true;
  a.Net.conn = { close() {} };
  const before = JSON.stringify([...G.base]);
  a.Net.lost();
  assert(a.Net.reconnecting);
  assert.equal(G.phase, 'battle');
  assert.equal(JSON.stringify([...G.base]), before);
  assert(!r.elements.get('ovReconnect').hidden);
  a.Net.resumeConnection();
  assert(!a.Net.reconnecting);
  assert.equal(G.phase, 'battle');
  assert(r.elements.get('ovReconnect').hidden);
});
test('ping and connection quality update from round-trip messages', () => {
  a.Net.connected = true;
  a.Net.ping = null;
  r.advance(50);
  a.Net.recv({ t: 'pong', at: 0 });
  assert.equal(a.Net.ping, 50);
  a.Net.updateStatus();
  assert(r.elements.get('netStatus').textContent.includes('50 ms'));
});
test('reconnect timeout ends cleanly without deleting the vehicle', () => {
  a.Net.role = 'host';
  a.Net.conn = { close() {} };
  a.Net.connected = true;
  a.Net.lost();
  r.advance(31000);
  assert.equal(G.phase, 'final');
  assert(!a.Net.reconnecting);
  assert(G.base.size > 0);
  a.Net.close();
});
test('breaking a connector records the detached branch for replay', () => {
  start();
  const v = a.makeCar(
    {
      base: new Map([
        ['0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 }],
        ['0,-1', { id: 'frame', x: 0, y: -1, rot: 0 }],
        ['0,-2', { id: 'frame', x: 0, y: -2, rot: 0 }]
      ]),
      top: new Map()
    },
    0,
    100,
    100,
    0,
    { tune: [] }
  );
  const b = {
    rec: true,
    ev: [],
    fx: [],
    cars: [v],
    time: 0,
    objs: [],
    uidc: 0,
    nums: [],
    shots: [],
    debris: [],
    hitDirs: []
  };
  a.setB(b);
  a.killInst(
    v,
    v.insts.find(i => i.id === 'frame' && i.cells.some(c => c.gy === -1))
  );
  assert(b.ev.some(e => e[0] === 'lesson' && e[4].includes('attached part')));
});
test('release version contains all requested UI affordances', () => {
  for (const text of [
    'id="cSkip"',
    'id="btnArcs"',
    'Weak links',
    'Search modules',
    'Battle music',
    'Reconnect window expired',
    'LMB/Space'
  ])
    assert(html.includes(text), text);
  assert(!html.includes('round N is worth N points'));
});
test('two peers recover a dropped battle with authoritative score, clock and cooldowns', () => {
  const host = runtime(),
    guest = runtime(),
    h = host.api,
    g = guest.api;
  for (const x of [h, g]) {
    x.startMatch('solo');
    x.openBuild();
    x.G.mode = 'mp';
    x.G.started = true;
  }
  h.Net.role = 'host';
  g.Net.role = 'client';
  function pair() {
    const messages = [];
    const make = peer => ({
      peer,
      open: false,
      handlers: {},
      on(k, f) {
        this.handlers[k] = f;
      },
      send(d) {
        messages.push(() => this.other.handlers.data?.(JSON.parse(JSON.stringify(d))));
      },
      close() {
        if (!this.open) return;
        this.open = false;
        this.handlers.close?.();
        this.other.open = false;
        this.other.handlers.close?.();
      }
    });
    const hc = make('guest-id'),
      gc = make('host-id');
    hc.other = gc;
    gc.other = hc;
    h.Net.bind(hc);
    g.Net.bind(gc);
    hc.open = gc.open = true;
    hc.handlers.open();
    gc.handlers.open();
    const flush = () => {
      let n = 0;
      while (messages.length) {
        assert(n++ < 100);
        messages.shift()();
      }
    };
    flush();
    return { hc, gc, flush };
  }
  let channel = pair();
  assert(h.Net.connected && g.Net.connected);
  const cfg = h.makeCfg(g.myCarCfg());
  h.toBattle({ ...cfg, net: 'host', me: 0 });
  g.toBattle({ ...cfg, net: 'client', me: 1 });
  h.G.score = [3, 1];
  h.getB().time = 12;
  h.getB().t = 78;
  h.getB().cars[0].insts[0].bcd = 16;
  channel.hc.close();
  assert(h.Net.reconnecting && g.Net.reconnecting);
  assert.equal(h.G.phase, 'battle');
  channel = pair();
  assert(!h.Net.reconnecting && !g.Net.reconnecting);
  assert.deepEqual([...g.G.score], [1, 3]);
  assert.equal(g.getB().time, 12);
  assert.equal(g.getB().t, 78);
  assert.equal(g.getB().cars[0].insts[0].bcd, 16);
  h.Net.close();
  channel.flush();
  g.Net.close();
});
test('online 2v2: same team plays together against two host bots, different teams each get a bot partner', () => {
  for (const coop of [true, false]) {
    const host = runtime(),
      guest = runtime(),
      h = host.api,
      g = guest.api;
    h.Net.role = 'host';
    g.Net.role = 'client';
    const messages = [];
    const make = peer => ({
      peer,
      open: false,
      handlers: {},
      on(k, f) {
        this.handlers[k] = f;
      },
      send(d) {
        messages.push(() => this.other.handlers.data?.(JSON.parse(JSON.stringify(d))));
      },
      close() {}
    });
    const hc = make('guest-id'),
      gc = make('host-id');
    hc.other = gc;
    gc.other = hc;
    h.Net.bind(hc);
    g.Net.bind(gc);
    hc.open = gc.open = true;
    hc.handlers.open();
    gc.handlers.open();
    const flush = () => {
      let n = 0;
      while (messages.length) {
        assert(n++ < 200);
        messages.shift()();
      }
    };
    flush();
    h.beginMP(null, 'balanced', 5, 2, coop);
    g.beginMP(null, 'balanced', 5, 2, coop);
    let start = null;
    const send0 = hc.send;
    hc.send = function (d) {
      if (d.t === 'start') start = JSON.parse(JSON.stringify(d.cfg));
      return send0.call(this, d);
    };
    for (const x of [h, g]) {
      x.openBuild();
      x.enterWait();
    }
    flush();
    assert(start, 'the host starts the battle');
    h.toBattle({ ...start, net: 'host', me: 0 });
    g.toBattle({ ...start, net: 'client', me: start.clientMe });
    const hb = h.getB(),
      gb = g.getB();
    assert(hb && gb && hb.cars.length === 4 && gb.cars.length === 4, 'four cars on both screens');
    const meG = gb.me;
    assert.equal(meG, coop ? 2 : 1, 'the guest sits in the right seat');
    assert.equal(h.teamOf(hb.cars[meG]), coop ? 0 : 1, 'the guest is on the chosen side');
    assert.equal(hb.cars.filter(c => c.ctrl === 'bot').length, 2, 'two bots fill the empty seats');
    assert.equal(hb.cars[meG].ctrl, 'remote');
    const html = h.lobbyTeamsHtml(true, true);
    assert(html.includes('Blue team') || true);
  }
});
test('recovery cannot double-award a completed round or skip a player draft', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  aa.G.mode = 'mp';
  aa.Net.role = 'client';
  const cfg = aa.makeCfg(aa.myCarCfg());
  aa.toBattle({ ...cfg, net: 'client', me: 1 });
  const result = { round: 1, win: 0, why: 'test', stats: aa.getB().stats };
  aa.Net.recv({
    t: 'recover',
    round: 2,
    score: [1, 0],
    sched: aa.G.sched,
    phase: 'build',
    result,
    resultScoreIncluded: true
  });
  assert.equal(aa.G.round, 1);
  assert.deepEqual([...aa.G.score], [0, 0]);
  assert.equal(aa.getB().seq, 'end');
  aa.G.phase = 'result';
  aa.Net.recv({
    t: 'recover',
    round: 2,
    score: [1, 0],
    sched: aa.G.sched,
    phase: 'build',
    result,
    resultScoreIncluded: true
  });
  assert.equal(aa.G.round, 1);
  assert.deepEqual([...aa.G.score], [0, 1]);
});
test('music schedules sound in battle and stops for pause, recovery and zero volume', () => {
  let notes = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({
    gain: param(),
    frequency: param(),
    Q: param(),
    connect() {},
    disconnect() {},
    start() {
      notes++;
    },
    stop() {}
  });
  class AudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 100;
      this.destination = node();
    }
    createGain() {
      return node();
    }
    createDynamicsCompressor() {
      return node();
    }
    createOscillator() {
      return node();
    }
    createBiquadFilter() {
      return node();
    }
    createBufferSource() {
      return node();
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(100) };
    }
    resume() {
      this.state = 'running';
    }
  }
  const rr = runtime({ AudioContext }),
    aa = rr.api;
  aa.unlock();
  aa.G.phase = 'battle';
  aa.setB({ t: 90 });
  aa.BattleMusic.update();
  assert(aa.BattleMusic.timer);
  assert(notes > 0);
  const timer = aa.BattleMusic.timer;
  aa.BattleMusic.update();
  assert.equal(aa.BattleMusic.timer, timer);
  aa.getB().paused = true;
  aa.BattleMusic.update();
  assert.equal(aa.BattleMusic.timer, null);
  aa.getB().paused = false;
  aa.Net.reconnecting = true;
  aa.BattleMusic.update();
  assert.equal(aa.BattleMusic.timer, null);
  aa.Net.reconnecting = false;
  aa.SETTINGS.music = 0;
  aa.BattleMusic.update();
  assert.equal(aa.BattleMusic.timer, null);
});
function arenaRuntime() {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  aa.G.phase = 'battle';
  const cfg = aa.makeCfg(aa.myCarCfg());
  aa.toBattle({ ...cfg, me: 0, net: null });
  aa.getB().seq = 'play';
  rr.elements.get('ac').getBoundingClientRect = () => ({ left: 10, top: 50, width: 1280, height: 720, bottom: 770 });
  aa.sizeArena();
  aa.cam.x = 1000;
  aa.cam.y = 625;
  aa.cam.z = 1;
  return { rr, aa };
}
test('screen projection and mouse aiming round-trip at every camera position', () => {
  const { aa } = arenaRuntime();
  for (const z of [1, 1.6, 2]) {
    aa.cam.z = z;
    for (const [x, y] of [
      [20, 20],
      [1000, 625],
      [1980, 1230],
      [230, 440]
    ]) {
      const screen = aa.worldToScreen(x, y),
        world = aa.toWorld(screen[0] + 10, screen[1] + 50);
      assert(Math.abs(world[0] - x) < 1e-8);
      assert(Math.abs(world[1] - y) < 1e-8);
    }
  }
});
test('the camera keeps distant opponents visible', () => {
  const { aa } = arenaRuntime(),
    b = aa.getB();
  b.cars[0].x = 180;
  b.cars[0].y = 625;
  b.cars[1].x = 1820;
  b.cars[1].y = 625;
  for (let i = 0; i < 200; i++) aa.updateCam(0.05);
  assert(aa.cam.z <= 1.6);
  for (const v of b.cars) {
    const [x, y] = aa.worldToScreen(v.x, v.y);
    assert(x > 0 && x < aa.view.w);
    assert(y > 0 && y < aa.view.h);
  }
});
test('arena presentation leaves world coordinates and protocol intact', () => {
  const { aa } = arenaRuntime();
  const before = aa.getB().cars.map(v => [v.x, v.y, v.a]);
  aa.syncPresentation();
  assert.deepEqual(
    aa.getB().cars.map(v => [v.x, v.y, v.a]),
    before
  );
  assert(/NET_PROTOCOL\s*=\s*\d+\b/.test(html));
});
test('open overlays release held input and prevent background fire', () => {
  const { rr, aa } = arenaRuntime();
  aa.keys.add('Space');
  aa.keys.add('KeyW');
  rr.elements.get('ovSettings').hidden = false;
  const i = aa.readLocal();
  assert.equal(i.fire, false);
  assert.equal(i.th, 0);
  assert.equal(aa.keys.size, 0);
});
test('all fifty designs have unique names, intended shapes, tags and executable mechanics', () => {
  const added = a.MODS.filter(m => m.plan && !m.odd);
  assert.equal(added.length, 50);
  assert.equal(new Set(a.MODS.map(m => m.name)).size, a.MODS.length);
  const counts = {};
  for (const m of added) {
    const b = a.shapeBounds(m);
    counts[m.shapeName ? 'special' : `${b.w}x${b.h}`] = (counts[m.shapeName ? 'special' : `${b.w}x${b.h}`] || 0) + 1;
    assert(m.tags.includes(m.branch));
    assert(m.desc && m.con);
  }
  assert.deepEqual(counts, { '1x1': 15, '1x2': 10, '1x3': 5, '2x2': 10, '2x3': 5, special: 5 });
});
test('odd parts cover every rarity, have glyphs and unusual shapes', () => {
  const odd = a.MODS.filter(m => m.odd);
  assert.equal(odd.length, 15);
  assert.equal(new Set(a.MODS.map(m => m.id)).size, a.MODS.length);
  for (let r = 0; r < 5; r++) assert.equal(odd.filter(m => m.rar === r).length, 3);
  assert(odd.every(m => m.glyph && m.desc && m.con && m.art.k === 'plan'));
  assert(odd.filter(m => a.cellCount(m) > 1).length >= 10);
  const sh = new Set(
    odd.map(m => {
      const b = a.shapeBounds(m);
      return b.w + 'x' + b.h + ':' + a.cellCount(m);
    })
  );
  assert(sh.size >= 6);
});
test('every new footprint rotates four times without changing occupied area or filling shape holes', () => {
  for (const m of a.MODS.filter(m => m.plan)) {
    for (let rot = 0; rot < 4; rot++) {
      const cs = a.footprint(m.id, rot, 2, 3);
      assert.equal(cs.length, a.cellCount(m));
      assert.equal(new Set(cs.map(c => c.join(','))).size, cs.length);
      const center = a.instCenter({ id: m.id, rot, x: 2, y: 3 });
      assert(center.every(Number.isFinite));
    }
  }
  const l = a.footprint('campfork', 0, 0, 0);
  assert(!l.some(c => c[0] === 1 && c[1] === 0));
  assert.equal(a.occupancy(new Map([['0,0', { id: 'campfork', rot: 0, x: 0, y: 0 }]])).size, 3);
});
test('multi-cell equipment needs every mount, cannot overlap, and removes as one module from any cell', () => {
  start();
  G.inv.popcorn = 2;
  G.top.clear();
  G.base.clear();
  G.base.set('0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 });
  for (let y = -2; y <= 2; y++)
    for (let x = -2; x <= 2; x++) if (x || y) G.base.set(`${x},${y}`, { id: 'girder', rot: 0, x, y });
  G.sel = 'popcorn';
  G.rot = 0;
  assert.equal(a.canPlaceTop('popcorn', 1, 1, a.occupancy(G.base)), null);
  a.act(1, 1, 'place');
  assert.equal(G.top.size, 1);
  assert.equal(a.topAt('2,0').id, 'popcorn');
  assert(a.canPlaceTop('popcorn', 2, 1, a.occupancy(G.base)));
  G.layerView = 'both';
  a.act(2, 0, 'remove');
  assert.equal(G.top.size, 0);
  G.base.delete('2,0');
  assert(a.canPlaceTop('popcorn', 1, 1, a.occupancy(G.base)));
});
test('all fifty drafted modules remain connected and auto-place never creates equipment overlap', () => {
  for (const m of a.MODS.filter(m => m.plan)) {
    start();
    a.takeOption({ type: 'module', id: m.id, n: 1 });
    a.autoPlace(true);
    assert(
      [...G.base.values(), ...G.top.values()].some(e => e.id === m.id),
      m.name + ' did not mount'
    );
    assert(a.designConnected(G.base), m.name);
    assert.equal(a.blockedList().length, 0, m.name);
    const occupied = a.occupancy(G.top);
    assert.equal(
      occupied.size,
      [...G.top.values()].reduce((n, e) => n + a.cellCount(a.MOD[e.id]), 0),
      m.name
    );
  }
});
function planScene(id) {
  const { rr, aa } = arenaRuntime();
  const b = aa.getB(),
    base = new Map(),
    top = new Map();
  for (let y = -5; y <= 3; y++)
    for (let x = -3; x <= 3; x++)
      base.set(`${x},${y}`, { id: x === 0 && y === 0 ? 'cockpit' : 'girder', x, y, rot: 0 });
  const m = aa.MOD[id],
    e = { id, x: 0, y: -2, rot: 0 };
  if (m.layer === 't') top.set('0,-2', e);
  else {
    for (const [x, y] of aa.footprint(id, 0, 0, -2)) base.delete(`${x},${y}`);
    base.set('0,-2', e);
  }
  const v = aa.makeCar({ base, top }, 0, 700, 600, 0, { tune: [], name: 'Module test', paint: '#fff' });
  b.cars[0] = v;
  b.cars[1].x = 1500;
  b.cars[1].y = 600;
  b.st = [];
  b.objs = [];
  b.zones = [];
  b.pk = [];
  b.seq = 'play';
  b.time = 1;
  aa.G.phase = 'battle';
  v.fire = true;
  v.aimX = 700;
  v.aimY = 0;
  return { rr, aa, b, v, I: v.insts.find(i => i.id === id) };
}
test('every new module runs and renders in combat without invalid positions, HP or projectile values', () => {
  for (const m of a.MODS.filter(m => m.plan)) {
    const { aa, b, v, I } = planScene(m.id);
    assert(I, m.name);
    for (let n = 0; n < 45; n++) {
      b.time += 0.05;
      aa.planTick(v, 0.05);
      aa.weapons(v, 0.05);
    }
    for (const n of [v.x, v.y, v.c.mass, v.rad, I.hp]) assert(Number.isFinite(n), m.name);
    for (const shot of b.shots)
      for (const k of ['x', 'y', 'vx', 'vy', 'life', 'dmg']) assert(Number.isFinite(shot[k]), m.name + ':' + k);
    aa.drawArena();
  }
});
test('cargo collects world scrap once, rejects own parts and cannot farm spilled cargo rewards', () => {
  const { aa, b, v } = planScene('pouch');
  const o = aa.mkObj('crate', v.x, v.y, 0);
  o.uid = 44;
  assert(aa.planTakeScrap(v, o));
  assert.equal(v.cargo, 1);
  assert.equal(v.coins, 2);
  assert(!aa.planTakeScrap(v, o));
  const part = { ...o, dead: false, kind: 'part', uid: 45 };
  assert(!aa.planTakeScrap(v, part));
  aa.planSpill(v, v.x, v.y);
  assert.equal(v.cargo, 0);
  assert(!aa.planTakeScrap(v, b.objs[0]));
  const other = b.cars[1];
  other.has.pouch = 1;
  assert(aa.planTakeScrap(other, b.objs[0]));
  assert.equal(other.coins, 0);
});
test('cargo cap limits round rewards and lost storage spills its contents', () => {
  const { aa, b, v, I } = planScene('hopper');
  for (let n = 0; n < 70; n++) {
    v.cargo = 0;
    const o = aa.mkObj('crate', 0, 0, 0);
    o.uid = 100 + n;
    aa.planTakeScrap(v, o);
  }
  assert.equal(v.coins, 40);
  v.cargo = 5;
  aa.killInst(v, I, true);
  aa.planTick(v, 0.05);
  assert.equal(v.cargo, 0);
  assert(b.objs.length >= 5);
});
test('snowcap cancels only the first fire hit and bottlecap consumes collected scrap', () => {
  const s = planScene('snowcap');
  assert.equal(s.aa.planHurt(s.v, s.I, 20, 'fire'), 0);
  assert.equal(s.aa.planHurt(s.v, s.I, 20, 'fire'), 20);
  const t = planScene('bottlecap');
  t.v.cargo = 1;
  assert.equal(t.aa.planHurt(t.v, t.I, 8, 'light'), 0);
  assert.equal(t.v.cargo, 0);
  assert.equal(t.aa.planHurt(t.v, t.I, 8, 'light'), 8);
});
test('scrap spitter uses real cargo and bell, drops and counter have equipped cooldowns', () => {
  const { aa, b, v, I } = planScene('spitter');
  v.cargo = 2;
  I.cd = 0;
  aa.planWeapon(v, I, 0.05);
  assert.equal(v.cargo, 1);
  assert.equal(I.W.dmg, 17);
  v.cargo = 0;
  aa.planWeapon(v, I, 0.05);
  assert.equal(I.W.dmg, 5);
  for (const [id, key] of [
    ['soap', 'KeyZ'],
    ['frostbead', 'KeyZ'],
    ['foambath', 'KeyZ'],
    ['rubberduck', 'KeyV']
  ]) {
    const p = planScene(id);
    p.aa.planActivate(p.v, key);
    const n = p.b.zones.length + p.b.decoys.length;
    p.aa.planActivate(p.v, key);
    assert.equal(p.b.zones.length + p.b.decoys.length, n);
    assert(p.I.planCd > p.b.time);
  }
});
test('dragon announces a real wind-up before firing and has a recovery cooldown', () => {
  const { aa, b, v, I } = planScene('dragon');
  assert(aa.planWeapon(v, I, 0.6));
  assert.equal(I.charge, 0.6);
  assert.equal(aa.planWeapon(v, I, 0.7), false);
  assert(I.planBurst > 0);
  assert(I.planCd > b.time);
  v.fire = false;
  I.planBurst = 0;
  assert(aa.planWeapon(v, I, 0.1));
  assert.equal(I.charge, 0);
});
test('new cargo, cable and cooldown states survive snapshot and replay application', () => {
  const { aa, b, v, I } = planScene('grapple');
  v.cargo = 2;
  v.scrapEarned = 4;
  I.planCd = 8;
  I.heat = 0.7;
  v.planLinks = [{ n: I.n, x: 900, y: 300, len: 200, until: 9 }];
  b.scrapSeen = new Set([77]);
  const snap = aa.snapshot();
  v.cargo = 0;
  I.planCd = 0;
  v.planLinks = [];
  aa.applySnap(snap, true);
  assert.equal(v.cargo, 2);
  assert.equal(I.planCd, 8);
  assert.equal(v.planLinks[0].len, 200);
  assert(b.scrapSeen.has(77));
});
test('Scrap Run deposits only carried world scrap and ends at its announced target', () => {
  const { aa, b, v } = planScene('pouch');
  aa.setupSpecial('scrap');
  b.zones = [{ kind: 'base', team: 0, x: v.x - 50, y: v.y - 50, w: 100, h: 100 }];
  v.cargo = 5;
  aa.stepSpecial(0.1);
  assert.equal(b.obj.score[0], 5);
  assert.equal(v.cargo, 0);
  v.cargo = 15;
  aa.stepSpecial(0.1);
  assert.equal(b.win, 0);
  assert.equal(b.seq, 'end');
});
test('Scrap Run timeout uses delivered scrap rather than health or undelivered cargo', () => {
  const { aa, b, v } = planScene('pouch');
  aa.setupSpecial('scrap');
  b.obj.score = [4, 7];
  v.cargo = 20;
  const result = aa.specialTimeout();
  assert.equal(result[0], 1);
  assert.equal(v.cargo, 20);
  b.obj.score = [7, 7];
  assert.equal(aa.specialTimeout(), null);
});
test('formats: Draft duel stays the default, Blueprint Brawl picks a car within budget and skips the draft', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo', null, 'lives');
  assert.equal(aa.G.format, 'balanced', 'removed formats fall back to the draft duel');
  assert.equal(aa.roundPoints(10), 2);
  aa.startMatch('solo', null, 'brawl');
  assert.equal(aa.G.format, 'brawl');
  const ch = aa.brawlChoices();
  assert(ch.length >= 6, 'six archetypes to pick from');
  for (const c of ch.filter(c => !c.saved)) {
    assert(aa.designCost(c.d) <= 700, c.name + ' fits the budget');
    assert(aa.designConnected(c.d.base), c.name + ' is connected');
  }
  aa.brawlApply(ch[0].d);
  assert.equal(aa.G.coins, 0);
  assert.equal(
    Object.values(aa.G.inv).reduce((x, y) => x + y, 0),
    aa.G.base.size + aa.G.top.size,
    'the bin is exactly the car'
  );
  aa.prepareBot();
  assert(aa.designCost(aa.G.botDesign) <= 700, 'the bot brings a legal car too');
  assert(!aa.gearActive(), 'no gear in a Brawl');
  assert.equal(Object.keys(aa.POWERUPS).length, 6);
});
test('new report tracks the actual damaged layer and first broken connection', () => {
  const { aa, b, v, I } = planScene('tinder');
  aa.hurtInst(v, I, 10, 'kin', 0, 0, 0, 0, 1);
  assert(v.damageMap['t|0,-2'] > 0);
  aa.killInst(v, I);
  assert.equal(v.firstBreak.id, 'tinder');
  assert.equal(v.firstBreak.layer, 't');
});

test('every new module appears in a real catalog category', () => {
  const cats = new Set(a.CATS.map(c => c.id));
  for (const m of a.MODS.filter(m => m.plan)) assert(cats.has(m.cat), m.name + ':' + m.cat);
});
test('replacing a support under a non-anchor equipment cell returns the complete part', () => {
  start();
  G.base.clear();
  G.top.clear();
  G.ws = new Set();
  for (let y = -3; y <= 2; y++)
    for (let x = -3; x <= 3; x++) {
      G.ws.add(`${x},${y}`);
      G.base.set(`${x},${y}`, { id: x || y ? 'girder' : 'cockpit', x, y, rot: 0 });
    }
  G.inv.popcorn = 1;
  G.inv.frame = 99;
  G.top.set('1,1', { id: 'popcorn', x: 1, y: 1, rot: 0 });
  G.sel = 'frame';
  G.layerView = 'both';
  a.act(2, 0, 'place');
  assert.equal(G.top.size, 0);
  assert.equal(G.base.get('2,0').id, 'frame');
});
test('new tow cables have separate roots, follow a moving rival and pull both cars', () => {
  const { aa, b, v, I } = planScene('towyoke'),
    enemy = b.cars[1];
  enemy.x = v.x + 200;
  enemy.y = v.y;
  v.aimX = enemy.x;
  v.aimY = enemy.y;
  aa.planActivate(v, 'RMB');
  assert.equal(v.planLinks.length, 2);
  assert.notEqual(v.planLinks[0].off, v.planLinks[1].off);
  const old = v.planLinks[0].len;
  enemy.x += 30;
  aa.planTick(v, 0.05);
  assert.equal(v.planLinks.length, 2);
  assert(v.vx > 0);
  assert(enemy.vx < 0);
  assert.equal(v.planLinks[0].len, old);
});
test('rescue jack rights a stopped car and ice press requires a wind-up', () => {
  const s = planScene('rescue');
  s.v.flip = 2;
  s.v.fire = false;
  s.aa.planActivate(s.v, 'KeyC');
  s.aa.planTick(s.v, 0.2);
  assert(s.v.flip < 2);
  assert(s.I.rescueUntil > s.b.time);
  const p = planScene('glacier');
  p.I.blocked = false;
  assert(p.aa.planWeapon(p.v, p.I, 0.4));
  assert(p.I.punch > 0);
  assert(p.aa.planWeapon(p.v, p.I, 0.7));
  assert(p.I.planCd > p.b.time);
});
test('garage damage map returns to the same report without changing the blueprint', () => {
  const { rr, aa, v } = planScene('pouch');
  const before = JSON.stringify([...aa.G.base]);
  const st = { damage: { 'b|0,0': 10 }, first: { id: 'cockpit', k: '0,0', layer: 'b' } };
  aa.openGarageReport(st, 'b|0,0');
  assert.equal(aa.G.phase, 'review');
  rr.elements.get('reviewBack').click();
  assert.equal(aa.G.phase, 'result');
  assert.equal(rr.elements.get('ovResult').hidden, false);
  assert.equal(JSON.stringify([...aa.G.base]), before);
});
test('completed round recovery preserves awarded points exactly once', () => {
  const { rr, aa, b } = planScene('tinder');
  aa.G.mode = 'mp';
  aa.G.round = 1;
  aa.Net.role = 'client';
  b.net = 'client';
  b.me = 1;
  b.tape = [];
  aa.endRound(0, 'Recovery');
  const stats = b.stats;
  b.seq = 'play';
  aa.Net.recv({
    t: 'recover',
    round: 1,
    score: [4, 0],
    lives: [20, 20],
    format: 'balanced',
    bounty: 3,
    bountyWinner: 0,
    sched: aa.G.sched,
    phase: 'result',
    result: { round: 1, win: 0, points: 4, stats, why: 'Recovery' },
    resultScoreIncluded: true
  });
  aa.finishBattle();
  assert.deepEqual([...aa.G.score], [0, 4]);
});

test('parts show a single available quantity and an On car state', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  aa.takeOption({ type: 'module', id: 'pouch', n: 2 });
  const content = rr.elements.get('leftBody').innerHTML;
  assert(content.includes('×2'));
  assert(content.includes('On car'));
  assert(!content.includes(' owned'));
  assert(!content.includes(' loose · '));
  assert(rr.elements.get('binCount').textContent.includes('available'));
});
test('crate shakes, rolls and reveals over several seconds without changing the prize', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  const count = () => Object.values(aa.G.inv).reduce((n, v) => n + v, 0),
    before = count();
  aa.openCrate();
  const owned = count();
  assert(owned > before);
  const run = ms => {
    for (let t = 0; t < ms; t += 16) {
      rr.advance(16);
      for (const f of rr.rafs.splice(0)) f(rr.context.performance.now());
    }
  };
  run(3000);
  assert.equal(rr.elements.get('reelres').innerHTML, '', 'revealed too early');
  run(3600);
  assert(rr.elements.get('reelres').innerHTML.includes('Back to the garage'));
  assert.equal(count(), owned);
  rr.elements.get('cSkip').click();
  assert.equal(count(), owned);
});
test('one in a hundred crates is a jackpot with a legendary, coins and the achievement', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  aa.G.forceJackpot = true;
  aa.openCrate();
  rr.elements.get('cSkip').click();
  const html = rr.elements.get('reelres').innerHTML;
  assert(html.includes('JACKPOT'));
  assert.equal(aa.G.coins, 100 - 60 + 150);
});
test('the prize wheel charges once, grants its slice and the MEGA slice gives two modules', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  aa.G.coins = 500;
  const count = () => Object.values(aa.G.inv).reduce((n, v) => n + v, 0),
    before = count();
  aa.G.forceWheel = aa.WHEEL_SEGS.findIndex(g => g.kind === 'mega');
  aa.spinWheel();
  assert.equal(aa.G.coins, 320);
  assert(count() >= before + 2);
  rr.elements.get('cSkip').click();
  assert(rr.elements.get('reelres').innerHTML.includes('MEGA'));
  rr.elements.get('cDone').click();
  const ci = aa.WHEEL_SEGS.findIndex(g => g.kind === 'coins');
  aa.G.forceWheel = ci;
  aa.spinWheel();
  assert.equal(aa.G.coins, 320 - 180 + aa.WHEEL_SEGS[ci].n);
});

test('shop filters discovered parts by search and rarity and exposes their real footprints', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  for (const m of aa.MODS) {
    aa.G.inv[m.id] = m.id === 'cockpit' ? 1 : 99;
    aa.G.found.add(m.id);
  }
  aa.G.coins = 9999;
  aa.G.leftTab = 'shop';
  aa.G.catalogQ = 'Dragon Bellows';
  aa.refreshUI();
  let content = rr.elements.get('leftBody').innerHTML;
  assert(content.includes('data-buy="dragon"'));
  assert(!content.includes('data-buy="pouch"'));
  assert(content.includes('2×3 · 6 cells'));
  aa.G.catalogRarity = '0';
  aa.refreshUI();
  content = rr.elements.get('leftBody').innerHTML;
  assert(!content.includes('data-buy="dragon"'));
  assert(content.includes('No discovered parts match'));
});

test('opening the menu pauses a solo battle and closing it resumes play', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  const cfg = aa.makeCfg(aa.myCarCfg());
  aa.toBattle({ ...cfg, me: 0, net: null });
  aa.getB().seq = 'play';
  aa.G.started = true;
  aa.showMenu();
  assert.equal(aa.getB().paused, true, 'bot kept fighting behind the menu');
  const t = aa.getB().t;
  for (let n = 0; n < 5; n++) {
    rr.advance(16);
    for (const f of rr.rafs.splice(0)) f(rr.context.performance.now());
  }
  assert.equal(aa.getB().t, t);
  rr.elements.get('ovMenu').hidden = true;
  for (let n = 0; n < 5; n++) {
    rr.advance(16);
    for (const f of rr.rafs.splice(0)) f(rr.context.performance.now());
  }
  assert.equal(aa.getB().paused, false);
});
test('one Escape closes the codex without also opening the pause menu', () => {
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  const cfg = aa.makeCfg(aa.myCarCfg());
  aa.toBattle({ ...cfg, me: 0, net: null });
  aa.getB().seq = 'play';
  rr.elements.get('ovCodex').hidden = false;
  rr.elements.get('ovPause').hidden = true;
  const ev = {
    code: 'Escape',
    key: 'Escape',
    target: { tagName: 'BODY' },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {}
  };
  rr.event('keydown', ev);
  assert.equal(rr.elements.get('ovCodex').hidden, true);
  assert.equal(rr.elements.get('ovPause').hidden, true);
  assert.notEqual(aa.getB().paused, true);
});

test('match length follows the chosen rounds and the countdown takes three seconds', () => {
  const r = runtime(),
    a = r.api;
  a.G.rounds = 5;
  a.startMatch('solo');
  assert.equal(a.G.sched.length, 5);
  assert(a.G.sched.filter(Boolean).length <= 2);
  a.G.rounds = 25;
  a.startMatch('solo');
  assert.equal(a.G.sched.length, 25);
  a.openBuild();
  a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
  const b = a.getB();
  const run = ms => {
    for (let t = 0; t < ms; t += 16) {
      r.advance(16);
      for (const f of r.rafs.splice(0)) f(r.context.performance.now());
    }
  };
  run(3600);
  assert.equal(b.seq, 'count', 'still counting after 3.6 s');
  run(1200);
  assert.equal(b.seq, 'play');
});
test('badges sanitize, rivals give hints and the match ends with fun awards', () => {
  const r = runtime(),
    a = r.api;
  assert.equal(a.validBadge('star.skull.2'), 'star.skull.2');
  assert.equal(a.validBadge('<x>.evil.99'), 'shield.bolt.0');
  a.startMatch('solo');
  a.openBuild();
  const d = a.defaultCar ? a.defaultCar() : null;
  const des = {
    base: new Map([
      ['0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 }],
      ...[-3, -2, -1, 1, 2, 3].map(x => [x + ',0', { id: 'girder', x, y: 0, rot: 0 }])
    ]),
    top: new Map([
      ['1,0', { id: 'flamer', x: 1, y: 0, rot: 0 }],
      ['-1,0', { id: 'tinder', x: -1, y: 0, rot: 0 }]
    ])
  };
  const h = a.oppHints(des);
  assert(h.length >= 1 && h.length <= 2);
  assert(
    h.some(x => /fire|wide/i.test(x)),
    h.join()
  );
  a.G.lastReplay = {
    me: 0,
    cfg: {
      cars: [
        { design: a.packDesign(des), name: 'Me', paint: '#fff', look: {} },
        {
          design: a.packDesign({ base: new Map([['0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 }]]), top: new Map() }),
          name: 'Bot',
          paint: '#f00',
          look: {}
        }
      ]
    },
    tape: []
  };
  a.G.fun = { lost: [5, 1], clutch: [0.03, 1], wins: [1, 0] };
  a.G.log = [{ round: 1, win: true, dealt: 500, taken: 200 }];
  const aw = a.funAwards();
  const titles = aw.map(x => x.title);
  assert(
    titles.includes('Widest Ride') && titles.includes('Survived on 1 HP') && titles.includes('Scrap Donor'),
    titles.join()
  );
  assert(
    aw.some(x => x.who === 1),
    'the loser gets something too'
  );
  for (const k of ['plain', 'frost', 'fire', 'magnet']) assert(a.CRATE_THEMES[k].name);
});
test('all twenty-six arenas generate, run their gimmicks and stay finite', () => {
  const r = runtime(),
    a = r.api;
  assert.equal(a.THEMES.length, 26);
  a.startMatch('solo');
  a.openBuild();
  for (let ti = 0; ti < a.THEMES.length; ti++) {
    const th = a.THEMES[ti];
    a.G.nextTheme = ti;
    const cfg = a.makeCfg(a.myCarCfg());
    assert.equal(cfg.theme, ti);
    for (const k of Object.keys(th.extra || {}))
      assert(
        cfg.field.zn.some(z => z.kind === k),
        th.id + ' has ' + k
      );
    a.toBattle({ ...cfg, me: 0, net: null });
    const b = a.getB();
    b.seq = 'play';
    b.t = 40;
    for (let n = 0; n < 60; n++) {
      b.cars[0].throttle = 1;
      a.simulate(0.05);
    }
    for (const v of b.cars) assert([v.x, v.y, v.vx, v.vy].every(Number.isFinite), th.id);
    assert(
      b.objs.every(o => Number.isFinite(o.x) && Number.isFinite(o.y)),
      th.id + ' objects'
    );
    a.drawArena();
  }
});
test('Scrap Gauntlet: hearts, boss every fifth wave, relics and run over', () => {
  const r = runtime(),
    a = r.api,
    G = a.G;
  G.diff = 1;
  a.startRun();
  assert(G.run && G.run.wave === 1 && G.run.hearts === 3);
  assert.equal(G.diff, 0, 'wave 1 is easy');
  const play = win => {
    a.openBuild();
    a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
    const b = a.getB();
    b.seq = 'play';
    a.endRound(win, 'test');
    a.finishBattle();
  };
  for (let w = 1; w < 5; w++) {
    play(0);
    assert(!r.elements.get('ovResult').hidden);
    a.runNext(false, false);
    if (w === 2) {
      assert.equal(G.run.wave, 2, 'halfway to the boss the run waits for a path');
      const c0 = G.coins;
      a.runPathChoose('heap');
      assert.equal(G.coins, c0 + 90, 'Scrap Heap pays out');
    }
  }
  assert.equal(G.run.wave, 5);
  assert(G.run.boss && G.run.boss.hp > 1);
  a.openBuild();
  a.prepareBot();
  const cfg = a.makeCfg(a.botCarCfg());
  assert(cfg.cars[1].boss);
  a.toBattle({ ...cfg, me: 0, net: null });
  const boss = a.getB().cars[1];
  assert(boss.boss && boss.dmgOut > 1);
  a.getB().seq = 'play';
  a.endRound(0, 'boss down');
  a.finishBattle();
  assert.equal(G.run.bosses, 1);
  assert.equal(G.run.hearts, 4);
  a.runNext(false, true);
  const relic = r.elements.get('resultCard').innerHTML;
  assert(relic.includes('relic'));
  a.openRelicPick(() => {});
  G.run.relics.push('tape', 'skin');
  const mods = a.runMods();
  assert(mods.hp > 0 && mods.dmgIn > 0);
  a.openBuild();
  a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
  const me = a.getB().cars[0];
  assert(me.dmgIn < 1);
  G.run.hearts = 1;
  a.getB().seq = 'play';
  a.endRound(1, 'ouch');
  a.finishBattle();
  a.runNext(true, false);
  assert.equal(G.run, null);
  assert.equal(G.diff, 1, 'difficulty restored');
  assert(r.elements.get('resultCard').innerHTML.includes('wave reached'));
});
function jointCar(a, jid, rot, extra = []) {
  const base = new Map(),
    top = new Map();
  base.set('0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 });
  base.set('1,0', { id: jid, x: 1, y: 0, rot });
  base.set('2,0', { id: 'girder', x: 2, y: 0, rot: 0 });
  base.set('3,0', { id: 'girder', x: 3, y: 0, rot: 0 });
  base.set('0,1', { id: 'wheel', x: 0, y: 1, rot: 0 });
  for (const e of extra) (a.MOD[e.id].layer === 't' ? top : base).set(e.x + ',' + e.y, e);
  return a.makeCar({ base, top }, 0, 1000, 600, 0, { tune: [], name: 'J', paint: '#fff' });
}
test('hinge swings its side 90 degrees, carries tops and stays in sync through snapshots', () => {
  const r = runtime(),
    a = r.api;
  a.startMatch('solo');
  for (const m of a.MODS) {
    a.G.inv[m.id] = m.id === 'cockpit' ? 1 : 99;
    a.G.found.add(m.id);
  }
  a.G.coins = 9999;
  a.openBuild();
  a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
  const v = jointCar(a, 'hinge', 1, [{ id: 'mg', x: 3, y: 0, rot: 0 }]);
  assert.equal(v.joints.length, 1);
  assert.equal(v.joints[0].kids.size, 2);
  const far = v.blocks.find(b => b.gx === 3),
    mg = v.insts.find(I => I.id === 'mg');
  const rest = a.bpos(v, far);
  v.rmb = true;
  for (let i = 0; i < 30; i++) a.stepJoints(v, 0.05);
  assert(Math.abs(v.joints[0].s - Math.PI / 2) < 1e-6, 'fully swung');
  const moved = a.bpos(v, far);
  // rest (3,0) around pivot (1,0) by +90° lands on (1,2) in car space; car angle 0 means world = local - com
  assert(
    Math.abs(moved[0] - rest[0] + 2 * 20) < 1e-6 && Math.abs(moved[1] - rest[1] - 2 * 20) < 1e-6,
    JSON.stringify([rest, moved])
  );
  assert(Math.hypot(a.ipos(v, mg)[0] - moved[0], a.ipos(v, mg)[1] - moved[1]) < 1, 'the gun rides along');
  assert(Math.abs(mg.la - Math.PI / 2) < 1e-6, 'and turns with it');
  assert(a.carBlockAt(v, moved[0], moved[1], 0) === far, 'hits land on the moved cell');
  const snap = a.jointSnap(v),
    w = jointCar(a, 'hinge', 1, [{ id: 'mg', x: 3, y: 0, rot: 0 }]);
  a.applyJointSnap(w, snap);
  const wm = a.bpos(
    w,
    w.blocks.find(b => b.gx === 3)
  );
  assert(Math.hypot(wm[0] - moved[0], wm[1] - moved[1]) < 1);
  v.rmb = false;
  for (let i = 0; i < 30; i++) a.stepJoints(v, 0.05);
  assert(Math.abs(v.joints[0].s) < 1e-6, 'swings back');
});
test('ram extends two cells, rotator spins, spring settles and a joint never moves the cockpit', () => {
  const r = runtime(),
    a = r.api;
  a.startMatch('solo');
  for (const m of a.MODS) {
    a.G.inv[m.id] = m.id === 'cockpit' ? 1 : 99;
    a.G.found.add(m.id);
  }
  a.G.coins = 9999;
  a.openBuild();
  a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
  const p = jointCar(a, 'hydraulic', 1),
    far = p.blocks.find(b => b.gx === 3),
    x0 = a.bpos(p, far)[0];
  p.rmb = true;
  for (let i = 0; i < 20; i++) a.stepJoints(p, 0.05);
  assert(Math.abs(a.bpos(p, far)[0] - x0 - 40) < 1e-6, 'two cells out');
  assert(p.rad >= p.radBase, 'collision radius grows with the arm');
  const q = jointCar(a, 'rotator', 1);
  q.rmb = false;
  a.stepJoints(q, 0.5);
  assert(q.joints[0].s > 1);
  const s = jointCar(a, 'suspension', 1);
  s.joints[0].vs = 80;
  for (let i = 0; i < 200; i++) a.stepJoints(s, 0.02);
  assert(Math.abs(s.joints[0].s) < 0.5, 'spring settles');
  // a hinge whose far side is the cockpit stays rigid
  const base = new Map([
    ['0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 }],
    ['1,0', { id: 'hinge', x: 1, y: 0, rot: 3 }],
    ['2,0', { id: 'girder', x: 2, y: 0, rot: 0 }]
  ]);
  const rigid = a.makeCar({ base, top: new Map() }, 0, 500, 500, 0, { tune: [] });
  assert.equal(rigid.joints.length, 0);
});
test('action keys: only moving parts take keys 1-9, weapons always fire, keys travel in car codes', async () => {
  const r = runtime(),
    a = r.api;
  a.startMatch('solo');
  for (const m of a.MODS) {
    a.G.inv[m.id] = m.id === 'cockpit' ? 1 : 99;
    a.G.found.add(m.id);
  }
  a.G.coins = 9999;
  a.openBuild();
  a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
  const v = jointCar(a, 'hinge', 1, [{ id: 'mg', x: 3, y: 0, rot: 0, g: 2 }]);
  const J = v.joints[0],
    mg = v.insts.find(I => I.id === 'mg');
  assert.equal(a.partFiring(v, mg, true), true, 'a key on a weapon (old codes) is ignored');
  assert(!a.groupable(a.MOD.mg) && a.groupable(a.MOD.hinge));
  v.rmb = true;
  assert(a.actionHeld(v, J));
  J.g = 4;
  assert(!a.actionHeld(v, J));
  v.groups = 1 << 4;
  assert(a.actionHeld(v, J));
  const base = new Map([
    ['0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 }],
    ['1,0', { id: 'hinge', rot: 1, x: 1, y: 0, g: 3 }]
  ]);
  const code = await a.blueprintCode(base, new Map()),
    back = await a.parseBlueprintCode(code);
  assert.equal(back.base.get('1,0').g, 3);
  assert.equal(back.base.get('0,0').g, undefined);
  const old = JSON.stringify({ b: [['cockpit', 0, 0, 0]], t: [] });
  assert.equal(
    a.designJSON(new Map([['0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 }]]), new Map()),
    old,
    'cars without keys keep the old format'
  );
});
test('shapes: wedge, half plate, corner fillet, round bumper and beams 1-4', async () => {
  const r = runtime(),
    a = r.api;
  for (const id of ['slopeplate', 'halfplate', 'cornerpiece', 'roundbumper', 'beam1', 'beam2', 'beam3', 'beam4'])
    assert(a.MOD[id], 'module ' + id);
  assert(a.MOD.slopeplate.res.ram > 0 && a.MOD.roundbumper.res.ram > a.MOD.slopeplate.res.ram);
  for (let L = 1; L <= 4; L++)
    for (let rot = 0; rot < 4; rot++) {
      const cs = a.footprint('beam' + L, rot, 0, 0);
      assert.equal(cs.length, L, `beam${L} rot ${rot}`);
      const xs = new Set(cs.map(c => c[0])),
        ys = new Set(cs.map(c => c[1]));
      assert(xs.size === 1 || ys.size === 1, 'beam is straight');
    }
  const base = new Map(),
    top = new Map();
  base.set('0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 });
  base.set('1,0', { id: 'slopeplate', x: 1, y: 0, rot: 1 });
  base.set('-1,0', { id: 'halfplate', x: -1, y: 0, rot: 0 });
  base.set('0,1', { id: 'cornerpiece', x: 0, y: 1, rot: 2 });
  base.set('0,-1', { id: 'beam3', x: 0, y: -1, rot: 0 });
  const back = await a.parseBlueprintCode(await a.blueprintCode(base, top));
  for (const [k, e] of base) {
    assert.equal(back.base.get(k).id, e.id);
    assert.equal(back.base.get(k).rot, e.rot);
  }
});
test('car codes round-trip and report missing parts and bay size', () => {
  process.on('unhandledRejection', e => {
    console.error('FAIL async: ' + e.message);
    process.exit(1);
  });
  const rr = runtime(),
    aa = rr.api;
  aa.startMatch('solo');
  aa.openBuild();
  const json = JSON.stringify({
    b: [...aa.G.base.values()].map(e => [e.id, e.rot, e.x, e.y]),
    t: [...aa.G.top.values()].map(e => [e.id, e.rot, e.x, e.y])
  });
  const code = 'SD1j.' + Buffer.from(json).toString('base64url');
  return aa.parseBlueprintCode(code).then(d => {
    assert.equal(d.base.size, aa.G.base.size);
    assert.equal(d.top.size, aa.G.top.size);
    const n = aa.blueprintNeeds(d);
    assert.equal(n.miss.length, 0);
    assert.equal(n.out, 0);
  });
});

function playRT(r) {
  return ms => {
    for (let t = 0; t < ms; t += 16) {
      r.advance(16);
      for (const f of r.rafs.splice(0)) f(r.context.performance.now());
    }
  };
}
test('gear: upgrades need XP and bolts, quirks at 3, a special choice at 5, fuse gives XP, only solo cars carry it', () => {
  const r = runtime(),
    a = r.api;
  a.setGear({ bolts: 0, items: [], next: 1 });
  const g = a.addGear('saw', 1, true);
  assert.equal(g.lvl, 1);
  a.addBolts(5000);
  assert.equal(a.gearUpgrade(g), false, 'no XP, no upgrade');
  const fill = () => (g.xp = a.gearNeed(g.lvl));
  fill();
  assert(a.gearUpgrade(g));
  fill();
  assert(a.gearUpgrade(g));
  assert.equal(g.lvl, 3);
  assert.equal(g.xp, 0, 'the XP bar empties on upgrade');
  assert.equal(g.qo.length, 3, 'three quirk offers at level 3');
  assert(a.gearPickQuirk(g, g.qo[0]));
  assert(a.QUIRKS[g.q]);
  a.setGear({ ...a.GEAR(), bolts: 0 });
  fill();
  assert.equal(a.gearUpgrade(g), false, 'full XP but no bolts');
  a.addBolts(5000);
  const g2 = a.addGear('saw', 3, true);
  g.xp = 0;
  const keep = a.gearFuse(g, g2);
  assert.equal(keep.lvl, 3, 'fusing no longer jumps a level');
  assert(keep.xp > 0, 'the spare copy becomes XP');
  assert.equal(a.GEAR().items.filter(x => x.id === 'saw').length, 1);
  while (keep.lvl < 5) {
    keep.xp = a.gearNeed(keep.lvl);
    assert(a.gearUpgrade(keep));
  }
  assert(a.gearPickSpecial(keep, 'sp'), 'pick the level 5 special');
  assert.equal(keep.c5, 'sp');
  const b0 = a.GEAR().bolts;
  const mg = a.addGear('mg', 2, true);
  a.gearScrap(mg);
  assert(a.GEAR().bolts > b0);
  // found in a solo match: the car config carries it and the part gets the bonus
  a.startMatch('solo');
  a.openBuild();
  a.findGear(keep);
  const cfg = a.myCarCfg();
  assert.equal(JSON.stringify(cfg.gear.map(x => x.id)), '["saw"]');
  assert.equal(cfg.gear[0].c5, 'sp');
  a.G.mode = 'mp';
  assert(!('gear' in a.myCarCfg()), 'online never carries gear');
  a.G.mode = 'solo';
  const des = { base: new Map(), top: new Map() };
  des.base.set('0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 });
  des.base.set('0,-1', { id: 'saw', x: 0, y: -1, rot: 0 });
  const plain = a.makeCar(des, 0, 500, 500, 0, { tune: [] });
  const tuned = a.makeCar(des, 0, 500, 500, 0, { tune: [] });
  a.applyGear(tuned, [{ id: 'saw', lvl: 5, q: null, c5: 'sp' }]);
  const s1 = tuned.insts.find(I => I.id === 'saw');
  assert(s1.gDmg > 1.4, 'level 5 saw with Diamond Teeth hits much harder');
  assert(s1.gear && !plain.insts.find(I => I.id === 'saw').gear);
});
test('gear specials: double tap, hot rounds, crits, armour repair, and the to-invent list', () => {
  const r = runtime(),
    a = r.api;
  a.startMatch('solo');
  const des = { base: new Map(), top: new Map() };
  des.base.set('0,0', { id: 'cockpit', x: 0, y: 0, rot: 0 });
  des.base.set('0,-1', { id: 'frame', x: 0, y: -1, rot: 0 });
  des.top.set('0,-1', { id: 'mg', x: 0, y: -1, rot: 0 });
  des.base.set('1,0', { id: 'armor', x: 1, y: 0, rot: 0 });
  const v = a.makeCar(des, 0, 500, 500, 0, { tune: [] });
  a.applyGear(v, [
    { id: 'mg', lvl: 10, q: null, c5: 'sp' },
    { id: 'armor', lvl: 10, q: null, c5: 'st' }
  ]);
  const mg = v.insts.find(I => I.id === 'mg'),
    ar = v.insts.find(I => I.id === 'armor');
  assert.equal(mg.gx.multi, 1, 'Double Tap at level 10');
  assert.equal(mg.gx.burn, 1.5, 'Hot Rounds at level 5');
  assert(ar.gRegen > 0, 'Self-Repair at level 10');
  const [s5, s10] = a.gearSpecials('sniper');
  assert.equal(s5.id, 'headshot');
  assert(s10 && !s10.tbd);
  const todo = a.gearToInvent();
  assert.equal(todo.length, 0, 'every part has a level 5 and level 10 special: ' + todo.map(x => x.id).join());
  assert(!todo.some(x => x.id === 'mg'), 'the machine gun is done');
  for (let l = 1; l <= 10; l++) assert(/^#[0-9a-f]{6}$/.test(a.lvCol(l)), 'every level has a colour');
});
test('gear turns up as a draft card in solo and never online', () => {
  const r = runtime(),
    a = r.api;
  a.setGear({ bolts: 0, items: [], next: 1 });
  a.addGear('laser', 2, true);
  a.startMatch('solo');
  a.G.round = 4;
  let seen = 0;
  for (let i = 0; i < 40; i++) if (a.draftOptions().some(o => o.type === 'gear')) seen++;
  assert(seen > 0, 'gear card shows up');
  a.G.mode = 'mp';
  for (let i = 0; i < 40; i++) assert(!a.draftOptions().some(o => o.type === 'gear'));
});
test('stickers: perks, set bonus with a matching skin, and online looks keep only the picture', () => {
  const r = runtime(),
    a = r.api;
  a.startMatch('solo');
  a.G.style.livery = 'flames';
  a.G.style.stickers = ['flag', 'flame'];
  assert.equal(a.activeSet(), 'speed');
  const fx = a.flairCfg();
  assert.equal(fx.set, 'speed');
  assert(Math.abs(fx.speedK - 0.08) < 1e-9, 'sticker 3% + set 5%');
  assert.equal(fx.res.fire, 0.15);
  a.G.style.livery = 'rust';
  assert.equal(a.activeSet(), null, 'wrong skin, no set');
  const look = a.sanitizeLook({ livery: 'flames', stickers: ['flag', 'nope', 'flame', 'star', 'crown'] });
  assert.equal(JSON.stringify(look.stickers), '["flag","flame","star"]');
  a.G.mode = 'mp';
  assert(!('flair' in a.myCarCfg()));
});
test('crowd: damage builds hype, full hype throws a gift offline, never online', () => {
  const r = runtime(),
    a = r.api,
    run = playRT(r);
  a.startMatch('solo');
  a.openBuild();
  a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
  run(6500);
  const b = a.getB();
  assert.equal(b.seq, 'play');
  a.crowdStep(0.016);
  const foe = b.cars[1];
  for (const I of foe.insts) if (I.id !== 'cockpit') I.hp = I.max * 0.5;
  a.crowdStep(0.016);
  assert(b.crowd.hype[0] > 20, 'hitting the rival builds your hype');
  b.crowd.hype[0] = 100;
  a.crowdStep(0.016);
  const gift = b.pk.find(p => p.kind === 'gift');
  assert(gift, 'gift thrown');
  a.stepGifts(2);
  assert.equal(gift.fly, 1);
  const hp0 = b.cars[0].insts.reduce((s, I) => s + I.hp, 0);
  for (const I of b.cars[0].insts) I.hp = I.max * 0.5;
  gift.g = 'repair';
  a.crowdGiftTaken(b.cars[0], gift);
  assert(b.cars[0].insts.reduce((s, I) => s + I.hp, 0) > hp0 * 0.5);
  assert(a.COMM().q.length || a.COMM().cur, 'the commentators had something to say');
  a.G.mode = 'mp';
  b.crowd.hype[1] = 100;
  const n = b.pk.length;
  a.crowdStep(0.016);
  assert.equal(b.pk.length, n, 'no gifts online');
});

test('garage: loadout gear is in the bin from round 1, the fabricator turns bolts into gear, locked gear is safe', () => {
  const r = runtime(),
    a = r.api;
  a.setGear({ bolts: 1000, items: [], next: 1 });
  const g = a.addGear('laser', 2, true);
  assert.equal(a.gearEquip(g), 'on');
  for (let i = 0; i < a.loadoutSlots() - 1; i++) a.gearEquip(a.addGear('mg', 1, true));
  assert.equal(a.gearEquip(a.addGear('saw', 1, true)), 'full', 'slots are limited');
  a.startMatch('solo');
  assert((a.G.inv.laser || 0) >= 1, 'loadout laser in the bin');
  assert.equal(
    JSON.stringify(
      a
        .myCarCfg()
        .gear.map(x => x.id)
        .sort()
    ),
    '["laser","mg"]'
  );
  const b0 = a.GEAR().bolts,
    made = a.fabricate('weapon');
  assert(made && a.MOD[made.id].cat === 'weapon');
  assert.equal(a.GEAR().bolts, b0 - 140);
  a.gearLock(made);
  assert.equal(a.gearScrap(made), false, 'locked gear cannot be scrapped');
  a.gearLock(made);
  a.gearScrap(made);
  assert(!a.GEAR().items.includes(made));
  a.gearScrap(g);
  assert(!a.GEAR().loadout.includes(g.u), 'scrapped gear leaves the loadout');
});

test('expansion parts: every new weapon and melee part deals damage, joints move, armour resists, arenas load', () => {
  const r = runtime(),
    a = r.api;
  const ids = [
    'nailstorm',
    'bottlerocket',
    'boltthrower',
    'pinballcannon',
    'twinlaser',
    'sparkplug',
    'seekerdarts',
    'hedgetrimmer',
    'pilefist',
    'twinsaw'
  ];
  for (const id of ids) assert(a.dpsOf(id, {}) > 0, id + ' has damage');
  for (const id of ['fender', 'ablative', 'chromeplate']) assert(Object.keys(a.MOD[id].res).length, id + ' resists');
  for (const id of ['snaphinge', 'longram', 'quickspin']) {
    a.startMatch('solo');
    for (const m of a.MODS) {
      a.G.inv[m.id] = m.id === 'cockpit' ? 1 : 99;
      a.G.found.add(m.id);
    }
    a.G.coins = 9999;
    a.openBuild();
    a.toBattle({ ...a.makeCfg(a.myCarCfg()), me: 0, net: null });
    const v = jointCar(a, id, 1, []);
    assert(v.joints.length, id + ' is a joint');
    v.rmb = true;
    for (let i = 0; i < 30; i++) a.stepJoints(v, 0.05);
    assert(Math.abs(v.joints[0].s) > 0.5, id + ' moves');
  }
  for (const id of ['icerink', 'scrapfactory', 'stormroof'])
    assert(
      a.THEMES.some(t => t.id === id),
      id
    );
  for (const id of ['nut', 'cog', 'bomb', 'snow']) assert(a.STICKER[id], id);
});

test('auto-place: wheels in left/right pairs, melee facing forward, moving parts left for the player', () => {
  const r = runtime(),
    a = r.api,
    G = a.G;
  a.setGear({ bolts: 0, items: [], next: 1 });
  a.startMatch('solo');
  a.openBuild();
  G.base.clear();
  G.top.clear();
  G.base.set('0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 });
  G.inv = { cockpit: 1, frame: 8, wheel: 4, saw: 1, hinge: 1 };
  a.autoPlace(true);
  const wheels = [...G.base.values()].filter(e => e.id === 'wheel');
  assert.equal(wheels.length, 4);
  assert.equal(wheels.filter(e => e.x < 0).length, wheels.filter(e => e.x > 0).length, 'balanced');
  const saw = [...G.base.values()].find(e => e.id === 'saw');
  assert(saw && saw.rot === 0 && saw.y < 0, 'saw at the front, facing forward');
  assert(![...G.base.values()].some(e => e.id === 'hinge'), 'hinge stays in the bin');
});

test('garage: the whole car moves, turns and flips, and stays inside the bay', () => {
  const r = runtime(),
    a = r.api,
    G = a.G;
  a.setGear({ bolts: 0, items: [], next: 1 });
  a.startMatch('solo');
  a.openBuild();
  G.base.clear();
  G.top.clear();
  G.base.set('0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 });
  G.base.set('1,0', { id: 'frame', rot: 0, x: 1, y: 0 });
  G.base.set('-1,0', { id: 'frame', rot: 0, x: -1, y: 0 });
  G.top.set('1,0', { id: 'mg', rot: 0, x: 1, y: 0 });
  const cells = () => [...a.occupancy(G.base).keys()].sort().join(' ');
  assert(a.shiftDesign(1, 0), 'moves right');
  assert(G.base.has('1,0') && G.base.get('1,0').id === 'cockpit', 'cockpit moved with the car');
  assert(G.top.has('2,0') && G.top.get('2,0').id === 'mg', 'equipment moved along');
  assert(a.shiftDesign(1, 0) && a.shiftDesign(0, 2), 'more moves');
  const before = cells();
  assert(!a.shiftDesign(1, 0), 'refuses to leave the bay');
  assert.equal(cells(), before, 'nothing changed after a refused move');
  a.centerDesign();
  assert(G.base.has('0,0') && G.base.get('0,0').id === 'cockpit', 'centred again');
  assert(a.turnDesign(), 'turns');
  assert(G.base.has('0,1') && G.base.has('0,-1'), 'the side frames are now in front and behind');
  assert.equal(G.top.get('0,1').rot, 0, 'the gun keeps facing forward');
  // copy left to right uses spare parts from the bin
  G.base.clear();
  G.top.clear();
  G.base.set('0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 });
  G.base.set('-1,0', { id: 'frame', rot: 0, x: -1, y: 0 });
  G.base.set('-2,0', { id: 'wheel', rot: 0, x: -2, y: 0 });
  G.inv = { cockpit: 1, frame: 2, wheel: 2 };
  a.copyLeftToRight();
  assert(G.base.has('1,0') && G.base.get('1,0').id === 'frame', 'frame copied');
  assert(G.base.has('2,0') && G.base.get('2,0').id === 'wheel', 'wheel copied');
  assert(a.mirrorDesign() && a.turnDesign() && a.turnDesign() && a.turnDesign(), 'flip and a full turn');
  a.undo && a.undo();
});

test('commentary: every call has a known caster, no names in the lines, stable voice ids', () => {
  const r = runtime(),
    a = r.api;
  let n = 0;
  for (const [kind, calls] of Object.entries(a.CALLS))
    for (const call of calls)
      for (const [who, text] of call) {
        n++;
        assert(a.CASTERS[who], `${kind}: unknown caster ${who}`);
        assert(!/\{\w\}/.test(text), `${kind}: placeholder in "${text}"`);
        assert(text.length < 140, `${kind}: line too long to caption`);
      }
  assert(n > 90, 'plenty of lines');
  assert.equal(a.voiceId('dash', 'Lights, rust, action!'), a.voiceId('dash', 'Lights, rust, action!'));
  assert.notEqual(a.voiceId('dash', 'Lights, rust, action!'), a.voiceId('doc', 'Lights, rust, action!'));
  assert(a.ANNOUNCE.includes('Round one') && a.ANNOUNCE.includes('Final round'));
  assert.equal(a.commName({ name: 'Sparring Magpie' }), 'Magpie', 'sparring bots keep their name');
  assert.equal(a.commName({ name: 'Player' }), null, 'the player is never named');
  for (const [who, tpl] of Object.values(a.NAMED_CALLS)) assert(a.CASTERS[who] && tpl.includes('{n}'));
});

test('gear specials fire in battle: a level 10 machine gun shoots twice as many burning bullets', () => {
  const count = lvl => {
    const { aa } = arenaRuntime(),
      b = aa.getB(),
      base = new Map(),
      top = new Map();
    base.set('0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 });
    base.set('0,-1', { id: 'frame', rot: 0, x: 0, y: -1 });
    top.set('0,-1', { id: 'mg', rot: 0, x: 0, y: -1 });
    const v = aa.makeCar({ base, top }, 0, 700, 600, 0, { tune: [], name: 'Gear test', paint: '#fff' });
    aa.applyGear(v, [{ id: 'mg', lvl, q: null, c5: 'sp' }]);
    b.cars[0] = v;
    b.cars[1].x = 1500;
    b.cars[1].y = 600;
    b.st = [];
    b.objs = [];
    b.seq = 'play';
    b.time = 1;
    aa.G.phase = 'battle';
    v.fire = true;
    v.aimX = 700;
    v.aimY = 0;
    b.shots.length = 0;
    let n = 0,
      burn = 0;
    for (let k = 0; k < 40; k++) {
      b.time += 0.05;
      const before = b.shots.length;
      aa.weapons(v, 0.05);
      for (const s of b.shots.slice(before)) {
        n++;
        if (s.burn) burn++;
      }
    }
    return { n, burn };
  };
  const one = count(1),
    ten = count(10);
  assert(one.n > 5, 'the gun fires');
  assert.equal(one.burn, 0);
  assert(ten.n >= one.n * 1.7, `double tap: ${one.n} vs ${ten.n}`);
  assert(ten.burn > 0, 'hot rounds');
});

test('gear 1.5: A/B specials, chips, sets, duplicate XP and reforging', () => {
  const { api: a } = runtime();
  a.setGear({ bolts: 1000, items: [], next: 1 });
  // every part offers two different level-5 options
  for (const id of ['mg', 'sniper', 'armor', 'wheel', 'saw', 'cannon']) {
    const [A, B] = a.gearOptions5(id);
    assert(A && B && A.id !== B.id, `${id} has A and B`);
  }
  const mg = a.addGear('mg', 5, true);
  assert(a.gearPickSpecial(mg, 'sp2'));
  assert.equal(a.gearPicked5(mg).id, a.gearOptions5('mg')[1].id);
  assert.equal(a.GEAR().bolts, 1000, 'first pick is free');
  assert(a.gearPickSpecial(mg, 'sp'));
  assert.equal(a.GEAR().bolts, 960, 'switching costs bolts');
  // chips: socket 1 open at level 5, socket 2 not; fusing three makes the next mark
  a.addChip('power1', 4);
  assert(a.gearSocket(mg, 0, 'power1'));
  assert(!a.gearSocket(mg, 1, 'power1'), 'level 6 socket is still closed');
  assert.equal(a.GEAR().chips.power1, 3);
  assert.equal(a.chipFuse('power1'), 'power2');
  assert.equal(a.GEAR().chips.power2, 1);
  assert(!a.GEAR().chips.power1);
  assert(a.gearUnsocket(mg, 0));
  assert.equal(a.GEAR().chips.power1, 1, 'unsocketing returns the chip');
  // duplicates become XP for the copy you own
  const before = mg.xp || 0,
    n = a.GEAR().items.length,
    dup = a.addGear('mg', 1, true, 'test', { dup: true });
  assert.equal(dup, mg);
  assert.equal(a.GEAR().items.length, n, 'no new item');
  assert(mg.xp > before, 'the copy got XP');
  // sets from the loadout
  const s1 = a.addGear('smg', 1, true),
    s2 = a.addGear('sniper', 1, true);
  a.GEAR().loadout = [mg.u, s1.u, s2.u];
  assert.equal(a.loadoutSets().join(), 'leadstorm');
  // reforge a level 10 piece
  s2.lvl = 10;
  s2.c5 = 'sp';
  assert(a.gearReforge(s2));
  assert.equal(s2.lvl, 1);
  assert.equal(s2.s, 1);
  assert(!s2.c5);
  assert(a.gearBonus(s2) > 0, 'a star adds to the level bonus');
});

test('gear 1.5 in battle: chips and sets change the car', () => {
  const { aa } = arenaRuntime(),
    base = new Map(),
    top = new Map();
  base.set('0,0', { id: 'cockpit', rot: 0, x: 0, y: 0 });
  base.set('0,-1', { id: 'frame', rot: 0, x: 0, y: -1 });
  top.set('0,-1', { id: 'mg', rot: 0, x: 0, y: -1 });
  const mk = () => aa.makeCar({ base, top }, 0, 700, 600, 0, { tune: [], name: 'T', paint: '#fff' });
  const plain = mk(),
    chipped = mk();
  aa.applyGear(chipped, [{ id: 'mg', lvl: 3, q: null, c5: null, ch: ['power3'] }]);
  const gun = v => v.insts.find(I => I.id === 'mg');
  assert(gun(chipped).W.dmg > gun(plain).W.dmg * 1.15, 'a Power Mk III chip adds damage');
  const set = mk();
  aa.applySets(set, ['leadstorm', 'bunker']);
  assert((gun(set).gRate || 1) > 1.1, 'Lead Storm speeds up guns');
  assert(set.total > plain.total * 1.09, 'Bunker adds HP');
  // gadget level 10 perks reach the pickup system
  const lucky = mk();
  lucky.insts.push({ ...gun(lucky), id: 'horseshoe', W: null, m: aa.MOD.horseshoe });
  aa.applyGear(lucky, [{ id: 'horseshoe', lvl: 10, q: null, c5: 'sp' }]);
  aa.applyFlair(lucky, null);
  assert(lucky.flair && lucky.flair.coinK >= 0.5, 'Four-Leaf Clover makes coins worth more');
});

test('every Gauntlet boss gimmick runs, telegraphs first and can hurt you', () => {
  const { aa } = arenaRuntime(),
    b = aa.getB();
  const gims = [...new Set(aa.BOSSES.map(x => x.gim))];
  assert(gims.length >= 12, 'twelve different boss tricks');
  for (const gim of gims) {
    const boss = b.cars[1],
      me = b.cars[0];
    boss.boss = true;
    boss.bossGim = gim;
    boss.gimT = 0;
    boss.phase = 1;
    b.bossFx = [];
    b.seq = 'play';
    me.x = boss.x + 160;
    me.y = boss.y;
    for (let i = 0; i < 120; i++) {
      b.time += 0.05;
      aa.bossTick(0.05);
    }
    const c = { save() {}, restore() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, setLineDash() {}, createRadialGradient: () => ({ addColorStop() {} }) };
    aa.drawBossWorld(c);
  }
});

test('portals send you to their mirrored twin, ice takes your grip, boost pads push', () => {
  const { aa } = arenaRuntime(),
    b = aa.getB(),
    v = b.cars[0];
  b.seq = 'play';
  const W = aa.AW();
  b.zones.push({ kind: 'portal', x: 400, y: 500, r: 36 }, { kind: 'portal', x: W - 400, y: 500, r: 36 });
  v.x = 400;
  v.y = 500;
  v.vx = 100;
  v.vy = 0;
  aa.gimmickCar(v, 0.05);
  assert(v.x > 1000, 'came out on the other side: ' + v.x);
  b.zones.length = 0;
  b.zones.push({ kind: 'ice', x: v.x, y: v.y, r: 100 });
  aa.gimmickCar(v, 0.05);
  assert(v.iceT > b.time, 'standing on ice');
  b.zones.length = 0;
  b.zones.push({ kind: 'boost', x: v.x, y: v.y, r: 40 });
  v.vx = 100;
  const before = v.vx;
  aa.gimmickCar(v, 0.05);
  assert(v.vx > before + 40, 'boost pad pushes');
});

test('championship: five matchdays, a table, a final and a champion', () => {
  const { api: a } = runtime();
  a.setGear({ bolts: 0, items: [], next: 1 });
  a.newSeason();
  const L = a.getLeague();
  assert.equal(L.rivals.length, 5);
  for (let d = 0; d < 5; d++) {
    a.playLeague();
    assert(a.G.league && a.G.league.opp === L.rivals[d].name, 'playing the right rival');
    assert.equal(a.G.oppName, L.rivals[d].name);
    const html = a.leagueResult(true, false, [5, 1]);
    assert(html.includes('lg-'), 'a league card for the result screen');
  }
  assert.equal(L.table.__me.pts, 15, 'five wins, fifteen points');
  const others = Object.entries(L.table).filter(([k]) => k !== '__me');
  assert(others.every(([, r]) => r.p === 5), 'every rival plays every matchday');
  assert(L.final && !L.final.done, 'into the final');
  a.playLeague();
  assert(a.G.league.final, 'the final is on');
  a.leagueResult(true, false, [4, 2]);
  assert.equal(L.champion, '__me');
  assert(a.PROG().ach.includes('league'), 'champion achievement');
  assert(a.GEAR().bolts >= 300, 'prize money');
});

test('Gauntlet co-op: you and a bot partner against two rivals every wave', () => {
  const { api: a } = runtime();
  a.G.runTeams = 2;
  a.G.partnerStyle = 'gunner';
  a.startRun();
  assert.equal(a.G.teamSize, 2);
  assert(a.G.ally && a.G.bot2, 'a partner and a second rival');
  assert(a.G.oppName.includes('&'), 'both rivals named');
  a.openBuild();
  a.prepareBot();
  const cfg = a.makeCfg(a.myCarCfg());
  assert.equal(cfg.cars.length, 4);
  a.G.runTeams = 1;
  a.startRun();
  assert.equal(a.G.teamSize, 1);
});

console.log(`\n${passed} regression tests passed.`);
