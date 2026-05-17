import { expect, test } from '@playwright/test';

test.describe('smoke — public surface', () => {
  test('unauthenticated visit to / is bounced to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
  });

  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('register page is reachable from login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: 'Create one' }).click();

    await expect(page).toHaveURL(/\/register$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });
});
