// Scrap Duel lobby: counts players online and lists public 1v1 rooms.
// Clients send a heartbeat every ~20 s; entries expire after 45 s.
import { getStore } from '@netlify/blobs';
import { applyPing, view } from '../lib/lobby-core.mjs';

const KEY = 'state';

export default async req => {
  const store = getStore({ name: 'scrap-duel-lobby', consistency: 'strong' });
  const now = Date.now();
  if (req.method === 'GET') {
    const state = (await store.get(KEY, { type: 'json' })) || { p: {} };
    return json(view(state, now));
  }
  if (req.method !== 'POST') return json({ error: 'Use GET or POST.' }, 405);
  let msg;
  try {
    msg = await req.json();
  } catch (e) {
    return json({ error: 'Send JSON.' }, 400);
  }
  // optimistic concurrency: retry when another heartbeat wrote in between
  for (let i = 0; i < 5; i++) {
    const cur = await store.getWithMetadata(KEY, { type: 'json' });
    const state = (cur && cur.data) || { p: {} };
    const next = applyPing(state, msg, now);
    if (!next) return json({ error: 'Bad heartbeat.' }, 400);
    const res = cur && cur.etag ? await store.setJSON(KEY, next, { onlyIfMatch: cur.etag }) : await store.setJSON(KEY, next, { onlyIfNew: true });
    if (!res || res.modified !== false) return json(view(next, now, msg.id));
  }
  const state = (await store.get(KEY, { type: 'json' })) || { p: {} };
  return json(view(state, now, msg.id));
};

const json = (b, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

export const config = { path: '/api/lobby' };
