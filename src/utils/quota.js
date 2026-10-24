/** Defines Storage budget thresholds used before accepting new uploads. */

export const STORAGE_LIMIT = 1_000_000_000;

/**
 * Classifies usage at the 70% warning and 90% critical thresholds.
 *
 * @param {number} used - The measured resource usage.
 * @param {number} limit - The resource quota.
 * @returns {'normal'|'warning'|'critical'|'unknown'} The usage band.
 */
export function quotaLevel(used, limit) {
  if (!Number.isFinite(used)) return 'unknown';
  return used / limit >= 0.9 ? 'critical' : used / limit >= 0.7 ? 'warning' : 'normal';
}

/**
 * Blocks new uploads when Storage usage is unknown or would reach 90%.
 *
 * @param {number} used - Current Storage usage in bytes.
 * @param {number} incoming - Bytes queued for upload.
 * @throws {Error} When the upload cannot be admitted safely.
 */
export function assertUploadBudget(used, incoming) {
  if (!Number.isFinite(used))
    throw Error('Chưa xác minh được dung lượng Storage. Tạm dừng tải tệp để bảo vệ quota.');
  if (used + incoming >= STORAGE_LIMIT * 0.9)
    throw Error(
      'Storage đã gần ngưỡng 90%. Tạm dừng tải tệp; hãy dọn tài nguyên hoặc dùng liên kết ngoài.',
    );
}
