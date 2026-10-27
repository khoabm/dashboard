/** Exercises only route selection, B1 form contracts and disposable state; no HTTP/SDK integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { routes, routeFor, validateLookup, createLookupState } from '../src/utils/gradebook-ui.js';
import { fixtureContext } from './student-gradeboard-data.js';
import { createAdminEntry, createRouteNavigation } from '../src/utils/app-navigation.js';
const clock = () => Date.UTC(2026, 9, 26);
const valid = { documentNumber: '000000009', birthDate: '29/02/2000' };

test('REV-001 admin entry waits for the existing restoration and coalesces duplicate entry intent', async () => {
  const held = Promise.withResolvers();
  const session = { active: true, checking: true, failed: false, admin: false, generation: 1 };
  let logins = 0,
    notices = 0,
    waits = 0;
  const enter = createAdminEntry({
    ready: () => {
      waits++;
      return held.promise;
    },
    state: () => session,
    login: () => logins++,
    notify: () => notices++,
  });
  const pending = enter();
  await enter();
  assert.equal(logins, 0);
  assert.equal(notices, 0);
  Object.assign(session, { checking: false, admin: true });
  held.resolve();
  await pending;
  assert.deepEqual({ logins, notices, waits }, { logins: 0, notices: 1, waits: 1 });
});

test('REV-001 anonymous entry opens login; failed/loading sessions do not; inactive/stale intent is ignored', async () => {
  for (const variant of ['anonymous', 'failed', 'checking', 'inactive', 'stale']) {
    const session = { active: true, checking: false, failed: false, admin: false, generation: 1 };
    let logins = 0,
      notices = 0;
    const enter = createAdminEntry({
      ready: async () => {
        if (variant === 'stale') session.generation++;
        else if (variant === 'inactive') session.active = false;
        else if (variant !== 'anonymous') session[variant] = true;
      },
      state: () => session,
      login: () => logins++,
      notify: () => notices++,
    });
    await enter();
    assert.equal(logins, variant === 'anonymous' ? 1 : 0, variant);
    assert.equal(notices, ['failed', 'checking'].includes(variant) ? 1 : 0, variant);
  }
});

/** Models browser entries/traversals without a DOM or endpoint; go completion is explicitly delivered. */
function navigationFixture() {
  const entries = [{ path: '/', state: { unrelated: 'preserved' } }];
  const shown = [],
    deltas = [];
  let cursor = 0,
    allowed = true,
    guards = 0;
  const location = {
    get pathname() {
      return entries[cursor].path;
    },
  };
  const history = {
    get state() {
      return entries[cursor].state;
    },
    replaceState(state, _, path) {
      entries[cursor] = { state, path };
    },
    pushState(state, _, path) {
      entries.splice(++cursor, Infinity, { state, path });
    },
    go(delta) {
      deltas.push(delta);
    },
  };
  const navigation = createRouteNavigation({
    history,
    location,
    initialPath: '/',
    newScope: () => 'synthetic-history',
    prepare: async (target) => {
      guards++;
      return typeof allowed === 'function' ? allowed(target) : allowed;
    },
    show: async (path) => shown.push(path),
  });
  return {
    navigation,
    entries,
    shown,
    deltas,
    history,
    location,
    guards: () => guards,
    allow(value) {
      allowed = value;
    },
    pop(index) {
      cursor = index;
      return navigation.pop(history.state);
    },
    recover() {
      cursor += deltas.at(-1);
      return navigation.pop(history.state);
    },
  };
}

