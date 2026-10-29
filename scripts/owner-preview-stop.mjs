/** Stops the named local preview, which disables its hosted session before acknowledging success. */
if (process.argv.includes('--recover')) {
  await (await import('./owner-ai-hosted.mjs')).disablePilot();
  process.exit(0);
}
const res = await fetch('http://127.0.0.1:4173/__owner/stop', {
  method: 'POST',
  headers: { Origin: 'http://127.0.0.1:4173' },
  redirect: 'error',
  // Hosted shutdown includes a control-plane deploy and read-back; a 3s local deadline is too short.
  signal: AbortSignal.timeout(60000),
});
if (!res.ok)
  throw Error(
    'Không đúng owner preview hoặc không thể dừng; dùng Ctrl+C trong terminal đã mở preview.',
  );
console.log(
  'Đã dừng owner preview; nếu đang hosted, Worker đã được xác minh disabled trước khi trả thành công.',
);
