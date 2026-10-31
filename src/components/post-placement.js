/** Accessible visual placement controls for one post; no persistence or transport. */
import { el, button } from '../utils/dom.js';
import { SelectControl } from './form-controls.js';
import { initialPlacement, placementPeers } from '../utils/post-placement.js';

export function PostPlacement({ posts, post, sectionId, onChange = () => {} }) {
  let topic = sectionId;
  let peers = placementPeers(posts, topic, post?.id);
  let { mode, index } = initialPlacement(posts, post, topic);
  let draftTitle = post?.title || '';
  const root = el('fieldset', { class: 'post-placement' });
  const legend = el('legend', {}, 'Thứ tự hiển thị');
  const hint = el('p', { class: 'post-placement-hint' }, 'Chọn nơi bài đăng xuất hiện trong chủ đề.');
  const choices = el('div', { class: 'post-placement-choices' });
  const radioName = `post-placement-${post?.id || 'new'}`;
  const radios = {};
  for (const [value, label] of [
    ['start', 'Đầu danh sách'],
    ['end', 'Cuối danh sách'],
    ['custom', 'Sau một bài đăng cụ thể'],
  ]) {
    const input = el('input', { type: 'radio', name: radioName, value });
    radios[value] = input;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      mode = value;
      if (mode === 'start') index = 0;
      if (mode === 'end') index = peers.length;
      if (mode === 'custom') index = Math.min(Math.max(index, 1), peers.length);
      render();
      onChange();
    });
    choices.append(el('label', { class: 'post-placement-choice' }, input, el('span', {}, label)));
  }
  const afterSelect = el('select', { 'aria-label': 'Đặt sau bài đăng' });
  const afterControl = SelectControl(afterSelect, { label: 'Đặt sau bài đăng' });
  const preview = el('div', {
    class: 'post-placement-preview',
    role: 'list',
    'aria-label': 'Xem trước thứ tự bài đăng',
  });
  const notice = el('p', { class: 'post-placement-live', role: 'status', 'aria-live': 'polite' });
  let dragging = false;
  const custom = el(
    'div',
    { class: 'post-placement-custom', hidden: true },
    el('label', { class: 'field post-placement-after' }, el('span', {}, 'Đặt sau bài đăng'), afterControl),
    el(
      'div',
      { class: 'post-placement-caption' },
      el('strong', {}, 'Xem trước thứ tự'),
      el('span', {}, 'Kéo dòng nổi bật hoặc dùng mũi tên ↑ ↓'),
    ),
    preview,
    notice,
  );
  root.append(legend, hint, choices, custom);
  afterSelect.addEventListener('change', () => {
    const value = afterSelect.value;
    index = value === '__start__' ? 0 : Math.max(0, peers.findIndex((item) => item.id === value) + 1);
    mode = 'custom';
    renderPreview();
    onChange();
  });

  function setIndex(next, focusAction = '') {
    if (next < 0 || next > peers.length || next === index) return;
    index = next;
    renderPreview();
    notice.textContent = `Đang xem trước vị trí thứ ${index + 1} trong ${peers.length + 1} bài.`;
    if (focusAction) {
      const same = preview.querySelector(`[data-placement-action="${focusAction}"]`);
      const alternate = preview.querySelector(
        `[data-placement-action="${focusAction === 'up' ? 'down' : 'up'}"]`,
      );
      (same?.disabled ? alternate : same)?.focus();
    }
    onChange();
  }

  function renderPreview() {
    afterSelect.replaceChildren(
      el('option', { value: '__start__' }, 'Đầu danh sách'),
      ...peers.map((item) => el('option', { value: item.id }, item.title || 'Bài chưa có tiêu đề')),
    );
    afterSelect.value = index === 0 ? '__start__' : peers[index - 1]?.id || '__start__';
    afterControl.refresh();
    preview.replaceChildren();
    const rows = [
      ...peers.slice(0, index),
      { id: post?.id || '__draft__', title: draftTitle, isDraft: true },
      ...peers.slice(index),
    ];
    rows.forEach((item, rowIndex) => {
      const own = item.isDraft === true;
      const row = el(
        'div',
        { class: `post-placement-row${own ? ' is-current' : ''}`, role: 'listitem' },
        ...(own
          ? [el('span', { class: 'post-placement-handle', draggable: 'true', title: 'Kéo để đổi vị trí', 'aria-hidden': 'true' }, '⠿')]
          : [el('span', { class: 'post-placement-handle-placeholder', 'aria-hidden': 'true' })]),
        el('span', { class: 'post-placement-number', 'aria-hidden': 'true' }, String(rowIndex + 1).padStart(2, '0')),
        el(
          'span',
          { class: 'post-placement-row-title' },
          own ? draftTitle.trim() || 'Bài đang soạn' : item.title || 'Bài chưa có tiêu đề',
        ),
      );
      if (own) {
        const buttons = el(
          'span',
          { class: 'post-placement-row-actions' },
          button('↑', () => setIndex(index - 1, 'up'), 'icon-button', {
            'aria-label': 'Đưa bài đang soạn lên một vị trí',
            'data-placement-action': 'up',
            disabled: index === 0,
          }),
          button('↓', () => setIndex(index + 1, 'down'), 'icon-button', {
            'aria-label': 'Đưa bài đang soạn xuống một vị trí',
            'data-placement-action': 'down',
            disabled: index === peers.length,
          }),
        );
        row.append(buttons);
        const handle = row.querySelector('.post-placement-handle');
        handle.addEventListener('dragstart', (event) => {
          dragging = true;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', 'post-placement');
        });
        handle.addEventListener('dragend', () => {
          dragging = false;
          preview.querySelectorAll('.is-drop-target').forEach((target) => {
            target.classList.remove('is-drop-target');
          });
        });
      }
      row.addEventListener('dragover', (event) => {
        if (!dragging) return;
        event.preventDefault();
        row.classList.add('is-drop-target');
      });
      row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('is-drop-target');
        if (!dragging || own) return;
        dragging = false;
        setIndex(rowIndex);
      });
      preview.append(row);
    });
  }

  function render() {
    peers = placementPeers(posts, topic, post?.id);
    radios.custom.disabled = peers.length === 0;
    if (!peers.length && mode === 'custom') mode = 'end';
    index = mode === 'start' ? 0 : mode === 'end' ? peers.length : Math.max(0, Math.min(index, peers.length));
    Object.entries(radios).forEach(([key, input]) => (input.checked = mode === key));
    custom.hidden = mode !== 'custom';
    if (!custom.hidden) renderPreview();
  }

  function setSection(next) {
    if (topic === next) return;
    topic = next;
    peers = placementPeers(posts, topic, post?.id);
    mode = 'end';
    index = peers.length;
    render();
  }

  function restore(saved) {
    const savedMode = saved?.placement_mode;
    if (['start', 'end', 'custom'].includes(savedMode)) {
      mode = savedMode;
      index = Number.isInteger(saved.placement_index) ? saved.placement_index : peers.length;
    } else {
      const order = Number(saved?.sort_order);
      if (Number.isInteger(order)) {
        index = peers.filter((item) => item.sort_order <= order).length;
        mode = index === 0 ? 'start' : index >= peers.length ? 'end' : 'custom';
      }
    }
    render();
  }

  render();
  return {
    element: root,
    read: () => ({
      mode,
      index: mode === 'start' ? 0 : mode === 'end' ? peers.length : index,
      peers: [...peers],
      changed:
        !post ||
        topic !== post.section_id ||
        index !== initialPlacement(posts, post, topic).index,
    }),
    setTitle(value) {
      draftTitle = value;
      if (!custom.hidden) {
        const node = preview.querySelector('.post-placement-row.is-current .post-placement-row-title');
        if (node) node.textContent = value.trim() || 'Bài đang soạn';
      }
    },
    setSection,
    restore,
  };
}
