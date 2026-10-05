// Scrap Duel accounts: a nickname + PIN, used to keep progress (XP, garage style,
// blueprints, settings) across devices. Stored in Netlify Blobs; PINs are salted and
// hashed with PBKDF2 and never stored or returned in plain text.
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/account-core.mjs';

export default async req => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Send JSON.' }, 400);
  }
  const store = getStore({ name: 'scrap-duel-accounts', consistency: 'strong' });
  const res = await handle(body, {
    get: k => store.get(k, { type: 'json' }),
    set: (k, v) => store.setJSON(k, v)
  });
  return json(res.body, res.status);
};

const json = (b, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

export const config = { path: '/api/account' };
