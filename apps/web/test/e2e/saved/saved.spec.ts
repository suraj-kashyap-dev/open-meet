import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptySaved } from '../fixtures/data';

test.describe('Web saved page', () => {
  test('should render saved messages from the API', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/saved');

    await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Remember to send the quarterly report/ }),
    ).toBeVisible();
  });

  test('should show the empty state when nothing is saved', async ({ page }) => {
    await mockWebApi(page, { saved: emptySaved });
    await page.goto('/en/saved');

    await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
    await expect(page.getByText('No saved messages')).toBeVisible();
  });
});
