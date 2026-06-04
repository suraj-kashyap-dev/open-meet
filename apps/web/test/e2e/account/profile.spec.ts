import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web profile page', () => {
  test('should render the profile, personal-details, and password sections', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/profile');

    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Profile image' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Personal details' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Password', exact: true })).toBeVisible();
    await expect(page.getByLabel('Display name')).toBeVisible();
  });

  test('should expose the account sidebar navigation', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/profile');

    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meeting history' })).toHaveCount(0);
  });
});
