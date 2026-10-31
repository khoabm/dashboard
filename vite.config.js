/** Configures the local Vite server and static ES2022 production output. */

import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: ['terminal.local', 'hoping-faced-coordinator-hopefully.trycloudflare.com'] },
  build: { target: 'es2022' },
  plugins: [
    {
      name: 'exclude-test-modules',
      apply: 'build',
      /** Rejects test dependencies before a production bundle can be published. */
      generateBundle() {
        for (const id of this.getModuleIds()) {
          if (/(?:^|\/)tests?\//i.test(id.replaceAll('\\', '/'))) {
            this.error('Production bundles must not import test modules.');
          }
        }
      },
    },
  ],
});
