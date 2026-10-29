/** Starts a finite loopback-only synthetic preview; hosted activation requires a verified available allowance. */
import { createServer, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { createServer as createPortProbe } from 'node:net';
import base from '../vite.config.js';
const hosted = process.argv.includes('--hosted');
// Refuse occupied localhost before activation can consume hosted status/shutdown operations.
const portProbe = createPortProbe();
await new Promise((resolve, reject) => {
  portProbe.once('error', reject);
  portProbe.listen(4173, '127.0.0.1', resolve);
});
await new Promise((resolve, reject) =>
  portProbe.close((error) => (error ? reject(error) : resolve())),
);
const session = hosted
  ? await (
      await import('./owner-ai-hosted.mjs')
    ).startHostedPilot({ qa: process.argv.includes('--qa'), uat: process.argv.includes('--uat') })
  : null;
const root = fileURLToPath(new URL('../', import.meta.url));
let server;
/** Disables the hosted session before releasing the local server; errors stay visible. */
async function shutdown() {
  await session?.stop();
  await server?.close();
}
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
    'import.meta.env.VITE_BOARD_ASSISTANT_AI': JSON.stringify(String(hosted)),
    'import.meta.env.VITE_BOARD_ASSISTANT_ENDPOINT': JSON.stringify(
      hosted ? '/assistant/chat' : '',
    ),
  },
  plugins: [
    {
      name: 'owner-preview-stop',
      configureServer(vite) {
        vite.middlewares.use('/assistant/chat', (req, res, next) => {
          if (!session) return next();
          if (
            req.method !== 'POST' ||
            !['127.0.0.1:4173', 'localhost:4173'].includes(req.headers.host) ||
            req.headers.origin !== 'http://127.0.0.1:4173'
          ) {
            res.writeHead(403).end();
            return;
          }
          void session.chat(req, res);
        });
        vite.middlewares.use('/__owner/status', (req, res) =>
          res
            .writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            .end(JSON.stringify(session?.status || { mode: 'scripted' })),
        );
        vite.middlewares.use('/__owner/stop', async (req, res, next) => {
          if (req.method !== 'POST') return next();
          if (
            !['127.0.0.1:4173', 'localhost:4173'].includes(req.headers.host) ||
            req.headers.origin !== 'http://127.0.0.1:4173'
          ) {
            res.writeHead(403).end();
            return;
          }
          try {
            await session?.stop();
            res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"stopped":true}');
            setTimeout(() => server.close().then(() => process.exit(0)), 50);
          } catch {
            res.writeHead(503).end('{"error":"disable_failed"}');
          }
        });
      },
    },
  ],
});
config.server.allowedHosts = ['localhost', '127.0.0.1'];
try {
  server = await createServer(config);
  await server.listen();
} catch (error) {
  await session?.stop();
  throw error;
}
console.log(
  `${hosted ? 'HOSTED Cloudflare, dữ liệu giả' : 'SCRIPTED OFFLINE, không Qwen/Supabase'}: http://127.0.0.1:4173/tests/owner-ai-preview.html`,
);
console.log(
  'Stop: node scripts/owner-preview-stop.mjs hoặc Ctrl+C. Hosted hết hạn tối đa15 phút, offline30 phút.',
);
const expiry = setTimeout(
  async () => {
    await shutdown();
    process.exit(0);
  },
  session ? Math.max(1, Date.parse(session.expires) - Date.now()) : 1800000,
);
process.on('SIGINT', async () => {
  clearTimeout(expiry);
  await shutdown();
  process.exit(0);
});
