/** Synthetic Remember Me persistence tests; no live Auth credentials or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRememberedAuthOptions } from '../src/services/auth-session.js';

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
const DAY = 86_400_000;
const optionsFor = (local, tab, clock) =>
  createRememberedAuthOptions('test-project', {
    local: () => local,
    tab: () => tab,
    now: () => clock.time,
  });

test('remember opt-in persists SDK token, renews only after 24h and expires after 30d offline', () => {
  const local = memoryStorage();
  const clock = { time: 100 * DAY };
  const first = optionsFor(local, memoryStorage(), clock);
  first.options.storage.setItem(first.options.storageKey, 'synthetic-session');
  assert.equal(first.remember(), false);
  assert.equal(first.select(true), true);
  assert.equal(first.remember(), true);
  assert.equal(first.options.storage.getItem(first.options.storageKey), 'synthetic-session');
  assert.equal(
    optionsFor(local, memoryStorage(), clock).options.storage.getItem('different-tab-key'),
    'synthetic-session',
  );
  const key = 'khtn8:remember-admin:test-project';
  const initial = local.getItem(key);
  clock.time += DAY - 1;
  assert.equal(first.renew(), true);
  assert.equal(local.getItem(key), initial);
  clock.time += 1;
  assert.equal(first.renew(), true);
  assert.notEqual(local.getItem(key), initial);
  clock.time += 30 * DAY + 1;
  const expired = optionsFor(local, memoryStorage(), clock);
  assert.equal(expired.remember(), false);
  assert.equal(expired.options.storage.getItem('different-tab-key'), null);
  assert.equal(first.options.storage.getItem(first.options.storageKey), null);
  assert.equal(local.getItem('khtn8:remember-token:test-project'), null);
});

test('opt-out migrates current token back to tab then clears persistent copy', () => {
  const local = memoryStorage();
  const tab = memoryStorage();
  const clock = { time: 100 * DAY };
  const record = optionsFor(local, tab, clock);
  record.options.storage.setItem(record.options.storageKey, 'current-session');
  record.select(true);
  record.options.storage.setItem(record.options.storageKey, 'refreshed-session');
  record.select(false);
  assert.equal(record.remember(), false);
  assert.equal(record.options.storage.getItem(record.options.storageKey), 'refreshed-session');
  assert.equal(
    optionsFor(local, memoryStorage(), clock).options.storage.getItem('other-tab'),
    null,
  );
});

test('signOut removeItem clears both stores and blocked local storage falls back to tab', () => {
  const local = memoryStorage();
  const tab = memoryStorage();
  const clock = { time: 100 * DAY };
  const record = optionsFor(local, tab, clock);
  record.options.storage.setItem(record.options.storageKey, 'token');
  record.select(true);
  record.options.storage.removeItem(record.options.storageKey);
  assert.equal(local.getItem('khtn8:remember-token:test-project'), null);
  const blocked = createRememberedAuthOptions('test-project', {
    local: () => {
      throw Error('blocked');
    },
    tab: () => tab,
  });
  assert.equal(blocked.select(true), false);
  assert.equal(blocked.remember(), false);
});
