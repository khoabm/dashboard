/** Defines English routes and memory-only lookup state without DOM, storage or network dependencies. */
import { studentContext } from './student-gradeboard.js';
import { documentNumber } from './gradebook/contracts.js';
import { uiDate, birthDate, vietnamToday } from './gradebook/dates.js';

export const routes = {
  board: '/',
  student: '/personal-gradebook',
  admin: '/personal-gradebook/admin',
};

/** Resolves only known paths; the reserved admin route never authorizes access. */
export function routeFor(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return Object.keys(routes).find((key) => routes[key] === path) || 'missing';
}

/** Reuses B1's string identity and date-only contracts against one Vietnam calendar day. */
export function validateLookup(values, clock = Date.now) {
  const errors = {};
  let identity, date;
  try {
    identity = documentNumber(values.documentNumber);
  } catch {
    errors.documentNumber = 'Vui lòng nhập từ 9 đến 12 chữ số, giữ nguyên số 0 ở đầu.';
  }
  try {
    date = birthDate(uiDate(values.birthDate), vietnamToday(clock));
  } catch {
    errors.birthDate = 'Nhập ngày sinh hợp lệ theo DD/MM/YYYY, không sau hôm nay.';
  }
  return {
    errors,
    value: Object.keys(errors).length ? null : { documentNumber: identity, birthDate: date },
  };
}

/** Owns cancellation, result generations and expiry; snapshots never expose a capability or input. */
export function createLookupState({
  verify,
  onChange = () => {},
  request = async () => {
    throw { status: 503 };
  },
  clock = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let generation = 0,
    disposed = false,
    controller,
    timer,
    capability = null,
    verifiedContext = null;
  let state = { status: 'idle', errors: {} };
  const emit = (next) => {
    state = next;
    onChange({ ...next });
  };
  const invalidate = () => {
    generation++;
    controller?.abort();
    clearTimer(timer);
    capability = null;
    verifiedContext = null;
  };
  const expire = () => {
    if (!disposed && state.status === 'verified' && clock() >= state.expiresAt * 1000) {
      invalidate();
      emit({ status: 'expired', errors: {} });
    }
  };
  return {
    snapshot: () => ({ ...state }),
    checkExpiry: expire,
    context: () => verifiedContext,
    async read(body, { signal } = {}) {
      expire();
      if (disposed || !capability || state.status !== 'verified') throw { status: 401 };
      const owner = generation;
      const combined = AbortSignal.any([
        controller.signal,
        signal || new AbortController().signal,
        AbortSignal.timeout(15000),
      ]);
      if (combined.aborted) throw { status: 503 };
      try {
        let abort;
        const interrupted = new Promise((_, reject) => {
          abort = () => reject({ status: 503 });
          combined.addEventListener('abort', abort, { once: true });
          if (combined.aborted) abort();
        });
        let value;
        try {
          value = await Promise.race([
            request(body, { capability, context: verifiedContext, signal: combined }),
            interrupted,
          ]);
        } finally {
          combined.removeEventListener('abort', abort);
        }
        expire();
        if (disposed || owner !== generation || combined.aborted) throw { status: 401 };
        return value;
      } catch (error) {
        if (error?.status === 401 && !disposed && owner === generation) {
          invalidate();
          emit({ status: 'expired', errors: {} });
        }
        throw error;
      }
    },
    reset() {
      if (!disposed) {
        invalidate();
        emit({ status: 'idle', errors: {} });
      }
    },
    dispose() {
      invalidate();
      disposed = true;
      state = { status: 'disposed', errors: {} };
    },
    async submit(values) {
      if (disposed) return;
      invalidate();
      const checked = validateLookup(values, clock);
      if (!checked.value) {
        emit({ status: 'invalid', errors: checked.errors });
        return;
      }
      controller = new AbortController();
      const signal = controller.signal,
        ticket = generation;
      emit({ status: 'loading', errors: {} });
      timer = setTimer(() => {
        if (!disposed && ticket === generation) {
          invalidate();
          emit({ status: 'unavailable', errors: {} });
        }
      }, 15000);
      try {
        const result = await verify(checked.value, { signal });
        if (disposed || ticket !== generation || signal.aborted) return;
        clearTimer(timer);
        if (
          result?.kind === 'verified' &&
          typeof result.capability === 'string' &&
          result.capability.length > 0 &&
          result.capability.length <= 8192 &&
          Number.isSafeInteger(result.expiresAt) &&
          result.expiresAt * 1000 > clock() &&
          result.expiresAt * 1000 <= clock() + 600000
        ) {
          const context = studentContext(result.context);
          capability = result.capability;
          verifiedContext = context;
          emit({ status: 'verified', errors: {}, expiresAt: result.expiresAt });
          timer = setTimer(expire, result.expiresAt * 1000 - clock());
        } else
          emit({
            status: ['neutral', 'limited'].includes(result?.kind) ? result.kind : 'unavailable',
            errors: {},
          });
      } catch {
        if (!disposed && ticket === generation && !signal.aborted) {
          clearTimer(timer);
          emit({ status: 'unavailable', errors: {} });
        }
      }
    },
  };
}
