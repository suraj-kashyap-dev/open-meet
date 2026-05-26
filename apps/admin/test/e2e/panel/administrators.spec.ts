import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin administrators page', () => {
  test('should list administrator accounts', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/administrators');

    await expect(page.getByRole('heading', { name: 'Administrators', exact: true })).toBeVisible();
    await expect(page.getByText('ada@example.com')).toBeVisible();
    await expect(page.getByText('bob@example.com')).toBeVisible();
  });
});
