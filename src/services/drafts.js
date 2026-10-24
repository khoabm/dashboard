/** Keeps recoverable editor drafts in local text storage and IndexedDB file storage. */

import { newId } from '../utils/id.js';

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
    files_key: draft.files_key,
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

/**
 * Resolves a snapshot pointer only within the same admin/post draft namespace.
 *
 * @param {string} key - The owning admin/post draft key.
 * @param {object|null} draft - Published metadata, including legacy drafts without a pointer.
 * @returns {string} The exact blob record key.
 * @throws {Error} When a pointer escapes the owning draft namespace.
 */
function snapshotKey(key, draft) {
  const pointer = draft?.files_key;
  if (!pointer || pointer === key) return key;
  if (typeof pointer !== 'string' || !pointer.startsWith(`${key}:files:`)) {
    throw Error('Đường dẫn tệp nháp không hợp lệ. Bản nháp vẫn được giữ nguyên.');
  }
  return pointer;
}
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
 * Omit files to read the published snapshot, pass null to delete all scoped snapshots,
 * or pass files to write an exact record. Unpublished versions survive until explicit cleanup.
 *
 * @param {string} key - The scoped draft key.
 * @param {Array<object>|null} files - Pending attachment entries or the deletion marker.
 * @returns {Promise<*>} Stored files for reads or completion data for writes.
 */
export async function filesDraft(key, files) {
  return fileRecord(files === undefined ? snapshotKey(key, readDraft(key)) : key, files);
}

/**
 * Accesses exact blob records so recovery honors the captured metadata pointer.
 *
 * @param {string} key - An exact snapshot key, or the owning key for scoped deletion.
 * @param {Array<object>|null} files - Pending entries, deletion marker, or undefined for reading.
 * @returns {Promise<*>} The record contents or transaction completion.
 */
async function fileRecord(key, files) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('files', files === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('files');
      const r =
        files === undefined
          ? store.get(key)
          : files === null
            ? store.getAllKeys()
            : store.put(files, key);
      let value;
      r.onsuccess = () => {
        if (files === null) {
          for (const storedKey of r.result) {
            if (
              storedKey === key ||
              (typeof storedKey === 'string' && storedKey.startsWith(`${key}:files:`))
            ) {
              store.delete(storedKey);
            }
          }
        } else value = r.result;
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error('Ghi tệp nháp bị hủy.'));
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
export async function recoverAttachments(key, draft, readFiles = fileRecord) {
  const storedFiles = (await readFiles(snapshotKey(key, draft))) || [];
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
 * @param {Function} options.readText - Reads the previously published metadata.
 * @returns {object} save() reports durability; settled() fences cleanup after remote success.
 */
export function createDraftWriter(
  key,
  { read, whenReady, writeFiles = filesDraft, writeText = saveDraft, readText = readDraft },
) {
  let pending = Promise.resolve(true);
  // Attachment IDs identify immutable file selections. Reuse staged bytes for text-only retries.
  const staged = new Map();
  return {
    save: () => {
      pending = pending.then(async () => {
        try {
          await whenReady();
          const draft = read();
          if (!draft) return true;
          const snapshot = structuredClone(draft);
          const files = snapshot.attachments.filter((attachment) => attachment.file);
          const signature = JSON.stringify(files.map((attachment) => attachment.id).sort());
          const previous = readText(key);
          const previousIds = previous?.attachment_order?.filter(
            (id) => !previous.attachments?.some((attachment) => attachment.id === id),
          );
          let filesKey = staged.get(signature);
          if (!filesKey && previousIds && JSON.stringify([...previousIds].sort()) === signature) {
            filesKey = snapshotKey(key, previous);
          }
          if (!filesKey) {
            filesKey = `${key}:files:${newId()}`;
            await writeFiles(filesKey, files);
            staged.set(signature, filesKey);
          }
          // Publish the pointer last. A failed text write cannot replace previously committed blobs.
          snapshot.files_key = filesKey;
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
