/** Starts a finite loopback-only synthetic preview; hosted activation requires a verified available allowance. */
import { createServer, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from '../vite.config.js';
if (process.argv.includes('--hosted')) {
  console.error(
    'BLOCKED: chưa có biên nhận allowance live khả dụng cho owner. Không bật AI hoặc tạo run ID mới. Xem docs/features/board-assistant/OWNER_AI_PREVIEW.md.',
  );
  process.exit(2);
}
const root = fileURLToPath(new URL('../', import.meta.url));
let server;
const config = mergeConfig(base, {
  configFile: false,
  root,
  envDir: false,
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  define: {
    'import.meta.env.VITE_BOARD_ASSISTANT_AI': JSON.stringify('false'),
    'import.meta.env.VITE_BOARD_ASSISTANT_ENDPOINT': JSON.stringify(''),
  },
  plugins: [
    {
      name: 'owner-preview-stop',
      configureServer(vite) {
        vite.middlewares.use('/__owner/stop', (req, res, next) => {
          if (req.method !== 'POST') return next();
          if (
            !['127.0.0.1:4173', 'localhost:4173'].includes(req.headers.host) ||
            req.headers.origin !== 'http://127.0.0.1:4173'
          ) {
            res.writeHead(403).end();
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"stopped":true}');
          setTimeout(() => server.close().then(() => process.exit(0)), 50);
        });
      },
    },
  ],
});
config.server.allowedHosts = ['localhost', '127.0.0.1'];
server = await createServer(config);
await server.listen();
console.log(
  'SCRIPTED OFFLINE, không Qwen/Supabase: http://127.0.0.1:4173/tests/owner-ai-preview.html',
);
console.log('Stop: node scripts/owner-preview-stop.mjs hoặc Ctrl+C. Tự đóng sau 30 phút.');
const expiry = setTimeout(async () => {
  await server.close();
  process.exit(0);
}, 1800000);
process.on('SIGINT', async () => {
  clearTimeout(expiry);
  await server.close();
  process.exit(0);
});
