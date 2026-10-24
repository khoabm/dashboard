/** Shows measured quota warnings without changing Storage upload authorization. */

import { el } from '../utils/dom.js';
import { requireClient, result } from '../services/client.js';
import { quotaLevel, STORAGE_LIMIT } from '../utils/quota.js';

/**
 * Loads quota estimates and updates the attached status element.
 * Displays a fallback warning when usage cannot be read.
 *
 * @param {HTMLElement} root - The status container to update.
 */
export async function QuotaStatus(root) {
  try {
    const usage = await result(requireClient().rpc('app_usage'));
    if (!root.isConnected) return;
    const storageLevel = quotaLevel(usage.storage_bytes, STORAGE_LIMIT);
    const dbLevel = quotaLevel(usage.database_bytes_estimate, 500_000_000);
    const level = storageLevel === 'normal' ? dbLevel : storageLevel;
    // Replace the quota region with measured usage and a warning level for this session.
    root.replaceChildren(
      el(
        'div',
        { class: level === 'normal' ? 'fine-print' : 'demo-note' },
        `Dung lượng tệp đã sử dụng: ${(usage.storage_bytes / 1e6).toFixed(2)} MB / 1.000 MB · Dung lượng dữ liệu (ước tính): ${(usage.database_bytes_estimate / 1e6).toFixed(1)} MB / 500 MB. Lưu lượng sử dụng: chưa có số liệu.`,
        storageLevel === 'critical'
          ? ' Đã tạm dừng tải tệp mới vì dung lượng lưu trữ chạm ngưỡng 90%.'
          : level !== 'normal'
            ? ' Dung lượng đang gần giới hạn. Số liệu về dữ liệu chỉ là ước tính; hãy kiểm tra thêm trong trang quản trị.'
            : '',
      ),
    );
  } catch {
    if (root.isConnected)
      root.textContent =
        'Chưa thể kiểm tra dung lượng còn lại. Vui lòng thử lại trước khi tải tệp mới.';
  }
}
