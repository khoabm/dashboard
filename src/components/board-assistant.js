/** Renders a memory-only, source-grounded chatbot panel with explicit read-only Board controls. */
import { el, button } from '../utils/dom.js';
import {
  assistantLimits,
  validAssistantQuery,
  resolveAssistantAction,
  validateAssistantSources,
} from '../utils/board-assistant.js';

import {
  learningIntent,
  websiteLearningAnswer,
  validateLearningContext,
} from '../utils/assistant-learning.js';

import {
  publicAssistantCorpus,
  retrievePublicContent,
  publicLocalResult,
} from '../utils/public-retrieval.js';

const avatarPath = '/placeholders/assistant-avatar.png';

/** Creates the consistent decorative assistant avatar without implying file or voice support. */
function assistantAvatar(className = 'assistant-avatar') {
  return el('img', { src: avatarPath, alt: '', class: className, 'aria-hidden': 'true' });
}

/** Draws monochrome toolbar icons without adding a UI dependency. */
function assistantToolIcon(kind) {
  const paths = {
    new: ['M4 5h16v12H9l-5 3V5', 'M12 8v6', 'M9 11h6'],
    filter: ['M4 6h16', 'M7 12h10', 'M10 18h4'],
    topic: ['M9 18h6', 'M10 21h4', 'M8 14a6 6 0 1 1 8 0c-1 1-1.5 2-1.5 4h-5C9.5 16 9 15 8 14'],
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths[kind]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** Creates a labelled shortcut with a distinct accessible action and supporting description. */
function assistantTool(label, detail, icon, callback) {
  const control = button('', callback, 'assistant-tool-card', {
    'aria-label': `${label} — ${detail}`,
  });
  control.append(
    el(
      'span',
      { class: `assistant-tool-icon assistant-tool-icon--${icon}` },
      assistantToolIcon(icon),
    ),
    el(
      'span',
      { class: 'assistant-tool-copy' },
      el('strong', {}, label),
      el('span', { class: 'assistant-tool-detail' }, detail),
    ),
  );
  return control;
}

/** Returns a local display time; no conversation data is persisted or transmitted. */
function messageTime(at = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(at),
  );
}

/**
 * Builds a Board-owned assistant and floating entry point.
 * The page keeps public chat in memory until a deliberate new chat or page disposal.
 */
export function BoardAssistant({ snapshot, request, perform, hosted = false, live = false }) {
  let dialog = null,
    controller = null,
    generation = 0,
    context = null,
    chatHistory = [],
    transcript = [],
    cloudChoice = null,
    pendingQuestion = null,
    lastCorpus = publicAssistantCorpus(snapshot());
  const trigger = button('', open, 'assistant-trigger', {
    'aria-haspopup': 'dialog',
    'aria-controls': 'assistant-dialog',
    'aria-label': 'Mở trợ lý học liệu',
  });
  trigger.append(
    el('span', { class: 'assistant-trigger-badge' }, assistantAvatar('assistant-trigger-avatar')),
    el('span', { class: 'assistant-trigger-label' }, 'Hỏi trợ lý'),
  );

  /** Closes the panel without erasing this page's completed conversation. */
  function dismiss() {
    generation++;
    if (pendingQuestion) {
      transcript.push({
        kind: 'notice',
        text: 'Mình đã dừng trả lời khi bạn đóng cuộc trò chuyện. Bạn có thể hỏi lại nhé.',
        at: new Date().toISOString(),
      });
      pendingQuestion = null;
    }
    controller?.abort();
    controller = null;
    dialog?.close();
    dialog?.remove();
    dialog = null;
    trigger.setAttribute('aria-expanded', 'false');
  }

  /** A new conversation is the only in-page operation that discards all messages. */
  function invalidate() {
    dismiss();
    context = null;
    chatHistory = [];
    transcript = [];
    cloudChoice = null;
    pendingQuestion = null;
  }

  /** Refreshes public-source references without discarding the conversation. */
  function reconcile() {
    const fresh = publicAssistantCorpus(snapshot());
    if (JSON.stringify(fresh) === JSON.stringify(lastCorpus)) return;
    const previous = new Map(lastCorpus.posts.map((post) => [post.id, post]));
    const current = new Map(fresh.posts.map((post) => [post.id, post]));
    const changed = new Set(
      [...new Set([...previous.keys(), ...current.keys()])].filter(
        (id) => JSON.stringify(previous.get(id)) !== JSON.stringify(current.get(id)),
      ),
    );
    // Keep general chat and unaffected citations; never send a changed published
    // source's former answer or its paired question back to the model.
    chatHistory = chatHistory.filter((turn, index, turns) => {
      const linked = turn.role === 'assistant' ? turn : turns[index + 1];
      return !(linked?.role === 'assistant' && linked.sourceIds?.some((id) => changed.has(id)));
    });
    if (context?.ids.some((id) => changed.has(id))) context = null;
    lastCorpus = fresh;
    if (dialog?.open) {
      // Rebuild source cards against the new published projection and preserve
      // any unsent question when a background refresh finishes mid-composition.
      const draft = dialog.querySelector('#assistant-query')?.value || '';
      dismiss();
      open();
      dialog.querySelector('#assistant-query').value = draft;
    }
  }

  /** Opens a native modal; the chat transcript alone scrolls above its composer. */
  function open() {
    if (dialog?.open) return;
    const corpusAtOpen = publicAssistantCorpus(snapshot());
    const catalogAtOpen = corpusAtOpen.posts;
    let cloudAvailable = hosted;
    const title = el('h2', { id: 'assistant-title' }, 'Trợ lý học liệu');
    const close = button(
      '×',
      () => {
        dismiss();
        trigger.focus();
      },
      'assistant-close',
      {
        'aria-label': 'Đóng trợ lý học liệu',
        title: 'Đóng trợ lý',
      },
    );
    const clear = assistantTool('Cuộc trò chuyện mới', 'Bắt đầu lại', 'new', () => {
      invalidate();
      open();
    });
    const reset = assistantTool('Bộ lọc trang', 'Đặt lại bộ lọc', 'filter', () =>
      act({ type: 'reset' }),
    );
    const topicTool = assistantTool('Gợi ý chủ đề', 'Từ học liệu hiện có', 'topic', () => {
      suggestions.scrollIntoView({ block: 'nearest' });
      suggestionRow.querySelector('button')?.focus({ preventScroll: true });
    });
    const messages = el('div', {
      id: 'assistant-messages',
      class: 'assistant-messages',
      role: 'log',
      'aria-label': 'Cuộc trò chuyện với trợ lý học liệu',
      'aria-live': 'polite',
      'aria-relevant': 'additions',
    });
    // A compact messenger-style typing indicator beside the existing bot avatar.
    const typing = el(
      'div',
      { class: 'assistant-message assistant-message-bot assistant-typing', role: 'status' },
      assistantAvatar('assistant-message-avatar'),
      el(
        'span',
        { class: 'assistant-typing-bubble', 'aria-hidden': 'true' },
        el('span', { class: 'assistant-typing-dot' }),
        el('span', { class: 'assistant-typing-dot' }),
        el('span', { class: 'assistant-typing-dot' }),
      ),
      el('span', { class: 'assistant-visually-hidden' }, 'Trợ lý đang trả lời…'),
    );
    typing.hidden = true;
    messages.append(typing);
    const error = el('p', { id: 'assistant-error', role: 'alert' });
    const input = el('textarea', {
      id: 'assistant-query',
      rows: 2,
      maxlength: assistantLimits.query,
      'aria-describedby': 'assistant-privacy assistant-error assistant-input-help',
      placeholder: live ? 'Bạn muốn hỏi điều gì?' : 'Bạn muốn hỏi về website hoặc bài đăng nào?',
    });
    const send = el('button', { type: 'submit', class: 'assistant-send' }, 'Gửi');
    const stop = button(
      'Dừng trả lời',
      () => {
        context = null;
        generation++;
        controller?.abort();
        controller = null;
        pendingQuestion = null;
        busy(false);
        const stoppedAt = new Date().toISOString();
        const stoppedText = 'Đã dừng trả lời. Bạn có thể sửa câu hỏi hoặc hỏi lại nhé.';
        transcript.push({ kind: 'notice', text: stoppedText, at: stoppedAt });
        assistantMessage(stoppedText, 'assistant-notice', stoppedAt);
        error.textContent = '';
        input.focus();
      },
      'button subtle assistant-stop',
      { hidden: true },
    );
    const cloud = el('input', { type: 'checkbox', disabled: !cloudAvailable });
    cloud.checked = cloudChoice ?? (live && hosted);
    cloud.addEventListener('change', () => {
      cloudChoice = cloud.checked;
    });
    const form = el(
      'form',
      { class: 'assistant-form' },
      el('label', { for: 'assistant-query', class: 'assistant-input-label' }, 'Câu hỏi của bạn'),
      el('div', { class: 'assistant-compose-row' }, input, send),
      el(
        'div',
        { class: 'assistant-compose-meta' },
        el('label', { class: 'assistant-consent' }, cloud, el('span', {}, 'Dùng AI để trả lời')),
        el('span', { id: 'assistant-input-help', class: 'assistant-input-help' }, 'Enter để gửi'),
        stop,
      ),
    );
    // Only sections represented by published posts may appear in suggested topics.
    const suggestionTopics = [...new Set(catalogAtOpen.map((post) => post.sectionTitle.trim()))]
      .filter(Boolean)
      .slice(0, 3);
    const suggestionRow = el('div', { class: 'assistant-suggestions' });
    for (const topic of suggestionTopics) {
      suggestionRow.append(
        button(
          topic,
          () => {
            input.value = topic.slice(0, assistantLimits.query);
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          },
          'assistant-suggestion',
          { title: topic, 'aria-label': `Tìm học liệu thuộc chủ đề ${topic}` },
        ),
      );
    }
    const suggestions = el(
      'section',
      { class: 'assistant-suggestions-section', 'aria-label': 'Gợi ý chủ đề' },
      el('span', { class: 'assistant-suggestions-title' }, 'Khám phá chủ đề'),
      suggestionRow,
    );
    suggestions.hidden = suggestionTopics.length === 0;
    topicTool.disabled = suggestions.hidden;

    // Desktop keeps nonessential tools available without taking space from the transcript.
    const utilityToggle = button(
      'Công cụ & chủ đề',
      () => {
        const expanded = utilities.classList.toggle('assistant-utilities-expanded');
        utilityToggle.setAttribute('aria-expanded', String(expanded));
      },
      'assistant-utilities-toggle',
      {
        'aria-controls': 'assistant-utilities-content',
        'aria-expanded': 'false',
      },
    );
    utilityToggle.append(
      el('span', { class: 'assistant-utilities-hint' }, 'Mở thao tác và gợi ý'),
      el('span', { class: 'assistant-utilities-chevron', 'aria-hidden': 'true' }),
    );
    const utilities = el(
      'section',
      { class: 'assistant-utilities', 'aria-label': 'Công cụ và chủ đề học liệu' },
      utilityToggle,
      el(
        'div',
        { id: 'assistant-utilities-content', class: 'assistant-utilities-content' },
        el(
          'div',
          { class: 'assistant-tools', role: 'group', 'aria-label': 'Tùy chọn cuộc trò chuyện' },
          clear,
          reset,
          topicTool,
        ),
        suggestions,
      ),
    );

    // The header, optional tools, scrolling transcript and fixed composer form the panel.
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
            live
              ? 'Hỏi kiến thức chung hoặc nội dung bài đăng công khai.'
              : 'Tìm và đối chiếu văn bản bài đăng công khai.',
          ),
        ),
        close,
      ),
      utilities,
      messages,
      error,
      el(
        'div',
        { class: 'assistant-composer' },
        form,
        el('p', { id: 'assistant-privacy', class: 'assistant-disclosure' }, ''),
      ),
    );
    const disclosure = ownDialog.querySelector('#assistant-privacy');
    disclosure.setAttribute('role', 'status');
    /** Keeps privacy and availability text synchronized, including after failure. */
    function updateCloudDisclosure() {
      ownDialog.querySelector('.assistant-consent span').textContent = cloudAvailable
        ? 'Dùng AI để trả lời'
        : 'Chỉ tìm bài theo từ khóa';
      disclosure.textContent = cloudAvailable
        ? 'Khi bật AI, câu hỏi, tin nhắn gần đây và nội dung bài đăng công khai liên quan được gửi đến Cloudflare. AI có thể nhầm lẫn; đừng chia sẻ thông tin cá nhân hoặc bảng điểm.'
        : hosted
          ? 'AI tạm thời không khả dụng. Bạn vẫn có thể tìm bài theo từ khóa.'
          : 'AI đang tắt. Bạn vẫn có thể tìm bài theo từ khóa mà không gửi câu hỏi đến Cloudflare.';
    }
    updateCloudDisclosure();
    dialog = ownDialog;
    document.body.append(ownDialog);
    // Explicit boundary wrapping avoids Chromium's document-focus stop at modal edges.
    ownDialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const controls = [
        ...ownDialog.querySelectorAll('button, input, textarea, [tabindex]'),
      ].filter(
        (control) => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length,
      );
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    // Native cancel precedes the queued close event: abort before a late embedding can start Qwen.
    ownDialog.addEventListener('cancel', () => {
      if (dialog !== ownDialog) return;
      generation++;
      if (pendingQuestion) {
        transcript.push({
          kind: 'notice',
          text: 'Đã dừng trả lời. Bạn có thể hỏi lại nhé.',
          at: new Date().toISOString(),
        });
        pendingQuestion = null;
      }
      controller?.abort();
      controller = null;
    });
    ownDialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    input.focus();

    /** Adds one assistant bubble, keeping text as DOM text rather than injected HTML. */
    function assistantMessage(content, className = '', at = new Date().toISOString()) {
      const bubble = el('div', { class: 'assistant-bubble ' + className }, content);
      const row = el(
        'div',
        { class: 'assistant-message assistant-message-bot' },
        assistantAvatar('assistant-message-avatar'),
        el(
          'div',
          { class: 'assistant-message-content' },
          bubble,
          el('time', { datetime: at }, messageTime(at)),
        ),
      );
      messages.append(row);
      return bubble;
    }

    if (!transcript.length)
      assistantMessage(
        live
          ? 'Chào bạn! Mình có thể giúp giải đáp thắc mắc hoặc tìm hiểu các bài viết trên trang. Bạn muốn hỏi gì nào?'
          : 'Chào bạn! Mình có thể giúp tìm bài viết và giới thiệu những gì có trên trang. Bạn muốn bắt đầu từ đâu?',
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
      typing.hidden = !pending;
      if (pending) {
        messages.append(typing);
        messages.scrollTop = messages.scrollHeight;
      }
    }

    /** Rechecks current published sources before any user-confirmed Board action. */
    function act(value) {
      const action = resolveAssistantAction(value, publicAssistantCorpus(snapshot()).posts);
      if (!action) {
        error.textContent = 'Học liệu đã thay đổi. Hãy tìm lại.';
        return;
      }
      // Opening a source, switching topic, filtering or resetting the Board
      // must not clear a conversation that belongs to this browser document.
      dismiss();
      trigger.focus({ preventScroll: true });
      if (!perform(action)) {
        open();
        dialog.querySelector('#assistant-error').textContent =
          'Học liệu đã thay đổi hoặc trang đang bận. Hãy đóng trợ lý và tải lại học liệu.';
        return;
      }
      ownDialog.close();
    }

    /** Shows exact cited excerpts in compact resource cards with explicit read-only actions. */
    function showResults(
      result,
      catalog,
      question,
      fingerprint,
      remember = true,
      at = new Date().toISOString(),
    ) {
      // Older answers stay readable, but no revoked/edited quote may regain
      // an actionable source card when the panel is reopened after refresh.
      const currentSources = result.sources.filter((source) =>
        catalog.some(
          (post) =>
            post.id === source.id &&
            typeof source.quote === 'string' &&
            (post.body.includes(source.quote) || post.title.includes(source.quote)),
        ),
      );
      const sourcesChanged = currentSources.length !== result.sources.length;
      result = { ...result, sources: validateAssistantSources(currentSources, catalog) };
      // AI answers should read as messages, not diagnostic reports.
      const content = el('div');
      if (result.mode !== 'ai') {
        content.append(
          el(
            'strong',
            { class: 'assistant-result-mode' },
            result.mode === 'deterministic' ? 'Thông tin từ trang' : 'Kết quả tìm bài viết',
          ),
        );
      }
      if (result.answer) {
        content.append(el('p', { class: 'assistant-learning-answer' }, result.answer));
      }
      if (live && result.mode === 'ai') {
        const provenance =
          result.knowledge === 'board'
            ? result.sources.length
              ? 'Thông tin từ bài đăng công khai của website.'
              : 'Chưa có nguồn bài đăng xác nhận thông tin này.'
            : result.knowledge === 'hybrid'
              ? result.sources.length
                ? 'Kết hợp bài đăng công khai và giải thích từ AI.'
                : 'Không tìm thấy nguồn website để kiểm chứng.'
              : 'Kiến thức chung do AI tạo, không phải thông báo của giáo viên.';
        content.append(el('p', { class: 'assistant-answer-note' }, provenance));
      } else if (result.sources.length) {
        content.append(
          el('p', { class: 'assistant-result-intro' }, 'Bạn có thể xem các bài viết bên dưới.'),
        );
      }
      if (result.note && !(live && result.mode === 'ai')) {
        content.append(
          el(
            'p',
            { class: 'assistant-answer-note' },
            live ? 'Mình chỉ tìm trong các bài viết đã tải, chưa đọc tệp đính kèm.' : result.note,
          ),
        );
      }
      if (sourcesChanged)
        content.append(
          el(
            'p',
            { class: 'assistant-answer-note' },
            'Nguồn của câu trả lời này đã thay đổi. Bạn hãy hỏi lại để kiểm tra thông tin mới.',
          ),
        );
      for (const source of result.sources) {
        const post = catalog.find((p) => p.id === source.id);
        if (!post) continue;
        const checkedAct = (action) => {
          if (JSON.stringify(publicAssistantCorpus(snapshot())) !== fingerprint) {
            reconcile();
            dialog?.querySelector('#assistant-error') &&
              (dialog.querySelector('#assistant-error').textContent =
                'Học liệu vừa được cập nhật. Bạn hãy kiểm tra lại nguồn mới nhé.');
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
            ...(result.evidence || [])
              .filter(
                (ref) =>
                  ref.postId === post.id &&
                  ref.quote !== source.quote &&
                  typeof ref.quote === 'string' &&
                  ref.quote.length <= assistantLimits.body &&
                  (post.body.includes(ref.quote) || post.title.includes(ref.quote)),
              )
              .map((ref) => el('blockquote', {}, ref.quote)),
            el(
              'div',
              { class: 'assistant-source-actions' },
              button(
                'Mở học liệu',
                () => checkedAct({ type: 'open', id: post.id }),
                'button primary',
              ),
              button(
                'Xem chủ đề',
                () => checkedAct({ type: 'topic', id: post.sectionId }),
                'button subtle',
              ),
            ),
          ),
        );
      }
      if (result.sources.length) {
        content.append(
          button(
            'Lọc trang theo nguồn đã chọn',
            () => {
              if (JSON.stringify(publicAssistantCorpus(snapshot())) !== fingerprint) {
                reconcile();
                dialog?.querySelector('#assistant-error') &&
                  (dialog.querySelector('#assistant-error').textContent =
                    'Học liệu vừa được cập nhật. Bạn hãy kiểm tra lại nguồn mới nhé.');
                return;
              }
              act({ type: 'filter', ids: result.sources.map((source) => source.id) });
            },
            'button subtle assistant-filter-button',
          ),
        );
      }
      assistantMessage(content, 'assistant-result', at);
      if (remember) {
        transcript.push({
          kind: 'result',
          question,
          at,
          result: {
            mode: result.mode,
            status: result.status,
            answer: result.answer,
            note: result.note,
            sources: result.sources.map(({ id, quote }) => ({ id, quote })),
          },
        });
      }
      messages.scrollTop = messages.scrollHeight;
    }

    /** Recreates transcript with fresh source handlers after a panel reopen. */
    function userMessage(question, remember = true, at = new Date().toISOString()) {
      messages.append(
        el(
          'div',
          { class: 'assistant-message assistant-message-user' },
          el(
            'div',
            { class: 'assistant-message-content' },
            el('p', { class: 'assistant-bubble assistant-question' }, question),
            el('time', { datetime: at }, messageTime(at)),
          ),
        ),
      );
      if (remember) {
        transcript.push({ kind: 'user', text: question, at });
      }
      messages.scrollTop = messages.scrollHeight;
    }

    // Do not restore pending work; only completed bubbles survive dismiss.
    const fingerprintAtOpen = JSON.stringify(corpusAtOpen);
    for (const entry of transcript) {
      if (entry.kind === 'user') userMessage(entry.text, false, entry.at);
      else if (entry.kind === 'result')
        showResults(
          entry.result,
          catalogAtOpen,
          entry.question,
          fingerprintAtOpen,
          false,
          entry.at,
        );
      else if (entry.kind === 'notice') assistantMessage(entry.text, 'assistant-notice', entry.at);
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
      if (
        !(live
          ? question.length > 0 && question.length <= assistantLimits.query
          : validAssistantQuery(question))
      ) {
        error.textContent =
          'Nhập câu hỏi từ 1–400 ký tự. Hãy bỏ email, số định danh và ngày sinh cá nhân; ngày sự kiện được phép.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      error.textContent = '';
      const corpus = publicAssistantCorpus(snapshot());
      const catalog = corpus.posts;
      const fingerprint = JSON.stringify(corpus);
      if (fingerprint !== JSON.stringify(corpusAtOpen)) {
        reconcile();
        if (dialog?.open)
          dialog.querySelector('#assistant-error').textContent =
            'Học liệu vừa được cập nhật. Bạn hãy gửi lại câu hỏi nhé.';
        return;
      }
      const ticket = ++generation;
      controller = new AbortController();
      const signal = controller.signal;
      userMessage(question);
      pendingQuestion = question;
      busy(true);
      try {
        const deterministic = live ? null : websiteLearningAnswer(question, catalog);
        const followup = learningIntent(question, catalog).kind === 'followup';
        const checkedContext = followup ? validateLearningContext(context, catalog) : null;
        const result =
          (live && cloud.checked
            ? await request(question, catalog, { signal, history: chatHistory })
            : null) ||
          deterministic ||
          (followup && !checkedContext
            ? {
                mode: 'deterministic',
                status: 'insufficient',
                sources: [],
                answer:
                  'Bạn hãy chọn hoặc tìm một bài đăng công khai trước khi yêu cầu giải thích tiếp.',
                coverage: 'insufficient',
              }
            : cloud.checked
              ? await request(question, catalog, {
                  signal,
                  version: 3,
                  context: checkedContext,
                  snapshotCoverage: corpus.coverage,
                })
              : publicLocalResult(
                  retrievePublicContent(question, corpus, { context: checkedContext }),
                  corpus,
                  { keyword: true },
                ));
        if (ticket !== generation || signal.aborted || !ownDialog.open) return;
        if (fingerprint !== JSON.stringify(publicAssistantCorpus(snapshot()))) {
          reconcile();
          return;
        }
        if (!result.note && !(live && result.mode === 'ai'))
          result.note = `Thông tin dựa trên dữ liệu công khai đã tải. ${corpus.coverage === 'complete' ? 'Bảng có thể thay đổi sau khi tải.' : 'Chưa xác minh đã tải đủ dữ liệu.'} Không truy cập dữ liệu riêng hoặc nội dung tệp.`;
        context = result.sources.length
          ? {
              query: checkedContext?.query || question,
              ids: result.sources.map((source) => source.id),
            }
          : null;
        if (live && result.mode === 'ai')
          chatHistory = [
            ...chatHistory,
            { role: 'user', content: question },
            {
              role: 'assistant',
              content: result.answer,
              sourceIds: result.sources.map((s) => s.id),
            },
          ].slice(-12);
        showResults(result, catalog, question, fingerprint);
        pendingQuestion = null;
        input.value = '';
      } catch (failure) {
        if (ticket !== generation || signal.aborted || !ownDialog.open) return;
        pendingQuestion = null;
        if (live) {
          error.textContent =
            failure?.message === 'rate_limit'
              ? 'Bạn gửi hơi nhanh. Chờ khoảng 10 giây rồi gửi tiếp nhé.'
              : failure?.message === 'provider_quota'
                ? 'Cloudflare tạm hết hạn mức miễn phí. Hãy thử lại sau; tìm bằng từ khóa vẫn dùng được.'
                : 'Mình chưa trả lời được lúc này. Bạn hãy thử lại hoặc tắt AI để tìm bài theo từ khóa nhé.';
          return;
        }
        context = null;
        // Failed requests never become fake AI answers or initiate implicit retries.
        cloud.checked = false;
        cloudAvailable = false;
        cloud.disabled = true;
        error.textContent =
          (failure?.message === 'quota' ? 'Đã hết hạn mức AI. ' : '') +
          'AI chưa thể trả lời. Đã tắt AI trong phiên trang này; bạn có thể gửi lại để tìm bằng từ khóa.';
        hosted = false;
        updateCloudDisclosure();
      } finally {
        if (ticket === generation && ownDialog.open) {
          controller = null;
          busy(false);
          input.focus();
        }
      }
    });
  }
  return { element: trigger, dismiss, invalidate, reconcile };
}
