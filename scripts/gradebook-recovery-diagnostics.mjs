/** Projects failures onto fixed public categories; never returns messages, stacks or payloads. */
export const stages = [
  'start',
  'credentials',
  'bootstrap',
  'migrations',
  'fixtures',
  'rotation',
  'dump',
  'seal',
  'invalid_archive',
  'remove_source',
  'child',
  'decrypt',
  'fresh_target',
  'restore',
  'metadata',
  'data',
  'versions',
  'permissions',
  'catalogs',
  'complete',
];
/** Returns only an allowlisted stage and bounded failure category from untrusted errors. */
export function safeDiagnostic(stage, error) {
  const codes = new Set(['42501', '42703', '42702', '42883', '42P01', '23505', '22023', '42601']);
  const code = codes.has(error?.code)
    ? error.code
    : error?.code === 'ERR_ASSERTION'
      ? 'assertion'
      : Number.isInteger(error?.status) && error.status >= 1 && error.status <= 255
        ? 'subprocess_exit'
        : 'unexpected';
  return `GB_FAIL ${stages.includes(stage) ? stage : 'start'} ${code}`;
}
/** Filters captured child stdout/stderr to exact fixed diagnostic lines only. */
export function childDiagnostics(value) {
  return String(value)
    .split('\n')
    .filter((line) =>
      stages.some(
        (stage) =>
          line === `GB_STAGE ${stage}` ||
          [
            '42501',
            '42703',
            '42702',
            '42883',
            '42P01',
            '23505',
            '22023',
            '42601',
            'assertion',
            'subprocess_exit',
            'unexpected',
          ].some((code) => line === `GB_FAIL ${stage} ${code}`),
      ),
    )
    .join('\n');
}
