/** Safe HTTP categories, bounded body reads and cancellation without retry. */
import { ContractError } from './contracts.js';

const messages = {
  400: 'Yêu cầu không hợp lệ.',
  401: 'Không thể xác minh quyền truy cập.',
  403: 'Dữ liệu chưa sẵn sàng hoặc bạn không có quyền truy cập.',
  409: 'Dữ liệu đã thay đổi. Vui lòng tải lại trước khi thử lại.',
  413: 'Dữ liệu gửi lên quá lớn.',
  415: 'Định dạng không được hỗ trợ.',
  422: 'Dữ liệu chưa hợp lệ.',
  429: 'Vui lòng chờ trước khi thử lại.',
  503: 'Dịch vụ tạm thời chưa sẵn sàng.',
};

/** Carries only a safe category and optional sanitized underlying classification. */
export class Failure extends Error {
  constructor(status, category, classification = null, retryAfter = null) {
    super(category);
    this.status = status;
    this.category = category;
    this.classification = classification;
    this.retryAfter = retryAfter;
  }
}

/** Rejects late results even when an injected transport ignores its abort signal. */
export function checkpoint(signal) {
  if (signal.aborted) throw new Failure(503, 'unavailable', 'cancelled');
}

/** No retry or detached follow-up is permitted after timeout/cancellation. */
export async function bounded(work, signal) {
  checkpoint(signal);
  let cancel;
  const cancelled = new Promise((_, reject) => {
    cancel = () => reject(new Failure(503, 'unavailable', 'cancelled'));
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
  try {
    const value = await Promise.race([
      Promise.resolve().then(() => {
        checkpoint(signal);
        return work();
      }),
      cancelled,
    ]);
    checkpoint(signal);
    return value;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

/** Reads at most the declared byte cap, including chunked requests. */
export async function bodyJson(request, signal, maxBytes = 4194304) {
  if (request.method !== 'POST' || new URL(request.url).search) throw new Failure(400, 'request');
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    throw new Failure(415, 'format');
  const declared = request.headers.get('content-length');
  if (declared && (!/^[0-9]+$/.test(declared) || Number(declared) > maxBytes))
    throw new Failure(413, 'size');
  if (!request.body) throw new Failure(400, 'request');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await bounded(() => reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Failure(413, 'size');
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof Failure) throw error;
    throw new Failure(400, 'request');
  } finally {
    // Cancellation must not extend the response deadline for a stalled request stream.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Only allowlisted public error fields leave the handler. No diagnostic logging occurs. */
export function response(data, requestId, origin, status = 200, extras = {}) {
  return new Response(JSON.stringify({ ...data, requestId }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
      'Access-Control-Expose-Headers': 'Retry-After',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
      ...extras,
    },
  });
}

/** SQLSTATE is retained internally, while engine failures remain unavailable rather than conflicts. */
export function rpcFailure(error, student = false) {
  const sqlstate =
    typeof error?.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : 'transport';
  if (sqlstate === 'PT409' || sqlstate === '23505' || sqlstate === '23503')
    return new Failure(409, 'conflict', sqlstate);
  if (sqlstate === 'PT413') return new Failure(413, 'size', sqlstate);
  if (sqlstate === '42501')
    return new Failure(403, student ? 'unavailable_semester' : 'forbidden', sqlstate);
  if (sqlstate === '22023')
    return new Failure(error.message === 'published' ? 403 : 422, 'invalid', sqlstate);
  return new Failure(503, 'unavailable', sqlstate);
}

/** Maps contract failures without echoing rejected input or backend messages. */
export function failureResponse(error, requestId, origin) {
  const fault =
    error instanceof Failure
      ? error
      : error instanceof ContractError
        ? new Failure(400, 'request')
        : new Failure(503, 'unavailable');
  const issues =
    error instanceof ContractError &&
    Number.isSafeInteger(error.row) &&
    Number.isSafeInteger(error.column)
      ? [{ row: error.row, column: error.column, code: 'invalid' }]
      : undefined;
  const status = issues ? 422 : fault.status;
  return response(
    { error: { code: fault.category, message: messages[status] }, ...(issues ? { issues } : {}) },
    requestId,
    origin,
    status,
    fault.retryAfter ? { 'Retry-After': String(fault.retryAfter) } : {},
  );
}
