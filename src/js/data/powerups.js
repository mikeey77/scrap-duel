// Power-ups: timed boosts that spawn on the centre line of every battle arena.
const POWERUPS = {
  overdrive: { name: 'Overdrive', icon: 'O', col: '#ff8a3a', desc: '+60% fire rate', time: 8 },
  armor: { name: 'Iron Skin', icon: 'A', col: '#9fb6ff', desc: 'take half damage', time: 8 },
  speed: { name: 'Nitro Rush', icon: 'N', col: '#7fe0ff', desc: '+50% acceleration and top speed', time: 8 },
  magnet: { name: 'Scrap Magnet', icon: 'M', col: '#72d79d', desc: 'pull loose world scrap closer', time: 8 },
  ghost: { name: 'Ghost Scrapper', icon: 'G', col: '#bbacff', desc: 'pass through loose wreckage', time: 5 },
  repair: { name: 'Patch Kit', icon: '+', col: '#5cc38f', desc: 'repair 20% of surviving non-cockpit parts', time: 1 }
};
const POWER_IDS = Object.keys(POWERUPS);
const POWER_RESPAWN = 22;
const buffOf = (v, id) => !!(v.buff && v.buff.t > 0 && v.buff.p === id);
