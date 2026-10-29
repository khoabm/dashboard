/** Stops only the named loopback owner preview; this command never calls a hosted service. */
const res = await fetch('http://127.0.0.1:4173/__owner/stop', {
  method: 'POST',
  headers: { Origin: 'http://127.0.0.1:4173' },
  redirect: 'error',
  signal: AbortSignal.timeout(3000),
});
if (!res.ok)
  throw Error(
    'Không đúng owner preview hoặc không thể dừng; dùng Ctrl+C trong terminal đã mở preview.',
  );
console.log(
  'Đã yêu cầu dừng local owner preview. Worker hosted được quản lý riêng và phải giữ disabled.',
);
