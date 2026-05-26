import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin settings pages', () => {
  test('should redirect the settings hub to configuration', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/settings');

    await expect(page).toHaveURL(/\/en\/settings\/configuration$/);
    await expect(page.getByRole('heading', { name: 'Workspace defaults' })).toBeVisible();
  });

  test('should render the configuration form with current values', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/settings/configuration');

    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workspace defaults' })).toBeVisible();
    await expect(page.getByLabel('Default meeting title')).toHaveValue('Team Sync');
  });

  test('should render the branding form with the current app name', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/settings/branding');

    await expect(page.getByText('Application name')).toBeVisible();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Acme Meet');
  });
});
