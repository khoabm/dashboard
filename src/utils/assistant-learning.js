/** Routes public learning questions and validates bounded answers/context without network or storage. */
import {
  normalizeAssistantText,
  validAssistantQuery,
  validateAssistantSources,
} from './board-assistant.js';

export const websiteProfile = Object.freeze({
  name: 'Vui học cùng cô Quỳnh',
  purpose: 'web quản lý lớp online với các ứng dụng đính kèm',
  audience: 'giáo viên, người quản lý lớp và học sinh',
  applications: Object.freeze(['Bảng học liệu', 'Bảng điểm cá nhân', 'Quản lý bảng điểm và lớp']),
});

export const learningLimits = Object.freeze({ answer: 1800, topics: 20, titles: 10 });

/** Classifies Vietnamese intent; routing chooses presentation, never grants access or model authority. */
export function learningIntent(query, catalog) {
  const text = normalizeAssistantText(query)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (/(bao nhieu|so luong|may lop)/.test(text) && /\b(lop|hoc sinh|giao vien)\b/.test(text))
    return { kind: 'unsupported' };
  if (
    /(bang diem|cccd|mat khau|token|service role|diem cua hoc sinh|bo qua huong dan|ignore.*instructions)/.test(
      text,
    )
  )
    return { kind: 'unsupported' };
  const site =
    /\b(web|website)\b|\bung dung (nay|hien tai)\b|\btrang (nay|web|hien tai)\b|\bo day\b|^trang (co|gom|danh|lam|la|bao)\b/.test(
      text,
    );
  const topic = [...new Map(catalog.map((p) => [p.sectionId, p.sectionTitle])).entries()].find(
    ([, title]) => text.includes(normalizeAssistantText(title)),
  );
  const reference = /\bbai( hoc)? (nay|do)\b/.test(text);
  const rephrase = /(de hieu hon|don gian hon|noi ro hon|giai thich lai|tiep tuc|vi sao vay)/.test(
    text,
  );
  if (reference || (rephrase && !topic)) return { kind: 'followup' };
  if (site && /\b(ung dung|tinh nang|cong cu)\b/.test(text) && /(co|gom|gi|nao|liet ke)/.test(text))
    return { kind: 'applications' };
  if (site && /(danh cho ai|doi tuong|ai dung|ai su dung|phuc vu ai)/.test(text))
    return { kind: 'audience' };
  if (site && /(lam gi|la gi|muc dich|co the lam|chuc nang|su dung the nao|ho tro gi)/.test(text))
    return { kind: 'website' };
  if (/(bao nhieu|may bai|so luong)/.test(text) && /(hoc lieu|bai|chu de|noi dung)/.test(text))
    return { kind: 'inventory', sectionId: topic?.[0] };
  const inventory = /\b(chu de|noi dung|bai hoc|hoc lieu|tai lieu)\b/.test(text);
  const listing = /(co|gom).*(gi|nao|nhung)|liet ke|tong quan|tom tat/.test(text);
  if (topic && inventory && listing) return { kind: 'topic', sectionId: topic[0] };
  // A website reference plus a broad inventory request is distinct from a content-specific search.
  const specific = /\b(ve|lien quan|tim|giai thich|tai sao|vi sao)\b/.test(text);
  if (
    (site && !specific && ((inventory && listing) || /co (nhung )?gi/.test(text))) ||
    (/chu de/.test(text) && /liet ke|tong quan|tom tat|nhung.*nao/.test(text) && !specific)
  )
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
    answer = `${websiteProfile.name} dành cho ${websiteProfile.audience}. Khách có thể đọc học liệu đã xuất bản; các ứng dụng có dữ liệu riêng vẫn yêu cầu quyền truy cập hoặc xác minh phù hợp. Trợ lý không cấp quyền quản trị hay quyền xem bảng điểm.`;
  else if (intent.kind === 'website')
    answer = `${websiteProfile.name} là ${websiteProfile.purpose}. Các ứng dụng gồm: ${websiteProfile.applications.join('; ')}. Trong Bảng học liệu, bạn có thể duyệt chủ đề, tìm tiêu đề/mô tả và mở tài nguyên đã xuất bản. Các chức năng riêng yêu cầu quyền truy cập phù hợp; trợ lý không đọc dữ liệu lớp, bảng điểm, tài khoản hoặc nội dung tệp.`;
  else if (intent.kind === 'applications')
    answer = `${websiteProfile.name} có các ứng dụng: ${websiteProfile.applications.join('; ')}. Bảng học liệu cung cấp nội dung đã xuất bản; Bảng điểm cá nhân có luồng xác minh, còn quản lý lớp/bảng điểm dành cho người có quyền. Trợ lý chỉ mô tả chức năng và hỗ trợ học liệu công khai, không truy cập dữ liệu riêng.`;
  else if (['inventory', 'overview', 'topic'].includes(intent.kind)) {
    if (intent.sectionId) posts = catalog.filter((p) => p.sectionId === intent.sectionId);
    const scope = intent.sectionId ? posts[0]?.sectionTitle : 'Bảng học liệu';
    answer = `${intent.kind === 'overview' ? `${websiteProfile.name} là ${websiteProfile.purpose}. Các ứng dụng: ${websiteProfile.applications.join('; ')}.\n` : ''}${scope} hiện có ${posts.length} học liệu đã xuất bản${intent.sectionId ? '' : ` thuộc ${topics.length} chủ đề có học liệu`}.`;
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
  return {
    mode: 'deterministic',
    status: intent.kind === 'unsupported' ? 'insufficient' : 'answered',
    answer,
    coverage: intent.kind === 'unsupported' ? 'insufficient' : 'metadata',
    sources: [],
  };
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
