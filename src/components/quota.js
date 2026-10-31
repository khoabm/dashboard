/** Shows measured quota warnings without changing Storage upload authorization. */

import { el } from '../utils/dom.js';
import { requireClient, result } from '../services/client.js';
import { quotaLevel, STORAGE_LIMIT } from '../utils/quota.js';
import { PulseIndicator } from './pending.js';

/**
 * Loads the same quota estimates and renders readable, grouped status metrics.
 *
 * @param {HTMLElement} root - The status container to update.
 */
export async function QuotaStatus(root) {
  root.replaceChildren(PulseIndicator('Đang kiểm tra dung lượng…'));
  try {
    const usage = await result(requireClient().rpc('app_usage'));
    if (!root.isConnected) return;
    const storageLevel = quotaLevel(usage.storage_bytes, STORAGE_LIMIT);
    const dbLevel = quotaLevel(usage.database_bytes_estimate, 500_000_000);
    const level = storageLevel === 'normal' ? dbLevel : storageLevel;
    const warning =
      storageLevel === 'critical'
        ? 'Đã tạm dừng tải tệp mới vì dung lượng lưu trữ chạm ngưỡng 90%.'
        : level !== 'normal'
          ? 'Dung lượng đang gần giới hạn. Số liệu về dữ liệu chỉ là ước tính; hãy kiểm tra thêm trong trang quản trị.'
          : '';

    // Preserve the measured numbers and prior warning thresholds; only group the text visually.
    root.replaceChildren(
      el(
        'div',
        { class: 'quota-metrics' },
        el(
          'div',
          { class: 'quota-metric' },
          el('span', { class: 'quota-metric-label' }, 'Dung lượng tệp'),
          el(
            'strong',
            { class: 'quota-metric-value' },
            `${(usage.storage_bytes / 1e6).toFixed(2)} MB`,
          ),
          el('span', { class: 'quota-metric-limit' }, 'Giới hạn: 1.000 MB'),
        ),
        el(
          'div',
          { class: 'quota-metric' },
          el('span', { class: 'quota-metric-label' }, 'Dữ liệu (ước tính)'),
          el(
            'strong',
            { class: 'quota-metric-value' },
            `${(usage.database_bytes_estimate / 1e6).toFixed(1)} MB`,
          ),
          el('span', { class: 'quota-metric-limit' }, 'Giới hạn: 500 MB'),
        ),
        el(
          'div',
          { class: 'quota-metric' },
          el('span', { class: 'quota-metric-label' }, 'Lưu lượng sử dụng'),
          el('strong', { class: 'quota-metric-value quota-metric-unknown' }, 'Chưa có số liệu'),
          el('span', { class: 'quota-metric-limit' }, 'Chưa thể thống kê'),
        ),
      ),
      ...(warning ? [el('p', { class: 'quota-warning', role: 'status' }, warning)] : []),
    );
  } catch {
    if (root.isConnected)
      root.textContent =
        'Chưa thể kiểm tra dung lượng còn lại. Vui lòng thử lại trước khi tải tệp mới.';
  }
}
