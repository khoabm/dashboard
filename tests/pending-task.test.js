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

/** Supplies only DOM operations used by feedback/header components; no transport or Auth simulation. */
function feedbackDom(t) {
  class Element {
    constructor(tag = '') {
      this.tag = tag;
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.listeners = {};
      this.classList = {
        add: (...names) => {
          this.className = [this.className || '', ...names].join(' ').trim();
        },
      };
    }
    setAttribute(key, value) {
      this.attributes[key] = value;
    }
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    }
    append(...children) {
      this.children.push(...children);
    }
    replaceChildren(...children) {
      this.children = children;
    }
    querySelector(selector) {
      const matches = (node) =>
        selector.startsWith('.')
          ? node.className?.split(' ').includes(selector.slice(1))
          : node.tag === selector;
      for (const child of this.children) {
        if (matches(child)) return child;
        const nested = child.querySelector?.(selector);
        if (nested) return nested;
      }
      return null;
    }
    get textContent() {
      return this.children.map((child) => child.textContent).join('');
    }
  }
  const previousDocument = globalThis.document,
    previousNode = globalThis.Node;
  globalThis.Node = Element;
  globalThis.document = {
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => ({ textContent: String(text) }),
  };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousNode === undefined) delete globalThis.Node;
    else globalThis.Node = previousNode;
  });
}

test('pulse status is atomic, preserves literal text and clears after any terminal state', async (t) => {
  feedbackDom(t);
  const { PulseIndicator, setPendingMessage } = await import('../src/components/pending.js');
  const root = PulseIndicator();
  assert.equal(root.hidden, true);
  assert.equal(root.attributes.role, 'status');
  assert.equal(root.attributes['aria-live'], 'polite');
  assert.equal(root.attributes['aria-atomic'], 'true');
  setPendingMessage(root, '<b>Reading</b>');
  assert.equal(root.hidden, false);
  assert.equal(root.textContent, '<b>Reading</b>');
  const label = root.children[1];
  setPendingMessage(root, '<b>Reading</b>');
  assert.equal(root.children[1], label);
  setPendingMessage(root);
  assert.equal(root.hidden, true);
  assert.equal(root.textContent, '');
});

test('header keeps logout pulse outside action locks, suppresses duplicates and clears on completion', async (t) => {
  feedbackDom(t);
  const { AppHeader } = await import('../src/components/app-header.js');
  const held = Promise.withResolvers();
  let calls = 0;
  const header = AppHeader({
    admin: true,
    onLogout: () => {
      calls++;
      return held.promise;
    },
  });
  const logout = header.querySelector('.header-account-logout');
  const status = header.querySelector('.header-progress');
  const first = logout.listeners.click();
  await logout.listeners.click();
  assert.equal(calls, 1);
  assert.equal(logout.disabled, true);
  assert.equal(header.attributes['aria-busy'], 'true');
  assert.equal(status.hidden, false);
  assert.ok(header.children.includes(status));
  assert.match(status.textContent, /Đang đăng xuất/);
  held.resolve();
  await first;
  assert.equal(logout.disabled, false);
  assert.equal(status.hidden, true);
  assert.equal(header.attributes['aria-busy'], 'false');
});

test('header clears logout feedback when the callback rejects or cancels without signing out', async (t) => {
  feedbackDom(t);
  const { AppHeader } = await import('../src/components/app-header.js');
  let reject = true;
  const header = AppHeader({
    admin: true,
    onLogout: async () => {
      if (reject) throw Error('failed');
    },
  });
  const logout = header.querySelector('.header-account-logout');
  await assert.rejects(logout.listeners.click(), /failed/);
  assert.equal(header.querySelector('.header-progress').hidden, true);
  assert.equal(logout.disabled, false);
  reject = false;
  await logout.listeners.click();
  assert.equal(header.querySelector('.header-progress').hidden, true);
  assert.equal(header.querySelector('.header-account').hidden, false);
});
