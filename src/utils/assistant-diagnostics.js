/** Projects failure metadata onto fixed identifiers; never retains arbitrary upstream text. */
const stages = new Set(['budget', 'embedding', 'prompt', 'answer', 'excerpt', 'validation']);
const reasons = new Set([
  'inference_timeout',
  'cancelled',
  'embedding_failure',
  'generation_failure',
  'model_json',
  'model_envelope',
  'answer_contract',
  'unsupported_citation',
  'unsupported_date',
  'unsupported_number',
  'revision',
  'cancellation',
  'unknown_future',
  'unknown_end',
  'unknown_latest',
  'prompt_size',
  'internal_error',
]);

/** Classifies only local validation errors; upstream messages are never forwarded. */
export function assistantFailureReason(error, stage, expired, aborted) {
  if (expired) return 'inference_timeout';
  if (aborted) return 'cancelled';
  if (stage === 'embedding') return 'embedding_failure';
  if (stage === 'answer' || stage === 'excerpt') return 'generation_failure';
  if (stage === 'validation') {
    if (error instanceof SyntaxError) return 'model_json';
    const mapped = {
      model: 'model_envelope',
      answer: 'answer_contract',
      citation: 'unsupported_citation',
    };
    if (Object.hasOwn(mapped, error?.message)) return mapped[error.message];
    if (reasons.has(error?.message)) return error.message;
  }
  if (stage === 'prompt' && error?.message === 'prompt_size') return 'prompt_size';
  return 'internal_error';
}

/** Reads only bounded identifiers, allowing older deployed Workers to omit new fields. */
export function assistantResponseDiagnostics(headers) {
  const result = {};
  const stage = headers.get('X-Assistant-Stage');
  const reason = headers.get('X-Assistant-Reason');
  const reserved = headers.get('X-Assistant-Reserved');
  const failureStop = headers.get('X-Assistant-Failure-Stop');
  if (stages.has(stage)) result.stage = stage;
  if (reasons.has(reason)) result.reason = reason;
  if (reserved === 'true' || reserved === 'false') result.reserved = reserved === 'true';
  if (['confirmed', 'rejected', 'unconfirmed', 'not_required'].includes(failureStop))
    result.failureStop = failureStop;
  return result;
}
