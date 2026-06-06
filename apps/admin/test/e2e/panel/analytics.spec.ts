import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';
import { currentAdminMe } from '../fixtures/data';

test.describe('Admin /analytics page', () => {
  test('should render trend cards and deep analytics for an admin with full access', async ({
    page,
  }) => {
    await mockAdminApi(page);
    await page.goto('/en/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics', level: 1 })).toBeVisible();
    await expect(page.getByText('Avg meeting length')).toBeVisible();
  });

  test('should hide deep analytics when the admin lacks analytics.view-deep', async ({ page }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_viewer', name: 'Viewer', permissionType: 'CUSTOM' },
        grantedSet: ['analytics.view'],
      },
    });
    await page.goto('/en/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics', level: 1 })).toBeVisible();
    await expect(page.getByText('Avg meeting length')).toHaveCount(0);
  });

  test('should hide the Analytics nav item when grantedSet excludes analytics.view', async ({
    page,
  }) => {
    await mockAdminApi(page, {
      me: {
        ...currentAdminMe,
        role: { id: 'role_custom_minimal', name: 'Minimal', permissionType: 'CUSTOM' },
        grantedSet: ['users.view'],
      },
    });
    await page.goto('/en/users');

    await expect(page.getByRole('link', { name: 'Analytics' })).toHaveCount(0);
  });
});
