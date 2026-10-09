// Moving parts: Hinge, Rotator, Hydraulic Ram (piston) and Suspension Spring.
// A joint cell points at one neighbour (its facing). Every base cell reachable from that neighbour
// without passing the joint, plus the tops on those cells, is the joint's "child" sub-grid and moves
// with it. Joints can be nested (a hinge on a rotator arm): a cell's chain lists its joints innermost
// first, and each joint transforms rest-grid coordinates, so the maths stays simple and exact.
// Positions feed bpos/ipos, so collisions, hits, melee reach, weapon arcs and drawing all follow.

const JOINT = {
  hinge: { swing: Math.PI / 2, speed: 3.2 },
  rotator: { speed: 2.4 },
  hydraulic: { reach: 2, speed: 5 }, // cells
  suspension: { travel: 0.45, k: 160, damp: 9 } // cells, spring, damping
};
const isJoint = id => !!JOINT[id];

/** Cells beyond a joint (rest grid). Returns null when the far side reaches the cockpit (joint stays rigid). */
function jointChildCells(J, grid) {
  const [jx, jy] = [J.cells[0].gx, J.cells[0].gy],
    sx = jx + FX[J.rot],
    sy = jy + FY[J.rot];
  const start = grid.get(key(sx, sy));
  if (!start) return [];
  const seen = new Set([key(jx, jy)]),
    out = [],
    q = [start];
  seen.add(key(sx, sy));
  while (q.length) {
    const b = q.pop();
    if (b.inst.id === 'cockpit') return null;
    out.push(b);
    for (const [dx, dy] of DIRS) {
      const k = key(b.gx + dx, b.gy + dy);
      if (seen.has(k)) continue;
      const n = grid.get(k);
      if (!n) continue;
      seen.add(k);
      q.push(n);
    }
  }
  return out;
}

/** Called once from makeCar: finds child sets and builds each cell's joint chain. */
function setupJoints(v) {
  const joints = v.insts.filter(I => isJoint(I.id) && I.layer === 'b');
  v.joints = [];
  if (!joints.length) return;
  for (const J of joints) {
    const kids = jointChildCells(J, v.grid);
    if (!kids || !kids.length) continue;
    J.kids = new Set(kids);
    J.s = 0; // hinge/rotator angle, ram/spring offset in px
    J.vs = 0; // spring velocity
    J.px = J.cells[0].gx * S;
    J.py = J.cells[0].gy * S;
    J.dx = FX[J.rot];
    J.dy = FY[J.rot];
    v.joints.push(J);
  }
  if (!v.joints.length) return;
  // depth = how many other joints contain this joint's cell; deeper joints transform first
  for (const J of v.joints) J.depth = v.joints.filter(K => K !== J && K.kids.has(J.cells[0])).length;
  const chainOf = b => v.joints.filter(J => J.kids.has(b)).sort((a, c) => c.depth - a.depth);
  for (const b of v.blocks) {
    const ch = chainOf(b);
    if (ch.length) b.chain = ch;
  }
  // instances follow the chain of their first cell (tops: the base cell under their anchor)
  for (const I of v.insts) {
    const cell = I.layer === 'b' ? I.cells[0] : v.grid.get(key(I.anchorX, I.anchorY));
    if (cell && cell.chain) I.chain = cell.chain;
    if (I.chain && I.chain.some(J => J.id === 'suspension')) I.sprung = true;
  }
  v.moving = v.blocks.filter(b => b.chain);
  v.movingInsts = v.insts.filter(I => I.chain);
  placeJointParts(v);
}

