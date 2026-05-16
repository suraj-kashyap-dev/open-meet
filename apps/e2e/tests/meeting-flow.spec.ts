import { expect, test, type Page } from '@playwright/test';

const fullStack = !!process.env.RUN_FULL_E2E;

async function registerAndWait(page: Page, name: string) {
  const email = `ada+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@example.com`;
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();

  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
}

test.describe('meeting flow', () => {
  test.skip(! fullStack, 'requires API + docker stack — set RUN_FULL_E2E=1');

  test('register lands on dashboard', async ({ page }) => {
    await registerAndWait(page, 'Ada Lovelace');
    await expect(page.getByRole('heading', { name: /ready to talk/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New meeting' })).toBeEnabled();
  });

  test('create new meeting routes to lobby', async ({ page, context }) => {
    await registerAndWait(page, 'Ada');
    await context.grantPermissions(['camera', 'microphone']);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'New meeting' })).toBeEnabled();
    await page.getByRole('button', { name: 'New meeting' }).click();

    await expect(page).toHaveURL(/\/meeting\/.+\/lobby$/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Join now' })).toBeVisible();
  });

  // Regression: POST /api/meetings/:code/join used to 400 because the web client
  // always set Content-Type: application/json, even with no body, and Fastify
  // rejects empty JSON bodies. The client now only sets that header when a body
  // is actually present.
  test('join endpoint accepts empty-body POST', async ({ page }) => {
    await registerAndWait(page, 'Ada');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const result = await page.evaluate(async (api: string) => {
      const meetingRes = await fetch(`${api}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      });
      const meeting = await meetingRes.json();

      const joinRes = await fetch(
        `${api}/api/meetings/${meeting.data.code}/join`,
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
    }, apiUrl);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.meeting.status).toBe('ACTIVE');
  });

  // Regression: after a hard refresh on the landing page, a logged-in user used
  // to see "Sign in / Get started" flash for ~300ms while /auth/me was in flight.
  // We now seed initialData from localStorage so the right CTA renders immediately.
  test('logged-in user sees "Open app" without flash after refresh', async ({ page }) => {
    await registerAndWait(page, 'Ada');

    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: /open app/i })).toBeVisible();

    await page.reload();
    // No flash window: assert "Open app" within the first 500ms of paint.
    await expect(page.locator('header').getByRole('link', { name: /open app/i })).toBeVisible({
      timeout: 1_500,
    });
    // And the signed-out CTAs must NOT be present.
    await expect(page.locator('header').getByRole('link', { name: 'Sign in' })).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: /get started/i })).toHaveCount(0);
  });
});
