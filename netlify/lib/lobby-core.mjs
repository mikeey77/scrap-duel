// Presence + public 1v1 rooms. Pure logic so it can be tested without Netlify.
// State shape: { p: { [id]: { t, room?: { code, name, rounds, v } } } }
export const STALE_MS = 45000;
export const MAX_PLAYERS = 1000;
const ID = /^[a-z0-9]{8,40}$/i;
const CODE = /^[A-Z0-9]{4}$/;
const ROUNDS = [5, 10, 25];

export function clean(state, now) {
  const p = {};
  for (const [id, e] of Object.entries((state && state.p) || {}))
    if (e && now - e.t < STALE_MS) p[id] = e;
  return { p };
}

export function sanitizeRoom(r) {
  if (!r || typeof r !== 'object' || !CODE.test(String(r.code || ''))) return null;
  const name = String(r.name || 'Player').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'Player';
  return { code: r.code, name, rounds: ROUNDS.includes(+r.rounds) ? +r.rounds : 10, v: Number.isInteger(r.v) ? r.v : 0 };
}

/** Applies one heartbeat. Returns null when the message is invalid. */
export function applyPing(state, msg, now) {
  if (!msg || !ID.test(String(msg.id || ''))) return null;
  const next = clean(state, now);
  if (msg.bye) delete next.p[msg.id];
  else {
    if (!next.p[msg.id] && Object.keys(next.p).length >= MAX_PLAYERS) return next;
    const room = sanitizeRoom(msg.room && { ...msg.room, v: msg.v });
    next.p[msg.id] = room ? { t: now, room } : { t: now };
  }
  return next;
}

export function view(state, now, self) {
  const live = clean(state, now).p;
  const rooms = Object.entries(live)
    .filter(([id, e]) => e.room && id !== self)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, 20)
    .map(([, e]) => ({ ...e.room }));
  return { online: Object.keys(live).length, rooms };
}
