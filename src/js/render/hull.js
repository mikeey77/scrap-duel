// One body instead of a grid of tiles: every solid chassis cell of a car is drawn as a single
// continuous hull (rounded outer corners, one lit gradient over the whole car, an outline only
// around the silhouette, rim light and shade on the edges that face the light, engraved seams
// between parts, rivets along the rim and axles out to the wheels). Chassis parts then draw only
// their own details on top (st.hull), so neighbouring cells read as one machined plate.

const HULL_LIGHT = [-0.62, -0.78]; // light comes from the top left of the screen

/** Hex colour blend: a toward b by t. */
function hexMix(a, b, t) {
  const p = x => parseInt(x.slice(1), 16),
    A = p(a),
    Bc = p(b),
    f = s => Math.round(((A >> s) & 255) * (1 - t) + ((Bc >> s) & 255) * t);
  return `#${((1 << 24) | (f(16) << 16) | (f(8) << 8) | f(0)).toString(16).slice(1)}`;
}
/** The hull's metal for a car paint: dark gunmetal with a hint of the paint in it. */
const hullMetal = paint => hexMix('#5b636c', /^#[0-9a-f]{6}$/i.test(paint || '') ? paint : '#f2b705', 0.1);

/**
 * cells: [{ x, y, part }] in grid units; the caller's transform puts cell (x, y)'s centre at (x*s, y*s).
 * rot: the car's angle on screen (for lighting). opt: { paint, shadow: [dx, dy] in screen px, axles: [{x, y}] }
 */
function drawHull(c, cells, s, rot, opt = {}) {
  if (!cells.length) return;
  const at = new Map();
  for (const q of cells) at.set(q.x + ',' + q.y, q);
  const has = (x, y) => at.has(x + ',' + y),
    h = s / 2,
    r = s * 0.22,
    metal = opt.metal || hullMetal(opt.paint);
  // light in the car's own frame
  const cr = Math.cos(-rot),
    sr = Math.sin(-rot),
    lx = HULL_LIGHT[0] * cr - HULL_LIGHT[1] * sr,
    ly = HULL_LIGHT[0] * sr + HULL_LIGHT[1] * cr;
  // one path for the whole silhouette: each cell, rounded only on corners nothing touches
  const silhouette = (pad, ox = 0, oy = 0) => {
    c.beginPath();
    for (const q of cells) {
      const up = has(q.x, q.y - 1),
        dn = has(q.x, q.y + 1),
        lf = has(q.x - 1, q.y),
        rt = has(q.x + 1, q.y);
      const x0 = q.x * s - h - pad - (lf ? 0.6 : 0) + ox,
        y0 = q.y * s - h - pad - (up ? 0.6 : 0) + oy,
        x1 = q.x * s + h + pad + (rt ? 0.6 : 0) + ox,
        y1 = q.y * s + h + pad + (dn ? 0.6 : 0) + oy;
      const rTL = !up && !lf ? r + pad : 0,
        rTR = !up && !rt ? r + pad : 0,
        rBR = !dn && !rt ? r + pad : 0,
        rBL = !dn && !lf ? r + pad : 0;
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
  };
  let minX = 1e9,
    minY = 1e9,
    maxX = -1e9,
    maxY = -1e9;
  for (const q of cells) {
    minX = Math.min(minX, q.x * s - h);
    maxX = Math.max(maxX, q.x * s + h);
    minY = Math.min(minY, q.y * s - h);
    maxY = Math.max(maxY, q.y * s + h);
  }
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2,
    ext = Math.hypot(maxX - minX, maxY - minY) / 2 + s;
  c.save();
  // soft shadow on the ground, offset in screen space
  if (opt.shadow) {
    const [dx, dy] = opt.shadow,
      ox = dx * cr - dy * sr,
      oy = dx * sr + dy * cr;
    c.fillStyle = 'rgba(0,0,0,.3)';
    silhouette(s * 0.04, ox, oy);
    c.fill();
  }
  // axles out to the wheels, under the body
  if (opt.axles)
    for (const w of opt.axles)
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ])
        if (has(w.x + dx, w.y + dy)) {
          c.save();
          c.translate(w.x * s, w.y * s);
          c.rotate(Math.atan2(dy, dx));
          c.fillStyle = '#1b1f24';
          c.fillRect(0, -s * 0.11, s * 0.62, s * 0.22);
          c.fillStyle = '#3a4149';
          c.fillRect(0, -s * 0.05, s * 0.62, s * 0.06);
          c.restore();
        }
  // the outline around the silhouette only (inner edges are covered by the body)
  c.fillStyle = mix(metal, -0.72);
  silhouette(s * 0.06);
  c.fill();
  // the body: one gradient across the whole car, lit from the light's side
  const g = c.createLinearGradient(cx + lx * ext, cy + ly * ext, cx - lx * ext, cy - ly * ext);
  g.addColorStop(0, mix(metal, 0.32));
  g.addColorStop(0.45, metal);
  g.addColorStop(1, mix(metal, -0.42));
  c.fillStyle = g;
  silhouette(0);
  c.fill();
  // a broad soft sheen across the top
  const sh = c.createLinearGradient(cx + lx * ext * 0.6, cy + ly * ext * 0.6, cx, cy);
  sh.addColorStop(0, 'rgba(255,255,255,.14)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sh;
  silhouette(0);
  c.fill();
  // engraved seams where two different parts meet
  if (s > 10) {
    c.lineCap = 'butt';
    for (const q of cells)
      for (const [dx, dy] of [
        [1, 0],
        [0, 1]
      ]) {
        const n = at.get(q.x + dx + ',' + (q.y + dy));
        if (!n || n.part === q.part) continue;
        const ex = q.x * s + dx * h,
          ey = q.y * s + dy * h,
          a = s * 0.36;
        c.lineWidth = Math.max(1, s * 0.035);
        c.strokeStyle = 'rgba(0,0,0,.32)';
        c.beginPath();
        c.moveTo(ex - dy * a, ey - dx * a);
        c.lineTo(ex + dy * a, ey + dx * a);
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.1)';
        c.lineWidth = Math.max(0.6, s * 0.02);
        c.beginPath();
        c.moveTo(ex - dy * a + dx * 1.2, ey - dx * a + dy * 1.2);
        c.lineTo(ex + dy * a + dx * 1.2, ey + dx * a + dy * 1.2);
        c.stroke();
      }
  }
  // rim light and shade on open edges, and a row of rivets along them
  c.lineCap = 'round';
  for (const q of cells)
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ]) {
      if (has(q.x + dx, q.y + dy)) continue;
      const face = dx * lx + dy * ly,
        tx = -dy,
        ty = dx,
        ex = q.x * s + dx * (h - s * 0.06),
        ey = q.y * s + dy * (h - s * 0.06),
        // shorten the stroke where the corner is rounded
        a0 = has(q.x - tx, q.y - ty) ? h : h - r,
        a1 = has(q.x + tx, q.y + ty) ? h : h - r;
      if (Math.abs(face) > 0.15) {
        c.strokeStyle = face > 0 ? `rgba(255,255,255,${0.3 * face})` : `rgba(0,0,0,${-0.35 * face})`;
        c.lineWidth = Math.max(1, s * 0.07);
        c.beginPath();
        c.moveTo(ex - tx * a0, ey - ty * a0);
        c.lineTo(ex + tx * a1, ey + ty * a1);
        c.stroke();
      }
      if (s > 22) {
        c.fillStyle = mix(metal, -0.5);
        const ix = q.x * s + dx * (h - s * 0.17),
          iy = q.y * s + dy * (h - s * 0.17);
        for (const t of [-0.25, 0.25]) {
          const px = ix + (dx ? 0 : t * s),
            py = iy + (dx ? t * s : 0);
          c.beginPath();
          c.arc(px, py, s * 0.035, 0, 7);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,.22)';
          c.beginPath();
          c.arc(px - s * 0.01, py - s * 0.012, s * 0.015, 0, 7);
          c.fill();
          c.fillStyle = mix(metal, -0.5);
        }
      }
    }
  c.restore();
}

/** Hull cells of a car in battle (alive, solid, not on a moving joint) and its wheels for axles. */
function vehicleHull(v) {
  const cells = [],
    axles = [];
  for (const b of v.blocks) {
    const I = b.inst;
    if (!I.alive || I.layer !== 'b' || b.chain) continue;
    if (hullPart(I.m)) cells.push({ x: b.gx, y: b.gy, part: I });
    else if (I.m.drive) axles.push({ x: b.gx, y: b.gy });
  }
  return { cells, axles };
}

/** Which of the four neighbours (up 1, right 2, down 4, left 8) pass a test. */
function nbMask(x, y, same) {
  return (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) | (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
}
