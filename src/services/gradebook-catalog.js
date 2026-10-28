/** Loads teacher catalogs through the verified administrator request boundary. */
import { requestGradebookAdmin } from './gradebook-admin.js';

/** Binds the requested workspace class; server authorization remains authoritative. */
export function createTeacherCatalog(request = requestGradebookAdmin) {
  return ({ classId, signal } = {}) => request({ op: 'catalog.read', classId }, { signal });
}

export const loadTeacherCatalog = createTeacherCatalog();
