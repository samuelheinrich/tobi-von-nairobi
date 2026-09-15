import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Serves the owner's local `models/` folder at `/models/…` while developing.
 *
 * The downloaded GLB files are large and carry third-party licences, so they stay out of the
 * repository and out of every build. Only the dev server knows about them, which is enough for
 * the model studio under `test/models.html`.
 */
function localModels(): Plugin {
  return {
    name: 'tobi-local-models',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/models', (request, response, next) => {
        const name = decodeURIComponent((request.url ?? '').split('?')[0] ?? '').replace(/^\//, '');
        // Only plain file names: no traversal out of the folder.
        if (!/^[\w.-]+\.glb$/i.test(name)) return next();
        const file = join(repoRoot, 'models', name);
        let size: number;
        try {
          size = statSync(file).size;
        } catch {
          return next();
        }
        response.setHeader('Content-Type', 'model/gltf-binary');
        response.setHeader('Content-Length', size);
        createReadStream(file).pipe(response);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localModels()],
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: {
    entries: ['index.html', 'test/*.html', 'test/*-harness.ts'],
    include: ['react', 'react-dom/client', 'react/jsx-runtime'],
  },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } },
  preview: { proxy: { '/api': process.env.TOBI_TEST_API_URL ?? 'http://127.0.0.1:3000' } },
  build: { target: 'es2022' },
});
