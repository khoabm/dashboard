/** Fixes the two explicitly authorized lifetime identities; no generated names or replenishment. */
export const legacyBudgetName = 'approved-synthetic-mvp-v1';
export const pilotBudgetName = 'approved-synthetic-v2-pilot-v1';
export const pilotReservationLimit = 5;
/** Returns a finite server-owned policy, never a client-selected allowance. */
export function assistantBudgetPolicy(name) {
  if (name === legacyBudgetName) return { name, limit: 3, prefix: '' };
  if (name === pilotBudgetName) return { name, limit: pilotReservationLimit, prefix: '/pilot' };
  return null;
}
