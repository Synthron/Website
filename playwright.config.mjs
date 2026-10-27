// Playwright config (npm run test:e2e). Runs against dist/ served by
// scripts/serve.mjs on its own port, so a running `npm run dev` (live-reload
// script injected) is never reused.

import { defineConfig, devices } from '@playwright/test';

const PORT = 8010;

export default defineConfig({
  testDir: 'scripts/e2e',
  testMatch: '*.spec.mjs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    // PLAYWRIGHT_CHANNEL=msedge|chrome uses an installed browser instead of
    // the one from `npx playwright install chromium`.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://127.0.0.1:${PORT}/`,
    env: { PORT: String(PORT), HOST: '127.0.0.1' },
    reuseExistingServer: false,
  },
});
