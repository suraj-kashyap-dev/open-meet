import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptyHistory } from '../fixtures/data';

test.describe('Web home dashboard', () => {
  test('should render the start + join actions', async ({ page }) => {
    await mockWebApi(page, { history: emptyHistory });
    await page.goto('/en');

    await expect(
      page.getByRole('heading', { name: 'Start a new meeting', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Join with a code', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'New meeting' })).toBeVisible();
    await expect(page.getByLabel('Meeting code')).toBeVisible();
  });

  test('should show the empty recent-meetings state', async ({ page }) => {
    await mockWebApi(page, { history: emptyHistory });
    await page.goto('/en');

    await expect(page.getByText('No meetings yet')).toBeVisible();
  });
});
