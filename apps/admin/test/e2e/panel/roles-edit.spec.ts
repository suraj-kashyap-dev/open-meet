import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin /roles/[roleId] (edit role)', () => {
  test('should load an existing custom role into the edit form', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/roles/role_custom_analyst');

    await expect(page.getByRole('heading', { name: 'Analyst', level: 1 })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  });

  test('should note that a system role cannot be modified', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/en/roles/role_sys_admin');

    await expect(page.getByRole('heading', { name: 'Administrator', level: 1 })).toBeVisible();

    await expect(page.getByText('System roles cannot be renamed', { exact: false })).toBeVisible();
  });
});
