/** Adds a loopback-only assistant proxy to the existing Vite config without changing website hosting. */
import { defineConfig, mergeConfig } from 'vite';
import base from '../../vite.config.js';

const endpoint = process.env.BOARD_ASSISTANT_WORKER_URL || '';
const previewToken = process.env.BOARD_ASSISTANT_PREVIEW_TOKEN || '';
const accessExpiry = Date.parse(process.env.BOARD_ASSISTANT_ACCESS_EXPIRES || '');
if (endpoint) {
  const url = new URL(endpoint);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.workers.dev') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw Error('Use a Workers HTTPS origin without credentials.');
  if (
    !/^[a-f0-9]{64}$/.test(previewToken) ||
    !Number.isFinite(accessExpiry) ||
    accessExpiry <= Date.now()
  )
    throw Error('A verified, short-lived server-only preview authorization is required.');
}

const preview = mergeConfig(base, {
  server: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy: endpoint
      ? {
          '/assistant/chat': {
            target: endpoint,
            changeOrigin: true,
            rewrite: () => '/chat',
            proxyTimeout: 50000,
            configure(proxy) {
              proxy.on('proxyReq', (outgoing) => {
                outgoing.setHeader('Authorization', `Bearer ${previewToken}`);
              });
            },
            // This local proxy must not turn a public tunnel into an authorized local AI origin.
            bypass(req) {
              if (
                req.method !== 'POST' ||
                Date.now() >= accessExpiry ||
                !['http://localhost:4173', 'http://127.0.0.1:4173'].includes(req.headers.origin)
              ) {
                return false;
              }
            },
          },
        }
      : {},
  },
  define: {
    'import.meta.env.VITE_BOARD_ASSISTANT_AI': JSON.stringify(Boolean(endpoint).toString()),
    'import.meta.env.VITE_BOARD_ASSISTANT_ENDPOINT': JSON.stringify('/assistant/chat'),
  },
});
// mergeConfig concatenates arrays; replace the inherited tunnel allowlist explicitly.
preview.server.allowedHosts = ['localhost', '127.0.0.1'];
export default defineConfig(preview);
