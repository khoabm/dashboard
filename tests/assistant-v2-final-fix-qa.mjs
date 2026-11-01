/** Targeted post-fix hosted acceptance, five finite requests, read-only, no retries. */
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = 'https://khtn8-assistant-v2-qa-20261101.joemckahn.workers.dev/chat';
const origin = 'https://f2c2953c.student-dashboard-bcy.pages.dev';
const output = 'tests/local/assistant-v2-final-fix-qa';
const cases = [
  {
    id: 'W05-FIX',
    question: 'Văn nghê chào mừng 20/11',
    route: 'board',
    required: ['Văn nghê chào mừng 20/11', 'trang phục'],
    sources: 1,
    modelMax: 0,
  },
  {
    id: 'W06-FIX',
    question: 'Viết văn tri ân thầy cô',
    route: 'board',
    required: ['Viết văn tri ân thầy cô', 'giấy'],
    sources: 1,
    modelMax: 0,
  },
  {
    id: 'W08-FIX',
    question: 'Lịch thi GK1',
    route: 'board',
    required: ['Lịch thi GK1', '7g20', '11g10'],
    sources: 1,
    modelMax: 0,
  },
  {
    id: 'W09-FIX',
    question: 'Kiểm tra GK môn LS-ĐL',
    route: 'board',
    required: ['Kiểm tra GK môn LS-ĐL', 'tiết 1'],
    sources: 1,
    modelMax: 0,
  },
  {
    id: 'P01-FIX',
    question: 'Điểm cá nhân của em là bao nhiêu?',
    route: 'general',
    required: ['Bảng điểm cá nhân', 'xác minh'],
    sources: 0,
    modelMax: 0,
  },
];
const log = {
  startedAt: new Date().toISOString(),
  endpoint,
  requestBudget: 5,
  modelBudget: 0,
  cases: [],
  stopped: null,
};
await mkdir(output, { recursive: true });
const lower = (value) => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
for (const item of cases) {
  if (log.cases.length) await new Promise((resolve) => setTimeout(resolve, 4200));
  const result = {
    id: item.id,
    question: item.question,
    expected: {
      route: item.route,
      status: 'answered',
      sourceCount: item.sources,
      modelMax: item.modelMax,
      phrases: item.required,
    },
    actual: null,
    errors: [],
    verdict: 'NOT_RUN',
  };
  log.cases.push(result);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: item.question, history: [] }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    const modelCalls = Number(response.headers.get('X-Assistant-Model-Calls') ?? -1);
    result.actual = {
      http: response.status,
      route: data.knowledge,
      status: data.status,
      answer: String(data.answer || ''),
      citations: Array.isArray(data.sources)
        ? data.sources.map((s) => ({ id: s.id, quote: s.quote }))
        : [],
      modelCalls,
    };
    if (response.status !== 200) result.errors.push('HTTP ' + response.status);
    if (data.status !== 'answered') result.errors.push('unexpected status: ' + data.status);
    if (data.knowledge !== item.route) result.errors.push('wrong route: ' + data.knowledge);
    if (result.actual.citations.length !== item.sources) result.errors.push('wrong source count');
    if (modelCalls < 0 || modelCalls > item.modelMax) result.errors.push('unexpected model call');
    for (const phrase of item.required) {
      if (!lower(result.actual.answer).includes(lower(phrase)))
        result.errors.push('missing: ' + phrase);
    }
    if (/1940|kháng chiến/i.test(result.actual.answer)) result.errors.push('historical topic leak');
    result.verdict = result.errors.length ? 'FAIL' : 'PASS';
    console.log('CASE ' + item.id + ': ' + result.verdict);
    console.log('QUESTION: ' + item.question);
    console.log(
      'HTTP=' +
        response.status +
        ' SOURCE=' +
        data.knowledge +
        ' CITATIONS=' +
        result.actual.citations.length +
        ' MODELS=' +
        modelCalls,
    );
    console.log('ANSWER:\n' + result.actual.answer);
    if (result.errors.length) console.log('ERRORS: ' + result.errors.join('; '));
    if ([429, 503].includes(response.status)) {
      log.stopped = 'rate limit/provider unavailable';
      break;
    }
  } catch (e) {
    result.verdict = 'BLOCKED';
    result.errors.push(String(e.message || e));
    log.stopped = 'timeout/transport failure; no retries';
    break;
  }
}
log.completedAt = new Date().toISOString();
const lines = [
  '# AI V2 post-fix targeted HTTP QA',
  '',
  'Actual endpoint: ' + endpoint,
  'Requests executed: ' + log.cases.length + '/5',
  'Stopped: ' + (log.stopped || 'none'),
];
for (const c of log.cases) {
  lines.push(
    '',
    '## ' + c.id + ': ' + c.verdict,
    'Question: ' + c.question,
    'Predeclared expected: ' + JSON.stringify(c.expected),
    'Actual metadata: ' +
      JSON.stringify({
        http: c.actual?.http,
        route: c.actual?.route,
        status: c.actual?.status,
        sources: c.actual?.citations?.length,
        modelCalls: c.actual?.modelCalls,
      }),
    'Response:',
    '~~~text',
    c.actual?.answer || '(no response)',
    '~~~',
    'Errors: ' + (c.errors.join('; ') || 'none'),
  );
}
await writeFile(output + '/responses.json', JSON.stringify(log, null, 2));
await writeFile(output + '/report.md', lines.join('\n') + '\n');
const passed = log.cases.length === cases.length && log.cases.every((c) => c.verdict === 'PASS');
console.log('FINAL: ' + log.cases.length + '/5, ' + (passed ? 'PASS' : 'FAIL'));
if (!passed) process.exitCode = 1;
