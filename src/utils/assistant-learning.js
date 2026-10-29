/** Routes public website questions and validates bounded learning answers without network or storage. */
import {
  normalizeAssistantText,
  validAssistantQuery,
  validateAssistantSources,
} from './board-assistant.js';

export const websiteProfile = Object.freeze({
  name: 'Vui học cùng cô Quỳnh',
  purpose:
    'website tích hợp các ứng dụng hỗ trợ học tập, chia sẻ học liệu và quản lý lớp học theo quyền',
  audience: 'giáo viên, người quản lý lớp và học sinh',
  applications: Object.freeze(['Bảng học liệu', 'Bảng điểm cá nhân', 'Quản lý bảng điểm và lớp']),
});

// The public help contract describes routes, never issues credentials or accesses private data.
export const applicationGuides = Object.freeze({
  board: Object.freeze({
    name: websiteProfile.applications[0],
    path: '/',
    purpose: 'xem, tìm kiếm và mở học liệu đã xuất bản theo chủ đề',
    guidance:
      'Chọn “Bảng học liệu” từ menu điều hướng để xem nội dung công khai. Việc đăng hoặc sửa bài chỉ dành cho người có quyền.',
  }),
  student: Object.freeze({
    name: websiteProfile.applications[1],
    path: '/personal-gradebook',
    purpose: 'tra cứu điểm học tập của chính mình sau khi xác minh thông tin',
    guidance:
      'Chọn “Bảng điểm cá nhân” từ menu điều hướng, rồi làm theo hướng dẫn xác minh trên trang. Trợ lý không xác minh hộ hoặc đọc điểm của bạn.',
  }),
  admin: Object.freeze({
    name: websiteProfile.applications[2],
    path: '/personal-gradebook/admin',
    purpose: 'quản lý lớp, danh sách học sinh và điểm số cho người được cấp quyền',
    guidance:
      'Mục quản lý có thể chỉ xuất hiện sau khi quyền được xác minh. Biết đường dẫn không có nghĩa là được cấp quyền truy cập.',
  }),
});

export const learningLimits = Object.freeze({ answer: 1800, topics: 20, titles: 10 });

