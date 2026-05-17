import { expect, test } from '@playwright/test';

import { registerNewUser } from './helpers/auth';
import { installMockApi } from './helpers/mock-api';

const fullStack = !! process.env.RUN_FULL_E2E;

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await installMockApi(page);
  });

  test('shows greeting + primary actions for the logged-in user', async ({ page }) => {
    await registerNewUser(page, 'Ada Lovelace');

    await expect(
      page.getByRole('heading', { name: /(morning|afternoon|evening|up late).*ada/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'New meeting' })).toBeEnabled();
    await expect(page.getByPlaceholder('abcd-efgh-ijkl')).toBeVisible();
  });

  test('"New meeting" creates a meeting and routes to its lobby', async ({ page, context }) => {
    await registerNewUser(page, 'Ada');
    await context.grantPermissions(['camera', 'microphone']);

    await page.getByRole('button', { name: 'New meeting' }).click();

    await page.waitForURL(/\/[a-z0-9-]{8,}\/lobby$/, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible({ timeout: 15_000 });
  });

  test('joining with the code field routes to that meeting lobby', async ({ page, context }) => {
    await registerNewUser(page, 'Ada');
    await context.grantPermissions(['camera', 'microphone']);

    // Synthesise a code that matches the placeholder format and let the mock
    // resolve it lazily on the lobby's GET request.
    const code = 'mock-test-abcd';

    await page.getByPlaceholder('abcd-efgh-ijkl').fill(code);
    await page.getByRole('button', { name: 'Join', exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/${code}/lobby$`), { timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('dashboard — backend regressions', () => {
  // Stays gated on the real backend: this test specifically validates that the
  // server accepts an empty-body POST /api/meetings/:code/join (a regression
  // we hit once). Mocking it would defeat the purpose.
  test.skip(! fullStack, 'requires API stack — set RUN_FULL_E2E=1');

  test('empty-body POST /api/meetings/:code/join succeeds', async ({ page }) => {
    await registerNewUser(page, 'Ada');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const result = await page.evaluate(async (api: string) => {
      const meeting = await fetch(`${api}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      const joinRes = await fetch(
        `${api}/api/meetings/${meeting.data.code}/join`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      );
      return { status: joinRes.status, body: await joinRes.json() };
    }, apiUrl);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.meeting.status).toBe('ACTIVE');
  });
});
