import { defineConfig } from '@playwright/test';

const PORT = 3101;

const baseURL = `http://localhost:${PORT}`;

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
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
