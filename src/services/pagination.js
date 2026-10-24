/** Collects complete metadata pages and rejects incomplete or unstable reads. */

/**
 * Reads every visible row using a unique ordering and verified exact counts.
 * Advances by received rows because the provider may cap pages below pageSize.
 * This is not a transactional database snapshot; callers retain version checks.
 *
 * @param {object} db - The Supabase client used for every page.
 * @param {string} table - The metadata table to read.
 * @param {string[]} orders - Sort columns; id is always the unique final tie-breaker.
 * @param {number} pageSize - The maximum requested page length.
 * @returns {Promise<object[]>} All visible rows, or an error instead of partial data.
 */
export async function readAllRows(db, table, orders = [], pageSize = 500) {
  const rows = [],
    seen = new Set();
  let total;
  do {
    let query = db.from(table).select('*', { count: 'exact' });
    for (const column of [...orders.filter((column) => column !== 'id'), 'id']) {
      query = query.order(column);
    }
    const { data, error, count } = await query.range(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!Number.isSafeInteger(count) || count < 0 || !Array.isArray(data)) {
      throw Error('Không xác minh được đầy đủ dữ liệu. Hãy tải lại trước khi chỉnh sửa.');
    }
    total ??= count;
    if (count !== total || (data.length === 0 && rows.length < total)) {
      throw Error('Dữ liệu thay đổi khi đang tải. Hãy tải lại trước khi chỉnh sửa.');
    }
    for (const row of data) {
      if (row.id == null || seen.has(row.id)) {
        throw Error('Trang dữ liệu không nhất quán. Hãy tải lại trước khi chỉnh sửa.');
      }
      seen.add(row.id);
      rows.push(row);
    }
    if (rows.length > total) throw Error('Số lượng dữ liệu không nhất quán. Hãy tải lại.');
  } while (rows.length < total);
  return rows;
}