/** Separates public app guidance from requests for private records or unauthorized changes. */
export function learningIntent(query, catalog) {
  const text = normalizeAssistantText(query)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const site =
    text.includes(normalizeAssistantText(websiteProfile.name)) ||
    /\b(web|website)\b|\bung dung (nay|hien tai)\b|\btrang (nay|web|hien tai)\b|\bo day\b|^trang (co|gom|danh|lam|la|bao)\b/.test(
      text,
    );
  const app = /\b(quan ly bang diem|quan ly lop|quan ly diem|nhap diem|sua diem)\b/.test(text)
    ? 'admin'
    : /\b(bang diem ca nhan|tra cuu diem|xem diem|bang diem|diem ca nhan)\b/.test(text)
      ? 'student'
      : /\b(bang hoc lieu|kho hoc lieu)\b/.test(text)
        ? 'board'
        : null;
  const help =
    /(dung de lam gi|co tac dung gi|co cong dung gi|la gi|gioi thieu|huong dan|cach (xem|tra cuu|su dung|vao|truy cap|mo)|lam sao|lam the nao|o dau|vao dau|di dau|truy cap|mo o dau)/.test(
      text,
    );
  const privateRequest =
    /(diem cua|bang diem cua|cho (toi|minh|em) xem diem|lay diem|doc diem|hien diem|danh sach hoc sinh|thong tin hoc sinh|xoa diem|sua diem|cap nhat diem|thay doi diem)/.test(
      text,
    );
  const thirdParty =
    /(nguoi khac|ban khac|hoc sinh khac|cua hoc sinh|lop khac|tat ca hoc sinh)/.test(text);
  const forbidden =
    /(cccd|cmnd|mat khau|token|service role|bo qua huong dan|ignore.*instructions)/.test(text);
  if (
    forbidden ||
    (/(bao nhieu|so luong|may lop)/.test(text) && /\b(lop|hoc sinh|giao vien)\b/.test(text)) ||
    (privateRequest && (!help || thirdParty))
  )
    return { kind: 'unsupported' };
  const contentQuestion =
    /thong bao|bai dang|moi nhat|gan day|tom tat|so sanh|noi dung|phong trao|hoat dong/.test(text);
  if (app && !contentQuestion && (help || !privateRequest)) return { kind: 'application', app };
  if (!app && !contentQuestion && /\b(diem|bang diem)\b/.test(text) && help)
    return { kind: 'application', app: 'student' };
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
  if (
    /\b(bao nhieu|may|so luong) (bai( hoc| dang)?|hoc lieu|tai lieu|tai nguyen|chu de)\b/.test(text)
  )
    return { kind: 'inventory', sectionId: topic?.[0] };
  const inventory = /\b(chu de|noi dung|bai hoc|hoc lieu|tai lieu)\b/.test(text);
  const listing = /(co|gom).*(gi|nao|nhung)|liet ke|tong quan|tom tat/.test(text);
  if (topic && !site && /tom tat|giai thich|so sanh|diem chung/.test(text))
    return { kind: 'educational' };
  if (
    topic &&
    /liet ke|nhung bai|bai hoc nao|bai dang nao|hoc lieu nao|tai lieu nao|bai nao|cac bai/.test(
      text,
    )
  )
    return { kind: 'topic', sectionId: topic[0] };
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

/** Answers public website and app questions from approved metadata and a published Board snapshot. */
export function websiteLearningAnswer(query, catalog) {
  const intent = learningIntent(query, catalog);
  let answer;
  let posts = catalog;
  const topics = [...new Map(catalog.map((p) => [p.sectionId, p.sectionTitle])).values()];
  const apps = Object.values(applicationGuides);
  if (intent.kind === 'unsupported')
    answer =
      'Mình có thể giới thiệu chức năng và cách truy cập các ứng dụng, nhưng không xem, sửa hay cung cấp dữ liệu lớp, điểm, tài khoản hoặc thông tin cá nhân. Bạn hãy sử dụng ứng dụng phù hợp và thực hiện xác minh theo hướng dẫn trên trang.';
  else if (intent.kind === 'application') {
    const app = applicationGuides[intent.app];
    answer = `${app.name} dùng để ${app.purpose}. ${app.guidance} Đường dẫn: ${app.path}.`;
  } else if (intent.kind === 'audience')
    answer = `${websiteProfile.name} dành cho ${websiteProfile.audience}. Người xem có thể đọc học liệu đã xuất bản; việc tra cứu điểm cá nhân cần xác minh và chức năng quản lý đòi hỏi quyền phù hợp. Trợ lý không truy cập dữ liệu riêng.`;
  else if (intent.kind === 'website')
    answer = `${websiteProfile.name} là ${websiteProfile.purpose}. Website gồm: ${websiteProfile.applications.join('; ')}. Người xem có thể tìm và đọc học liệu công khai; tra cứu điểm cần xác minh và quản lý lớp/điểm chỉ dành cho người có quyền. Trợ lý không truy cập dữ liệu riêng.`;
  else if (intent.kind === 'applications')
    answer = `${websiteProfile.name} có các ứng dụng:\n${apps
      .map((app) => `- ${app.name}: ${app.purpose}.`)
      .join(
        '\n',
      )}\nBạn có thể chọn ứng dụng qua menu điều hướng. Các chức năng có dữ liệu riêng yêu cầu xác minh hoặc quyền phù hợp; trợ lý không truy cập dữ liệu đó.`;
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
        'Các bài đăng công khai hiện có chưa đủ thông tin để trả lời. Bạn hãy chọn nguồn hoặc hỏi thêm chi tiết.',
      coverage: 'insufficient',
      sources: [],
    };
  }
  if (!value.answer.trim() || !value.ids.length || value.coverage !== 'provided_text')
    throw Error('answer');
  const sources = value.ids.map((id) => {
    const post = catalog.find((p) => p.id === id);
    if (!post) throw Error('citation');
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
