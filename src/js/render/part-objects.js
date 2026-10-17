// Shaped parts (the 50 branch parts, the odd parts and the weather gear) drawn as the things they are instead
// of square tiles: a flamethrower is a fuel tank and a nozzle, a wheel is a tyre, a gadget is a little machine.
// Parts that take more than one cell are one connected piece that follows their shape.

/** One outline for all of a part's cells, rounded only on the outside corners, pulled in by `inset`. */
function partOutline(c, cells, s, inset, ox = 0, oy = 0, round = 0.2) {
  const at = new Set(cells.map(([x, y]) => x + ',' + y)),
    has = (x, y) => at.has(x + ',' + y),
    h = s / 2,
    r = Math.min(s * round, h - inset);
  c.beginPath();
  for (const [qx, qy] of cells) {
    const up = has(qx, qy - 1),
      dn = has(qx, qy + 1),
      lf = has(qx - 1, qy),
      rt = has(qx + 1, qy),
      x0 = qx * s - h + (lf ? -0.6 : inset) + ox,
      y0 = qy * s - h + (up ? -0.6 : inset) + oy,
      x1 = qx * s + h - (rt ? -0.6 : inset) + ox,
      y1 = qy * s + h - (dn ? -0.6 : inset) + oy,
      rTL = !up && !lf ? r : 0,
      rTR = !up && !rt ? r : 0,
      rBR = !dn && !rt ? r : 0,
      rBL = !dn && !lf ? r : 0;
    c.moveTo(x0 + rTL, y0);
    c.lineTo(x1 - rTR, y0);
    if (rTR) c.arcTo(x1, y0, x1, y0 + rTR, rTR);
    c.lineTo(x1, y1 - rBR);
    if (rBR) c.arcTo(x1, y1, x1 - rBR, y1, rBR);
    c.lineTo(x0 + rBL, y1);
    if (rBL) c.arcTo(x0, y1, x0, y1 - rBL, rBL);
    c.lineTo(x0, y0 + rTL);
    if (rTL) c.arcTo(x0, y0, x0 + rTL, y0, rTL);
    c.closePath();
  }
}
const partKind = m =>
  m.drive
    ? 'move'
    : m.wpn
      ? 'gun'
      : m.mel || m.cat === 'melee' || m.ram
        ? 'melee'
        : m.cat === 'defense' || m.cat === 'struct'
          ? 'armor'
          : 'device';

