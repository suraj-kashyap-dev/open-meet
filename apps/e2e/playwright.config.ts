import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  // Cap parallelism — the dev server + a single API throttler bucket get
  // contended with 6 workers all hammering /auth/me + mutations at once.
  workers: isCI ? 1 : 2,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['camera', 'microphone'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-running-insecure-content',
          ],
        },
      },
    },
    // Firefox / WebKit can be enabled per-flow when reasonable; LiveKit's getUserMedia
    // stack works best with Chromium for headless e2e runs.
  ],

  webServer: process.env.E2E_NO_WEB_SERVER
    ? undefined
    : {
        command: 'pnpm --filter @open-meet/web dev',
        url: WEB_URL,
        reuseExistingServer: !isCI,
        timeout: 60_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
