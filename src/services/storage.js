/** Resolves attachment previews and manages uploaded Storage objects safely. */

import { newId } from '../utils/id.js';
import { requireClient, result } from './client.js';
import { config } from '../config/public.js';
import { assertUploadBudget } from '../utils/quota.js';
import { validateFile, verifyFileSignature } from '../utils/validation.js';

/**
 * Resolves an external, unsaved blob, or signed Storage URL for a preview.
 * Callers must revoke blob URLs when the preview is removed.
 *
 * @param {object} attachment - An external link, local file, or stored attachment.
 * @returns {Promise<string>} A URL usable by the preview component.
 */
export async function attachmentUrl(attachment) {
  if (attachment.external_url) return attachment.external_url;
  if (attachment.file) return URL.createObjectURL(attachment.file);
  return (
    await result(
      requireClient()
        .storage.from(config.bucket)
        .createSignedUrl(attachment.storage_path, config.signedUrlSeconds),
    )
  ).signedUrl;
}

/**
 * Uploads new files while preserving existing attachment entries.
 * Checks quota and file signatures; attempts cleanup after a failed upload.
 *
 * @param {string} postId - The post that owns new Storage paths.
 * @param {Array<object>} attachments - Existing entries and pending local files.
 * @param {Function} onProgress - Receives completed and total item counts.
 * @returns {Promise<{attachments: object[], paths: string[]}>} Metadata and new paths.
 * @throws {Error} A failed upload may include orphanPaths for later cleanup.
 */
export async function uploadAttachments(postId, attachments, onProgress = () => {}) {
  const uploaded = [],
    paths = [];
  const incoming = attachments.reduce((sum, a) => sum + (a.file?.size || 0), 0);
  if (incoming) {
    const usage = await result(requireClient().rpc('app_usage'));
    assertUploadBudget(usage.storage_bytes, incoming);
  }
  try {
    for (let i = 0; i < attachments.length; i++) {
      const a = attachments[i];
      if (!a.file) {
        uploaded.push(a);
        continue;
      }
      const error = validateFile(a.file);
      if (error || !(await verifyFileSignature(a.file)))
        throw Error(error || 'Nội dung tệp không khớp định dạng.');
      const path = `${postId}/${newId()}.${a.file.name.split('.').pop().toLowerCase()}`;
      await result(
        requireClient()
          .storage.from(config.bucket)
          .upload(path, a.file, { contentType: a.file.type, upsert: false, cacheControl: '60' }),
      );
      paths.push(path);
      uploaded.push({
        ...a,
        file: undefined,
        storage_path: path,
        mime_type: a.file.type,
        size_bytes: a.file.size,
      });
      onProgress(i + 1, attachments.length);
    }
    return { attachments: uploaded, paths };
  } catch (error) {
    await cleanup(paths).catch(() => {});
    error.orphanPaths = paths;
    throw error;
  }
}

/**
 * Reads cleanup candidates retained on this device after prior failures.
 *
 * @returns {string[]} Pending Storage paths, or an empty list if unavailable.
 */
function pendingPaths() {
  try {
    return JSON.parse(localStorage.getItem('khtn8:cleanup') || '[]');
  } catch {
    return [];
  }
}

/**
 * Removes only unreferenced Storage paths after checking attachment metadata.
 * Records candidates locally so interrupted cleanup can be retried.
 *
 * @param {string[]} paths - Potentially orphaned Storage paths.
 */
export async function cleanup(paths) {
  if (!paths.length) return;
  const pending = [...new Set([...pendingPaths(), ...paths])];
  try {
    localStorage.setItem('khtn8:cleanup', JSON.stringify(pending));
  } catch {}
  // A response can be lost after a successful commit. Never remove referenced objects.
  const referenced = await result(
    requireClient().from('attachments').select('storage_path').in('storage_path', paths),
  );
  const unused = paths.filter((path) => !referenced.some((a) => a.storage_path === path));
  if (unused.length) await result(requireClient().storage.from(config.bucket).remove(unused));
  try {
    localStorage.setItem(
      'khtn8:cleanup',
      JSON.stringify(pending.filter((p) => !paths.includes(p))),
    );
  } catch {}
}

/** Retries cleanup of orphaned paths retained on this device. */
export const cleanupPending = () => cleanup(pendingPaths());
