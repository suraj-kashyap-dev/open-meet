import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

test.describe('Admin accept-invite page', () => {
  test('should show a missing-token error when no token is present', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/accept-invite');

    await expect(page.getByRole('heading', { name: 'Activate your admin account' })).toBeVisible();
    await expect(page.getByText('This invitation link is missing its token.')).toBeVisible();
  });

  test('should render the activation form for a valid invite', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en/accept-invite?token=valid-token');

    await expect(page.getByRole('heading', { name: 'Activate your admin account' })).toBeVisible();
    await expect(page.getByText('invitee@example.com')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate account' })).toBeVisible();
  });

  test('should surface an error for an invalid or expired invite', async ({ page }) => {
    await mockAdminApi(page, { inviteLookup: { errorStatus: 404 } });
    await page.goto('/en/accept-invite?token=expired');

    await expect(page.getByText('Invite not found')).toBeVisible();
  });
});
