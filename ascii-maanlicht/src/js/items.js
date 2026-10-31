// ---------- items: base types x materials x runes, plus procedural ASCII icons ----------
const SLOTS = ['weapon', 'helm', 'amulet', 'armor', 'shield', 'ring', 'boots'];
const SLOT_NL = { weapon: 'wapen', helm: 'helm', amulet: 'amulet', armor: 'harnas', shield: 'schild', ring: 'ring', boots: 'laarzen' };
const BASES = {
  sword: { slot: 'weapon', nl: 'zwaard', dmg: [6, 11], spd: 0.62, wpn: 1 },
  axe: { slot: 'weapon', nl: 'bijl', dmg: [9, 15], spd: 0.85, wpn: 2 },
  dagger: { slot: 'weapon', nl: 'dolk', dmg: [4, 7], spd: 0.4, wpn: 3, crit: 6 },
  mace: { slot: 'weapon', nl: 'knots', dmg: [8, 13], spd: 0.75, wpn: 4 },
  staff: { slot: 'weapon', nl: 'staf', dmg: [5, 9], spd: 0.7, wpn: 5, int: 6 },
  helm: { slot: 'helm', nl: 'helm', armor: 14 },
  hood: { slot: 'helm', nl: 'kap', armor: 7, eva: 12 },
  armor: { slot: 'armor', nl: 'harnas', armor: 32 },
  robe: { slot: 'armor', nl: 'mantel', armor: 14, int: 4 },
  boots: { slot: 'boots', nl: 'laarzen', armor: 8, eva: 8 },
  shield: { slot: 'shield', nl: 'schild', armor: 22 },
  amulet: { slot: 'amulet', nl: 'amulet' },
  ring: { slot: 'ring', nl: 'ring' }
};
const MATERIALS = {
  iron: { nl: 'IJzeren', col: [0.62, 0.64, 0.68], mul: 1 },
  bone: { nl: 'Benen', col: [0.86, 0.82, 0.7], mul: 0.9, fx: 'leech' },
  steel: { nl: 'Stalen', col: [0.78, 0.82, 0.9], mul: 1.25 },
  ember: { nl: 'Gloeiend', col: [1, 0.45, 0.15], mul: 1.2, fx: 'fire', glow: 1 },
  ice: { nl: 'IJzig', col: [0.55, 0.85, 1], mul: 1.15, fx: 'ice', glow: 1 },
  moon: { nl: 'Maanzilveren', col: [0.82, 0.86, 1], mul: 1.4, fx: 'moon', glow: 1 },
  obsidian: { nl: 'Obsidiaan', col: [0.35, 0.25, 0.45], mul: 1.55, fx: 'crit' }
};
const RUNES = {
  leech: { nl: 'van het Bloed', txt: 'levenszuiging 5%' },
  haste: { nl: 'van de Wind', txt: 'aanvalssnelheid +12%' },
  might: { nl: 'van de Beer', txt: 'kracht +6' },
  ward: { nl: 'van de Muur', txt: 'pantser +20' },
  spark: { nl: 'van de Vonk', txt: 'mana +20' },
  sight: { nl: 'van de Uil', txt: 'kritiek +4%' }
};
const RARITY = [
  { nl: 'gewoon', col: '#c9d1da' },
  { nl: 'magisch', col: '#7fb3ff' },
  { nl: 'zeldzaam', col: '#ffd76a' },
  { nl: 'episch', col: '#c58bff' }
];
let ITEM_ID = 1;

