import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';
import { currentAdminMe } from '../fixtures/data';

test.describe('Admin /roles page', () => {
  test('should list every role with its member count', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/roles');

    await expect(page.getByRole('heading', { name: 'Admin roles', exact: true })).toBeVisible();

    await expect(page.getByText('Administrator', { exact: true })).toBeVisible();

    await expect(page.getByText('Member', { exact: true })).toBeVisible();

    await expect(page.getByText('Analyst')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Create role' })).toBeVisible();
  });

  test('should hide create + delete actions when the admin lacks roles.create/.delete', async ({
    page,
  }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_viewer', name: 'Viewer', permissionType: 'CUSTOM' },
        grantedSet: ['roles.view'],
      },
    });

    await page.goto('/en/roles');

    await expect(page.getByRole('heading', { name: 'Admin roles', exact: true })).toBeVisible();

    await expect(page.getByText('Administrator', { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Create role' })).toHaveCount(0);
  });

  test('should hide the entire Admin roles nav item when grantedSet excludes roles.view', async ({
    page,
  }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_minimal', name: 'Minimal', permissionType: 'CUSTOM' },
        grantedSet: ['users.view'],
      },
    });

    await page.goto('/en/users');

    await expect(page.getByRole('link', { name: 'Admin roles' })).toHaveCount(0);
  });
});
