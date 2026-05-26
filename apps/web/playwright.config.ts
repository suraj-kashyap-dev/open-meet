import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3501);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: 'en-US',
    permissions: ['camera', 'microphone'],
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The lobby calls getUserMedia on mount. These flags make Chromium
        // auto-grant and return a synthetic A/V stream so the page renders
        // without a permission prompt or real hardware.
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // All /api calls are intercepted by Playwright route mocking, so these
      // never reach a real backend — they only need to satisfy the env schema.
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:59322',
      NEXT_PUBLIC_WS_URL: 'http://127.0.0.1:59323',
      NEXT_PUBLIC_LIVEKIT_URL: 'ws://127.0.0.1:59324',
    },
  },
});
