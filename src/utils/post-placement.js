/** Pure ordering helpers for the post editor; existing RPC contracts remain unchanged. */

/** Stable, non-deleted posts in one topic. */
export function placementPeers(posts, sectionId, excludeId = null) {
  return posts
    .filter((post) => post.section_id === sectionId && post.status !== 'deleted' && post.id !== excludeId)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
        String(a.id).localeCompare(String(b.id)),
    );
}

/** The visible insertion slot of a previously saved post, or the end for a new post. */
export function initialPlacement(posts, post, sectionId) {
  const peers = placementPeers(posts, sectionId, post?.id);
  if (!post || post.section_id !== sectionId || post.status === 'deleted')
    return { mode: 'end', index: peers.length };
  const current = placementPeers(posts, sectionId);
  const index = current.findIndex((item) => item.id === post.id);
  if (index < 0) return { mode: 'end', index: peers.length };
  if (index === 0 && peers.length > 0) return { mode: 'start', index: 0 };
  if (index >= peers.length) return { mode: 'end', index: peers.length };
  return { mode: 'custom', index };
}

/** Translate a visual position into the existing integer sort_order for save_post. */
export function saveSortOrder(peers, mode, index, currentPost = null, sectionId = null) {
  const values = peers.map((post) => post.sort_order);
  const max = values.length ? Math.max(...values) : -1;
  const min = values.length ? Math.min(...values) : 1;
  let order;
  if (mode === 'start' || (mode === 'custom' && index <= 0)) order = min - 1;
  else if (mode === 'end' || (mode === 'custom' && index >= peers.length)) order = max + 1;
  else if (currentPost && currentPost.section_id === sectionId) order = currentPost.sort_order;
  else order = max + 1;
  if (!Number.isSafeInteger(order) || order < -2147483648 || order > 2147483647)
    throw Error('Chưa thể đặt thứ tự. Vui lòng tải lại danh sách bài đăng.');
  return order;
}

/** Exact saved order for the existing optimistic reorder_posts RPC; no mutation. */
export function orderedPlacement(peers, savedPost, index) {
  if (!Number.isInteger(index) || index < 0 || index > peers.length)
    throw Error('Thứ tự bài đăng không hợp lệ.');
  return [...peers.slice(0, index), savedPost, ...peers.slice(index)];
}

/** A middle insertion requires the existing atomic reorder operation. */
export function needsReorder(mode, index, length) {
  return mode === 'custom' && index > 0 && index < length;
}
