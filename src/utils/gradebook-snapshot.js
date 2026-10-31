/** Joins complete snapshot rows without paging away students or changing exact point strings. */
import { teacherPage } from './gradebook-scores.js';

/** Reuses strict existing page validation in finite in-memory chunks, without API calls. */
export function snapshotStudents(snapshot, semester, classId, catalog) {
  const result = [];
  for (let start = 0; start < snapshot.students.length; start += 20) {
    const entries = snapshot.students.slice(start, start + 20);
    const roster = { students: entries, nextCursor: null };
    const grades = {
      students: entries.map((row) => ({ studentId: row.id, scores: row[`scores${semester}`] })),
      nextCursor: null,
    };
    const page = teacherPage(roster, grades, classId, catalog);
    result.push(
      ...page.students.map((row, index) => ({
        ...row,
        documentOrder: entries[index].documentOrder,
      })),
    );
  }
  return result;
}
