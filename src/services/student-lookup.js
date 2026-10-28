/** Sends identity only for verification; the existing lookup state owns the memory-only capability. */
import { allowFields, documentNumber, requireContract } from '../utils/gradebook/contracts.js';
import { birthDate } from '../utils/gradebook/dates.js';
import {
  verificationPayload,
  studentReadPayload,
  verificationFailure,
  studentReadFailure,
} from '../utils/gradebook-responses.js';
import { requestGradebook } from './gradebook-transport.js';

/** Injects controlled transport for offline QA without caching identity or capability. */
export function createStudentLookup(transport = requestGradebook) {
  return {
    async verifyStudent(input, { signal } = {}) {
      try {
        allowFields(input, ['documentNumber', 'birthDate'], ['documentNumber', 'birthDate']);
        documentNumber(input.documentNumber);
        birthDate(input.birthDate);
        const { status, payload } = await transport(
          'student-lookup',
          { op: 'verify', ...input },
          { signal },
        );
        return status === 200 ? verificationPayload(payload) : verificationFailure(status);
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        return verificationFailure(error?.status);
      }
    },
    async readStudent(body, { capability, context, signal } = {}) {
      try {
        requireContract(body?.op === 'grades' || body?.op === 'histogram', 'operation');
        const fields =
          body.op === 'grades'
            ? ['op', 'semester']
            : ['op', 'semester', 'subjectCode', 'columnCode'];
        allowFields(body, fields, fields);
        requireContract([1, 2].includes(body.semester), 'semester');
        if (typeof capability !== 'string' || !/^[!-~]{1,8192}$/.test(capability))
          throw studentReadFailure(401);
        const input = structuredClone(body);
        const { status, payload } = await transport('student-lookup', input, {
          signal,
          capability,
        });
        if (status !== 200) throw studentReadFailure(status);
        return studentReadPayload(input, payload, context);
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw studentReadFailure(error?.status);
      }
    },
  };
}

export const { verifyStudent, readStudent } = createStudentLookup();
