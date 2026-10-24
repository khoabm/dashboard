/** Keeps recoverable editor drafts in local text storage and IndexedDB file storage. */

const prefix = 'khtn8:draft:';

/**
 * Scopes a draft key to the current admin and post.
 *
 * @param {string} userId - The current user identifier.
 * @param {string} id - The post ID or new-post marker.
 * @returns {string} The local draft storage key.
 */
export function draftKey(userId, id = 'new') {
  return `${prefix}${userId}:${id}`;
}

/**
 * Persists selected text draft fields for recovery on this device.
 * File blobs are stored separately and never serialized into localStorage.
 *
 * @param {string} key - The scoped draft key.
 * @param {object} draft - The current editor fields and attachment metadata.
 */
export function saveDraft(key, draft) {
  // Explicit allowlist keeps Files, passwords and tokens out of localStorage.
  const clean = {
    id: draft.id,
    version: draft.version,
    title: draft.title,
    body: draft.body,
    section_id: draft.section_id,
    sort_order: draft.sort_order,
    status: draft.status,
    thumbnail_id: draft.thumbnail_id,
    attachment_order: draft.attachments?.map((a) => a.id),
    attachments: draft.attachments
      ?.filter((a) => !a.file)
      .map(({ id, type, external_url, storage_path, file_name, mime_type, size_bytes }) => ({
        id,
        type,
        external_url,
        storage_path,
        file_name,
        mime_type,
        size_bytes,
      })),
    saved_at: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(clean));
}

/**
 * Reads a recoverable text draft without failing on invalid local JSON.
 *
 * @param {string} key - The scoped draft key.
 * @returns {object|null} The saved draft, or null when unavailable.
 */
export function readDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

/**
 * Removes a local text draft without masking a confirmed remote save.
 *
 * @param {string} key - The scoped draft key.
 */
export const removeDraft = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Cleanup cannot turn a confirmed backend save into a reported failure. */
  }
};
// Blob drafts are isolated per admin/post and never serialized to localStorage.

/**
 * Opens the IndexedDB store used for pending attachment files.
 *
 * @returns {Promise<IDBDatabase>} The draft database connection.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('khtn8-drafts', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/**
 * Reads, writes, or removes pending file drafts in IndexedDB.
 * Omit files to read, pass null to delete, or pass files to write.
 *
 * @param {string} key - The scoped draft key.
 * @param {Array<object>|null} files - Pending attachment entries or the deletion marker.
 * @returns {Promise<*>} Stored files for reads or completion data for writes.
 */
export async function filesDraft(key, files) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('files', files === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('files');
      const r =
        files === undefined
          ? store.get(key)
          : files === null
            ? store.delete(key)
            : store.put(files, key);
      let value;
      r.onsuccess = () => (value = r.result);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Reads the complete saved attachment order without modifying either draft store.
 * Missing blobs fail recovery rather than silently replacing the saved draft with fewer files.
 *
 * @param {string} key - The scoped draft key.
 * @param {object} draft - The saved text metadata and attachment order.
 * @param {Function} readFiles - The IndexedDB reader, or an isolated regression adapter.
 * @returns {Promise<object[]>} Every saved attachment in its original order.
 * @throws {Error} When file storage fails or any promised attachment is missing.
 */
export async function recoverAttachments(key, draft, readFiles = filesDraft) {
  const storedFiles = (await readFiles(key)) || [];
  if (!Array.isArray(storedFiles) || storedFiles.some((entry) => !entry?.id || !entry.file)) {
    throw Error('Tệp nháp không đầy đủ. Bản nháp đã lưu vẫn được giữ nguyên.');
  }
  const recovered = [...(draft.attachments || []), ...storedFiles];
  const byId = new Map(recovered.map((entry) => [entry.id, entry]));
  const order = draft.attachment_order || recovered.map((entry) => entry.id);
  if (order.some((id) => !byId.has(id)) || storedFiles.some((entry) => !order.includes(entry.id))) {
    throw Error('Chưa đọc đủ tệp nháp. Bản nháp đã lưu vẫn được giữ nguyên.');
  }
  return order.map((id) => byId.get(id));
}

/**
 * Serializes draft writes after selected files settle, then reads the latest state.
 * The read callback returns null for a clean editor; failures remain retryable.
 *
 * @param {string} key - The scoped draft storage key.
 * @param {object} options - State readers and optional isolated storage adapters.
 * @param {Function} options.read - Reads the dirty draft only after file validation settles.
 * @param {Function} options.whenReady - Waits for pending file validation.
 * @param {Function} options.writeFiles - Writes pending blobs, defaulting to IndexedDB.
 * @param {Function} options.writeText - Writes text metadata, defaulting to localStorage.
 * @returns {object} save() reports durability; settled() fences cleanup after remote success.
 */
export function createDraftWriter(
  key,
  { read, whenReady, writeFiles = filesDraft, writeText = saveDraft },
) {
  let pending = Promise.resolve(true);
  return {
    save: () => {
      pending = pending.then(async () => {
        try {
          await whenReady();
          const draft = read();
          if (!draft) return true;
          const snapshot = structuredClone(draft);
          await writeFiles(
            key,
            snapshot.attachments.filter((attachment) => attachment.file),
          );
          writeText(key, snapshot);
          return true;
        } catch {
          return false;
        }
      });
      return pending;
    },
    settled: () => pending,
  };
}
