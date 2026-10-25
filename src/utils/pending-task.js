/** Serializes user-triggered tasks and fences late completions across session resets. */

import { createRequestGate } from './request-gate.js';

/**
 * Runs at most one task and always clears its feedback after success or failure.
 * A reset permits new work immediately; an old task cannot clear that newer status.
 *
 * @param {Function} onChange - Receives the current pending label, or empty on completion.
 * @returns {object} run(label, task), pending(), and reset() helpers.
 */
export function createPendingTask(onChange) {
  const gate = createRequestGate();
  let pending = false;
  return {
    pending: () => pending,
    run: async (label, task) => {
      const ticket = gate.begin();
      if (!ticket) return;
      pending = true;
      onChange(label);
      try {
        return await task(() => gate.isCurrent(ticket));
      } finally {
        if (gate.isCurrent(ticket)) {
          gate.finish(ticket);
          pending = false;
          onChange('');
        }
      }
    },
    reset: () => {
      gate.invalidate();
      pending = false;
      onChange('');
    },
  };
}
