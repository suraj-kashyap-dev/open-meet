import { expect, test } from '@playwright/test';

test.describe('smoke — public surface', () => {
  test('landing renders hero, GitHub CTA, and primary action', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /actually ship/i }),
    ).toBeVisible();
    await expect(
      page.locator('main').getByRole('link', { name: /get started|open app/i }).first(),
    ).toBeVisible();
    await expect(
      page.locator('main').getByRole('link', { name: /star on github/i }).first(),
    ).toBeVisible();
  });

  test('landing nav offers Sign in + Get started for guests', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Get started' })).toBeVisible();
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

  test('theme toggle flips html class on the landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const before = await page.evaluate(() => document.documentElement.className);

    await page
      .locator('header')
      .getByRole('button', { name: /switch to (light|dark) theme/i })
      .click();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.className))
      .not.toBe(before);
  });
});
