/** Verifies visible-section anchoring across refreshed, reordered and resized board snapshots. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { captureBoardPosition, restoredBoardLeft } from '../src/components/board-navigation.js';

/**
 * Models real layout coordinates without requiring a DOM library or network.
 * @param {object} options - Section IDs, column stride, viewport and scroll offsets.
 * @returns {object} The geometry read by the production anchor helpers.
 */
function boardGeometry({
  ids = ['a', 'b', 'c', 'd', 'e'],
  stride = 320,
  left = 0,
  viewport = 700,
} = {}) {
  return {
    scrollLeft: left,
    clientWidth: viewport,
    scrollWidth: ids.length * stride,
    getBoundingClientRect: () => ({ left: 24, right: 24 + viewport }),
    querySelectorAll: () =>
      ids.map((id, i) => ({
        dataset: { sectionId: id },
        getBoundingClientRect: () => ({
          left: 24 + i * stride - left,
          right: 24 + i * stride + stride - 20 - left,
        }),
      })),
  };
}

test('refresh restores the first partially visible section instead of returning to the beginning', () => {
  const anchor = captureBoardPosition(boardGeometry({ left: 390 }));
  assert.equal(anchor.sectionId, 'b');
  assert.equal(restoredBoardLeft(boardGeometry(), anchor), 390);
});

test('inserting/reordering sections before the anchor keeps the same section and offset visible', () => {
  const anchor = captureBoardPosition(boardGeometry({ left: 390 }));
  assert.equal(
    restoredBoardLeft(boardGeometry({ ids: ['new', 'a', 'b', 'c', 'd', 'e'] }), anchor),
    710,
  );
  assert.equal(restoredBoardLeft(boardGeometry({ ids: ['b', 'a', 'c', 'd', 'e'] }), anchor), 70);
});

test('resize recomputes position from section identity and clamps after columns disappear', () => {
  const anchor = captureBoardPosition(boardGeometry({ left: 390 }));
  assert.equal(restoredBoardLeft(boardGeometry({ stride: 380 }), anchor), 450);
  assert.equal(
    restoredBoardLeft(boardGeometry({ ids: ['a', 'c', 'd'], viewport: 900 }), anchor),
    60,
  );
  assert.equal(restoredBoardLeft(boardGeometry({ ids: ['a'], viewport: 900 }), anchor), 0);
  assert.equal(restoredBoardLeft(boardGeometry(), null), 0);
  assert.equal(captureBoardPosition(null), null);
});
