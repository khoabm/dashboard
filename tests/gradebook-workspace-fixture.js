/** Development-only workspace: real components, synthetic memory data, no hosted transport. */
import '../src/styles/main.css';
import { GradebookAdmin } from '../src/components/gradebook-admin.js';
import { fixtureContext } from './student-gradeboard-data.js';
import { readRosterFile, readScoreFile } from '../src/services/roster-file.js';
import { el } from '../src/utils/dom.js';
const params = new URLSearchParams(location.search);
if (!params.has('embedded')) {
  const frame = el('iframe', {
    title: 'Synthetic workspace',
    src: '?embedded=1',
    style: 'border:1px solid #bbb;width:1440px;height:900px;display:block',
  });
  const size = el(
    'select',
    { 'aria-label': 'Viewport' },
    ...['1440x900', '1024x768', '768x1024', '390x844', '360x800', '1024x480'].map((v) =>
      el('option', { value: v }, v),
    ),
  );
  size.addEventListener('change', () => {
    const [w, h] = size.value.split('x');
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
  });
  const scene = el(
    'select',
    { 'aria-label': 'Scene' },
    el('option', { value: 'admin' }, 'Admin / teacher'),
    el('option', { value: 'student' }, 'Student'),
  );
  scene.addEventListener('change', () => {
    frame.src =
      scene.value === 'student' ? '/tests/student-gradeboard.html?embedded=1' : '?embedded=1';
  });
  document.querySelector('#qa').append('SYNTHETIC ONLY — no hosted access ', size, scene);
  document.querySelector('#app').append(frame);
} else {
  const cid = '30000000-0000-4000-8000-000000000001';
  let classroom = {
    id: cid,
    revision: '1',
    name: 'Lớp mô phỏng',
    schoolYear: '2026–2027',
    semester1Published: false,
    semester2Published: false,
  };
  let pupils = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    classId: cid,
    revision: '1',
    fullName:
      i === 0
        ? 'Học sinh mô phỏng có họ tên dài để kiểm tra bố cục'
        : 'Học sinh mô phỏng ' + (i + 1),
    birthDate: '2000-02-29',
    active: true,
  }));
  const catalog = fixtureContext();
  const request = async (body) => {
    if (body.op === 'class.read') return { class: classroom };
    if (body.op === 'students.list')
      return { students: body.cursor ? [] : pupils, nextCursor: null };
    if (body.op === 'scores.read')
      return {
        students: (body.cursor ? [] : pupils).map((p) => ({
          studentId: p.id,
          scores: [
            { subjectCode: 'item_0', columnCode: 'item_0', rawScore: '8.12345', revision: '1' },
          ],
        })),
        nextCursor: null,
      };
    if (body.op === 'student.reveal') return { documentNumber: '000000009' };
    if (body.op === 'student.read') return { student: pupils.find((p) => p.id === body.studentId) };
    throw Object.assign(new Error('Unsupported synthetic mutation'), { status: 503 });
  };
  const view = GradebookAdmin({
    request,
    readScores: readScoreFile,
    loadCatalog: async () => catalog,
    readFile: readRosterFile,
    onLogin: () => {},
    onLogout: () => {},
  });
  document.querySelector('#qa').textContent =
    'SYNTHETIC ONLY — unsupported writes deliberately fail';
  document.querySelector('#app').append(view.element);
  view.setSession({ status: 'admin', generation: 1 });
}
