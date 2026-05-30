import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';
import { currentAdminMe } from '../fixtures/data';

test.describe('Admin /user-roles page', () => {
  test('should list every user role with its member count', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/user-roles');

    await expect(page.getByRole('heading', { name: 'User roles', exact: true })).toBeVisible();
    await expect(page.getByText('Member', { exact: true })).toBeVisible();
    await expect(page.getByText('Facilitator')).toBeVisible();
  });

  test('should hide create + delete actions when the admin lacks user-roles.create/.delete', async ({ page }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_viewer', name: 'Viewer', permissionType: 'CUSTOM' },
        grantedSet: ['user-roles.view'],
      },
    });
    await page.goto('/en/user-roles');

    await expect(page.getByRole('heading', { name: 'User roles', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create role' })).toHaveCount(0);
  });

  test('should hide the User roles nav item when grantedSet excludes user-roles.view', async ({ page }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_minimal', name: 'Minimal', permissionType: 'CUSTOM' },
        grantedSet: ['users.view'],
      },
    });
    await page.goto('/en/users');

    await expect(page.getByRole('link', { name: 'User roles' })).toHaveCount(0);
  });
});
