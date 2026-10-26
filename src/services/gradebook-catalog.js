/** Teacher catalog integration gap: B4 has no teacher catalog operation; never substitutes synthetic data. */
import { AdminError } from '../utils/gradebook-admin.js';

/** Fails locally until a separately authorized teacher catalog contract exists. */
export async function loadTeacherCatalog({ signal } = {}) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  throw new AdminError(503, 'catalog_unavailable');
}
