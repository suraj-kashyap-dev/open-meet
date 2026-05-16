import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('public landing renders hero and primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /actually ship/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /start free/i }).first()).toBeVisible();
  });

  test('landing nav has Sign in + Get started', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: /get started/i })).toBeVisible();
  });

  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
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
