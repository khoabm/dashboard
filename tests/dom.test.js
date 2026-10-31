/** Ensures user-facing errors remain helpful without leaking backend diagnostics. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { errorMessage, restrictNumericInput } from '../src/utils/dom.js';

test('decimal input retains dots and exact text; invalid paste restores the last accepted string', () => {
  const input = new EventTarget();
  Object.assign(input, {
    value: '8.12345',
    selectionStart: 7,
    selectionEnd: 7,
    setSelectionRange() {},
  });
  restrictNumericInput(input, { decimal: true });
  for (const value of ['7', '7.', '7.12345', '8.123456', '0', '10.00000']) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    assert.equal(input.value, value);
  }
  for (const value of ['1.2.3', '7x', 'NaN', '1e2', '-1']) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    assert.equal(input.value, '10.00000');
  }
  const identity = new EventTarget();
  Object.assign(identity, {
    value: '000000009',
    selectionStart: 9,
    selectionEnd: 9,
    setSelectionRange() {},
  });
  restrictNumericInput(identity);
  identity.value = '000.009';
  identity.dispatchEvent(new Event('input'));
  assert.equal(identity.value, '000000009');
});

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

test('PT409 conflicts use safe reload guidance without exposing diagnostics', () => {
  assert.equal(
    errorMessage({
      code: 'PT409',
      message: 'SQL internal diagnostics: private_table',
      details: 'private payload',
    }),
    'Bài đăng đã thay đổi. Vui lòng tải lại dữ liệu trước khi thử lại.',
  );
  assert.match(errorMessage({ code: '40001' }), /Bản nháp của bạn vẫn được giữ/);
  assert.equal(
    errorMessage({ code: 'PT499', message: 'SQL internal diagnostics' }),
    'Không thể hoàn tất thao tác. Vui lòng thử lại sau.',
  );
});
