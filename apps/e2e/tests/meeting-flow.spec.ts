import { expect, test } from '@playwright/test';

/**
 * End-to-end meeting creation flow.
 *
 * Requires the full stack to be running:
 *   docker compose up -d
 *   pnpm --filter @open-meet/api prisma:migrate dev --name init
 *   pnpm --filter @open-meet/api dev
 *   pnpm --filter @open-meet/web dev
 *
 * Skipped by default — set RUN_FULL_E2E=1 to enable. Without those services,
 * the API calls fail with network errors and the test would be flaky-by-design.
 */
const fullStack = !!process.env.RUN_FULL_E2E;

test.describe('meeting flow', () => {
  test.skip(! fullStack, 'requires API + docker stack — set RUN_FULL_E2E=1');

  test('register → home shows meeting actions', async ({ page }) => {
    const email = `ada+${Date.now()}@example.com`;
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Talk face-to-face.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New meeting' })).toBeEnabled();
  });

  test('create new meeting routes to lobby', async ({ page, context }) => {
    const email = `ada+${Date.now()}@example.com`;
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ada');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL(/\/$/);

    await context.grantPermissions(['camera', 'microphone']);
    await page.getByRole('button', { name: 'New meeting' }).click();

    await expect(page).toHaveURL(/\/meeting\/.+\/lobby$/);
    await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible();
  });

  // Regression: POST /api/meetings/:code/join used to 400 because the web client
  // always set Content-Type: application/json, even with no body, and Fastify
  // rejects empty JSON bodies. The client now only sets that header when a body
  // is actually present.
  test('join endpoint accepts empty-body POST', async ({ page }) => {
    const email = `ada+${Date.now()}@example.com`;
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ada');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL(/\/$/);

    // Hit the API directly from the page so cookies + same-origin behavior apply.
    const result = await page.evaluate(async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const meetingRes = await fetch(`${apiUrl}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      });
      const meeting = await meetingRes.json();

      // Reproduce the broken call: no body, no Content-Type. Used to 400.
      const joinRes = await fetch(
        `${apiUrl}/api/meetings/${meeting.data.code}/join`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        },
      );
      return {
        status: joinRes.status,
        body: await joinRes.json(),
      };
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.meeting.status).toBe('ACTIVE');
  });
});
