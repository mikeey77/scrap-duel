import assert from 'node:assert/strict';
import { applyPing, view, STALE_MS } from '../netlify/lib/lobby-core.mjs';
let passed = 0;
const test = (n, f) => { f(); passed++; console.log('PASS ' + n); };
test('heartbeats count players and expire stale ones', () => {
  let s = { p: {} };
  s = applyPing(s, { id: 'aaaaaaaa1' }, 1000);
  s = applyPing(s, { id: 'bbbbbbbb2' }, 2000);
  assert.equal(view(s, 3000).online, 2);
  assert.equal(view(s, 1000 + STALE_MS + 1).online, 1);
});
test('public rooms are listed, sanitized and hidden from their own host', () => {
  let s = applyPing({ p: {} }, { id: 'hosthost1', v: 9, room: { code: 'AB12', name: '<b>Mike</b>', rounds: 25 } }, 1000);
  s = applyPing(s, { id: 'guestguest' }, 1000);
  const v = view(s, 1500, 'guestguest');
  assert.deepEqual(v.rooms, [{ code: 'AB12', name: 'bMike/b', rounds: 25, v: 9 }]);
  assert.equal(view(s, 1500, 'hosthost1').rooms.length, 0);
  s = applyPing(s, { id: 'hosthost1', room: null }, 2000);
  assert.equal(view(s, 2500).rooms.length, 0);
});
test('bad ids and room codes are rejected, bye removes a player', () => {
  assert.equal(applyPing({ p: {} }, { id: 'x' }, 1), null);
  let s = applyPing({ p: {} }, { id: 'hosthost1', room: { code: 'bad!', rounds: 7 } }, 1);
  assert.equal(view(s, 2).rooms.length, 0);
  s = applyPing(s, { id: 'hosthost1', bye: true }, 3);
  assert.equal(view(s, 4).online, 0);
});
console.log(`\n${passed} lobby tests passed.`);
