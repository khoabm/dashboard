/** Runs the established XLSX value reader off the UI thread; receives already bounded/sanitized ZIP. */
import { readSheet } from 'read-excel-file/web-worker';

self.onmessage = async ({ data }) => {
  try {
    const rows = await readSheet(data, {
      trim: false,
      parseNumber: (value) => ({ kind: 'number', value }),
    });
    self.postMessage({ rows });
  } catch {
    self.postMessage({ error: 'xlsx' });
  }
};