test('REV-002 rejected Back restores the existing entry repeatedly; successful Back/Forward retain their targets', async () => {
  const f = navigationFixture();
  assert.equal(f.history.state.unrelated, 'preserved');
  await f.navigation.navigate(routes.student);
  await f.navigation.navigate('/');
  f.allow(false);
  for (let attempt = 0; attempt < 2; attempt++) {
    const guards = f.guards();
    assert.equal(await f.pop(1), false);
    assert.equal(f.deltas.at(-1), 1);
    await f.recover();
    assert.equal(f.location.pathname, '/');
    assert.equal(f.entries.length, 3);
    assert.equal(f.guards(), guards + 1);
    assert.deepEqual(f.shown, [routes.student, '/']);
  }
  f.allow(true);
  await f.pop(1);
  assert.equal(f.shown.at(-1), routes.student);
  await f.pop(2);
  assert.equal(f.shown.at(-1), '/');
  assert.deepEqual(
    f.entries.map((entry) => entry.path),
    ['/', routes.student, '/'],
  );
});

test('REV-002 rejected Forward compensates backward; failed link exits neither add history nor render', async () => {
  const f = navigationFixture();
  await f.navigation.navigate(routes.student);
  await f.pop(0);
  f.allow(false);
  await f.pop(1);
  assert.equal(f.deltas.at(-1), -1);
  await f.recover();
  const renders = f.shown.length;
  assert.equal(await f.navigation.navigate(routes.student), false);
  assert.equal(f.entries.length, 2);
  assert.equal(f.location.pathname, '/');
  assert.equal(f.shown.length, renders);
});

test('REV-002 latest rapid traversal owns rollback while pending persistence cannot change visible route', async () => {
  const f = navigationFixture();
  await f.navigation.navigate(routes.student);
  await f.navigation.navigate('/');
  const held = Promise.withResolvers();
  f.allow(() => held.promise);
  const first = f.pop(1);
  const latest = f.pop(0);
  await Promise.resolve();
  held.resolve(false);
  await Promise.all([first, latest]);
  assert.deepEqual(f.deltas, [2]);
  await f.recover();
  assert.equal(f.location.pathname, '/');
  assert.equal(f.entries.length, 3);
  assert.deepEqual(f.shown, [routes.student, '/']);
});

test('REV-002 a stay-on-Board approval cannot authorize a superseding exit with blocked persistence', async () => {
  const f = navigationFixture();
  await f.navigation.navigate(routes.student);
  await f.navigation.navigate('/');
  f.allow((target) => target === '/');
  const stay = f.pop(0);
  const exit = f.pop(1);
  await Promise.all([stay, exit]);
  assert.deepEqual(f.deltas, [1]);
  await f.recover();
  assert.equal(f.location.pathname, '/');
  assert.deepEqual(f.shown, [routes.student, '/']);
  assert.equal(f.entries.length, 3);
});

test('CP02 routes select Board, student and reserved admin paths without exposing admin navigation', () => {
  assert.deepEqual(routes, {
    board: '/',
    student: '/personal-gradebook',
    admin: '/personal-gradebook/admin',
  });
  assert.equal(routeFor('/'), 'board');
  assert.equal(routeFor('/personal-gradebook'), 'student');
  assert.equal(routeFor('/personal-gradebook/'), 'student');
  assert.equal(routeFor('/personal-gradebook/admin'), 'admin');
  assert.equal(routeFor('/bang-diem'), 'missing');
  assert.equal(routeFor('/personal-gradebook-other'), 'missing');
});

test('CP02 identity remains a string with leading zeros and rejects non-ASCII/length violations', () => {
  assert.deepEqual(validateLookup(valid, clock).value, {
    documentNumber: '000000009',
    birthDate: '2000-02-29',
  });
  for (const documentNumber of [
    '12345678',
    '1234567890123',
    '００００００００９',
    '00000000a',
    ' 000000009',
    123456789,
  ]) {
    assert.ok(validateLookup({ ...valid, documentNumber }, clock).errors.documentNumber);
  }
});

test('CP02 date-only validation enforces leap years, impossible/future dates and Vietnam reference', () => {
  for (const birthDate of [
    '29/02/1900',
    '31/04/2000',
    '29/02/2100',
    '27/10/2026',
    '2000-02-29',
    '1/1/2000',
  ]) {
    assert.ok(validateLookup({ ...valid, birthDate }, clock).errors.birthDate);
  }
  assert.equal(
    validateLookup({ ...valid, birthDate: '26/10/2026' }, clock).value.birthDate,
    '2026-10-26',
  );
});

