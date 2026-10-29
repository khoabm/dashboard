/** Strict score-grid batch contract; no document number, birth date or client role selectors. */
import { allowFields, bigintId, requireContract } from './contracts.js';
import { normalizeScore } from './contracts.js';

export function normalizeGridBatch(changes) {
  requireContract(Array.isArray(changes) && changes.length >= 1 && changes.length <= 140, 'batch');
  const seen = new Set();
  return changes.map((item) => {
    allowFields(
      item,
      ['studentId', 'subjectCode', 'columnCode', 'expectedRevision', 'score'],
      ['studentId', 'subjectCode', 'columnCode', 'expectedRevision', 'score'],
    );
    const studentId = bigintId(item.studentId);
    const expectedRevision =
      item.expectedRevision === null ? null : bigintId(item.expectedRevision);
    for (const field of ['subjectCode', 'columnCode'])
      requireContract(
        typeof item[field] === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(item[field]),
        'code',
      );
    const key = `${studentId}|${item.subjectCode}|${item.columnCode}`;
    requireContract(!seen.has(key), 'duplicate_coordinate');
    seen.add(key);
    return {
      studentId,
      subjectCode: item.subjectCode,
      columnCode: item.columnCode,
      expectedRevision,
      score: normalizeScore(item.score),
    };
  });
}
