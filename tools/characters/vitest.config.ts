import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tools/characters/tests/*.test.ts'], environment: 'node' },
});
