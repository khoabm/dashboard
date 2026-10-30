/** Keeps horizontal board navigation reachable and preserves a visible section across rerenders. */

import { el, button } from '../utils/dom.js';

/**
 * Captures the first visible section and its offset, independent of column width.
 * @param {HTMLElement|null} board - The currently mounted board.
 * @returns {object|null} A section anchor and fallback scroll position.
 */
export function captureBoardPosition(board) {
  if (!board) return null;
  const bounds = board.getBoundingClientRect();
  const column = [...board.querySelectorAll('[data-section-id]')].find(
    (item) => item.getBoundingClientRect().right > bounds.left + 1,
  );
  return {
    sectionId: column?.dataset.sectionId ?? null,
    offset: column ? column.getBoundingClientRect().left - bounds.left : 0,
    left: board.scrollLeft,
  };
}

/**
 * Resolves an anchor after resize/reorder and clamps fallback positions after deletion.
 * @param {HTMLElement} board - The newly mounted board.
 * @param {object|null} position - A previously captured section anchor.
 * @returns {number} The valid horizontal scroll offset.
 */
export function restoredBoardLeft(board, position) {
  if (!position) return 0;
  const column = [...board.querySelectorAll('[data-section-id]')].find(
    (item) => item.dataset.sectionId === position.sectionId,
  );
  const left = column
    ? board.scrollLeft +
      column.getBoundingClientRect().left -
      board.getBoundingClientRect().left -
      position.offset
    : position.left;
  return Math.max(0, Math.min(left, board.scrollWidth - board.clientWidth));
}

/**
 * Builds a sticky navigation row with native synchronized scrollbars and step buttons.
 * Attach after each board replacement; reset releases observers and stale session references.
 * @returns {object} The navigation element, attach/capture/reset helpers and section reveal action.
 */
