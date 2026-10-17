// Open world, part 5: your own garage. A shed next to the camp you started at: drive in, and you
// can park up to three cars and swap between them, build a car from a saved blueprint or a code,
// look through every part you have found (and scrap the ones you don't need), or open the workbench.
// A spare cockpit is always on the shelf, so you can start a new car here.

const OW_HQ_SLOTS = 3;

/** Where the garage stands: south-east of the starting camp, door facing the road to the west. */
function owHQSpot() {
  return { x: OW.home0.x + 300, y: OW.home0.y + 290, w: 260, h: 200 };
}
/** Walls for the chunk the garage stands in (and nothing else in the way). */
function owHQChunk(ch) {
  if (!OW || !OW.hq) return;
  const q = OW.hq,
    x0 = q.x - q.w / 2,
    y0 = q.y - q.h / 2,
    pad = 70;
  const cx = Math.floor(q.x / OW_CH),
    cy = Math.floor(q.y / OW_CH);
  // anything generated in or right around the shed goes
  const inside = (x, y, r = 0) =>
    x + r > x0 - pad && x - r < x0 + q.w + pad && y + r > y0 - pad && y - r < y0 + q.h + pad;
  ch.objs = ch.objs.filter(o => !inside(o.x, o.y, o.r));
  ch.pk = ch.pk.filter(p => !inside(p.x, p.y));
  ch.zones = ch.zones.filter(z => !inside((z.x || 0) + (z.w || 0) / 2, (z.y || 0) + (z.h || 0) / 2, 40));
  ch.st = ch.st.filter(s => !inside(s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) / 2));
  if (ch.cx !== cx || ch.cy !== cy) return;
  const T = 18;
  ch.st.push(
    { x: x0, y: y0, w: q.w, h: T, hq: 1 },
    { x: x0, y: y0 + q.h - T, w: q.w, h: T, hq: 1 },
    { x: x0 + q.w - T, y: y0, w: T, h: q.h, hq: 1 },
    // short door posts on the west side
    { x: x0, y: y0, w: T, h: 34, hq: 1 },
    { x: x0, y: y0 + q.h - 34, w: T, h: 34, hq: 1 }
  );
}
const owInHQ = v => {
  const q = OW && OW.hq;
  return !!(q && v && Math.abs(v.x - q.x) < q.w / 2 - 10 && Math.abs(v.y - q.y) < q.h / 2 - 10);
};

