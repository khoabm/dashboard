/** Synthetic Remember Me persistence tests; no live Auth credentials or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
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

test('real Supabase SDK restores remembered login in another tab and clears it after sign-out', async () => {
  const namespace = 'https://remember-qa.invalid';
  const local = memoryStorage();
  const clock = { time: Date.now() };
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    app_metadata: {},
    user_metadata: {},
  };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256' })}.${encode({
    sub: user.id,
    exp: Math.floor(clock.time / 1000) + 3600,
  })}.synthetic`;
  const network = async (input) => {
    const url = String(input);
    assert.ok(url.startsWith(`${namespace}/auth/v1/`));
    if (url.includes('/logout')) return new Response(null, { status: 204 });
    return new Response(
      JSON.stringify(
        url.includes('/token')
          ? {
              access_token: accessToken,
              refresh_token: 'synthetic-refresh-only',
              token_type: 'bearer',
              expires_in: 3600,
              user,
            }
          : user,
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
  const clients = [];
  const make = () => {
    const options = createRememberedAuthOptions(namespace, {
      local: () => local,
      tab: () => memoryStorage(),
      now: () => clock.time,
    });
    const client = createClient(namespace, 'synthetic-publishable-key', {
      auth: options.options,
      global: { fetch: network },
    });
    clients.push(client);
    return { client, options };
  };

  try {
    const first = make();
    assert.equal(
      (await first.client.auth.signInWithPassword({
        email: 'qa@example.invalid',
        password: 'synthetic-only',
      })).error,
      null,
    );
    assert.equal(first.options.select(true), true);
    const reopened = make();
    assert.equal((await reopened.client.auth.getSession()).data.session.user.id, user.id);
    assert.equal(reopened.options.remember(), true);
    assert.equal((await reopened.client.auth.signOut()).error, null);
    const afterSignout = make();
    assert.equal((await afterSignout.client.auth.getSession()).data.session, null);
  } finally {
    await Promise.all(clients.map((client) => client.auth.stopAutoRefresh()));
  }
});
