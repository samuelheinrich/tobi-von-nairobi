import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: {
    entries: ['index.html', 'test/physics.html'],
    include: ['react', 'react-dom/client', 'react/jsx-runtime'],
  },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3000' } },
  preview: { proxy: { '/api': process.env.TOBI_TEST_API_URL ?? 'http://127.0.0.1:3000' } },
  build: { target: 'es2022' },
});
