/** Verifies duplicate suppression, failure recovery, and late completion ownership offline. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingTask } from '../src/utils/pending-task.js';

test('repeated actions while a response is held send only one task and keep feedback until settled', async () => {
  const response = Promise.withResolvers();
  const labels = [];
  let calls = 0;
  const action = createPendingTask((label) => labels.push(label));
  const task = () => {
    calls++;
    return response.promise;
  };
  const first = action.run('Reordering', task);
  await action.run('Repeated click', task);
  assert.equal(calls, 1);
  assert.equal(action.pending(), true);
  assert.deepEqual(labels, ['Reordering']);
  response.resolve('Saved');
  assert.equal(await first, 'Saved');
  assert.equal(action.pending(), false);
  assert.deepEqual(labels, ['Reordering', '']);
});

test('synchronous and asynchronous failures clear feedback and permit a successful retry', async () => {
  const labels = [];
  const action = createPendingTask((label) => labels.push(label));
  await assert.rejects(
    action.run('Saving', () => {
      throw Error('Validation failed');
    }),
    /Validation/,
  );
  assert.equal(action.pending(), false);
  await assert.rejects(
    action.run('Saving', async () => {
      throw Error('Backend failed');
    }),
    /Backend/,
  );
  assert.equal(action.pending(), false);
  assert.equal(await action.run('Retrying', async () => 42), 42);
  assert.deepEqual(labels, ['Saving', '', 'Saving', '', 'Retrying', '']);
});

test('SIGNED_OUT reset permits new work and an old completion cannot clear the new status or start its refresh', async () => {
  const oldResponse = Promise.withResolvers(),
    newResponse = Promise.withResolvers();
  const labels = [];
  let staleRefreshes = 0;
  const action = createPendingTask((label) => labels.push(label));
  const old = action.run('Old save', async (isCurrent) => {
    await oldResponse.promise;
    if (isCurrent()) staleRefreshes++;
  });
  action.reset();
  const next = action.run('New operation', () => newResponse.promise);
  oldResponse.resolve();
  await old;
  assert.equal(staleRefreshes, 0);
  assert.equal(action.pending(), true);
  assert.deepEqual(labels, ['Old save', '', 'New operation']);
  newResponse.resolve();
  await next;
  assert.equal(action.pending(), false);
  assert.deepEqual(labels, ['Old save', '', 'New operation', '']);
});
