import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';
import { currentAdminMe } from '../fixtures/data';

test.describe('Admin settings pages', () => {
  test('should render the grouped settings hub with section cards', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/settings');

    await expect(page).toHaveURL(/\/en\/settings$/);

    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Access', exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible();

    await expect(page.getByRole('link', { name: /Administrators/ })).toBeVisible();

    await expect(page.getByRole('link', { name: /Admin roles/ })).toBeVisible();

    await expect(page.getByRole('link', { name: /Branding/ })).toBeVisible();

    await expect(page.getByRole('link', { name: /Configuration/ })).toBeVisible();
  });

  test('should hide cards the admin does not have permission for', async ({ page }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_branding', name: 'Brand Manager', permissionType: 'CUSTOM' },
        grantedSet: ['branding.view'],
      },
    });

    await page.goto('/en/settings');

    await expect(page.getByRole('link', { name: /Branding/ })).toBeVisible();

    await expect(page.getByRole('link', { name: /Administrators/ })).toHaveCount(0);

    await expect(page.getByRole('link', { name: /Admin roles/ })).toHaveCount(0);
  });

  test('should render the configuration form with current values', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/settings/configuration');

    await expect(page.getByRole('heading', { name: 'Configuration', exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Workspace defaults' })).toBeVisible();

    await expect(page.getByLabel('Default meeting title')).toHaveValue('Team Sync');
  });

  test('should render the branding form with the current app name', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/settings/branding');

    await expect(page.getByText('Application name')).toBeVisible();

    await expect(page.getByLabel('Name', { exact: true })).not.toHaveValue('');
  });
});
