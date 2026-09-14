import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: process.env.CI ? 180000 : 90000,
  workers: 1,
  // Split independent tests evenly across CI shards, never add local GPU contention.
  fullyParallel: Boolean(process.env.CI),
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @tobi/game-server start',
      url: 'http://127.0.0.1:3001/api/v1/health/ready',
      env: {
        PORT: '3001',
        CLIENT_URL: 'http://127.0.0.1:4173',
        NODE_ENV: 'test',
        SESSION_SECRET: 'ephemeral-browser-test-session-secret',
      },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @tobi/game-client preview --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: { TOBI_TEST_API_URL: 'http://127.0.0.1:3001' },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @tobi/game-client dev --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174/test/physics.html',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testMatch: '**/e2e/**/*.spec.ts',
      use: { browserName: 'chromium', launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
    },
    {
      name: 'physics',
      testMatch: '**/browser-integration/**/*.spec.ts',
      use: {
        baseURL: 'http://127.0.0.1:5174',
        browserName: 'chromium',
        launchOptions: { args: ['--enable-unsafe-swiftshader'] },
      },
    },
  ],
});