/** A shaped part. The context is at the part's centre and already rotated (forward is up). */
function drawPartObject(c, m, s, st, t) {
  const b = shapeBounds(m),
    cells = moduleCells(m).map(([x, y]) => [x - b.cx, y - b.cy]),
    col = m.art.c,
    h = s / 2,
    kind = partKind(m),
    dark = '#262c33',
    steel = '#5b646d',
    lw = Math.max(1, s * 0.035);
  // the edge is a slightly bigger fill under the body, so cells join without seams
  const body = (inset, fill, edge, round = 0.2) => {
    if (edge) {
      partOutline(c, cells, s, inset - lw, 0, 0, round);
      c.fillStyle = edge;
      c.fill();
    }
    partOutline(c, cells, s, inset, 0, 0, round);
    c.fillStyle = fill;
    c.fill();
  };
  const grad = (a, b2) => {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const [x, y] of cells) {
      x0 = Math.min(x0, x * s - h);
      y0 = Math.min(y0, y * s - h);
      x1 = Math.max(x1, x * s + h);
      y1 = Math.max(y1, y * s + h);
    }
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, a);
    g.addColorStop(1, b2);
    return g;
  };
  // a soft shadow under everything
  c.fillStyle = 'rgba(0,0,0,.28)';
  partOutline(c, cells, s, kind === 'move' ? s * 0.16 : s * 0.12, s * 0.05, s * 0.07);
  c.fill();

  if (kind === 'armor') {
    // a shaped plate: one piece over all its cells, bevelled, riveted, in its own colour
    body(s * 0.05, grad(mix(col, 0.18), mix(col, -0.45)), mix(col, -0.7));
    if (cells.length === 1) {
      partOutline(c, cells, s, s * 0.14);
      c.strokeStyle = 'rgba(255,255,255,.18)';
      c.lineWidth = Math.max(0.8, s * 0.025);
      c.stroke();
    }
    c.fillStyle = mix(col, -0.6);
    for (const [x, y] of cells)
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
      ]) {
        c.beginPath();
        c.arc(x * s + dx * h * 0.62, y * s + dy * h * 0.62, s * 0.035, 0, 7);
        c.fill();
      }
    if (m.thorns)
      for (const [x, y] of cells)
        for (let i = -1; i <= 1; i++) {
          c.fillStyle = '#e8ecef';
          c.beginPath();
          c.moveTo(x * s + i * h * 0.5 - s * 0.06, y * s - h * 0.9);
          c.lineTo(x * s + i * h * 0.5, y * s - h * 1.18);
          c.lineTo(x * s + i * h * 0.5 + s * 0.06, y * s - h * 0.9);
          c.fill();
        }
    if (m.bumper || m.bouncy) {
      // a rubber rim: dark ring of fill around a slightly smaller plate
      partOutline(c, cells, s, s * 0.05);
      c.fillStyle = '#17191c';
      c.fill();
      partOutline(c, cells, s, s * 0.15);
      c.fillStyle = grad(mix(col, 0.18), mix(col, -0.45));
      c.fill();
    }
  } else if (kind === 'move') {
    // tyres on a short rail; hover parts are glowing pads
    if (cells.length > 1) body(s * 0.36, dark, null);
    for (const [x, y] of cells) {
      c.save();
      c.translate(x * s, y * s);
      if (m.hover) {
        const g = c.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.46);
        g.addColorStop(0, 'rgba(255,255,255,.9)');
        g.addColorStop(0.4, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, s * 0.46, 0, 7);
        c.fill();
        circ(c, 0, 0, s * 0.3, '#1d232a', col, s * 0.06);
        circ(c, 0, 0, s * 0.12, col);
      } else {
        const w = s * 0.58,
          hh = s * 0.86,
          roll = ((st.roll || t * 2) * s * 0.4) % (s * 0.14);
        rr(c, -w / 2, -hh / 2, w, hh, s * 0.16);
        c.fillStyle = '#1b1e22';
        c.fill();
        c.save();
        rr(c, -w / 2, -hh / 2, w, hh, s * 0.16);
        c.clip();
        c.strokeStyle = '#3a4048';
        c.lineWidth = s * 0.045;
        for (let k = -5; k <= 5; k++) {
          const yy = k * s * 0.14 + roll;
          c.beginPath();
          c.moveTo(-w / 2, yy);
          c.lineTo(w / 2, yy + s * 0.05);
          c.stroke();
        }
        c.restore();
        rr(c, -w * 0.22, -hh * 0.3, w * 0.44, hh * 0.6, s * 0.06);
        c.fillStyle = col;
        c.fill();
        if (m.studs) {
          c.fillStyle = '#cfd6dc';
          for (const yy of [-0.32, 0, 0.32]) {
            c.fillRect(-w / 2 - s * 0.03, yy * s - s * 0.02, s * 0.06, s * 0.04);
            c.fillRect(w / 2 - s * 0.03, yy * s - s * 0.02, s * 0.06, s * 0.04);
          }
        }
      }
      c.restore();
    }
  } else if (kind === 'gun') {
    const W = m.wpn,
      k = W.kind;
    // a slim mount over its cells, a turret ring, then the gun itself
    body(s * 0.22, grad('#363e47', '#1d2329'), '#121518', 0.35);
    // the rest of a big gun's cells carry its supply: tanks for liquids, drums for ammo, batteries for energy
    for (const [x, y] of cells) {
      if (Math.hypot(x, y) < 0.45) continue;
      c.save();
      c.translate(x * s, y * s);
      if (k === 'flame' || k === 'water') {
        rr(c, -s * 0.3, -s * 0.2, s * 0.6, s * 0.4, s * 0.2);
        c.fillStyle = grad(mix(col, 0.25), mix(col, -0.4));
        c.fill();
        c.fillStyle = 'rgba(0,0,0,.3)';
        c.fillRect(-s * 0.04, -s * 0.2, s * 0.08, s * 0.4);
      } else if (W.dt === 'energy' || k === 'tesla' || k === 'arc' || k === 'beam' || k === 'plasma') {
        rr(c, -s * 0.24, -s * 0.28, s * 0.48, s * 0.56, s * 0.08);
        c.fillStyle = '#2b323a';
        c.fill();
        for (let i = 0; i < 3; i++) {
          c.fillStyle = i < 2 ? col : 'rgba(255,255,255,.15)';
          c.fillRect(-s * 0.15, s * 0.16 - i * s * 0.16, s * 0.3, s * 0.1);
        }
      } else {
        circ(c, 0, 0, s * 0.28, '#3d4650', '#14181c', lw);
        circ(c, 0, 0, s * 0.18, mix(col, -0.3), null);
        circ(c, 0, 0, s * 0.06, '#14181c');
      }
      c.restore();
    }
    circ(c, 0, 0, s * 0.34, '#2b323a', '#14181c', lw);
    const barrel = (x, w, l, cc = '#3b434c') => {
      rr(c, x - w / 2, -l, w, l, w * 0.3);
      c.fillStyle = cc;
      c.fill();
      c.strokeStyle = '#14181c';
      c.lineWidth = lw;
      c.stroke();
    };
    if (k === 'flame' || k === 'water') {
      // a fuel (or water) tank across the back, a nozzle forward with a flared tip
      rr(c, -s * 0.36, s * 0.02, s * 0.72, s * 0.3, s * 0.15);
      c.fillStyle = grad(mix(col, 0.25), mix(col, -0.4));
      c.fill();
      c.strokeStyle = '#14181c';
      c.lineWidth = lw;
      c.stroke();
      c.fillStyle = 'rgba(0,0,0,.35)';
      c.fillRect(-s * 0.16, s * 0.02, s * 0.05, s * 0.3);
      c.fillRect(s * 0.11, s * 0.02, s * 0.05, s * 0.3);
      barrel(0, s * 0.14, s * 0.56, '#4a525b');
      c.fillStyle = '#2a3036';
      c.beginPath();
      c.moveTo(-s * 0.07, -s * 0.5);
      c.lineTo(-s * 0.13, -s * 0.66);
      c.lineTo(s * 0.13, -s * 0.66);
      c.lineTo(s * 0.07, -s * 0.5);
      c.closePath();
      c.fill();
      const fl = 0.7 + 0.3 * Math.sin(t * 13 + m.id.length);
      circ(c, 0, -s * 0.66, s * 0.05 * fl, k === 'flame' ? '#ffb347' : '#9fe0ff');
    } else if (k === 'rocket' || k === 'homing') {
      rr(c, -s * 0.3, -s * 0.36, s * 0.6, s * 0.6, s * 0.08);
      c.fillStyle = grad(mix(col, 0.15), mix(col, -0.45));
      c.fill();
      c.strokeStyle = '#14181c';
      c.lineWidth = lw;
      c.stroke();
      for (const [x, y] of [
        [-0.13, -0.19],
        [0.13, -0.19],
        [-0.13, 0.07],
        [0.13, 0.07]
      ])
        circ(c, x * s, y * s, s * 0.08, '#151a1f', '#5b646d', lw * 0.6);
    } else if (k === 'lob') {
      circ(c, 0, -s * 0.05, s * 0.27, '#2b323a', col, s * 0.07);
      circ(c, 0, -s * 0.05, s * 0.15, '#0f1316');
    } else if (k === 'tesla' || k === 'arc') {
      for (let i = 0; i < 3; i++)
        circ(c, 0, 0, s * (0.3 - i * 0.08), i % 2 ? '#b87333' : '#7a4a22', '#3a240f', lw * 0.6);
      const p = 0.6 + 0.4 * Math.sin(t * 9 + m.id.length);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 0.22);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha *= 0.6 + 0.4 * p;
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, s * 0.22, 0, 7);
      c.fill();
      c.globalAlpha /= 0.6 + 0.4 * p;
    } else if (k === 'beam' || k === 'plasma') {
      rr(c, -s * 0.18, -s * 0.2, s * 0.36, s * 0.4, s * 0.08);
      c.fillStyle = '#2f3740';
      c.fill();
      barrel(0, s * 0.16, s * 0.55);
      circ(c, 0, -s * 0.55, s * 0.1, col, '#14181c', lw);
    } else {
      // guns: a receiver in the part's colour and one to three barrels
      const n = Math.min(3, W.n > 4 ? 2 : W.n || W.beams || 1),
        thick = k === 'shell' || k === 'bounce' || k === 'sticky' || k === 'harpoon',
        bw = thick ? s * 0.2 : s * 0.1,
        L = s * (thick ? 0.52 : 0.6);
      for (let i = 0; i < n; i++) barrel((i - (n - 1) / 2) * s * 0.14, bw, L);
      if (W.n > 4) {
        // a wide muzzle for scatter shots
        c.fillStyle = '#2a3036';
        c.beginPath();
        c.moveTo(-s * 0.16, -L + s * 0.04);
        c.lineTo(-s * 0.24, -L - s * 0.08);
        c.lineTo(s * 0.24, -L - s * 0.08);
        c.lineTo(s * 0.16, -L + s * 0.04);
        c.fill();
      }
      if (k === 'harpoon') {
        c.fillStyle = '#d7dde2';
        c.beginPath();
        c.moveTo(0, -L - s * 0.18);
        c.lineTo(-s * 0.1, -L);
        c.lineTo(s * 0.1, -L);
        c.fill();
      }
      rr(c, -s * 0.2, -s * 0.16, s * 0.4, s * 0.34, s * 0.07);
      c.fillStyle = grad(mix(col, 0.2), mix(col, -0.45));
      c.fill();
      c.strokeStyle = '#14181c';
      c.lineWidth = lw;
      c.stroke();
    }
  } else if (kind === 'melee') {
    // an arm out of a slim mount, ending in the tool
    const id = m.id;
    if (cells.length > 1 && /log|ram|kiln/.test(id)) {
      // a long ram: one heavy beam over all its cells with a capped nose
      body(s * 0.14, grad(mix(col, 0.2), mix(col, -0.45)), mix(col, -0.7));
      c.strokeStyle = 'rgba(0,0,0,.28)';
      c.lineWidth = s * 0.05;
      for (const [x, y] of cells) {
        c.beginPath();
        c.moveTo(x * s - h * 0.6, y * s + h * 0.6);
        c.lineTo(x * s + h * 0.6, y * s + h * 0.6);
        c.stroke();
      }
      const top = Math.min(...cells.map(q => q[1]));
      rr(c, -h * 0.75, top * s - h * 0.85, h * 1.5, s * 0.22, s * 0.06);
      c.fillStyle = '#4b535b';
      c.fill();
    } else {
      // big tools get a body in their own colour and a bigger head at the front edge
      const big = cells.length > 1,
        K = big ? Math.min(1.8, Math.sqrt(cells.length)) : 1,
        front = Math.min(...cells.map(q => q[1])) * s - h * 0.04;
      if (big) body(s * 0.12, grad(mix(col, 0.12), mix(col, -0.5)), mix(col, -0.72), 0.3);
      else body(s * 0.24, grad('#363e47', '#1d2329'), '#121518', 0.35);
      rr(c, -s * 0.06 * K, front - s * 0.02, s * 0.12 * K, -front + s * 0.1, s * 0.04);
      c.fillStyle = steel;
      c.fill();
      c.save();
      c.translate(0, front);
      c.scale(K, K);
      if (/saw|blend|trim/.test(id)) {
        c.rotate(t * 14);
        c.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          c.lineTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
          c.lineTo(Math.cos(a + 0.26) * s * 0.22, Math.sin(a + 0.26) * s * 0.22);
        }
        c.closePath();
        c.fillStyle = '#d6dbdf';
        c.fill();
        circ(c, 0, 0, s * 0.07, col);
      } else if (/fork|tong/.test(id)) {
        c.fillStyle = '#cfd6dc';
        for (const sx of [-1, 1]) {
          rr(c, sx * s * 0.12 - s * 0.04, -s * 0.24, s * 0.08, s * 0.3, s * 0.03);
          c.fill();
        }
        rr(c, -s * 0.18, -s * 0.02, s * 0.36, s * 0.08, s * 0.03);
        c.fill();
      } else if (/pick/.test(id)) {
        c.strokeStyle = '#cfd6dc';
        c.lineWidth = s * 0.08;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-s * 0.3, s * 0.06);
        c.quadraticCurveTo(0, -s * 0.14, s * 0.3, s * 0.06);
        c.stroke();
      } else if (/wrench/.test(id)) {
        c.fillStyle = '#c7ced4';
        c.beginPath();
        c.arc(0, -s * 0.06, s * 0.17, 0, 7);
        c.fill();
        c.fillStyle = '#4a4f55';
        c.fillRect(-s * 0.06, -s * 0.26, s * 0.12, s * 0.2);
      } else if (/icicle|glacier|lance|tusk|spike|chill/.test(id)) {
        // an ice (or steel) spike pointing forward
        const g = c.createLinearGradient(-s * 0.14, 0, s * 0.14, 0);
        g.addColorStop(0, '#f4fbff');
        g.addColorStop(1, /ice|glac|chill/.test(id) ? '#7fc8e0' : '#7c848b');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-s * 0.15, s * 0.08);
        c.lineTo(0, -s * 0.42);
        c.lineTo(s * 0.15, s * 0.08);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(20,24,28,.6)';
        c.lineWidth = lw;
        c.stroke();
      } else if (/pendulum|ball|drum/.test(id)) {
        circ(c, 0, -s * 0.06, s * 0.2, '#3b434c', '#14181c', lw);
      } else {
        // a steel wedge head with a stripe in the part's colour
        const g = c.createLinearGradient(-s * 0.28, -s * 0.16, s * 0.28, s * 0.08);
        g.addColorStop(0, '#d5dbe0');
        g.addColorStop(1, '#6f7880');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-s * 0.28, s * 0.08);
        c.lineTo(-s * 0.2, -s * 0.16);
        c.lineTo(s * 0.2, -s * 0.16);
        c.lineTo(s * 0.28, s * 0.08);
        c.closePath();
        c.fill();
        c.strokeStyle = '#14181c';
        c.lineWidth = lw;
        c.stroke();
        c.fillStyle = col;
        c.fillRect(-s * 0.2, -s * 0.06, s * 0.4, s * 0.06);
      }
      c.restore();
    }
  } else {
    // a little machine: a rounded canister in the part's colour with a lid ring and a vent
    body(s * 0.14, grad(mix(col, 0.18), mix(col, -0.5)), mix(col, -0.72), 0.45);
    for (const [x, y] of cells) {
      circ(c, x * s, y * s, s * 0.27, null, 'rgba(0,0,0,.28)', Math.max(0.8, s * 0.025));
      c.fillStyle = 'rgba(255,255,255,.16)';
      c.beginPath();
      c.ellipse(x * s - s * 0.12, y * s - s * 0.14, s * 0.12, s * 0.05, -0.6, 0, 7);
      c.fill();
    }
    if (m.spray || m.autoOil) {
      rr(c, -s * 0.08, -h * 0.98, s * 0.16, s * 0.2, s * 0.04);
      c.fillStyle = '#2a3036';
      c.fill();
    }
    if (m.horn || m.siren) {
      c.fillStyle = '#d7dde2';
      c.beginPath();
      c.moveTo(-s * 0.06, -h * 0.55);
      c.lineTo(-s * 0.18, -h * 1.02);
      c.lineTo(s * 0.18, -h * 1.02);
      c.lineTo(s * 0.06, -h * 0.55);
      c.fill();
    }
    if (m.sensor || m.lantern || m.counter === 'jam')
      line(c, [h * 0.5, -h * 0.4, h * 0.75, -h * 1.05], '#cfd6dc', s * 0.035);
  }
  // the badge: the part's symbol in a small round window (branch symbol, or its glyph)
  if (kind === 'device' || kind === 'armor' || (cells.length > 1 && kind !== 'move')) {
    const bx = kind === 'device' || kind === 'armor' ? 0 : 0,
      by = kind === 'device' || kind === 'armor' ? 0 : s * 0.22;
    circ(c, bx, by, s * 0.19, 'rgba(15,20,26,.85)', col, s * 0.03);
    c.save();
    c.translate(bx, by);
    c.rotate(-(st._ang || 0));
    if (m.glyph) {
      c.font = `${s * 0.24}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(m.glyph, 0, s * 0.015);
    } else if (m.branch === 'cold')
      for (let i = 0; i < 3; i++) {
        c.rotate(Math.PI / 3);
        line(c, [-s * 0.12, 0, s * 0.12, 0], col, s * 0.03);
      }
    else if (m.branch === 'hook') {
      c.strokeStyle = col;
      c.lineWidth = s * 0.03;
      c.beginPath();
      c.arc(0, s * 0.02, s * 0.08, 0, Math.PI);
      c.moveTo(s * 0.08, s * 0.02);
      c.lineTo(s * 0.08, -s * 0.1);
      c.stroke();
    } else if (m.branch === 'econ') circ(c, 0, 0, s * 0.08, '#ffd257', '#8a6a08', s * 0.02);
    else if (m.branch === 'slip')
      for (let i = 0; i < 3; i++)
        circ(c, Math.cos(i * 2.1) * s * 0.06, Math.sin(i * 2.1) * s * 0.06, s * 0.04, null, col, s * 0.02);
    else {
      c.beginPath();
      c.moveTo(-s * 0.06, s * 0.08);
      c.quadraticCurveTo(-s * 0.1, -s * 0.02, 0, -s * 0.12);
      c.quadraticCurveTo(s * 0.11, s * 0.02, s * 0.05, s * 0.08);
      c.closePath();
      c.fillStyle = col;
      c.fill();
    }
    c.restore();
  }
}
