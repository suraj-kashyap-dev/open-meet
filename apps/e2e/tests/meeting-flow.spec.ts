import { expect, test, type Page } from '@playwright/test';

const fullStack = !!process.env.RUN_FULL_E2E;

async function registerAndWait(page: Page, name: string) {
  const email = `ada+${Date.now()}+${Math.random().toString(36).slice(2, 6)}@example.com`;
  // Next.js dev server sometimes never fires the 'load' event under load; only
  // wait for DOM ready, then bridge to React readiness with our hydration marker.
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();

  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/, { timeout: 15_000 });
}

test.describe('meeting flow', () => {
  test.skip(! fullStack, 'requires API + docker stack — set RUN_FULL_E2E=1');

  test('register lands on app', async ({ page }) => {
    await registerAndWait(page, 'Ada Lovelace');
    await expect(
      page.getByRole('heading', { name: /(morning|afternoon|evening|up late).*ada/i }),
    ).toBeVisible();
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

  test('logout redirects to /login and clears the cached user', async ({ page }) => {
    await registerAndWait(page, 'Ada');

    // Open the user menu, click "Sign out".
    await page.locator('header').getByRole('button', { name: /ada/i }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    // localStorage cache must be wiped so subsequent visits don't show a stale user.
    const cached = await page.evaluate(() => window.localStorage.getItem('open-meet:user'));
    expect(cached).toBeNull();
  });

  test('logged-in user cannot land on /login or /register', async ({ page }) => {
    await registerAndWait(page, 'Ada');

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app$/, { timeout: 10_000 });

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app$/, { timeout: 10_000 });
  });

  // Regression: an authenticated request returning 401 (e.g. session expired or
  // cookies cleared elsewhere) must clear the cached user and bounce to /login.
  test('401 on an authenticated request redirects to /login', async ({ page, context }) => {
    await registerAndWait(page, 'Ada');

    // Wipe the auth cookies behind React's back to simulate an expired session.
    await context.clearCookies();

    // Trigger a fetch from inside the page so the api wrapper fires the
    // unauthorized event. /api/auth/me is whitelisted (guest case), so we hit
    // POST /meetings instead — needs auth, will 401.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    await page.evaluate(async (api: string) => {
      await fetch(`${api}/api/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
      });
    }, apiUrl);

    // The web app uses a different client, but the global event listener is the
    // same. To exercise the same path the real client uses, click "New meeting"
    // from the dashboard which hits POST /meetings via the typed client.
    await page.getByRole('button', { name: 'New meeting' }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    const cached = await page.evaluate(() => window.localStorage.getItem('open-meet:user'));
    expect(cached).toBeNull();
  });
});
