import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin dashboard page', () => {
  test('should render the overview heading and stats', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en');

    await expect(page.getByRole('heading', { name: 'Console', exact: true })).toBeVisible();
    await expect(page.getByText('Total registered accounts')).toBeVisible();
    await expect(page.getByText('128', { exact: true })).toBeVisible();
  });

  test('should show the recent meetings table', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en');

    await expect(page.getByRole('heading', { name: 'Recent meetings' })).toBeVisible();
    await expect(page.getByText('abcd-efgh-ijkl')).toBeVisible();
  });
});
