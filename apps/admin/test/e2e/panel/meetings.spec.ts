import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin meetings page', () => {
  test('should list meetings from the API', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/meetings');

    await expect(page.getByRole('heading', { name: 'Meetings', exact: true })).toBeVisible();
    await expect(page.getByText('Quarterly review')).toBeVisible();
    await expect(page.getByText('abcd-efgh-ijkl')).toBeVisible();
  });
});
