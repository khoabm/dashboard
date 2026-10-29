/** Renders a memory-only, source-grounded chatbot panel with explicit read-only Board controls. */
import { el, button } from '../utils/dom.js';
import {
  assistantLimits,
  assistantCatalog,
  localAssistantResults,
  validAssistantQuery,
  resolveAssistantAction,
} from '../utils/board-assistant.js';
import { PulseIndicator, setPendingMessage } from './pending.js';

const avatarPath = '/placeholders/assistant-avatar.png';

/** Creates the consistent decorative assistant avatar without implying file or voice support. */
function assistantAvatar(className = 'assistant-avatar') {
  return el('img', { src: avatarPath, alt: '', class: className, 'aria-hidden': 'true' });
}

/** Returns a local display time; no conversation data is persisted or transmitted. */
function messageTime() {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  );
}

/**
 * Builds a Board-owned assistant and floating entry point.
 * The caller invalidates its memory-only conversation on snapshot or route changes.
 */
export function BoardAssistant({ snapshot, request, perform, hosted = false }) {
  let dialog = null,
    controller = null,
    generation = 0;
  const trigger = button('', open, 'assistant-trigger', {
    'aria-haspopup': 'dialog',
    'aria-controls': 'assistant-dialog',
    'aria-label': 'Mở trợ lý học liệu',
  });
  trigger.append(
    assistantAvatar('assistant-trigger-avatar'),
    el('span', { class: 'assistant-trigger-label' }, 'Hỏi trợ lý'),
  );

  /** Closes pending work and removes retained public conversation text. */
  function invalidate() {
    generation++;
    controller?.abort();
    controller = null;
    dialog?.close();
    dialog?.remove();
    dialog = null;
  }

  /** Opens a native modal; the chat transcript alone scrolls above its composer. */
  function open() {
    if (dialog?.open) return;
    const catalogAtOpen = assistantCatalog(snapshot());
    let cloudAvailable = hosted && catalogAtOpen.length <= assistantLimits.posts;
    const title = el('h2', { id: 'assistant-title' }, 'Cùng tìm học liệu');
    const close = button('×', () => dialog.close(), 'assistant-close', {
      'aria-label': 'Đóng trợ lý học liệu',
      title: 'Đóng trợ lý',
    });
    const clear = button(
      'Cuộc trò chuyện mới',
      () => {
        invalidate();
        open();
      },
      'button subtle assistant-tool-button',
    );
    const messages = el('div', {
      id: 'assistant-messages',
      class: 'assistant-messages',
      role: 'log',
      'aria-label': 'Cuộc trò chuyện với trợ lý học liệu',
      'aria-live': 'polite',
      'aria-relevant': 'additions',
    });
    const status = PulseIndicator();
    status.classList.add('assistant-pending');
    const error = el('p', { id: 'assistant-error', role: 'alert' });
    const input = el('textarea', {
      id: 'assistant-query',
      rows: 2,
      maxlength: assistantLimits.query,
      'aria-describedby': 'assistant-privacy assistant-error assistant-input-help',
      placeholder: 'Bạn muốn tìm học liệu nào?',
    });
    const send = el('button', { type: 'submit', class: 'assistant-send' }, 'Gửi');
    const stop = button(
      'Dừng tìm',
      () => {
        generation++;
        controller?.abort();
        controller = null;
        busy(false);
        error.textContent = 'Đã dừng. Bạn có thể sửa câu hỏi hoặc tìm bằng từ khóa.';
        input.focus();
      },
      'button subtle assistant-stop',
      { hidden: true },
    );
    const cloud = el('input', { type: 'checkbox', disabled: !cloudAvailable });
    const form = el(
      'form',
      { class: 'assistant-form' },
      el('label', { for: 'assistant-query', class: 'assistant-input-label' }, 'Câu hỏi của bạn'),
      el('div', { class: 'assistant-compose-row' }, input, send),
      el(
        'div',
        { class: 'assistant-compose-meta' },
        el(
          'label',
          { class: 'assistant-consent' },
          cloud,
          el('span', {}, 'Dùng AI Cloudflare cho câu hỏi này'),
        ),
        el('span', { id: 'assistant-input-help', class: 'assistant-input-help' }, 'Enter để gửi'),
        stop,
      ),
    );
    // Suggested questions are derived only from current published titles, not assumed content.
    const suggestionTitles = [...new Set(catalogAtOpen.map((post) => post.title.trim()))]
      .filter(Boolean)
      .slice(0, 3);
    const suggestionRow = el('div', { class: 'assistant-suggestions' });
    for (const suggestion of suggestionTitles) {
      suggestionRow.append(
        button(
          suggestion,
          () => {
            input.value = suggestion.slice(0, assistantLimits.query);
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          },
          'assistant-suggestion',
          { title: suggestion },
        ),
      );
    }
    const suggestions = el(
      'section',
      { class: 'assistant-suggestions-section', 'aria-label': 'Gợi ý tìm kiếm' },
      el('span', { class: 'assistant-suggestions-title' }, 'Gợi ý từ học liệu hiện có'),
      suggestionRow,
    );
    suggestions.hidden = suggestionTitles.length === 0;

    // The header, suggestion strip, scrolling transcript and fixed composer form the panel.
    const ownDialog = el(
      'dialog',
      {
        id: 'assistant-dialog',
        class: 'assistant-dialog',
        'aria-labelledby': 'assistant-title',
        'aria-describedby': 'assistant-subtitle',
      },
      el(
        'header',
        { class: 'assistant-heading' },
        assistantAvatar('assistant-heading-avatar'),
        el(
          'div',
          { class: 'assistant-heading-copy' },
          el('span', { class: 'assistant-kicker' }, 'TRỢ LÝ HỌC LIỆU'),
          title,
          el(
            'p',
            { id: 'assistant-subtitle' },
            'Tìm trong tiêu đề và mô tả học liệu đã xuất bản.',
          ),
        ),
        close,
      ),
      el(
        'div',
        { class: 'assistant-tools', role: 'group', 'aria-label': 'Tùy chọn cuộc trò chuyện' },
        clear,
        button('Bỏ bộ lọc trang', () => act({ type: 'reset' }), 'button subtle assistant-tool-button'),
      ),
      suggestions,
      messages,
      status,
      error,
      el(
        'div',
        { class: 'assistant-composer' },
        form,
        el(
          'p',
          { id: 'assistant-privacy', class: 'assistant-disclosure' },
          hosted
            ? cloudAvailable
              ? 'AI là tùy chọn: khi bật, câu hỏi cùng tiêu đề/mô tả học liệu công khai được gửi đến Cloudflare. Không nhập thông tin cá nhân. Trợ lý không đọc tệp, ảnh, video hay bảng điểm.'
              : 'Kho học liệu vượt giới hạn AI bản thử. Bạn vẫn có thể tìm bằng từ khóa; không gửi nội dung đến Cloudflare.'
            : 'Đang tìm theo từ khóa trên trang. AI chưa bật; không đọc tệp, ảnh, video hoặc bảng điểm.',
        ),
      ),
    );
    dialog = ownDialog;
    document.body.append(ownDialog);
    ownDialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    input.focus();

    /** Adds one assistant bubble, keeping text as DOM text rather than injected HTML. */
    function assistantMessage(content, className = '') {
      const bubble = el('div', { class: 'assistant-bubble ' + className }, content);
      const row = el(
        'div',
        { class: 'assistant-message assistant-message-bot' },
        assistantAvatar('assistant-message-avatar'),
        el('div', { class: 'assistant-message-content' }, bubble, el('time', {}, messageTime())),
      );
      messages.append(row);
      return bubble;
    }

    assistantMessage(
      'Xin chào! Mình giúp bạn tìm học liệu theo chủ đề hoặc câu hỏi. Mình sẽ gợi ý những bài học phù hợp từ nội dung đã xuất bản.',
      'assistant-welcome',
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
        trigger.setAttribute('aria-expanded', 'false');
        if (!document.querySelector('dialog[open]')) trigger.focus();
      },
      { once: true },
    );

    /** Locks only conflicting controls and retains an explicit cancellation option. */
    function busy(pending) {
      send.disabled = pending;
      input.disabled = pending;
      cloud.disabled = pending || !cloudAvailable;
      stop.hidden = !pending;
      messages.setAttribute('aria-busy', String(pending));
      setPendingMessage(status, pending ? 'Đang tìm và đối chiếu học liệu…' : '');
    }

    /** Rechecks current published sources before any user-confirmed Board action. */
    function act(value) {
      const action = resolveAssistantAction(value, assistantCatalog(snapshot()));
      if (!action || !perform(action)) {
        error.textContent =
          'Học liệu đã thay đổi hoặc trang đang bận. Hãy đóng trợ lý và tải lại học liệu.';
        return;
      }
      ownDialog.close();
    }

    /** Shows exact cited excerpts in compact resource cards with explicit read-only actions. */
    function showResults(result, catalog, question, fingerprint) {
      const content = el(
        'div',
        {},
        el(
          'strong',
          { class: 'assistant-result-mode' },
          result.mode === 'ai'
            ? 'AI · Trích đoạn từ học liệu'
            : 'Tìm bằng từ khóa · AI không được sử dụng',
        ),
        el(
          'p',
          { class: 'assistant-result-intro' },
          result.sources.length
            ? 'Mình tìm thấy một số nội dung có thể hữu ích. Bạn có thể mở nguồn để xem đầy đủ.'
            : 'Chưa tìm thấy nội dung phù hợp trong tiêu đề và mô tả hiện có. Bạn thử từ khóa khác nhé.',
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
        content.append(
          el(
            'section',
            { class: 'assistant-source' },
            el('span', { class: 'assistant-source-category' }, post.sectionTitle),
            el('h3', {}, post.title),
            el('blockquote', {}, source.quote),
            el(
              'div',
              { class: 'assistant-source-actions' },
              button('Mở học liệu', () => checkedAct({ type: 'open', id: post.id }), 'button primary'),
              button(
                'Xem chủ đề',
                () => checkedAct({ type: 'topic', id: post.sectionId }),
                'button subtle',
              ),
            ),
          ),
        );
      }
      content.append(
        button(
          'Lọc trang theo câu hỏi',
          () => act({ type: 'filter', query: question }),
          'button subtle assistant-filter-button',
        ),
      );
      assistantMessage(content, 'assistant-result');
      while (messages.children.length > 9) messages.firstElementChild.remove();
      messages.scrollTop = messages.scrollHeight;
    }

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (controller) return;
      const question = input.value.trim();
      if (!validAssistantQuery(question)) {
        error.textContent =
          'Nhập câu hỏi từ 1–400 ký tự, không kèm email, số định danh hoặc ngày sinh.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      error.textContent = '';
      const catalog = assistantCatalog(snapshot());
      const fingerprint = JSON.stringify(catalog);
      const ticket = ++generation;
      controller = new AbortController();
      const signal = controller.signal;
      messages.append(
        el(
          'div',
          { class: 'assistant-message assistant-message-user' },
          el(
            'div',
            { class: 'assistant-message-content' },
            el('p', { class: 'assistant-bubble assistant-question' }, question),
            el('time', {}, messageTime()),
          ),
        ),
      );
      messages.scrollTop = messages.scrollHeight;
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
        // Failed requests never become fake AI answers or initiate implicit retries.
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
