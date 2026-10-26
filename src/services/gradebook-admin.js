/** Production CP03 boundary: accepts the B4 operation shape but never sends a hosted request. */
import { AdminError } from '../utils/gradebook-admin.js';

/** Fails locally until CP01-C integration; future transport must pass structured 422 preview bodies as error.payload. */
export async function requestGradebookAdmin(body, { signal } = {}) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  throw new AdminError(503, 'unavailable');
}
