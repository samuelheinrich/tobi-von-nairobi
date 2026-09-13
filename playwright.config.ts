import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @tobi/game-client preview --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
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
