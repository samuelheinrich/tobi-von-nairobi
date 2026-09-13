import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['packages/**/*.test.ts'], environment: 'node' } },
      {
        test: {
          name: 'integration',
          include: ['apps/game-server/test/**/*.test.ts'],
          environment: 'node',
          testTimeout: 15000,
        },
      },
    ],
  },
});
