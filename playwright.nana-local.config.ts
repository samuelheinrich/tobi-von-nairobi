import { defineConfig } from '@playwright/test';
/** Opt-in local checks against an already running client. Never starts GitHub CI or database jobs. */
export default defineConfig({
  testDir: './tests',
  workers: 1,
  retries: 0,
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'nana-local',
      testMatch: [
        '**/e2e/nana-plaza.spec.ts',
        '**/e2e/escape.spec.ts',
        '**/browser-integration/nana.spec.ts',
      ],
    },
  ],
});