/** Applies a joint chain to a rest position (px) and returns [x, y, angle]. */
function jointApply(chain, x, y) {
  let a = 0;
  for (const J of chain) {
    if (J.id === 'hinge' || J.id === 'rotator') {
      const c = Math.cos(J.s),
        s = Math.sin(J.s),
        dx = x - J.px,
        dy = y - J.py;
      x = J.px + dx * c - dy * s;
      y = J.py + dx * s + dy * c;
      a += J.s;
    } else {
      x += J.dx * J.s;
      y += J.dy * J.s;
    }
  }
  return [x, y, a];
}
/** Recomputes the local positions of every moving cell and part from the joint states. */
function placeJointParts(v) {
  if (!v.moving || !v.moving.length) return;
  let rad = v.radBase || v.rad;
  v.radBase = rad;
  for (const b of v.moving) {
    const [x, y] = jointApply(b.chain, b.gx * S, b.gy * S);
    b.lx = x;
    b.ly = y;
    rad = Math.max(rad, Math.hypot(x - v.comX, y - v.comY) + S);
  }
  for (const I of v.movingInsts) {
    const [x, y, a] = jointApply(I.chain, I.gcx * S, I.gcy * S);
    I.lx = x;
    I.ly = y;
    I.la = a;
  }
  v.rad = rad;
}
/** Is this joint's action held? Action groups (keys 1–9) come later; until then RMB drives them. */
function jointOn(v, J) {
  return typeof actionHeld === 'function' ? actionHeld(v, J) : !!v.rmb;
}
/** Host simulation step for all joints of one car. */
function stepJoints(v, dt) {
  if (!v.joints || !v.joints.length) return;
  for (const J of v.joints) {
    if (!J.alive) continue;
    const P = JOINT[J.id];
    if (J.id === 'hinge') {
      const t = jointOn(v, J) ? P.swing * (J.flip ? -1 : 1) : 0,
        d = t - J.s;
      J.s += clamp(d, -P.speed * dt, P.speed * dt);
    } else if (J.id === 'rotator') {
      // spins by default; holding its action reverses it
      J.s = (J.s + (jointOn(v, J) ? -1 : 1) * P.speed * dt) % (Math.PI * 2);
    } else if (J.id === 'hydraulic') {
      const t = jointOn(v, J) ? P.reach * S : 0,
        d = t - J.s;
      J.s += clamp(d, -P.speed * S * dt, P.speed * S * dt);
    } else if (J.id === 'suspension') {
      J.vs += (-P.k * J.s - P.damp * J.vs) * dt;
      J.s = clamp(J.s + J.vs * dt, -P.travel * S, P.travel * S);
    }
  }
  placeJointParts(v);
}
/** A hit or bump on the car kicks every suspension spring along its axis. */
function kickSprings(v, jx, jy) {
  if (!v.joints) return;
  for (const J of v.joints)
    if (J.id === 'suspension' && J.alive) {
      const c = Math.cos(v.a),
        s = Math.sin(v.a),
        // impulse in car-local space projected on the spring axis
        lx = jx * c + jy * s,
        ly = -jx * s + jy * c;
      J.vs += ((lx * J.dx + ly * J.dy) / Math.max(1, v.c.mass)) * 0.6;
    }
}
/** Snapshot payload: one number per joint. */
const jointSnap = v => (v.joints && v.joints.length ? v.joints.map(J => Math.round(J.s * 100) / 100) : 0);
function applyJointSnap(v, d) {
  if (!d || !v.joints) return;
  v.joints.forEach((J, i) => (J.s = d[i] ?? J.s));
  placeJointParts(v);
}

/** Art: a steel plate with the joint mechanism, pointing at its child side. */
function drawJointArt(c, id, s, ang, st) {
  const h = s / 2;
  bevel(c, h * 0.92, '#4a5563', s * 0.06);
  c.save();
  c.rotate(ang);
  const col = { hinge: '#ffb423', rotator: '#5be7ff', hydraulic: '#ff8a3a', suspension: '#3fe0a0' }[id];
  if (id === 'hinge') {
    rr(c, -h * 0.75, -h * 0.25, h * 1.5, h * 0.5, h * 0.2);
    c.fillStyle = '#2a313b';
    c.fill();
    for (const x of [-0.45, 0, 0.45]) circ(c, x * h, 0, h * 0.2, col, '#1a1f26', s * 0.03);
    line(c, [0, 0, 0, -h * 0.85], col, s * 0.1);
  } else if (id === 'rotator') {
    circ(c, 0, 0, h * 0.7, '#2a313b', col, s * 0.06);
    c.save();
    c.rotate((st && st.spin) || 0);
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      line(c, [0, 0, 0, -h * 0.55], col, s * 0.08);
    }
    c.restore();
    circ(c, 0, 0, h * 0.18, col);
  } else if (id === 'hydraulic') {
    c.fillStyle = '#2a313b';
    c.fillRect(-h * 0.4, -h * 0.2, h * 0.8, h * 1.05);
    c.fillStyle = '#c9d1d9';
    c.fillRect(-h * 0.18, -h * 0.9, h * 0.36, h * 0.8);
    c.fillStyle = col;
    c.fillRect(-h * 0.55, -h * 0.95, h * 1.1, h * 0.2);
  } else {
    c.strokeStyle = col;
    c.lineWidth = s * 0.07;
    c.beginPath();
    for (let i = 0; i <= 8; i++) c.lineTo((i % 2 ? 1 : -1) * h * 0.4, -h * 0.8 + (i * h * 1.6) / 8);
    c.stroke();
    c.fillStyle = '#c9d1d9';
    c.fillRect(-h * 0.55, -h * 0.9, h * 1.1, h * 0.16);
    c.fillRect(-h * 0.55, h * 0.74, h * 1.1, h * 0.16);
  }
  c.restore();
}

/** Chrome rods for rams and springs, drawn under the parts so a stretched arm never looks detached. */
function drawJointRods(c, v) {
  if (!v.joints) return;
  for (const J of v.joints) {
    if (!J.alive || (J.id !== 'hydraulic' && J.id !== 'suspension') || Math.abs(J.s) < 0.5) continue;
    const [x0, y0] = lpos(v, J.px, J.py),
      [x1, y1] = lpos(v, J.px + J.dx * (S * 0.5 + J.s), J.py + J.dy * (S * 0.5 + J.s));
    line(c, [x0, y0, x1, y1], '#5d6670', S * 0.42);
    line(c, [x0, y0, x1, y1], '#d6dde4', S * 0.24);
  }
}