export function BoardNavigation() {
  let board = null,
    enabled = false,
    frame = 0,
    trackTarget = null,
    mirrors = [];
  const position = el('span', { class: 'board-navigation-position' });
  const previous = button('←', () => step(-1), 'icon-button', {
    'aria-label': 'Cuộn chủ đề sang trái',
    'aria-controls': 'board',
  });
  const next = button('→', () => step(1), 'icon-button', {
    'aria-label': 'Cuộn chủ đề sang phải',
    'aria-controls': 'board',
  });
  const fill = el('div');
  // The native top scrollbar stays inside the sticky region, above the replaceable board.
  const track = el(
    'div',
    {
      class: 'board-scrollbar',
      tabindex: '0',
      role: 'region',
      'aria-label': 'Cuộn ngang các chủ đề',
      'aria-controls': 'board',
    },
    fill,
  );
  const element = el(
    'div',
    { class: 'board-navigation', hidden: true },
    el(
      'div',
      { class: 'board-navigation-row', role: 'group', 'aria-label': 'Điều hướng bảng chủ đề' },
      el('span', { class: 'board-navigation-title' }, 'Tất cả chủ đề'),
      position,
      previous,
      next,
    ),
    track,
  );
  const headings = el('div', { class: 'board-sticky-headings', hidden: true });
  const headingTrack = el('div', { class: 'board-sticky-heading-track' });
  headings.append(headingTrack);
  const observer = new ResizeObserver(update);
  // Sticky controls are outside the scrollable Board; mirrors follow its native scrollLeft.
  const refreshMirrors = () => {
    if (!board?.isConnected || !mirrors.length) {
      headings.hidden = true;
      return;
    }
    const original = board.querySelector('.section-heading');
    const sticky = headings.parentElement;
    const stickyTop = sticky?.getBoundingClientRect().top ?? 0;
    const controlsHeight = sticky
      ? [...sticky.children]
          .filter((n) => n !== headings && !n.hidden)
          .reduce((sum, n) => sum + n.getBoundingClientRect().height, 0)
      : 0;
    const rect = board.getBoundingClientRect();
    const visible =
      matchMedia('(min-width:701px)').matches &&
      !!original &&
      original.getBoundingClientRect().top <= Math.max(0, stickyTop) + controlsHeight;
    headings.hidden = !visible;
    if (!visible) return;
    headingTrack.style.width = `${rect.width}px`;
    for (let i = 0; i < mirrors.length; i++) {
      const column = board.querySelectorAll('.section-column')[i];
      if (!column) continue;
      const bounds = column.getBoundingClientRect();
      mirrors[i].style.width = `${bounds.width}px`;
      mirrors[i].style.left = `${bounds.left - rect.left}px`;
    }
  };
  window.addEventListener('scroll', refreshMirrors, { passive: true });
  track.addEventListener(
    'scroll',
    () => {
      if (!board || element.hidden) return;
      // Ignore our own scrollbar updates so they cannot interrupt an animated board step.
      if (trackTarget !== null && Math.abs(track.scrollLeft - trackTarget) < 2) {
        trackTarget = null;
        return;
      }
      trackTarget = null;
      const max = track.scrollWidth - track.clientWidth;
      board.scrollLeft =
        max > 0 ? (track.scrollLeft / max) * (board.scrollWidth - board.clientWidth) : 0;
    },
    { passive: true },
  );

  /** Updates overflow, edge buttons and the top scrollbar after layout or scrolling. */
  function update() {
    if (!board?.isConnected) return;
    const max = Math.max(0, board.scrollWidth - board.clientWidth);
    const columns = [...board.querySelectorAll('[data-section-id]')];
    element.hidden =
      !enabled || !matchMedia('(min-width:701px)').matches || max <= 1 || columns.length < 2;
    refreshMirrors();
    if (element.hidden) return;
    fill.style.width = `${track.clientWidth + max}px`;
    const left = (board.scrollLeft / max) * (track.scrollWidth - track.clientWidth);
    if (Math.abs(track.scrollLeft - left) > 1) {
      trackTarget = left;
      track.scrollLeft = left;
    }
    previous.disabled = board.scrollLeft <= 1;
    next.disabled = board.scrollLeft >= max - 1;
    const bounds = board.getBoundingClientRect();
    const visible = columns
      .map((column, index) => ({ index, rect: column.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > bounds.left + 1 && rect.left < bounds.right - 1);
    position.textContent = visible.length
      ? `Chủ đề ${visible[0].index + 1}–${visible.at(-1).index + 1} / ${columns.length}`
      : `${columns.length} chủ đề`;
  }

  /** Coalesces board scroll events without retaining replaced DOM nodes. */
  function scheduleUpdate() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  }

  /**
   * Moves by one actual column and honors reduced-motion preferences.
   * @param {number} direction - Minus one for left, one for right.
   */
  function step(direction) {
    if (!board || element.hidden) return;
    const columns = board.querySelectorAll('[data-section-id]');
    if (columns.length < 2) return;
    const width = columns[1].getBoundingClientRect().left - columns[0].getBoundingClientRect().left;
    board.scrollBy({ left: direction * width, behavior: motion() });
  }

  /** Returns the scroll behavior allowed by the user's motion preference. */
  function motion() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  /** Releases the previous board's listeners, observers and pending frame. */
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    board?.removeEventListener('scroll', scheduleUpdate);
    board = null;
    trackTarget = null;
    mirrors = [];
    headingTrack.replaceChildren();
    headings.hidden = true;
    element.hidden = true;
  }

  return {
    element,
    headings,
    capture: () => captureBoardPosition(board),
    reset,
    /**
     * Binds the current DOM and restores a captured position before painting.
     * @param {HTMLElement} nextBoard - The board already appended to its region.
     * @param {object} options - Whether all sections are shown and the previous anchor.
     */
    attach(nextBoard, { all, position: savedPosition }) {
      reset();
      board = nextBoard;
      enabled = all;
      board.scrollLeft = restoredBoardLeft(board, savedPosition);
      board.addEventListener('scroll', scheduleUpdate, { passive: true });
      mirrors = [...board.querySelectorAll('.section-column')].map((column) => {
        const original = column.querySelector('.section-heading');
        const clone = original.cloneNode(true);
        clone.classList.add('board-heading-mirror');
        // Keep the mirrored topic action keyboard accessible while it is visible.
        // Forward admin's topic action to its canonical control; no duplicate handler.
        for (const button of clone.querySelectorAll('button')) {
          const originalButton = original.querySelector('button');
          button.addEventListener('click', () => originalButton?.click());
        }
        clone.style.backgroundColor = getComputedStyle(original).backgroundColor;
        headingTrack.append(clone);
        return clone;
      });
      observer.observe(board);
      for (const column of board.querySelectorAll('[data-section-id]')) observer.observe(column);
      update();
    },
    /**
     * Reveals a newly confirmed section without scrolling unrelated page ancestors.
     * @param {string} id - The section returned by the successful save.
     */
    reveal(id) {
      const column = [...board.querySelectorAll('[data-section-id]')].find(
        (item) => item.dataset.sectionId === id,
      );
      if (!column) return;
      column.classList.add('section-new');
      const heading = column.querySelector('h2');
      heading.parentElement.append(el('span', { class: 'section-new-label' }, 'Vừa thêm'));
      const left =
        board.scrollLeft + column.getBoundingClientRect().left - board.getBoundingClientRect().left;
      board.scrollTo({ left, behavior: motion() });
      const top = column.getBoundingClientRect().top;
      const inset = element.hidden ? 12 : element.getBoundingClientRect().height + 12;
      if (top < inset || top > window.innerHeight - 100)
        window.scrollTo({ top: Math.max(0, window.scrollY + top - inset), behavior: motion() });
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    },
  };
}
