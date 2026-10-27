/** Uses the verified Board session without SDK refreshes or private-table browser access. */
import { AdminError } from '../utils/gradebook-admin.js';
import { adminRequest, adminPayload } from '../utils/gradebook-admin-responses.js';
import { requestGradebook } from './gradebook-transport.js';

/** Injects transport/session ownership; production never supplies synthetic data. */
export function createGradebookAdmin({ transport = requestGradebook, session = () => null } = {}) {
  return async (body, { signal } = {}) => {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    try {
      const input = adminRequest(body),
        owner = session();
      if (
        !owner ||
        typeof owner.token !== 'string' ||
        !Number.isSafeInteger(owner.expiresAt) ||
        owner.expiresAt * 1000 <= Date.now()
      )
        throw new AdminError(401, 'session');
      const { status, payload } = await transport('grades-admin', input, {
        signal,
        token: owner.token,
      });
      const current = session();
      if (
        signal?.aborted ||
        !current ||
        current.generation !== owner.generation ||
        current.token !== owner.token ||
        current.expiresAt * 1000 <= Date.now()
      )
        throw new DOMException('Cancelled', 'AbortError');
      const value = adminPayload(input, payload);
      if (status === 422 && input.op.endsWith('.preview') && value.counts.error > 0) {
        const error = new AdminError(422, 'preview');
        error.payload = value;
        throw error;
      }
      if (status !== 200) throw new AdminError(status, 'unavailable');
      return value;
    } catch (error) {
      if (error?.name === 'AbortError' || error instanceof AdminError) throw error;
      throw new AdminError(
        [400, 401, 403, 409, 413, 415, 422, 429, 503].includes(error?.status) ? error.status : 503,
        'unavailable',
      );
    }
  };
}

export const requestGradebookAdmin = createGradebookAdmin();
