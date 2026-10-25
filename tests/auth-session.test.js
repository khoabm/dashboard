/** Verifies tab persistence and server authorization without live network or real credentials. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createTabAuthOptions, verifyAdminSession } from '../src/services/auth-session.js';

globalThis.fetch = () => {
  throw Error('Live network is forbidden in offline regression');
};
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    throw Error('Auth must not access localStorage');
  },
});

/** Returns an isolated storage adapter backed only by synthetic test data. */
function tabStorage() {
  const entries = new Map();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
}

test('SDK options survive reload, isolate independent tabs and never fall back to localStorage', () => {
  const storage = tabStorage();
  const first = createTabAuthOptions('project', () => storage);
  const reloaded = createTabAuthOptions('project', () => storage);
  assert.equal(first.persistSession, true);
  assert.equal(first.storage, storage);
  assert.equal(first.storageKey, reloaded.storageKey);
  assert.notEqual(first.storageKey, createTabAuthOptions('project', tabStorage).storageKey);
  assert.notEqual(
    first.storageKey,
    createTabAuthOptions('other-project', () => storage).storageKey,
  );
  for (const unavailable of [
    () => undefined,
    () => {
      throw Error('Storage access denied');
    },
    () => ({
      getItem: () => null,
      setItem: () => {
        throw Error('Storage write denied');
      },
    }),
  ]) {
    const fallback = createTabAuthOptions('project', unavailable);
    assert.equal(fallback.persistSession, false);
    assert.equal(fallback.storage, undefined);
  }
});

test('real SDK restores in the same tab, signs out without resurrection, and keeps other tabs anonymous', async () => {
  const storage = tabStorage();
  const namespace = 'https://session-regression.invalid';
  const user = { id: '00000000-0000-4000-8000-000000000001', app_metadata: {}, user_metadata: {} };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  // This token is generated from synthetic claims, never issued by an Auth server.
  const access = `${encode({ alg: 'HS256' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.synthetic`;
  let refreshes = 0;
  const transport = async (input) => {
    assert.ok(String(input).startsWith(`${namespace}/auth/v1/`));
    if (String(input).includes('grant_type=refresh_token')) refreshes++;
    return new Response(
      JSON.stringify(
        String(input).includes('/token')
          ? {
              access_token: access,
              refresh_token: 'synthetic-only',
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
  const make = (tab = storage) => {
    const client = createClient(namespace, 'synthetic-publishable-key', {
      auth: createTabAuthOptions(namespace, () => tab),
      global: { fetch: transport },
    });
    clients.push(client);
    return client;
  };
  try {
    const client = make();
    assert.equal(
      (await client.auth.signInWithPassword({ email: 'qa@example.invalid', password: 'synthetic' }))
        .error,
      null,
    );
    const reloaded = make();
    assert.equal((await reloaded.auth.getSession()).data.session.user.id, user.id);
    assert.equal((await make(tabStorage()).auth.getSession()).data.session, null);
    await client.auth.stopAutoRefresh();
    await reloaded.auth.stopAutoRefresh();
    const key = createTabAuthOptions(namespace, () => storage).storageKey;
    const expired = JSON.parse(storage.getItem(key));
    expired.expires_at = Math.floor(Date.now() / 1000) - 1;
    storage.setItem(key, JSON.stringify(expired));
    const recovered = make();
    assert.equal((await recovered.auth.getSession()).data.session.user.id, user.id);
    assert.equal(refreshes, 1);
    assert.equal((await recovered.auth.signOut()).error, null);
    assert.equal((await make().auth.getSession()).data.session, null);
    assert.equal(
      [...storage.entries.keys()].some((key) => key.endsWith('-user')),
      false,
    );
  } finally {
    await Promise.all(clients.map((client) => client.auth.stopAutoRefresh()));
  }
});

/**
 * Builds a server verification fixture with independently controllable identity and profile responses.
 * @param {object} options - Session, user and profile responses for this case.
 * @returns {object} The client and observed server calls.
 */
function verificationClient({
  session = { user: { id: 'stored-user', user_metadata: { role: 'admin' } } },
  user = { id: 'stored-user' },
  profiles = [],
  sessionError = null,
  userError = null,
  profileError = null,
} = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      getSession: async () => ({ data: { session }, error: sessionError }),
      getUser: async () => {
        calls.push('user');
        return { data: { user }, error: userError };
      },
    },
    from: (table) => {
      assert.equal(table, 'admin_profiles');
      return {
        select: () => ({
          eq: async (column, value) => {
            calls.push({ column, value });
            return { data: profiles, error: profileError };
          },
        }),
      };
    },
  };
}

test('anonymous startup skips server identity/profile calls', async () => {
  const db = verificationClient({ session: null });
  assert.equal(await verifyAdminSession(db), null);
  assert.deepEqual(db.calls, []);
});

test('stored admin claims cannot grant access without an active server admin profile', async () => {
  for (const profiles of [
    [],
    [{ active: false, role: 'admin' }],
    [{ active: true, role: 'viewer' }],
  ]) {
    const db = verificationClient({ profiles });
    assert.equal(await verifyAdminSession(db), null);
    assert.deepEqual(db.calls, ['user', { column: 'user_id', value: 'stored-user' }]);
  }
  assert.deepEqual(
    await verifyAdminSession(verificationClient({ profiles: [{ active: true, role: 'admin' }] })),
    { userId: 'stored-user' },
  );
});

test('invalid identity, mismatched user and session/profile network failures cannot enable admin', async () => {
  for (const options of [
    { sessionError: Error('Recovery failed') },
    { userError: Error('Verification unavailable') },
    { user: null },
    { user: { id: 'another-user' } },
    { profileError: Error('Profile unavailable') },
  ]) {
    await assert.rejects(verifyAdminSession(verificationClient(options)));
  }
});
