/**
 * AI V2 specialist hosted audit — ONE finite read-only campaign, no retry/stress.
 * Never part of default curated CI; full responses are retained as artifacts.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = 'https://khtn8-assistant-v2-qa-20261101.joemckahn.workers.dev/chat';
const origin = 'https://f2c2953c.student-dashboard-bcy.pages.dev';
const dir = 'tests/local/assistant-v2-comprehensive-qa';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sourceChoice = [
  { role: 'user', content: 'Thi GK có gì?' },
  {
    role: 'assistant',
    content: 'Em muốn hỏi kiến thức chung hay tìm thông tin từ bài đăng trên website?',
  },
];
const oldBoard = [
  { role: 'user', content: 'Lịch thi GK1' },
  { role: 'assistant', content: 'Văn lúc 7g20.', sourceIds: [] },
];
const oldGeneral = [
  { role: 'user', content: 'Vì sao bầu trời có màu xanh?' },
  { role: 'assistant', content: 'Bầu trời xanh do tán xạ ánh sáng.', sourceIds: [] },
];

// Predeclared expectations. For open-ended content a successful automated check still
// requires human quality review: key phrases do not prove full semantic correctness.
const cases = [
  {
    id: 'W01',
    group: 'website',
    query: 'Phong trào tháng 11',
    mode: 'board',
    need: ['Phong trào Tháng 11', 'Trang trí nón lá', '20/11'],
    forbid: ['1940'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W02',
    group: 'website',
    query: 'Dựa vào nội dung web cho biết phong trào tháng 11 có gì?',
    mode: 'board',
    need: ['Phong trào Tháng 11', 'Khoảnh khắc thầy trò'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W03',
    group: 'website',
    query: 'Khoảnh khắc thầy trò',
    mode: 'board',
    need: ['Khoảnh khắc thầy trò', 'đạo cụ'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W04',
    group: 'website',
    query: 'Trang trí nón lá',
    mode: 'board',
    need: ['Trang trí nón lá', '2 nón'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W05',
    group: 'website',
    query: 'Văn nghê chào mừng 20/11',
    mode: 'board',
    need: ['Văn nghê chào mừng 20/11', 'trang phục'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W06',
    group: 'website',
    query: 'Viết văn tri ân thầy cô',
    mode: 'board',
    need: ['Viết văn tri ân thầy cô', 'giấy'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W07',
    group: 'website',
    query: 'Đáp án GK1 môn Toán',
    mode: 'board',
    need: ['Đáp án GK1 môn Toán', 'chưa'],
    forbid: ['Câu 1: A'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W08',
    group: 'website',
    query: 'Lịch thi GK1',
    mode: 'board',
    need: ['Lịch thi GK1', '7g20', '9g20', '11g10'],
    sources: 1,
    models: 0,
  },
  {
    id: 'W09',
    group: 'website',
    query: 'Kiểm tra GK môn LS-ĐL',
    mode: 'board',
    need: ['Kiểm tra GK môn LS-ĐL', 'Tiết 1-2'],
    sources: 1,
    models: 0,
  },
  {
    id: 'E01',
    group: 'exam',
    query: 'Thi GK có gì?',
    mode: 'board',
    need: ['Lịch thi GK1', 'Kiểm tra GK môn LS-ĐL', 'Đáp án GK1 môn Toán'],
    sources: 3,
    models: 0,
  },
  {
    id: 'E02',
    group: 'exam',
    query: 'Thi giữa kì có gì?',
    mode: 'board',
    need: ['Lịch thi GK1', '7g20', 'Đáp án GK1 môn Toán'],
    sources: 3,
    models: 0,
  },
  {
    id: 'C01',
    group: 'conversation',
    query: 'kiến thức website',
    history: sourceChoice,
    mode: 'board',
    need: ['Lịch thi GK1', 'LS-ĐL'],
    sources: 3,
    models: 0,
  },
  {
    id: 'D01',
    group: 'calendar',
    query: 'Hôm nay thứ mấy?',
    mode: 'general',
    sources: 0,
    models: 0,
    calendar: true,
  },
  {
    id: 'D02',
    group: 'calendar',
    query: 'Bây giờ mấy giờ?',
    mode: 'general',
    sources: 0,
    models: 0,
    calendar: true,
  },
  {
    id: 'G01',
    group: 'general',
    query: 'Vì sao bầu trời có màu xanh? Giải thích đơn giản và cho một ví dụ.',
    mode: 'general',
    any: [
      ['tán xạ', 'tan xa'],
      ['ví dụ', 'vi du'],
    ],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'G02',
    group: 'general',
    query: 'Tại sao nước sôi khi được đun nóng?',
    mode: 'general',
    any: [
      ['nhiệt', 'nhiet', 'nóng'],
      ['sôi', 'soi'],
    ],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'G03',
    group: 'general',
    query: 'Chỉ tôi cách thiết kế nón lá',
    mode: 'general',
    need: ['nón lá'],
    forbid: ['Chọn học sinh tham gia', 'Đặt mua 2 nón'],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'G04',
    group: 'general',
    query: 'Vì sao cầu vồng xuất hiện?',
    mode: 'general',
    any: [
      ['ánh sáng', 'anh sang', 'mặt trời'],
      ['nước', 'mưa', 'giọt'],
    ],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'G05',
    group: 'general',
    query: '2 cộng 3 bằng bao nhiêu?',
    mode: 'general',
    any: [['5', 'năm']],
    sources: 0,
    models: 1,
  },
  {
    id: 'G06',
    group: 'general',
    query: 'Thi giữa kỳ là gì?',
    mode: 'general',
    any: [['kiểm tra', 'kiem tra', 'đánh giá', 'danh gia']],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'C02',
    group: 'conversation',
    query: 'Em chưa hiểu lắm, giải thích đơn giản hơn và cho ví dụ được không?',
    history: oldGeneral,
    mode: 'general',
    any: [['bầu trời', 'bau troi', 'ánh sáng', 'anh sang']],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'C03',
    group: 'conversation',
    query: 'Vì sao bầu trời có màu xanh?',
    history: oldBoard,
    mode: 'general',
    any: [['tán xạ', 'tan xa']],
    forbid: ['Lịch thi GK1'],
    sources: 0,
    models: 1,
    review: true,
  },
  {
    id: 'H01',
    group: 'hybrid',
    query: 'Theo bài Lịch thi GK1 trên web, môn Văn thi lúc mấy giờ? Giải thích thêm cách ôn tập.',
    mode: 'hybrid',
    need: ['Theo bài đăng:', '7g20', 'Giải thích thêm:'],
    forbid: ['Theo bài đăng:\nc0'],
    sources: 1,
    models: 1,
    review: true,
  },
  {
    id: 'E03',
    group: 'exam',
    query: 'Theo bài Lịch thi GK1, môn Văn thi lúc mấy giờ?',
    mode: 'board',
    need: ['7g20'],
    sources: 1,
    models: 2,
    review: true,
  },
  {
    id: 'P01',
    group: 'privacy',
    query: 'Điểm cá nhân của em là bao nhiêu?',
    mode: 'general',
    forbid: ['Điểm cá nhân của em là 10', 'Em được 9.5 điểm'],
    sources: 0,
    models: 2,
    review: true,
    statuses: ['answered', 'clarify', 'insufficient'],
  },
];

const limits = { requests: 25, models: 15, gapMs: 4200, timeoutMs: 25000 };
const audit = {
  startedAt: new Date().toISOString(),
  endpoint,
  limits,
  requestCount: 0,
  modelCalls: 0,
  cases: [],
  stopped: null,
};
const normalized = (value) => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const includes = (text, fragment) => normalized(text).includes(normalized(fragment));
await mkdir(dir, { recursive: true });

for (const item of cases) {
  if (audit.requestCount >= limits.requests || audit.modelCalls >= limits.models) {
    audit.stopped = 'finite resource ceiling reached';
    break;
  }
  if (audit.requestCount) await sleep(limits.gapMs);
  audit.requestCount++;
  const expected = {
    route: item.mode,
    status: item.statuses || ['answered'],
    sources: item.sources,
    modelsAtMost: item.models,
    required: item.need || [],
    any: item.any || [],
    forbidden: item.forbid || [],
  };
  const result = {
    id: item.id,
    group: item.group,
    question: item.query,
    history: item.history || [],
    expected,
    actual: null,
    issues: [],
    verdict: 'NOT_RUN',
  };
  audit.cases.push(result);
  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: item.query, history: item.history || [] }),
      signal: AbortSignal.timeout(limits.timeoutMs),
    });
    const data = await response.json();
    const models = Number(response.headers.get('X-Assistant-Model-Calls') ?? -1);
    result.actual = {
      http: response.status,
      status: data.status || null,
      route: data.knowledge || null,
      answer: String(data.answer || ''),
      sources: Array.isArray(data.sources) ? data.sources : [],
      models,
      elapsedMs: Date.now() - start,
    };
    audit.modelCalls += Math.max(models, 0);
    const a = result.actual;
    if (a.http !== 200) result.issues.push('HTTP ' + a.http);
    if (!expected.status.includes(a.status)) result.issues.push('status=' + a.status);
    if (a.route !== expected.route) result.issues.push('route=' + a.route);
    if (a.sources.length < expected.sources) result.issues.push('citations=' + a.sources.length);
    if (expected.route === 'general' && a.sources.length)
      result.issues.push('unexpected Board citation');
    if (a.models < 0 || a.models > expected.modelsAtMost) result.issues.push('models=' + a.models);
    if (!a.answer.trim()) result.issues.push('empty answer');
    for (const phrase of expected.required) {
      if (!includes(a.answer, phrase)) result.issues.push('missing "' + phrase + '"');
    }
    for (const alternatives of expected.any) {
      if (!alternatives.some((phrase) => includes(a.answer, phrase))) {
        result.issues.push('missing any "' + alternatives.join(' / ') + '"');
      }
    }
    for (const phrase of expected.forbidden) {
      if (includes(a.answer, phrase)) result.issues.push('forbidden "' + phrase + '"');
    }
    if (item.calendar) {
      const now = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
      if (!a.answer.includes(now)) result.issues.push('incorrect Vietnam date');
    }
    if (a.answer.length > 8000) result.issues.push('answer exceeds client limit');
    if (/\b(?:vì|bị|khi|do|và|hoặc|để|của)\s*$/i.test(a.answer.trim())) {
      result.issues.push('unfinished clause');
    }
    result.verdict = result.issues.length ? 'FAIL' : item.review ? 'AUTO_PASS_REVIEW' : 'PASS';
    console.log(
      'CASE ' +
        item.id +
        ' ' +
        result.verdict +
        ' HTTP=' +
        a.http +
        ' route=' +
        a.route +
        ' models=' +
        a.models +
        ' citations=' +
        a.sources.length,
    );
    console.log('QUESTION: ' + item.query);
    console.log('ANSWER:\n' + a.answer);
    if (result.issues.length) console.log('ISSUES: ' + result.issues.join('; '));
    if ([429, 503].includes(a.http)) {
      audit.stopped = '429/503 service limit; no retry';
      break;
    }
    if (a.models > 2) {
      audit.stopped = 'unusual model call count';
      break;
    }
  } catch (error) {
    result.verdict = 'BLOCKED';
    result.issues.push(String(error?.message || error));
    audit.stopped = 'runtime error; no retry';
    break;
  }
}

audit.finishedAt = new Date().toISOString();
const passCount = audit.cases.filter(
  (c) => c.verdict === 'PASS' || c.verdict === 'AUTO_PASS_REVIEW',
).length;
const failCount = audit.cases.filter((c) => c.verdict === 'FAIL').length;
const reviewCount = audit.cases.filter((c) => c.verdict === 'AUTO_PASS_REVIEW').length;
const lines = [
  '# AI Assistant V2 — actual Worker QA responses',
  '',
  'Requests: ' + audit.requestCount + ' / ' + limits.requests,
  'Model invocations (not neurons): ' + audit.modelCalls,
  'Automated passes: ' + passCount + ', fails: ' + failCount,
  'Passes requiring human semantic review: ' + reviewCount,
  'Early stop: ' + (audit.stopped || 'none'),
  '',
  '| Case | Category | Expected | Actual | HTTP | Models | Verdict |',
  '| --- | --- | --- | --- | ---: | ---: | --- |',
  ...audit.cases.map(
    (c) =>
      '| ' +
      c.id +
      ' | ' +
      c.group +
      ' | ' +
      c.expected.route +
      ' | ' +
      (c.actual?.route || '—') +
      ' | ' +
      (c.actual?.http || '—') +
      ' | ' +
      (c.actual?.models ?? '—') +
      ' | ' +
      c.verdict +
      ' |',
  ),
  '',
  '## Expected and actual content for each test case',
];
for (const c of audit.cases) {
  lines.push(
    '',
    '### ' + c.id + ' — ' + c.verdict,
    'Question: ' + c.question,
    'History: ' + JSON.stringify(c.history),
    'Expected contract: ' + JSON.stringify(c.expected),
    'Actual route/status/HTTP/models: ' +
      [c.actual?.route, c.actual?.status, c.actual?.http, c.actual?.models].join(' / '),
    'Citation IDs: ' + JSON.stringify(c.actual?.sources.map((x) => x.id) || []),
    'Actual answer:',
    '',
    '~~~text',
    c.actual?.answer || '(not received)',
    '~~~',
    'Errors: ' + (c.issues.join('; ') || 'none by automated criteria'),
  );
}
await writeFile(dir + '/responses.json', JSON.stringify(audit, null, 2));
await writeFile(dir + '/report.md', lines.join('\n') + '\n');
console.log(
  'RESULT requests=' +
    audit.requestCount +
    ' autoPass=' +
    passCount +
    ' fail=' +
    failCount +
    ' review=' +
    reviewCount +
    ' modelInvocations=' +
    audit.modelCalls +
    ' stop=' +
    (audit.stopped || 'none'),
);
if (failCount || audit.stopped || audit.cases.length !== cases.length) process.exitCode = 1;
