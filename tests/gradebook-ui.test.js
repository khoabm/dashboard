/** Exercises only route selection, B1 form contracts and disposable state; no HTTP/SDK integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { routes, routeFor, validateLookup, createLookupState } from '../src/utils/gradebook-ui.js';
const clock = () => Date.UTC(2026, 9, 26);
const valid = { documentNumber: '000000009', birthDate: '29/02/2000' };

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
        : { kind: 'verified', capability: 'synthetic-only', expiresAt: now / 1000 + 2 },
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
