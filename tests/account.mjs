// Account logic tests with an in-memory store (no network, no Netlify needed).
import assert from 'node:assert/strict';
import { handle, MAX_FAILS } from '../netlify/lib/account-core.mjs';

const mem = new Map();
const store = { get: async k => (mem.has(k) ? structuredClone(mem.get(k)) : null), set: async (k, v) => void mem.set(k, structuredClone(v)) };
let passed = 0;
const test = async (n, f) => { await f(); passed++; console.log('PASS ' + n); };

await test('register creates an account and never stores the PIN', async () => {
  const r = await handle({ action: 'register', name: 'Mike', pin: '1234', data: { 'sd.prog': '{"xp":5}', 'evil': 'x' } }, store);
  assert.equal(r.status, 200); assert(r.body.token);
  const raw = JSON.stringify([...mem.values()]);
  assert(!raw.includes('"1234"')); assert(!raw.includes(r.body.token)); assert(!raw.includes('evil'));
});
await test('nicknames are unique regardless of case and spacing', async () => {
  assert.equal((await handle({ action: 'register', name: ' mike ', pin: '9999' }, store)).status, 409);
});
await test('validation rejects bad nicknames and PINs', async () => {
  assert.equal((await handle({ action: 'register', name: 'x', pin: '1234' }, store)).status, 400);
  assert.equal((await handle({ action: 'register', name: 'Valid', pin: '12' }, store)).status, 400);
  assert.equal((await handle({ action: 'register', name: '<script>', pin: '1234' }, store)).status, 400);
});
await test('login with the right PIN returns the saved data', async () => {
  const r = await handle({ action: 'login', name: 'MIKE', pin: '1234' }, store);
  assert.equal(r.status, 200); assert.equal(r.body.name, 'Mike'); assert.equal(r.body.data['sd.prog'], '{"xp":5}');
});
await test('save and load round-trip only synced keys', async () => {
  const { body: { token } } = await handle({ action: 'login', name: 'Mike', pin: '1234' }, store);
  assert.equal((await handle({ action: 'save', name: 'Mike', token, data: { 'sd.style': '{"livery":"gold"}', 'sd.tips': '[]' } }, store)).status, 200);
  const l = await handle({ action: 'load', name: 'mike', token }, store);
  assert.deepEqual(l.body.data, { 'sd.style': '{"livery":"gold"}' });
  assert.equal((await handle({ action: 'load', name: 'Mike', token: 'nope' }, store)).status, 401);
});
await test('wrong PINs lock the account for a while', async () => {
  await handle({ action: 'register', name: 'Lock', pin: '1111' }, store);
  let r;
  for (let i = 0; i < MAX_FAILS; i++) r = await handle({ action: 'login', name: 'Lock', pin: '0000' }, store, 1000);
  assert.equal(r.status, 401);
  assert.equal((await handle({ action: 'login', name: 'Lock', pin: '1111' }, store, 2000)).status, 429);
  assert.equal((await handle({ action: 'login', name: 'Lock', pin: '1111' }, store, 1000 + 11 * 60000)).status, 200);
});
await test('logout invalidates only that token', async () => {
  const a = (await handle({ action: 'login', name: 'Mike', pin: '1234' }, store)).body.token;
  const b = (await handle({ action: 'login', name: 'Mike', pin: '1234' }, store)).body.token;
  await handle({ action: 'logout', name: 'Mike', token: a }, store);
  assert.equal((await handle({ action: 'load', name: 'Mike', token: a }, store)).status, 401);
  assert.equal((await handle({ action: 'load', name: 'Mike', token: b }, store)).status, 200);
});
console.log(`\n${passed} account tests passed.`);
