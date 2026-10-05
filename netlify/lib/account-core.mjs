// Pure account logic, separated from Netlify so it can be tested with an in-memory store.
import { webcrypto as wc } from 'node:crypto';
const crypto = globalThis.crypto || wc;

export const NAME_RE = /^[A-Za-z0-9 _-]{3,16}$/;
export const PIN_RE = /^\d{4,6}$/;
export const MAX_FAILS = 5;
export const LOCK_MS = 10 * 60 * 1000;
export const MAX_DATA = 64 * 1024;
export const MAX_TOKENS = 6;
// only these keys travel with an account; everything else stays on the device
export const SYNC_KEYS = ['sd.prog', 'sd.style', 'sd.bp', 'sd.favorites', 'sd.settings', 'sd.diff', 'sd.paint'];

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const rand = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const keyOf = name => 'u:' + name.trim().toLowerCase().replace(/\s+/g, ' ');

async function pinHash(pin, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120000 }, k, 256);
  return hex(bits);
}
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function cleanData(data) {
  const out = {};
  if (!data || typeof data !== 'object') return out;
  for (const k of SYNC_KEYS) if (typeof data[k] === 'string') out[k] = data[k];
  return out;
}
const ok = body => ({ status: 200, body });
const err = (status, error) => ({ status, body: { error } });

async function issue(store, key, acc) {
  const token = rand(24);
  acc.tokens = [await sha(token), ...(acc.tokens || [])].slice(0, MAX_TOKENS);
  await store.set(key, acc);
  return token;
}
async function authed(store, name, token) {
  if (typeof name !== 'string' || typeof token !== 'string' || !NAME_RE.test(name.trim())) return null;
  const key = keyOf(name),
    acc = await store.get(key);
  if (!acc) return null;
  const h = await sha(token);
  return (acc.tokens || []).some(t => same(t, h)) ? { key, acc, h } : null;
}

export async function handle(body, store, now = Date.now()) {
  const action = body && body.action;
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (action === 'register' || action === 'login') {
    const pin = String(body.pin ?? '');
    if (!NAME_RE.test(name)) return err(400, 'Nickname: 3 to 16 letters, digits, spaces, _ or -.');
    if (!PIN_RE.test(pin)) return err(400, 'PIN: 4 to 6 digits.');
    const key = keyOf(name);
    let acc = await store.get(key);
    if (action === 'register') {
      if (acc) return err(409, 'That nickname is taken. Pick another or sign in.');
      const salt = rand(16);
      acc = { name, salt, hash: await pinHash(pin, salt), created: now, fails: 0, lockUntil: 0, data: cleanData(body.data), saved: now, tokens: [] };
      const token = await issue(store, key, acc);
      return ok({ name, token, data: acc.data, created: true });
    }
    if (!acc) return err(404, 'No player with that nickname. Check the spelling or create it.');
    if (acc.lockUntil > now) return err(429, `Too many wrong PINs. Try again in ${Math.ceil((acc.lockUntil - now) / 60000)} min.`);
    if (!same(await pinHash(pin, acc.salt), acc.hash)) {
      acc.fails = (acc.fails || 0) + 1;
      if (acc.fails >= MAX_FAILS) {
        acc.fails = 0;
        acc.lockUntil = now + LOCK_MS;
      }
      await store.set(key, acc);
      return err(401, acc.lockUntil > now ? 'Wrong PIN. Sign-in is locked for 10 minutes.' : `Wrong PIN. ${MAX_FAILS - acc.fails} tries left.`);
    }
    acc.fails = 0;
    acc.lockUntil = 0;
    const token = await issue(store, key, acc);
    return ok({ name: acc.name, token, data: acc.data || {}, saved: acc.saved || 0 });
  }
  if (action === 'load' || action === 'save' || action === 'logout') {
    const a = await authed(store, name, body.token);
    if (!a) return err(401, 'Signed out. Sign in again.');
    if (action === 'load') return ok({ name: a.acc.name, data: a.acc.data || {}, saved: a.acc.saved || 0 });
    if (action === 'logout') {
      a.acc.tokens = a.acc.tokens.filter(t => t !== a.h);
      await store.set(a.key, a.acc);
      return ok({ done: true });
    }
    const data = cleanData(body.data);
    if (JSON.stringify(data).length > MAX_DATA) return err(413, 'Save is too large.');
    a.acc.data = data;
    a.acc.saved = now;
    await store.set(a.key, a.acc);
    return ok({ saved: now });
  }
  return err(400, 'Unknown action.');
}
