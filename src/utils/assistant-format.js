/** Small, dependency-free Markdown subset for AI replies: never parses arbitrary HTML. */
export function parseAssistantMarkdown(value) {
  const lines = String(value).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let activeList = null;
  const finishParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };
  const finishList = () => {
    if (activeList) blocks.push(activeList);
    activeList = null;
  };
  for (const line of lines) {
    if (!line.trim()) {
      finishParagraph();
      finishList();
      continue;
    }
    const heading = line.match(/^\s{0,3}#{1,4}\s+(.+)$/);
    const bullet = line.match(/^\s{0,3}([-*]|\d+[.)])\s+(.+)$/);
    if (heading) {
      finishParagraph();
      finishList();
      blocks.push({ kind: 'heading', text: heading[1] });
    } else if (bullet) {
      finishParagraph();
      const ordered = /^\d/.test(bullet[1]);
      if (activeList && activeList.ordered !== ordered) finishList();
      if (!activeList) activeList = { kind: 'list', ordered, items: [] };
      activeList.items.push(bullet[2]);
    } else {
      finishList();
      paragraph.push(line);
    }
  }
  finishParagraph();
  finishList();
  return blocks;
}

function appendInline(node, source) {
  // Full markers only; unmatched markers remain text and cannot inject DOM.
  const marker = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  let offset = 0;
  for (const match of String(source).matchAll(marker)) {
    if (match.index > offset)
      node.append(document.createTextNode(source.slice(offset, match.index)));
    const strong = match[0].startsWith('**') || match[0].startsWith('__');
    const width = strong ? 2 : 1;
    const element = document.createElement(strong ? 'strong' : 'em');
    element.textContent = match[0].slice(width, -width);
    node.append(element);
    offset = match.index + match[0].length;
  }
  if (offset < source.length) node.append(document.createTextNode(source.slice(offset)));
}

/** Produces safe semantic text nodes with paragraphs, lists, headings and emphasis. */
export function renderAssistantMarkdown(value) {
  const fragment = document.createDocumentFragment();
  for (const block of parseAssistantMarkdown(value)) {
    if (block.kind === 'list') {
      const list = document.createElement(block.ordered ? 'ol' : 'ul');
      for (const item of block.items) {
        const li = document.createElement('li');
        appendInline(li, item);
        list.append(li);
      }
      fragment.append(list);
    } else {
      const node = document.createElement(block.kind === 'heading' ? 'h4' : 'p');
      appendInline(node, block.text);
      fragment.append(node);
    }
  }
  return fragment;
}
