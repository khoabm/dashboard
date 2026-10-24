/** Fences asynchronous board requests across authentication boundaries. */

/**
 * Creates one in-flight slot per session generation without blocking the next session.
 * Invalidated tickets can neither commit results nor release a newer request's slot.
 *
 * @returns {object} Ticket creation, validation, completion, and invalidation helpers.
 */
export function createRequestGate() {
  let generation = 0,
    active = null;
  return {
    generation: () => generation,
    begin: () => {
      if (active) return null;
      active = { generation };
      return active;
    },
    isCurrent: (ticket) => ticket?.generation === generation && ticket === active,
    finish: (ticket) => {
      if (ticket === active) active = null;
    },
    invalidate: () => {
      generation++;
      active = null;
    },
  };
}
