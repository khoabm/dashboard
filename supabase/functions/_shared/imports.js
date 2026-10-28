/** Extends B1 typed framing to the complete positional score-import envelope. */
import {
  allowFields,
  documentNumber,
  birthDate,
  importedScore,
  normalizeRoster,
  canonicalRosterInput,
  canonicalScoreCells,
  frameScalar,
  frameTuple,
  requireContract,
  ContractError,
} from './contracts.js';

/** Attaches only physical coordinates, never rejected values. */
function cell(row, column, read) {
  try {
    return read();
  } catch (error) {
    if (error instanceof ContractError) Object.assign(error, { row, column });
    throw error;
  }
}

/** Score transport keeps customizable headers ordered, never using them as field keys. */
function scoreInput(body, today, catalogs) {
  requireContract(
    Array.isArray(body.headers) &&
      body.headers.length === 10 &&
      body.headers.every(
        (v) => typeof v === 'string' && v.length <= 4096 && v.isWellFormed() && !v.includes('\0'),
      ),
    'headers',
  );
  requireContract(
    Array.isArray(body.rows) && body.rows.length >= 1 && body.rows.length <= 2000,
    'rows',
  );
  let previous = 1;
  const coordinates = new Set();
  const rows = body.rows.map((row) => {
    allowFields(
      row,
      ['row', 'documentNumber', 'birthDate', 'subjectName', 'scores'],
      ['row', 'documentNumber', 'birthDate', 'subjectName', 'scores'],
    );
    requireContract(Number.isSafeInteger(row.row) && row.row > previous, 'row');
    previous = row.row;
    const document = cell(row.row, 1, () => documentNumber(row.documentNumber));
    const dob = cell(row.row, 2, () => birthDate(row.birthDate, today));
    cell(row.row, 3, () =>
      requireContract(
        catalogs.subjects.some((s) => s.active && s.displayName === row.subjectName),
        'subject',
      ),
    );
    cell(row.row, 4, () =>
      requireContract(Array.isArray(row.scores) && row.scores.length === 7, 'scores'),
    );
    const scores = Array.from(row.scores, (value, index) =>
      cell(row.row, index + 4, () => {
        const score = importedScore(value);
        if (score.state === 'skip') return null;
        const key = `${document}|${row.subjectName}|${index}`;
        requireContract(!coordinates.has(key), 'duplicate_coordinate');
        coordinates.add(key);
        return score.value;
      }),
    );
    return {
      row: row.row,
      documentNumber: document,
      birthDate: dob,
      subjectName: row.subjectName,
      scores,
    };
  });
  const canonical =
    frameTuple('gb:preview-input:v1', ['scores', '10']) +
    body.headers.map(frameScalar).join('') +
    frameScalar(String(rows.length)) +
    rows
      .map(
        (row) =>
          frameTuple('score_row', [
            String(row.row),
            row.documentNumber,
            row.birthDate,
            row.subjectName,
          ]) + canonicalScoreCells(row.scores),
      )
      .join('');
  return { headers: body.headers, rows, canonical };
}

/** Captured today is supplied by the enclosing request, once per complete batch. */
export function normalizeImport(body, kind, today, catalogs) {
  if (kind === 'scores') return scoreInput(body, today, catalogs);
  const raw = { headers: body.headers, rows: body.rows };
  const normalized = normalizeRoster(raw, today);
  return {
    headers: normalized.headers,
    canonical: canonicalRosterInput(raw, today),
    rows: normalized.rows.map((row) => ({
      row: row.row,
      documentNumber: row.documentNumber,
      birthDate: row.birthDate,
      ...(row.name.state === 'absent'
        ? {}
        : { fullName: row.name.state === 'blank' ? '' : row.name.value }),
    })),
  };
}

/** Encrypts roster proposals without binding fresh randomness into input/state commitments. */
export async function protectedRows(batch, kind, context, cryptography, checkpoint) {
  const rows = [];
  for (const row of batch.rows) {
    checkpoint();
    const identity =
      kind === 'roster'
        ? await cryptography.encryptIdentity(
            context.classId,
            context.lookupKeyVersion,
            row.documentNumber,
          )
        : {
            lookup: await cryptography.lookup(
              context.classId,
              context.lookupKeyVersion,
              row.documentNumber,
            ),
            lookupKeyVersion: context.lookupKeyVersion,
          };
    checkpoint();
    rows.push({
      row: row.row,
      ...identity,
      birthDate: row.birthDate,
      ...(kind === 'roster'
        ? Object.hasOwn(row, 'fullName')
          ? { fullName: row.fullName }
          : {}
        : { subjectName: row.subjectName, scores: row.scores }),
    });
  }
  requireContract(new TextEncoder().encode(JSON.stringify(rows)).length <= 4194304, 'size');
  return rows;
}