function makeItem(r, level, tier = 1, forceBase) {
  const bk = forceBase || pickR(r, Object.keys(BASES));
  const base = BASES[bk];
  const roll = r() + tier * 0.12;
  const rarity = roll > 1.05 ? 3 : roll > 0.82 ? 2 : roll > 0.5 ? 1 : 0;
  const mats = level < 3 ? ['iron', 'bone', 'iron'] : level < 6 ? ['iron', 'bone', 'steel', 'ember', 'ice'] : Object.keys(MATERIALS);
  const mk = pickR(r, mats);
  const m = MATERIALS[mk];
  const it = { id: ITEM_ID++, base: bk, mat: mk, slot: base.slot, rarity, level, runes: [], stats: {} };
  const lv = 1 + level * 0.12;
  if (base.dmg) {
    it.stats.dmg = [Math.round(base.dmg[0] * m.mul * lv), Math.round(base.dmg[1] * m.mul * lv)];
    it.stats.spd = base.spd;
    it.stats.crit = (base.crit || 0) + (m.fx === 'crit' ? 5 : 0);
  }
  if (base.armor) it.stats.armor = Math.round(base.armor * m.mul * lv);
  if (base.eva) it.stats.eva = Math.round(base.eva * lv);
  if (base.int) it.stats.int = Math.round(base.int * lv);
  if (bk === 'amulet') it.stats.hp = Math.round(20 * lv * m.mul);
  if (bk === 'ring') it.stats.mp = Math.round(12 * lv * m.mul);
  const nr = rarity === 0 ? 0 : rarity === 1 ? 1 : rarity === 2 ? (r() < 0.5 ? 1 : 2) : 2;
  const rk = Object.keys(RUNES);
  for (let i = 0; i < nr; i++) {
    const k = pickR(r, rk);
    if (!it.runes.includes(k)) it.runes.push(k);
  }
  if (m.fx === 'leech' && base.dmg && !it.runes.includes('leech')) it.runes.push('leech');
  it.name = `${m.nl} ${base.nl}` + (it.runes.length && rarity >= 2 ? ' ' + RUNES[it.runes[0]].nl : '');
  it.name = it.name[0].toUpperCase() + it.name.slice(1);
  it.value = Math.round((8 + level * 4) * (1 + rarity) * m.mul);
  return it;
}

function itemLines(it) {
  const s = it.stats, out = [];
  const b = BASES[it.base], m = MATERIALS[it.mat];
  out.push(`${RARITY[it.rarity].nl}, ${m.nl.toLowerCase()} · ${SLOT_NL[it.slot]} · lv ${it.level}`);
  if (s.dmg) {
    const dps = (((s.dmg[0] + s.dmg[1]) / 2) / s.spd).toFixed(1);
    out.push(`schade ${s.dmg[0]}-${s.dmg[1]} · ${s.spd.toFixed(2)}s · dps ${dps}`);
  }
  if (s.crit) out.push(`kritiek +${s.crit}%`);
  if (s.armor) out.push(`pantser ${s.armor}`);
  if (s.eva) out.push(`ontwijken ${s.eva}`);
  if (s.int) out.push(`intelligentie +${s.int}`);
  if (s.hp) out.push(`leven +${s.hp}`);
  if (s.mp) out.push(`mana +${s.mp}`);
  if (m.fx === 'fire') out.push('brandt vijanden (3s)');
  if (m.fx === 'ice') out.push('vertraagt vijanden');
  if (m.fx === 'moon') out.push("'s nachts +25% schade");
  for (const k of it.runes) out.push(`rune: ${RUNES[k].txt}`);
  out.push(`waarde ${it.value}g`);
  return out;
}

