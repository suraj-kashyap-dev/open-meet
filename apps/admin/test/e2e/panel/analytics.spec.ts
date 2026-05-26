import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin analytics page', () => {
  test('should render KPIs and the top-hosts table', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Avg meeting length', { exact: true })).toBeVisible();
    await expect(page.getByText('Top hosts', { exact: true })).toBeVisible();
    await expect(page.getByText('Grace Hopper').first()).toBeVisible();
  });
});