test('CP02 invalid input invokes no adapter; errors expose no credential payload', async () => {
  let calls = 0;
  const state = createLookupState({
    clock,
    verify: async () => {
      calls++;
    },
  });
  await state.submit({ documentNumber: 'private-invalid-value', birthDate: 'invalid' });
  assert.equal(calls, 0);
  assert.equal(state.snapshot().status, 'invalid');
  assert.doesNotMatch(JSON.stringify(state.snapshot()), /private-invalid-value/);
  state.dispose();
});

test('CP02 route exit aborts pending work and a late result cannot update a disposed view', async () => {
  const held = Promise.withResolvers();
  let signal,
    renders = 0;
  const state = createLookupState({
    clock,
    verify: async (_, options) => {
      signal = options.signal;
      return held.promise;
    },
    onChange: () => renders++,
  });
  const pending = state.submit(valid);
  state.dispose();
  assert.equal(signal.aborted, true);
  held.resolve({ kind: 'verified', capability: 'synthetic-only', expiresAt: clock() / 1000 + 5 });
  await pending;
  assert.equal(renders, 1);
  assert.deepEqual(state.snapshot(), { status: 'disposed', errors: {} });
});

test('CP02 reset/new verification fences old results; expiry drops memory-only capability state', async () => {
  const held = Promise.withResolvers();
  let now = clock(),
    calls = 0;
  const timers = [];
  const state = createLookupState({
    clock: () => now,
    setTimer: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    clearTimer: () => {},
    verify: async () =>
      ++calls === 1
        ? held.promise
        : {
            kind: 'verified',
            capability: 'synthetic-only',
            expiresAt: now / 1000 + 2,
            context: fixtureContext(),
          },
  });
  const old = state.submit(valid);
  state.reset();
  await state.submit(valid);
  held.resolve({ kind: 'neutral' });
  await old;
  assert.equal(state.snapshot().status, 'verified');
  assert.doesNotMatch(JSON.stringify(state.snapshot()), /synthetic-only|000000009|2000-02-29/);
  now += 3000;
  state.checkExpiry();
  assert.deepEqual(state.snapshot(), { status: 'expired', errors: {} });
  state.reset();
  assert.equal(state.snapshot().status, 'idle');
  state.dispose();
});

test('CP02 failures remain neutral/unavailable with no automatic retry or backend diagnostics', async () => {
  for (const kind of ['neutral', 'limited', 'unavailable']) {
    let calls = 0;
    const state = createLookupState({
      clock,
      verify: async () => {
        calls++;
        return { kind, rawDiagnostics: 'private details' };
      },
    });
    await state.submit(valid);
    assert.equal(calls, 1);
    assert.equal(state.snapshot().status, kind);
    assert.doesNotMatch(JSON.stringify(state.snapshot()), /private details/);
    state.dispose();
  }
});

test('V2 birthday calendar stays Gregorian, string-based and Vietnam-day bounded', async () => {
  const { monthLength, calendarWeekday, typedBirthday, shiftCalendarDay } = await import(
    '../src/utils/birth-calendar.js'
  );
  assert.equal(monthLength(2000, 2), 29);
  assert.equal(monthLength(1900, 2), 28);
  assert.equal(calendarWeekday(2000, 2, 29), 2);
  assert.equal(typedBirthday('29/02/2000', clock), '2000-02-29');
  for (const value of ['31/02/2000', '29/02/1900', '2/3/2000', '2000-02-29', '27/10/2026'])
    assert.equal(typedBirthday(value, clock), null);
  assert.equal(shiftCalendarDay('2000-03-01', -1), '2000-02-29');
  assert.equal(shiftCalendarDay('1900-02-28', 1), '1900-03-01');
  assert.equal(
    typedBirthday('27/10/2026', () => Date.UTC(2026, 9, 26, 17)),
    '2026-10-27',
  );
  assert.equal(typedBirthday('', clock), null);
});
