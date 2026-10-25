/** Ensures user-facing errors remain helpful without leaking backend diagnostics. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { errorMessage } from '../src/utils/dom.js';

test('unknown backend diagnostics never appear verbatim', () => {
  assert.equal(
    errorMessage({ message: 'relation "admin_profiles" does not exist' }),
    'Không thể hoàn tất thao tác. Vui lòng thử lại sau.',
  );
  assert.equal(
    errorMessage({ message: 'SQL lỗi bảng nội bộ: secret_table' }),
    'Không thể hoàn tất thao tác. Vui lòng thử lại sau.',
  );
});

test('known app guidance remains actionable', () => {
  const expected =
    'Chưa kiểm tra được dung lượng lưu trữ. Để tránh vượt giới hạn, việc tải tệp mới đang tạm dừng.';
  assert.equal(errorMessage(Error(expected)), expected);
});

test('recognized service errors are localized instead of exposed', () => {
  assert.match(
    errorMessage({ code: '23503', message: 'violates foreign key constraint' }),
    /Chủ đề này vẫn có bài đăng/,
  );
  assert.match(errorMessage({ code: '42501', message: 'permission denied' }), /Phiên đăng nhập/);
  assert.match(errorMessage({ status: 429, message: 'Too Many Requests' }), /quá nhiều yêu cầu/);
  assert.match(errorMessage({ message: 'Failed to fetch' }), /Không thể kết nối/);
});
