import { defineConfig } from '@playwright/test';

const PORT = 3101;

const baseURL = `http://localhost:${PORT}`;

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  // In CI run serially with a retry: the production server is cold on the first
  // request per route, so a parallel first wave can time out (flaky) without it.
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
  },
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
