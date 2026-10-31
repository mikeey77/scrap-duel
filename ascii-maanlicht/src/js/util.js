// ---------- small math + deterministic hashing (bit-identical to the GLSL hf()) ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function hu(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ ((Math.imul(y | 0, 0x165667b1) + (s | 0)) | 0);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}
const hf = (x, y, s) => (hu(x, y, s) & 0xffffff) / 16777216;

function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hf(ix, iy, s), hf(ix + 1, iy, s), fx), lerp(hf(ix, iy + 1, s), hf(ix + 1, iy + 1, s), fx), fy);
}
function fbm(x, y, s, o = 5) {
  let v = 0, a = 0.5, n = 0;
  for (let i = 0; i < o; i++) {
    v += a * vnoise(x, y, s + i * 101);
    n += a;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 3.7;
    a *= 0.5;
  }
  return v / n;
}
const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];
