// Boss cars (Scrap Gauntlet): a health bar across the top and three phases.
// At 2/3 and 1/3 health a boss gets angrier: faster weapons, more speed.
const carHealth = v => {
  let a = 0;
  for (const I of v.insts) if (I.alive) a += Math.max(0, I.hp);
  return v.total ? a / v.total : 0;
};
function bossTick() {
  if (!B || B.seq !== 'play' || B.demo || B.replay) return;
  const v = B.cars.find(c => c.boss);
  if (!v || v.dead) return;
  const hp = carHealth(v);
  v.phase = v.phase || 1;
  const want = hp < 0.34 ? 3 : hp < 0.67 ? 2 : 1;
  if (want > v.phase) {
    v.phase = want;
    v.rateMul = (v.rateMul || 1) * 1.25;
    v.c.topCap *= 1.08;
    v.c.accel *= 1.12;
    B.banner = {
      text: want === 3 ? 'FINAL PHASE' : 'PHASE 2',
      col: '#ff5c7a',
      t: 2.2,
      sub: v.name + ' is getting angry'
    };
    sfx('alarm');
    B.shake = Math.max(B.shake || 0, 8);
    commentate('phase', { car: v, n: want });
  }
}
function drawBossBar(c) {
  if (!B) return;
  const v = B.cars.find(x => x.boss);
  if (!v) return;
  const w = Math.min(560, view.w * 0.5),
    x = view.w / 2 - w / 2,
    y = 92,
    hp = v.dead ? 0 : carHealth(v);
  c.save();
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(10,16,32,.86)';
  c.fillRect(x - 10, y - 22, w + 20, 40);
  c.font = '700 13px "Chakra Petch", sans-serif';
  c.fillStyle = '#ff5c7a';
  c.textAlign = 'left';
  c.fillText(`BOSS · PHASE ${v.phase || 1}/3`, x, y - 6);
  c.fillStyle = '#e6f1ff';
  c.textAlign = 'right';
  c.fillText(v.name, x + w, y - 6);
  for (let i = 0; i < 3; i++) {
    const sx = x + (i * w) / 3 + (i ? 3 : 0),
      sw = w / 3 - 3,
      seg = clamp((hp - (2 - i) / 3) * 3, 0, 1);
    c.fillStyle = '#2b1b22';
    c.fillRect(sx, y, sw, 9);
    c.fillStyle = '#ff5c7a';
    c.fillRect(sx, y, sw * seg, 9);
  }
  c.restore();
}
