import { expect, test } from '@playwright/test';

import { mockWebApi } from '../fixtures/api';
import { emptyTeams } from '../fixtures/data';

test.describe('Web teams page', () => {
  test('should render teams and their channels from the API', async ({ page }) => {
    await mockWebApi(page);
    await page.goto('/en/teams');

    await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible();

    // Team headings.
    await expect(page.getByRole('heading', { name: 'Engineering' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Design' })).toBeVisible();

    // Channels under the first team link through to /chat/<id>.
    await expect(page.getByRole('link', { name: /general/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /random/ })).toBeVisible();

    // The team with no channels shows the per-team empty hint.
    await expect(page.getByText('No channels yet.')).toBeVisible();
  });

  test('should show the empty state when the user has no teams', async ({ page }) => {
    await mockWebApi(page, { teams: emptyTeams });
    await page.goto('/en/teams');

    await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible();
    await expect(page.getByText('No teams yet')).toBeVisible();
  });
});
