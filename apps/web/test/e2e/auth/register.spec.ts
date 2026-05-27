import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web register page', () => {
  test('should render the create-account form', async ({ page }) => {
    await mockWebApi(page, { me: null });
    await page.goto('/en/register');

    await expect(page.getByRole('heading', { name: 'Create account', exact: true })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByText('At least 8 characters.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('should reject a password shorter than 8 characters', async ({ page }) => {
    await mockWebApi(page, { me: null });
    await page.goto('/en/register');

    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/register$/);
  });

  test('should register and land on the home dashboard', async ({ page }) => {
    await mockWebApi(page, { me: null });
    await page.goto('/en/register');

    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('supersecret');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole('heading', { name: 'Start a new meeting', exact: true }),
    ).toBeVisible();
  });
});
