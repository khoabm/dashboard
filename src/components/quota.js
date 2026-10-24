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
        `Storage học liệu: ${(usage.storage_bytes / 1e6).toFixed(2)} MB / 1.000 MB · Database ước tính: ${(usage.database_bytes_estimate / 1e6).toFixed(1)} MB / 500 MB. Băng thông: chưa đo được.`,
        storageLevel === 'critical'
          ? ' Đã chặn upload từ ngưỡng Storage 90%.'
          : level !== 'normal'
            ? ' Dung lượng đạt mức cảnh báo. Database là ước tính, cần đối chiếu Dashboard.'
            : '',
      ),
    );
  } catch {
    if (root.isConnected)
      root.textContent =
        'Không đọc được quota. Tải tệp mới sẽ yêu cầu kiểm tra lại; không tự nâng gói.';
  }
}
