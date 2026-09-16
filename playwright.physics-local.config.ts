import { defineConfig } from '@playwright/test';
/** Explicit local invocation against the existing dev server; no web servers, DB or CI. */
export default defineConfig({
  testDir: './tests/browser-integration',
  testMatch: [
    'physics.spec.ts',
    'physics-playground.spec.ts',
    'projectiles.spec.ts',
    'bali-adventure.spec.ts',
    'hippie-house.spec.ts',
  ],
  workers: 1,
  retries: 0,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5173', headless: true },
});
