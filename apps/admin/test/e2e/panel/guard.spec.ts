import { expect, test } from '@playwright/test';

import { mockAdminApi } from '../fixtures/api';

const PANEL_ROUTES = [
  '/en',
  '/en/users',
  '/en/meetings',
  '/en/analytics',
  '/en/administrators',
  '/en/settings/configuration',
  '/en/settings/branding',
];

test.describe('Admin auth guard', () => {
  for (const route of PANEL_ROUTES) {
    test(`should redirect an unauthenticated visitor from ${route} to login`, async ({ page }) => {
      await mockAdminApi(page, { me: null });
      await page.goto(route);

      await expect(page).toHaveURL(/\/en\/login$/);
    });
  }
});
