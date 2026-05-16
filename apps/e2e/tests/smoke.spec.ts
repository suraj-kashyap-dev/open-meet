import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('unauthenticated user is redirected from home to login', async ({ page }) => {
    await page.goto('/');
    // AuthGuard does a client-side /auth/me check. Without a running API, the query
    // hits the network, retries once, then we redirect. Give it room.
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('register page is reachable from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });
});
