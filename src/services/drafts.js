const prefix = 'khtn8:draft:';
export function draftKey(userId, id = 'new') {
  return `${prefix}${userId}:${id}`;
}
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
export function readDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
export const removeDraft = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Cleanup cannot turn a confirmed backend save into a reported failure. */
  }
};
// Blob drafts are isolated per admin/post and never serialized to localStorage.
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('khtn8-drafts', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
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
