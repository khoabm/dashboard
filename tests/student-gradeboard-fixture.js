/** Development-only CP05 reproduction; imports real components, never a production service/client. */
import '../src/styles/main.css';
import { StudentLookup } from '../src/components/student-lookup.js';
import { el, button } from '../src/utils/dom.js';
import { fixtureContext } from './student-gradeboard-data.js';

const controls = document.querySelector('#qa-controls');
controls.style.cssText =
  'padding:12px;background:#fff1d1;display:flex;gap:12px;align-items:center;flex-wrap:wrap;overflow-wrap:anywhere;font-size:12px';
controls.append(el('strong', {}, 'QA SYNTHETIC · OFFLINE · KHÔNG DÙNG DỮ LIỆU THẬT'));
const root = document.querySelector('#app');
const embedded = new URL(location.href).searchParams.has('embedded');
if (!embedded) {
  const width = el(
    'select',
    { 'aria-label': 'Chiều rộng QA' },
    ...[360, 390, 768, 1024, 1440].map((n) => el('option', { value: String(n) }, String(n))),
  );
  width.value = '1440';
  const frame = el('iframe', {
    src: '/tests/student-gradeboard.html?embedded=1',
    title: 'CP05 synthetic viewport',
    width: '1440',
    height: '1050',
  });
  frame.style.cssText = 'border:0;display:block;background:white';
  width.addEventListener('change', () => {
    frame.width = width.value;
  });
  controls.append(
    el('label', {}, 'CSS px ', width),
    button('Thu hồi phiên (401)', () =>
      frame.contentWindow.postMessage({ action: 'revoke' }, location.origin),
    ),
    button('Hết phiên trong modal', () =>
      frame.contentWindow.postMessage({ action: 'expire' }, location.origin),
    ),
    button('Trả phản hồi đang giữ', () =>
      frame.contentWindow.postMessage({ action: 'release' }, location.origin),
    ),
    button('Rời view', () => frame.contentWindow.postMessage({ action: 'leave' }, location.origin)),
  );
  root.style.overflow = 'auto';
  root.append(frame);
} else {
  // Runtime fetch guard is independent of the fail-closed production adapters, which are never imported.
  let external = 0,
    errors = 0,
    verifyCalls = 0,
    readCalls = 0,
    nowOffset = 0,
    view,
    issued = null;
  const pending = [];
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (url, init) => {
    const target = new URL(typeof url === 'string' ? url : url.url, location.href);
    if (target.origin !== location.origin) {
      external++;
      throw Error('External request blocked');
    }
    return nativeFetch(url, init);
  };
  window.addEventListener('error', () => errors++);
  window.addEventListener('unhandledrejection', () => errors++);
  const select = (name, values) => {
    const input = el(
      'select',
      { 'aria-label': name },
      ...values.map((v) => el('option', { value: v }, v)),
    );
    controls.append(el('label', {}, name, input));
    return input;
  };
  const contextMode = select('Context', ['valid', 'missing', 'bad-catalog', 'bad-publication']);
  const response = select('Phản hồi', ['ready', 'empty', 'denied', '401', '429', '503', 'hold']);
  const maximum = select('Số học sinh cao nhất', ['23', '0', '1', '1000']);
  const output = el('output', { 'aria-label': 'Bộ đếm QA' });
  const inspect = () => {
    output.textContent = JSON.stringify({
      verifyCalls,
      readCalls,
      external,
      errors,
      privateView: !!root.querySelector('.student-gradeboard'),
      dialogs: document.querySelectorAll('dialog').length,
    });
  };
  const release = () => pending.splice(0).forEach((resolve) => resolve());
  const expire = () => {
    nowOffset += 601000;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  const leave = () => {
    view?.dispose();
    issued = null;
    root.replaceChildren(el('p', {}, 'Đã rời view; dữ liệu riêng đã được xóa.'));
  };
  const mount = () => {
    leave();
    view = StudentLookup({
      navigate: async () => {
        leave();
        return true;
      },
      clock: () => Date.now() + nowOffset,
      verify: async () => {
        verifyCalls++;
        const context = fixtureContext();
        if (contextMode.value === 'bad-catalog') context.subjects = [];
        if (contextMode.value === 'bad-publication') context.class.semester1Published = 'true';
        issued = Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) =>
          n.toString(16).padStart(2, '0'),
        ).join('');
        return {
          kind: 'verified',
          capability: issued,
          expiresAt: Math.floor((Date.now() + nowOffset) / 1000) + 600,
          ...(contextMode.value === 'missing' ? {} : { context }),
        };
      },
      request: async (body, { capability }) => {
        readCalls++;
        if (!issued || capability !== issued) throw { status: 401 };
        let mode = response.value,
          peak = Number(maximum.value);
        if (mode === 'hold') {
          await new Promise((resolve) => pending.push(resolve));
          mode = response.value;
        }
        if (mode === 'denied') throw { status: 403 };
        if (['401', '429', '503'].includes(mode)) throw { status: Number(mode) };
        if (body.op === 'grades')
          return {
            semester: body.semester,
            scores:
              mode === 'empty'
                ? []
                : [
                    { subjectCode: 'item_0', columnCode: 'item_0', rawScore: '8.25' },
                    { subjectCode: 'item_0', columnCode: 'item_1', rawScore: '0' },
                    { subjectCode: 'item_0', columnCode: 'item_2', rawScore: '10' },
                  ],
          };
        return {
          semester: body.semester,
          subjectCode: body.subjectCode,
          columnCode: body.columnCode,
          grouping: 'display_tenth_half_up',
          buckets: Array.from({ length: 101 }, (_, i) => ({
            scoreBucket: `${Math.floor(i / 10)}.${i % 10}`,
            studentCount:
              mode === 'empty' ? 0 : i === 83 ? peak : i % 10 === 0 ? Math.floor(peak / 2) : 0,
          })),
        };
      },
    });
    root.replaceChildren(view.element);
  };
  // Project the fixture histogram to the same public Edge DTO: no op field is part of a response.
  const actions = {
    expire,
    release,
    leave,
    revoke: () => {
      response.value = '401';
      release();
    },
  };
  window.addEventListener('message', (event) => {
    if (event.origin === location.origin && event.source === parent)
      actions[event.data?.action]?.();
  });
  controls.append(
    button('Hết phiên', expire),
    button('Trả phản hồi', release),
    button('Rời view', leave),
    button('Mở lại fixture', mount),
    button('Inspect', inspect),
    output,
  );
  window.addEventListener('pagehide', () => view?.dispose());
  mount();
}
