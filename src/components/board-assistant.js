/** Renders a memory-only, source-grounded chatbot panel with explicit read-only Board controls. */
import { el, button } from '../utils/dom.js';
import {
  assistantLimits,
  validAssistantQuery,
  resolveAssistantAction,
  validateAssistantSources,
} from '../utils/board-assistant.js';
import { PulseIndicator, setPendingMessage } from './pending.js';

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
function messageTime() {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  );
}

/**
 * Builds a Board-owned assistant and floating entry point.
 * The caller invalidates its memory-only conversation on snapshot or route changes.
 */
export function BoardAssistant({ snapshot, request, perform, hosted = false, live = false }) {
  let dialog = null,
    controller = null,
    generation = 0;
  const trigger = button('', open, 'assistant-trigger', {
    'aria-haspopup': 'dialog',
    'aria-controls': 'assistant-dialog',
    'aria-label': 'Mở trợ lý học liệu',
  });
  trigger.append(
    el('span', { class: 'assistant-trigger-badge' }, assistantAvatar('assistant-trigger-avatar')),
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
    trigger.setAttribute('aria-expanded', 'false');
  }

  /** Opens a native modal; the chat transcript alone scrolls above its composer. */
  function open() {
    if (dialog?.open) return;
    const corpusAtOpen = publicAssistantCorpus(snapshot());
    const catalogAtOpen = corpusAtOpen.posts;
    let context = null;
    let chatHistory = [];
    let cloudAvailable = hosted;
    const title = el('h2', { id: 'assistant-title' }, 'Cùng tìm học liệu');
    const close = button(
      '×',
      () => {
        invalidate();
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
    const status = PulseIndicator();
    status.classList.add('assistant-pending');
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
      'Dừng tìm',
      () => {
        context = null;
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
    cloud.checked = live && hosted;
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
      status,
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
        ? 'Dùng AI Cloudflare cho câu hỏi này'
        : 'AI không khả dụng · Chỉ tìm từ khóa';
      disclosure.textContent = cloudAvailable
        ? 'AI là tùy chọn: khi bật, câu hỏi, ngữ cảnh nguồn của phiên và các đoạn văn bản công khai được chọn sẽ gửi đến Cloudflare. Không nhập thông tin cá nhân. Không đọc nội dung tệp hoặc bảng điểm.'
        : hosted
          ? 'AI không khả dụng cho kho học liệu này. Chỉ tìm từ khóa; không gửi đến Cloudflare.'
          : 'AI đang tắt. Chỉ tìm từ khóa trên trang; không gửi đến Cloudflare, không đọc tệp hoặc bảng điểm.';
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
      context = null;
      controller?.abort();
      controller = null;
    });
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
      live
        ? 'Xin chào! Bạn có thể hỏi kiến thức chung, hỏi tiếp trong hội thoại hoặc tìm hiểu các bài đăng công khai trên Vui học cùng cô Quỳnh.'
        : 'Xin chào! Mình có thể giới thiệu Vui học cùng cô Quỳnh, hướng dẫn ứng dụng, tìm và đối chiếu nội dung các bài đăng công khai.',
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
      const action = resolveAssistantAction(value, publicAssistantCorpus(snapshot()).posts);
      if (!action) {
        error.textContent = 'Học liệu đã thay đổi. Hãy tìm lại.';
        return;
      }
      // Remove the old focus owner before the preview captures its return target.
      invalidate();
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
    function showResults(result, catalog, question, fingerprint) {
      result = { ...result, sources: validateAssistantSources(result.sources, catalog) };
      const content = el(
        'div',
        {},
        el(
          'strong',
          { class: 'assistant-result-mode' },
          result.mode === 'ai'
            ? result.status === 'insufficient'
              ? 'AI · Chưa đủ nguồn để trả lời'
              : live && !result.sources.length
                ? 'AI · Kiến thức chung'
                : 'AI · Trả lời từ nội dung công khai có nguồn'
            : result.mode === 'deterministic'
              ? result.status === 'insufficient'
                ? 'Cần làm rõ câu hỏi · Không dùng AI'
                : 'Thông tin website · Không dùng AI'
              : 'Tìm bằng từ khóa · AI không được sử dụng',
        ),
        el(
          'p',
          { class: 'assistant-result-intro' },
          result.mode === 'deterministic'
            ? result.status === 'insufficient'
              ? 'Bạn hãy nêu tên bài học hoặc chọn nguồn để trợ lý hỗ trợ đúng nội dung.'
              : 'Thông tin tính từ snapshot công khai hiện tại.'
            : result.sources.length
              ? 'Mình tìm thấy một số nội dung có thể hữu ích. Bạn có thể mở nguồn để xem đầy đủ.'
              : live && result.mode === 'ai'
                ? 'Câu trả lời này dùng kiến thức của AI, không phải trích dẫn từ Board.'
                : 'Chưa tìm thấy nội dung phù hợp trong văn bản đã tải. Bạn thử chi tiết hoặc tên bài đăng, hoặc hỏi “Web có những gì?” nhé.',
        ),
      );
      if (result.note) content.append(el('p', { class: 'assistant-answer-note' }, result.note));
      if (result.answer)
        content
          .querySelector('strong')
          .after(el('p', { class: 'assistant-learning-answer' }, result.answer));
      if (result.mode === 'ai')
        content.append(
          el(
            'p',
            { class: 'assistant-answer-note' },
            live
              ? 'AI có thể trả lời sai. Hãy đối chiếu thông tin quan trọng và các nguồn được dẫn.'
              : 'AI có thể diễn giải sai. Hãy đối chiếu nguồn; chỉ dùng văn bản công khai được cung cấp.',
          ),
        );
      for (const source of result.sources) {
        const post = catalog.find((p) => p.id === source.id);
        if (!post) continue;
        const checkedAct = (action) => {
          if (JSON.stringify(publicAssistantCorpus(snapshot())) !== fingerprint) {
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
                invalidate();
                return;
              }
              act({ type: 'filter', ids: result.sources.map((source) => source.id) });
            },
            'button subtle assistant-filter-button',
          ),
        );
      }
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
        invalidate();
        return;
      }
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
          invalidate();
          return;
        }
        if (!result.note)
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
        input.value = '';
      } catch (failure) {
        if (ticket !== generation || signal.aborted || !ownDialog.open) return;
        if (live) {
          error.textContent =
            failure?.message === 'rate_limit'
              ? 'Bạn gửi hơi nhanh. Chờ khoảng 10 giây rồi gửi tiếp nhé.'
              : failure?.message === 'provider_quota'
                ? 'Cloudflare tạm hết hạn mức miễn phí. Hãy thử lại sau; tìm bằng từ khóa vẫn dùng được.'
                : 'AI tạm thời chưa trả lời được. Bạn có thể gửi lại sau hoặc bỏ chọn AI để tìm bằng từ khóa.';
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
  return { element: trigger, invalidate };
}
