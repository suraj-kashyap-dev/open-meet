import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptyActivity } from '../fixtures/data';

test.describe('Web activity page', () => {
  test('should render the mentions feed from the API', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/activity');

    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
    await expect(page.getByText('Messages that @mention you.')).toBeVisible();

    await expect(page.getByText('Grace Hopper')).toBeVisible();
    await expect(page.getByRole('link', { name: /can you take a look at this/ })).toBeVisible();
  });

  test('should show the empty state when there are no mentions', async ({ page }) => {
    await mockWebApi(page, { activity: emptyActivity });
    await page.goto('/en/activity');

    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
    await expect(page.getByText('No mentions yet', { exact: true })).toBeVisible();
  });
});
