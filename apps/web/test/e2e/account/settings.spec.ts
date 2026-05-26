import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';

test.describe('Web settings page', () => {
  test('should render the localization, defaults, and privacy sections', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/settings');

    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Localization' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Meeting defaults' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible();
  });

  test('should render meeting-preference toggles from the settings endpoint', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/settings');

    await expect(page.getByText('Join muted by default')).toBeVisible();
    await expect(page.getByText('Camera off by default')).toBeVisible();
  });
});
