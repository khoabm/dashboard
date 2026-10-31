/** Projects one authorized class snapshot; plaintext identities leave only confirmed exports. */
import { studentDto, scoreDtos, classDto, checked } from './dto.js';
import { requireContract } from './contracts.js';

/** Decrypts bounded envelopes in request memory and returns ranks to ordinary table reads. */
export async function classSnapshot(body, identity, { backend, cryptography, checkpoint }) {
  const exporting = body.purpose === 'export';
  const value = await backend.rpc('gb_class_snapshot', {
    actor: identity.actor,
    session: identity.session,
    cid: body.classId,
    exporting,
  });
  const classroom = classDto(value?.class);
  checked(() =>
    requireContract(
      classroom.id === body.classId &&
        Array.isArray(value.students) &&
        value.students.length <= 2000,
      'snapshot',
    ),
  );
  const rows = [];
  const seen = new Set();
  for (const entry of value.students) {
    checkpoint();
    const student = studentDto(entry);
    checked(() => {
      requireContract(student.classId === body.classId && !seen.has(student.id), 'snapshot');
      seen.add(student.id);
    });
    const documentNumber = await cryptography.reveal(entry, body.classId);
    rows.push({
      ...student,
      documentNumber,
      scores1: scoreDtos(entry.scores1, true),
      scores2: scoreDtos(entry.scores2, true),
    });
  }
  // Digit strings retain leading zeros; binary text order is deterministic across runtimes.
  const ordered = [...rows].sort((a, b) =>
    a.documentNumber < b.documentNumber ? -1 : a.documentNumber > b.documentNumber ? 1 : 0,
  );
  ordered.forEach((row, index) => {
    row.documentOrder = index;
  });
  checkpoint();
  return {
    class: classroom,
    students: rows.map(({ documentNumber, ...row }) =>
      exporting ? { ...row, documentNumber } : row,
    ),
  };
}