/** The shed: concrete floor, parking bays with your parked cars, a sign; the roof fades as you drive in. */
function owDrawHQ(c) {
  const q = OW && OW.hq;
  if (!q || !owInView(q.x, q.y, 300)) return;
  const x0 = q.x - q.w / 2,
    y0 = q.y - q.h / 2,
    me = myCar(),
    inside = owInHQ(me);
  OW.hqRoof = Math.max(0, Math.min(1, (OW.hqRoof ?? 1) + (inside ? -0.06 : 0.06)));
  c.save();
  // floor
  const g = c.createLinearGradient(x0, y0, x0 + q.w, y0 + q.h);
  g.addColorStop(0, '#5a5f66');
  g.addColorStop(1, '#3d4248');
  c.fillStyle = g;
  c.fillRect(x0, y0, q.w, q.h);
  c.fillStyle = 'rgba(0,0,0,.18)';
  for (const [ox, oy, r] of [
    [0.3, 0.4, 26],
    [0.7, 0.62, 18],
    [0.55, 0.25, 12]
  ]) {
    c.beginPath();
    c.ellipse(x0 + q.w * ox, y0 + q.h * oy, r * 1.4, r, 0.4, 0, 7);
    c.fill();
  }
  // parking bays along the back wall
  c.strokeStyle = 'rgba(242,183,5,.7)';
  c.lineWidth = 4;
  const bw = (q.w - 60) / OW_HQ_SLOTS;
  for (let i = 0; i <= OW_HQ_SLOTS; i++) {
    c.beginPath();
    c.moveTo(x0 + 50 + i * bw, y0 + 22);
    c.lineTo(x0 + 50 + i * bw, y0 + 92);
    c.stroke();
  }
  // parked cars
  OW.parkedImgs = OW.parkedImgs || [];
  (OW.parked || []).forEach((p, i) => {
    if (!p) return;
    let im = OW.parkedImgs[i];
    if (!im || im._k !== p.k) {
      im = new Image();
      im._k = p.k;
      try {
        im.src = designURL(unpackDesign(p.d), 160, G.paint, G.style && G.style.livery);
      } catch (e) {}
      OW.parkedImgs[i] = im;
    }
    if (im.complete && im.naturalWidth) {
      c.save();
      c.translate(x0 + 50 + (i + 0.5) * bw, y0 + 58);
      c.rotate(Math.PI);
      c.drawImage(im, -bw * 0.42, -bw * 0.42, bw * 0.84, bw * 0.84);
      c.restore();
    }
  });
  // painted name on the floor near the door
  c.fillStyle = 'rgba(242,183,5,.55)';
  c.font = '700 22px "Chakra Petch", sans-serif';
  c.textAlign = 'center';
  c.fillText('YOUR GARAGE', q.x, y0 + q.h - 34);
  // hazard stripes across the open door
  c.save();
  c.beginPath();
  c.rect(x0 - 6, y0 + 34, 12, q.h - 68);
  c.clip();
  for (let y = y0; y < y0 + q.h; y += 20) {
    c.fillStyle = '#f2b705';
    c.beginPath();
    c.moveTo(x0 - 6, y);
    c.lineTo(x0 + 6, y + 10);
    c.lineTo(x0 + 6, y + 20);
    c.lineTo(x0 - 6, y + 10);
    c.fill();
  }
  c.restore();
  c.restore();
}
/** The roof on top of everything (drawn after cars), fading out when you are inside. */
function owDrawHQRoof(c) {
  const q = OW && OW.hq;
  if (!q || !owInView(q.x, q.y, 300) || (OW.hqRoof ?? 1) <= 0.01) return;
  const x0 = q.x - q.w / 2,
    y0 = q.y - q.h / 2;
  c.save();
  c.globalAlpha = OW.hqRoof;
  c.fillStyle = 'rgba(0,0,0,.3)';
  c.fillRect(x0 + 10, y0 + 12, q.w, q.h);
  const g = c.createLinearGradient(x0, y0, x0 + q.w, y0);
  g.addColorStop(0, '#6b4a2a');
  g.addColorStop(1, '#4e3520');
  c.fillStyle = g;
  c.fillRect(x0 - 8, y0 - 8, q.w + 16, q.h + 16);
  c.strokeStyle = 'rgba(0,0,0,.25)';
  c.lineWidth = 3;
  for (let x = x0; x < x0 + q.w; x += 26) {
    c.beginPath();
    c.moveTo(x, y0 - 8);
    c.lineTo(x, y0 + q.h + 8);
    c.stroke();
  }
  // the sign
  rr(c, q.x - 92, q.y - 24, 184, 48, 6);
  c.fillStyle = '#10151f';
  c.fill();
  c.strokeStyle = '#f2b705';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = '#f2b705';
  c.font = '700 20px "Chakra Petch", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(
    `${String(G.name || 'YOUR')
      .toUpperCase()
      .slice(0, 12)}'S GARAGE`,
    q.x,
    q.y + 1
  );
  c.restore();
}

