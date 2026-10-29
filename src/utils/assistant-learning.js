/** Routes public learning questions and validates bounded answers/context without network or storage. */
import {
  normalizeAssistantText,
  validAssistantQuery,
  validateAssistantSources,
} from './board-assistant.js';

export const learningLimits = Object.freeze({ answer: 1800, topics: 20, titles: 10 });

/** Classifies Vietnamese intent; routing chooses presentation, never grants access or model authority. */
export function learningIntent(query, catalog) {
  const text = normalizeAssistantText(query);
  if (
    /(bang diem|cccd|mat khau|token|service.role|diem cua hoc sinh|bo qua huong dan|ignore.*instructions)/.test(
      text,
    )
  )
    return { kind: 'unsupported' };
  const site = /\b(web|website|trang|ung dung)\b/.test(text);
  const topic = [...new Map(catalog.map((p) => [p.sectionId, p.sectionTitle])).entries()].find(
    ([, title]) => text.includes(normalizeAssistantText(title)),
  );
  if (
    /(de hieu hon|don gian hon|noi ro hon|giai thich lai|tiep tuc|vi sao vay|bai( hoc)? (nay|do))/.test(
      text,
    )
  )
    return { kind: 'followup' };
  if (site && /(danh cho ai|doi tuong|ai dung|ai su dung)/.test(text)) return { kind: 'audience' };
  if (site && /(lam gi|la gi|muc dich|co the lam|chuc nang|su dung the nao)/.test(text))
    return { kind: 'website' };
  if (/(bao nhieu|may bai|so luong)/.test(text) && /(hoc lieu|bai|chu de|noi dung)/.test(text))
    return { kind: 'inventory', sectionId: topic?.[0] };
  if (
    topic &&
    /(nhung bai|bai hoc nao|hoc lieu nao|noi dung nao|tom tat chu de|liet ke|bai nao)/.test(text)
  )
    return { kind: 'topic', sectionId: topic[0] };
  if ((site || /chu de/.test(text)) && /(chu de|noi dung|tom tat|tong quan|liet ke)/.test(text))
    return { kind: 'overview' };
  if (/(tom tat|giai thich|hien tuong|diem chung|tai sao|vi sao|so sanh)/.test(text))
    return { kind: 'educational' };
  return { kind: 'search' };
}

/** Returns exact snapshot facts, with explicit list bounds; never pretends to read attachment contents. */
export function websiteLearningAnswer(query, catalog) {
  const intent = learningIntent(query, catalog);
  let answer;
  let posts = catalog;
  const topics = [...new Map(catalog.map((p) => [p.sectionId, p.sectionTitle])).values()];
  if (intent.kind === 'unsupported')
    answer =
      'Trợ lý chỉ hỗ trợ học liệu công khai. Không truy cập bảng điểm, tài khoản, thông tin cá nhân hoặc thực hiện yêu cầu thay đổi quyền.';
  else if (intent.kind === 'audience')
    answer =
      'KHTN8 Board dành cho người học Khoa học tự nhiên lớp 8. Khách có thể đọc học liệu đã xuất bản; trợ lý không cấp quyền quản trị hay quyền xem bảng điểm.';
  else if (intent.kind === 'website')
    answer =
      'KHTN8 Board là bảng học liệu Khoa học tự nhiên lớp 8. Bạn có thể duyệt chủ đề, tìm tiêu đề/mô tả, mở học liệu và tài nguyên đính kèm có sẵn. Trợ lý chỉ hỗ trợ đọc và tìm hiểu nội dung công khai; không đọc tệp, ảnh, video hoặc bảng điểm.';
  else if (['inventory', 'overview', 'topic'].includes(intent.kind)) {
    if (intent.sectionId) posts = catalog.filter((p) => p.sectionId === intent.sectionId);
    const scope = intent.sectionId ? posts[0]?.sectionTitle : 'Trang';
    answer = `${scope} hiện có ${posts.length} học liệu đã xuất bản${intent.sectionId ? '' : ` thuộc ${topics.length} chủ đề có học liệu`}.`;
    if (!intent.sectionId && topics.length)
      answer += `\nChủ đề: ${topics.slice(0, learningLimits.topics).join('; ')}${topics.length > learningLimits.topics ? ` (chỉ liệt kê ${learningLimits.topics}/${topics.length})` : ''}.`;
    if (posts.length && intent.kind !== 'inventory')
      answer += `\nHọc liệu: ${posts
        .slice(0, learningLimits.titles)
        .map((p) => p.title)
        .join(
          '; ',
        )}${posts.length > learningLimits.titles ? ` (chỉ liệt kê ${learningLimits.titles}/${posts.length})` : ''}.`;
    answer +=
      '\nĐây là tổng quan từ tên chủ đề, tiêu đề và mô tả công khai, không phải bản tóm tắt đầy đủ nội dung tệp.';
  }
  if (!answer) return null;
  return { mode: 'deterministic', status: 'answered', answer, coverage: 'metadata', sources: [] };
}

/** Accepts only one prior public question and up to three current source IDs, never arbitrary history. */
export function validateLearningContext(value, catalog) {
  if (value == null) return null;
  if (
    !value ||
    Object.keys(value).sort().join(',') !== 'ids,query' ||
    !validAssistantQuery(value.query) ||
    !Array.isArray(value.ids) ||
    !value.ids.length ||
    value.ids.length > 3 ||
    new Set(value.ids).size !== value.ids.length ||
    !value.ids.every((id) => catalog.some((p) => p.id === id))
  )
    throw Error('context');
  return { query: value.query, ids: [...value.ids] };
}

/** Validates generated text and exact citations; IDs do not establish factual entailment. */
export function validateLearningAnswer(value, catalog) {
  if (
    !value ||
    Object.keys(value).sort().join(',') !== 'answer,coverage,ids,status' ||
    !['answered', 'insufficient'].includes(value.status) ||
    !['provided_text', 'insufficient'].includes(value.coverage) ||
    typeof value.answer !== 'string' ||
    value.answer.length > learningLimits.answer ||
    !Array.isArray(value.ids) ||
    value.ids.length > 3 ||
    new Set(value.ids).size !== value.ids.length
  )
    throw Error('answer');
  if (value.status === 'insufficient') {
    if (value.ids.length || value.coverage !== 'insufficient') throw Error('answer');
    return {
      mode: 'ai',
      status: 'insufficient',
      answer:
        'Học liệu hiện có chưa đủ thông tin để trả lời. Bạn hãy chọn bài hoặc hỏi về nội dung đã xuất bản.',
      coverage: 'insufficient',
      sources: [],
    };
  }
  if (!value.answer.trim() || !value.ids.length || value.coverage !== 'provided_text')
    throw Error('answer');
  const sources = value.ids.map((id) => {
    const post = catalog.find((p) => p.id === id);
    if (!post) throw Error('answer');
    return { id, quote: post.body || post.title };
  });
  return {
    mode: 'ai',
    status: value.status,
    answer: value.answer.trim(),
    coverage: value.coverage,
    sources: validateAssistantSources(sources, catalog),
  };
}
