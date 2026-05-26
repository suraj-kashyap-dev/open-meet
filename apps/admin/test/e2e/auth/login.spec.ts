import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin login page', () => {
  test('should render the sign-in form', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/login');

    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('should show a validation error for an invalid email', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/login');

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test('should sign in and land on the dashboard', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/login');

    await page.getByLabel('Email').fill('root@admin.test');
    await page.getByLabel('Password', { exact: true }).fill('supersecret');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole('heading', { name: 'Console', exact: true })).toBeVisible();
  });
});
