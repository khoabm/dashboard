/** Renders a memory-only chat dialog with cited excerpts and explicit read-only Board controls. */
import { el, button } from '../utils/dom.js';
import {
  assistantLimits,
  assistantCatalog,
  localAssistantResults,
  validAssistantQuery,
  resolveAssistantAction,
} from '../utils/board-assistant.js';
import { PulseIndicator, setPendingMessage } from './pending.js';

/** Builds a Board-owned assistant; the caller invalidates it on snapshot or route changes. */
export function BoardAssistant({ snapshot, request, perform, hosted = false }) {
  let dialog = null,
    controller = null,
    generation = 0;
  const trigger = button('Trợ lý học liệu', open, 'button assistant-trigger', {
    'aria-haspopup': 'dialog',
  });

  /** Closes pending work and removes retained public conversation text. */
  function invalidate() {
    generation++;
    controller?.abort();
    controller = null;
    dialog?.close();
    dialog?.remove();
    dialog = null;
  }

  /** Opens a native modal with keyboard focus containment and explicit cloud disclosure. */
  function open() {
    if (dialog?.open) return;
    let cloudAvailable = hosted && assistantCatalog(snapshot()).length <= assistantLimits.posts;
    const title = el('h2', { id: 'assistant-title' }, 'Cùng tìm học liệu');
    const close = button('Đóng', () => dialog.close(), 'button subtle');
    const clear = button(
      'Cuộc trò chuyện mới',
      () => {
        invalidate();
        open();
      },
      'button subtle',
    );
    const messages = el('div', {
      class: 'assistant-messages',
      role: 'log',
      'aria-label': 'Cuộc trò chuyện',
      'aria-live': 'polite',
      'aria-relevant': 'additions',
    });
    const status = PulseIndicator();
    const error = el('p', { id: 'assistant-error', role: 'alert' });
    const input = el('textarea', {
      id: 'assistant-query',
      rows: 2,
      maxlength: 400,
      'aria-describedby': 'assistant-privacy assistant-error',
      placeholder: 'Bạn muốn tìm hiểu học liệu nào?',
    });
    const send = el('button', { type: 'submit', class: 'button primary' }, 'Gửi câu hỏi');
    const stop = button(
      'Dừng',
      () => {
        generation++;
        controller?.abort();
        controller = null;
        busy(false);
        error.textContent = 'Đã dừng. Bạn có thể sửa câu hỏi hoặc tìm bằng từ khóa.';
        input.focus();
      },
      'button',
      { hidden: true },
    );
    const cloud = el('input', { type: 'checkbox', disabled: !cloudAvailable });
    const form = el(
      'form',
      { class: 'assistant-form' },
      el('label', { for: 'assistant-query' }, 'Câu hỏi của bạn'),
      input,
      el('label', { class: 'assistant-consent' }, cloud, 'Dùng AI Cloudflare cho câu hỏi này'),
      el('div', { class: 'assistant-compose-actions' }, send, stop),
    );
    // The modal separates disclosure, scrollable conversation and a persistent composer.
    const ownDialog = el(
      'dialog',
      { class: 'assistant-dialog', 'aria-labelledby': 'assistant-title' },
      el(
        'header',
        { class: 'assistant-heading' },
        el('div', {}, el('span', { class: 'assistant-kicker' }, 'TRỢ LÝ HỌC LIỆU'), title),
        close,
      ),
      el(
        'p',
        { id: 'assistant-privacy', class: 'assistant-disclosure' },
        hosted
          ? cloudAvailable
            ? 'Khi bật AI, câu hỏi và tiêu đề/mô tả học liệu công khai được gửi đến Cloudflare. Bản thử đọc tối đa 24 bài, 1.200 ký tự mô tả/bài. Không nhập thông tin cá nhân. Chưa đọc tệp, ảnh hay video.'
            : 'Kho học liệu vượt giới hạn AI bản thử (24 bài). Bạn vẫn có thể tìm bằng từ khóa trên trang; không có nội dung được gửi Cloudflare.'
          : 'Đang tìm bằng từ khóa trên trang. AI chưa bật. Trợ lý không đọc tệp, ảnh, video hoặc bảng điểm.',
      ),
      el(
        'div',
        { class: 'assistant-tools' },
        clear,
        button('Bỏ bộ lọc trang', () => act({ type: 'reset' }), 'button subtle'),
      ),
      messages,
      status,
      error,
      form,
    );
    dialog = ownDialog;
    document.body.append(ownDialog);
    ownDialog.showModal();
    input.focus();
    messages.append(
      el(
        'p',
        { class: 'assistant-welcome' },
        'Mình giúp bạn tìm học liệu, xem trích đoạn và mở bài hoặc chủ đề. Mỗi thao tác trên trang đều do bạn bấm chọn.',
      ),
    );
    ownDialog.addEventListener(
      'close',
      () => {
        if (dialog !== ownDialog) {
          ownDialog.remove();
          return;
        }
        generation++;
        controller?.abort();
        controller = null;
        ownDialog.remove();
        if (dialog === ownDialog) dialog = null;
        if (!document.querySelector('dialog[open]')) trigger.focus();
      },
      { once: true },
    );

    /** Locks only conflicting chat controls while retaining explicit cancellation. */
    function busy(pending) {
      send.disabled = pending;
      input.disabled = pending;
      cloud.disabled = pending || !cloudAvailable;
      stop.hidden = !pending;
      messages.setAttribute('aria-busy', String(pending));
      setPendingMessage(status, pending ? 'Đang tìm và đối chiếu học liệu…' : '');
    }

    /** Validates actions again at click time; model text never becomes an executable command. */
    function act(value) {
      const action = resolveAssistantAction(value, assistantCatalog(snapshot()));
      if (!action || !perform(action)) {
        error.textContent =
          'Học liệu đã thay đổi hoặc trang đang bận. Hãy đóng trợ lý và tải lại học liệu.';
        return;
      }
      ownDialog.close();
    }

    /** Displays source-derived titles and excerpts using text nodes, never Markdown or HTML. */
    function showResults(result, catalog, question, fingerprint) {
      const message = el(
        'article',
        { class: 'assistant-reply' },
        el(
          'strong',
          {},
          result.mode === 'ai'
            ? 'AI · Trích đoạn từ học liệu'
            : 'Tìm bằng từ khóa · AI không được sử dụng',
        ),
      );
      message.append(
        el(
          'p',
          {},
          result.sources.length
            ? 'Các nội dung có thể hữu ích. Hãy mở nguồn để xem đầy đủ.'
            : 'Chưa tìm thấy nội dung đủ phù hợp trong tiêu đề và mô tả hiện có. Hãy thử từ khóa khác.',
        ),
      );
      for (const source of result.sources) {
        const post = catalog.find((p) => p.id === source.id);
        if (!post) continue;
        const checkedAct = (action) => {
          if (JSON.stringify(assistantCatalog(snapshot())) !== fingerprint) {
            invalidate();
            return;
          }
          act(action);
        };
        message.append(
          el(
            'section',
            { class: 'assistant-source' },
            el('h3', {}, post.title),
            el('p', { class: 'muted' }, post.sectionTitle),
            el('blockquote', {}, source.quote),
            el(
              'div',
              { class: 'assistant-source-actions' },
              button('Mở học liệu', () => checkedAct({ type: 'open', id: post.id })),
              button(
                'Xem chủ đề',
                () => checkedAct({ type: 'topic', id: post.sectionId }),
                'button subtle',
              ),
            ),
          ),
        );
      }
      message.append(
        button(
          'Lọc trang theo câu hỏi',
          () => act({ type: 'filter', query: question }),
          'button subtle',
        ),
      );
      messages.append(message);
      while (messages.children.length > 9) messages.firstElementChild.remove();
      message.scrollIntoView({ block: 'nearest' });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (controller) return;
      const question = input.value.trim();
      if (!validAssistantQuery(question)) {
        error.textContent =
          'Nhập câu hỏi từ 1–400 ký tự, không kèm email, số định danh hoặc ngày sinh.';
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      input.removeAttribute('aria-invalid');
      error.textContent = '';
      const catalog = assistantCatalog(snapshot());
      const fingerprint = JSON.stringify(catalog);
      const ticket = ++generation;
      controller = new AbortController();
      const signal = controller.signal;
      messages.append(el('p', { class: 'assistant-question' }, question));
      busy(true);
      try {
        const result = cloud.checked
          ? await request(question, catalog, { signal })
          : { mode: 'keyword', sources: localAssistantResults(question, catalog) };
        if (ticket !== generation || signal.aborted || !ownDialog.open) return;
        if (fingerprint !== JSON.stringify(assistantCatalog(snapshot()))) {
          invalidate();
          return;
        }
        showResults(result, catalog, question, fingerprint);
        input.value = '';
      } catch {
        if (ticket !== generation || signal.aborted || !ownDialog.open) return;
        // Failures never masquerade as successful AI responses or silently retry.
        cloud.checked = false;
        cloudAvailable = false;
        cloud.disabled = true;
        error.textContent =
          'AI chưa thể trả lời. Đã tắt AI trong phiên trang này; bạn có thể gửi lại để tìm bằng từ khóa.';
        hosted = false;
      } finally {
        if (ticket === generation && ownDialog.open) {
          controller = null;
          busy(false);
          input.focus();
        }
      }
    });
  }
  return { element: trigger, invalidate };
}
