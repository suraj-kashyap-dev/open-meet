import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptySaved } from '../fixtures/data';

test.describe('Web starred page', () => {
  test('should render starred messages from the API', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/saved');

    await expect(page.getByRole('heading', { name: 'Starred' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Remember to send the quarterly report/ }),
    ).toBeVisible();
  });

  test('should show the empty state when nothing is starred', async ({ page }) => {
    await mockWebApi(page, { saved: emptySaved });
    await page.goto('/en/saved');

    await expect(page.getByRole('heading', { name: 'Starred' })).toBeVisible();
    await expect(page.getByText('No starred messages')).toBeVisible();
  });
});