/* ---------- the garage menu ---------- */
function owHQButton() {
  let b = $('#owHQBtn');
  if (!b) {
    b = document.createElement('button');
    b.id = 'owHQBtn';
    b.className = 'btn';
    b.innerHTML = 'Your garage <span class="kbd">Enter</span>';
    b.onclick = () => owOpenHQ();
    document.body.appendChild(b);
  }
  const v = myCar(),
    open = $('#ovHQ') && !$('#ovHQ').hidden;
  b.hidden = !(v && !v.dead && G.phase === 'world' && owInHQ(v) && !open);
}
addEventListener('keydown', e => {
  if (e.key !== 'Enter' || G.phase !== 'world' || !OW) return;
  const ov = $('#ovHQ');
  if (ov && !ov.hidden) {
    e.preventDefault();
    return owCloseHQ();
  }
  const v = myCar();
  if (v && !v.dead && owInHQ(v)) {
    e.preventDefault();
    owOpenHQ();
  }
});
let owHQTab = 'cars';
function owOpenHQ(tab) {
  const v = myCar();
  if (!v || v.dead || !owInHQ(v)) return;
  if (tab) owHQTab = tab;
  let ov = $('#ovHQ');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'ovHQ';
    ov.className = 'overlay';
    ov.innerHTML = '<div class="card owhq" id="owHQCard"></div>';
    document.body.appendChild(ov);
  }
  ov.hidden = false;
  clearArenaInput();
  sfx('door');
  owRenderHQ();
}
function owCloseHQ() {
  const ov = $('#ovHQ');
  if (ov) ov.hidden = true;
  sfx('ui');
}
/** Every part this car is made of. */
const designParts = d => {
  const n = {};
  for (const e of [...d.base.values(), ...d.top.values()]) if (e.id !== 'cockpit') n[e.id] = (n[e.id] || 0) + 1;
  return n;
};
/** Swap in another car: the old car's parts and the new car's parts are accounted for by the caller. */
function owUseDesign(d, msg) {
  OW.design = d;
  const v = myCar();
  if (B.net === 'client') Net.send({ t: 'owdesign', d: packDesign(d) });
  else if (v) {
    const n = owRebuild(v, d);
    OW.lastCoins = n.coins;
  }
  if (!B.net) owSave();
  cineTitle('New ride', msg || '', '#5be7ff', 'info');
}
function owRenderHQ() {
  const card = $('#owHQCard');
  if (!card) return;
  const tabs = [
    ['cars', 'Cars'],
    ['bps', 'Blueprints'],
    ['parts', 'Parts']
  ];
  const nParts = Object.values(OW.inv).reduce((a, b) => a + b, 0);
  let body = '';
  if (owHQTab === 'cars') {
    const cur = `<div class="hqcar cur"><img alt="" src="${designURL(OW.design, 150, G.paint, G.style && G.style.livery)}"><b>Driving now</b><span>${esc(OW.label || 'Your car')}</span></div>`;
    const slots = Array.from({ length: OW_HQ_SLOTS }, (_, i) => {
      const p = OW.parked[i];
      if (!p)
        return `<div class="hqcar empty"><span class="hqbay">Bay ${i + 1}</span><b>Empty</b><span>Park your car here and start a new one with the spare cockpit.</span><button class="btn ghost sm" data-park="${i}">Park and start new</button></div>`;
      let img = '';
      try {
        img = designURL(unpackDesign(p.d), 150, G.paint, G.style && G.style.livery);
      } catch (e) {}
      return `<div class="hqcar"><span class="hqbay">Bay ${i + 1}</span><img alt="" src="${img}"><b>${esc(p.name)}</b><button class="btn sm" data-take="${i}">Drive this one</button></div>`;
    }).join('');
    body = `<div class="hqcars">${cur}${slots}</div><p class="small">Swapping keeps every part where it is: the car you leave stays parked here with all its parts.</p>`;
  } else if (owHQTab === 'bps') {
    body = `<div class="hqbps">${[0, 1, 2, 3, 4, 5]
      .map(i => {
        const bp = bpRead(i);
        if (!bp)
          return `<div class="hqbp empty"><b>Slot ${i + 1}</b><span>Empty</span><button class="btn ghost sm" data-bpsave="${i}">Save this car here</button></div>`;
        const need = owBPNeeds(bp.d);
        return `<div class="hqbp"><img alt="" src="${designURL(bp.d, 110, G.paint)}"><b>${esc(bp.name)}</b><span class="${need.length ? 'miss' : 'ok'}">${
          need.length
            ? 'Missing: ' +
              need
                .slice(0, 2)
                .map(([id, k]) => `${k}× ${esc(MOD[id].name)}`)
                .join(', ') +
              (need.length > 2 ? '…' : '')
            : 'You have every part'
        }</span>
          <div class="row"><button class="btn sm" data-bpbuild="${i}" ${need.length ? 'disabled' : ''}>Build</button><button class="btn ghost sm" data-bpcode="${i}">Copy code</button><button class="btn ghost sm" data-bpsave="${i}">Save over</button></div></div>`;
      })
      .join('')}</div>
      <div class="hqpaste"><textarea id="hqCode" rows="2" placeholder="Paste a car code (SD1.…) to build it here"></textarea><div id="hqCodeOut"></div></div>`;
  } else {
    const list = Object.entries(OW.inv)
      .filter(([, n]) => n > 0)
      .sort((a, b) => MOD[b[0]].rar - MOD[a[0]].rar || MOD[a[0]].name.localeCompare(MOD[b[0]].name));
    body = list.length
      ? `<div class="hqparts">${list
          .map(
            ([id, n]) =>
              `<div class="hqpart" style="--rc:${RAR[MOD[id].rar].col}"><img alt="" src="${iconURL(id, 64)}"><b>${esc(MOD[id].name)}</b><span>×${n} · ${RAR[MOD[id].rar].name}</span><button class="btn ghost sm" data-scrap="${id}">Scrap · +${owScrapValue(id)}</button></div>`
          )
          .join('')}</div>`
      : '<p class="small">No loose parts yet. Break crates and safes in buildings, or salvage wrecks.</p>';
  }
  card.innerHTML = `<span class="label">${esc(G.name)}'s garage · scrap ${OW.scrap} · ${nParts} loose part${nParts === 1 ? '' : 's'}</span><h2>Your garage</h2>
    <div class="seg hqtabs">${tabs.map(([k, n]) => `<button data-tab="${k}" aria-pressed="${k === owHQTab}">${n}</button>`).join('')}</div>
    <div class="hqbody">${body}</div>
    <div class="owrow"><button class="btn" id="hqBench">Workbench</button><button class="btn ghost" id="hqShow">Showroom</button><button class="btn ghost" id="hqClose">Back on the road <span class="kbd">Enter</span></button></div>`;
  $$('#owHQCard [data-tab]').forEach(b => (b.onclick = () => ((owHQTab = b.dataset.tab), sfx('ui'), owRenderHQ())));
  $('#hqClose').onclick = owCloseHQ;
  $('#hqBench').onclick = () => {
    owCloseHQ();
    owOpenGarage(true);
  };
  $('#hqShow').onclick = () => openShowroom(OW.design, `${G.name}'s ${OW.label || 'car'}`);
  $$('#owHQCard [data-take]').forEach(b => (b.onclick = () => owTakeParked(+b.dataset.take)));
  $$('#owHQCard [data-park]').forEach(b => (b.onclick = () => owParkAndNew(+b.dataset.park)));
  $$('#owHQCard [data-bpsave]').forEach(
    b =>
      (b.onclick = () => {
        bpWrite(+b.dataset.bpsave, OW.design, `${OW.label || 'World car'} ${+b.dataset.bpsave + 1}`);
        toast(`Saved to blueprint slot ${+b.dataset.bpsave + 1}`, true);
        owRenderHQ();
      })
  );
  $$('#owHQCard [data-bpbuild]').forEach(
    b => (b.onclick = () => owBuildBP(bpRead(+b.dataset.bpbuild).d, bpRead(+b.dataset.bpbuild).name))
  );
  $$('#owHQCard [data-bpcode]').forEach(b => (b.onclick = () => bpCopyCode(+b.dataset.bpcode, b)));
  $$('#owHQCard [data-scrap]').forEach(b => (b.onclick = () => owScrapPart(b.dataset.scrap)));
  const ta = $('#hqCode');
  if (ta) {
    let timer;
    ta.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const out = $('#hqCodeOut');
        if (!ta.value.trim()) return (out.innerHTML = '');
        let d;
        try {
          d = await parseBlueprintCode(ta.value);
        } catch (e) {
          out.innerHTML = `<p class="ac-msg">${esc(e.message)}</p>`;
          return;
        }
        const need = owBPNeeds(d);
        out.innerHTML = `<img class="bp-prev" alt="" src="${designURL(d, 140, G.paint)}"><p class="small">${need.length ? 'Missing: ' + need.map(([id, k]) => `${k}× ${esc(MOD[id].name)}`).join(', ') : 'You have every part.'}</p>${need.length ? '' : '<button class="btn" id="hqCodeBuild">Build this car</button>'}`;
        const bb = $('#hqCodeBuild');
        if (bb) bb.onclick = () => owBuildBP(d, 'Car from a code');
      }, 200);
    };
  }
}
/** Parts missing to build a design here: what is loose plus what the current car is made of. */
function owBPNeeds(d) {
  const have = { ...OW.inv },
    cur = designParts(OW.design);
  for (const [id, n] of Object.entries(cur)) have[id] = (have[id] || 0) + n;
  return Object.entries(designParts(d))
    .map(([id, n]) => [id, n - (have[id] || 0)])
    .filter(([, n]) => n > 0);
}
function owBuildBP(d, name) {
  if (owBPNeeds(d).length) return toast('You are missing parts for that car');
  // the current car comes apart into My parts, the new one is taken out of it
  const inv = { ...OW.inv };
  for (const [id, n] of Object.entries(designParts(OW.design))) inv[id] = (inv[id] || 0) + n;
  for (const [id, n] of Object.entries(designParts(d))) inv[id] -= n;
  for (const k of Object.keys(inv)) if (inv[k] <= 0) delete inv[k];
  OW.inv = inv;
  OW.label = name;
  owUseDesign({ base: new Map(d.base), top: new Map(d.top) }, name);
  owCloseHQ();
}
function owTakeParked(i) {
  const p = OW.parked[i];
  if (!p) return;
  OW.parked[i] = { name: OW.label || 'Your car', d: packDesign(OW.design), k: Date.now() };
  OW.label = p.name;
  owUseDesign(unpackDesign(p.d), p.name);
  sfx('legend');
  owRenderHQ();
}
function owParkAndNew(i) {
  if (OW.parked[i]) return;
  OW.parked[i] = { name: OW.label || 'Your car', d: packDesign(OW.design), k: Date.now() };
  OW.label = 'New build';
  // only the spare cockpit: build the rest on the workbench
  OW.design = { base: new Map([[key(0, 0), { id: 'cockpit', rot: 0, x: 0, y: 0 }]]), top: new Map() };
  owCloseHQ();
  owOpenGarage(true);
  toast('Your old car is parked. Build a new one around the spare cockpit.', true);
}
const owScrapValue = id => Math.max(5, Math.round((MOD[id].price || 20) / 3));
function owScrapPart(id) {
  if (!OW.inv[id]) return;
  OW.inv[id]--;
  if (!OW.inv[id]) delete OW.inv[id];
  OW.scrap += owScrapValue(id);
  sfx('coin');
  if (!B.net) owSave();
  owRenderHQ();
}

/* ---------- the blueprint library (shared with the normal garage) ---------- */
const BP_SLOTS = 6;
function bpRead(i) {
  try {
    const raw = load('sd.bp' + i);
    if (!raw) return null;
    const p = JSON.parse(raw),
      d = { base: new Map(p.base.filter(([, e]) => MOD[e.id])), top: new Map(p.top.filter(([, e]) => MOD[e.id])) };
    if (![...d.base.values()].some(e => e.id === 'cockpit')) return null;
    return { d, name: p.name || `Blueprint ${i + 1}` };
  } catch (e) {
    return null;
  }
}
function bpWrite(i, d, name) {
  store('sd.bp' + i, { base: [...d.base], top: [...d.top], name: String(name || `Blueprint ${i + 1}`).slice(0, 24) });
}
async function bpCopyCode(i, btn) {
  const bp = bpRead(i);
  if (!bp) return;
  const code = await blueprintCode(bp.d.base, bp.d.top);
  try {
    await navigator.clipboard.writeText(code);
    if (btn) btn.textContent = 'Copied';
    toast('Code copied. A friend can paste it under Blueprints.', true);
  } catch (e) {
    toast(code);
  }
  sfx('ui');
}
