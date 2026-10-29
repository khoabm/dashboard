/** Offline paging/coverage evidence using fake database rows; never contacts Supabase. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBoard } from '../src/services/board.js';
import { readAllRows } from '../src/services/pagination.js';
import { publicAssistantCorpus } from '../src/utils/public-retrieval.js';
const rows = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  section_id: 's',
  title: `P${i}`,
  body: 'full text',
  status: i === 4 ? 'draft' : 'published',
}));
function dbFor({ duplicate = false, change = false } = {}) {
  const ranges = [];
  return {
    ranges,
    from: (table) => ({
      select() {
        return this;
      },
      order() {
        return this;
      },
      limit: async () => ({ data: [{ id: 'board' }], error: null }),
      range: async (start, end) => {
        ranges.push({ table, start, end });
        const all =
          table === 'posts' ? rows : table === 'sections' ? [{ id: 's', title: 'Any topic' }] : [];
        const data = all.slice(start, start + 2);
        if (duplicate && table === 'posts' && start === 2) data[0] = all[0];
        return { data, error: null, count: all.length + (change && start > 0 ? 1 : 0) };
      },
    }),
  };
}
test('loader reads provider-capped pages to exact total then marks loaded snapshot, projection excludes private', async () => {
  const db = dbFor();
  const snapshot = await loadBoard(db);
  assert.equal(snapshot.posts.length, 5);
  assert.equal(snapshot.publicCoverage.complete, true);
  assert.equal(snapshot.publicCoverage.transactional, false);
  assert.equal(db.ranges.filter((r) => r.table === 'posts').length, 3);
  assert.equal(publicAssistantCorpus(snapshot).posts.length, 4);
});
test('missing/duplicate/changed pages cannot produce a complete snapshot', async () => {
  await assert.rejects(readAllRows(dbFor({ duplicate: true }), 'posts'));
  await assert.rejects(readAllRows(dbFor({ change: true }), 'posts'));
  const db = dbFor();
  db.from = () => ({
    select() {
      return this;
    },
    order() {
      return this;
    },
    range: async () => ({ data: [], error: null, count: 2 }),
  });
  await assert.rejects(readAllRows(db, 'posts'));
});
