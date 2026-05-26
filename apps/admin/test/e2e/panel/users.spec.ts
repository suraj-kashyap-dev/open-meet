import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin users page', () => {
  test('should list users from the API', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/users');

    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
    await expect(page.getByText('ada@example.com')).toBeVisible();
    await expect(page.getByText('Alan Turing')).toBeVisible();
  });

  test('should show the empty state when there are no users', async ({ page }) => {
    await mockAdminApi(page, { users: { items: [], total: 0, page: 1, pageSize: 20 } });
    await page.goto('/en/users');

    await expect(page.getByText('No users yet.')).toBeVisible();
  });
});
