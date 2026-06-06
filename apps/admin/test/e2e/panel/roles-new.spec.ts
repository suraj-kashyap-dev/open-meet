import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin /roles/new (create role)', () => {
  test('should render the create-role form', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/roles/new');

    await expect(
      page.getByRole('heading', { name: 'New role', exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Support')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create role' })).toBeVisible();
  });

  test('should submit a new role and surface a success toast', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/roles/new');

    await page.getByPlaceholder('e.g. Support').fill('Support');
    await page.getByRole('button', { name: 'Create role' }).click();

    await expect(page.getByText('Role created.')).toBeVisible();
  });
});
