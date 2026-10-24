export const STORAGE_LIMIT = 1_000_000_000;
export function quotaLevel(used, limit) {
  if (!Number.isFinite(used)) return 'unknown';
  return used / limit >= 0.9 ? 'critical' : used / limit >= 0.7 ? 'warning' : 'normal';
}
export function assertUploadBudget(used, incoming) {
  if (!Number.isFinite(used))
    throw Error('Chưa xác minh được dung lượng Storage. Tạm dừng tải tệp để bảo vệ quota.');
  if (used + incoming >= STORAGE_LIMIT * 0.9)
    throw Error(
      'Storage đã gần ngưỡng 90%. Tạm dừng tải tệp; hãy dọn tài nguyên hoặc dùng liên kết ngoài.',
    );
}
