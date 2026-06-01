import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';
import { currentAdminMe } from '../fixtures/data';

test.describe('Admin dashboard page', () => {
  test('should render the overview heading and stats', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en');

    await expect(page.getByRole('heading', { name: 'Console', exact: true })).toBeVisible();
    await expect(page.getByText('Total registered accounts')).toBeVisible();
    await expect(page.getByText('128', { exact: true })).toBeVisible();
  });

  test('should surface group and department totals', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en');

    await expect(page.getByText('Group conversations created')).toBeVisible();
    await expect(page.getByText('Departments in the workspace')).toBeVisible();
  });

  test('should show the recent meetings table', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/en');

    await expect(page.getByRole('heading', { name: 'Recent meetings' })).toBeVisible();
    await expect(page.getByText('abcd-efgh-ijkl')).toBeVisible();
  });

  test('should render deep analytics when the admin may view it', async ({ page }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom', name: 'Analyst', permissionType: 'CUSTOM' },
        grantedSet: ['analytics.view', 'analytics.view-deep'],
      },
    });
    await page.goto('/en');

    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Avg meeting length', { exact: true })).toBeVisible();
    await expect(page.getByText('Top hosts', { exact: true })).toBeVisible();
    await expect(page.getByText('Grace Hopper').first()).toBeVisible();
  });

  test('should hide deep analytics without the permission', async ({ page }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom', name: 'Viewer', permissionType: 'CUSTOM' },
        grantedSet: ['analytics.view'],
      },
    });
    await page.goto('/en');

    await expect(page.getByRole('heading', { name: 'Console', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toHaveCount(0);
  });
});
