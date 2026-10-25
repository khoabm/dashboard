/** Renders shared pulse feedback without reporting unconfirmed work as successful. */

import { el } from '../utils/dom.js';

/**
 * Creates a live status region; callers update it with setPendingMessage.
 *
 * @param {string} message - Pending work to describe, or empty to hide the region.
 * @returns {HTMLElement} The pulse indicator and its readable label.
 */
export function PulseIndicator(message = '') {
  const root = el('div', { class: 'pending-indicator', role: 'status', 'aria-live': 'polite' });
  setPendingMessage(root, message);
  return root;
}

/**
 * Shows pending work or clears it after completion, failure, or cancellation.
 *
 * @param {HTMLElement} root - A PulseIndicator region.
 * @param {string} message - Current work, or empty to clear the indicator.
 */
export function setPendingMessage(root, message = '') {
  root.hidden = !message;
  if (root.dataset.message === message) return;
  root.dataset.message = message;
  root.replaceChildren(
    ...(message
      ? [el('span', { class: 'pulse-dot', 'aria-hidden': 'true' }), el('span', {}, message)]
      : []),
  );
}