// ---- ASCII icon renderer: a shape SDF per base type, lit from the top-left, then quantised to glyphs ----
const ICON_RAMP = ' .:-=+*#%@';
function shapeOf(base) {
  const seg = (x, y, ax, ay, bx, by) => {
    const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
    const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
    return Math.hypot(pax - bax * h, pay - bay * h);
  };
  switch (base) {
    case 'sword': return (x, y) => Math.min(seg(x, y, 0.25, 0.78, 0.8, 0.15) - 0.05, seg(x, y, 0.18, 0.62, 0.42, 0.86) - 0.04, seg(x, y, 0.12, 0.92, 0.24, 0.8) - 0.045);
    case 'axe': return (x, y) => Math.min(seg(x, y, 0.25, 0.9, 0.62, 0.15) - 0.04, Math.hypot((x - 0.66) * 1.1, (y - 0.25) * 0.8) - 0.2);
    case 'dagger': return (x, y) => Math.min(seg(x, y, 0.35, 0.72, 0.72, 0.25) - 0.05, seg(x, y, 0.28, 0.6, 0.46, 0.8) - 0.035, seg(x, y, 0.22, 0.86, 0.33, 0.74) - 0.045);
    case 'mace': return (x, y) => Math.min(seg(x, y, 0.28, 0.9, 0.58, 0.35) - 0.04, Math.hypot(x - 0.64, y - 0.26) - 0.17);
    case 'staff': return (x, y) => Math.min(seg(x, y, 0.3, 0.95, 0.66, 0.2) - 0.035, Math.hypot(x - 0.69, y - 0.15) - 0.11);
    case 'helm': return (x, y) => Math.max(Math.hypot((x - 0.5) * 1.05, (y - 0.58) * 1.1) - 0.36, y - 0.82) + (Math.abs(x - 0.5) < 0.05 && y > 0.5 ? 0.06 : 0);
    case 'hood': return (x, y) => Math.max(Math.hypot((x - 0.5) * 1.15, (y - 0.5) * 0.95) - 0.36, -Math.hypot(x - 0.5, y - 0.66) + 0.13);
    case 'armor': return (x, y) => Math.min(Math.max(Math.abs(x - 0.5) - 0.24 - (y < 0.35 ? 0.1 : 0), Math.abs(y - 0.55) - 0.33), seg(x, y, 0.2, 0.25, 0.8, 0.25) - 0.08);
    case 'robe': return (x, y) => Math.max(Math.abs(x - 0.5) - 0.13 - y * 0.25, Math.abs(y - 0.52) - 0.4);
    case 'boots': return (x, y) => Math.min(Math.max(Math.abs(x - 0.42) - 0.12, Math.abs(y - 0.45) - 0.3), Math.max(Math.abs(x - 0.52) - 0.24, Math.abs(y - 0.8) - 0.08));
    case 'shield': return (x, y) => Math.max(Math.abs(x - 0.5) - 0.3 + Math.max(0, y - 0.55) * 0.55, Math.abs(y - 0.5) - 0.38);
    case 'amulet': return (x, y) => Math.min(Math.abs(Math.hypot(x - 0.5, (y - 0.38) * 1.2) - 0.28) - 0.025, Math.hypot(x - 0.5, y - 0.72) - 0.12);
    case 'ring': return (x, y) => Math.min(Math.abs(Math.hypot((x - 0.5) * 0.9, y - 0.56) - 0.24) - 0.06, Math.hypot(x - 0.5, y - 0.3) - 0.09);
  }
  return (x, y) => Math.hypot(x - 0.5, y - 0.5) - 0.3;
}
const iconCache = new Map();
function drawIcon(canvas, it, cols = 16, rows = 10) {
  const key = it.id + ':' + canvas.width;
  const ctx = canvas.getContext('2d');
  const W2 = canvas.width, H2 = canvas.height, cw = W2 / cols, ch = H2 / rows;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W2, H2);
  ctx.font = `bold ${Math.floor(ch * 1.02)}px Consolas, Menlo, "DejaVu Sans Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const f = shapeOf(it.base), m = MATERIALS[it.mat];
  const handle = [0.45, 0.32, 0.2];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) / cols, y = (j + 0.5) / rows;
      const d = f(x, y);
      if (d > 0) continue;
      const e = 0.02;
      const nx = f(x + e, y) - f(x - e, y), ny = f(x, y + e) - f(x, y - e);
      const nl = Math.hypot(nx, ny) || 1;
      const depth = clamp(-d * 9, 0, 1);
      let l = 0.35 + 0.5 * clamp((-nx - ny) / nl, -1, 1) * (1 - depth) + 0.25 * depth + (hf(i, j, it.id) - 0.5) * 0.25;
      l = clamp(l, 0.08, 1);
      const isHandle = BASES[it.base].dmg && x + (1 - y) < 0.62;
      const c = isHandle ? handle : m.col;
      const g = ICON_RAMP[Math.min(ICON_RAMP.length - 1, 1 + Math.floor(l * (ICON_RAMP.length - 1)))];
      ctx.fillStyle = `rgb(${(c[0] * 255 * (0.35 + l * 0.8)) | 0},${(c[1] * 255 * (0.35 + l * 0.8)) | 0},${(c[2] * 255 * (0.35 + l * 0.8)) | 0})`;
      ctx.fillText(g, (i + 0.5) * cw, (j + 0.5) * ch);
    }
  iconCache.set(key, true);
}

// a large ASCII portrait of a character, using the same capsule rig as the shader
function drawPortrait(canvas, pl) {
  const ctx = canvas.getContext('2d');
  const cols = 30, rows = 26;
  const W2 = canvas.width, H2 = canvas.height, cw = W2 / cols, ch = H2 / rows;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W2, H2);
  ctx.font = `bold ${Math.floor(ch * 1.02)}px Consolas, Menlo, "DejaVu Sans Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lk = playerLook(pl);
  const caps = [];
  const C = (ax, ay, bx, by, r, col) => caps.push({ ax, ay, bx, by, r, col });
  C(-0.02, 1.42, -0.26, 0.5, 0.27, lk.c2.map(v => v * 0.55));
  C(-0.2, 1.38, -0.26, 0.9, 0.1, lk.c1);
  C(-0.12, 0.86, -0.13, 0.1, 0.12, lk.c1.map(v => v * 0.8));
  C(0, 0.9, 0, 1.4, 0.28, lk.c1);
  C(0.12, 0.86, 0.13, 0.1, 0.12, lk.c1.map(v => v * 0.8));
  C(0.03, 1.72, 0.03, 1.72, 0.2, [0.82, 0.64, 0.52]);
  if (lk.helm) C(0.02, 1.8, 0.02, 1.8, 0.21, lk.c2);
  if (lk.shield) C(-0.28, 1.15, -0.28, 0.85, 0.2, lk.c2);
  if (lk.weapon) C(0.55, 1.0, 0.95, 1.85, 0.05, lk.wc);
  C(0.22, 1.38, 0.5, 1.0, 0.1, lk.c1);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = ((i + 0.5) / cols - 0.5) * 2.6, y = (1 - (j + 0.5) / rows) * 2.2;
      let hit = null, nrm = 0;
      for (const c of caps) {
        const pax = x - c.ax, pay = y - c.ay, bax = c.bx - c.ax, bay = c.by - c.ay;
        const L2 = bax * bax + bay * bay || 1e-6;
        const h = clamp((pax * bax + pay * bay) / L2, 0, 1);
        const vx = pax - bax * h, vy = pay - bay * h, d = Math.hypot(vx, vy);
        if (d < c.r) { hit = c; nrm = (-vx * 0.6 + vy * 0.5) / c.r; }
      }
      if (!hit) continue;
      const l = clamp(0.55 + nrm * 0.55 + (hf(i, j, 5) - 0.5) * 0.15, 0.05, 1);
      const g = ICON_RAMP[Math.min(9, 1 + Math.floor(l * 9))];
      const k = 0.35 + l * 0.85;
      ctx.fillStyle = `rgb(${(hit.col[0] * 255 * k) | 0},${(hit.col[1] * 255 * k) | 0},${(hit.col[2] * 255 * k) | 0})`;
      ctx.fillText(g, (i + 0.5) * cw, (j + 0.5) * ch);
    }
}
