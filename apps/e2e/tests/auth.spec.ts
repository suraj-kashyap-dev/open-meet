import { expect, test } from '@playwright/test';

test.describe('auth form validation', () => {
  test('login form blocks submission with an invalid email', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Wait for React hydration — the form must be interactive before we click submit.
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('whatever');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('register form requires a password ≥ 8 chars', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();

    await page.getByLabel('Name').fill('Ada');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 10_000 });
  });
});
