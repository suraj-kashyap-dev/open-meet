import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptyHistory, historyList } from '../fixtures/data';

test.describe('Web meeting history page', () => {
  test('should list meetings returned by the API', async ({ page }) => {
    await mockWebApi(page, { history: historyList });
    await page.goto('/en/history');

    await expect(page.getByRole('heading', { name: 'Meeting history' })).toBeVisible();
    await expect(page.getByText('Quarterly review')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open', exact: true })).toBeVisible();
  });

  test('should show the empty state when there are no meetings', async ({ page }) => {
    await mockWebApi(page, { history: emptyHistory });
    await page.goto('/en/history');

    await expect(page.getByText('No meetings yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a meeting' })).toBeVisible();
  });
});
