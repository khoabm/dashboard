/** Reads and writes board metadata through the shared Supabase client. */

import { requireClient, result } from './client.js';
import { config } from '../config/public.js';
import { readAllRows } from './pagination.js';

/**
 * Loads the board, ordered sections, posts, and their attachment metadata.
 * Signs image thumbnail URLs in a batch; text remains available if signing fails.
 *
 * @param {object} db - The shared client, or an isolated client for offline regression.
 * @returns {Promise<object>} The board, section list, and enriched post list.
 */
export async function loadBoard(db = requireClient()) {
  const [boards, sections, posts] = await Promise.all([
    result(db.from('boards').select('*').order('created_at').limit(1)),
    readAllRows(db, 'sections', ['sort_order', 'created_at']),
    readAllRows(db, 'posts', ['sort_order', 'created_at']),
  ]);
  // Read versions before attachments so a concurrent edit cannot pair a new version with old files.
  const attachments = await readAllRows(db, 'attachments', ['sort_order']);
  const byPost = new Map();
  for (const attachment of attachments) {
    if (!byPost.has(attachment.post_id)) byPost.set(attachment.post_id, []);
    byPost.get(attachment.post_id).push(attachment);
  }
  const enriched = posts.map((post) => ({
    ...post,
    attachments: byPost.get(post.id) || [],
  }));
  const thumbnails = enriched
    .map((post) => {
      const image =
        post.attachments.find((a) => a.id === post.thumbnail_id && a.type === 'image') ||
        post.attachments.find((a) => a.type === 'image');
      return { post, path: image?.storage_path };
    })
    .filter((x) => x.path);
  if (thumbnails.length) {
    try {
      const signed = await result(
        db.storage.from(config.bucket).createSignedUrls(
          thumbnails.map((x) => x.path),
          config.signedUrlSeconds,
        ),
      );
      thumbnails.forEach((item, index) => (item.post.thumbnail_url = signed[index]?.signedUrl));
    } catch {
      /* Board text remains available when thumbnail signing fails. */
    }
  }
  return {
    board: boards[0],
    sections,
    posts: enriched,
    publicCoverage: { complete: true, method: 'exact-count-pages', transactional: false },
  };
}

/**
 * Saves a post and its attachment metadata through the version-checked RPC.
 *
 * @param {object} post - The post fields and expected version.
 * @param {Array<object>} attachments - The ordered attachment metadata.
 * @returns {Promise<*>} The save RPC response.
 */
export async function savePost(post, attachments) {
  const saved = await result(
    requireClient().rpc('save_post', {
      p_post: post,
      p_attachments: attachments,
      p_expected_version: post.version ?? null,
    }),
  );
  return saved;
}

/**
 * Inserts a new section or updates an existing one based on its ID.
 *
 * @param {object} section - The section fields to persist.
 * @returns {Promise<object>} The saved section row.
 */
export async function saveSection(section) {
  const db = requireClient();
  return result(
    section.id
      ? db.from('sections').update(section).eq('id', section.id).select().single()
      : db.from('sections').insert(section).select().single(),
  );
}

/**
 * Deletes a section by ID and lets database constraints reject unsafe removal.
 *
 * @param {string} id - The section identifier.
 * @returns {Promise<object>} The deleted section row.
 */
export async function deleteSection(id) {
  return result(requireClient().from('sections').delete().eq('id', id).select().single());
}

/**
 * Checks whether the current Auth user has an active admin profile.
 * This drives UI access; database and Storage policies still enforce writes.
 *
 * @returns {Promise<boolean>} Whether the signed-in user is an active admin.
 */
export async function isAdmin() {
  const db = requireClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return false;
  const rows = await result(db.from('admin_profiles').select('active,role').eq('user_id', user.id));
  return rows.some((p) => p.active && p.role === 'admin');
}

/**
 * Exports board metadata and audit rows without Storage file bytes.
 *
 * @param {object} db - The shared client, or an isolated client for offline regression.
 * @returns {Promise<object>} The versioned metadata snapshot for download.
 */
export async function exportMetadata(db = requireClient()) {
  const [boards, sections, posts, attachments, audit_logs] = await Promise.all(
    ['boards', 'sections', 'posts', 'attachments', 'audit_logs'].map((table) =>
      readAllRows(db, table),
    ),
  );
  return {
    format: 'khtn8-metadata-v1',
    exported_at: new Date().toISOString(),
    boards,
    sections,
    posts,
    attachments,
    audit_logs,
  };
}

/**
 * Reorders posts atomically using their IDs and expected versions.
 *
 * @param {Array<object>} posts - Posts in the intended order.
 * @returns {Promise<*>} The reorder RPC result.
 */
export const reorderPosts = (posts) =>
  result(
    requireClient().rpc('reorder_posts', {
      p_ids: posts.map((p) => p.id),
      p_versions: posts.map((p) => p.version),
    }),
  );
