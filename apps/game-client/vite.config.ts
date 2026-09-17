import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
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
      for (const [mount, directory, extensions] of [
        ['/models', 'models', /\.glb$/i],
        ['/level-assets', 'assets/game/levels', /\.(glb|json)$/i],
      ] as const)
        server.middlewares.use(mount, (request, response, next) => {
          const name = decodeURIComponent((request.url ?? '').split('?')[0] ?? '').replace(
            /^\//,
            '',
          );
          // Subfolders are allowed (models/tpose, models/tpose/18+), traversal is not.
          if (!/^(?:[\w.+-]+\/)*[\w.+-]+$/.test(name) || !extensions.test(name)) return next();
          const root = join(repoRoot, directory);
          const file = resolve(root, name);
          if (file !== root && !file.startsWith(root + sep)) return next();
          let size: number;
          try {
            size = statSync(file).size;
          } catch {
            return next();
          }
          response.setHeader(
            'Content-Type',
            name.endsWith('.json') ? 'application/json' : 'model/gltf-binary',
          );
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
